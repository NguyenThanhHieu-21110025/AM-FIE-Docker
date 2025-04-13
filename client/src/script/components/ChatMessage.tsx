import React from 'react';
import { Chat } from '../interfaces/Chat';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Chat;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Xác định người gửi dựa trên role hoặc trường cũ
  const role = message.role || (message.userInput ? 'user' : 'assistant');
  const content = message.content || message.text || (role === 'user' ? message.userInput : message.botResponse) || '';
  const sender = message.sender || (role === 'user' ? 'user' : 'bot');
  
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