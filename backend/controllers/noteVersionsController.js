const pool = require("../config/db");

async function getNoteVersions(req, res) {
  const noteId = req.params.noteId;

  if (!/^\d+$/.test(noteId)) {
    return res.status(400).json({
      message: "Invalid note ID."
    });
  }

  try {
    const [notes] = await pool.execute(
      `SELECT id
       FROM notes
       WHERE id = ? AND user_id = ?`,
      [noteId, req.user.id]
    );

    if (notes.length === 0) {
      return res.status(404).json({
        message: "Note not found."
      });
    }

    const [rows] = await pool.execute(
      `SELECT
        id,
        note_id AS noteId,
        title,
        content,
        created_at AS createdAt
       FROM note_versions
       WHERE note_id = ? AND user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [noteId, req.user.id]
    );

    res.json({
      versions: rows.map((version) => ({
        ...version,
        id: String(version.id),
        noteId: String(version.noteId),
        content: version.content || ""
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve note versions:", error.message);

    res.status(500).json({
      message: "Unable to retrieve note history."
    });
  }
}

async function restoreNoteVersion(req, res) {
  const noteId = req.params.noteId;
  const versionId = req.params.versionId;

  if (!/^\d+$/.test(noteId) || !/^\d+$/.test(versionId)) {
    return res.status(400).json({
      message: "Invalid note or version ID."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [notes] = await connection.execute(
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

    if (notes.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Note not found."
      });
    }

    const [versions] = await connection.execute(
      `SELECT
        id,
        title,
        content
       FROM note_versions
       WHERE id = ?
         AND note_id = ?
         AND user_id = ?
       FOR UPDATE`,
      [versionId, noteId, req.user.id]
    );

    if (versions.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "This version was not found for the selected note."
      });
    }

    const currentNote = notes[0];
    const selectedVersion = versions[0];

    await connection.execute(
      `INSERT INTO note_versions
        (note_id, user_id, title, content)
       VALUES (?, ?, ?, ?)`,
      [
        currentNote.id,
        req.user.id,
        currentNote.title,
        currentNote.content
      ]
    );

    await connection.execute(
      `UPDATE notes
       SET title = ?, content = ?
       WHERE id = ? AND user_id = ?`,
      [
        selectedVersion.title,
        selectedVersion.content,
        noteId,
        req.user.id
      ]
    );

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'note', ?, 'restored', ?)`,
      [
        req.user.id,
        noteId,
        JSON.stringify({
          title: selectedVersion.title,
          restoredVersionId: String(versionId)
        })
      ]
    );

    await connection.commit();

    res.json({
      message: "Note version restored successfully.",
      note: {
        id: String(currentNote.id),
        title: selectedVersion.title,
        content: selectedVersion.content || "",
        category: currentNote.category || "Personal",
        folderId:
          currentNote.folderId === null
            ? null
            : String(currentNote.folderId),
        favorite: Boolean(currentNote.is_favorite),
        is_favorite: Boolean(currentNote.is_favorite)
      }
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to restore note version:", error.message);

    res.status(500).json({
      message: "Unable to restore this note version."
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getNoteVersions,
  restoreNoteVersion
};