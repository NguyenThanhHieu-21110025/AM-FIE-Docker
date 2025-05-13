const ExcelJS = require('exceljs');
const Assets = require('../models/assetModel');

const exportDB = {
  exportDB: async (req, res) => {
    try {
      const { type } = req.params; // Lấy type từ route params

      // Lấy dữ liệu assets từ MongoDB theo type
      const assets = await Assets.find({ type }).lean();
      if (!assets || assets.length === 0) {
        return res.status(404).json({ message: `No ${type} assets found to export` });
      }

      // Tạo workbook và worksheet mới
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Assets');

      // Định nghĩa tiêu đề cho từng loại tài sản
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

      // Kiểm tra type của tài sản đầu tiên (giả sử tất cả cùng loại)
      const assetType = assets[0].type;
      const titleConfig = ASSET_TYPE_TITLES[assetType] || ASSET_TYPE_TITLES['TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE'];

      // Thêm tiêu đề chính
      const titleRow = worksheet.addRow([titleConfig.mainTitle]);
      titleRow.font = {
        name: 'Times New Roman',
        bold: true,
        size: 17
      };
      titleRow.alignment = { horizontal: 'center' };
      worksheet.mergeCells(`A1:P1`);

      // Thêm tiêu đề phụ nếu có
      if (titleConfig.subTitle) {
        const subTitleRow = worksheet.addRow([titleConfig.subTitle]);
        subTitleRow.font = {
          name: 'Times New Roman',
          size: 12
        };
        subTitleRow.alignment = { horizontal: 'center' };
        worksheet.mergeCells(`A2:P2`);
      }

      // Thêm một dòng trống sau tiêu đề
      worksheet.addRow([]);

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
      // Bắt đầu từ row 4 (nếu có cả title và subtitle) hoặc row 3 (nếu chỉ có title)
      const headerStartRow = titleConfig.subTitle ? 4 : 3;
      
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
      worksheet.mergeCells(`A${headerStartRow}:A${headerStartRow+1}`); // STT
      worksheet.mergeCells(`B${headerStartRow}:B${headerStartRow+1}`); // Asset Code
      worksheet.mergeCells(`C${headerStartRow}:C${headerStartRow+1}`); // Asset Name
      worksheet.mergeCells(`D${headerStartRow}:D${headerStartRow+1}`); // Specifications
      worksheet.mergeCells(`E${headerStartRow}:E${headerStartRow+1}`); // Year of Use
      worksheet.mergeCells(`L${headerStartRow}:L${headerStartRow+1}`); // Depreciation Rate
      worksheet.mergeCells(`M${headerStartRow}:M${headerStartRow+1}`); // Remaining Value
      worksheet.mergeCells(`N${headerStartRow}:N${headerStartRow+1}`); // Suggested Disposal
      worksheet.mergeCells(`O${headerStartRow}:O${headerStartRow+1}`); // Acquisition Source
      worksheet.mergeCells(`P${headerStartRow}:P${headerStartRow+1}`); // Note

      worksheet.mergeCells(`F${headerStartRow}:H${headerStartRow}`);
      worksheet.mergeCells(`I${headerStartRow}:K${headerStartRow}`);

      ['A','B','C','D','E','F','I','L','M','N','O','P'].forEach(col => {
        worksheet.getCell(`${col}${headerStartRow}`).alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
        worksheet.getCell(`${col}${headerStartRow}`).font = {
          name: 'Times New Roman',
          bold: true
        };
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
        const cell = headerRow2.getCell(col);
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
        cell.font = {
          name: 'Times New Roman',
          bold: true
        };
      });

      [headerRow1, headerRow2].forEach(row => {
        row.eachCell(cell => {
          cell.font = {
            name: 'Times New Roman',
            bold: true
          };
        });
      });

      // Thêm dữ liệu
      assets.forEach((asset, index) => {
        const dataRow = worksheet.addRow([
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

        // Áp dụng font Times New Roman cho toàn bộ dòng dữ liệu
        dataRow.eachCell(cell => {
          cell.font = {
            name: 'Times New Roman'
          };
        });
      });

      // Đặt chiều rộng cột
      worksheet.columns = [
        { key: 'A', width: 6 },   // STT
        { key: 'B', width: 15 },  // Asset Code
        { key: 'C', width: 20 },  // Asset Name
        { key: 'D', width: 25 },  // Specifications
        { key: 'E', width: 12 },  // Year of Use
        { key: 'F', width: 10 },  // Quantity
        { key: 'G', width: 15 },  // Unit Price
        { key: 'H', width: 15 },  // Origin Price
        { key: 'I', width: 10 },  // Real Count
        { key: 'J', width: 15 },  // Surplus Quantity
        { key: 'K', width: 15 },  // Missing Quantity
        { key: 'L', width: 18 },  // Depreciation Rate
        { key: 'M', width: 18 },  // Remaining Value
        { key: 'N', width: 20 },  // Suggested Disposal
        { key: 'O', width: 20 },  // Acquisition Source
        { key: 'P', width: 25 }   // Note
      ];

      // Thêm border cho toàn bộ dữ liệu
      const dataRange = `A${headerStartRow+2}:P${worksheet.rowCount}`;
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

      // Định dạng số cho các cột giá
      worksheet.getColumn('G').numFmt = '#,##0.00'; // Unit Price
      worksheet.getColumn('H').numFmt = '#,##0.00'; // Origin Price
      worksheet.getColumn('M').numFmt = '#,##0.00'; // Remaining Value

      res.setHeader('Content-Disposition', `attachment; filename=${type.replace(/ /g, '_')}-export.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export assets', error: error.message });
    }
  },

  // Thêm hàm export nhiều types
exportMultipleTypes: async (req, res) => {
  try {
    const { types } = req.body; // Nhận array các types
    
    // Lấy dữ liệu assets từ MongoDB theo nhiều types
    const assets = await Assets.find({ type: { $in: types } }).lean();
    if (!assets || assets.length === 0) {
      return res.status(404).json({ message: 'No assets found for selected types' });
    }

    // ... (phần export tương tự như trước)
    // Tạo workbook và worksheet mới
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assets');

    // Định nghĩa tiêu đề cho từng loại tài sản
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

    // Kiểm tra type của tài sản đầu tiên (giả sử tất cả cùng loại)
    const assetType = assets[0].type;
    const titleConfig = ASSET_TYPE_TITLES[assetType] || ASSET_TYPE_TITLES['TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE'];

    // Thêm tiêu đề chính
    const titleRow = worksheet.addRow([titleConfig.mainTitle]);
    titleRow.font = {
      name: 'Times New Roman',
      bold: true,
      size: 17
    };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A1:P1`);

    // Thêm tiêu đề phụ nếu có
    if (titleConfig.subTitle) {
      const subTitleRow = worksheet.addRow([titleConfig.subTitle]);
      subTitleRow.font = {
        name: 'Times New Roman',
        size: 12
      };
      subTitleRow.alignment = { horizontal: 'center' };
      worksheet.mergeCells(`A2:P2`);
    }

    // Thêm một dòng trống sau tiêu đề
    worksheet.addRow([]);

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
    // Bắt đầu từ row 4 (nếu có cả title và subtitle) hoặc row 3 (nếu chỉ có title)
    const headerStartRow = titleConfig.subTitle ? 4 : 3;
    
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
    worksheet.mergeCells(`A${headerStartRow}:A${headerStartRow+1}`); // STT
    worksheet.mergeCells(`B${headerStartRow}:B${headerStartRow+1}`); // Asset Code
    worksheet.mergeCells(`C${headerStartRow}:C${headerStartRow+1}`); // Asset Name
    worksheet.mergeCells(`D${headerStartRow}:D${headerStartRow+1}`); // Specifications
    worksheet.mergeCells(`E${headerStartRow}:E${headerStartRow+1}`); // Year of Use
    worksheet.mergeCells(`L${headerStartRow}:L${headerStartRow+1}`); // Depreciation Rate
    worksheet.mergeCells(`M${headerStartRow}:M${headerStartRow+1}`); // Remaining Value
    worksheet.mergeCells(`N${headerStartRow}:N${headerStartRow+1}`); // Suggested Disposal
    worksheet.mergeCells(`O${headerStartRow}:O${headerStartRow+1}`); // Acquisition Source
    worksheet.mergeCells(`P${headerStartRow}:P${headerStartRow+1}`); // Note

    worksheet.mergeCells(`F${headerStartRow}:H${headerStartRow}`);
    worksheet.mergeCells(`I${headerStartRow}:K${headerStartRow}`);

    ['A','B','C','D','E','F','I','L','M','N','O','P'].forEach(col => {
      worksheet.getCell(`${col}${headerStartRow}`).alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true
      };
      worksheet.getCell(`${col}${headerStartRow}`).font = {
        name: 'Times New Roman',
        bold: true
      };
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
      const cell = headerRow2.getCell(col);
      cell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true
      };
      cell.font = {
        name: 'Times New Roman',
        bold: true
      };
    });

    [headerRow1, headerRow2].forEach(row => {
      row.eachCell(cell => {
        cell.font = {
          name: 'Times New Roman',
          bold: true
        };
      });
    });

    // Thêm dữ liệu
    assets.forEach((asset, index) => {
      const dataRow = worksheet.addRow([
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

      // Áp dụng font Times New Roman cho toàn bộ dòng dữ liệu
      dataRow.eachCell(cell => {
        cell.font = {
          name: 'Times New Roman'
        };
      });
    });

    // Đặt chiều rộng cột
    worksheet.columns = [
      { key: 'A', width: 6 },   // STT
      { key: 'B', width: 15 },  // Asset Code
      { key: 'C', width: 20 },  // Asset Name
      { key: 'D', width: 25 },  // Specifications
      { key: 'E', width: 12 },  // Year of Use
      { key: 'F', width: 10 },  // Quantity
      { key: 'G', width: 15 },  // Unit Price
      { key: 'H', width: 15 },  // Origin Price
      { key: 'I', width: 10 },  // Real Count
      { key: 'J', width: 15 },  // Surplus Quantity
      { key: 'K', width: 15 },  // Missing Quantity
      { key: 'L', width: 18 },  // Depreciation Rate
      { key: 'M', width: 18 },  // Remaining Value
      { key: 'N', width: 20 },  // Suggested Disposal
      { key: 'O', width: 20 },  // Acquisition Source
      { key: 'P', width: 25 }   // Note
    ];

    // Thêm border cho toàn bộ dữ liệu
    const dataRange = `A${headerStartRow+2}:P${worksheet.rowCount}`;
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

    // Định dạng số cho các cột giá
    worksheet.getColumn('G').numFmt = '#,##0.00'; // Unit Price
    worksheet.getColumn('H').numFmt = '#,##0.00'; // Origin Price
    worksheet.getColumn('M').numFmt = '#,##0.00'; // Remaining Value
    
    const filename = types.length === 1 
      ? `${types[0].replace(/ /g, '_')}-export.xlsx`
      : 'multiple_types_export.xlsx';
    
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Failed to export assets', error: error.message });
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