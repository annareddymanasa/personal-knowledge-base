const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const pool = require("../config/db");
const {
  encryptSecret,
  decryptSecret,
  normalizeRecoveryCode,
  hashRecoveryCode,
  generateRecoveryCodes
} = require("../utils/twoFactorCrypto");

function formatUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email
  };
}

function createAccessToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function createChallengeToken(userId) {
  return jwt.sign(
    {
      userId,
      purpose: "two-factor-challenge"
    },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
}

function getTotpCounter(secret, code) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return null;
  }

  const delta = speakeasy.totp.verifyDelta({
    secret,
    encoding: "base32",
    token: code,
    window: 1
  });

  if (delta === undefined || delta === null) {
    return null;
  }

  return Math.floor(Date.now() / 30000) + delta;
}

function errorResponse(res, error, message) {
  console.error("Two-factor operation failed:", error.message);

  if (error.statusCode === 503) {
    return res.status(503).json({
      message: error.message
    });
  }

  return res.status(500).json({
    message
  });
}

const getTwoFactorStatus = async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT two_factor_enabled FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Account not found."
      });
    }

    return res.json({
      enabled: Number(users[0].two_factor_enabled) === 1
    });
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Unable to load two-factor authentication settings."
    );
  }
};

const setupTwoFactor = async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, email, two_factor_enabled FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Account not found."
      });
    }

    const user = users[0];

    if (Number(user.two_factor_enabled) === 1) {
      return res.status(409).json({
        message: "Two-factor authentication is already enabled."
      });
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Knowledgebase (${user.email})`,
      issuer: "Knowledgebase"
    });

    const encryptedSecret = encryptSecret(secret.base32);

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `Knowledgebase:${user.email}`,
      issuer: "Knowledgebase",
      encoding: "base32",
      algorithm: "sha1",
      digits: 6,
      period: 30
    });

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    await pool.execute(
      `UPDATE users
       SET two_factor_pending_secret = ?
       WHERE id = ?
         AND two_factor_enabled = 0`,
      [encryptedSecret, user.id]
    );

    return res.json({
      message: "Scan the QR code with your authenticator app.",
      qrCode,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Unable to start two-factor authentication setup."
    );
  }
};

const cancelTwoFactorSetup = async (req, res) => {
  try {
    await pool.execute(
      `UPDATE users
       SET two_factor_pending_secret = NULL
       WHERE id = ?
         AND two_factor_enabled = 0`,
      [req.user.id]
    );

    return res.json({
      message: "Two-factor setup cancelled."
    });
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Unable to cancel two-factor setup."
    );
  }
};

const enableTwoFactor = async (req, res) => {
  const code =
    typeof req.body.code === "string"
      ? req.body.code.trim()
      : "";

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      message: "Enter the six-digit code from your authenticator app."
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [users] = await connection.execute(
      `SELECT id, two_factor_enabled, two_factor_pending_secret
       FROM users
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.user.id]
    );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Account not found."
      });
    }

    const user = users[0];

    if (Number(user.two_factor_enabled) === 1) {
      await connection.rollback();

      return res.status(409).json({
        message: "Two-factor authentication is already enabled."
      });
    }

    if (!user.two_factor_pending_secret) {
      await connection.rollback();

      return res.status(400).json({
        message: "Start the two-factor setup before verifying a code."
      });
    }

    const secret = decryptSecret(user.two_factor_pending_secret);
    const counter = getTotpCounter(secret, code);

    if (counter === null) {
      await connection.rollback();

      return res.status(400).json({
        message: "The verification code is invalid or expired."
      });
    }

    const recoveryCodes = generateRecoveryCodes(10);

    await connection.execute(
      `UPDATE users
       SET two_factor_enabled = 1,
           two_factor_secret = two_factor_pending_secret,
           two_factor_pending_secret = NULL,
           two_factor_last_counter = ?
       WHERE id = ?`,
      [counter, user.id]
    );

    await connection.execute(
      "DELETE FROM two_factor_recovery_codes WHERE user_id = ?",
      [user.id]
    );

    for (const recoveryCode of recoveryCodes) {
      await connection.execute(
        `INSERT INTO two_factor_recovery_codes
         (user_id, code_hash)
         VALUES (?, ?)`,
        [user.id, hashRecoveryCode(recoveryCode)]
      );
    }

    await connection.commit();

    return res.json({
      message: "Two-factor authentication is now enabled.",
      recoveryCodes
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        console.error("Two-factor transaction rollback failed.");
      }
    }

    return errorResponse(
      res,
      error,
      "Unable to enable two-factor authentication."
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const disableTwoFactor = async (req, res) => {
  const code =
    typeof req.body.code === "string"
      ? req.body.code.trim()
      : "";

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      message: "Enter the six-digit code from your authenticator app."
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [users] = await connection.execute(
      `SELECT id, two_factor_enabled, two_factor_secret,
              two_factor_last_counter
       FROM users
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [req.user.id]
    );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Account not found."
      });
    }

    const user = users[0];

    if (
      Number(user.two_factor_enabled) !== 1 ||
      !user.two_factor_secret
    ) {
      await connection.rollback();

      return res.status(400).json({
        message: "Two-factor authentication is not enabled."
      });
    }

    const secret = decryptSecret(user.two_factor_secret);
    const counter = getTotpCounter(secret, code);

    if (counter === null) {
      await connection.rollback();

      return res.status(400).json({
        message: "The verification code is invalid or expired."
      });
    }

    if (
      user.two_factor_last_counter !== null &&
      user.two_factor_last_counter !== undefined &&
      counter <= Number(user.two_factor_last_counter)
    ) {
      await connection.rollback();

      return res.status(400).json({
        message: "This code has already been used. Wait for a new code and try again."
      });
    }

    await connection.execute(
      `UPDATE users
       SET two_factor_enabled = 0,
           two_factor_secret = NULL,
           two_factor_pending_secret = NULL,
           two_factor_last_counter = NULL
       WHERE id = ?`,
      [user.id]
    );

    await connection.execute(
      "DELETE FROM two_factor_recovery_codes WHERE user_id = ?",
      [user.id]
    );

    await connection.commit();

    return res.json({
      message: "Two-factor authentication has been disabled."
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        console.error("Two-factor transaction rollback failed.");
      }
    }

    return errorResponse(
      res,
      error,
      "Unable to disable two-factor authentication."
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const completeTwoFactorLogin = async (req, res) => {
  const { challengeToken } = req.body;

  const code =
    typeof req.body.code === "string"
      ? req.body.code.trim()
      : "";

  if (
    typeof challengeToken !== "string" ||
    !challengeToken ||
    !code
  ) {
    return res.status(400).json({
      message: "A login challenge and verification code are required."
    });
  }

  let challenge;

  try {
    challenge = jwt.verify(
      challengeToken,
      process.env.JWT_SECRET
    );

    if (
      challenge.purpose !== "two-factor-challenge" ||
      !challenge.userId
    ) {
      return res.status(401).json({
        message: "The verification session is invalid. Sign in again."
      });
    }
  } catch {
    return res.status(401).json({
      message: "The verification session expired. Sign in again."
    });
  }

  try {
    const [users] = await pool.execute(
      `SELECT id, full_name, email, two_factor_enabled,
              two_factor_secret
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [challenge.userId]
    );

    if (
      users.length === 0 ||
      Number(users[0].two_factor_enabled) !== 1 ||
      !users[0].two_factor_secret
    ) {
      return res.status(401).json({
        message: "Two-factor authentication is not available for this account."
      });
    }

    const user = users[0];
    let verified = false;

    if (/^\d{6}$/.test(code)) {
      const secret = decryptSecret(user.two_factor_secret);
      const counter = getTotpCounter(secret, code);

      if (counter !== null) {
        const [updateResult] = await pool.execute(
          `UPDATE users
           SET two_factor_last_counter = ?
           WHERE id = ?
             AND two_factor_enabled = 1
             AND (
               two_factor_last_counter IS NULL
               OR two_factor_last_counter < ?
             )`,
          [counter, user.id, counter]
        );

        verified = updateResult.affectedRows === 1;
      }
    } else {
      const normalizedCode = normalizeRecoveryCode(code);

      if (/^[A-F0-9]{20}$/.test(normalizedCode)) {
        const codeHash = hashRecoveryCode(normalizedCode);

        const [recoveryCodes] = await pool.execute(
          `SELECT id
           FROM two_factor_recovery_codes
           WHERE user_id = ?
             AND code_hash = ?
             AND used_at IS NULL
           LIMIT 1`,
          [user.id, codeHash]
        );

        if (recoveryCodes.length > 0) {
          const [updateResult] = await pool.execute(
            `UPDATE two_factor_recovery_codes
             SET used_at = NOW()
             WHERE id = ?
               AND user_id = ?
               AND used_at IS NULL`,
            [recoveryCodes[0].id, user.id]
          );

          verified = updateResult.affectedRows === 1;
        }
      }
    }

    if (!verified) {
      return res.status(401).json({
        message: "The verification code is invalid, expired, or already used."
      });
    }

    const token = createAccessToken(user.id);

    return res.json({
      message: "Two-factor verification successful.",
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error(
      "Two-factor login verification failed:",
      error.message
    );

    return res.status(500).json({
      message: "Unable to verify your sign-in right now."
    });
  }
};

module.exports = {
  getTwoFactorStatus,
  setupTwoFactor,
  cancelTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  completeTwoFactorLogin
};