const express = require("express");

const {
  register,
  login,
  googleLogin
} = require("../controllers/authController");

const {
  requestPasswordReset,
  resetPassword
} = require("../controllers/passwordResetController");

const {
  verifyLoginOtp
} = require("../controllers/loginOtpController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);

router.post("/verify-login-otp", verifyLoginOtp);

router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

module.exports = router;