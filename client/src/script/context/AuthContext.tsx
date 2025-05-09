/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
} from "react";
import { checkTokenExpiration, getPayload } from "../utils/jwt";

// Interface đầu vào
export interface LoginUser {
  email: string;
  password: string;
}

export interface RegisterUser {
  name: string;
  email: string;
  password: string;
}

// Interface context
interface AuthContextType {
  accessToken: string | null;
  _id: string | null;
  email: string | null;
  role: string | null;  // Thay 'admin' thành 'role'
  loading: boolean;
  login: (user: LoginUser) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (user: RegisterUser) => Promise<boolean>;
  refreshAccessToken: () => Promise<string | null>;
}

// Tạo context
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);  // Thay 'admin' thành 'role'
  const [_id, set_id] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const API_URL = import.meta.env.VITE_API_URL + "/auth";

  // Lấy access token mới từ refresh token (cookie)
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        credentials: "include",  // Đảm bảo cookie được gửi
      });

      const data = await res.json();
      if (res.ok && data.accessToken) {
        const { accessToken } = data;
        const payload = getPayload(accessToken);  // Giải mã token
        setAccessToken(accessToken);             // Lưu access token vào state
        setEmail(payload.email);                 // Lưu email
        setRole(payload.role);                   // Lưu role
        set_id(payload.id);                      // Lưu id người dùng
        localStorage.setItem("accessToken", accessToken); // Lưu vào localStorage
        return accessToken;
      }

      return null;  // Nếu không có accessToken hoặc lỗi
    } catch (err) {
      console.error("Refresh token failed:", err);
      return null;
    }
  }, []);

  // Đăng nhập
  const login = async (user: LoginUser): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (res.ok) {
        const { accessToken, email, role, userid } = data;  // Lấy role thay vì admin
        setAccessToken(accessToken);
        setEmail(email);
        setRole(role);  // Lưu role vào state
        set_id(userid);
        localStorage.setItem("accessToken", accessToken); // Lưu vào localStorage
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  };

  // Đăng ký
  const register = async (user: RegisterUser): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (res.ok) {
        const { accessToken, email, role, userid } = data;  // Lấy role thay vì admin
        setAccessToken(accessToken);
        setEmail(email);
        setRole(role);  // Lưu role vào state
        set_id(userid);
        localStorage.setItem("accessToken", accessToken); // Lưu vào localStorage
        return true;
      }
      return false;
    } catch (err) {
      console.error("Register failed:", err);
      return false;
    }
  };

  // Đăng xuất
  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setAccessToken(null);
      setEmail(null);
      setRole(null);  // Xóa role khi logout
      set_id(null);
      localStorage.removeItem("accessToken");  // Xóa token khỏi localStorage khi logout
    }
  };

  // Tự động kiểm tra và refresh token khi load trang
  useEffect(() => {
    const initialize = async () => {
      try {
        let token = localStorage.getItem("accessToken");  // Kiểm tra token trong localStorage
        if (!token) {
          token = await refreshAccessToken();
        }
        if (token && !checkTokenExpiration(token)) {
          const payload = getPayload(token);
          setAccessToken(token);
          setEmail(payload.email);
          setRole(payload.role);  // Lưu role từ token vào state
          set_id(payload.id);
        } else {
          await refreshAccessToken();
        }
      } catch (err) {
        console.error("Init auth failed:", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        _id,
        email,
        role,  // Cung cấp role thay vì admin
        loading,
        login,
        logout,
        register,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
