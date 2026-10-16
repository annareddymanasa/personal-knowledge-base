const { generateResponse } = require("../services/geminiService");

function stripMarkup(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonResponse(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("AI returned an invalid response.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function generateNoteInsights(req, res) {
  const title = String(req.body?.title || "").trim().slice(0, 200);
  const content = stripMarkup(req.body?.content).slice(0, 12000);

  if (content.length < 20) {
    return res.status(400).json({ message: "Please provide at least 20 characters of note content." });
  }

  const prompt = `You are an assistant inside a personal knowledge base. Analyze the note and return only valid JSON with exactly these fields: summary (string, 1-3 concise sentences), suggestions (array of 3-5 practical and directly relevant strings), suggestedTags (array of 3-6 short lowercase tag strings). Suggestions must relate specifically to the supplied note and must not invent facts. Do not use markdown fences.\n\nTitle: ${title || "Untitled note"}\n\nNote content:\n${content}`;

  try {
    const raw = await generateResponse(prompt);
    const result = parseJsonResponse(raw);
    if (typeof result.summary !== "string" || !Array.isArray(result.suggestions) || !Array.isArray(result.suggestedTags)) {
      throw new Error("AI response is missing required fields.");
    }
    return res.json({
      summary: result.summary.slice(0, 1200),
      suggestions: result.suggestions.filter(item => typeof item === "string").slice(0, 5).map(item => item.slice(0, 300)),
      suggestedTags: [...new Set(result.suggestedTags.filter(item => typeof item === "string").map(item => item.trim().toLowerCase()).filter(Boolean))].slice(0, 6)
    });
  } catch (error) {
    console.error("Note insights generation failed:", error.message);
    return res.status(503).json({ message: "AI insights are temporarily unavailable. You can still save your note." });
  }
}

module.exports = { generateNoteInsights };
