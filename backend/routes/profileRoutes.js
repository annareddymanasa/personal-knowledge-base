const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getProfile,
  updateProfile,
  changePassword,
  handleProfilePictureUpload,
  uploadProfilePicture,
  getProfileAvatar,
  deleteProfilePicture
} = require("../controllers/profileController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getProfile);

router.put("/", updateProfile);

router.patch("/password", changePassword);

router.get("/avatar", getProfileAvatar);

router.post(
  "/avatar",
  handleProfilePictureUpload,
  uploadProfilePicture
);

router.delete("/avatar", deleteProfilePicture);

module.exports = router;