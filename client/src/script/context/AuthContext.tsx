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
  isAdmin: boolean | null;
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
        setIsAdmin(payload.isAdmin);                   // Lưu role
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
      const data = await response.json();
      if (response.ok) {
        setAccessToken(data.accessToken);
        setEmail(data.email);
        setIsAdmin(data.isAdmin);
        set_id(data.userid);
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
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });
      const data = await response.json();
      if (response.ok) {
        setAccessToken(data.accessToken);
        setEmail(data.email);
        setIsAdmin(data.isAdmin);
        set_id(data.userid);
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
      setIsAdmin(null);  // Xóa role khi logout
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
        if (token) {
          const isExpired = checkTokenExpiration(token);
          if (isExpired) {
            token = await refreshAccessToken();
          }
          if (token) {
            try {
              const {
                email: emailToken,
                isAdmin: adminToken,
                id,
              } = getPayload(token);
              set_id(id);
              setEmail(emailToken);
              setIsAdmin(adminToken);
              return;
            } catch (decodeError) {
              console.error("Failed to decode token:", decodeError);
              set_id(null);
              setEmail(null);
              setIsAdmin(null);
            }
          }
          set_id(null);
          setEmail(null);
          setIsAdmin(null);
          return;
        }
        set_id(null);
        setEmail(null);
        setIsAdmin(null);
        return;
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        set_id(null);
        setEmail(null);
        setIsAdmin(null);
      }
      finally {
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
        isAdmin,
        _id: _id,
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
