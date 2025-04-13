const express = require('express');
const ChatbotController = require('../Controller/chatbotController');

const router = express.Router();
const chatbotController = new ChatbotController();

// Gửi tin nhắn đến chatbot trong phiên chat cụ thể
router.post('/send', async (req, res) => {
    try {
        const { message, sessionId, userId } = req.body;
        const result = await chatbotController.processUserInput(message, sessionId, userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách phiên chat của người dùng
router.get('/sessions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const sessions = await chatbotController.getUserSessions(userId);
        res.status(200).json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy chi tiết của một phiên chat (bao gồm tin nhắn)
router.get('/sessions/detail/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await chatbotController.getSessionDetail(sessionId);
        res.status(200).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tạo phiên chat mới
router.post('/sessions', async (req, res) => {
    try {
        const { userId, title } = req.body;
        const session = await chatbotController.createSession(userId, title);
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Xóa phiên chat
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await chatbotController.deleteSession(sessionId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy toàn bộ lịch sử chat (tương thích với giao diện cũ)
router.get('/history', async (req, res) => {
    try {
        const { userId } = req.query;
        const chatHistory = await chatbotController.getChatHistory(userId);
        res.status(200).json(chatHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;