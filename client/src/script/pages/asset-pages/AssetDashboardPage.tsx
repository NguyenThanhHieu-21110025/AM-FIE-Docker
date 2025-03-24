import "../../../css/DashboardPage.css";
import { getAssetList } from "../../interfaces/Asset";
import { useQuery } from "@tanstack/react-query";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import Table from "../../components/Table";
import { assetTableColumns } from "../../utils/tableColumns";
import Loader from "../../components/Loader";
import { useAuth } from "../../context/AuthContext";
import { getUserList, User } from "../../interfaces/User";
import { Room, getRoomList } from "../../interfaces/Room";
import { useState } from "react";


const AssetDashboardPage = () => {
  const mainRef = useMainRef();
  const { refreshAccessToken, accessToken } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  useScrollToMain();

  const { data: userList, isLoading: isLoadingUser } = useQuery({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      return getUserList(token);
    },
    queryKey: ["userList"],
  });

  const { data: roomList, isLoading: isLoadingRoom } = useQuery({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      return getRoomList(token, userList as User[]);
    },
    queryKey: ["roomList", userList],
    enabled: !!userList && userList.length > 0,
  });

  const { data: assetList, isLoading: isLoadingAsset } = useQuery({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      return getAssetList(token, userList as User[], roomList as Room[]);
    },
    queryKey: ["assetList", roomList],
    enabled: !!roomList && roomList.length > 0,
  });

  const filteredAssets = assetList?.filter(asset => {
    if (!selectedRoom) return true; // Show all assets when no room is selected
    
    const selectedRoomIds = selectedRoom ? selectedRoom.split(",") : [];
    
    // Handle both object and string types
    const locationId = typeof asset.location === 'object' 
      ? asset.location?._id ?? '' 
      : asset.location ?? '';
      
    // Show asset if its location matches any of the selected rooms
    return selectedRoomIds.includes(locationId);
  });

  return (
    <main className="dashboard-page" ref={mainRef}>
      <div className="dashboard-header">
        <div className="title">Danh Sách Tài Sản</div>
      </div>

      {isLoadingAsset ||
      isLoadingRoom ||
      isLoadingUser ||
      typeof assetList === "undefined" ? (
        <Loader />
      ) : (
        <Table
          data={filteredAssets || assetList}
          columns={assetTableColumns}
          baseURL="/asset-dashboard"
          roomList={roomList}
          onRoomSelect={setSelectedRoom}
        />
      )}
    </main>
  );
};

export default AssetDashboardPage;