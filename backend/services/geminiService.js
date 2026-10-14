require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from the backend environment');
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generateResponse(prompt) {
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL,
        contents: prompt
    });

    return response.text;
}

module.exports = { generateResponse };