const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getNoteVersions,
  restoreNoteVersion
} = require("../controllers/noteVersionsController");

const router = express.Router();

router.use(authenticateToken);

router.get("/notes/:noteId", getNoteVersions);

router.post(
  "/notes/:noteId/:versionId/restore",
  restoreNoteVersion
);

module.exports = router;