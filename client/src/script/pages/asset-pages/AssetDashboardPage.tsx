import "../../../css/DashboardPage.css";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import Table from "../../components/Table";
import { assetTableColumns } from "../../utils/tableColumns";
import Loader from "../../components/Loader";
import { useState, useRef } from "react";
import { useUserList, useRoomList, useAssetList } from "../../hooks/useAsset";
import Modal from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";

/**
 * Trang Dashboard hiển thị danh sách tài sản
 */
const AssetDashboardPage = () => {
  const mainRef = useMainRef();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const { accessToken, refreshAccessToken } = useAuth();
  const { showToast } = useToast();
  useScrollToMain();

  // Sử dụng custom hooks để lấy dữ liệu
  const { data: userList, isLoading: isLoadingUser } = useUserList();
  const { data: roomList, isLoading: isLoadingRoom } = useRoomList(userList);
  const {
    data: assetList,
    isLoading: isLoadingAsset,
    refetch: refetchAssets,
  } = useAssetList(userList, roomList);
  // Xử lý khi chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Chỉ chấp nhận file Excel
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

  // Xử lý khi ấn nút import
  const handleImport = async () => {
    if (!importFile) {
      showToast("Vui lòng chọn file Excel", "error");
      return;
    }

    try {
      setIsImporting(true);

      // Lấy token mới nếu cần
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Không thể xác thực người dùng");
        }
      }

      // Tạo FormData để gửi file
      const formData = new FormData();
      formData.append("file", importFile);

      // Gọi API import
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
      } // Hiển thị thông báo thành công với chi tiết
      setImportResult({
        success: true,
        message: data.message || "Import thành công!",
      });
      showToast(data.message || "Import thành công!", "success");

      // Đóng modal và reset form
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        // Reload lại danh sách tài sản
        refetchAssets();
      }, 1500);
    } catch (error) {
      console.error("Import failed:", error);
      let errorMsg =
        error instanceof Error ? error.message : "Lỗi không xác định";

      // Try to extract more detailed error message from API response
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

  // Lọc tài sản theo phòng được chọn
  const filteredAssets = assetList?.filter((asset) => {
    if (!selectedRoom) return true; // Hiển thị tất cả tài sản khi không có phòng nào được chọn

    const selectedRoomIds = selectedRoom ? selectedRoom.split(",") : [];

    // Xử lý cả kiểu đối tượng và chuỗi
    const locationId =
      typeof asset.location === "object"
        ? asset.location?._id ?? ""
        : asset.location ?? "";

    // Hiển thị tài sản nếu vị trí của nó khớp với bất kỳ phòng nào được chọn
    return selectedRoomIds.includes(locationId);
  });

  const isLoading =
    isLoadingAsset ||
    isLoadingRoom ||
    isLoadingUser ||
    typeof assetList === "undefined";

  return (
    <main className="dashboard-page" ref={mainRef}>
      {" "}
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
          showImportButton={true}
          onImportClick={() => setShowImportModal(true)}
          exportEndpoint="/export/export"
        />
      )}
      {/* Modal Import Excel */}
      {showImportModal && (
        <Modal
          title="Import dữ liệu từ Excel"
          onClose={() => {
            setShowImportModal(false);
            setImportFile(null);
            setImportResult(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
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
              />{" "}
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
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isImporting}
              >
                Hủy
              </button>{" "}
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
