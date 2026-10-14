const express = require("express");
const { rateLimit } = require("express-rate-limit");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getTwoFactorStatus,
  setupTwoFactor,
  cancelTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  completeTwoFactorLogin
} = require("../controllers/twoFactorController");

const router = express.Router();

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many verification attempts. Please try again later."
  }
});

router.post(
  "/challenge",
  verificationLimiter,
  completeTwoFactorLogin
);

router.get(
  "/status",
  authenticateToken,
  getTwoFactorStatus
);

router.post(
  "/setup",
  authenticateToken,
  setupTwoFactor
);

router.post(
  "/cancel-setup",
  authenticateToken,
  cancelTwoFactorSetup
);

router.post(
  "/enable",
  authenticateToken,
  verificationLimiter,
  enableTwoFactor
);

router.post(
  "/disable",
  authenticateToken,
  verificationLimiter,
  disableTwoFactor
);

module.exports = router;