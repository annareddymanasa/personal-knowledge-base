const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark
} = require("../controllers/bookmarksController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getBookmarks);
router.post("/", createBookmark);
router.put("/:id", updateBookmark);
router.delete("/:id", deleteBookmark);

module.exports = router;