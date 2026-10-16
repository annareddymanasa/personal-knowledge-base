const express = require("express");
const multer = require("multer");
const authenticateToken = require("../middleware/authMiddleware");
const { summarizeDocument } = require("../controllers/documentSummarizationController");

const {
  upload,
  ensureNoteOwnership,
  getNoteDocuments,
  uploadDocuments,
  downloadDocument,
  deleteDocument
} = require("../controllers/documentsController");

const router = express.Router();

router.use(authenticateToken);

router.get(
  "/notes/:noteId",
  ensureNoteOwnership,
  getNoteDocuments
);

router.post(
  "/notes/:noteId",
  ensureNoteOwnership,
  (req, res, next) => {
    upload.array("files", 5)(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "Each file must be 10 MB or smaller."
            : error.code === "LIMIT_FILE_COUNT"
              ? "You can upload a maximum of five files at a time."
              : error.message;

        return res.status(400).json({ message });
      }

      return res.status(400).json({
        message: error.message || "Unable to process the uploaded files."
      });
    });
  },
  uploadDocuments
);

router.post("/:id/summarize", summarizeDocument);
router.get("/:id/download", downloadDocument);
router.delete("/:id", deleteDocument);

module.exports = router;
