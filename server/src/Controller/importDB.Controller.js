const xlsx = require('xlsx');
const Asset = require('../models/assetModel');
const Room = require('../models/roomModel'); // nhớ import model phòng nếu chưa có

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
      const room = await Room.findOne({ name: sheetName });
      if (!room) {
        console.warn(`Không tìm thấy phòng có tên "${sheetName}", bỏ qua sheet này.`);
        continue;
      }
      const location = room._id;

      // Tìm header chứa tên cột "Tên tài sản" hoặc "Số hiệu tài sản"
      const headerIndex = rows.findIndex(r => r.includes("Tên tài sản") || r.includes("Số hiệu tài sản"));
      if (headerIndex === -1) continue;

      const dataRows = rows.slice(headerIndex + 1);
      const excludeValues = ['A', 'B', 'C', 'D', 'E', '01', '02', '03', '04', '05', '06', '07', '08', '09', 'F', 'G'];

      for (const row of dataRows) {
        // Bỏ qua dòng không có mã hoặc tên tài sản
        if (!row[1] || !row[2]) continue;

        const asset_code = row[1]?.toString().trim();
        const asset_name = row[2]?.toString().trim();

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
          remaining_value: Number(row[12]) || 0,
          suggested_disposal: row[13]?.toString().trim() || '',
          acquisition_source: row[14]?.toString().trim() === 'DA' ? 'DA' : 'Lẻ',
          note: row[17]?.toString().trim() || '',
          type,
          location,
        };

        if (existingAsset) {
          // Cập nhật tài sản nếu đã tồn tại
          await Asset.updateOne({ _id: existingAsset._id }, assetData);
        } else {
          // Tạo mới tài sản
          await Asset.create({
            asset_code,
            asset_name,
            ...assetData,
          });
        }
      }
    }

    res.status(200).json({ message: 'Import thành công' });
  } catch (error) {
    console.error('Lỗi khi import file Excel:', error);
    res.status(500).json({ message: 'Import thất bại', error: error.message });
  }
};

module.exports = importAssets;
