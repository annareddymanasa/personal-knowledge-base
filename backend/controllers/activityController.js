const pool = require("../config/db");

function parseDetails(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return { message: String(value) };
  }
}

async function getActivities(req, res) {
  const requestedPage = Number.parseInt(req.query.page, 10);
  const requestedLimit = Number.parseInt(req.query.limit, 10);

  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const limit =
    Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 20;

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    return res.status(400).json({
      message: "Invalid page number."
    });
  }

  try {
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM activity_logs
       WHERE user_id = ?`,
      [req.user.id]
    );

    const total = Number(countRows[0].total);
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.execute(
      `SELECT
        id,
        entity_type AS entityType,
        entity_id AS entityId,
        action,
        details,
        created_at AS createdAt
       FROM activity_logs
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    res.json({
      activities: rows.map((activity) => ({
        id: String(activity.id),
        entityType: activity.entityType,
        entityId:
          activity.entityId === null
            ? null
            : String(activity.entityId),
        action: activity.action,
        details: parseDetails(activity.details),
        createdAt: activity.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error("Failed to retrieve activities:", error.message);

    res.status(500).json({
      message: "Unable to retrieve your activity history."
    });
  }
}

module.exports = {
  getActivities
};