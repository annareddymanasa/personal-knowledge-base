const pool = require("../config/db");

function validateBookmark(title, url, description) {
  if (typeof title !== "string" || !title.trim()) {
    return "A bookmark title is required.";
  }

  if (title.trim().length > 200) {
    return "The bookmark title cannot exceed 200 characters.";
  }

  if (typeof url !== "string" || !url.trim()) {
    return "A website URL is required.";
  }

  if (url.trim().length > 2048) {
    return "The website URL is too long.";
  }

  if (description !== undefined && typeof description !== "string") {
    return "The description must be text.";
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(
      /^https?:\/\//i.test(url.trim())
        ? url.trim()
        : `https://${url.trim()}`
    );
  } catch {
    return "Please enter a valid website URL.";
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return "Only HTTP and HTTPS websites are supported.";
  }

  return null;
}

async function getBookmarks(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        id,
        title,
        url,
        description,
        is_favorite AS favorite,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM bookmarks
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    res.json({
      bookmarks: rows.map((bookmark, index) => ({
        ...bookmark,
        id: String(bookmark.id),
        favorite: Boolean(bookmark.favorite),
        color: ["blue", "orange", "purple", "green"][index % 4]
      }))
    });
  } catch (error) {
    console.error("Failed to retrieve bookmarks:", error.message);

    res.status(500).json({
      message: "Unable to retrieve bookmarks."
    });
  }
}

async function createBookmark(req, res) {
  const { title, url, description = "" } = req.body;

  const validationError = validateBookmark(title, url, description);

  if (validationError) {
    return res.status(400).json({
      message: validationError
    });
  }

  const normalizedUrl = /^https?:\/\//i.test(url.trim())
    ? url.trim()
    : `https://${url.trim()}`;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO bookmarks
        (user_id, title, url, description, is_favorite)
       VALUES (?, ?, ?, ?, FALSE)`,
      [
        req.user.id,
        title.trim(),
        normalizedUrl,
        description.trim()
      ]
    );

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'bookmark', ?, 'created', ?)`,
      [
        req.user.id,
        result.insertId,
        JSON.stringify({ title: title.trim(), url: normalizedUrl })
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Bookmark saved successfully.",
      bookmark: {
        id: String(result.insertId),
        title: title.trim(),
        url: normalizedUrl,
        description: description.trim(),
        favorite: false,
        color: "blue"
      }
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to create bookmark:", error.message);

    res.status(500).json({
      message: "Unable to save the bookmark."
    });
  } finally {
    connection.release();
  }
}

async function updateBookmark(req, res) {
  const bookmarkId = req.params.id;

  if (!/^\d+$/.test(bookmarkId)) {
    return res.status(400).json({
      message: "Invalid bookmark ID."
    });
  }

  const { title, url, description, favorite } = req.body;

  if (
    title === undefined &&
    url === undefined &&
    description === undefined &&
    favorite === undefined
  ) {
    return res.status(400).json({
      message: "Provide at least one field to update."
    });
  }

  if (title !== undefined && (typeof title !== "string" || !title.trim() || title.trim().length > 200)) {
    return res.status(400).json({
      message: "Enter a valid bookmark title."
    });
  }

  if (url !== undefined && typeof url !== "string") {
    return res.status(400).json({
      message: "The website URL must be text."
    });
  }

  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({
      message: "The description must be text."
    });
  }

  if (favorite !== undefined && typeof favorite !== "boolean") {
    return res.status(400).json({
      message: "Favorite must be true or false."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, title, url, description, is_favorite
       FROM bookmarks
       WHERE id = ? AND user_id = ?
       FOR UPDATE`,
      [bookmarkId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Bookmark not found."
      });
    }

    const existing = rows[0];

    const nextTitle =
      title === undefined ? existing.title : title.trim();

    let nextUrl = existing.url;

    if (url !== undefined) {
      const validationError = validateBookmark(
        nextTitle,
        url,
        description === undefined ? existing.description : description
      );

      if (validationError) {
        await connection.rollback();

        return res.status(400).json({
          message: validationError
        });
      }

      nextUrl = /^https?:\/\//i.test(url.trim())
        ? url.trim()
        : `https://${url.trim()}`;
    }

    const nextDescription =
      description === undefined ? existing.description : description.trim();

    const nextFavorite =
      favorite === undefined ? existing.is_favorite : favorite;

    await connection.execute(
      `UPDATE bookmarks
       SET title = ?, url = ?, description = ?, is_favorite = ?
       WHERE id = ? AND user_id = ?`,
      [
        nextTitle,
        nextUrl,
        nextDescription,
        nextFavorite,
        bookmarkId,
        req.user.id
      ]
    );

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'bookmark', ?, 'updated', ?)`,
      [
        req.user.id,
        bookmarkId,
        JSON.stringify({ title: nextTitle, url: nextUrl })
      ]
    );

    await connection.commit();

    res.json({
      message: "Bookmark updated successfully.",
      bookmark: {
        id: String(bookmarkId),
        title: nextTitle,
        url: nextUrl,
        description: nextDescription,
        favorite: Boolean(nextFavorite)
      }
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to update bookmark:", error.message);

    res.status(500).json({
      message: "Unable to update the bookmark."
    });
  } finally {
    connection.release();
  }
}

async function deleteBookmark(req, res) {
  const bookmarkId = req.params.id;

  if (!/^\d+$/.test(bookmarkId)) {
    return res.status(400).json({
      message: "Invalid bookmark ID."
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, title
       FROM bookmarks
       WHERE id = ? AND user_id = ?`,
      [bookmarkId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Bookmark not found."
      });
    }

    await connection.execute(
      `INSERT INTO activity_logs
        (user_id, entity_type, entity_id, action, details)
       VALUES (?, 'bookmark', ?, 'deleted', ?)`,
      [
        req.user.id,
        bookmarkId,
        JSON.stringify({ title: rows[0].title })
      ]
    );

    await connection.execute(
      "DELETE FROM bookmarks WHERE id = ? AND user_id = ?",
      [bookmarkId, req.user.id]
    );

    await connection.commit();

    res.json({
      message: "Bookmark deleted successfully."
    });
  } catch (error) {
    await connection.rollback();

    console.error("Failed to delete bookmark:", error.message);

    res.status(500).json({
      message: "Unable to delete the bookmark."
    });
  } finally {
    connection.release();
  }
}

module.exports = {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark
};