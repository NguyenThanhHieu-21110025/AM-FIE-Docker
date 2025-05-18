import { jwtDecode } from "jwt-decode";

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const checkTokenExpiration = (token: string): boolean => {
  const { exp } = jwtDecode<TokenPayload>(token);
  if (Date.now() >= exp * 1000) {
    return true;
  }
  return false;
};

export const getPayload = (token: string): TokenPayload => {
  const rawPayload = jwtDecode<any>(token); // Decode as any to inspect actual structure
  
  // Create a properly structured payload with fallbacks
  // Check for role in various possible fields based on server implementation
  const roleValue = rawPayload.role || 
                   rawPayload.userType || 
                   rawPayload.type || 
                   (rawPayload.isAdmin === true ? "admin" : null) ||
                   "";

  const payload: TokenPayload = {
    id: rawPayload.id || rawPayload.userId || rawPayload._id || rawPayload.sub || "",
    email: rawPayload.email || "",
    role: roleValue,
    iat: rawPayload.iat || 0,
    exp: rawPayload.exp || 0
  };
  
  // If we found a valid role, store it in localStorage for persistence
  if (payload.role) {
    localStorage.setItem("userRole", payload.role);
  }
  
  return payload;
};
