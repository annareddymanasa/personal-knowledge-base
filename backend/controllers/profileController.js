const pool = require("../config/db");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const profileDirectory = path.join(__dirname, "..", "uploads", "profiles");

fs.mkdirSync(profileDirectory, { recursive: true });

const allowedImages = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, profileDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedImages[extension] ||
      allowedImages[extension] !== file.mimetype
    ) {
      return callback(
        new Error("Choose a JPG, PNG, or WebP image.")
      );
    }

    callback(null, true);
  }
});

function handleProfilePictureUpload(req, res, next) {
  imageUpload.single("profilePicture")(req, res, (error) => {
    if (!error) {
      return next();
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Your profile picture must be 2 MB or smaller."
        : error.message || "Unable to upload your profile picture.";

    return res.status(400).json({ message });
  });
}

async function getProfile(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        id,
        full_name AS fullName,
        email,
        profile_picture AS profilePicture
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    const profile = rows[0];

    res.json({
      profile: {
        id: String(profile.id),
        fullName: profile.fullName,
        email: profile.email,
        hasProfilePicture: Boolean(profile.profilePicture)
      }
    });
  } catch (error) {
    console.error("Failed to retrieve profile:", error.message);

    res.status(500).json({
      message: "Unable to retrieve your profile."
    });
  }
}

async function updateProfile(req, res) {
  const fullName =
    typeof req.body.fullName === "string"
      ? req.body.fullName.trim()
      : "";

  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (fullName.length < 2 || fullName.length > 100) {
    return res.status(400).json({
      message: "Your full name must contain between 2 and 100 characters."
    });
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      message: "Enter a valid email address."
    });
  }

  try {
    const [existingUsers] = await pool.execute(
      `SELECT id
       FROM users
       WHERE email = ? AND id <> ?
       LIMIT 1`,
      [email, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "That email address is already used by another account."
      });
    }

    const [result] = await pool.execute(
      `UPDATE users
       SET full_name = ?, email = ?
       WHERE id = ?`,
      [fullName, email, req.user.id]
    );

    if (result.affectedRows === 0) {
      const [users] = await pool.execute(
        "SELECT id FROM users WHERE id = ?",
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({
          message: "User account not found."
        });
      }
    }

    res.json({
      message: "Profile updated successfully.",
      profile: {
        id: String(req.user.id),
        fullName,
        email
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "That email address is already used by another account."
      });
    }

    console.error("Failed to update profile:", error.message);

    res.status(500).json({
      message: "Unable to update your profile."
    });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== "string" || !currentPassword) {
    return res.status(400).json({
      message: "Enter your current password."
    });
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 72
  ) {
    return res.status(400).json({
      message: "Your new password must contain between 8 and 72 characters."
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "Your new password must be different from your current password."
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT password_hash AS passwordHash
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    const matches = await bcrypt.compare(
      currentPassword,
      rows[0].passwordHash
    );

    if (!matches) {
      return res.status(400).json({
        message: "Your current password is incorrect."
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ?`,
      [passwordHash, req.user.id]
    );

    res.json({
      message: "Password changed successfully."
    });
  } catch (error) {
    console.error("Failed to change password:", error.message);

    res.status(500).json({
      message: "Unable to change your password."
    });
  }
}

async function hasValidImageSignature(file) {
  const handle = await fs.promises.open(file.path, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    const header = buffer.subarray(0, bytesRead);

    if (file.mimetype === "image/jpeg") {
      return (
        header.length >= 3 &&
        header[0] === 0xff &&
        header[1] === 0xd8 &&
        header[2] === 0xff
      );
    }

    if (file.mimetype === "image/png") {
      return (
        header.length >= 8 &&
        header.subarray(0, 8).equals(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        )
      );
    }

    if (file.mimetype === "image/webp") {
      return (
        header.length >= 12 &&
        header.toString("ascii", 0, 4) === "RIFF" &&
        header.toString("ascii", 8, 12) === "WEBP"
      );
    }

    return false;
  } finally {
    await handle.close();
  }
}

async function uploadProfilePicture(req, res) {
  if (!req.file) {
    return res.status(400).json({
      message: "Choose a profile picture to upload."
    });
  }

  try {
    const validImage = await hasValidImageSignature(req.file);

    if (!validImage) {
      await fs.promises.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        message: "The selected file is not a valid supported image."
      });
    }

    const [rows] = await pool.execute(
      `SELECT profile_picture AS profilePicture
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      await fs.promises.unlink(req.file.path).catch(() => {});

      return res.status(404).json({
        message: "User account not found."
      });
    }

    const oldPicture = rows[0].profilePicture;

    await pool.execute(
      `UPDATE users
       SET profile_picture = ?
       WHERE id = ?`,
      [req.file.filename, req.user.id]
    );

    if (oldPicture) {
      const oldPath = path.join(
        profileDirectory,
        path.basename(oldPicture)
      );

      if (oldPath.startsWith(profileDirectory + path.sep)) {
        await fs.promises.unlink(oldPath).catch((error) => {
          if (error.code !== "ENOENT") {
            console.error(
              "Failed to remove previous profile picture:",
              error.message
            );
          }
        });
      }
    }

    res.json({
      message: "Profile picture updated successfully."
    });
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch(() => {});

    console.error("Failed to upload profile picture:", error.message);

    res.status(500).json({
      message: "Unable to save your profile picture."
    });
  }
}

async function getProfileAvatar(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT profile_picture AS profilePicture
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    if (!rows[0].profilePicture) {
      return res.status(404).json({
        message: "No profile picture has been uploaded."
      });
    }

    const filename = path.basename(rows[0].profilePicture);
    const filePath = path.join(profileDirectory, filename);

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        if (error.code === "ENOENT") {
          return res.status(404).json({
            message: "Profile picture file was not found."
          });
        }

        console.error(
          "Failed to return profile picture:",
          error.message
        );

        return res.status(500).json({
          message: "Unable to load your profile picture."
        });
      }
    });
  } catch (error) {
    console.error("Failed to retrieve profile picture:", error.message);

    res.status(500).json({
      message: "Unable to load your profile picture."
    });
  }
}

async function deleteProfilePicture(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT profile_picture AS profilePicture
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    await pool.execute(
      `UPDATE users
       SET profile_picture = NULL
       WHERE id = ?`,
      [req.user.id]
    );

    const oldPicture = rows[0].profilePicture;

    if (oldPicture) {
      const oldPath = path.join(
        profileDirectory,
        path.basename(oldPicture)
      );

      if (oldPath.startsWith(profileDirectory + path.sep)) {
        await fs.promises.unlink(oldPath).catch((error) => {
          if (error.code !== "ENOENT") {
            console.error(
              "Failed to remove profile picture:",
              error.message
            );
          }
        });
      }
    }

    res.json({
      message: "Profile picture removed successfully."
    });
  } catch (error) {
    console.error("Failed to remove profile picture:", error.message);

    res.status(500).json({
      message: "Unable to remove your profile picture."
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  handleProfilePictureUpload,
  uploadProfilePicture,
  getProfileAvatar,
  deleteProfilePicture
};