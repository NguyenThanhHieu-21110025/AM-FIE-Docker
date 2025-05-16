// File chứa các hằng số liên quan đến tài sản
import { AssetType } from "../interfaces/Asset";

// Định nghĩa các loại tài sản với mã màu tương ứng 
export const ASSET_TYPES = [
  {
    value: "TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE" as AssetType,
    label: "Tài sản cố định",
    color: "#4f46e5", // indigo
    icon: "📊",
  },
  {
    value: "TAI SAN QUAN LY TT HOP TAC DAO TAO QUOC TE" as AssetType,
    label: "Tài sản công cụ quản lý",
    color: "#0891b2", // cyan
    icon: "🔧",
  },
  {
    value: "TAI SAN TANG NAM" as AssetType,
    label: "Tài sản tăng năm",
    color: "#059669", // emerald
    icon: "📈",
  },
  {
    value: "TAI SAN VNT CONG CU DUNG CU TT HOP TAC DAO TAO QUOC TE" as AssetType,
    label: "Tài sản vật nội thất, công cụ dụng cụ",
    color: "#d97706", // amber
    icon: "🪑",
  },
];

// Các phần của form asset
export const ASSET_FORM_SECTIONS = [
  { title: "Thông tin chung", icon: "📋" },
  { title: "Kế toán & Kiểm kê", icon: "💰" },
  { title: "Khấu hao & Vị trí", icon: "📍" }
];

// Giá trị mặc định cho tài sản mới
export const DEFAULT_ASSET_TYPE = "TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE" as AssetType;
export const DEFAULT_ACQUISITION_SOURCE = "Lẻ" as const;

// Hàm helper để lấy thông tin về loại tài sản
export const getAssetTypeInfo = (typeValue?: string) => {
  return ASSET_TYPES.find((type) => type.value === typeValue) || ASSET_TYPES[0];
};
