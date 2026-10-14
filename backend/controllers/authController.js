const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../config/db");
const getFirebaseAdmin = require("../config/firebaseAdmin");
const {
  createAndSendLoginOtp
} = require("../services/loginOtpService");

function formatUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email
  };
}

async function beginEmailVerification(user, res) {
  const challengeToken = await createAndSendLoginOtp(user);

  return res.json({
    message: "A verification code has been sent to your email.",
    requiresEmailOtp: true,
    challengeToken
  });
}

const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !fullName.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Full name, email, and password are required."
      });
    }

    if (fullName.trim().length > 100) {
      return res.status(400).json({
        message: "Full name must not exceed 100 characters."
      });
    }

    if (email.trim().length > 255) {
      return res.status(400).json({
        message: "Email address is too long."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must contain between 8 and 72 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: result.insertId,
        fullName: fullName.trim(),
        email: normalizedEmail
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      message: "Unable to create your account right now."
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.execute(
      `SELECT id, full_name, email, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (users.length === 0 || !users[0].password_hash) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    return await beginEmailVerification(user, res);
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 503
          ? error.message
          : "Unable to log in right now."
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (typeof idToken !== "string" || !idToken.trim()) {
      return res.status(400).json({
        message: "A Firebase ID token is required."
      });
    }

    let decodedToken;

    try {
      decodedToken = await getFirebaseAdmin()
        .auth()
        .verifyIdToken(idToken);
    } catch (error) {
      console.error("Firebase ID token verification failed:");
      console.error("Error name:", error.name || "UNKNOWN");
      console.error("Error code:", error.code || "NOT_AVAILABLE");
      console.error("Error message:", error.message);

      if (error.statusCode === 503) {
        return res.status(503).json({
          message: error.message
        });
      }

      return res.status(401).json({
        message: "Google sign-in could not be verified. Please try again."
      });
    }

    if (
      !decodedToken.uid ||
      !decodedToken.email ||
      decodedToken.email_verified !== true
    ) {
      return res.status(401).json({
        message: "A verified Google account is required."
      });
    }

    const firebaseUid = decodedToken.uid;
    const normalizedEmail = decodedToken.email.trim().toLowerCase();

    const [linkedUsers] = await pool.execute(
      `SELECT id, full_name, email, firebase_uid
       FROM users
       WHERE firebase_uid = ?
       LIMIT 1`,
      [firebaseUid]
    );

    let user = linkedUsers[0];

    if (!user) {
      const [emailUsers] = await pool.execute(
        `SELECT id, full_name, email, firebase_uid
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
      );

      user = emailUsers[0];

      if (
        user &&
        user.firebase_uid &&
        user.firebase_uid !== firebaseUid
      ) {
        return res.status(409).json({
          message: "This account is linked to a different Google identity."
        });
      }

      if (user && !user.firebase_uid) {
        const [updateResult] = await pool.execute(
          `UPDATE users
           SET firebase_uid = ?
           WHERE id = ?
             AND firebase_uid IS NULL`,
          [firebaseUid, user.id]
        );

        if (updateResult.affectedRows !== 1) {
          return res.status(409).json({
            message: "This account could not be linked. Please try again."
          });
        }

        user.firebase_uid = firebaseUid;
      }

      if (!user) {
        const fullName = (
          decodedToken.name ||
          normalizedEmail.split("@")[0]
        )
          .trim()
          .slice(0, 100);

        const passwordHash = await bcrypt.hash(
          crypto.randomBytes(32).toString("hex"),
          12
        );

        const [result] = await pool.execute(
          `INSERT INTO users
            (full_name, email, password_hash, firebase_uid)
           VALUES (?, ?, ?, ?)`,
          [
            fullName,
            normalizedEmail,
            passwordHash,
            firebaseUid
          ]
        );

        user = {
          id: result.insertId,
          full_name: fullName,
          email: normalizedEmail,
          firebase_uid: firebaseUid
        };
      }
    }

    return await beginEmailVerification(user, res);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This account already exists. Please try signing in again."
      });
    }

    console.error("Google sign-in failed:", error.message);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 503
          ? error.message
          : "Unable to complete Google sign-in right now."
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin
};