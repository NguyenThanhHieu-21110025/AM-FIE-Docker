import React from "react";
import ChatMessage from "./ChatMessage";
import { Chat } from "../interfaces/Chat";

interface ChatBoxProps {
  messages: Chat[];
  loading: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, loading }) => {
  // Debug: Log messages being passed to ChatBox
  React.useEffect(() => {
    console.log("ChatBox received messages:", messages);
    
    // Kiểm tra nếu messages rỗng hoặc undefined
    if (!messages || messages.length === 0) {
      console.warn("Empty messages array received in ChatBox!");
    } else {
      console.log("Message count:", messages.length);
      console.log("First message:", messages[0]);
    }
  }, [messages]);
  
  // Đảm bảo messages luôn là mảng, ngay cả khi nhận được undefined
  const safeMessages = messages || [];

  return (
    <div className="chatbox">
      <div className="messages">
        {safeMessages.length > 0 ? (
          safeMessages.map((msg, index) => (
            <ChatMessage 
              key={`${msg.id || index}-${Date.now()}`} 
              message={msg} 
            />
          ))
        ) : (
          <div className="no-messages">Không có tin nhắn nào</div>
        )}
        {loading && (
          <div className="loading">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
