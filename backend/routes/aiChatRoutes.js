const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");
const { chatWithAI } = require("../controllers/aiChatController");

const router = express.Router();

router.use(authenticateToken);

router.post("/", chatWithAI);

module.exports = router;