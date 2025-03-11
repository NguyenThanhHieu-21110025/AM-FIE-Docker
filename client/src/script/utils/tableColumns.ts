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
  { header: "Loại tài khoản", accessorKey: "role", footer: "Loại tài khoản" },
  {
    header: "Chức vụ",
    accessorKey: "position",
    footer: "Chức vụ",
  },
  { header: "Trạng thái", accessorKey: "status", footer: "Trạng thái" },
];

export const addressTableColumns: Column[] = [
  {
    header: "Mã phòng",
    accessorKey: "room_id",
    footer: "Mã phòng",
  },
  {
    header: "Tên phòng",
    accessorKey: "name",
    footer: "Tên phòng",
  },
  {
    header: "Tên tòa nhà",
    accessorKey: "building",
    footer: "Tên tòa nhà",
  },
  {
    header: "Người phụ trách",
    accessorKey: "responsible_user_name",
    footer: "Người phụ trách",
  },
];
