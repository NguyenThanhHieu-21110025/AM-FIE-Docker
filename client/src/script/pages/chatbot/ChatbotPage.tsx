import React, { useState, useEffect, useRef } from "react";
import ChatBox from "../../components/ChatBox";
import ChatInput from "../../components/ChatInput";
import ChatSidebar from "../../components/ChatSideBar";
import "../../../css/Chatbot.css";
import { Chat, ChatSession } from "../../interfaces/Chat";

// API base URL
const API_BASE_URL = "http://localhost:8080";

// Helper để đảm bảo Chat object có định dạng đúng
const formatChat = (msg: any): Chat => {
  return {
    id: String(msg.id || msg._id || `msg-${Date.now()}`),
    sessionId: msg.sessionId ? String(msg.sessionId) : undefined,
    role: (msg.role || (msg.userInput ? "user" : "assistant")) as
      | "user"
      | "assistant"
      | "system",
    content: String(
      msg.content || msg.text || msg.userInput || msg.botResponse || ""
    ),
    timestamp: new Date(msg.timestamp || Date.now()),
    metadata: msg.metadata || {},
    userInput:
      msg.role === "user" || msg.userInput
        ? String(msg.content || msg.userInput || "")
        : "",
    botResponse:
      msg.role === "assistant" || msg.botResponse
        ? String(msg.content || msg.botResponse || "")
        : "",
    sender: msg.role === "user" || msg.userInput ? "user" : "bot",
    text: String(
      msg.content || msg.text || msg.userInput || msg.botResponse || ""
    ),
  };
};

// Helper để đảm bảo ChatSession object có định dạng đúng
const formatChatSession = (session: any): ChatSession => {
  return {
    id: String(session._id || session.id),
    title: String(session.title || "Cuộc trò chuyện mới"),
    userId: session.userId ? String(session.userId) : undefined,
    isActive: Boolean(session.isActive !== false),
    createdAt: new Date(session.createdAt || Date.now()),
    updatedAt: new Date(session.updatedAt || Date.now()),
    messages: Array.isArray(session.messages)
      ? session.messages.map((msg: any) => formatChat(msg))
      : [],
    metadata: session.metadata || {},
  };
};

