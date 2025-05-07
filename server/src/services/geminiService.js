const { GoogleGenerativeAI } = require("@google/generative-ai");

// Ensure this is set in your .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash"; 

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
            // Safe error logging that doesn't expose system prompt
            console.log("Chat format failed, trying alternative approach:", 
                chatError.message.substring(0, chatError.message.indexOf('Invalid value at')));
            
            // Method 2: Fallback to standard prompt format
            const prompt = `${SYSTEM_PROMPT}\n\nNgười dùng: ${message}\nTrợ lý:`;
            const result = await model.generateContent(prompt);
            return result.response.text();
        }
    } catch (error) {
        // Sanitize any potential error messages that might contain the system prompt
        const sanitizedError = sanitizeError(error);
        console.error('Error sending message to Gemini:', sanitizedError);
        throw new Error('Failed to communicate with Gemini API');
    }
}

// Helper function to sanitize error messages
function sanitizeError(error) {
    if (!error || !error.message) return 'Unknown error';
    
    // Create a safe version of the error that won't contain the system prompt
    const errorMessage = error.message;
    
    // Remove anything that might be part of the system prompt
    if (SYSTEM_PROMPT && errorMessage.includes(SYSTEM_PROMPT)) {
        return errorMessage.replace(SYSTEM_PROMPT, '[REDACTED SYSTEM PROMPT]');
    }
    
    // Handle cases where only part of the prompt might be in the error
    if (SYSTEM_PROMPT && SYSTEM_PROMPT.length > 20) {
        // Check for significant chunks of the system prompt
        const firstFewWords = SYSTEM_PROMPT.substring(0, 30);
        if (errorMessage.includes(firstFewWords)) {
            return 'Error contains system prompt content [REDACTED]';
        }
    }
    
    // For API errors, just return the status code and short description
    if (errorMessage.includes('https://generativelanguage.googleapis.com')) {
        const statusMatch = errorMessage.match(/\[(\d+)[^\]]+\]/);
        if (statusMatch) {
            return `API Error: ${statusMatch[0]}`;
        }
    }
    
    return errorMessage;
}

module.exports = {
    getResponse
};