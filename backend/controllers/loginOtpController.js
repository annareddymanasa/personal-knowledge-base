const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const {
  hashChallenge,
  hashOtp
} = require("../services/loginOtpService");

const MAX_ATTEMPTS = 5;

function formatUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email
  };
}

function createAccessToken(userId) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function hashesMatch(firstHash, secondHash) {
  const first = Buffer.from(firstHash, "hex");
  const second = Buffer.from(secondHash, "hex");

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
}

const verifyLoginOtp = async (req, res) => {
  const { challengeToken, code } = req.body;

  if (
    typeof challengeToken !== "string" ||
    !/^[a-f0-9]{64}$/i.test(challengeToken)
  ) {
    return res.status(400).json({
      message: "Your login verification session is invalid. Please sign in again."
    });
  }

  if (
    typeof code !== "string" ||
    !/^\d{6}$/.test(code.trim())
  ) {
    return res.status(400).json({
      message: "Enter the six-digit code sent to your email."
    });
  }

  let connection;

  try {
    const challengeHash = hashChallenge(challengeToken);
    const submittedOtpHash = hashOtp(challengeToken, code.trim());

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [challenges] = await connection.execute(
      `SELECT id, user_id, otp_hash, attempts
       FROM login_otp_challenges
       WHERE challenge_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [challengeHash]
    );

    if (challenges.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Your verification code is invalid or has expired. Please sign in again."
      });
    }

    const challenge = challenges[0];

    if (Number(challenge.attempts) >= MAX_ATTEMPTS) {
      await connection.execute(
        `UPDATE login_otp_challenges
         SET used_at = NOW()
         WHERE id = ? AND used_at IS NULL`,
        [challenge.id]
      );

      await connection.commit();

      return res.status(429).json({
        message: "Too many incorrect codes. Please sign in again."
      });
    }

    if (!hashesMatch(challenge.otp_hash, submittedOtpHash)) {
      const nextAttempts = Number(challenge.attempts) + 1;

      await connection.execute(
        `UPDATE login_otp_challenges
         SET attempts = ?,
             used_at = CASE WHEN ? >= ? THEN NOW() ELSE used_at END
         WHERE id = ?`,
        [nextAttempts, nextAttempts, MAX_ATTEMPTS, challenge.id]
      );

      await connection.commit();

      return res.status(nextAttempts >= MAX_ATTEMPTS ? 429 : 400).json({
        message:
          nextAttempts >= MAX_ATTEMPTS
            ? "Too many incorrect codes. Please sign in again."
            : "Incorrect verification code. Please try again."
      });
    }

    const [users] = await connection.execute(
      `SELECT id, full_name, email
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [challenge.user_id]
    );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(401).json({
        message: "The account could not be found. Please sign in again."
      });
    }

    await connection.execute(
      `UPDATE login_otp_challenges
       SET used_at = NOW()
       WHERE id = ? AND used_at IS NULL`,
      [challenge.id]
    );

    await connection.commit();

    const user = users[0];
    const token = createAccessToken(user.id);

    return res.json({
      message: "Email verification successful.",
      token,
      user: formatUser(user)
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        console.error("Login OTP transaction rollback failed.");
      }
    }

    console.error("Login OTP verification failed:", error.message);

    return res.status(500).json({
      message: "Unable to verify your login right now."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  verifyLoginOtp
};