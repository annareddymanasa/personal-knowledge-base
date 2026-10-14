const express = require("express");
const authenticateToken = require("../middleware/authMiddleware");

const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder
} = require("../controllers/foldersController");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getFolders);
router.post("/", createFolder);
router.put("/:id", updateFolder);
router.delete("/:id", deleteFolder);

module.exports = router;