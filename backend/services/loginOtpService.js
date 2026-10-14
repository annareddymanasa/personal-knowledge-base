const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");

function hashChallenge(challengeToken) {
  return crypto
    .createHash("sha256")
    .update(challengeToken)
    .digest("hex");
}

function hashOtp(challengeToken, otp) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${challengeToken}:${otp}`)
    .digest("hex");
}

function createMailer() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const error = new Error(
      "Email delivery is not configured. Check SMTP_USER and SMTP_PASS."
    );

    error.statusCode = 503;
    throw error;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s/g, "")
    }
  });
}

async function createAndSendLoginOtp(user) {
  if (!user || !user.id || !user.email) {
    throw new Error("The account information is incomplete.");
  }

  const challengeToken = crypto.randomBytes(32).toString("hex");
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");

  const challengeHash = hashChallenge(challengeToken);
  const otpHash = hashOtp(challengeToken, otp);

  await pool.execute(
    `UPDATE login_otp_challenges
     SET used_at = NOW()
     WHERE user_id = ? AND used_at IS NULL`,
    [user.id]
  );

  await pool.execute(
    `INSERT INTO login_otp_challenges
      (user_id, challenge_hash, otp_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [user.id, challengeHash, otpHash]
  );

  try {
    const mailer = createMailer();

    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Your Knowledgebase sign-in code",
      text: [
        `Hello ${user.full_name || "there"},`,
        "",
        `Your Knowledgebase verification code is: ${otp}`,
        "",
        "This code expires in 10 minutes and can only be used once.",
        "If you did not attempt to sign in, you can ignore this email.",
        "",
        "Never share this verification code with anyone."
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;color:#292d28">
          <div style="padding:28px;border:1px solid #e5dfd3;border-radius:16px;background:#fffdf8">
            <p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#a95f43">
              KNOWLEDGEBASE
            </p>
            <h2 style="margin:20px 0 12px">Verify your sign-in</h2>
            <p style="font-size:14px;line-height:1.8;color:#747a70">
              Use the verification code below to finish signing in to your personal knowledge space.
            </p>
            <div style="margin:26px 0;padding:18px;background:#f3e6db;border-radius:12px;text-align:center;font-size:32px;font-weight:800;letter-spacing:9px;color:#79422f">
              ${otp}
            </div>
            <p style="font-size:13px;line-height:1.8;color:#747a70">
              This code expires in 10 minutes and can only be used once.
              Never share it with anyone.
            </p>
            <p style="font-size:12px;color:#747a70">
              If you did not attempt to sign in, you can ignore this email.
            </p>
          </div>
        </div>
      `
    });

    return challengeToken;
  } catch (error) {
    await pool.execute(
      `UPDATE login_otp_challenges
       SET used_at = NOW()
       WHERE challenge_hash = ? AND used_at IS NULL`,
      [challengeHash]
    );

    console.error("Login OTP email delivery failed:", error.message);

    const emailError = new Error(
      "We could not send your verification code. Please try again."
    );

    emailError.statusCode = 503;
    throw emailError;
  }
}

module.exports = {
  createAndSendLoginOtp,
  hashChallenge,
  hashOtp
};