const Notification = require("../models/notificationModel");
const User = require("../models/userModel");

// Hàm tiện ích để tạo thông báo
const createNotification = async ({
  message,
  type = "system",
  relatedItem = null,
  itemModel = null,
}) => {
  try {
    // Luôn gửi thông báo cho tất cả admin
    const admins = await User.find({ isAdmin: true }).select("_id");
    const recipients = admins.map((admin) => admin._id);

    // Nếu không có admin nào, không tạo thông báo
    if (recipients.length === 0) {
      console.log("No admins found to send notification to");
      return null;
    }

    const notification = new Notification({
      message,
      type,
      recipients,
      relatedItem,
      itemModel,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

const notificationController = {
    // Lấy thông báo của người dùng hiện tại
    getUserNotifications: async (req, res) => {
      try {
        // Debug info
        const userId = req.user.id || req.user._id; // Get ID from either format
        const userIdStr = String(userId);
        
        // Get all notifications and filter by string comparison
        const allNotifications = await Notification.find()
          .sort({ createdAt: -1 })
          .limit(20);
        
        // Filter notifications by comparing string values
        const notifications = allNotifications.filter(notification => 
          notification.recipients.some(recipientId => 
            String(recipientId) === userIdStr
          )
        );
                
        const notificationsWithReadStatus = notifications.map(notification => ({
          _id: notification._id,
          message: notification.message,
          type: notification.type,
          relatedItem: notification.relatedItem,
          itemModel: notification.itemModel,
          createdAt: notification.createdAt,
          isRead: notification.isReadBy ? 
            notification.isReadBy.some(id => String(id) === userIdStr) : 
            false
        }));
        
        res.status(200).json(notificationsWithReadStatus);
      } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: error.message });
      }
    },
  
    // Đánh dấu thông báo đã đọc
    markAsRead: async (req, res) => {
      try {
        const { notificationId } = req.params;
        const userId = req.user.id || req.user._id;
        const userIdStr = String(userId);
  
        const notification = await Notification.findById(notificationId);
        if (!notification) {
          return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }
  
        // Kiểm tra bằng string comparison
        const hasRead = notification.isReadBy.some(id => 
          String(id) === userIdStr
        );
        
        if (!hasRead) {
          notification.isReadBy.push(userId); // Vẫn có thể push ID gốc
          await notification.save();
        }
  
        res.status(200).json({ message: "Đã đánh dấu đọc thông báo" });
      } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ error: error.message });
      }
    },
  
    // Đánh dấu tất cả thông báo đã đọc
    markAllAsRead: async (req, res) => {
      try {
        const userId = req.user.id || req.user._id;
        const userIdStr = String(userId);
                
        // Lấy tất cả thông báo dành cho người dùng và chưa đọc
        const notifications = await Notification.find();
        let updateCount = 0;
        
        // Xử lý từng thông báo riêng lẻ
        for (const notification of notifications) {
          // Kiểm tra xem thông báo có dành cho người dùng không
          const isRecipient = notification.recipients.some(id => 
            String(id) === userIdStr
          );
          
          // Kiểm tra xem người dùng đã đọc chưa
          const hasRead = notification.isReadBy.some(id => 
            String(id) === userIdStr
          );
          
          // Nếu là người nhận và chưa đọc, đánh dấu đã đọc
          if (isRecipient && !hasRead) {
            notification.isReadBy.push(userId);
            await notification.save();
            updateCount++;
          }
        }
  
        res.status(200).json({ 
          message: "Đã đánh dấu tất cả thông báo là đã đọc",
          updatedCount: updateCount
        });
      } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: error.message });
      }
    },
  
    createNotification,
  };
  
  module.exports = notificationController;
