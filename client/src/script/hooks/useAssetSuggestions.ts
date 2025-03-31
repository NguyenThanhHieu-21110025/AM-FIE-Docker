import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

interface AssetSuggestion {
  name: string;
  code: string;
  _id?: string;
}

export function useAssetSuggestions() {
  const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
  const { refreshAccessToken, accessToken } = useAuth();

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