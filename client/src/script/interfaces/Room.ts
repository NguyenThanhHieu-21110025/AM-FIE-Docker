import { getUserById, User } from "./User";

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
}

export type RoomRequest = Omit<Room, "responsible_user_name">;

const HANDLE_ROOM_URL = import.meta.env.VITE_API_URL + "/room";

export async function getRoomList(token: string, userList: User[]) {
  const res = await fetch(`${HANDLE_ROOM_URL}`, {
    headers: { token: `Bearer ${token}` },
  });
  const data: Room[] = await res.json();
  console.log("Room data from API:", data); // Let's see what's coming from the API
  
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
  
  console.log(data);
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
    };
    console.log(requestInit.body);

    const res = await fetch(`${HANDLE_ROOM_URL}`, requestInit);
    const data = await res.json();
    console.log(data);
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
    console.log(requestInit.body);

    const res = await fetch(`${HANDLE_ROOM_URL}/${id}`, requestInit);
    const data = await res.json();
    console.log(data);
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