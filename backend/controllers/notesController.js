const pool = require("../config/db");

const allowedCategories = [
  "Personal",
  "Ideas",
  "Development",
  "Learning",
  "Resources",
  "Work"
];

function validateNote(title, content, category) {
  if (typeof title !== "string" || !title.trim()) {
    return "A note title is required.";
  }

  if (title.trim().length > 200) {
    return "The note title cannot exceed 200 characters.";
  }

  if (content !== undefined && typeof content !== "string") {
    return "Note content must be text.";
  }

  if (category !== undefined && !allowedCategories.includes(category)) {
    return "Please select a valid category.";
  }

  return null;
}

function validateFolderId(folderId) {
  if (folderId === undefined || folderId === null || folderId === "") {
    return null;
  }

  if (
    (typeof folderId !== "string" && typeof folderId !== "number") ||
    !/^\d+$/.test(String(folderId))
  ) {
    return "Please select a valid folder.";
  }

  return null;
}

async function getNotes(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        id,
        folder_id AS folderId,
        title,
        content,
        category,
        is_favorite AS favorite,
        last_accessed_at AS lastAccessedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM notes
      WHERE user_id = ?
      ORDER BY updated_at DESC, id DESC`,
      [req.user.id]
    );

    res.json({
      notes: rows.map((note) => ({
        ...note,
        id: String(note.id),
        folderId:
          note.folderId === null ? null : String(note.folderId),
        favorite: Boolean(note.favorite),
        is_favorite: Boolean(note.favorite),
        category: note.category || "Personal",
        description: note.content || "No additional details yet.",
        color: "purple",
        tags: []
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve notes:", error.message);

    res.status(500).json({
      message: "Unable to retrieve notes."
    });
  }
}

async function createNote(req, res) {
  const {
    title,
    content = "",
    category = "Personal",
    folderId = null
  } = req.body;

  const validationError = validateNote(title, content, category);
  const folderValidationError = validateFolderId(folderId);

  if (validationError) {
    return res.status(400).json({
      message: validationError
    });
  }

  if (folderValidationError) {
    return res.status(400).json({
      message: folderValidationError
    });
  }

  const normalizedFolderId =
    folderId === null || folderId === ""
      ? null
      : String(folderId);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (normalizedFolderId !== null) {
      const [folders] = await connection.execute(
        "SELECT id FROM folders WHERE id = ? AND user_id = ?",
        [normalizedFolderId, req.user.id]
      );

      if (folders.length === 0) {
        await connection.rollback();

        return res.status(400).json({
          message: "The selected folder does not exist."
        });
      }
    }

    const [result] = await connection.execute(
      `INSERT INTO notes
        (user_id, folder_id, title, content, category, is_favorite)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [
        req.user.id,
        normalizedFolderId,
        title.trim(),
        content,
        category
      ]
    );

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'note', ?, 'created', ?)`,
      [
        req.user.id,
        result.insertId,
        JSON.stringify({
          title: title.trim(),
          category,
          folderId: normalizedFolderId
        })
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Note created successfully.",
      note: {
        id: String(result.insertId),
        folderId: normalizedFolderId,
        title: title.trim(),
        content,
        description: content || "No additional details yet.",
        category,
        favorite: false,
        is_favorite: false,
        color: "purple",
        tags: []
      }
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to create note:", error.message);

    res.status(500).json({
      message: "Unable to create the note."
    });
  } finally {
    connection.release();
  }
}

async function updateNote(req, res) {
  const { title, content, category } = req.body;

  const favorite =
    req.body.is_favorite !== undefined
      ? req.body.is_favorite
      : req.body.favorite;

  const folderId = req.body.folderId;
  const noteId = req.params.id;

  if (!/^\d+$/.test(noteId)) {
    return res.status(400).json({
      message: "Invalid note ID."
    });
  }

  if (
    title === undefined &&
    content === undefined &&
    category === undefined &&
    favorite === undefined &&
    folderId === undefined
  ) {
    return res.status(400).json({
      message: "Provide at least one field to update."
    });
  }

  if (
    title !== undefined &&
    (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200
    )
  ) {
    return res.status(400).json({
      message: "Enter a valid note title of at most 200 characters."
    });
  }

  if (content !== undefined && typeof content !== "string") {
    return res.status(400).json({
      message: "Note content must be text."
    });
  }

  if (category !== undefined && !allowedCategories.includes(category)) {
    return res.status(400).json({
      message: "Please select a valid category."
    });
  }

  if (favorite !== undefined && typeof favorite !== "boolean") {
    return res.status(400).json({
      message: "Favorite must be true or false."
    });
  }

  const folderValidationError = validateFolderId(folderId);

  if (folderValidationError) {
    return res.status(400).json({
      message: folderValidationError
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT
        id,
        folder_id AS folderId,
        title,
        content,
        category,
        is_favorite
       FROM notes
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [noteId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Note not found."
      });
    }

    const existing = rows[0];

    const nextTitle =
      title === undefined ? existing.title : title.trim();

    const nextContent =
      content === undefined ? existing.content : content;

    const nextCategory =
      category === undefined
        ? existing.category || "Personal"
        : category;

    const nextFavorite =
      favorite === undefined
        ? Boolean(existing.is_favorite)
        : favorite;

    const nextFolderId =
      folderId === undefined
        ? existing.folderId
        : folderId === null || folderId === ""
          ? null
          : String(folderId);

    if (nextFolderId !== null) {
      const [folders] = await connection.execute(
        "SELECT id FROM folders WHERE id = ? AND user_id = ?",
        [nextFolderId, req.user.id]
      );

      if (folders.length === 0) {
        await connection.rollback();

        return res.status(400).json({
          message: "The selected folder does not exist."
        });
      }
    }

    await connection.execute(
      `INSERT INTO note_versions
        (note_id, user_id, title, content)
       VALUES (?, ?, ?, ?)`,
      [
        existing.id,
        req.user.id,
        existing.title,
        existing.content
      ]
    );

    await connection.execute(
      `UPDATE notes
       SET title = ?,
           content = ?,
           category = ?,
           is_favorite = ?,
           folder_id = ?
       WHERE id = ? AND user_id = ?`,
      [
        nextTitle,
        nextContent,
        nextCategory,
        nextFavorite,
        nextFolderId,
        noteId,
        req.user.id
      ]
    );

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'note', ?, 'updated', ?)`,
      [
        req.user.id,
        noteId,
        JSON.stringify({
          title: nextTitle,
          category: nextCategory,
          favorite: nextFavorite,
          folderId: nextFolderId
        })
      ]
    );

    await connection.commit();

    res.json({
      message: "Note updated successfully.",
      note: {
        id: String(noteId),
        folderId:
          nextFolderId === null ? null : String(nextFolderId),
        title: nextTitle,
        content: nextContent,
        description: nextContent || "No additional details yet.",
        category: nextCategory,
        favorite: nextFavorite,
        is_favorite: nextFavorite,
        color: "purple",
        tags: []
      }
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to update note:", error.message);

    res.status(500).json({
      message: "Unable to update the note."
    });
  } finally {
    connection.release();
  }
}

async function deleteNote(req, res) {
  const noteId = req.params.id;

  if (!/^\d+$/.test(noteId)) {
    return res.status(400).json({
      message: "Invalid note ID."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, title
       FROM notes
       WHERE id = ? AND user_id = ?`,
      [noteId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Note not found."
      });
    }

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'note', ?, 'deleted', ?)`,
      [
        req.user.id,
        noteId,
        JSON.stringify({
          title: rows[0].title
        })
      ]
    );

    await connection.execute(
      "DELETE FROM notes WHERE id = ? AND user_id = ?",
      [noteId, req.user.id]
    );

    await connection.commit();

    res.json({
      message: "Note deleted successfully."
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to delete note:", error.message);

    res.status(500).json({
      message: "Unable to delete the note."
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote
};