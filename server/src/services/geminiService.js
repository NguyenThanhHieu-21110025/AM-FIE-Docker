const { GoogleGenerativeAI } = require("@google/generative-ai");

// Ensure this is set in your .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash"; // Sử dụng model mạnh nhất hiện có

// System prompt that defines the chatbot's purpose and capabilities
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;

async function getResponse(message) {
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 1024,
            }
        });
        
        // Method 1: Use the chat format with system instructions
        try {
            const chat = model.startChat({
                generationConfig: {
                    temperature: 0.2,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1024,
                },
                systemInstruction: SYSTEM_PROMPT,
            });

            const result = await chat.sendMessage(message);
            return result.response.text();
        } catch (chatError) {
            console.log("Chat format failed, trying alternative approach:", chatError.message);
            
            // Method 2: Fallback to standard prompt format
            const prompt = `${SYSTEM_PROMPT}\n\nNgười dùng: ${message}\nTrợ lý:`;
            const result = await model.generateContent(prompt);
            return result.response.text();
        }
    } catch (error) {
        console.error('Error sending message to Gemini:', error);
        throw new Error('Failed to communicate with Gemini API');
    }
}

module.exports = {
    getResponse
};