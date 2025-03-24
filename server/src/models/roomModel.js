const mongoose = require('mongoose');

const roomsSchema = new mongoose.Schema({
  fullName: {
    type: String,
    description: "Tên phòng đầy đủ"
  },
  name: {
    type: String,
    required: true,
    description: "Tên phòng"
  },
  building: {
    type: String,
    required: true,
    description: "Tên tòa nhà"
  },
  accountingRecords: {
    quantity: {
      type: Number,
      default: 0,
      description: "Tổng số lượng tài sản theo sổ kế toán"
    },
    originalValue: {
      type: Number,
      default: 0,
      description: "Tổng nguyên giá tài sản theo sổ kế toán"
    },
    currentValue: {
      type: Number,
      default: 0,
      description: "Tổng giá trị còn lại theo sổ kế toán"
    }
  },
  physicalCount: {
    quantity: {
      type: Number,
      default: 0,
      description: "Tổng số lượng tài sản theo kiểm kê thực tế"
    },
    originalValue: {
      type: Number,
      default: 0,
      description: "Tổng nguyên giá theo kiểm kê thực tế"
    },
    currentValue: {
      type: Number,
      default: 0,
      description: "Tổng giá trị còn lại theo kiểm kê thực tế"
    }
  },
  discrepancy: {
    quantity: {
      type: Number,
      default: 0,
      description: "Chênh lệch số lượng"
    },
    originalValue: {
      type: Number,
      default: 0,
      description: "Chênh lệch nguyên giá"
    },
    currentValue: {
      type: Number,
      default: 0,
      description: "Chênh lệch giá trị còn lại"
    }
  },
  reason: {
    lost: {
      type: Boolean,
      default: false,
      description: "Thất lạc"
    },
    disposed: {
      type: Boolean,
      default: false,
      description: "Thanh lý"
    }
  },
  responsible_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    description: "Cán bộ kiểm kê"
  },
  assets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset",
    description: "Danh sách ID của tài sản trong phòng"
  }],
  note: {
    type: String,
    description: "Ghi chú về phòng"
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Hook tạo fullName tự động khi tạo mới phòng
roomsSchema.pre("save", function(next) {
  if (this.isNew && !this.fullName) {
    // Format: FIE-[BUILDING]-[NAME]
    this.fullName = `${this.building}-${this.name}`.replace(/\s+/g, '-');
  }
  next();
});

const Room = mongoose.model("Room", roomsSchema);

module.exports = Room;