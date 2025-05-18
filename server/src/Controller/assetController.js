const Assets = require("../models/assetModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");
const { createAssetNotification, createNotification } = require("./notificationController");

// Hàm cập nhật thông tin tổng hợp của phòng
async function updateRoomSummary(roomId) {
  try {
    if (!roomId) return;
    
    // Lấy tất cả tài sản trong phòng
    const assetsInRoom = await Assets.find({ location: roomId });
    
    // Tính tổng số lượng và giá trị
    let accounting = { quantity: 0, originalValue: 0, currentValue: 0 };
    let physical = { quantity: 0, originalValue: 0, currentValue: 0 };
    let discrepancy = { quantity: 0, originalValue: 0, currentValue: 0 };
    
    // Tính toán tổng cộng từ tất cả tài sản
    assetsInRoom.forEach(asset => {
      // Cập nhật thống kê theo sổ kế toán
      accounting.quantity += asset.accounting?.quantity || 0;
      accounting.originalValue += asset.accounting?.origin_price || 0;
      accounting.currentValue += asset.remaining_value || 0;
      
      // Cập nhật thống kê theo kiểm kê thực tế
      const realCount = asset.quantity_differential?.real_count || 0;
      const unitPrice = asset.accounting?.unit_price || 0;
      const realOriginalValue = realCount * unitPrice;
      const depreciationRate = asset.depreciation_rate || 0;
      const realCurrentValue = realOriginalValue * (1 - depreciationRate / 100);
      
      physical.quantity += realCount;
      physical.originalValue += realOriginalValue;
      physical.currentValue += realCurrentValue;
    });
    
    // Tính chênh lệch
    discrepancy.quantity = physical.quantity - accounting.quantity;
    discrepancy.originalValue = physical.originalValue - accounting.originalValue;
    discrepancy.currentValue = physical.currentValue - accounting.currentValue;
    
    // Cập nhật thông tin phòng
    await Room.findByIdAndUpdate(roomId, {
      $set: {
        accountingRecords: {
          quantity: accounting.quantity,
          originalValue: accounting.originalValue,
          currentValue: accounting.currentValue
        },
        physicalCount: {
          quantity: physical.quantity,
          originalValue: physical.originalValue,
          currentValue: physical.currentValue
        },
        discrepancy: {
          quantity: discrepancy.quantity,
          originalValue: discrepancy.originalValue,
          currentValue: discrepancy.currentValue
        },
        updated_at: new Date()
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error updating room summary:", error);
    return false;
  }
}

const assetController = {
  getAllAssets: async (req, res) => {
    try {
      const assets = await Assets.find()
        .populate("location")
        .populate("responsible_user");
      res.status(200).json(assets);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getAssetById: async (req, res) => {
    try {
      const asset = await Assets.findById(req.params.id)
        .populate("location")
        .populate("responsible_user");
      res.status(200).json(asset);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  createAsset: async (req, res) => {
    try {
      // Tạo tài sản mới
      const asset = await Assets.create({
        asset_code: req.body.asset_code,
        asset_name: req.body.asset_name,
        specifications: req.body.specifications,
        year_of_use: req.body.year_of_use,
        accounting: {
          quantity: req.body.accounting?.quantity,
          unit_price: req.body.accounting?.unit_price,
          origin_price: req.body.accounting?.origin_price,
        },
        quantity_differential: {
          real_count: req.body.quantity_differential?.real_count,
          surplus_quantity: req.body.quantity_differential?.surplus_quantity,
          missing_quantity: req.body.quantity_differential?.missing_quantity,
        },
        depreciation_rate: req.body.depreciation_rate,
        remaining_value: req.body.remaining_value,
        suggested_disposal: req.body.suggested_disposal,
        acquisition_source: req.body.acquisition_source,
        location: req.body.location,
        responsible_user: req.body.responsible_user,
        note: req.body.note,
        type: req.body.type,
      });

      // Nếu có location (phòng), cập nhật phòng: thêm tài sản vào danh sách và cập nhật số liệu
      if (req.body.location) {
        // Thêm tài sản vào mảng assets của phòng
        await Room.findByIdAndUpdate(req.body.location, {
          $push: { assets: asset._id }
        });
        
        // Cập nhật số liệu tổng hợp của phòng
        await updateRoomSummary(req.body.location);
      }

      if (req.body.location) {
        const room = await Room.findById(req.body.location).select('fullName');
        await createAssetNotification({
          message: `Tài sản mới "${req.body.asset_name}" đã được thêm vào ${room?.fullName || 'hệ thống'}`,
          assetId: asset._id 
        });
      } else {
        await createAssetNotification({
          message: `Tài sản mới "${req.body.asset_name}" đã được thêm vào hệ thống`,
          assetId: asset._id 
        });
      }

      res.status(201).json(asset);
    } catch (err) {
      // Trả về thông báo lỗi chi tiết hơn
      res.status(400).json({
        message: "Error creating asset",
        error: err.message,
        details: err,
      });
    }
  },

  updateAsset: async (req, res) => {
    try {
      const asset = await Assets.findById(req.params.id);
      if (!asset) {
        return res.status(404).json("Asset not found");
      }

      // Lưu lại location cũ để cập nhật phòng cũ nếu phòng bị thay đổi
      const oldLocation = asset.location ? asset.location.toString() : null;
      const newLocation = req.body.location || null;

      // Cập nhật tài sản
      const updatedAsset = await Assets.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            asset_code: req.body.asset_code,
            asset_name: req.body.asset_name,
            specifications: req.body.specifications,
            year_of_use: req.body.year_of_use,
            accounting: {
              quantity: req.body.accounting?.quantity,
              unit_price: req.body.accounting?.unit_price,
              origin_price: req.body.accounting?.origin_price,
            },
            quantity_differential: {
              real_count: req.body.quantity_differential?.real_count,
              surplus_quantity: req.body.quantity_differential?.surplus_quantity,
              missing_quantity: req.body.quantity_differential?.missing_quantity,
            },
            depreciation_rate: req.body.depreciation_rate,
            remaining_value: req.body.remaining_value,
            suggested_disposal: req.body.suggested_disposal,
            acquisition_source: req.body.acquisition_source,
            location: req.body.location,
            responsible_user: req.body.responsible_user,
            note: req.body.note,
            type: req.body.type,
          },
        },
        { new: true, runValidators: true }
      );

      // Xử lý khi location thay đổi
      if (oldLocation !== newLocation) {
        // Nếu có location cũ, xóa tài sản khỏi mảng assets của phòng cũ
        if (oldLocation) {
          await Room.findByIdAndUpdate(oldLocation, {
            $pull: { assets: asset._id }
          });
          // Cập nhật số liệu phòng cũ
          await updateRoomSummary(oldLocation);
        }

        // Nếu có location mới, thêm tài sản vào mảng assets của phòng mới
        if (newLocation) {
          await Room.findByIdAndUpdate(newLocation, {
            $push: { assets: asset._id }
          });
          // Cập nhật số liệu phòng mới
          await updateRoomSummary(newLocation);
        }
      } else if (oldLocation === newLocation && oldLocation) {
        // Nếu cùng phòng nhưng thông tin tài sản thay đổi, cập nhật số liệu phòng
        await updateRoomSummary(oldLocation);
      }

      await createAssetNotification({
        message: `Tài sản "${updatedAsset.asset_name}" đã được cập nhật`,
        assetId: updatedAsset._id,
      });

      res.status(200).json(updatedAsset);
    } catch (err) {
      res.status(400).json({
        message: "Error updating asset",
        error: err.message,
        details: err,
      });
    }
  },

  deleteAsset: async (req, res) => {
    try {
      // Logic xử lý xóa tài sản không thay đổi...
      const asset = await Assets.findById(req.params.id);
      if (!asset) {
        return res.status(404).json("Asset not found");
      }

      // Lưu lại location và thông tin cần thiết trước khi xóa
      const locationId = asset.location ? asset.location.toString() : null;
      const assetName = asset.asset_name; // Lưu tên tài sản để dùng trong thông báo
      const responsibleUserId = asset.responsible_user; // Lưu ID người quản lý

      // Xóa tài sản
      await asset.deleteOne();

      // Nếu tài sản thuộc về phòng nào đó, cập nhật phòng
      if (locationId) {
        // Xóa tài sản khỏi mảng assets của phòng
        await Room.findByIdAndUpdate(locationId, {
          $pull: { assets: asset._id }
        });
        
        // Cập nhật số liệu tổng hợp của phòng
        await updateRoomSummary(locationId);
      }
      
      // Tìm người quản lý tài sản (nếu là powerUser) trước khi gửi thông báo
      let additionalRecipients = [];
      if (responsibleUserId) {
        const responsibleUser = await User.findById(responsibleUserId);
        if (responsibleUser && responsibleUser.role === 'powerUser') {
          additionalRecipients.push(responsibleUser._id);
        }
      }
      
      // Đối với xóa tài sản, vẫn sử dụng createNotification vì assetId không còn tồn tại
      await createNotification({
        message: `Tài sản "${assetName}" đã bị xóa khỏi hệ thống`,
        type: 'asset',
        additionalRecipients // Thêm người quản lý tài sản (nếu là powerUser) vào danh sách nhận thông báo
      });
      
      res.status(200).json("Asset has been deleted");
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getAllAssetsByUser: async (req, res) => {
    try {
      const assets = await Assets.find({
        responsible_user: req.params.responsible_user,
      })
        .populate("location")
        .populate("responsible_user");
      res.status(200).json(assets);
    } catch (err) {
      res.status(500).json(err);
    }
  },

  addHistoryItem: async (req, res) => {
    try {
      const asset = await Assets.findById(req.params.id);
      if (!asset) {
        return res.status(404).json("Asset not found");
      }

      asset.history.push({
        date: req.body.date,
        real_count: req.body.real_count,
        difference: req.body.difference,
      });

      await asset.save();
      
      // Nếu tài sản thuộc phòng nào, cập nhật số liệu phòng
      if (asset.location) {
        await updateRoomSummary(asset.location);
      }
      
      res.status(200).json("History item has been added");
    } catch (err) {
      res.status(500).json(err);
    }
  },
  getAssetDictionary: async (req, res) => {
    try {
      // Get unique asset name-code pairs
      const assetDictionary = await Assets.aggregate([
        {
          $group: {
            _id: "$asset_name",
            name: { $first: "$asset_name" },
            code: { $first: "$asset_code" },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $project: { _id: 0, name: 1, code: 1 } }
      ]);

      res.status(200).json({ 
        success: true, 
        data: assetDictionary 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching asset dictionary",
        error: error.message,
      });
    }
  },
  getAssetsByRoomId: async (req, res) => {
    try {
      const roomId = req.params.id;
  
      const room = await Room.findById(roomId).populate('assets');
      if (!room) return res.status(404).json({ message: "Room not found" });
  
      res.status(200).json({ success: true, data: room.assets });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};


module.exports = assetController;