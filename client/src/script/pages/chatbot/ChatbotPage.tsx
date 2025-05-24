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
  // Tải danh sách sessions khi accessToken và userId có sẵn
  useEffect(() => {
    if (userId && accessToken) {
      loadSessions();
      setIsInitialized(true);
    } else if (userId && !accessToken) {
      console.log("UserId available but accessToken missing, waiting for token");
    }
  }, [userId, accessToken]);
  
  // Tải lại sessions khi accessToken thay đổi (ví dụ: sau khi refreshed)
  useEffect(() => {
    if (userId && accessToken && isInitialized) {
      loadSessions();
    }
  }, [accessToken]);
  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId]);

  // Effect để xử lý khi activeSessionId thay đổi
  useEffect(() => {
    // Đảm bảo UI cập nhật khi chuyển từ welcome sang chat
    if (activeSessionId) {
      const timer = setTimeout(() => {
        if (chatboxRef.current) {
          chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSessionId]); 
    // Tải danh sách sessions
  const loadSessions = async () => {
    try {
      if (!userId) {
        console.warn("No userId available from auth context, cannot load sessions");
        return;
      }

      if (!accessToken) {
        console.warn("No accessToken available, cannot load sessions");
        return;
      }

      const loadedSessions = await ChatbotService.fetchSessions(
        userId,
        accessToken
      );

      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        // Không set activeSessionId để hiển thị welcome container
      } else {
        console.log("No sessions found for user");
      }
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      
      // Cố gắng làm mới token nếu gặp lỗi 403
      if (error instanceof Error && error.message.includes("403")) {
        try {
          await refreshAccessToken();
          // Token sẽ được cập nhật trong state và useEffect sẽ kích hoạt loadSessions lại
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError);
        }
      }
    }
  };
  // Tạo phiên trò chuyện mới
  const createNewSession = async (): Promise<ChatSession> => {
    try {
      if (!userId) {
        throw new Error("UserId not available");
      }
      
      if (!accessToken) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          throw new Error("Failed to refresh access token");
        }
      }
      
      // Tạo session mới từ server
      const newSession = await ChatbotService.createSession(
        {
          userId,
          title: "Cuộc trò chuyện mới",
        },
        accessToken
      );

      // Thêm tin nhắn chào mừng từ bot
      const welcomeMessage = ChatbotService.createWelcomeMessage(newSession.id);

      // Thêm tin nhắn chào mừng vào session
      newSession.messages = [welcomeMessage];

      // Cập nhật state với session mới
      const updatedSessions: ChatSession[] = [newSession, ...sessions];
      setSessions(updatedSessions);

      // Thiết lập session này làm active session
      setActiveSessionId(newSession.id);

      // Timeout ngắn để đảm bảo UI được cập nhật đúng
      setTimeout(() => {
        if (chatboxRef.current) {
          chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
        }
      }, 50);

      return newSession;
    } catch (error) {
      console.error("Error creating new session:", error);
      
      // Xử lý lỗi 403
      if (error instanceof Error && (
          error.message.includes("403") || 
          error.message.includes("Forbidden") ||
          error.message.includes("token")
        )) {
        try {
          await refreshAccessToken();
          // Để tránh vòng lặp vô hạn, không gọi lại createNewSession ở đây
          // UI sẽ được cập nhật thông qua useEffect khi token được refresh
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError);
        }
      }
      
      throw error;
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      setLoading(true);
      setActiveSessionId(sessionId);

      // Fetch full session details including messages
      const sessionDetail = await ChatbotService.fetchSessionDetail(
        sessionId,
        accessToken
      );

      // Update the selected session with full details
      const updatedSessions = sessions.map((session) =>
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
      const newActiveIndex =
        sessions.findIndex((s) => s.id === sessionId) === 0 ? 1 : 0;
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
      try {
        currentSession = await createNewSession();
        // Sau khi tạo session mới, cập nhật sessionIndex
        sessionIndex = sessions.findIndex((s) => s.id === currentSession.id);
        if (sessionIndex === -1) {
          // Safety measure if session hasn't been added to state yet
          sessionIndex = 0;
        }
      } catch (error) {
        console.error("Error creating new session:", error);
        return; // Thoát nếu không thể tạo session
      }
    } else {
      currentSession = { ...sessions[sessionIndex] };
    }

    // Thêm tin nhắn người dùng vào chat - sử dụng currentSession.id thay vì activeSessionId
    // để đảm bảo tin nhắn được gắn với session đúng, kể cả khi session vừa được tạo
    const userMessage: Chat = formatChat({
      id: `msg-${Date.now()}-user`,
      sessionId: currentSession.id, // Đổi từ activeSessionId thành currentSession.id
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
    }; // Nếu là tin nhắn đầu tiên, cập nhật tiêu đề session
    if (existingMessages.length === 0) {
      const updatedSessions = ChatbotService.updateSessionTitle(
        sessions,
        currentSession.id, // Sử dụng currentSession.id thay vì activeSessionId
        userInput
      );
      setSessions(updatedSessions);

      // Đảm bảo activeSessionId được cập nhật
      setActiveSessionId(currentSession.id);
    }

    // Cập nhật state
    const updatedSessions: ChatSession[] = [...sessions];
    updatedSessions[sessionIndex] = updatedSession;
    setSessions(updatedSessions);

    setLoading(true);

    try {
      // Ghi lại thông tin session hiện tại - sử dụng currentSession.id
      const currentActiveSessionId = currentSession.id;
      const isLocalSession = currentActiveSessionId.startsWith("local-");

      // Nếu sessionId bắt đầu bằng 'local-', gửi null để backend tạo mới
      const sessionIdToSend = isLocalSession ? null : currentActiveSessionId;

      const data = await ChatbotService.sendMessage(
        {
          message: userInput,
          sessionId: sessionIdToSend,
          userId,
        },
        accessToken
      );

      // Cờ đánh dấu là đã xử lý phản hồi từ bot hay chưa
      let botResponseHandled = false;

      // *** XỬ LÝ SESSION LOCAL ĐƯỢC THAY THẾ BẰNG SESSION SERVER ***
      if (data.sessionId && isLocalSession) {
        try {
          // Lấy session chi tiết từ server
          const serverSession = await ChatbotService.fetchSessionDetail(
            data.sessionId,
            accessToken
          );
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
      
          // Cập nhật danh sách sessions một cách an toàn
          const updatedSessionsWithNewId = [...sessions];
          const sessionIndex = updatedSessionsWithNewId.findIndex(
            (s) => s.id === currentActiveSessionId
          );

          if (sessionIndex !== -1) {
            // Thay thế session cũ nếu tìm thấy
            updatedSessionsWithNewId[sessionIndex] = updatedServerSession;
          } else {
            // Thêm mới nếu không tìm thấy session cũ
            updatedSessionsWithNewId.unshift(updatedServerSession);
          }

          // Cập nhật state
          setSessions(updatedSessionsWithNewId);
          setActiveSessionId(data.sessionId);

          // Đánh dấu là đã xử lý xong
          botResponseHandled = true;
        } catch (error) {
          console.error("Error fetching session details:", error);
        }
      } // *** XỬ LÝ BÌNH THƯỜNG KHI ĐÃ CÓ SESSION SERVER ***
      if (!botResponseHandled) {
        try {
          // Tải lại session mới nhất từ server
          const sessionIdToFetch = data.sessionId || currentActiveSessionId;
          
          const serverSession = await ChatbotService.fetchSessionDetail(
            sessionIdToFetch,
            accessToken
          );
          // Cập nhật session trong danh sách
          const updatedSessions = [...sessions];
          const existingSessionIndex = updatedSessions.findIndex(
            (s) => s.id === sessionIdToFetch
          );

          if (existingSessionIndex !== -1) {
            // Nếu session đã tồn tại, cập nhật nó
            updatedSessions[existingSessionIndex] = serverSession;
          } else {
            // Nếu không, thêm session mới vào đầu danh sách
            updatedSessions.unshift(serverSession);
          }

          // Đảm bảo activeSessionId được cập nhật nếu cần
          if (data.sessionId && data.sessionId !== currentActiveSessionId) {
            setActiveSessionId(data.sessionId);
          }
          setSessions(updatedSessions);

          // Đảm bảo scroll xuống cuối sau khi cập nhật tin nhắn
          setTimeout(() => {
            if (chatboxRef.current) {
              chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
            }
          }, 100);
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
          const sessionIdToUpdate = data.sessionId || currentActiveSessionId;
          const updatedSessionIndex = sessions.findIndex(
            (s) => s.id === sessionIdToUpdate
          );

          if (updatedSessionIndex !== -1) {
            const updatedSessions = [...sessions];
            const sessionToUpdate = { ...updatedSessions[updatedSessionIndex] };
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
        const updatedSession = { ...updatedSessions[sessionIndex] };
        updatedSession.messages = [
          ...(updatedSession.messages || []),
          errorMessage,
        ];

        updatedSessions[sessionIndex] = updatedSession;
        setSessions(updatedSessions);
      }
    } finally {
      setLoading(false);
    }
  }; // Lấy tin nhắn của session đang active
  const activeSession = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)
    : null;
  const activeSessionMessages = activeSession?.messages || [];

  // Xác định khi nào hiển thị welcome container
  const showWelcomeContainer = !activeSessionId;

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
                {activeSessionId
                  ? sessions.find((s) => s.id === activeSessionId)?.title ||
                    "Trò chuyện mới"
                  : "Trợ lý AMFIE"}
              </h2>
            </div>{" "}
            <div ref={chatboxRef} className="chatbox-container">
              {showWelcomeContainer ? (
                <div className="welcome-container" key="welcome-container">
                  <div className="welcome-content">
                    <h3>Chào mừng bạn đến với AMFIE ChatBot!</h3>
                    <p>Tôi sẵn sàng hỗ trợ bạn với các câu hỏi về:</p>
                    <ul>
                      <li>Thông tin về các sản phẩm và dịch vụ</li>
                      <li>Hướng dẫn sử dụng nền tảng</li>
                      <li>Hỗ trợ kỹ thuật và giải quyết vấn đề</li>
                    </ul>
                    <p>
                      Hãy nhập câu hỏi của bạn vào ô bên dưới để bắt đầu trò chuyện!
                    </p>
                  </div>
                </div>
              ) : (
                <ChatBox
                  messages={activeSessionMessages}
                  loading={loading}
                  key="chat-box"
                />
              )}
            </div>
            <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
