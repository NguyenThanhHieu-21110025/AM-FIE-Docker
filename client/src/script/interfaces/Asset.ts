import { formatPrice } from "../utils/formatPrice";
import { Room } from "./Room";
import { User } from "./User";

// Định nghĩa các type con để cải thiện khả năng đọc
type PopulatedLocation = {
  _id: string; 
  fullName: string; 
  name: string;
  building?: string;
};

type PopulatedUser = {
  _id: string;
  name: string;
  userid?: string;
};

// Định nghĩa loại tài sản
export type AssetType = 
  | "TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE" 
  | "TAI SAN QUAN LY TT HOP TAC DAO TAO QUOC TE" 
  | "TAI SAN TANG NAM" 
  | "TAI SAN VNT CONG CU DUNG CU TT HOP TAC DAO TAO QUOC TE";

// Interface chính cho Asset
export interface Asset {
  // Thông tin cơ bản
  _id?: string;
  asset_code: string;
  asset_name: string;
  specifications: string;
  year_of_use: number;
  
  // Thông tin kế toán
  accounting: {
    quantity: number;
    unit_price: number;
    origin_price: number;
  };
  
  // Thông tin kiểm kê
  quantity_differential: {
    real_count: number;
    surplus_quantity: number;
    missing_quantity: number;
  };
  
  // Thông tin khấu hao
  depreciation_rate: number;
  remaining_value: number;
  suggested_disposal: string;
  
  // Thông tin phân loại và quản lý
  acquisition_source: "Lẻ" | "DA";
  location?: string | PopulatedLocation;
  responsible_user?: string | PopulatedUser;
  note: string;
  
  // Loại tài sản (thêm vào interface)
  type: AssetType;
  
  // Lịch sử kiểm kê
  history?: Array<{
    date: Date;
    real_count: number;
    difference: number;
  }>;
  __v?: number;
  
  // Các trường phụ trợ cho hiển thị
  unit_price_formatted?: string;
  origin_price_formatted?: string;
  remaining_value_formatted?: string;
  responsible_user_name?: string;
  responsible_user_userid?: string;
  location_code?: string;
}

// Interface cho request API - chỉ bao gồm các trường cần thiết khi tạo/cập nhật
export type AssetRequest = Omit<
  Asset, 
  | '_id' 
  | '__v' 
  | 'history' 
  | 'unit_price_formatted' 
  | 'origin_price_formatted' 
  | 'remaining_value_formatted'
  | 'responsible_user_name'
  | 'responsible_user_userid'
  | 'location_code'
> & {
  location?: string;
  responsible_user?: string;
  asset_code?: string;
  specifications?: string;
  quantity_differential?: {
    real_count: number;
    surplus_quantity: number;
    missing_quantity: number;
  };
  suggested_disposal?: string;
  note?: string;
};


const HANDLE_ASSET_URL = import.meta.env.VITE_API_URL + "/asset";

// Hàm helper để xác định kiểu của location
export const getLocationId = (location: string | PopulatedLocation | undefined): string => {
  if (typeof location === 'object' && location !== null) {
    return location._id || '';
  }
  return location || '';
};

// Hàm helper để xác định kiểu của responsible_user
export const getUserId = (user: string | PopulatedUser | undefined): string => {
  if (typeof user === 'object' && user !== null) {
    return user._id || '';
  }
  return user || '';
};

export async function getAssetList(
  token: string,
  userList: User[],
  addressList: Room[]
) {
  const res = await fetch(`${HANDLE_ASSET_URL}`, {
    headers: { token: `Bearer ${token}` },
  });
  const data: Asset[] = await res.json();
  
  data.forEach((asset) => {
    // Format các giá trị tiền tệ
    asset.unit_price_formatted = formatPrice(asset.accounting?.unit_price || 0);
    asset.origin_price_formatted = formatPrice(asset.accounting?.origin_price || 0);
    asset.remaining_value_formatted = formatPrice(asset.remaining_value || 0);
    
    // Xử lý dữ liệu đã populate hoặc chưa populate
    if (typeof asset.responsible_user === 'object' && asset.responsible_user !== null) {
      asset.responsible_user_name = asset.responsible_user.name || "N/A";
    } else {
      asset.responsible_user_name = 
        userList.find((user) => user._id === asset.responsible_user)?.name || "N/A";
    }
    
    if (typeof asset.location === 'object' && asset.location !== null) {
      asset.location_code = asset.location.fullName || "N/A";
    } else {
      asset.location_code = 
        addressList.find((address) => address._id === asset.location)?.fullName || "N/A";
    }
  });
  return data;
}

export async function getAssetById(id: string, token: string): Promise<Asset> {
  const res = await fetch(`${HANDLE_ASSET_URL}/${id}`, {
    headers: { token: `Bearer ${token}` },
  });
  const data: Asset = await res.json();
  
  // Format các giá trị tiền tệ
  data.unit_price_formatted = formatPrice(data.accounting?.unit_price || 0);
  data.origin_price_formatted = formatPrice(data.accounting?.origin_price || 0);
  data.remaining_value_formatted = formatPrice(data.remaining_value || 0);
  
  // Xác định location_code và responsible_user_name
  if (typeof data.responsible_user === 'object' && data.responsible_user !== null) {
    data.responsible_user_name = data.responsible_user.name;
    data.responsible_user_userid = data.responsible_user.userid;
  }
  
  if (typeof data.location === 'object' && data.location !== null) {
    data.location_code = data.location.fullName;
  }
  
  return data;
}

export async function createAsset(asset: AssetRequest, token: string) {
  try {
    const response = await fetch(HANDLE_ASSET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,
      },
      body: JSON.stringify(asset),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw { status: response.status, response: { data: errorData } };
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error in createAsset:", error);
    throw error;
  }
}

export async function updateAsset(
  id: string,  
  asset: AssetRequest,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${HANDLE_ASSET_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,  
      },
      body: JSON.stringify(asset),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw { status: response.status, response: { data: errorData } };
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateAsset:", error);
    return false;
  }
}

export async function deleteAsset(id: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${HANDLE_ASSET_URL}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error("Error in deleteAsset:", error);
    return false;
  }
}