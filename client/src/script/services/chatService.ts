import { Chat, ChatSession } from "../interfaces/Chat";

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL + "/chat";

// Interface cho các tham số API
export interface SendMessageParams {
  message: string;
  sessionId: string | null;
  userId: string | null;
}

export interface CreateSessionParams {
  userId: string | null;
  title: string;
}

export interface SessionResponse {
  response: string;
  sessionId?: string;
}

// Helper để đảm bảo Chat object có định dạng đúng
export const formatChat = (msg: any): Chat => {
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
export const formatChatSession = (session: any): ChatSession => {
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

// Class ChatbotService
class ChatbotService {
  private getAuthHeaders(accessToken: string | null) {
    return {
      "Content-Type": "application/json",
      token: accessToken ? `Bearer ${accessToken}` : "",
    };
  }  // Tải danh sách phiên chat
  async fetchSessions(
    userId: string | null,
    accessToken: string | null
  ): Promise<ChatSession[]> {
    if (!userId) {
      return [];
    }

    if (!accessToken) {
      return [];
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${userId}`, {
        headers: this.getAuthHeaders(accessToken),
      });
      
      if (response.ok) {
        const sessionsData = await response.json();
        return sessionsData.map((session: any) => formatChatSession(session));
      } else {
        const errorText = await response.text();
        console.error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
        console.error(`Error details: ${errorText}`);
        throw new Error(`${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error loading sessions from API:", error);
      throw error;
    }
  }
  // Tạo phiên chat mới
  async createSession(
    { userId, title }: CreateSessionParams,
    accessToken: string | null
  ): Promise<ChatSession> {
    if (!userId) {
      console.warn("createSession: No userId provided");
      throw new Error("UserId is required to create a session");
    }

    if (!accessToken) {
      console.warn("createSession: No accessToken provided");
      throw new Error("AccessToken is required to create a session");
    }

    try {
      // Tạo session mới qua API
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: this.getAuthHeaders(accessToken),
        body: JSON.stringify({ userId, title }),
      });

      if (response.ok) {
        const sessionData = await response.json();
        return formatChatSession(sessionData);
      } else {
        const errorText = await response.text();
        console.error(`Failed to create session: ${response.status} ${response.statusText}`);
        console.error(`Error details: ${errorText}`);
        
        // Nếu gặp lỗi xác thực (401, 403), ném lỗi để có thể xử lý refresh token
        if (response.status === 401 || response.status === 403) {
          throw new Error(`${response.status} Authentication failed: ${response.statusText}`);
        }
        
        // Fallback tạo session cục bộ nếu có lỗi khác
        return formatChatSession({
          id: `local-session-${Date.now()}`,
          title,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        });
      }
    } catch (error) {
      console.error("Error creating new session:", error);
      
      // Ném lỗi lại để component có thể xử lý refresh token nếu cần
      if (error instanceof Error && 
          (error.message.includes("401") || error.message.includes("403"))) {
        throw error;
      }
      
      // Fallback tạo session cục bộ nếu có lỗi khác
      return formatChatSession({
        id: `local-session-${Date.now()}`,
        title,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      });
    }
  }
  async updateSession(
    session: ChatSession,
    accessToken: string | null
  ): Promise<ChatSession> {
    // Only process server-side sessions (not local ones)
    if (!session.id || session.id.startsWith("local-")) {
      throw new Error("Cannot update local session");
    }

    const response = await fetch(`${API_BASE_URL}/sessions/${session.id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(accessToken),
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.status}`);
    }

    const updatedSession = await response.json();
    return formatChatSession(updatedSession);
  }
  // Gửi tin nhắn và nhận phản hồi
  async sendMessage(
    { message, sessionId, userId }: SendMessageParams,
    accessToken: string | null
  ): Promise<SessionResponse> {
    const response = await fetch(`${API_BASE_URL}/send`, {
      method: "POST",
      headers: this.getAuthHeaders(accessToken),
      body: JSON.stringify({ message, sessionId, userId }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    return await response.json();
  }

  // Xóa phiên chat
  async deleteSession(
    sessionId: string,
    userId: string | null,
    accessToken: string | null
  ): Promise<void> {
    if (!sessionId.startsWith("local-") && userId) {
      await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(accessToken),
      });
    }
  }

  // Lấy chi tiết phiên chat
  async fetchSessionDetail(
    sessionId: string,
    accessToken: string | null
  ): Promise<ChatSession> {
    const response = await fetch(
      `${API_BASE_URL}/sessions/detail/${sessionId}`,
      {
        headers: this.getAuthHeaders(accessToken),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch session detail: ${response.status}`);
    }

    const sessionData = await response.json();
    const formattedSession = formatChatSession(sessionData);

    // Kiểm tra xem đã có tin nhắn welcome chưa
    const hasWelcomeMessage = formattedSession.messages?.some((msg) =>
      msg.content?.includes("Xin chào! Tôi là Trợ lý Quản lý Tài sản")
    );

    // Nếu chưa có, thêm vào
    if (!hasWelcomeMessage) {
      const welcomeMessage = this.createWelcomeMessage(sessionId);
      formattedSession.messages = [
        welcomeMessage,
        ...(formattedSession.messages || []),
      ];
    }

    return formattedSession;
  }

  // Cập nhật tiêu đề phiên chat
  updateSessionTitle(
    sessions: ChatSession[],
    sessionId: string,
    message: string
  ): ChatSession[] {
    const title =
      message.length > 30 ? `${message.substring(0, 30)}...` : message;

    return sessions.map((session) =>
      session.id === sessionId ? { ...session, title } : session
    );
  }

  // Tạo tin nhắn chào mừng
  createWelcomeMessage(sessionId: string): Chat {
    return formatChat({
      id: `msg-welcome-${Date.now()}`,
      sessionId,
      role: "assistant",
      content:
        "👋 Xin chào! Tôi là Trợ lý Quản lý Tài sản của Toà nhà F1 - Trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE).\n\nTôi có thể giúp bạn:\n• Tra cứu thông tin về tài sản trong trường\n• Tìm kiếm tài sản theo phòng, mã số, năm sử dụng\n• Cung cấp thông tin về giá trị, tình trạng tài sản\n• Trả lời các câu hỏi về quản lý tài sản\n\nHãy đặt câu hỏi để tôi có thể hỗ trợ bạn!",
      timestamp: new Date(),
    });
  }
}

export default new ChatbotService();
