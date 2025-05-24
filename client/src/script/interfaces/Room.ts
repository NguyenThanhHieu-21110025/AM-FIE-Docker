import { getUserById, User } from "./User";
import { formatPrice } from "../utils/formatPrice";

export interface Room {
  _id: string;
  fullName: string;
  name: string;
  building: string;
  assets: string[];
  responsible_user: string | {
    _id: string;
    name: string;
    userid?: string;
  };
  __v: string;
  responsible_user_name: string;
  note: string;
  
  // Thông tin kế toán
  accountingRecords?: {
    quantity: number;
    originalValue: number;
    currentValue: number;
    originalValue_formatted?: string;
    currentValue_formatted?: string;
  };
  
  // Thông tin kiểm kê thực tế
  physicalCount?: {
    quantity: number;
    originalValue: number;
    currentValue: number;
    originalValue_formatted?: string;
    currentValue_formatted?: string;
  };
  
  // Thông tin chênh lệch
  discrepancy?: {
    quantity: number;
    originalValue: number;
    currentValue: number;
    originalValue_formatted?: string;
    currentValue_formatted?: string;
  };
  
  // Lý do
  reason?: {
    lost: string;
    disposed: string;
  };
}

export type RoomRequest = Omit<Room, "responsible_user_name">;

const HANDLE_ROOM_URL = import.meta.env.VITE_API_URL + "/room";

export async function getRoomList(token: string, userList: User[]) {
  const res = await fetch(`${HANDLE_ROOM_URL}`, {
    headers: { token: `Bearer ${token}` },
  });
  const data: Room[] = await res.json();
  
  data.forEach((room) => {
    // Handle both populated and non-populated responsible_user
    if (typeof room.responsible_user === 'object' && room.responsible_user !== null) {
      // If it's already an object (populated by MongoDB)
      room.responsible_user_name = room.responsible_user.name || "N/A";
    } else {
      // If it's just an ID string
      room.responsible_user_name =
        userList.find((user) => user._id === room.responsible_user)?.name ||
        "N/A";
    }
    
    // Format price values for accountingRecords
    if (room.accountingRecords) {
      room.accountingRecords.originalValue_formatted = formatPrice(room.accountingRecords.originalValue || 0);
      room.accountingRecords.currentValue_formatted = formatPrice(room.accountingRecords.currentValue || 0);
    }
    
    // Format price values for physicalCount
    if (room.physicalCount) {
      room.physicalCount.originalValue_formatted = formatPrice(room.physicalCount.originalValue || 0);
      room.physicalCount.currentValue_formatted = formatPrice(room.physicalCount.currentValue || 0);
    }
    
    // Format price values for discrepancy
    if (room.discrepancy) {
      room.discrepancy.originalValue_formatted = formatPrice(room.discrepancy.originalValue || 0);
      room.discrepancy.currentValue_formatted = formatPrice(room.discrepancy.currentValue || 0);
    }
  });
  
  return data;
}

export async function getRoomById(id: string, token: string) {
  const res = await fetch(`${HANDLE_ROOM_URL}/${id}`, {
    headers: { token: `Bearer ${token}` },
  });
  const data: Room = await res.json();
  
  // Handle both populated and non-populated responsible_user
  if (typeof data.responsible_user === 'object' && data.responsible_user !== null) {
    // If it's already an object (populated by MongoDB)
    data.responsible_user_name = data.responsible_user.name || "N/A";
  } else {
    // If it's just an ID string
    const responsible_user = await getUserById(data.responsible_user, token);
    data.responsible_user_name = responsible_user.name;
  }
  
  // Format price values for accountingRecords
  if (data.accountingRecords) {
    data.accountingRecords.originalValue_formatted = formatPrice(data.accountingRecords.originalValue || 0);
    data.accountingRecords.currentValue_formatted = formatPrice(data.accountingRecords.currentValue || 0);
  }
  
  // Format price values for physicalCount
  if (data.physicalCount) {
    data.physicalCount.originalValue_formatted = formatPrice(data.physicalCount.originalValue || 0);
    data.physicalCount.currentValue_formatted = formatPrice(data.physicalCount.currentValue || 0);
  }
  
  // Format price values for discrepancy
  if (data.discrepancy) {
    data.discrepancy.originalValue_formatted = formatPrice(data.discrepancy.originalValue || 0);
    data.discrepancy.currentValue_formatted = formatPrice(data.discrepancy.currentValue || 0);
  }
  
  return data;
}

export async function createRoom(room: RoomRequest, token: string) {
  try {
    const requestInit: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,
      },
      body: JSON.stringify(room),
    };    const res = await fetch(`${HANDLE_ROOM_URL}`, requestInit);
    // Check if the request was successful
    return res.ok;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function updateRoom(
  id: string,
  room: RoomRequest,
  token: string
) {
  try {
    const requestInit: RequestInit = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${token}`,
      },
      body: JSON.stringify(room),
    };

    const res = await fetch(`${HANDLE_ROOM_URL}/${id}`, requestInit);
    const data = await res.json();
    return res.ok;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function deleteRoom(id: string, token: string) {
  const requestInit: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      token: `Bearer ${token}`,
    },
  };
  const res = await fetch(`${HANDLE_ROOM_URL}/${id}`, requestInit);
  const data = await res.json();
  return data;
}