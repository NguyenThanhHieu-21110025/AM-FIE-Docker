
import { formatPrice } from "../utils/formatPrice";
import { Address, getAddressById } from "./Address";
import { getUserById, User } from "./User";

export interface Asset {
  _id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  specifications: string;
  year_of_use: number;
  accounting: {
    quantity: number;
    unit_price: number;
    origin_price: number;
  };
  quantity_differential: {
    real_count: number;
    surplus_quantity: number;
    missing_quantity: number;
  };
  depreciation_rate: number;
  remaining_value: number;
  location: string;
  responsible_user: string;
  suggested_disposal: string;
  acquisition_source: "Lẻ" | "DA";
  note: string;
  __v: string;
  history: any[];
  // Formatted display values
  unit_price_formatted: string;
  origin_price_formatted: string;
  remaining_value_formatted: string;
  responsible_user_name: string;
  responsible_user_userid: string;
  location_code: string;
}


export interface AssetRequest {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  specifications: string;
  year_of_use: number;
  accounting: {
    quantity: number;
    unit_price: number;
    origin_price: number;
  };
  quantity_differential: {
    real_count: number;
    surplus_quantity: number;
    missing_quantity: number;
  };
  depreciation_rate: number;
  remaining_value: number;
  location: string;
  responsible_user: string;
  suggested_disposal: string;
  acquisition_source: "Lẻ" | "DA";
  note: string;
}

const HANDLE_ASSET_URL = import.meta.env.VITE_API_URL + "/asset";

export async function getAssetList(
  token: string,
  userList: User[],
  addressList: Address[]
) {
  const res = await fetch(`${HANDLE_ASSET_URL}`, {
    headers: { token: `Bearer ${token}` },
  });
  const data: Asset[] = await res.json();
  
  data.forEach((asset) => {
    // Format prices from nested structure
    asset.unit_price_formatted = formatPrice(asset.accounting?.unit_price || 0);
    asset.origin_price_formatted = formatPrice(asset.accounting?.origin_price || 0);
    asset.remaining_value_formatted = formatPrice(asset.remaining_value || 0);
    
    // Get user and location info
    asset.responsible_user_name =
      userList.find((user) => user._id === asset.responsible_user)?.name ||
      "N/A";
    asset.location_code =
      addressList.find((address) => address._id === asset.location)?.room_id ||
      "N/A";
  });

  return data;
}

export async function getAssetById(id: string, token: string) {
  const res = await fetch(`${HANDLE_ASSET_URL}/${id}`, {
    headers: { token: `Bearer ${token}` },
  });
  const data = await res.json();
  
  // Format prices from nested structure
  data.unit_price_formatted = formatPrice(data.accounting?.unit_price || 0);
  data.origin_price_formatted = formatPrice(data.accounting?.origin_price || 0);
  data.remaining_value_formatted = formatPrice(data.remaining_value || 0);

  const responsible_user = await getUserById(data.responsible_user, token);
  data.responsible_user_name = responsible_user?.name || 'N/A';
  data.responsible_user_userid = responsible_user?.userid || 'N/A';
  
  const address = await getAddressById(data.location, token);
  data.location_name = address?.room_id || 'N/A';

  return data;
}

// Update createAsset function
export async function createAsset(asset: AssetRequest, token: string) {
  try {
    const requestInit: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,
      },
      body: JSON.stringify(asset),
    };
    
    const res = await fetch(`${HANDLE_ASSET_URL}`, requestInit);
    const data = await res.json();
    return res.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// Update updateAsset function
export async function updateAsset(
  id: string,
  asset: AssetRequest,
  token: string
) {
  try {
    const requestInit: RequestInit = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,
      },
      body: JSON.stringify(asset),
    };
    
    const res = await fetch(`${HANDLE_ASSET_URL}/${id}`, requestInit);
    const data = await res.json();
    return res.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function deleteAsset(id: string, token: string) {
  try {
    const requestInit: RequestInit = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,
      },
    };
    const res = await fetch(`${HANDLE_ASSET_URL}/${id}`, requestInit);
    const data = await res.json();
    console.log(data);
    return res.ok;
  } catch (error) {
    console.log(error);
    return false;
  }
}
