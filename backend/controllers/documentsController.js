const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDirectory = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedExtensions = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".csv": ["text/csv", "application/vnd.ms-excel"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ]
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const acceptedMimeTypes = allowedExtensions[extension];

    if (
      !acceptedMimeTypes ||
      !acceptedMimeTypes.includes(file.mimetype)
    ) {
      return callback(
        new Error(
          "This file type is not supported. Upload an image, PDF, text, Word, Excel, or PowerPoint file."
        )
      );
    }

    callback(null, true);
  }
});

async function ensureNoteOwnership(req, res, next) {
  const noteId = req.params.noteId;

  if (!/^\d+$/.test(noteId)) {
    return res.status(400).json({
      message: "Invalid note ID."
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, folder_id AS folderId
       FROM notes
       WHERE id = ? AND user_id = ?`,
      [noteId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Note not found."
      });
    }

    req.note = rows[0];
    next();
  } catch (error) {
    console.error("Failed to verify note ownership:", error.message);

    res.status(500).json({
      message: "Unable to access the note."
    });
  }
}

async function getNoteDocuments(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        id,
        note_id AS noteId,
        original_name AS originalName,
        mime_type AS mimeType,
        file_size AS fileSize,
        created_at AS createdAt
       FROM documents
       WHERE note_id = ? AND user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [req.note.id, req.user.id]
    );

    res.json({
      documents: rows.map((document) => ({
        ...document,
        id: String(document.id),
        noteId: String(document.noteId),
        fileSize: Number(document.fileSize),
        downloadUrl: `/api/documents/${document.id}/download`
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve attachments:", error.message);

    res.status(500).json({
      message: "Unable to retrieve the note attachments."
    });
  }
}

async function uploadDocuments(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      message: "Select at least one file to upload."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const uploadedDocuments = [];

    for (const file of req.files) {
      const storagePath = path.posix.join(
        "uploads",
        file.filename
      );

      const [result] = await connection.execute(
        `INSERT INTO documents
          (
            user_id,
            note_id,
            folder_id,
            original_name,
            stored_name,
            mime_type,
            file_size,
            storage_path
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          req.note.id,
          req.note.folderId,
          file.originalname,
          file.filename,
          file.mimetype,
          file.size,
          storagePath
        ]
      );

      uploadedDocuments.push({
        id: String(result.insertId),
        noteId: String(req.note.id),
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        downloadUrl: `/api/documents/${result.insertId}/download`
      });
    }

    await connection.commit();

    res.status(201).json({
      message: "Files uploaded successfully.",
      documents: uploadedDocuments
    });
  } catch (error) {
    await connection.rollback();

    await Promise.all(
      req.files.map(async (file) => {
        try {
          await fs.promises.unlink(file.path);
        } catch {
          return;
        }
      })
    );

    console.error("Failed to upload documents:", error.message);

    res.status(500).json({
      message: "Unable to save the uploaded files."
    });
  } finally {
    connection.release();
  }
}

async function downloadDocument(req, res) {
  const documentId = req.params.id;

  if (!/^\d+$/.test(documentId)) {
    return res.status(400).json({
      message: "Invalid document ID."
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT original_name, stored_name, mime_type
       FROM documents
       WHERE id = ? AND user_id = ?`,
      [documentId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    const document = rows[0];
    const filePath = path.join(
      uploadDirectory,
      path.basename(document.stored_name)
    );

    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({
        message: "The document file could not be found."
      });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");

    res.download(filePath, document.original_name, (error) => {
      if (error && !res.headersSent) {
        console.error("Failed to download document:", error.message);

        res.status(500).json({
          message: "Unable to download the document."
        });
      }
    });
  } catch (error) {
    console.error("Failed to retrieve document:", error.message);

    res.status(500).json({
      message: "Unable to download the document."
    });
  }
}

async function deleteDocument(req, res) {
  const documentId = req.params.id;

  if (!/^\d+$/.test(documentId)) {
    return res.status(400).json({
      message: "Invalid document ID."
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, stored_name
       FROM documents
       WHERE id = ? AND user_id = ?`,
      [documentId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Document not found."
      });
    }

    await pool.execute(
      "DELETE FROM documents WHERE id = ? AND user_id = ?",
      [documentId, req.user.id]
    );

    const filePath = path.join(
      uploadDirectory,
      path.basename(rows[0].stored_name)
    );

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Failed to remove stored file:", error.message);
      }
    }

    res.json({
      message: "Attachment deleted successfully."
    });
  } catch (error) {
    console.error("Failed to delete attachment:", error.message);

    res.status(500).json({
      message: "Unable to delete the attachment."
    });
  }
}

module.exports = {
  upload,
  ensureNoteOwnership,
  getNoteDocuments,
  uploadDocuments,
  downloadDocument,
  deleteDocument
};