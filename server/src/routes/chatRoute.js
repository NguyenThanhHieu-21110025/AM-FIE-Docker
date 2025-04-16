const express = require("express");
const ChatbotController = require("../Controller/chatbotController");
const middlewareController = require("../middleware/middleware");

const router = express.Router();
const chatbotController = new ChatbotController();

// Send message to chatbot
router.post("/send", middlewareController.verifyToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    const result = await chatbotController.processUserInput(message, sessionId, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session detail
router.get("/sessions/detail/:sessionId", middlewareController.verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await chatbotController.getSessionDetail(sessionId);

    if (session.userId && session.userId.toString() !== req.user.id && !req.user.admin) {
      return res.status(403).json({ error: "Unauthorized access to chat session" });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new chat session
router.post("/sessions", middlewareController.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    const session = await chatbotController.createSession(userId, title);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's sessions
router.get("/sessions/:userId", middlewareController.verifyToken, async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.user.id;

    if (requestedUserId !== currentUserId && !req.user.admin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const sessions = await chatbotController.getUserSessions(requestedUserId);
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session
router.put('/sessions/:sessionId', middlewareController.verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionData = req.body;
    
    const existingSession = await chatbotController.getSessionDetail(sessionId);
    
    if (existingSession.userId && existingSession.userId.toString() !== req.user.id && !req.user.admin) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const updatedSession = await chatbotController.updateSession(sessionId, sessionData);
    res.status(200).json(updatedSession);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session
router.delete("/sessions/:sessionId", middlewareController.verifyToken, async (req, res) => {
  try {
    const session = await chatbotController.getSessionDetail(req.params.sessionId);

    if (session.userId && session.userId.toString() !== req.user.id && !req.user.admin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const result = await chatbotController.deleteSession(req.params.sessionId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin route for chat history
router.get("/history", middlewareController.verifyTokenAndAdminAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    const chatHistory = await chatbotController.getChatHistory(userId);
    res.status(200).json(chatHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;