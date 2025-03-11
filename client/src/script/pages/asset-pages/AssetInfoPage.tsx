import "../../../css/InfoPage.css";
import { ReactNode, useEffect, useState } from "react";
import {
  Asset,
  AssetRequest,
  deleteAsset,
  getAssetById,
  updateAsset,
} from "../../interfaces/Asset";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getUserList, User } from "../../interfaces/User";
import { Address, getAddressList } from "../../interfaces/Room";
import { useQuery } from "@tanstack/react-query";
import { FaAngleLeft } from "react-icons/fa";
import Loader from "../../components/Loader";
import { convertToNumber, formatPrice } from "../../utils/formatPrice";

const AssetInfoPage = () => {
  const [formData, setFormData] = useState<Asset>({} as Asset);
  const [mode, setMode] = useState<"info" | "update">("info");
  const { refreshAccessToken, accessToken } = useAuth();
  const id = location.pathname.split("/").pop() as string;
  const ICON_SIZE = 20;

  const navigate = useNavigate();
  const mainRef = useMainRef();
  useScrollToMain();

  const { data, isLoading: isLoadingAsset } = useQuery<Asset>({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      return getAssetById(id, token);
    },
    queryKey: ["asset", id],
  });

  const { data: userList, isLoading: isLoadingUserList } = useQuery({
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

  const { data: addressList, isLoading: isLoadingAddressList } = useQuery({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      return getAddressList(token, userList as User[]);
    },
    queryKey: ["addressList", userList],
    enabled: !!userList && userList.length > 0,
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  // Calculate remaining value whenever depreciation rate or origin price changes
  useEffect(() => {
    if (mode === "update") {
      const originPrice = formData.accounting?.origin_price || 0;
      const depreciationRate = formData.depreciation_rate || 0;
      const remainingValue = originPrice * (1 - depreciationRate / 100);

      setFormData((prev) => ({
        ...prev,
        remaining_value: remainingValue,
        remaining_value_formatted: formatPrice(remainingValue),
      }));
    }
  }, [formData.depreciation_rate, formData.accounting?.origin_price, mode]);

  const getLocationId = (location: any): string => {
    if (typeof location === "object" && location !== null) {
      return location._id || "";
    }
    return location || "";
  };

  const getUserId = (user: any): string => {
    if (typeof user === "object" && user !== null) {
      return user._id || "";
    }
    return user || "";
  };

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    // Handle price inputs
    if (e.target.className.includes("input-price")) {
      const numericPrice = convertToNumber(value);

      switch (name) {
        case "unit_price":
          setFormData((prev) => ({
            ...prev,
            accounting: {
              ...prev.accounting,
              unit_price: numericPrice,
              origin_price: numericPrice * (prev.accounting?.quantity || 0),
            },
            unit_price_formatted: formatPrice(numericPrice),
            origin_price_formatted: formatPrice(
              numericPrice * (prev.accounting?.quantity || 0)
            ),
          }));
          break;

        case "remaining_value":
          setFormData((prev) => ({
            ...prev,
            remaining_value: numericPrice,
            remaining_value_formatted: formatPrice(numericPrice),
          }));
          break;
      }
      return;
    }

    // Handle quantity inputs
    if (name === "quantity") {
      const quantity = Number(value);
      const realCount = formData.quantity_differential?.real_count || 0;

      // Calculate surplus/missing quantities
      let surplusQuantity = 0;
      let missingQuantity = 0;

      if (realCount > quantity) {
        surplusQuantity = realCount - quantity;
      } else if (quantity > realCount) {
        missingQuantity = quantity - realCount;
      }

      setFormData((prev) => ({
        ...prev,
        accounting: {
          ...prev.accounting,
          quantity,
          origin_price: (prev.accounting?.unit_price || 0) * quantity,
        },
        quantity_differential: {
          ...prev.quantity_differential,
          real_count: realCount,
          surplus_quantity: surplusQuantity,
          missing_quantity: missingQuantity,
        },
        origin_price_formatted: formatPrice(
          (prev.accounting?.unit_price || 0) * quantity
        ),
      }));
      return;
    }

    if (name === "real_count") {
      const real_count = Number(value);
      const quantity = formData.accounting?.quantity || 0;

      let surplusQuantity = 0;
      let missingQuantity = 0;

      if (real_count > quantity) {
        surplusQuantity = real_count - quantity;
        missingQuantity = 0;
      } else if (quantity > real_count) {
        surplusQuantity = 0;
        missingQuantity = quantity - real_count;
      }

      setFormData((prev) => ({
        ...prev,
        quantity_differential: {
          ...prev.quantity_differential,
          real_count,
          surplus_quantity: surplusQuantity,
          missing_quantity: missingQuantity,
        },
      }));
      return;
    }

    // Handle depreciation rate input
    if (name === "depreciation_rate") {
      const rate = Math.min(Math.max(parseFloat(value) || 0, 0), 100);
      setFormData((prev) => ({
        ...prev,
        depreciation_rate: rate,
      }));
      return;
    }

    // Handle all other inputs
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;

    if (name === "responsible_user") {
      if (typeof userList === "undefined") return;
      const { name, _id } = userList.find(
        (user) => user._id === e.target.value
      ) as User;
      setFormData((prevState) => ({
        ...prevState,
        responsible_user: _id,
        responsible_user_name: name,
      }));
    } else if (name === "location") {
      if (typeof addressList === "undefined") return;
      const { room_id, _id } = addressList.find(
        (address) => address._id === e.target.value
      ) as Address;
      setFormData((prevState) => ({
        ...prevState,
        location: _id,
        location_code: room_id,
      }));
    } else if (name === "acquisition_source") {
      setFormData((prev) => ({
        ...prev,
        acquisition_source: value as "Lẻ" | "DA",
      }));
    }
  }

  async function handleSubmit(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
  
    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
  
      // Remove formatted and computed fields that we don't want to send to the server
      const {
        _id,
        __v,
        unit_price_formatted,
        origin_price_formatted,
        remaining_value_formatted,
        responsible_user_name,
        responsible_user_userid,
        location_code,
        history,
        ...filteredData
      } = formData;
  
      // Validate required fields
      if (!filteredData.asset_name) {
        alert("Vui lòng nhập tên tài sản");
        return;
      }
  
      if (
        !filteredData.accounting?.quantity ||
        filteredData.accounting?.quantity <= 0
      ) {
        alert("Vui lòng nhập số lượng hợp lệ");
        return;
      }
  
      if (
        !filteredData.accounting?.unit_price ||
        filteredData.accounting?.unit_price <= 0
      ) {
        alert("Vui lòng nhập đơn giá hợp lệ");
        return;
      }
  
      // Đảm bảo origin_price luôn được tính chính xác
      filteredData.accounting.origin_price =
        filteredData.accounting.quantity * filteredData.accounting.unit_price;
  
      // Đảm bảo location và responsible_user là string ID
      const assetRequest: AssetRequest = {
        ...filteredData,
        location: getLocationId(filteredData.location),
        responsible_user: getUserId(filteredData.responsible_user),
      };
  
      console.log("Sending update data:", assetRequest);
  
      // Gọi API để cập nhật tài sản
      const success = await updateAsset(id, assetRequest, token);
  
      if (success) {
        alert("Cập nhật tài sản thành công");
        setMode("info");
        
        // Tải lại trang để hiển thị dữ liệu mới
        window.location.reload();
      } else {
        alert("Không thể cập nhật tài sản. Vui lòng thử lại!");
      }
    } catch (error: any) {
      console.error("Error updating asset:", error);
  
      // Hiển thị chi tiết lỗi nếu có
      if (error.response?.data) {
        console.error("Server error details:", error.response.data);
        alert(`Lỗi: ${error.response.data.message || error.message}`);
      } else {
        alert("Đã xảy ra lỗi khi cập nhật tài sản");
      }
    }
  }

  async function handleDelete(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    if (!confirm("Bạn có chắc chắn muốn xóa tài sản này không?")) {
      return;
    }

    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      const result = await deleteAsset(id, token);
      if (result) {
        alert("Xóa tài sản thành công");
        navigate("/asset-dashboard");
      } else {
        alert("Không thể xóa tài sản. Vui lòng thử lại!");
      }
    } catch (error) {
      console.error("Error deleting asset:", error);
      alert("Đã xảy ra lỗi khi xóa tài sản");
    }
  }

  const UpdateMode = (): ReactNode => {
    return (
      <form className="info-body">
        {/* Row 1: Tên tài sản và mã tài sản trên cùng một hàng */}
        <div className="two-column-row">
          <div className="column">
            <div className="info-container">
              <div className="info-header">
                Tên tài sản: <span className="required">*</span>
              </div>
              <input
                type="text"
                name="asset_name"
                value={formData.asset_name || ""}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="column">
            <div className="info-container">
              <div className="info-header">Mã tài sản: </div>
              <input
                type="text"
                name="asset_code"
                value={formData.asset_code || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Quy cách chiếm 2/3 và năm sử dụng chiếm 1/3 */}
        <div className="two-column-row uneven">
          <div className="column wide">
            <div className="info-container">
              <div className="info-header">Quy cách, đặc điểm tài sản: </div>
              <textarea
                name="specifications"
                value={formData.specifications || ""}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="column narrow">
            <div className="info-container">
              <div className="info-header">
                Năm sử dụng: <span className="required">*</span>
              </div>
              <input
                type="number"
                name="year_of_use"
                value={formData.year_of_use || ""}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        {/* ACCOUNTING SECTION - with clear heading and visual distinction */}
        <div className="section-divider">
          <h3 className="section-title">Theo sổ kế toán</h3>
        </div>

        <div className="normal-info accounting-section">
          {/* Accounting Quantity */}
          <div className="info-container">
            <div className="info-header">
              Số lượng: <span className="required">*</span>
            </div>
            <input
              type="number"
              name="quantity"
              value={formData.accounting?.quantity || 0}
              onChange={handleChange}
              required
              min="0"
            />
          </div>

          {/* Unit Price */}
          <div className="info-container">
            <div className="info-header">
              Đơn giá (VNĐ): <span className="required">*</span>
            </div>
            <input
              type="text"
              name="unit_price"
              className="input-price"
              value={
                formData.unit_price_formatted ||
                formatPrice(formData.accounting?.unit_price || 0)
              }
              onChange={handleChange}
              required
            />
          </div>

          {/* Origin Price */}
          <div className="info-container">
            <div className="info-header">Nguyên giá (VNĐ):</div>
            <input
              type="text"
              name="origin_price"
              className="input-price"
              value={
                formData.origin_price_formatted ||
                formatPrice(formData.accounting?.origin_price || 0)
              }
              disabled
            />
          </div>
        </div>

        {/* DIFFERENTIAL SECTION - with clear heading and visual distinction */}
        <div className="section-divider">
          <h3 className="section-title">Chênh lệch</h3>
        </div>

        <div className="normal-info differential-section">
          {/* Actual Count */}
          <div className="info-container">
            <div className="info-header">KK thực tế:</div>
            <input
              type="number"
              name="real_count"
              value={formData.quantity_differential?.real_count || 0}
              onChange={handleChange}
              min="0"
            />
          </div>

          {/* Surplus Quantity */}
          <div className="info-container">
            <div className="info-header">SL thừa:</div>
            <input
              type="number"
              name="surplus_quantity"
              value={formData.quantity_differential?.surplus_quantity || 0}
              disabled
            />
          </div>

          {/* Missing Quantity */}
          <div className="info-container">
            <div className="info-header">SL thiếu:</div>
            <input
              type="number"
              name="missing_quantity"
              value={formData.quantity_differential?.missing_quantity || 0}
              disabled
            />
          </div>
        </div>

        {/* DEPRECIATION SECTION */}
        <div className="section-divider">
          <h3 className="section-title">Khấu hao</h3>
        </div>

        <div className="normal-info depreciation-section">
          {/* Depreciation Rate */}
          <div className="info-container">
            <div className="info-header">Tỷ lệ hao mòn (%):</div>
            <input
              type="number"
              name="depreciation_rate"
              value={formData.depreciation_rate || 0}
              onChange={handleChange}
              min="0"
              max="100"
            />
          </div>

          {/* Remaining Value */}
          <div className="info-container">
            <div className="info-header">Giá trị còn lại (VNĐ):</div>
            <input
              type="text"
              name="remaining_value"
              className="input-price"
              value={
                formData.remaining_value_formatted ||
                formatPrice(formData.remaining_value || 0)
              }
              disabled
            />
          </div>

          {/* Asset Status */}
          <div className="info-container">
            <div className="info-header">Đề nghị thanh lý:</div>
            <input
              type="text"
              name="suggested_disposal"
              value={formData.suggested_disposal || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* OTHER INFORMATION SECTION */}
        <div className="section-divider">
          <h3 className="section-title">Thông tin khác</h3>
        </div>

        <div className="normal-info">
          {/* Acquisition Source */}
          <div className="info-container">
            <div className="info-header">
              Nguồn hình thành: <span className="required">*</span>
            </div>
            <select
              name="acquisition_source"
              onChange={handleSelect}
              value={formData.acquisition_source || "Lẻ"}
              required
            >
              <option value="Lẻ">Lẻ</option>
              <option value="DA">Dự án</option>
            </select>
          </div>

          {/* Location */}
          <div className="info-container">
            <div className="info-header">Địa chỉ phòng: </div>
            <select
              name="location"
              onChange={handleSelect}
              value={getLocationId(formData.location)}
            >
              <option value="">Chọn địa chỉ phòng</option>
              {addressList?.map((address) => (
                <option key={address._id} value={address._id}>
                  {address.room_id} - {address.name}
                </option>
              ))}
            </select>
          </div>

          {/* Responsible User */}
          <div className="info-container">
            <div className="info-header">Người chịu trách nhiệm: </div>
            <select
              name="responsible_user"
              onChange={handleSelect}
              value={getUserId(formData.responsible_user)}
            >
              <option value="">Chọn người chịu trách nhiệm</option>
              {userList?.map((user) => (
                <option key={user._id} value={user._id}>
                  {`${user.name} - ${user.userid || ""}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="long-info">
          <div className="info-header">Ghi chú: </div>
          <textarea
            name="note"
            value={formData.note || ""}
            onChange={handleChange}
          />
        </div>

        <div className="button-container">
          <button className="submit-btn" onClick={handleSubmit}>
            Lưu thông tin
          </button>
          <button className="cancel-btn" onClick={() => setMode("info")}>
            Hủy cập nhật
          </button>
        </div>
      </form>
    );
  };

  const InfoMode = (): ReactNode => {
    return (
      <div className="info-body">
        {/* Row 1: Tên tài sản và mã tài sản trên cùng một hàng */}
        <div className="two-column-row">
          <div className="column">
            <div className="info-container">
              <div className="info-header">Tên tài sản:</div>
              <p>{formData.asset_name || "Chưa có thông tin"}</p>
            </div>
          </div>
          <div className="column">
            <div className="info-container">
              <div className="info-header">Mã tài sản:</div>
              <p>{formData.asset_code || "Chưa có thông tin"}</p>
            </div>
          </div>
        </div>

        {/* Row 2: Quy cách chiếm 2/3 và năm sử dụng chiếm 1/3 */}
        <div className="two-column-row uneven">
          <div className="column wide">
            <div className="info-container">
              <div className="info-header">Quy cách, đặc điểm tài sản:</div>
              <p>{formData.specifications || "Không có"}</p>
            </div>
          </div>
          <div className="column narrow">
            <div className="info-container">
              <div className="info-header">Năm sử dụng:</div>
              <p>{formData.year_of_use}</p>
            </div>
          </div>
        </div>

        {/* ACCOUNTING SECTION */}
        <div className="section-divider">
          <h3 className="section-title">Theo sổ kế toán</h3>
        </div>

        <div className="normal-info accounting-section">
          <div className="info-container">
            <div className="info-header">Số lượng:</div>
            <p>{formData.accounting?.quantity || 0}</p>
          </div>
          <div className="info-container">
            <div className="info-header">Đơn giá (VNĐ):</div>
            <p>
              {formData.unit_price_formatted ||
                formatPrice(formData.accounting?.unit_price || 0)}
            </p>
          </div>
          <div className="info-container">
            <div className="info-header">Nguyên giá (VNĐ):</div>
            <p>
              {formData.origin_price_formatted ||
                formatPrice(formData.accounting?.origin_price || 0)}
            </p>
          </div>
        </div>

        {/* DIFFERENTIAL SECTION */}
        <div className="section-divider">
          <h3 className="section-title">Chênh lệch</h3>
        </div>

        <div className="normal-info differential-section">
          <div className="info-container">
            <div className="info-header">KK thực tế:</div>
            <p>{formData.quantity_differential?.real_count || 0}</p>
          </div>
          <div className="info-container">
            <div className="info-header">SL thừa:</div>
            <p>{formData.quantity_differential?.surplus_quantity || 0}</p>
          </div>
          <div className="info-container">
            <div className="info-header">SL thiếu:</div>
            <p>{formData.quantity_differential?.missing_quantity || 0}</p>
          </div>
        </div>

        {/* DEPRECIATION SECTION */}
        <div className="section-divider">
          <h3 className="section-title">Khấu hao</h3>
        </div>

        <div className="normal-info depreciation-section">
          <div className="info-container">
            <div className="info-header">Tỷ lệ hao mòn (%):</div>
            <p>{formData.depreciation_rate || 0}</p>
          </div>
          <div className="info-container">
            <div className="info-header">Giá trị còn lại (VNĐ):</div>
            <p>
              {formData.remaining_value_formatted ||
                formatPrice(formData.remaining_value || 0)}
            </p>
          </div>
          <div className="info-container">
            <div className="info-header">Đề nghị thanh lý:</div>
            <p>{formData.suggested_disposal || "Không có"}</p>
          </div>
        </div>

        {/* OTHER INFORMATION SECTION */}
        <div className="section-divider">
          <h3 className="section-title">Thông tin khác</h3>
        </div>

        <div className="normal-info">
          <div className="info-container">
            <div className="info-header">Nguồn hình thành:</div>
            <p>{formData.acquisition_source || "Không có thông tin"}</p>
          </div>
          <div className="info-container">
            <div className="info-header">Địa chỉ phòng:</div>
            <p>{formData.location_code || "Không có"}</p>
          </div>
          <div className="info-container">
            <div className="info-header">Người chịu trách nhiệm:</div>
            <p>
              {formData.responsible_user_name
                ? `${formData.responsible_user_name} - ${
                    userList?.find(
                      (user) => user._id === formData.responsible_user
                    )?.userid || ""
                  }`
                : "Không có"}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="long-info">
          <div className="info-header">Ghi chú:</div>
          <p>{formData.note || "Không có"}</p>
        </div>

        <div className="button-container">
          <button className="update-btn" onClick={() => setMode("update")}>
            Cập nhật thông tin
          </button>
          <button className="delete-btn" onClick={handleDelete}>
            Xóa tài sản
          </button>
        </div>
      </div>
    );
  };

  return (
    <main ref={mainRef} className="info-page">
      <div className="container">
        <div className="layout">
          <div
            className="back-button"
            onClick={() => navigate("/asset-dashboard")}
          >
            <FaAngleLeft size={ICON_SIZE} />
            <p>Trở về</p>
          </div>
          <h1 className="title">Thông tin tài sản</h1>
          {isLoadingUserList || isLoadingAddressList || isLoadingAsset ? (
            <Loader />
          ) : mode === "info" ? (
            InfoMode()
          ) : (
            UpdateMode()
          )}
        </div>
      </div>
    </main>
  );
};

export default AssetInfoPage;
