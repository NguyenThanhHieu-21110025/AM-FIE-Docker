import { useState, useEffect } from "react";
import { FaBell, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../../../../css/NotificationDropdown.css";
import {
  Notification,
  getNotifications,
  markAsRead as markNotificationRead,
  markAllAsRead as markAllNotificationsRead,
  formatNotificationTime,
} from "../../../interfaces/Notification";
import { useAuth } from "../../../context/AuthContext";

const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    message: string;
    isSuccess: boolean;
  } | null>(null);
  const { accessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();

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

      const notificationData = await getNotifications(token);
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
      setMarkingAll(true);

      // Kiểm tra và refresh token nếu cần
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          console.error("Không thể refresh token");
          setActionFeedback({
            message: "Không thể xác thực. Vui lòng đăng nhập lại",
            isSuccess: false,
          });
          return;
        }
      }

      const success = await markAllNotificationsRead(token);

      if (success) {
        // Thêm class animation cho tất cả thông báo
        const unreadElements = document.querySelectorAll(
          ".notification-item.unread"
        );
        unreadElements.forEach((item) => {
          item.classList.add("read-transition");
        });

        // Đợi animation hoàn thành rồi mới cập nhật state
        setTimeout(() => {
          setNotifications((prev) =>
            prev.map((notification) => ({
              ...notification,
              isRead: true,
            }))
          );
          setActionFeedback({
            message: "Đã đánh dấu tất cả thông báo là đã đọc",
            isSuccess: true,
          });

          // Tự động ẩn thông báo sau 3 giây
          setTimeout(() => {
            setActionFeedback(null);
          }, 3000);
        }, 500);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      setActionFeedback({
        message: "Đã xảy ra lỗi khi đánh dấu đã đọc",
        isSuccess: false,
      });
    } finally {
      setMarkingAll(false);
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

  // Xử lý click vào thông báo
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Đánh dấu thông báo đã đọc
      await markAsRead(notification._id);

      // Đóng dropdown sau khi click
      setIsOpen(false);

      // Chuyển hướng đến trang thông tin tương ứng dựa theo loại thông báo
      if (notification.relatedItem && notification.itemModel) {
        switch (notification.itemModel) {
          case "Asset":
            navigate(`/asset-dashboard/${notification.relatedItem}`);
            break;
          case "Room":
            navigate(`/room-dashboard/${notification.relatedItem}`);
            break;
          case "User":
            navigate(`/user-dashboard/${notification.relatedItem}`);
            break;
          default:
            console.log("Không có trang để điều hướng cho loại thông báo này");
            break;
        }
      } else {
        // Nếu thông báo không có relatedItem, hiển thị thông báo
        console.log("Thông báo này không có liên kết đến trang chi tiết");
      }
    } catch (error) {
      console.error("Lỗi khi xử lý click thông báo:", error);
    }
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
                <button
                  className={`mark-all-read ${markingAll ? "loading" : ""}`}
                  onClick={markAllAsRead}
                  disabled={markingAll}
                >
                  {markingAll ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}
                </button>
              )}
          </div>
          {/* Thêm thông báo phản hồi */}
          {actionFeedback && (
            <div
              className={`action-feedback ${
                actionFeedback.isSuccess ? "success" : "error"
              }`}
            >
              {actionFeedback.isSuccess && <FaCheckCircle />}
              {actionFeedback.message}
            </div>
          )}

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
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-date">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                    {notification.relatedItem && notification.itemModel && (
                      <span className="notification-link">Xem chi tiết</span>
                    )}
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
