import "../../../css/assetPage/AssetInfo.css";
import { ReactNode, useEffect, useState } from "react";
import {
  Asset,
  AssetRequest,
  AssetType,
  deleteAsset,
  updateAsset,
} from "../../interfaces/Asset";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaAngleLeft,
  FaCheckCircle,
  FaPencilAlt,
  FaTrashAlt,
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaClipboardList,
  FaMoneyBillWave,
} from "react-icons/fa";
import Loader from "../../components/Loader";
import { convertToNumber, formatPrice } from "../../utils/formatPrice";
import { useToast } from "../../hooks/useToast";
import { useUserList, useRoomList, useAssetDetail } from "../../hooks/useAsset";
import {
  ASSET_TYPES,
  ASSET_FORM_SECTIONS,
  getAssetTypeInfo,
} from "../../constants/assetConstants";
import {
  calculateRemainingValue,
  calculateQuantityDifference,
  calculateOriginPrice,
} from "../../utils/assetCalculations";

const AssetInfoPage = () => {
  const [formData, setFormData] = useState<Asset>({} as Asset);
  const [mode, setMode] = useState<"info" | "update">("info");
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { accessToken } = useAuth();
  const location = useLocation();
  const id = location.pathname.split("/").pop() as string;
  const ICON_SIZE = 18;
  const { showToast } = useToast();

  const navigate = useNavigate();
  const mainRef = useMainRef();
  useScrollToMain();

  // Sử dụng các custom hooks thay vì gọi API trực tiếp
  const { data: assetData, isLoading: isLoadingAsset } = useAssetDetail(id);
  const { data: userList, isLoading: isLoadingUserList } = useUserList();
  const { data: roomList, isLoading: isLoadingRoomList } =
    useRoomList(userList);

  // Sử dụng hằng số từ assetConstants.ts thay vì định nghĩa trực tiếp
  const formSections = ASSET_FORM_SECTIONS.map((section) => ({
    ...section,
    icon:
      section.icon === "📋" ? (
        <FaInfoCircle />
      ) : section.icon === "💰" ? (
        <FaClipboardList />
      ) : (
        <FaMoneyBillWave />
      ),
  }));

  // Lấy thông tin về loại tài sản hiện tại từ hàm helper trong assetConstants
  const currentAssetType = getAssetTypeInfo(formData.type);
  useEffect(() => {
    if (assetData) {
      setFormData(assetData);
    }
  }, [assetData]);

  // Calculate remaining value whenever depreciation rate or origin price changes
  useEffect(() => {
    if (mode === "update") {
      const originPrice = formData.accounting?.origin_price || 0;
      const depreciationRate = formData.depreciation_rate || 0;

      // Sử dụng hàm utility từ assetCalculations.ts
      const { value, formatted } = calculateRemainingValue(
        originPrice,
        depreciationRate
      );

      setFormData((prev) => ({
        ...prev,
        remaining_value: value,
        remaining_value_formatted: formatted,
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

    // Clear error when field changes
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Handle price inputs
    if (e.target.className.includes("input-price")) {
      const numericPrice = convertToNumber(value);

      switch (name) {
        case "unit_price":
          const quantity = formData.accounting?.quantity || 0;

          // Sử dụng hàm utility để tính nguyên giá
          const { value: originPrice, formatted: originPriceFormatted } =
            calculateOriginPrice(numericPrice, quantity);

          setFormData((prev) => ({
            ...prev,
            accounting: {
              ...prev.accounting,
              unit_price: numericPrice,
              origin_price: originPrice,
            },
            unit_price_formatted: formatPrice(numericPrice),
            origin_price_formatted: originPriceFormatted,
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

      // Sử dụng hàm utility để tính chênh lệch số lượng
      const { surplusQuantity, missingQuantity } = calculateQuantityDifference(
        quantity,
        realCount
      );

      // Sử dụng hàm utility để tính nguyên giá
      const { value: originPrice, formatted: originPriceFormatted } =
        calculateOriginPrice(formData.accounting?.unit_price || 0, quantity);

      setFormData((prev) => ({
        ...prev,
        accounting: {
          ...prev.accounting,
          quantity,
          origin_price: originPrice,
        },
        quantity_differential: {
          ...prev.quantity_differential,
          real_count: realCount,
          surplus_quantity: surplusQuantity,
          missing_quantity: missingQuantity,
        },
        origin_price_formatted: originPriceFormatted,
      }));
      return;
    }

    if (name === "real_count") {
      const real_count = Number(value);
      const quantity = formData.accounting?.quantity || 0;

      // Sử dụng hàm utility để tính chênh lệch số lượng
      const { surplusQuantity, missingQuantity } = calculateQuantityDifference(
        quantity,
        real_count
      );

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

  // Hàm xử lý chọn loại tài sản
  const handleAssetTypeSelect = (typeValue: AssetType) => {
    setFormData((prev) => ({
      ...prev,
      type: typeValue,
    }));

    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: "" }));
    }
  };
  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;

    // Clear error when field changes
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    switch (name) {
      case "type":
        setFormData((prev) => ({
          ...prev,
          type: value as AssetType,
        }));
        break;

      case "responsible_user":
        if (!userList) return;

        const selectedUser = userList.find((user) => user._id === value);
        if (!selectedUser) return;

        setFormData((prev) => ({
          ...prev,
          responsible_user: selectedUser._id,
          responsible_user_name: selectedUser.name,
        }));
        break;

      case "location":
        if (!roomList) return;

        const selectedRoom = roomList.find((room) => room._id === value);
        if (!selectedRoom) return;

        setFormData((prev) => ({
          ...prev,
          location: selectedRoom._id,
          location_code: selectedRoom.fullName,
        }));
        break;

      case "acquisition_source":
        setFormData((prev) => ({
          ...prev,
          acquisition_source: value as "Lẻ" | "DA",
        }));
        break;
    }
  }

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.type) {
      newErrors.type = "Vui lòng chọn loại tài sản";
    }

    if (!formData.asset_name || formData.asset_name.trim() === "") {
      newErrors.asset_name = "Vui lòng nhập tên tài sản";
    }

    if (!formData.year_of_use) {
      newErrors.year_of_use = "Vui lòng nhập năm sử dụng";
    }

    if (!formData.accounting?.quantity || formData.accounting.quantity <= 0) {
      newErrors.quantity = "Vui lòng nhập số lượng hợp lệ";
    }

    if (
      !formData.accounting?.unit_price ||
      formData.accounting.unit_price <= 0
    ) {
      newErrors.unit_price = "Vui lòng nhập đơn giá hợp lệ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  async function handleSubmit(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Vui lòng điền đầy đủ thông tin bắt buộc", "warning");
      return;
    }

    try {
      if (!accessToken) {
        showToast("Không thể xác thực. Vui lòng đăng nhập lại.", "error");
        return;
      }

      // Remove formatted and computed fields that we don't want to send to the server
      const {
        _id,
        unit_price_formatted,
        origin_price_formatted,
        remaining_value_formatted,
        responsible_user_name,
        responsible_user_userid,
        location_code,
        history,
        ...filteredData
      } = formData;

      // Đảm bảo origin_price luôn được tính chính xác sử dụng utility function
      const { value: originPrice } = calculateOriginPrice(
        filteredData.accounting.unit_price,
        filteredData.accounting.quantity
      );

      filteredData.accounting.origin_price = originPrice;

      // Đảm bảo location và responsible_user là string ID
      const assetRequest: AssetRequest = {
        ...filteredData,
        type: filteredData.type,
        location: getLocationId(filteredData.location),
        responsible_user: getUserId(filteredData.responsible_user),
      };

      // Gọi API để cập nhật tài sản
      const success = await updateAsset(id, assetRequest, accessToken);

      if (success) {
        showToast("Cập nhật tài sản thành công", "success");
        setMode("info");
      } else {
        showToast("Không thể cập nhật tài sản. Vui lòng thử lại!", "error");
      }
    } catch (error: any) {
      console.error("Error updating asset:", error);

      // Hiển thị chi tiết lỗi nếu có
      if (error.response?.data) {
        console.error("Server error details:", error.response.data);
        showToast(
          `Lỗi: ${error.response.data.message || error.message}`,
          "error"
        );
      } else {
        showToast("Đã xảy ra lỗi khi cập nhật tài sản", "error");
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
      if (!accessToken) {
        showToast("Không thể xác thực. Vui lòng đăng nhập lại.", "error");
        return;
      }

      const result = await deleteAsset(id, accessToken);
      if (result) {
        showToast("Xóa tài sản thành công", "success");
        navigate("/asset-dashboard");
      } else {
        showToast("Không thể xóa tài sản. Vui lòng thử lại!", "error");
      }
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      showToast("Đã xảy ra lỗi khi xóa tài sản", "error");
    }
  }

  // Render form section navigation (giống CreateAssetPage)
  const renderSectionNav = () => (
    <div className="form-section-nav">
      {formSections.map((section, index) => (
        <button
          key={index}
          type="button"
          className={`section-nav-item ${
            currentSection === index ? "active" : ""
          }`}
          onClick={() => setCurrentSection(index)}
        >
          <span className="section-icon">{section.icon}</span>
          <span className="section-title">{section.title}</span>
        </button>
      ))}
    </div>
  );
  const UpdateMode = (): ReactNode => {
    return (
      <form className="info-body">
        <div className="header-actions">
          <button
            className="back-button"
            onClick={() => navigate("/asset-dashboard")}
          >
            <FaAngleLeft size={ICON_SIZE} />
            <span>Trở về</span>
          </button>
          <h1 className="page-title">
            <span
              className="asset-type-badge"
              style={{ backgroundColor: currentAssetType.color }}
            >
              {currentAssetType.icon} {currentAssetType.label}
            </span>
          </h1>
          <div className="action-buttons">
            <button className="submit-btn" onClick={handleSubmit}>
              <FaSave size={16} />
              <span>Lưu</span>
            </button>
            <button className="cancel-btn" onClick={() => setMode("info")}>
              <FaTimes size={16} />
              <span>Hủy</span>
            </button>
          </div>
        </div>

        {renderSectionNav()}

        {/* Section 0: Thông tin chung */}
        <div
          className={`form-section ${
            currentSection === 0 ? "visible" : "hidden"
          }`}
        >
          <div className="section-card">
            <h3 className="section-card-title">Loại tài sản</h3>
            <div className="asset-type-selector">
              {ASSET_TYPES.map((type) => (
                <div
                  key={type.value}
                  className={`asset-type-option ${
                    formData.type === type.value ? "selected" : ""
                  }`}
                  style={{
                    borderColor:
                      formData.type === type.value ? type.color : "transparent",
                    backgroundColor:
                      formData.type === type.value
                        ? `${type.color}15`
                        : "transparent",
                  }}
                  onClick={() => handleAssetTypeSelect(type.value as AssetType)}
                >
                  <div
                    className="asset-type-color"
                    style={{ backgroundColor: type.color }}
                  ></div>
                  <div className="asset-type-label">{type.label}</div>
                  {formData.type === type.value && (
                    <FaCheckCircle className="asset-type-check" />
                  )}
                </div>
              ))}
            </div>
            {errors.type && <div className="error-message">{errors.type}</div>}
          </div>

          <div className="section-card">
            <h3 className="section-card-title">Thông tin cơ bản</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="asset_name" className="required">
                  Tên tài sản
                </label>
                <input
                  id="asset_name"
                  type="text"
                  name="asset_name"
                  value={formData.asset_name || ""}
                  onChange={handleChange}
                  className={errors.asset_name ? "input-error" : ""}
                  required
                />
                {errors.asset_name && (
                  <div className="error-message">{errors.asset_name}</div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="asset_code">Mã tài sản</label>
                <input
                  id="asset_code"
                  type="text"
                  name="asset_code"
                  value={formData.asset_code || ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="specifications">
                  Quy cách, đặc điểm tài sản
                </label>
                <textarea
                  id="specifications"
                  name="specifications"
                  value={formData.specifications || ""}
                  onChange={handleChange}
                  placeholder="Mô tả đặc điểm, quy cách của tài sản"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="year_of_use" className="required">
                  Năm sử dụng
                </label>
                <input
                  id="year_of_use"
                  type="number"
                  name="year_of_use"
                  value={formData.year_of_use || ""}
                  onChange={handleChange}
                  className={errors.year_of_use ? "input-error" : ""}
                  min="1970"
                  max={new Date().getFullYear() + 5}
                  required
                />
                {errors.year_of_use && (
                  <div className="error-message">{errors.year_of_use}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Kế toán & Kiểm kê */}
        <div
          className={`form-section ${
            currentSection === 1 ? "visible" : "hidden"
          }`}
        >
          <div className="section-card">
            <h3 className="section-card-title">Theo sổ kế toán</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity" className="required">
                  Số lượng
                </label>
                <input
                  id="quantity"
                  type="number"
                  name="quantity"
                  value={formData.accounting?.quantity || 0}
                  onChange={handleChange}
                  className={errors.quantity ? "input-error" : ""}
                  min="0"
                  required
                />
                {errors.quantity && (
                  <div className="error-message">{errors.quantity}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="unit_price" className="required">
                  Đơn giá (VNĐ)
                </label>
                <input
                  id="unit_price"
                  type="text"
                  name="unit_price"
                  className={`input-price ${
                    errors.unit_price ? "input-error" : ""
                  }`}
                  value={
                    formData.unit_price_formatted ||
                    formatPrice(formData.accounting?.unit_price || 0)
                  }
                  onChange={handleChange}
                  required
                />
                {errors.unit_price && (
                  <div className="error-message">{errors.unit_price}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="origin_price">Nguyên giá (VNĐ)</label>
                <input
                  id="origin_price"
                  type="text"
                  name="origin_price"
                  className="input-price"
                  value={
                    formData.origin_price_formatted ||
                    formatPrice(formData.accounting?.origin_price || 0)
                  }
                  disabled
                />
                <small className="helper-text">
                  <FaInfoCircle size={12} style={{ marginRight: "4px" }} />
                  Tự động tính từ Số lượng × Đơn giá
                </small>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-card-title">Kiểm kê thực tế</h3>
            <div className="inventory-stats">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="real_count">Số lượng thực tế</label>
                  <input
                    id="real_count"
                    type="number"
                    name="real_count"
                    value={formData.quantity_differential?.real_count || 0}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="inventory-difference">
                <div className="difference-item">
                  <div className="difference-label">SL thừa:</div>
                  <div className="difference-value surplus">
                    {formData.quantity_differential?.surplus_quantity || 0}
                  </div>
                </div>

                <div className="difference-item">
                  <div className="difference-label">SL thiếu:</div>
                  <div className="difference-value shortage">
                    {formData.quantity_differential?.missing_quantity || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Khấu hao & Vị trí */}
        <div
          className={`form-section ${
            currentSection === 2 ? "visible" : "hidden"
          }`}
        >
          <div className="section-card">
            <h3 className="section-card-title">Khấu hao</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="depreciation_rate">Tỷ lệ hao mòn (%)</label>
                <input
                  id="depreciation_rate"
                  type="number"
                  name="depreciation_rate"
                  value={formData.depreciation_rate || 0}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="remaining_value">Giá trị còn lại (VNĐ)</label>
                <input
                  id="remaining_value"
                  type="text"
                  name="remaining_value"
                  className="input-price"
                  value={
                    formData.remaining_value_formatted ||
                    formatPrice(formData.remaining_value || 0)
                  }
                  disabled
                />
                <small className="helper-text">
                  <FaInfoCircle size={12} style={{ marginRight: "4px" }} />
                  Tự động tính từ Nguyên giá × (100% - Tỷ lệ hao mòn)
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="suggested_disposal">Đề nghị thanh lý</label>
                <input
                  id="suggested_disposal"
                  type="text"
                  name="suggested_disposal"
                  value={formData.suggested_disposal || ""}
                  onChange={handleChange}
                  placeholder="Nhập đề nghị thanh lý (nếu có)"
                />
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-card-title">Vị trí & Người phụ trách</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="acquisition_source" className="required">
                  Nguồn hình thành
                </label>
                <select
                  id="acquisition_source"
                  name="acquisition_source"
                  onChange={handleSelect}
                  value={formData.acquisition_source || "Lẻ"}
                  required
                >
                  <option value="Lẻ">Lẻ</option>
                  <option value="DA">Dự án</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location">Địa chỉ phòng</label>
                <select
                  id="location"
                  name="location"
                  onChange={handleSelect}
                  value={getLocationId(formData.location)}
                >
                  <option value="">-- Chọn địa chỉ phòng --</option>
                  {roomList?.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.fullName} - {room.name}
                    </option>
                  ))}
                </select>
                {!getLocationId(formData.location) && (
                  <small className="helper-text">
                    <FaInfoCircle size={12} style={{ marginRight: "4px" }} />
                    Nếu không chọn phòng, tài sản sẽ được đặt vào kho mặc định
                  </small>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="responsible_user">Người chịu trách nhiệm</label>
                <select
                  id="responsible_user"
                  name="responsible_user"
                  onChange={handleSelect}
                  value={getUserId(formData.responsible_user)}
                >
                  <option value="">-- Chọn người chịu trách nhiệm --</option>
                  {userList?.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} {user.userid ? `(${user.userid})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="note">Ghi chú</label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note || ""}
                  onChange={handleChange}
                  placeholder="Nhập ghi chú khác (nếu có)"
                />
              </div>
            </div>
          </div>

          <div className="form-navigation">
            {currentSection > 0 && (
              <button
                type="button"
                className="prev-section-btn"
                onClick={() => setCurrentSection((prev) => prev - 1)}
              >
                <FaAngleLeft size={12} style={{ marginRight: "4px" }} />
                Quay lại
              </button>
            )}

            {currentSection < formSections.length - 1 ? (
              <button
                type="button"
                className="next-section-btn"
                onClick={() => setCurrentSection((prev) => prev + 1)}
              >
                Tiếp tục
                <FaAngleLeft
                  size={12}
                  style={{ marginLeft: "4px", transform: "rotate(180deg)" }}
                />
              </button>
            ) : (
              <button
                type="button"
                className="submit-btn"
                onClick={handleSubmit}
              >
                <FaSave size={16} style={{ marginRight: "4px" }} />
                Lưu thay đổi
              </button>
            )}
          </div>
        </div>
      </form>
    );
  };

  const InfoMode = (): ReactNode => {
    return (
      <div className="info-body">
        <div className="header-actions">
          <button
            className="back-button"
            onClick={() => navigate("/asset-dashboard")}
          >
            <FaAngleLeft size={ICON_SIZE} />
            <span>Trở về</span>
          </button>
          <h1 className="page-title">
            <span
              className="asset-type-badge"
              style={{ backgroundColor: currentAssetType.color }}
            >
              {currentAssetType.icon} {currentAssetType.label}
            </span>
          </h1>
          <div className="action-buttons">
            <button className="update-btn" onClick={() => setMode("update")}>
              <FaPencilAlt size={16} />
              <span>Chỉnh sửa</span>
            </button>
            <button className="delete-btn" onClick={handleDelete}>
              <FaTrashAlt size={16} />
              <span>Xóa</span>
            </button>
          </div>
        </div>

        {renderSectionNav()}

        {/* Section 0: Thông tin chung */}
        <div
          className={`form-section ${
            currentSection === 0 ? "visible" : "hidden"
          }`}
        >
          <div className="section-card">
            <h3 className="section-card-title">Thông tin cơ bản</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Tên tài sản</label>
                <div className="info-display">
                  {formData.asset_name || "Chưa có thông tin"}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mã tài sản</label>
                <div className="info-display">
                  {formData.asset_code || "Chưa có thông tin"}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quy cách, đặc điểm tài sản</label>
                <div className="info-display info-multiline">
                  {formData.specifications || "Không có"}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Năm sử dụng</label>
                <div className="info-display">
                  {formData.year_of_use || "Không có thông tin"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Kế toán & Kiểm kê */}
        <div
          className={`form-section ${
            currentSection === 1 ? "visible" : "hidden"
          }`}
        >
          <div className="section-card">
            <h3 className="section-card-title">Theo sổ kế toán</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Số lượng</label>
                <div className="info-display">
                  {formData.accounting?.quantity || 0}
                </div>
              </div>

              <div className="form-group">
                <label>Đơn giá (VNĐ)</label>
                <div className="info-display">
                  {formData.unit_price_formatted ||
                    formatPrice(formData.accounting?.unit_price || 0)}
                </div>
              </div>

              <div className="form-group">
                <label>Nguyên giá (VNĐ)</label>
                <div className="info-display">
                  {formData.origin_price_formatted ||
                    formatPrice(formData.accounting?.origin_price || 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-card-title">Kiểm kê thực tế</h3>
            <div className="inventory-stats">
              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng thực tế</label>
                  <div className="info-display">
                    {formData.quantity_differential?.real_count || 0}
                  </div>
                </div>
              </div>

              <div className="inventory-difference">
                <div className="difference-item">
                  <div className="difference-label">SL thừa:</div>
                  <div className="difference-value surplus">
                    {formData.quantity_differential?.surplus_quantity || 0}
                  </div>
                </div>

                <div className="difference-item">
                  <div className="difference-label">SL thiếu:</div>
                  <div className="difference-value shortage">
                    {formData.quantity_differential?.missing_quantity || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Khấu hao & Vị trí */}
        <div
          className={`form-section ${
            currentSection === 2 ? "visible" : "hidden"
          }`}
        >
          <div className="section-card">
            <h3 className="section-card-title">Khấu hao</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Tỷ lệ hao mòn (%)</label>
                <div className="info-display">
                  {formData.depreciation_rate || 0}
                </div>
              </div>

              <div className="form-group">
                <label>Giá trị còn lại (VNĐ)</label>
                <div className="info-display">
                  {formData.remaining_value_formatted ||
                    formatPrice(formData.remaining_value || 0)}
                </div>
              </div>

              <div className="form-group">
                <label>Đề nghị thanh lý</label>
                <div className="info-display">
                  {formData.suggested_disposal || "Không có"}
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-card-title">Vị trí & Người phụ trách</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Nguồn hình thành</label>
                <div className="info-display">
                  {formData.acquisition_source || "Lẻ"}
                </div>
              </div>

              <div className="form-group">
                <label>Địa chỉ phòng</label>
                <div className="info-display">
                  {formData.location_code || "Không có"}
                </div>
              </div>

              <div className="form-group">
                {" "}
                <label>Người chịu trách nhiệm</label>
                <div className="info-display">
                  {formData.responsible_user_name
                    ? `${formData.responsible_user_name} ${
                        userList?.find(
                          (user) => user._id === formData.responsible_user
                        )?.userid
                          ? `(${
                              userList.find(
                                (user) => user._id === formData.responsible_user
                              )?.userid
                            })`
                          : ""
                      }`
                    : "Không có"}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ghi chú</label>
                <div className="info-display info-multiline">
                  {formData.note || "Không có"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main ref={mainRef} className="create-asset-page asset-info-page">
      <div className="container">
        <div className="layout">
          {isLoadingUserList || isLoadingRoomList || isLoadingAsset ? (
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
