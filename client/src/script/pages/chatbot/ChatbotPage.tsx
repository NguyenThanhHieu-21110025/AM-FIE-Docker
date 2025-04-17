import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import ChatBox from "../../components/ChatBox";
import ChatInput from "../../components/ChatInput";
import ChatSidebar from "../../components/ChatSideBar";
import "../../../css/Chatbot.css";
import { Chat, ChatSession } from "../../interfaces/Chat";
import ChatbotService, { formatChat } from "../../services/chatService";

const ChatbotPage: React.FC = () => {
  const { refreshAccessToken, accessToken, _id } = useAuth(); 
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const userId = _id;
  const chatboxRef = useRef<HTMLDivElement>(null);

  // Khởi tạo với một session mặc định hoặc tải từ storage
  useEffect(() => {
    if (!isInitialized && userId) {
      loadSessions();
      setIsInitialized(true);
    }
  }, [isInitialized, userId]);

  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId]);

  // Tải danh sách sessions
  const loadSessions = async () => {
    try {      
      if (!userId) {
        console.warn("No userId available from auth context, cannot load sessions");
        createNewSession();
        return;
      }
      
      const loadedSessions = await ChatbotService.fetchSessions(userId, accessToken);
      
      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);
      } else {
        // Nếu không có dữ liệu, tạo session mới
        createNewSession();
      }
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      createNewSession();
    }
  };

  // Tạo phiên trò chuyện mới
  const createNewSession = async (): Promise<ChatSession> => {
    try {
      const newSession = await ChatbotService.createSession({
        userId,
        title: "Cuộc trò chuyện mới"
      }, accessToken);

      // Thêm tin nhắn chào mừng từ bot
      const welcomeMessage = ChatbotService.createWelcomeMessage(newSession.id);

      // Thêm tin nhắn chào mừng vào session
      newSession.messages = [welcomeMessage];

      const updatedSessions: ChatSession[] = [newSession, ...sessions];
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);

      return newSession;
    } catch (error) {
      console.error("Error creating new session:", error);
      throw error;
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      setLoading(true);
      setActiveSessionId(sessionId);
      
      // Fetch full session details including messages
      const sessionDetail = await ChatbotService.fetchSessionDetail(sessionId, accessToken);
      
      // Update the selected session with full details
      const updatedSessions = sessions.map(session => 
        session.id === sessionId ? sessionDetail : session
      );
      
      setSessions(updatedSessions);
    } catch (error) {
      console.error("Error loading session details:", error);
      // Optionally show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (sessionId === activeSessionId && sessions.length > 1) {
      const newActiveIndex = sessions.findIndex((s) => s.id === sessionId) === 0 ? 1 : 0;
      setActiveSessionId(sessions[newActiveIndex].id);
    } else if (sessionId === activeSessionId) {
      setActiveSessionId("");
    }

    try {
      await ChatbotService.deleteSession(sessionId, userId, accessToken);
      
      // Cập nhật UI
      const updatedSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(updatedSessions);
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim()) return;

    // Tìm session đang active
    let sessionIndex = sessions.findIndex((s) => s.id === activeSessionId);
    let currentSession: ChatSession;

    // Nếu không có session active, tạo mới
    if (sessionIndex === -1) {
      currentSession = await createNewSession();
      sessionIndex = 0;
    } else {
      currentSession = { ...sessions[sessionIndex] };
    }

    // Thêm tin nhắn người dùng vào chat
    const userMessage: Chat = formatChat({
      id: `msg-${Date.now()}-user`,
      sessionId: activeSessionId,
      role: "user",
      content: userInput,
      timestamp: new Date(),
    });

    // Xác định messages, đảm bảo không bị null/undefined
    const existingMessages = currentSession.messages || [];

    // Cập nhật session với tin nhắn mới
    const updatedSession = {
      ...currentSession,
      messages: [...existingMessages, userMessage],
      updatedAt: new Date(),
    };

    // Nếu là tin nhắn đầu tiên, cập nhật tiêu đề session
    if (existingMessages.length === 0) {
      const updatedSessions = ChatbotService.updateSessionTitle(
        sessions, 
        activeSessionId, 
        userInput
      );
      setSessions(updatedSessions);
    }

    // Cập nhật state
    const updatedSessions: ChatSession[] = [...sessions];
    updatedSessions[sessionIndex] = updatedSession;
    setSessions(updatedSessions);

    setLoading(true);

    try {
      // Ghi lại thông tin session hiện tại
      const currentActiveSessionId = activeSessionId;
      const isLocalSession = currentActiveSessionId.startsWith("local-");

      // Nếu sessionId bắt đầu bằng 'local-', gửi null để backend tạo mới
      const sessionIdToSend = isLocalSession ? null : currentActiveSessionId;

      const data = await ChatbotService.sendMessage({
        message: userInput,
        sessionId: sessionIdToSend,
        userId
      }, accessToken);

      // Cờ đánh dấu là đã xử lý phản hồi từ bot hay chưa
      let botResponseHandled = false;

      // *** XỬ LÝ SESSION LOCAL ĐƯỢC THAY THẾ BẰNG SESSION SERVER ***
      if (data.sessionId && isLocalSession) {
        try {
          // Lấy session chi tiết từ server
          const serverSession = await ChatbotService.fetchSessionDetail(data.sessionId, accessToken);
          
          // Kiểm tra xem tin nhắn người dùng vừa gửi đã có trong dữ liệu từ server chưa
          const serverMessages = serverSession.messages || [];
          const userMessageExists = serverMessages.some(
            (msg) => msg.role === "user" && msg.content === userInput
          );

          // Chuẩn bị tin nhắn để thêm vào
          const messagesToKeep: Chat[] = [];

          // Nếu server đã có tin nhắn người dùng, sử dụng messages từ server
          if (userMessageExists) {
            messagesToKeep.push(...serverMessages);
          } else {
            // Nếu không, thêm tin nhắn người dùng hiện tại vào messages từ server
            messagesToKeep.push(...serverMessages, userMessage);
          }

          // Kiểm tra xem tin nhắn bot đã có trong dữ liệu server chưa
          const botMessageExists = serverMessages.some(
            (msg) =>
              msg.role === "assistant" &&
              new Date(msg.timestamp).getTime() > new Date().getTime() - 10000 // Trong 10 giây qua
          );

          // Nếu chưa có tin nhắn bot từ server, thêm vào
          if (!botMessageExists) {
            const botMessage: Chat = formatChat({
              id: `msg-${Date.now()}-bot`,
              sessionId: data.sessionId,
              role: "assistant",
              content: data.response,
              timestamp: new Date(),
            });
            messagesToKeep.push(botMessage);
          }

          // Cập nhật serverSession với messages mới
          const updatedServerSession = {
            ...serverSession,
            messages: messagesToKeep,
          };

          // Cập nhật danh sách sessions
          const updatedSessionsWithNewId = sessions.map((s) =>
            s.id === currentActiveSessionId ? updatedServerSession : s
          );

          setSessions(updatedSessionsWithNewId);
          setActiveSessionId(data.sessionId);

          // Đánh dấu là đã xử lý xong
          botResponseHandled = true;
        } catch (error) {
          console.error("Error fetching session details:", error);
        }
      }

      // *** XỬ LÝ BÌNH THƯỜNG KHI ĐÃ CÓ SESSION SERVER ***
      if (!botResponseHandled) {
        try {
          // Tải lại session mới nhất từ server
          const serverSession = await ChatbotService.fetchSessionDetail(
            data.sessionId || currentActiveSessionId, accessToken
          );

          // Cập nhật session trong danh sách
          const updatedSessions = sessions.map((s) =>
            s.id === (data.sessionId || currentActiveSessionId) ? serverSession : s
          );

          setSessions(updatedSessions);
        } catch (error) {
          console.error("Error fetching updated session:", error);

          // Fallback: Thêm phản hồi của bot vào chat hiện tại
          const botMessage: Chat = formatChat({
            id: `msg-${Date.now()}-bot`,
            sessionId: data.sessionId || currentActiveSessionId,
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          });

          // Tìm session trong danh sách hiện tại
          const updatedSessionIndex = sessions.findIndex(
            (s) => s.id === (data.sessionId || currentActiveSessionId)
          );

          if (updatedSessionIndex !== -1) {
            const updatedSessions = [...sessions];
            const sessionToUpdate = {...updatedSessions[updatedSessionIndex]};
            const currentMessages = sessionToUpdate.messages || [];

            // Thêm tin nhắn bot vào session
            sessionToUpdate.messages = [...currentMessages, botMessage];
            sessionToUpdate.updatedAt = new Date();

            updatedSessions[updatedSessionIndex] = sessionToUpdate;
            setSessions(updatedSessions);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Hiển thị lỗi dưới dạng tin nhắn hệ thống
      const sessionIndex = sessions.findIndex((s) => s.id === activeSessionId);
      if (sessionIndex !== -1) {
        const errorMessage = formatChat({
          id: `msg-${Date.now()}-system`,
          sessionId: activeSessionId,
          role: "system",
          content: "Lỗi kết nối: Không thể nhận phản hồi từ trợ lý.",
          timestamp: new Date(),
        });

        const updatedSessions = [...sessions];
        const updatedSession = {...updatedSessions[sessionIndex]};
        updatedSession.messages = [...(updatedSession.messages || []), errorMessage];

        updatedSessions[sessionIndex] = updatedSession;
        setSessions(updatedSessions);
      }
    } finally {
      setLoading(false);
    }
  };

  // Lấy tin nhắn của session đang active
  const activeSessionMessages = sessions.find((s) => s.id === activeSessionId)?.messages || [];

  return (
    <div className="page-wrapper">
      <div className="chatbot-page">
        <div className="chatbot-container">
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionSelect={handleSessionSelect}
            onNewSession={createNewSession}
            onDeleteSession={handleDeleteSession}
          />
          <div className="chat-main">
            <div className="chat-header">
              <h2>
                {sessions.length > 0
                  ? sessions.find((s) => s.id === activeSessionId)?.title || "Trò chuyện mới"
                  : "Không có cuộc trò chuyện"}
              </h2>
            </div>
            <div ref={chatboxRef} className="chatbox-container">
              {sessions.length > 0 ? (
                <ChatBox messages={activeSessionMessages} loading={loading} />
              ) : (
                <div className="empty-state">
                  <p>Không có cuộc trò chuyện nào</p>
                  <p>Vui lòng tạo cuộc trò chuyện mới để bắt đầu</p>
                </div>
              )}
            </div>
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={loading || sessions.length === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;