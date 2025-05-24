import "../../../css/DashboardPage.css";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useUserList, useRoomList, useAssetList } from "../../hooks/useAsset";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";
import Table from "../../components/Table";
import Loader from "../../components/Loader";
import Modal from "../../components/Modal";
import { assetTableColumns } from "../../utils/tableColumns";

const AssetDashboardPage = () => {
  // Refs
  const mainRef = useMainRef();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Page state
  const [pageTitle, setPageTitle] = useState<string>("Danh Sách Tài Sản");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  // Hooks
  const { accessToken, refreshAccessToken } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  
  useScrollToMain();
  // Data fetching hooks
  const { data: userList, isLoading: isLoadingUser } = useUserList();
  const { data: roomList, isLoading: isLoadingRoom } = useRoomList(userList);
  const {
    data: assetList,
    isLoading: isLoadingAsset,
    refetch: refetchAssets,
  } = useAssetList(userList, roomList);
  
  // Parse URL query params to set room and title
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const roomId = searchParams.get('room');
    const roomName = searchParams.get('roomName');
    
    if (roomId) {
      setSelectedRoom(roomId);
    }
    
    if (roomName) {
      setPageTitle(`Danh Sách Tài Sản Phòng ${roomName}`);
    } else {
      setPageTitle("Danh Sách Tài Sản");
    }
  }, [location.search]);
  
  // Update title when rooms are selected from the room selection modal
  useEffect(() => {
    // Skip if selection came from URL query parameters
    if (location.search.includes('room=')) return;
    
    if (!selectedRoom || selectedRoom === "") {
      setPageTitle("Danh Sách Tài Sản");
      return;
    }
    
    const selectedRoomIds = selectedRoom.split(',');
    
    // Only update title if rooms were selected from the modal (multiple rooms)
    if (selectedRoomIds.length > 0 && roomList) {
      const roomNames = selectedRoomIds
        .map(id => roomList.find(room => room._id === id)?.fullName || roomList.find(room => room._id === id)?.name)
        .filter(Boolean);
      
      if (roomNames.length > 0) {
        setPageTitle(`Danh Sách Tài Sản Phòng ${roomNames.join(', ')}`);
      } else {
        setPageTitle("Danh Sách Tài Sản");
      }
    }
  }, [selectedRoom, roomList, location.search]);  /**
   * Handle file selection for import
   * Only accept Excel files (.xls, .xlsx)
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExcelTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      if (
        validExcelTypes.includes(file.type) ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
      ) {
        setImportFile(file);
        setImportResult(null); // Clear previous import results
      } else {
        showToast("Chỉ chấp nhận file Excel (.xls, .xlsx)", "error");
        e.target.value = "";
      }
    }
  };

  /**
   * Handle import action
   * Upload Excel file to server and process the data
   */
  const handleImport = async () => {
    if (!importFile) {
      showToast("Vui lòng chọn file Excel", "error");
      return;
    }

    try {
      setIsImporting(true);

      // Get fresh token if needed
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Không thể xác thực người dùng");
        }
      }

      // Create FormData to send file
      const formData = new FormData();
      formData.append("file", importFile);

      // Call import API
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/import/import`,
        {
          method: "POST",
          headers: {
            token: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Import thất bại");
      } 
      
      // Show success message
      setImportResult({
        success: true,
        message: data.message || "Import thành công!",
      });
      showToast(data.message || "Import thành công!", "success");

      // Close modal and reset form
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        // Reload asset list
        refetchAssets();
      }, 1500);
    } catch (error) {
      console.error("Import failed:", error);
      let errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";

      // Extract more detailed error message from API response
      if (error instanceof Error && error.message.includes("fetch")) {
        errorMsg =
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
      }

      setImportResult({ success: false, message: errorMsg });
      showToast(`Import thất bại: ${errorMsg}`, "error");
    } finally {
      setIsImporting(false);
    }
  };
  /**
   * Filter assets based on selected room
   */
  const filteredAssets = assetList?.filter((asset) => {
    if (!selectedRoom) return true; // Show all assets when no room is selected

    const selectedRoomIds = selectedRoom ? selectedRoom.split(",") : [];

    // Handle both object and string location types
    const locationId =
      typeof asset.location === "object"
        ? asset.location?._id ?? ""
        : asset.location ?? "";

    // Show asset if its location matches any selected room
    return selectedRoomIds.includes(locationId);
  });

  // Determine if we're in a loading state
  const isLoading =
    isLoadingAsset ||
    isLoadingRoom ||
    isLoadingUser ||
    typeof assetList === "undefined";

  /**
   * Reset the import modal state
   */
  const resetImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <main className="dashboard-page" ref={mainRef}>
      <div className="dashboard-header">
        <div className="title-section">
          <h1 className="title">{pageTitle}</h1>
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
          showImportButton={true}
          onImportClick={() => setShowImportModal(true)}
          exportEndpoint="/export/export"
        />
      )}
      
      {/* Import Excel Modal */}
      {showImportModal && (
        <Modal
          title="Import dữ liệu từ Excel"
          onClose={resetImportModal}
        >
          <div className="import-modal-content">
            <div className="import-instructions">
              <p>
                <strong>Hướng dẫn import dữ liệu:</strong>
              </p>
              <ol>
                <li>Chọn file Excel (.xls, .xlsx) chứa dữ liệu tài sản</li>
                <li>Tên mỗi sheet phải trùng với tên phòng trong hệ thống</li>
                <li>
                  File Excel cần có các cột theo thứ tự: STT, Mã tài sản, Tên
                  tài sản, Thông số kỹ thuật, v.v.
                </li>
              </ol>
            </div>
            
            <div className="file-input-container">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="file-input"
                disabled={isImporting}
              />
              <div className="selected-file">
                {importFile ? (
                  <>
                    <strong>{importFile.name}</strong>
                    <span className="file-size">
                      ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </>
                ) : (
                  "Chưa chọn file nào"
                )}
              </div>
            </div>
            
            {importResult && (
              <div
                className={`import-result ${
                  importResult.success ? "success" : "error"
                }`}
              >
                <strong>{importResult.success ? "Thành công!" : "Lỗi!"}</strong>
                {importResult.message}
              </div>
            )}
            
            <div className="import-actions">
              <button
                className="cancel-btn"
                onClick={resetImportModal}
                disabled={isImporting}
              >
                Hủy
              </button>
              <button
                className="import-submit-btn"
                onClick={handleImport}
                disabled={!importFile || isImporting}
              >
                {isImporting ? (
                  <span className="loading-text">
                    <span className="loading-dots"></span>
                    Đang import...
                  </span>
                ) : (
                  "Import"
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
};

export default AssetDashboardPage;
