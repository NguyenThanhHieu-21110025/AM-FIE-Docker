const xlsx = require('xlsx');
const Asset = require('../models/assetModel');
const Room = require('../models/roomModel'); 
const { createAssetNotification } = require('./notificationController');
const fs = require('fs');

// Hàm cập nhật thông tin tổng hợp của phòng
async function updateRoomSummary(roomId) {
  try {
    if (!roomId) return;
    
    // Lấy tất cả tài sản trong phòng
    const assetsInRoom = await Asset.find({ location: roomId });
    
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

const TYPE_MAP = [
  {
    pattern: /TÀI SẢN CỐ ĐỊNH/i,
    value: 'TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE'
  },
  {
    pattern: /TÀI SẢN (ĐẶC THÙ|THIẾT BỊ QUẢN LÝ|CÔNG CỤ QUẢN LÝ)/i,
    value: 'TAI SAN QUAN LY TT HOP TAC DAO TAO QUOC TE'
  },
  {
    pattern: /TÀI SẢN TĂNG NĂM/i,
    value: 'TAI SAN TANG NAM'
  },
  {
    pattern: /VẬT NỘI THẤT.*(CÔNG CỤ|DỤNG CỤ)/i,
    value: 'TAI SAN VNT CONG CU DUNG CU TT HOP TAC DAO TAO QUOC TE'
  }
];

const importAssets = async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheets = workbook.SheetNames;
    
    let importStats = {
      totalSheets: sheets.length,
      processedSheets: 0,
      totalAssets: 0,
      newAssets: 0,
      updatedAssets: 0,
      skippedRows: 0
    };

    for (const sheetName of sheets) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      // Xác định loại tài sản (type)
      let type = null;
      for (let i = 0; i < 5; i++) {
        const line = (rows[i]?.join(' ') || '').toUpperCase();
        for (const { pattern, value } of TYPE_MAP) {
          if (pattern.test(line)) {
            type = value;
            break;
          }
        }
        if (type) break;
      }

      if (!type) {
        throw new Error(`Không xác định được loại tài sản trong sheet "${sheetName}".`);
      }

      // Tên phòng chính là tên sheet
      const room = await Room.findOne({ name: sheetName });      if (!room) {
        console.warn(`Không tìm thấy phòng có tên "${sheetName}", bỏ qua sheet này.`);
        continue;
      }
      
      importStats.processedSheets++;
      const location = room._id;

      // Tìm header chứa tên cột "Tên tài sản" hoặc "Số hiệu tài sản"
      const headerIndex = rows.findIndex(r => r.includes("Tên tài sản") || r.includes("Số hiệu tài sản"));
      if (headerIndex === -1) continue;      const dataRows = rows.slice(headerIndex + 1);
      const excludeValues = ['A', 'B', 'C', 'D', 'E', '01', '02', '03', '04', '05', '06', '07', '08', '09', 'F', 'G'];
      
      for (const row of dataRows) {        // Bỏ qua dòng không có mã hoặc tên tài sản
        if (!row[1] || !row[2]) {
          importStats.skippedRows++;
          continue;
        }

        const asset_code = row[1]?.toString().trim();
        const asset_name = row[2]?.toString().trim();
        
        // Bỏ qua dòng nếu tên tài sản là "C" hoặc số hiệu là "B"
        if (asset_name === "C" || asset_code === "B") {
          importStats.skippedRows++;
          continue;
        }
        
        // Bỏ qua dòng nếu mã tài sản hoặc tên tài sản nằm trong danh sách loại trừ
        if (excludeValues.includes(asset_code) || excludeValues.includes(asset_name)) {
          importStats.skippedRows++;
          continue;
        }
        
        importStats.totalAssets++;

        // Kiểm tra tài sản đã tồn tại chưa (dựa vào asset_code, asset_name, location, type)
        const existingAsset = await Asset.findOne({
          asset_code,
          asset_name,
          location,
          type,
        });

        const assetData = {
          specifications: row[3]?.toString().trim(),
          year_of_use: Number(row[4]) || new Date().getFullYear(),
          accounting: {
            quantity: Number(row[5]) || 0,
            unit_price: Number(row[6]) || 0,
            origin_price: Number(row[7]) || 0,
          },
          quantity_differential: {
            real_count: Number(row[8]) || 0,
            surplus_quantity: Number(row[9]) || 0,
            missing_quantity: Number(row[10]) || 0,
          },
          depreciation_rate: Number(row[11]) || 0,
          remaining_value: Number(row[13]) || 0,
          suggested_disposal: row[14]?.toString().trim() || '',
          acquisition_source: row[15]?.toString().trim() === 'DA' ? 'DA' : 'Lẻ',
          note: row[16]?.toString().trim() || '',
          type,
          location,
        };        let assetId;
          if (existingAsset) {
          // Cập nhật tài sản nếu đã tồn tại
          await Asset.updateOne({ _id: existingAsset._id }, assetData);
          assetId = existingAsset._id;
          importStats.updatedAssets++;
        } else {          
          // Tạo mới tài sản
          importStats.newAssets++;
          const newAsset = await Asset.create({
            asset_code,
            asset_name,
            ...assetData,
          });
          assetId = newAsset._id;
          
          // Thêm tài sản vào mảng assets của phòng
          await Room.findByIdAndUpdate(location, {
            $addToSet: { assets: assetId }
          });
          
          // Tạo thông báo cho tài sản mới được import
          try {
            const room = await Room.findById(location).select('fullName');
            await createAssetNotification({
              message: `Tài sản mới "${asset_name}" đã được thêm vào ${room?.fullName || 'hệ thống'} thông qua import Excel`,
              assetId: newAsset._id
            });
          } catch (notifError) {
            console.warn(`Không thể tạo thông báo cho tài sản ${asset_name}:`, notifError);
          }
        }
      }
      
      // Cập nhật số liệu tổng hợp của phòng sau khi import xong sheet này
      await updateRoomSummary(location);
    }    // Xóa file tạm sau khi đã xử lý xong
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
        console.log(`Đã xóa file tạm: ${req.file.path}`);
      }
    } catch (cleanupError) {
      console.warn(`Không thể xóa file tạm: ${req.file.path}`, cleanupError);
    }

    res.status(200).json({
      success: true,
      message: `Import thành công ${importStats.totalAssets} tài sản (${importStats.newAssets} mới, ${importStats.updatedAssets} cập nhật) từ ${importStats.processedSheets}/${importStats.totalSheets} sheet`,
      stats: importStats
    });
  } catch (error) {
    console.error('Lỗi khi import file Excel:', error);
    
    // Xóa file tạm ngay cả khi xử lý bị lỗi
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
        console.log(`Đã xóa file tạm: ${req.file.path}`);
      }
    } catch (cleanupError) {
      console.warn(`Không thể xóa file tạm: ${req.file.path}`, cleanupError);
    }
    
    res.status(500).json({ success: false, message: 'Import thất bại', error: error.message });
  }
};

module.exports = importAssets;
