import React from 'react';
import { FaPlus, FaTrash, FaComment } from 'react-icons/fa';
import { ChatSession } from '../interfaces/Chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
}) => {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h3>Trò chuyện</h3>
        <button onClick={onNewSession} className="new-chat-button">
          <FaPlus /> Mới
        </button>
      </div>
      
      <div className="session-list">
        {sessions.length === 0 ? (
          <div className="no-sessions">Chưa có cuộc trò chuyện nào.</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSessionSelect(session.id)}
            >
              <div className="session-icon">
                <FaComment />
              </div>
              <div className="session-info">
                <div className="session-title">{session.title}</div>
                <div className="session-date">
                  {formatDate(session.updatedAt || session.createdAt)}
                </div>
              </div>
              <button
                className="delete-session-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
              >
                <FaTrash />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;