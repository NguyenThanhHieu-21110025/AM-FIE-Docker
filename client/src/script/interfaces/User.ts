export type Status = "Đang hoạt động" | "Dừng hoạt động";

// Cập nhật enum Role để khớp với server
export type ServerRole = "user" | "powerUser" | "admin";
export type DisplayRole = "Người dùng" | "Người dùng nâng cao" | "Admin";

export interface User {
  _id: string;
  userid: string;
  name: string;
  email: string;
  phoneNumber: string;
  position: string;
  role: ServerRole; // Cập nhật type
  isActive: boolean;
  createdAt: string; 
  updatedAt: string; 

  // Trường status và displayRole tính toán từ isActive và role
  status?: Status; // Optional vì được tính toán từ isActive
  displayRole?: DisplayRole; // Optional vì được tính toán từ role
  __v: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  position?: string;
  role?: ServerRole; // Cập nhật type
}

export interface ApiResponse<T> {
  message: string;
  status: "success" | "error";
  data?: T;
  error?: string;
}

const HANDLE_USER_URL = import.meta.env.VITE_API_URL + "/user";

export async function getUserList(accessToken: string) {
  const res = await fetch(`${HANDLE_USER_URL}`, {
    headers: { token: `Bearer ${accessToken}` },
  });
  const data: User[] = await res.json();

  // Cập nhật cách mapping role và status
  data.forEach((item) => {
    item.status = item.isActive ? "Đang hoạt động" : "Dừng hoạt động";

    // Map role từ server sang hiển thị
    switch (item.role) {
      case "admin":
        item.displayRole = "Admin";
        break;
      case "powerUser":
        item.displayRole = "Người dùng nâng cao";
        break;
      default:
        item.displayRole = "Người dùng";
    }
  });

  return data;
}
export async function getUserById(id: string, accessToken: string) {
  const res = await fetch(`${HANDLE_USER_URL}/${id}`, {
    headers: { token: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as User;

  // Cập nhật thông tin hiển thị
  data.status = data.isActive ? "Đang hoạt động" : "Dừng hoạt động";

  // Map role từ server sang hiển thị
  switch (data.role) {
    case "admin":
      data.displayRole = "Admin";
      break;
    case "powerUser":
      data.displayRole = "Người dùng nâng cao";
      break;
    default:
      data.displayRole = "Người dùng";
  }

  return data;
}

export async function createUser(
  userData: CreateUserPayload,
  accessToken: string
): Promise<ApiResponse<User>> {
  try {
    // Nếu không chỉ định role, sử dụng default từ server
    const requestData = { ...userData };

    const response = await fetch(`${HANDLE_USER_URL}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Có lỗi xảy ra khi tạo tài khoản");
    }

    return data;
  } catch (error) {
    console.error("Create user error:", error);
    throw error;
  }
}

export async function updateUser(id: string, user: User, accessToken: string) {
  try {
    const requestInit: RequestInit = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(user),
    };
    const res = await fetch(`${HANDLE_USER_URL}/${id}`, requestInit);
    const data = await res.json();
    console.log(data);
    return res.ok;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
}

export async function deleteUser(
  id: string,
  accoundId: string,
  role: ServerRole,
  accessToken: string
) {
  try {
    const requestInit: RequestInit = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: accoundId, role: role }),
    };
    const res = await fetch(`${HANDLE_USER_URL}/${id}`, requestInit);
    const data = await res.json();
    console.log(data);
    return res.ok;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

export async function changeStatusUser(
  id: string,
  accoundId: string,
  role: ServerRole,
  accessToken: string
) {
  try {
    const requestInit: RequestInit = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: accoundId, role: role }),
    };
    const res = await fetch(`${HANDLE_USER_URL}/active/${id}`, requestInit);
    const data = await res.json();
    console.log(data);
    return res.ok;
  } catch (error) {
    console.error("Error changing status:", error);
    return false;
  }
}
