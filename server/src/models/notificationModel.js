const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: {
    type: String, 
    required: true,
    description: "Nội dung thông báo"
  },
  type: {
    type: String,
    enum: ['asset', 'room', 'user', 'system'],
    default: 'system',
    description: "Loại thông báo"
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: "Người nhận thông báo"
  }],
  isReadBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: "Danh sách người đã đọc"
  }],
  relatedItem: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'itemModel',
    description: "ID của đối tượng liên quan đến thông báo"
  },
  itemModel: {
    type: String,
    enum: ['Asset', 'Room', 'User'],
    description: "Model của đối tượng liên quan"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipients: 1 });

module.exports = mongoose.model('Notification', notificationSchema);