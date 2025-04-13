import React from "react";
import ChatMessage from "./ChatMessage";
import { Chat } from "../interfaces/Chat";

interface ChatBoxProps {
  messages: Chat[];
  loading: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, loading }) => {
  return (
    <div className="chatbox">
      <div className="messages">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {loading && (
          <div className="loading">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}{" "}
      </div>
    </div>
  );
};

export default ChatBox;