const ChatbotPage: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Lấy userId từ localStorage (giả sử đã đăng nhập) hoặc null nếu không đăng nhập
  const userId = localStorage.getItem("userId");
  console.log("Current userId from localStorage:", userId);
  const chatboxRef = useRef<HTMLDivElement>(null);

  // Khởi tạo với một session mặc định hoặc tải từ storage
  useEffect(() => {
    if (!isInitialized) {
      loadSessions();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId]);

  // Tải danh sách sessions
  const loadSessions = async () => {
    try {
      // Thử tải từ localStorage trước
      const savedSessions = localStorage.getItem("chatSessions");
      if (savedSessions) {
        try {
          const parsedSessions = JSON.parse(savedSessions);
          // Đảm bảo mảng có định dạng chính xác
          const formattedSessions = parsedSessions.map((session: any) =>
            formatChatSession(session)
          );
          setSessions(formattedSessions);
          setActiveSessionId(formattedSessions[0]?.id || "");
          return;
        } catch (parseError) {
          console.error("Error parsing saved sessions:", parseError);
          localStorage.removeItem("chatSessions");
        }
      }

      // Nếu có userId, tải sessions từ API
      if (userId) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/chat/sessions/${userId}`
          );
          if (response.ok) {
            const sessionsData = await response.json();

            if (sessionsData && sessionsData.length > 0) {
              // Chuyển đổi định dạng sessions để phù hợp với giao diện
              const formattedSessions = sessionsData.map((session: any) =>
                formatChatSession(session)
              );

              setSessions(formattedSessions);
              setActiveSessionId(formattedSessions[0].id);
              saveSessions(formattedSessions);
              return;
            }
          }
        } catch (apiError) {
          console.error("Error loading sessions from API:", apiError);
        }
      } else {
        // Nếu không có userId, thử tải history theo cách cũ
        try {
          const response = await fetch(`${API_BASE_URL}/api/chat/history`);
          if (response.ok) {
            const messages = await response.json();

            if (messages && messages.length > 0) {
              // Nhóm tin nhắn theo sessionId
              const sessionMap = new Map<string, ChatSession>();

              messages.forEach((msg: any) => {
                const sessionId =
                  msg.sessionId ||
                  `session-${new Date(msg.timestamp).toLocaleDateString()}`;

                if (!sessionMap.has(sessionId)) {
                  sessionMap.set(
                    sessionId,
                    formatChatSession({
                      id: sessionId,
                      title:
                        msg.metadata?.sessionTitle ||
                        `Cuộc trò chuyện ${new Date(
                          msg.timestamp
                        ).toLocaleDateString()}`,
                      isActive: true,
                      createdAt: new Date(msg.timestamp),
                      updatedAt: new Date(msg.timestamp),
                      messages: [],
                    })
                  );
                }

                const formattedMsg = formatChat({
                  id: msg._id,
                  sessionId: sessionId,
                  role: msg.userInput ? "user" : "assistant",
                  content: msg.userInput || msg.botResponse,
                  timestamp: msg.timestamp,
                  metadata: msg.metadata,
                });

                const session = sessionMap.get(sessionId);
                if (session && session.messages) {
                  session.messages.push(formattedMsg);
                }
              });

              const newSessions = Array.from(sessionMap.values()).sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime()
              );

              if (newSessions.length > 0) {
                setSessions(newSessions);
                setActiveSessionId(newSessions[0].id);
                saveSessions(newSessions);
                return;
              }
            }
          }
        } catch (historyError) {
          console.error("Error loading chat history:", historyError);
        }
      }

      // Nếu không có dữ liệu, tạo session mới
      createNewSession();
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      createNewSession();
    }
  };

  const saveSessions = (updatedSessions: ChatSession[]) => {
    try {
      localStorage.setItem("chatSessions", JSON.stringify(updatedSessions));
    } catch (error) {
      console.error("Error saving sessions to localStorage:", error);
    }
  };

  // Tạo phiên trò chuyện mới
  const createNewSession = async (): Promise<ChatSession> => {
    try {
      let newSession: ChatSession;

      if (userId) {
        try {
          // Tạo session mới qua API
          const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, title: "Cuộc trò chuyện mới" }),
          });

          if (response.ok) {
            const sessionData = await response.json();
            newSession = formatChatSession(sessionData);
          } else {
            throw new Error("Không thể tạo phiên chat mới");
          }
        } catch (apiError) {
          console.error("Error creating session via API:", apiError);
          // Fallback to local session if API call fails
          newSession = formatChatSession({
            id: `local-session-${Date.now()}`,
            title: `Cuộc trò chuyện mới`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          });
        }
      } else {
        // Tạo session cục bộ
        newSession = formatChatSession({
          id: `local-session-${Date.now()}`,
          title: `Cuộc trò chuyện mới`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        });
      }

      // Thêm tin nhắn chào mừng từ bot
      const welcomeMessage: Chat = formatChat({
        id: `msg-welcome-${Date.now()}`,
        sessionId: newSession.id,
        role: "assistant",
        content:
          "👋 Xin chào! Tôi là Trợ lý Quản lý Tài sản của Trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE).\n\nTôi có thể giúp bạn:\n• Tra cứu thông tin về tài sản trong trường\n• Tìm kiếm tài sản theo phòng, mã số, năm sử dụng\n• Cung cấp thông tin về giá trị, tình trạng tài sản\n• Trả lời các câu hỏi về quản lý tài sản\n\nHãy đặt câu hỏi để tôi có thể hỗ trợ bạn!",
        timestamp: new Date(),
      });

      // Thêm tin nhắn chào mừng vào session
      newSession.messages = [welcomeMessage];

      const updatedSessions: ChatSession[] = [newSession, ...sessions];
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);
      saveSessions(updatedSessions);

      return newSession;
    } catch (error) {
      console.error("Error creating new session:", error);
      // Fallback tạo local session
      const newSession = formatChatSession({
        id: `local-session-${Date.now()}`,
        title: `Cuộc trò chuyện mới`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      });

      // Thêm tin nhắn chào mừng từ bot
      const welcomeMessage: Chat = formatChat({
        id: `msg-welcome-${Date.now()}`,
        sessionId: newSession.id,
        role: "assistant",
        content:
          "👋 Xin chào! Tôi là Trợ lý Quản lý Tài sản của Trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE).\n\nTôi có thể giúp bạn:\n• Tra cứu thông tin về tài sản trong trường\n• Tìm kiếm tài sản theo phòng, mã số, năm sử dụng\n• Cung cấp thông tin về giá trị, tình trạng tài sản\n• Trả lời các câu hỏi về quản lý tài sản\n\nHãy đặt câu hỏi để tôi có thể hỗ trợ bạn!",
        timestamp: new Date(),
      });

      // Thêm tin nhắn chào mừng vào session
      newSession.messages = [welcomeMessage];

      const updatedSessions: ChatSession[] = [newSession, ...sessions];
      setSessions(updatedSessions);
      setActiveSessionId(newSession.id);
      saveSessions(updatedSessions);

      return newSession;
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    // Nếu xóa session đang active, chuyển sang session khác trước
    if (sessionId === activeSessionId && sessions.length > 1) {
      const newActiveIndex =
        sessions.findIndex((s) => s.id === sessionId) === 0 ? 1 : 0;
      setActiveSessionId(sessions[newActiveIndex].id);
    } else if (sessionId === activeSessionId) {
      // Nếu là session active cuối cùng, reset activeSessionId
      setActiveSessionId("");
    }

    try {
      if (!sessionId.startsWith("local-") && userId) {
        // Xóa session từ API
        await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
          method: "DELETE",
        });
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }

    // Luôn cập nhật UI
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
  };

  const updateSessionTitle = (sessionId: string, firstMessage: string) => {
    // Tạo tiêu đề từ tin nhắn đầu tiên (giới hạn 30 ký tự)
    const title =
      firstMessage.length > 30
        ? `${firstMessage.substring(0, 30)}...`
        : firstMessage;

    const updatedSessions: ChatSession[] = sessions.map((session) =>
      session.id === sessionId ? { ...session, title } : session
    );

    setSessions(updatedSessions);
    saveSessions(updatedSessions);
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
      updateSessionTitle(activeSessionId, userInput);
    }

    // Cập nhật state
    const updatedSessions: ChatSession[] = [...sessions];
    updatedSessions[sessionIndex] = updatedSession;
    setSessions(updatedSessions);
    saveSessions(updatedSessions);

    setLoading(true);

    try {
      // Ghi lại thông tin session hiện tại để xử lý trường hợp session thay đổi
      const currentActiveSessionId = activeSessionId;
      const isLocalSession = currentActiveSessionId.startsWith("local-");

      // Nếu sessionId bắt đầu bằng 'local-', gửi null để backend tạo mới
      const sessionIdToSend = isLocalSession ? null : currentActiveSessionId;

      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userInput,
          sessionId: sessionIdToSend,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();

      // Cờ đánh dấu là đã xử lý phản hồi từ bot hay chưa
      let botResponseHandled = false;

      // *** XỬ LÝ SESSION LOCAL ĐƯỢC THAY THẾ BẰNG SESSION SERVER ***
      if (data.sessionId && isLocalSession) {
        try {
          // Lấy session chi tiết từ server
          const sessionResponse = await fetch(
            `${API_BASE_URL}/api/chat/sessions/detail/${data.sessionId}`
          );
          if (sessionResponse.ok) {
            const newSessionData = await sessionResponse.json();

            // Kiểm tra xem tin nhắn người dùng vừa gửi đã có trong dữ liệu từ server chưa
            const serverMessages = newSessionData.messages || [];
            const userMessageExists = serverMessages.some(
              (msg: any) => msg.role === "user" && msg.content === userInput
            );

            // Chuẩn bị tin nhắn để thêm vào
            const messagesToKeep: Chat[] = [];

            // Nếu server đã có tin nhắn người dùng, sử dụng messages từ server
            if (userMessageExists) {
              messagesToKeep.push(
                ...serverMessages.map((msg: any) => formatChat(msg))
              );
            } else {
              // Nếu không, thêm tin nhắn người dùng hiện tại vào messages từ server
              messagesToKeep.push(
                ...serverMessages.map((msg: any) => formatChat(msg)),
                userMessage
              );
            }

            // Kiểm tra xem tin nhắn bot đã có trong dữ liệu server chưa
            const botMessageExists = serverMessages.some(
              (msg: any) =>
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

            // Chuyển đổi session local thành session từ server
            const serverSession = formatChatSession({
              ...newSessionData,
              messages: messagesToKeep,
            });

            // Cập nhật danh sách sessions
            const updatedSessionsWithNewId = sessions.map((s) =>
              s.id === currentActiveSessionId ? serverSession : s
            );

            setSessions(updatedSessionsWithNewId);
            setActiveSessionId(data.sessionId);
            saveSessions(updatedSessionsWithNewId);

            // Đánh dấu là đã xử lý xong
            botResponseHandled = true;
          }
        } catch (error) {
          console.error("Error fetching session details:", error);
          // Nếu có lỗi, vẫn tiếp tục xử lý bình thường
        }
      }

      // *** XỬ LÝ BÌNH THƯỜNG KHI ĐÃ CÓ SESSION SERVER (chỉ khi chưa xử lý ở trên) ***
      if (!botResponseHandled) {
        try {
          // Tải lại session mới nhất từ server
          const sessionResponse = await fetch(
            `${API_BASE_URL}/api/chat/sessions/detail/${
              data.sessionId || currentActiveSessionId
            }`
          );

          if (sessionResponse.ok) {
            const updatedSessionData = await sessionResponse.json();
            const serverSession = formatChatSession(updatedSessionData);

            // Cập nhật session trong danh sách
            const updatedSessions = sessions.map((s) =>
              s.id === (data.sessionId || currentActiveSessionId)
                ? serverSession
                : s
            );

            setSessions(updatedSessions);
            saveSessions(updatedSessions);
          } else {
            // Fallback nếu không lấy được session: chỉ thêm tin nhắn bot vào session hiện tại
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
              const sessionToUpdate = {
                ...updatedSessions[updatedSessionIndex],
              };
              const currentMessages = sessionToUpdate.messages || [];

              // Thêm tin nhắn bot vào session
              sessionToUpdate.messages = [...currentMessages, botMessage];
              sessionToUpdate.updatedAt = new Date();

              updatedSessions[updatedSessionIndex] = sessionToUpdate;
              setSessions(updatedSessions);
              saveSessions(updatedSessions);
            }
          }
        } catch (error) {
          console.error("Error fetching updated session:", error);

          // Thêm phản hồi của bot vào chat (phương pháp cũ)
          const botMessage: Chat = formatChat({
            id: `msg-${Date.now()}-bot`,
            sessionId: data.sessionId || currentActiveSessionId,
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          });

          // Logic cũ
          const updatedSessionIndex = sessions.findIndex(
            (s) => s.id === (data.sessionId || currentActiveSessionId)
          );

          if (updatedSessionIndex !== -1) {
            const updatedSessions = [...sessions];
            const sessionToUpdate = { ...updatedSessions[updatedSessionIndex] };
            const currentMessages = sessionToUpdate.messages || [];

            sessionToUpdate.messages = [...currentMessages, botMessage];
            sessionToUpdate.updatedAt = new Date();

            updatedSessions[updatedSessionIndex] = sessionToUpdate;
            setSessions(updatedSessions);
            saveSessions(updatedSessions);
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
        saveSessions(updatedSessions);
      }
    } finally {
      setLoading(false);
    }
  };

  // Lấy tin nhắn của session đang active
  const activeSessionMessages =
    sessions.find((s) => s.id === activeSessionId)?.messages || [];

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
                  ? sessions.find((s) => s.id === activeSessionId)?.title ||
                    "Trò chuyện mới"
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
