const mongoose = require('mongoose');

const historyItemSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        description: "Ngày kiểm kê"
    },
    real_count: {
        type: Number,
        min: 0,
        required: true,
        description: "Số lượng kiểm kê thực tế"
    },
    difference: {
        type: Number,
        min: 0,
        required: true,
        description: "Chênh lệch với sổ sách"
    }
});

const assetsSchema = new mongoose.Schema({
    asset_code: {
        type: String,
        // required: true,
        description: "số hiệu tài sản"},
    asset_name: {
        type: String,
        required: true,
        description: "Tên tài sản"
    },
    specifications: {
        type: String,
        description: "Quy cách, đặc điểm của tài sản"
    },
    year_of_use: {
        type: Number,
        required: true, // Đảm bảo năm sử dụng được cung cấp, năm bắt đầu sử dụng
        description: "Năm sử dụng"
    },
    accounting: {
        quantity: {
            type: Number,
            min: 0,
            required: true,
            description: "Số lượng"
        },
        unit_price: {
            type: Number,
            min: 0,
            required: true,
            description: "Đơn giá"
        },
        origin_price: {
            type: Number,
            min: 0,
            required: true,
            description: "Nguyên giá"
        }
    },
    quantity_differential: {
        real_count: {
            type: Number,
            // min: 0,
            description: "KK thực tế"
        },
        surplus_quantity:{
            type: Number,
            // min: 0,
            description: "SL Thừa"
        },   
        missing_quantity:{
            type: Number,
            // min: 0,
            description: "SL Thiếu"
        },
    },
    depreciation_rate: {
        type: Number,
        min: 0,
        max: 100,
        description: "Tỷ lệ hao mòn (%)"
    },
    remaining_value: {
        type: Number,
        min: 0,
        description: "Nguyên giá còn lại" //Nguyên giá còn lại sau khấu hao
    },
    suggested_disposal: {
        type: String,
        description: "Đề nghị thanh lý"
    },
    acquisition_source: { 
        type: String, 
        enum: ["Lẻ", "DA"], 
        required: true, 
        description: "Nguồn tài sản: Mua lẻ hoặc Dự án cung cấp"
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        description: "Vị trí tài sản (phòng, tòa nhà)"
    },
    responsible_user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        description: "Người kiểm kê tài sản"
    },   
    note: {
        type: String,
        description: "Ghi chú thêm"
    },
    history: {
        type: [historyItemSchema],
        description: "Lịch sử kiểm kê và thay đổi"
    }
});

assetsSchema.index({ name: 1 });

const Asset = mongoose.model('Asset', assetsSchema);

module.exports = Asset;