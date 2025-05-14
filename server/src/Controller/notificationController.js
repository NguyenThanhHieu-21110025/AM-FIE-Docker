const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Room = require("../models/roomModel");
const Asset = require("../models/assetModel");

const createNotification = async ({
  message,
  type = "system",
  relatedItem = null,
  itemModel = null,
  additionalRecipients = [],
}) => {
  try {
    // Tìm tất cả admin - dùng role thay vì isAdmin
    const admins = await User.find({ role: 'admin' }).select("_id");
    
    // Tạo danh sách người nhận từ admin và additional recipients
    let recipients = [...admins.map(admin => admin._id)];
    
    // Thêm người nhận bổ sung nếu có (chẳng hạn powerUser quản lý tài sản/phòng)
    if (additionalRecipients && additionalRecipients.length > 0) {
      // Thêm người nhận, đảm bảo không trùng lặp
      additionalRecipients.forEach(recipientId => {
        const idStr = String(recipientId);
        // Kiểm tra nếu ID chưa có trong danh sách
        if (!recipients.some(existingId => String(existingId) === idStr)) {
          recipients.push(recipientId);
        }
      });
    }

    // Nếu không có người nhận, không tạo thông báo
    if (recipients.length === 0) {
      console.log("No recipients found for notification");
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

/**
 * Hàm tạo thông báo cho tài sản
 * Gửi cho admin và powerUser đang quản lý tài sản đó
 */
const createAssetNotification = async ({
  message,
  assetId,
  type = "asset",
}) => {
  try {
    let additionalRecipients = [];
    
    // Nếu có assetId, tìm người quản lý
    if (assetId) {
      const asset = await Asset.findById(assetId);
      if (asset && asset.responsible_user) {
        // Kiểm tra xem người quản lý có phải là powerUser không
        const responsibleUser = await User.findById(asset.responsible_user);
        if (responsibleUser && responsibleUser.role === 'powerUser') {
          additionalRecipients.push(responsibleUser._id);
        }
      }
    }

    return createNotification({
      message,
      type,
      relatedItem: assetId,
      itemModel: 'Asset',
      additionalRecipients,
    });
  } catch (error) {
    console.error("Error creating asset notification:", error);
    return null;
  }
};

/**
 * Hàm tạo thông báo cho phòng
 * Gửi cho admin và powerUser đang quản lý phòng đó
 */
const createRoomNotification = async ({
  message,
  roomId,
  type = "room",
}) => {
  try {
    let additionalRecipients = [];
    
    // Nếu có roomId, tìm người quản lý
    if (roomId) {
      const room = await Room.findById(roomId);
      if (room && room.responsible_user) {
        // Kiểm tra xem người quản lý có phải là powerUser không
        const responsibleUser = await User.findById(room.responsible_user);
        if (responsibleUser && responsibleUser.role === 'powerUser') {
          additionalRecipients.push(responsibleUser._id);
        }
      }
    }

    return createNotification({
      message,
      type,
      relatedItem: roomId,
      itemModel: 'Room',
      additionalRecipients,
    });
  } catch (error) {
    console.error("Error creating room notification:", error);
    return null;
  }
};

/**
 * Tạo thông báo cho những người có vai trò cụ thể
 */
const createNotificationForRoles = async ({
  message,
  type = "system",
  roles = ['admin'], // Mặc định chỉ gửi cho admin
  relatedItem = null,
  itemModel = null,
}) => {
  try {
    // Tìm tất cả người dùng có role trong danh sách roles
    const users = await User.find({ role: { $in: roles } }).select("_id");
    const additionalRecipients = users.map(user => user._id);

    return createNotification({
      message,
      type,
      relatedItem,
      itemModel,
      additionalRecipients,
    });
  } catch (error) {
    console.error("Error creating notification for roles:", error);
    return null;
  }
};

const notificationController = {
  // Lấy thông báo của người dùng hiện tại - giữ nguyên
  getUserNotifications: async (req, res) => {
    try {
      // Debug info
      const userId = req.user.id || req.user._id;
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

  // Đánh dấu thông báo đã đọc - giữ nguyên
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
        notification.isReadBy.push(userId);
        await notification.save();
      }

      res.status(200).json({ message: "Đã đánh dấu đọc thông báo" });
    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Đánh dấu tất cả thông báo đã đọc - giữ nguyên
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

  // Export tất cả hàm tạo thông báo
  createNotification,
  createAssetNotification,
  createRoomNotification,
  createNotificationForRoles,
};

module.exports = notificationController;