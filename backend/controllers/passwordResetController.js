const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const pool = require("../config/db");

const PASSWORD_RESET_EXPIRY_MINUTES = 30;

function createMailer() {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;

  if (!user || !password) {
    const error = new Error(
      "Email delivery is not configured. Set SMTP_USER and SMTP_PASS in backend/.env."
    );

    error.statusCode = 503;
    throw error;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: password.replace(/\s/g, "")
    }
  });
}

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
}

function createResetEmail(resetUrl) {
  return {
    subject: "Reset your Knowledgebase password",
    text: [
      "We received a request to reset your Knowledgebase password.",
      "",
      "Open the following link to choose a new password:",
      resetUrl,
      "",
      "This link expires in 30 minutes and can only be used once.",
      "If you did not request this reset, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#292d28">
        <div style="padding:28px;border:1px solid #e5dfd3;border-radius:16px;background:#fffdf8">
          <p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#a95f43">KNOWLEDGEBASE</p>
          <h1 style="font-size:25px;margin:20px 0 12px">Reset your password</h1>
          <p style="font-size:14px;line-height:1.8;color:#747a70">
            We received a request to reset your Knowledgebase password.
            Click the button below to choose a new one.
          </p>
          <p style="margin:28px 0">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#79422f;color:white;text-decoration:none;font-weight:700">
              Reset password
            </a>
          </p>
          <p style="font-size:12px;line-height:1.7;color:#747a70">
            This link expires in 30 minutes and can only be used once.
            If you did not request this reset, you can ignore this email.
          </p>
        </div>
      </div>
    `
  };
}

const requestPasswordReset = async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email || email.length > 255) {
      return res.status(400).json({
        message: "Enter a valid email address."
      });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({
        message: "Password-reset email delivery is not configured yet."
      });
    }

    const [users] = await pool.execute(
      "SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.json({
        message:
          "If an account exists for that email address, a password-reset link will be sent."
      });
    }

    const user = users[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await pool.execute(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [user.id]
    );

    await pool.execute(
      `INSERT INTO password_reset_tokens
        (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [
        user.id,
        tokenHash,
        PASSWORD_RESET_EXPIRY_MINUTES
      ]
    );

    const resetUrl =
      `${getFrontendUrl()}/reset-password?token=${rawToken}`;

    const emailContent = createResetEmail(resetUrl);

    try {
      const mailer = createMailer();

      await mailer.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTP_USER,
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    } catch (error) {
      await pool.execute(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL",
        [tokenHash]
      );

      console.error(
        "Password-reset email delivery failed:",
        error.message
      );

      return res.status(503).json({
        message:
          "We could not send the reset email. Check your email configuration and try again."
      });
    }

    return res.json({
      message:
        "If an account exists for that email address, a password-reset link will be sent."
    });
  } catch (error) {
    console.error(
      "Password-reset request failed:",
      error.message
    );

    return res.status(500).json({
      message: "Unable to process your request right now."
    });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/i.test(token)
  ) {
    return res.status(400).json({
      message: "This password-reset link is invalid or has expired."
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    return res.status(400).json({
      message: "Your password must contain between 8 and 72 characters."
    });
  }

  let connection;

  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const passwordHash = await bcrypt.hash(password, 12);

    connection = await pool.getConnection();

    await connection.beginTransaction();

    const [tokens] = await connection.execute(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "This password-reset link is invalid or has expired."
      });
    }

    const resetRecord = tokens[0];

    const [updateResult] = await connection.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, resetRecord.user_id]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();

      return res.status(400).json({
        message: "This account could not be updated."
      });
    }

    await connection.execute(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [resetRecord.user_id]
    );

    await connection.commit();

    return res.json({
      message:
        "Your password has been reset successfully. You can now sign in."
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        console.error("Password-reset rollback failed.");
      }
    }

    console.error(
      "Password reset failed:",
      error.message
    );

    return res.status(500).json({
      message: "Unable to reset your password right now."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  requestPasswordReset,
  resetPassword
};