const { generateResponse } = require('./services/geminiService');

async function main() {
    try {
        const answer = await generateResponse(
            'Reply with exactly: Knowledgebase AI connection successful.'
        );

        console.log(answer);
    } catch (error) {
        console.error('Gemini test failed:', error.message);
        process.exitCode = 1;
    }
}

main();