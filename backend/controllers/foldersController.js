const pool = require("../config/db");

function validateFolder(name, description) {
  if (typeof name !== "string" || !name.trim()) {
    return "A folder name is required.";
  }

  if (name.trim().length > 100) {
    return "The folder name cannot exceed 100 characters.";
  }

  if (description !== undefined && typeof description !== "string") {
    return "Folder description must be text.";
  }

  if (description !== undefined && description.length > 1000) {
    return "The folder description cannot exceed 1000 characters.";
  }

  return null;
}

async function getFolders(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        f.id,
        f.name,
        f.description,
        f.created_at AS createdAt,
        f.updated_at AS updatedAt,
        (
          SELECT COUNT(*)
          FROM notes n
          WHERE n.folder_id = f.id
            AND n.user_id = f.user_id
        ) AS noteCount
      FROM folders f
      WHERE f.user_id = ?
      ORDER BY f.name ASC, f.id ASC`,
      [req.user.id]
    );

    res.json({
      folders: rows.map((folder) => ({
        ...folder,
        id: String(folder.id),
        noteCount: Number(folder.noteCount)
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve folders:", error.message);

    res.status(500).json({
      message: "Unable to retrieve folders."
    });
  }
}

async function createFolder(req, res) {
  const { name, description = "" } = req.body;

  const validationError = validateFolder(name, description);

  if (validationError) {
    return res.status(400).json({
      message: validationError
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO folders (user_id, name, description)
       VALUES (?, ?, ?)`,
      [req.user.id, name.trim(), description.trim()]
    );

    await pool.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'folder', ?, 'created', ?)`,
      [
        req.user.id,
        result.insertId,
        JSON.stringify({ name: name.trim() })
      ]
    );

    res.status(201).json({
      message: "Folder created successfully.",
      folder: {
        id: String(result.insertId),
        name: name.trim(),
        description: description.trim(),
        noteCount: 0
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A folder with this name already exists."
      });
    }

    console.error("Failed to create folder:", error.message);

    res.status(500).json({
      message: "Unable to create the folder."
    });
  }
}

async function updateFolder(req, res) {
  const folderId = req.params.id;
  const { name, description } = req.body;

  if (!/^\d+$/.test(folderId)) {
    return res.status(400).json({
      message: "Invalid folder ID."
    });
  }

  if (name === undefined && description === undefined) {
    return res.status(400).json({
      message: "Provide a folder name or description to update."
    });
  }

  if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 100)) {
    return res.status(400).json({
      message: "Enter a valid folder name of at most 100 characters."
    });
  }

  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({
      message: "Folder description must be text."
    });
  }

  if (description !== undefined && description.length > 1000) {
    return res.status(400).json({
      message: "The folder description cannot exceed 1000 characters."
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, name, description
       FROM folders
       WHERE id = ? AND user_id = ?`,
      [folderId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Folder not found."
      });
    }

    const existing = rows[0];

    const nextName = name === undefined ? existing.name : name.trim();

    const nextDescription =
      description === undefined
        ? existing.description
        : description.trim();

    await pool.execute(
      `UPDATE folders
       SET name = ?, description = ?
       WHERE id = ? AND user_id = ?`,
      [nextName, nextDescription, folderId, req.user.id]
    );

    await pool.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'folder', ?, 'updated', ?)`,
      [
        req.user.id,
        folderId,
        JSON.stringify({ name: nextName })
      ]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS noteCount
       FROM notes
       WHERE folder_id = ? AND user_id = ?`,
      [folderId, req.user.id]
    );

    res.json({
      message: "Folder updated successfully.",
      folder: {
        id: String(folderId),
        name: nextName,
        description: nextDescription,
        noteCount: Number(countRows[0].noteCount)
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "A folder with this name already exists."
      });
    }

    console.error("Failed to update folder:", error.message);

    res.status(500).json({
      message: "Unable to update the folder."
    });
  }
}

async function deleteFolder(req, res) {
  const folderId = req.params.id;

  if (!/^\d+$/.test(folderId)) {
    return res.status(400).json({
      message: "Invalid folder ID."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, name
       FROM folders
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [folderId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Folder not found."
      });
    }

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'folder', ?, 'deleted', ?)`,
      [
        req.user.id,
        folderId,
        JSON.stringify({ name: rows[0].name })
      ]
    );

    await connection.execute(
      `DELETE FROM folders
       WHERE id = ? AND user_id = ?`,
      [folderId, req.user.id]
    );

    await connection.commit();

    res.json({
      message: "Folder deleted successfully. Its notes have been kept."
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to delete folder:", error.message);

    res.status(500).json({
      message: "Unable to delete the folder."
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder
};