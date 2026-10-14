const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const { getActivities } = require("../controllers/activityController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getActivities);

module.exports = router;