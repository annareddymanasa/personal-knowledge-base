const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getNoteTags,
  setNoteTags
} = require("../controllers/tagsController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getTags);
router.post("/", createTag);

router.get("/notes/:noteId", getNoteTags);
router.put("/notes/:noteId", setNoteTags);

router.put("/:id", updateTag);
router.delete("/:id", deleteTag);

module.exports = router;