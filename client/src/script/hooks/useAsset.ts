import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getUserList, User } from "../interfaces/User";
import { Room, getRoomList } from "../interfaces/Room";
import { useToast } from "./useToast";
import { Asset, getAssetById, getAssetList } from "../interfaces/Asset";

/**
 * Custom hook để lấy danh sách người dùng
 */
export function useUserList() {
  const { refreshAccessToken, accessToken } = useAuth();
  const { showToast } = useToast();

  return useQuery({
    queryFn: async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            throw new Error("Unable to refresh access token");
          }
        }
        return getUserList(token);
      } catch (error) {
        showToast("Không thể tải danh sách người dùng", "error");
        throw error;
      }
    },
    queryKey: ["userList"],
  });
}

/**
 * Custom hook để lấy danh sách phòng
 * @param {User[] | undefined} userList - Danh sách người dùng
 */
export function useRoomList(userList: User[] | undefined) {
  const { refreshAccessToken, accessToken } = useAuth();
  const { showToast } = useToast();

  return useQuery({
    queryFn: async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            throw new Error("Unable to refresh access token");
          }
        }
        return getRoomList(token, userList as User[]);
      } catch (error) {
        showToast("Không thể tải danh sách phòng", "error");
        throw error;
      }
    },
    queryKey: ["roomList", userList],
    enabled: !!userList && userList.length > 0,
  });
}

/**
 * Custom hook để lấy danh sách tài sản
 * @param {User[] | undefined} userList - Danh sách người dùng
 * @param {Room[] | undefined} roomList - Danh sách phòng
 */
export function useAssetList(userList: User[] | undefined, roomList: Room[] | undefined) {
  const { refreshAccessToken, accessToken } = useAuth();
  const { showToast } = useToast();

  return useQuery({
    queryFn: async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            throw new Error("Unable to refresh access token");
          }
        }
        return getAssetList(token, userList as User[], roomList as Room[]);
      } catch (error) {
        showToast("Không thể tải danh sách tài sản", "error");
        throw error;
      }
    },
    queryKey: ["assetList", roomList],
    enabled: !!roomList && roomList.length > 0,
  });
}

/**
 * Custom hook để lấy chi tiết một tài sản theo ID
 * @param {string} id - ID của tài sản cần lấy thông tin
 */
export function useAssetDetail(id: string) {
  const { refreshAccessToken, accessToken } = useAuth();
  const { showToast } = useToast();

  return useQuery<Asset>({
    queryFn: async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            throw new Error("Unable to refresh access token");
          }
        }
        return getAssetById(id, token);
      } catch (error) {
        showToast("Không thể tải thông tin tài sản", "error");
        throw error;
      }
    },
    queryKey: ["asset", id],
  });
}

/**
 * Custom hook để lấy gợi ý tài sản
 */
export function useAssetSuggestions() {
  const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
  const { refreshAccessToken, accessToken } = useAuth();

  interface AssetSuggestion {
    name: string;
    code: string;
    _id?: string;
  }

  // Fetch asset dictionary from the server
  const { data: assetDictionary, isLoading } = useQuery({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) throw new Error("Unable to refresh access token");
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/asset/dictionary`, {
        headers: {
          token: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch asset dictionary");
      }
      
      return response.json();
    },
    queryKey: ["assetDictionary"],
    onError: (error) => {
      console.error("Error fetching asset dictionary:", error);
    }
  });

  useEffect(() => {
    if (assetDictionary?.data) {
      setSuggestions(assetDictionary.data);
    }
  }, [assetDictionary]);

  // Function to get filtered suggestions based on input and field
  const getFilteredSuggestions = (
    input: string, 
    field: 'name' | 'code' = 'name'
  ): AssetSuggestion[] => {
    if (!input || input.trim().length < 2) return [];
    
    const inputLower = input.toLowerCase();
    return suggestions.filter(asset => {
      if (field === 'name') {
        return asset.name.toLowerCase().includes(inputLower);
      } else {
        return asset.code.toLowerCase().includes(inputLower);
      }
    }).slice(0, 10); // Limit to 10 suggestions
  };

  return {
    getFilteredSuggestions,
    isLoading
  };
}
