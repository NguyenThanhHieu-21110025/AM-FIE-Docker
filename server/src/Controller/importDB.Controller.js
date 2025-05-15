const xlsx = require('xlsx');
const Asset = require('../models/assetModel');

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

      const headerIndex = rows.findIndex(r => r.includes("Tên tài sản") || r.includes("Số hiệu tài sản"));
      if (headerIndex === -1) continue;

      const dataRows = rows.slice(headerIndex + 1);

      for (const row of dataRows) {
        if (!row[1] || !row[2]) continue;

        const newAsset = {
          asset_code: row[1]?.toString().trim(),
          asset_name: row[2]?.toString().trim(),
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
        };

        await Asset.create(newAsset);
      }
    }

    res.status(200).json({ message: 'Import thành công' });
  } catch (error) {
    console.error('Lỗi khi import file Excel:', error);
    res.status(500).json({ message: 'Import thất bại', error: error.message });
  }
};

module.exports = importAssets;