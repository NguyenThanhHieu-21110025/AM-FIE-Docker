import { useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";
import { 
  Notification,
  getNotifications,
  markAsRead as markNotificationRead,
  markAllAsRead as markAllNotificationsRead,
  formatNotificationTime
} from "../../../interfaces/Notification";
import { useAuth } from "../../../context/AuthContext";

const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { accessToken, refreshAccessToken } = useAuth();

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.isRead).length
    : 0;

  // Lấy thông báo từ API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra và refresh token nếu cần
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          console.error("Không thể refresh token");
          setNotifications([]);
          return;
        }
      }
      
      // Log để debug
      console.log("Fetching notifications with token:", token.substring(0, 15) + "...");
      
      const notificationData = await getNotifications(token);
      console.log("Fetched notifications:", notificationData);
      setNotifications(notificationData);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Lấy thông báo khi component được tạo
  useEffect(() => {
    fetchNotifications();
    
    // Kiểm tra thông báo mới mỗi phút
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [accessToken]); // Thêm accessToken vào dependencies

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".notification-dropdown")) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Đánh dấu tất cả thông báo đã đọc
  const markAllAsRead = async () => {
    try {
      // Kiểm tra và refresh token nếu cần
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          console.error("Không thể refresh token");
          return;
        }
      }
      
      const success = await markAllNotificationsRead(token);
      
      if (success) {
        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            isRead: true,
          }))
        );
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Đánh dấu một thông báo đã đọc
  const markAsRead = async (id: string) => {
    try {
      // Kiểm tra và refresh token nếu cần
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          console.error("Không thể refresh token");
          return;
        }
      }
      
      const success = await markNotificationRead(id, token);
      
      if (success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === id
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Định dạng thời gian tương đối
  const formatDate = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Vài phút trước";
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    if (diffInHours < 48) return "Hôm qua";

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ngày trước`;
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-icon" onClick={handleToggle}>
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>

      {isOpen && (
        <div className="notification-menu">
          <div className="notification-header">
            <h4>Thông báo</h4>
            {Array.isArray(notifications) &&
              notifications.length > 0 &&
              unreadCount > 0 && (
                <button className="mark-all-read" onClick={markAllAsRead}>
                  Đánh dấu tất cả đã đọc
                </button>
              )}
          </div>

          <div className="notification-list">
            {loading ? (
              <p className="loading-notifications">Đang tải...</p>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
              <p className="no-notifications">Không có thông báo nào</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${
                    !notification.isRead ? "unread" : ""
                  }`}
                  onClick={() => markAsRead(notification._id)}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-date">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {Array.isArray(notifications) && notifications.length > 5 && (
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
