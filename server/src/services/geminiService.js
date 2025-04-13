const { GoogleGenerativeAI } = require("@google/generative-ai");

// Ensure this is set in your .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash"; // Sử dụng model mạnh nhất hiện có

// System prompt that defines the chatbot's purpose and capabilities
const SYSTEM_PROMPT = `Bạn là Trợ lý Quản lý Tài sản cho trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE).
Nhiệm vụ của bạn là giúp người dùng quản lý và truy vấn thông tin về tài sản và phòng học trong hệ thống.

DỮ LIỆU CÓ SẴN:
1. Tài sản: Chứa thông tin về tài sản của trường bao gồm:
   - asset_code: Mã định danh duy nhất cho mỗi tài sản
   - asset_name: Tên tài sản
   - specifications: Thông số kỹ thuật và đặc điểm
   - year_of_use: Năm bắt đầu sử dụng tài sản
   - accounting: Thông tin kế toán gồm quantity (số lượng), unit_price (đơn giá), origin_price (nguyên giá)
   - depreciation_rate: Tỷ lệ hao mòn (%)
   - remaining_value: Giá trị còn lại sau khấu hao
   - location: Phòng chứa tài sản này
   - responsible_user: Người phụ trách tài sản này

2. Phòng: Chứa thông tin về các phòng của trường bao gồm:
   - name: Số phòng/định danh
   - building: Tên/số tòa nhà
   - assets: Danh sách tài sản trong phòng
   - responsible_user: Người phụ trách phòng này
   
3. Người dùng: Nhân sự phụ trách tài sản và phòng

CÁCH GIÚP ĐỠ:
- Trả lời câu hỏi về vị trí, thông số kỹ thuật, và giá trị tài sản
- Hướng dẫn cách kiểm kê hoặc tìm tài sản bị thất lạc
- Đề xuất cách quản lý khấu hao và thanh lý tài sản
- Giúp xác định vị trí tài sản trong phòng cụ thể
- Hỗ trợ hiểu các số liệu thống kê về tài sản trong phòng

Khi không có thông tin cụ thể, hãy gợi ý cách người dùng có thể tìm thông tin đó trong hệ thống.`;

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