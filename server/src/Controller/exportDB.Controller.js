const ExcelJS = require('exceljs');
const Assets = require('../models/assetModel');

const ASSET_TYPE_TITLES = {
  'TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE': {
    mainTitle: 'BIÊN BẢN KIỂM KÊ TÀI SẢN CỐ ĐỊNH',
    subTitle: ''
  },
  'TAI SAN QUAN LY TT HOP TAC DAO TAO QUOC TE': {
    mainTitle: 'BIÊN BẢN KIỂM KÊ TÀI SẢN CÔNG CỤ QUẢN LÝ',
    subTitle: ''
  },
  'TAI SAN TANG NAM': {
    mainTitle: 'PHIẾU KIỂM KÊ TÀI SẢN TĂNG NĂM 2023',
    subTitle: 'Đơn vị: Khoa Đào tạo Quốc tế'
  },
  'TAI SAN VNT CONG CU DUNG CU TT HOP TAC DAO TAO QUOC TE': {
    mainTitle: 'BIÊN BẢN KIỂM KÊ TÀI SẢN VẬT NỘI THẤT CÔNG CỤ, DỤNG CỤ',
    subTitle: ''
  }
};

function buildWorksheet(workbook, assets, type) {
  // Tạo worksheet với tên là type (rút gọn nếu tên quá dài)
  const sheetName = type.length > 31 ? type.slice(0, 31) : type;
  const worksheet = workbook.addWorksheet(sheetName);

  const titleConfig = ASSET_TYPE_TITLES[type] || ASSET_TYPE_TITLES['TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE'];

  // Tiêu đề chính
  const titleRow = worksheet.addRow([titleConfig.mainTitle]);
  titleRow.font = { name: 'Times New Roman', bold: true, size: 17 };
  titleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(`A1:P1`);

  // Tiêu đề phụ
  if (titleConfig.subTitle) {
    const subTitleRow = worksheet.addRow([titleConfig.subTitle]);
    subTitleRow.font = { name: 'Times New Roman', size: 12 };
    subTitleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A2:P2`);
  }

  worksheet.addRow([]);

  const headerStartRow = titleConfig.subTitle ? 4 : 3;

  // Header Row 1
  const headerRow1Values = [
    'STT', 'Asset Code', 'Asset Name', 'Specifications', 'Year of Use',
    'Accounting', '', '',
    'Quantity Differential', '', '',
    'Depreciation Rate', 'Remaining Value', 'Suggested Disposal',
    'Acquisition Source', 'Note'
  ];
  const headerRow1 = worksheet.addRow(headerRow1Values);

  // Merge cells header nhóm và các cột đơn
  worksheet.mergeCells(`A${headerStartRow}:A${headerStartRow+1}`);
  worksheet.mergeCells(`B${headerStartRow}:B${headerStartRow+1}`);
  worksheet.mergeCells(`C${headerStartRow}:C${headerStartRow+1}`);
  worksheet.mergeCells(`D${headerStartRow}:D${headerStartRow+1}`);
  worksheet.mergeCells(`E${headerStartRow}:E${headerStartRow+1}`);
  worksheet.mergeCells(`L${headerStartRow}:L${headerStartRow+1}`);
  worksheet.mergeCells(`M${headerStartRow}:M${headerStartRow+1}`);
  worksheet.mergeCells(`N${headerStartRow}:N${headerStartRow+1}`);
  worksheet.mergeCells(`O${headerStartRow}:O${headerStartRow+1}`);
  worksheet.mergeCells(`P${headerStartRow}:P${headerStartRow+1}`);

  worksheet.mergeCells(`F${headerStartRow}:H${headerStartRow}`);
  worksheet.mergeCells(`I${headerStartRow}:K${headerStartRow}`);

  ['A','B','C','D','E','F','I','L','M','N','O','P'].forEach(col => {
    const cell = worksheet.getCell(`${col}${headerStartRow}`);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { name: 'Times New Roman', bold: true };
  });

  // Header Row 2
  const headerRow2Values = [
    '', '', '', '', '',
    'Quantity', 'Unit Price', 'Origin Price',
    'Real Count', 'Surplus Quantity', 'Missing Quantity',
    '', '', '', '', ''
  ];
  const headerRow2 = worksheet.addRow(headerRow2Values);

  ['F','G','H','I','J','K'].forEach(col => {
    const cell = headerRow2.getCell(col);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.font = { name: 'Times New Roman', bold: true };
  });

  [headerRow1, headerRow2].forEach(row => {
    row.eachCell(cell => {
      cell.font = { name: 'Times New Roman', bold: true };
    });
  });

  // Dữ liệu assets
  assets.forEach((asset, index) => {
    const dataRow = worksheet.addRow([
      index + 1,
      asset.asset_code,
      asset.asset_name,
      asset.specifications,
      asset.year_of_use,
      asset.accounting ? asset.accounting.quantity : '',
      asset.accounting ? asset.accounting.unit_price : '',
      asset.accounting ? asset.accounting.origin_price : '',
      asset.quantity_differential ? asset.quantity_differential.real_count : '',
      asset.quantity_differential ? asset.quantity_differential.surplus_quantity : '',
      asset.quantity_differential ? asset.quantity_differential.missing_quantity : '',
      asset.depreciation_rate,
      asset.remaining_value,
      asset.suggested_disposal,
      asset.acquisition_source,
      asset.note
    ]);

    dataRow.eachCell(cell => {
      cell.font = { name: 'Times New Roman' };
    });
  });

  // Đặt chiều rộng cột
  worksheet.columns = [
    { key: 'A', width: 6 },
    { key: 'B', width: 15 },
    { key: 'C', width: 20 },
    { key: 'D', width: 25 },
    { key: 'E', width: 12 },
    { key: 'F', width: 10 },
    { key: 'G', width: 15 },
    { key: 'H', width: 15 },
    { key: 'I', width: 10 },
    { key: 'J', width: 15 },
    { key: 'K', width: 15 },
    { key: 'L', width: 18 },
    { key: 'M', width: 18 },
    { key: 'N', width: 20 },
    { key: 'O', width: 20 },
    { key: 'P', width: 25 }
  ];

  // Border cho header + data
  for (let i = headerStartRow; i <= worksheet.rowCount; i++) {
    worksheet.getRow(i).eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }

  // Định dạng số
  worksheet.getColumn('G').numFmt = '#,##0.00'; // Unit Price
  worksheet.getColumn('H').numFmt = '#,##0.00'; // Origin Price
  worksheet.getColumn('M').numFmt = '#,##0.00'; // Remaining Value

  return worksheet;
}

const exportDB = {
  exportDB: async (req, res) => {
    try {
      const { type } = req.params;
      const assets = await Assets.find({ type }).lean();

      if (!assets || assets.length === 0) {
        return res.status(404).json({ message: `No ${type} assets found to export` });
      }

      const workbook = new ExcelJS.Workbook();
      buildWorksheet(workbook, assets, type);

      res.setHeader('Content-Disposition', `attachment; filename=${type.replace(/ /g, '_')}-export.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export assets', error: error.message });
    }
  },

  exportMultipleTypes: async (req, res) => {
    try {
      const { types } = req.body; // mảng các type

      if (!Array.isArray(types) || types.length === 0) {
        return res.status(400).json({ message: 'No types provided for export' });
      }

      const workbook = new ExcelJS.Workbook();

      // Lấy dữ liệu và tạo sheet cho từng type
      for (const type of types) {
        const assets = await Assets.find({ type }).lean();
        if (assets.length > 0) {
          buildWorksheet(workbook, assets, type);
        }
      }

      if (workbook.worksheets.length === 0) {
        return res.status(404).json({ message: 'No assets found for given types' });
      }

      res.setHeader('Content-Disposition', `attachment; filename=assets-multiple-types-export.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting multiple types:', error);
      res.status(500).json({ message: 'Failed to export multiple types', error: error.message });
    }
  },
  getAvailableTypes: async (req, res) => {
    try {
      const types = await Assets.distinct('type');
      res.json({ types });
    } catch (error) {
      console.error('Error fetching asset types:', error);
      res.status(500).json({ message: 'Failed to fetch asset types', error: error.message });
    }
    
  },

};

module.exports = exportDB;