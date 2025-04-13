const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
    description: "Vai trò của người gửi tin nhắn"
  },
  content: {
    type: String,
    required: true,
    trim: true,
    description: "Nội dung tin nhắn"
  },
  timestamp: {
    type: Date,
    default: Date.now,
    description: "Thời gian gửi tin nhắn"
  },
  metadata: {
    type: Object,
    default: {},
    description: "Dữ liệu bổ sung về tin nhắn"
  }
}, { _id: true });

const chatSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: "Cuộc trò chuyện mới"
  },
  userId: {
    type: mongoose.Schema.Types.Mixed, 
    ref: 'User',
    description: "User sở hữu phiên chat này"
  },
  messages: {
    type: [messageSchema],
    default: [],
    description: "Danh sách tin nhắn trong phiên chat"
  },
  isActive: {
    type: Boolean,
    default: true,
    description: "Trạng thái hoạt động của phiên chat"
  },
  createdAt: {
    type: Date,
    default: Date.now,
    description: "Thời gian tạo phiên chat"
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    description: "Thời gian cập nhật cuối cùng"
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Index để tìm kiếm nhanh theo userId và thời gian cập nhật
chatSessionSchema.index({ userId: 1, updatedAt: -1 });
chatSessionSchema.pre('save', function(next) {
  if (this.userId && typeof this.userId === 'string' && mongoose.Types.ObjectId.isValid(this.userId)) {
    this.userId = mongoose.Types.ObjectId(this.userId);
  }
  next();
});
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;