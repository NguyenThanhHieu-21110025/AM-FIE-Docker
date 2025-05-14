export interface Column {
  header: string;
  accessorKey?: string; // Optional, since grouped columns won't have an accessorKey
  footer: string;
  columns?: Column[]; // Add support for sub-columns
}

export const assetTableColumns: Column[] = [
  {
    header: "Số hiệu tài sản",
    accessorKey: "asset_code",
    footer: "Số hiệu tài sản",
  },
  {
    header: "Tên tài sản",
    accessorKey: "asset_name",
    footer: "Tên tài sản",
  },
  {
    header: "Quy cách, đặc điểm tài sản",
    accessorKey: "specifications",
    footer: "Quy cách, đặc điểm tài sản",
  },
  {
    header: "Năm sử dụng",
    accessorKey: "year_of_use",
    footer: "Năm sử dụng",
  },
  {
    header: "Theo sổ kế toán", // Grouped header for accounting
    footer: "Theo sổ kế toán",
    columns: [
      {
        header: "Số lượng",
        accessorKey: "accounting.quantity",
        footer: "Số Lượng",
      },
      {
        header: "Đơn Giá",
        accessorKey: "unit_price_formatted",
        footer: "Đơn Giá",
      },
      {
        header: "Nguyên giá",
        accessorKey: "origin_price_formatted",
        footer: "Nguyên giá",
      },
    ],
  },
  {
    header: "Chênh lệch", // Grouped header for quantity_differential
    footer: "Chênh lệch",
    columns: [
      {
        header: "Số lượng thực tế",
        accessorKey: "quantity_differential.real_count",
        footer: "Số lượng thực tế",
      },
      {
        header: "Số lượng thừa",
        accessorKey: "quantity_differential.surplus_quantity",
        footer: "Số lượng thừa",
      },
      {
        header: "Số lượng thiếu",
        accessorKey: "quantity_differential.missing_quantity",
        footer: "Số lượng thiếu",
      },
    ],
  },
  {
    header: "Phần trăm hao mòn",
    accessorKey: "depreciation_rate",
    footer: "Phần trăm hao mòn",
  },
  {
    header: "Giá trị còn lại",
    accessorKey: "remaining_value_formatted",
    footer: "Giá trị còn lại",
  },
  {
    header: "Địa chỉ phòng",
    accessorKey: "location_code",
    footer: "Địa chỉ phòng",
  },
  {
    header: "Người kiểm kê tài sản",
    accessorKey: "responsible_user_name",
    footer: "Người kiểm kê tài sản",
  },
  {
    header: "Nguồn hình thành",
    accessorKey: "acquisition_source",
    footer: "Nguồn hình thành",
  },
  {
    header: "Đề nghị thanh lý",
    accessorKey: "suggested_disposal",
    footer: "Đề nghị thanh lý",
  },
  {
    header: "Ghi chú",
    accessorKey: "note",
    footer: "Ghi chú",
  },
];

export const userTableColumns: Column[] = [
  // Thông tin cá nhân
  {
    header: "Thông tin cá nhân",
    footer: "Thông tin cá nhân",
    columns: [
      {
        header: "ID người dùng",
        accessorKey: "userid",
        footer: "ID người dùng",
      },
      {
        header: "Tên người dùng",
        accessorKey: "name",
        footer: "Tên người dùng",
      },
    ]
  },
  
  // Thông tin liên hệ
  {
    header: "Thông tin liên hệ",
    footer: "Thông tin liên hệ",
    columns: [
      {
        header: "Email",
        accessorKey: "email",
        footer: "Email",
      },
      {
        header: "Số điện thoại",
        accessorKey: "phoneNumber",
        footer: "Số điện thoại",
      },
    ]
  },
  
  // Thông tin công việc
  {
    header: "Thông tin công việc",
    footer: "Thông tin công việc",
    columns: [
      { 
        header: "Quyền hạn", 
        accessorKey: "displayRole", 
        footer: "Quyền hạn" 
      },
      {
        header: "Chức vụ",
        accessorKey: "position",
        footer: "Chức vụ",
      },
      { 
        header: "Trạng thái", 
        accessorKey: "status", 
        footer: "Trạng thái" 
      },
    ]
  },
];

export const roomTableColumns: Column[] = [
  {
    header: "Thông tin chung",
    footer: "Thông tin chung",
    columns: [
      {
        header: "Phòng",
        accessorKey: "fullName",
        footer: "Phòng",
      },
      {
        header: "Người phụ trách",
        accessorKey: "responsible_user_name",
        footer: "Người phụ trách",
      },
    ],
  },

  {
    header: "Theo sổ kế toán",
    footer: "Theo sổ kế toán",
    columns: [
      {
        header: "Số lượng",
        accessorKey: "accountingRecords.quantity",
        footer: "Số lượng",
      },
      {
        header: "Nguyên giá",
        accessorKey: "accountingRecords.originalValue",
        footer: "Nguyên giá",
      },
      {
        header: "Giá trị còn lại",
        accessorKey: "accountingRecords.currentValue",
        footer: "Giá trị còn lại",
      },
    ],
  },

  {
    header: "Theo kiểm kê thực tế",
    footer: "Kiểm kê thực tế",
    columns: [
      {
        header: "Số lượng",
        accessorKey: "physicalCount.quantity",
        footer: "Số lượng",
      },
      {
        header: "Nguyên giá",
        accessorKey: "physicalCount.originalValue",
        footer: "Nguyên giá",
      },
      {
        header: "Giá trị còn lại",
        accessorKey: "physicalCount.currentValue",
        footer: "Giá trị còn lại",
      },
    ],
  },

  {
    header: "Chênh lệch",
    footer: "Chênh lệch",
    columns: [
      {
        header: "Số lượng",
        accessorKey: "discrepancy.quantity",
        footer: "Số lượng",
      },
      {
        header: "Nguyên giá",
        accessorKey: "discrepancy.originalValue",
        footer: "Nguyên giá",
      },
      {
        header: "Giá trị còn lại",
        accessorKey: "discrepancy.currentValue",
        footer: "Giá trị còn lại",
      },
    ],
  },

  {
    header: "Lý do",
    footer: "Lý do",
    columns: [
      {
        header: "Thất lạc",
        accessorKey: "reason.lost",
        footer: "Thất lạc",
      },
      {
        header: "Thanh lý",
        accessorKey: "reason.disposed",
        footer: "Thanh lý",
      },
    ],
  },

  // Ghi chú
  {
    header: "Ghi chú",
    accessorKey: "note",
    footer: "Ghi chú",
  },
];
