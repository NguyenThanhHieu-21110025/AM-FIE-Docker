import "../../../css/DashboardPage.css";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import Table from "../../components/Table";
import { assetTableColumns } from "../../utils/tableColumns";
import Loader from "../../components/Loader";
import { useState } from "react";
import { useUserList, useRoomList, useAssetList } from "../../hooks/useAsset";

/**
 * Trang Dashboard hiển thị danh sách tài sản
 */
const AssetDashboardPage = () => {
  const mainRef = useMainRef();
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  useScrollToMain();

  // Sử dụng custom hooks để lấy dữ liệu
  const { data: userList, isLoading: isLoadingUser } = useUserList();
  const { data: roomList, isLoading: isLoadingRoom } = useRoomList(userList);
  const { data: assetList, isLoading: isLoadingAsset } = useAssetList(userList, roomList);

  // Lọc tài sản theo phòng được chọn
  const filteredAssets = assetList?.filter(asset => {
    if (!selectedRoom) return true; // Hiển thị tất cả tài sản khi không có phòng nào được chọn
    
    const selectedRoomIds = selectedRoom ? selectedRoom.split(",") : [];
    
    // Xử lý cả kiểu đối tượng và chuỗi
    const locationId = typeof asset.location === 'object' 
      ? asset.location?._id ?? '' 
      : asset.location ?? '';
      
    // Hiển thị tài sản nếu vị trí của nó khớp với bất kỳ phòng nào được chọn
    return selectedRoomIds.includes(locationId);
  });

  const isLoading = isLoadingAsset || isLoadingRoom || isLoadingUser || typeof assetList === "undefined";

  return (
    <main className="dashboard-page" ref={mainRef}>
      <div className="dashboard-header">
        <div className="title-section">
          <h1 className="title">Danh Sách Tài Sản</h1>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <Table
          data={filteredAssets || assetList}
          columns={assetTableColumns}
          baseURL="/asset-dashboard"
          roomList={roomList}
          onRoomSelect={setSelectedRoom}
          showExportButton={true}
          exportEndpoint="/export/export"
        />
      )}
    </main>
  );
};

export default AssetDashboardPage;