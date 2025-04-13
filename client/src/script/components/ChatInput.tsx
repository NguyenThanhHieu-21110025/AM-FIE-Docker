import React, { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Nhập câu hỏi của bạn..."
        className="input-field"
        disabled={disabled}
      />
      <button type="submit" className="send-button" disabled={disabled}>
        <FaPaperPlane />
      </button>
    </form>
  );
};

export default ChatInput;
