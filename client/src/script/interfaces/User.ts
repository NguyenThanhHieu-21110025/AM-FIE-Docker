export type Status = "Đang hoạt động" | "Dừng hoạt động";
export type Role = "Người dùng" | "Admin";

export interface User {
  _id: string;
  userid: string;
  name: string;
  email: string;
  phoneNumber: string;
  position: string;
  admin: boolean;
  isActive: boolean;
  createAt: string;
  updateAt: string;
  status: Status;
  role: Role;
  __v: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  position?: string;
  admin?: boolean;
}

export interface ApiResponse<T> {
  message: string;
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

const HANDLE_USER_URL = import.meta.env.VITE_API_URL + "/user";

export async function getUserList(accessToken: string) {
  const res = await fetch(`${HANDLE_USER_URL}`, {
    headers: { token: `Bearer ${accessToken}` },
  });
  const data: User[] = await res.json();
  console.log(data);
  data.forEach((item) => {
    item.status = item.isActive ? "Đang hoạt động" : "Dừng hoạt động";
    item.role = item.admin ? "Admin" : "Người dùng";
  });

  return data;
}

export async function getUserById(id: string, accessToken: string) {
  const res = await fetch(`${HANDLE_USER_URL}/${id}`, {
    headers: { token: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as User;
  data.status = data.isActive ? "Đang hoạt động" : "Dừng hoạt động";
  data.role = data.admin ? "Admin" : "Người dùng";
  console.log(data);
  return data;
}

export async function createUser(userData: CreateUserPayload, accessToken: string): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`${HANDLE_USER_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': `Bearer ${accessToken}`
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Có lỗi xảy ra khi tạo tài khoản');
    }

    return data;
  } catch (error) {
    console.error('Create user error:', error);
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
  admin: boolean,
  accessToken: string
) {
  try {
    const requestInit: RequestInit = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: accoundId, admin: admin }),
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
  admin: boolean,
  accessToken: string
) {
  try {
    const requestInit: RequestInit = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: accoundId, admin: admin }),
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
