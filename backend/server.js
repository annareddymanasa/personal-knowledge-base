require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const notesRoutes = require("./routes/notesRoutes");
const bookmarksRoutes = require("./routes/bookmarksRoutes");
const foldersRoutes = require("./routes/foldersRoutes");
const tagsRoutes = require("./routes/tagsRoutes");
const documentsRoutes = require("./routes/documentsRoutes");
const activityRoutes = require("./routes/activityRoutes");
const noteVersionsRoutes = require("./routes/noteVersionsRoutes");
const profileRoutes = require("./routes/profileRoutes");
const twoFactorRoutes = require("./routes/twoFactorRoutes");
const aiChatRoutes = require("./routes/aiChatRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173"
  })
);

app.use(express.json({ limit: "1mb" }));

app.use("/api/folders", foldersRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/versions", noteVersionsRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Personal Knowledge Base API is running"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS database_name, 1 AS connected"
    );

    res.json({
      status: "success",
      database: rows[0].database_name,
      mysql: rows[0].connected === 1 ? "connected" : "disconnected"
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Unable to connect to the database"
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/bookmarks", bookmarksRoutes);
app.use("/api/2fa", twoFactorRoutes);
app.use("/api/ai-chat", aiChatRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found."
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  res.status(500).json({
    message: "Something went wrong."
  });
});

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must contain at least 32 characters.");
    }

    const connection = await pool.getConnection();

    await connection.ping();
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("MySQL database connected successfully");
    });
  } catch (error) {
    console.error("Unable to start the server:", error.message);
    process.exit(1);
  }
}

startServer();