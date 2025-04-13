import { useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";

interface Notification {
  id: string;
  message: string;
  date: string;
  isRead: boolean;
}

const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      message: "Có tài sản mới được thêm vào phòng A1-01",
      date: "10 giờ trước",
      isRead: false,
    },
    {
      id: "2",
      message: "Thêm 5 máy tính mới vào phòng thực hành",
      date: "2 ngày trước",
      isRead: false,
    },
    {
      id: "3",
      message: "Báo cáo thống kê tháng 4 đã hoàn thành",
      date: "1 tuần trước",
      isRead: true,
    },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Khi mở dropdown, đánh dấu tất cả là đã đọc
      const updatedNotifications = notifications.map(n => ({...n, isRead: true}));
      setNotifications(updatedNotifications);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-dropdown')) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className="notification-dropdown">
      <div className="notification-icon" onClick={handleToggle}>
        <FaBell />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </div>
      
      {isOpen && (
        <div className="notification-menu">
          <div className="notification-header">
            <h4>Thông báo</h4>
            {notifications.length > 0 && (
              <button className="mark-all-read">Đánh dấu tất cả đã đọc</button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="no-notifications">Không có thông báo nào</p>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-date">{notification.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="notification-footer">
              <button className="view-all">Xem tất cả</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;