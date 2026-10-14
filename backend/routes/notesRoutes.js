const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getNotes,
  createNote,
  updateNote,
  deleteNote
} = require("../controllers/notesController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getNotes);
router.post("/", createNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;