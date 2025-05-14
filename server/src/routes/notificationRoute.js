const router = require('express').Router();
const notificationController = require('../Controller/notificationController');
const middlewareController = require('../middleware/middleware');

// Xác thực người dùng cho tất cả các routes
router.use(middlewareController.verifyToken);

// Lấy thông báo của người dùng
router.get('/', notificationController.getUserNotifications);

// Đánh dấu một thông báo đã đọc
router.put('/:notificationId/read', notificationController.markAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;