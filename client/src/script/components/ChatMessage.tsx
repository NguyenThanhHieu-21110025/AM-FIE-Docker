import React from 'react';
import { Chat } from '../interfaces/Chat';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Chat;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Kiểm tra xem message có tồn tại không
  if (!message) {
    console.error("Received null or undefined message in ChatMessage component");
    return null;
  }

  // Debug: Log để kiểm tra thông tin message
  React.useEffect(() => {
    console.log("Rendering ChatMessage:", message);
    
    // Kiểm tra định dạng message
    if (!message.role && !message.sender && !message.userInput) {
      console.warn("Message missing role/sender information:", message);
    }
    
    if (!message.content && !message.text && !message.userInput && !message.botResponse) {
      console.warn("Message missing content:", message);
    }
  }, [message]);

  // Xác định người gửi dựa trên role hoặc trường cũ
  const role = message.role || (message.userInput ? 'user' : 'assistant');
  const content = message.content || message.text || (role === 'user' ? message.userInput : message.botResponse) || '';
  const sender = message.sender || (role === 'user' ? 'user' : 'bot');
  
  // Đảm bảo có nội dung để hiển thị
  if (!content) {
    console.warn("Message has no content:", message);
    return (
      <div className="chat-message system-message">
        <div className="message-content">
          <span className="message-text">Tin nhắn trống</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`chat-message ${sender === 'user' ? 'user-message' : 'bot-message'}`}>
      <div className="message-content">
        <span className="message-sender">{sender === 'user' ? 'Bạn' : 'Trợ lý'}:</span>
        {sender === 'user' ? (
          <span className="message-text">{content}</span>
        ) : (
          <div className="message-text markdown-content">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
      <div className="message-timestamp">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ChatMessage;