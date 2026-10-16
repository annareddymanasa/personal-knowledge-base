const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { generateNoteInsights } = require("../controllers/noteInsightsController");

const router = express.Router();

router.post("/", authMiddleware, generateNoteInsights);

module.exports = router;