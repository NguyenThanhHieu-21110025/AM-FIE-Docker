const Assets = require("../models/assetModel");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const xlsx = require("xlsx");
const csvParser = require("csv-parser");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * mapRowToAsset:
 *  - Chuyển đổi 1 hàng (row) từ Excel/CSV thành object Asset khớp với schema
 *  - Dựa trên header mới: B, C, D, E, 01, 02, 03, 04, 05, 06, 07, 08, 09, F, G
 */
function mapRowToAsset(row) {
  return {
    // Top-level
    asset_code: row["B"]?.toString().trim() || "",
    asset_name: row["C"]?.toString().trim() || "",
    specifications: row["D"]?.toString().trim() || "",
    year_of_use: parseInt(row["E"], 10) || new Date().getFullYear(),

    // accounting: { quantity, unit_price, origin_price }
    accounting: {
      quantity: parseInt(row["01"], 10) || 0,
      unit_price: parseFloat(row["02"]) || 0,
      origin_price: parseFloat(row["03"]) || 0,
    },

    // quantity_differential: { real_count, surplus_quantity, missing_quantity }
    quantity_differential: {
      real_count: parseInt(row["04"], 10) || 0,
      surplus_quantity: parseInt(row["05"], 10) || 0,
      missing_quantity: parseInt(row["06"], 10) || 0,
    },

    // Các trường khác
    depreciation_rate: parseFloat(row["07"]) || 0,
    remaining_value: parseFloat(row["08"]) || 0,
    // row["09"] -> nếu bạn muốn xử lý "% còn lại" thì thêm vào
    suggested_disposal: row["F"]?.toString().trim() || "",
    acquisition_source: row["G"]?.toString().trim() || "Lẻ",
  };
}

const importRouter = {
  importFile: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let assets = [];

    try {
      // -------------------------------
      // Xử lý file CSV
      // -------------------------------
      if (fileExt === ".csv") {
        // Nếu file CSV vẫn có header tiếng Việt, ta dùng mapping để chuyển sang B, C, D...
        const mapping = {
          "Số hiệu tài sản": "B",
          "Tên tài sản": "C",
          "Quy cách, đặc điểm tài sản": "D",
          "Năm sử dụng": "E",
          "Số lượng": "01",
          "Đơn giá": "02",
          "Nguyên giá": "03",
          "KK thực tế": "04",
          "SL Thừa": "05",
          "SL Thiếu": "06",
          "% hao mòn": "07",
          "Nguyên giá còn lại": "08",
          // "09": "% còn lại" (nếu cần)
          "Đề nghị thanh lý": "F",
          "Nguồn": "G",
        };

        assets = await new Promise((resolve, reject) => {
          const results = [];
          fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row) => {
              const newRow = {};
              // Chuyển header tiếng Việt -> header mới (B, C, D...)
              Object.keys(mapping).forEach((key) => {
                newRow[mapping[key]] = row[key];
              });
              const assetData = mapRowToAsset(newRow);
              // Chỉ thêm nếu có asset_code & asset_name
              if (assetData.asset_code && assetData.asset_name) {
                results.push(assetData);
              }
            })
            .on("end", () => resolve(results))
            .on("error", (err) => reject(err));
        });
      }
      // -------------------------------
      // Xử lý file Excel (.xlsx hoặc .xls)
      // -------------------------------
      else if (fileExt === ".xlsx" || fileExt === ".xls") {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Đọc toàn bộ dữ liệu dạng mảng 2 chiều
        const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // Tìm dòng header chứa ô "B"
        let headerRowIndex = -1;
        let headers = [];
        for (let i = 0; i < sheetData.length; i++) {
          const row = sheetData[i];
          if (row && row.find(cell => typeof cell === "string" && cell.trim() === "B")) {
            headerRowIndex = i;
            headers = row.map(cell => (typeof cell === "string" ? cell.trim() : cell));
            break;
          }
        }
        if (headerRowIndex === -1) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: "Không tìm thấy header 'B'" });
        }

        // Tạo danh sách đối tượng từ các dòng sau header
        const dataObjects = [];
        for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
          const row = sheetData[i];
          if (!row || row.length === 0) continue;
          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j];
          }
          dataObjects.push(obj);
        }

        // Chuyển sang asset và loại bỏ những dòng thiếu asset_code/asset_name
        assets = dataObjects
          .map(mapRowToAsset)
          .filter(a => a.asset_code && a.asset_name);
      }
      // -------------------------------
      // File không thuộc định dạng hỗ trợ
      // -------------------------------
      else {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "Unsupported file format. Please upload CSV or Excel file." });
      }

      if (assets.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "No valid assets to import" });
      }

      // Chèn tất cả vào MongoDB (không kiểm tra trùng lặp)
      await Assets.insertMany(assets);

      // Xóa file tạm
      fs.unlinkSync(filePath);

      res.status(200).json({ message: "File imported successfully", inserted: assets.length });
    } catch (error) {
      fs.unlinkSync(filePath);
      console.error("Import Error:", error);
      res.status(500).json({ message: "Error importing file", error: error.message });
    }
  },
};

module.exports = importRouter;