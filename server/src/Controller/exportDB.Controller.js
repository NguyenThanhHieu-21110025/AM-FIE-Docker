const ExcelJS = require('exceljs');
const Assets = require('../models/assetModel');

const exportDB = {
  exportDB: async (req, res) => {
    try {
      // Lấy dữ liệu assets từ MongoDB (dạng object thuần)
      const assets = await Assets.find().lean();
      if (!assets || assets.length === 0) {
        return res.status(404).json({ message: 'No assets found to export' });
      }

      // Tạo workbook và worksheet mới
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Assets');

      /*  
         Sắp xếp các cột theo thứ tự:
         A: STT  
         B: Asset Code  
         C: Asset Name  
         D: Specifications  
         E: Year of Use  
         F-G-H: Accounting (Quantity, Unit Price, Origin Price)  
         I-J-K: Quantity Differential (Real Count, Surplus Quantity, Missing Quantity)  
         L: Depreciation Rate  
         M: Remaining Value  
         N: Suggested Disposal  
         O: Acquisition Source  
         P: Note  
      */

      // Tạo Header Row 1 (nhóm header)
      // ------------------------------
      // Ta tạo một mảng 16 phần tử (cho 16 cột)
      const headerRow1Values = [
        'STT',             // A
        'Asset Code',      // B
        'Asset Name',      // C
        'Specifications',  // D
        'Year of Use',     // E
        'Accounting',      // F, G, H sẽ được merge
        '',                // (trống, sẽ bị merge với F)
        '',                // (trống, merge với F)
        'Quantity Differential', // I, J, K merge
        '',                // (trống)
        '',                // (trống)
        'Depreciation Rate', // L
        'Remaining Value',   // M
        'Suggested Disposal',// N
        'Acquisition Source',// O
        'Note'               // P
      ];
      const headerRow1 = worksheet.addRow(headerRow1Values);

      // Merge các ô không thuộc nhóm (đối với cột không có sub-header)
      worksheet.mergeCells('A1:A2'); // STT
      worksheet.mergeCells('B1:B2'); // Asset Code
      worksheet.mergeCells('C1:C2'); // Asset Name
      worksheet.mergeCells('D1:D2'); // Specifications
      worksheet.mergeCells('E1:E2'); // Year of Use
      worksheet.mergeCells('L1:L2'); // Depreciation Rate
      worksheet.mergeCells('M1:M2'); // Remaining Value
      worksheet.mergeCells('N1:N2'); // Suggested Disposal
      worksheet.mergeCells('O1:O2'); // Acquisition Source
      worksheet.mergeCells('P1:P2'); // Note

      worksheet.mergeCells('F1:H1');
      worksheet.mergeCells('I1:K1');

      ['A','B','C','D','E','F','I','L','M','N','O','P'].forEach(col => {
        worksheet.getCell(`${col}1`).alignment = { horizontal: 'center', vertical: 'middle' };
      });

      
      const headerRow2Values = [
        '',  // A: STT
        '',  // B: Asset Code
        '',  // C: Asset Name
        '',  // D: Specifications
        '',  // E: Year of Use
        'Quantity',      // F: Accounting chi tiết
        'Unit Price',    // G
        'Origin Price',  // H
        'Real Count',    // I: Quantity Differential chi tiết
        'Surplus Quantity', // J
        'Missing Quantity', // K
        '',  // L: Depreciation Rate
        '',  // M: Remaining Value
        '',  // N: Suggested Disposal
        '',  // O: Acquisition Source
        ''   // P: Note
      ];
      const headerRow2 = worksheet.addRow(headerRow2Values);

      ['F','G','H','I','J','K'].forEach(col => {
        headerRow2.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
      });

      [headerRow1, headerRow2].forEach(row => {
        row.eachCell(cell => {
          cell.font = { bold: true };
        });
      });

      assets.forEach((asset, index) => {
        worksheet.addRow([
          index + 1,                           // STT
          asset.asset_code,                    // Asset Code
          asset.asset_name,                    // Asset Name
          asset.specifications,                // Specifications
          asset.year_of_use,                   // Year of Use
          asset.accounting ? asset.accounting.quantity : '',       // Accounting: Quantity
          asset.accounting ? asset.accounting.unit_price : '',       // Accounting: Unit Price
          asset.accounting ? asset.accounting.origin_price : '',     // Accounting: Origin Price
          asset.quantity_differential ? asset.quantity_differential.real_count : '',       // Quantity Differential: Real Count
          asset.quantity_differential ? asset.quantity_differential.surplus_quantity : '',   // Surplus Quantity
          asset.quantity_differential ? asset.quantity_differential.missing_quantity : '',   // Missing Quantity
          asset.depreciation_rate,             // Depreciation Rate
          asset.remaining_value,               // Remaining Value
          asset.suggested_disposal,            // Suggested Disposal
          asset.acquisition_source,            // Acquisition Source
          asset.note                           // Note
        ]);
      });

      // Optionally, đặt chiều rộng cột
      worksheet.getColumn(1).width = 6;   // STT
      worksheet.getColumn(2).width = 15;  // Asset Code
      worksheet.getColumn(3).width = 20;  // Asset Name
      worksheet.getColumn(4).width = 25;  // Specifications
      worksheet.getColumn(5).width = 12;  // Year of Use
      worksheet.getColumn(6).width = 10;  // Quantity
      worksheet.getColumn(7).width = 15;  // Unit Price
      worksheet.getColumn(8).width = 15;  // Origin Price
      worksheet.getColumn(9).width = 10;  // Real Count
      worksheet.getColumn(10).width = 15; // Surplus Quantity
      worksheet.getColumn(11).width = 15; // Missing Quantity
      worksheet.getColumn(12).width = 18; // Depreciation Rate
      worksheet.getColumn(13).width = 18; // Remaining Value
      worksheet.getColumn(14).width = 20; // Suggested Disposal
      worksheet.getColumn(15).width = 20; // Acquisition Source
      worksheet.getColumn(16).width = 25; // Note

      res.setHeader('Content-Disposition', 'attachment; filename=assets-export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export assets', error: error.message });
    }
  }
};

module.exports = exportDB;