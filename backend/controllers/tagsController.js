const pool = require("../config/db");

function validateTagName(name) {
  if (typeof name !== "string" || !name.trim()) {
    return "A tag name is required.";
  }

  if (name.trim().length > 100) {
    return "The tag name cannot exceed 100 characters.";
  }

  return null;
}

async function getTags(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        t.id,
        t.name,
        t.created_at AS createdAt,
        COUNT(DISTINCT n.id) AS noteCount
      FROM tags t
      LEFT JOIN note_tags nt ON nt.tag_id = t.id
      LEFT JOIN notes n
        ON n.id = nt.note_id
        AND n.user_id = t.user_id
      WHERE t.user_id = ?
      GROUP BY t.id, t.name, t.created_at
      ORDER BY t.name ASC`,
      [req.user.id]
    );

    res.json({
      tags: rows.map((tag) => ({
        ...tag,
        id: String(tag.id),
        noteCount: Number(tag.noteCount)
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve tags:", error.message);

    res.status(500).json({
      message: "Unable to retrieve tags."
    });
  }
}

async function createTag(req, res) {
  const { name } = req.body;
  const validationError = validateTagName(name);

  if (validationError) {
    return res.status(400).json({
      message: validationError
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO tags (user_id, name)
       VALUES (?, ?)`,
      [req.user.id, name.trim()]
    );

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'tag', ?, 'created', ?)`,
      [
        req.user.id,
        result.insertId,
        JSON.stringify({ name: name.trim() })
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Tag created successfully.",
      tag: {
        id: String(result.insertId),
        name: name.trim(),
        noteCount: 0
      }
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This tag already exists."
      });
    }

    console.error("Failed to create tag:", error.message);

    res.status(500).json({
      message: "Unable to create the tag."
    });
  } finally {
    connection.release();
  }
}

async function updateTag(req, res) {
  const tagId = req.params.id;
  const { name } = req.body;

  if (!/^\d+$/.test(tagId)) {
    return res.status(400).json({
      message: "Invalid tag ID."
    });
  }

  const validationError = validateTagName(name);

  if (validationError) {
    return res.status(400).json({
      message: validationError
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, name
       FROM tags
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [tagId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Tag not found."
      });
    }

    await connection.execute(
      `UPDATE tags
       SET name = ?
       WHERE id = ? AND user_id = ?`,
      [name.trim(), tagId, req.user.id]
    );

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'tag', ?, 'updated', ?)`,
      [
        req.user.id,
        tagId,
        JSON.stringify({
          previousName: rows[0].name,
          name: name.trim()
        })
      ]
    );

    await connection.commit();

    res.json({
      message: "Tag updated successfully.",
      tag: {
        id: String(tagId),
        name: name.trim()
      }
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This tag already exists."
      });
    }

    console.error("Failed to update tag:", error.message);

    res.status(500).json({
      message: "Unable to update the tag."
    });
  } finally {
    connection.release();
  }
}

async function deleteTag(req, res) {
  const tagId = req.params.id;

  if (!/^\d+$/.test(tagId)) {
    return res.status(400).json({
      message: "Invalid tag ID."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, name
       FROM tags
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [tagId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Tag not found."
      });
    }

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'tag', ?, 'deleted', ?)`,
      [
        req.user.id,
        tagId,
        JSON.stringify({ name: rows[0].name })
      ]
    );

    await connection.execute(
      "DELETE FROM note_tags WHERE tag_id = ?",
      [tagId]
    );

    await connection.execute(
      "DELETE FROM tags WHERE id = ? AND user_id = ?",
      [tagId, req.user.id]
    );

    await connection.commit();

    res.json({
      message: "Tag deleted successfully."
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to delete tag:", error.message);

    res.status(500).json({
      message: "Unable to delete the tag."
    });
  } finally {
    connection.release();
  }
}

async function getNoteTags(req, res) {
  const noteId = req.params.noteId;

  if (!/^\d+$/.test(noteId)) {
    return res.status(400).json({
      message: "Invalid note ID."
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT t.id, t.name
       FROM tags t
       INNER JOIN note_tags nt ON nt.tag_id = t.id
       INNER JOIN notes n ON n.id = nt.note_id
       WHERE n.id = ?
         AND n.user_id = ?
         AND t.user_id = ?
       ORDER BY t.name ASC`,
      [noteId, req.user.id, req.user.id]
    );

    res.json({
      tags: rows.map((tag) => ({
        id: String(tag.id),
        name: tag.name
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve note tags:", error.message);

    res.status(500).json({
      message: "Unable to retrieve the note tags."
    });
  }
}

async function setNoteTags(req, res) {
  const noteId = req.params.noteId;
  const { tagIds } = req.body;

  if (!/^\d+$/.test(noteId)) {
    return res.status(400).json({
      message: "Invalid note ID."
    });
  }

  if (
    !Array.isArray(tagIds) ||
    tagIds.some(
      (id) =>
        (typeof id !== "string" && typeof id !== "number") ||
        !/^\d+$/.test(String(id))
    )
  ) {
    return res.status(400).json({
      message: "Tag IDs must be provided as an array of valid IDs."
    });
  }

  const uniqueTagIds = [...new Set(tagIds.map(String))];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [notes] = await connection.execute(
      `SELECT id
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

    if (uniqueTagIds.length > 0) {
      const placeholders = uniqueTagIds.map(() => "?").join(", ");

      const [tags] = await connection.execute(
        `SELECT id
         FROM tags
         WHERE user_id = ?
           AND id IN (${placeholders})`,
        [req.user.id, ...uniqueTagIds]
      );

      if (tags.length !== uniqueTagIds.length) {
        await connection.rollback();

        return res.status(400).json({
          message: "One or more selected tags are invalid."
        });
      }
    }

    await connection.execute(
      "DELETE FROM note_tags WHERE note_id = ?",
      [noteId]
    );

    for (const tagId of uniqueTagIds) {
      await connection.execute(
        `INSERT INTO note_tags (note_id, tag_id)
         VALUES (?, ?)`,
        [noteId, tagId]
      );
    }

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'note', ?, 'updated', ?)`,
      [
        req.user.id,
        noteId,
        JSON.stringify({ tagIds: uniqueTagIds })
      ]
    );

    const [rows] = await connection.execute(
      `SELECT t.id, t.name
       FROM tags t
       INNER JOIN note_tags nt ON nt.tag_id = t.id
       WHERE nt.note_id = ?
         AND t.user_id = ?
       ORDER BY t.name ASC`,
      [noteId, req.user.id]
    );

    await connection.commit();

    res.json({
      message: "Note tags updated successfully.",
      tags: rows.map((tag) => ({
        id: String(tag.id),
        name: tag.name
      }))
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to update note tags:", error.message);

    res.status(500).json({
      message: "Unable to update the note tags."
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getNoteTags,
  setNoteTags
};