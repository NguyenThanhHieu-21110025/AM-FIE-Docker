import "../../../css/InfoPage.css";
import { useState, useEffect } from "react";
import {
  Asset,
  AssetRequest,
  createAsset,
  getLocationId,
  getUserId,
} from "../../interfaces/Asset";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getUserList, User } from "../../interfaces/User";
import { Room, getRoomList } from "../../interfaces/Room";
import { useQuery } from "@tanstack/react-query";
import { FaAngleLeft } from "react-icons/fa";
import Loader from "../../components/Loader";
import { convertToNumber, formatPrice } from "../../utils/formatPrice";
import { useAssetSuggestions } from "../../hooks/useAssetSuggestions";
import AutocompleteSuggestions from "../../components/AutocompleteSuggestions";
import { useToast } from "../../hooks/useToast";
interface AssetSuggestion {
  name: string;
  code: string;
  _id?: string;
}

// Định nghĩa các loại tài sản
const ASSET_TYPES = [
  {
    value: "TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE",
    label: "Tài sản cố định"
  },
  {
    value: "TAI SAN QUAN LY TT HOP TAC DAO TAO QUOC TE",
    label: "Tài sản công cụ quản lý"
  },
  {
    value: "TAI SAN TANG NAM",
    label: "Tài sản tăng năm"
  },
  {
    value: "TAI SAN VNT CONG CU DUNG CU TT HOP TAC DAO TAO QUOC TE",
    label: "Tài sản vật nội thất, công cụ dụng cụ"
  }
];

const CreateAssetPage = () => {
  const initialFormData: Asset = {
    asset_code: "",
    asset_name: "",
    specifications: "",
    year_of_use: new Date().getFullYear(),
    accounting: {
      quantity: 0,
      unit_price: 0,
      origin_price: 0,
    },
    quantity_differential: {
      real_count: 0,
      surplus_quantity: 0,
      missing_quantity: 0,
    },
    depreciation_rate: 0,
    remaining_value: 0,
    suggested_disposal: "",
    acquisition_source: "Lẻ",
    note: "",
    type: "TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE" // Giá trị mặc định
  } as Asset;

  const [formData, setFormData] = useState<Asset>(initialFormData);
  const { refreshAccessToken, accessToken } = useAuth();
  const navigate = useNavigate();
  const mainRef = useMainRef();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
  const { getFilteredSuggestions } = useAssetSuggestions();
  const [filteredSuggestions, setFilteredSuggestions] = useState<AssetSuggestion[]>([]);
  const [activeField, setActiveField] = useState<"name" | "code">("name");
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [codeInputFocused, setCodeInputFocused] = useState(false);
  const { showToast } = useToast();

  useScrollToMain();

  useEffect(() => {
    const originPrice = formData.accounting?.origin_price || 0;
    const depreciationRate = formData.depreciation_rate || 0;
    const remainingValue = originPrice * (1 - depreciationRate / 100);

    setFormData((prev) => ({
      ...prev,
      remaining_value: remainingValue,
      remaining_value_formatted: formatPrice(remainingValue),
    }));
  }, [formData.depreciation_rate, formData.accounting?.origin_price]);

  const { data: userList, isLoading: isLoadingUserList } = useQuery({
    queryFn: async () => {
      const token = (await refreshAccessToken()) || accessToken;
      if (!token) throw new Error("Unable to refresh access token");
      return getUserList(token);
    },
    queryKey: ["userList"],
  });

  const { data: roomList, isLoading: isLoadingRoomList } = useQuery({
    queryFn: async () => {
      const token = (await refreshAccessToken()) || accessToken;
      if (!token) throw new Error("Unable to refresh access token");
      return getRoomList(token, userList as User[]);
    },
    queryKey: ["roomList", userList],
    enabled: !!userList && userList.length > 0,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

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

    if (name === "quantity") {
      const quantity = Number(value);
      const realCount = formData.quantity_differential?.real_count || 0;

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

    if (name === "depreciation_rate") {
      const rate = Math.min(Math.max(parseFloat(value) || 0, 0), 100);
      setFormData((prev) => ({
        ...prev,
        depreciation_rate: rate,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;

    if (name === "responsible_user") {
      const selectedUser = userList?.find((user) => user._id === value);
      if (!selectedUser) return;

      setFormData((prev) => ({
        ...prev,
        responsible_user: selectedUser._id,
        responsible_user_name: selectedUser.name,
      }));
    }

    if (name === "location") {
      const selectedRoom = roomList?.find((room) => room._id === value);
      if (!selectedRoom) return;

      setFormData((prev) => ({
        ...prev,
        location: selectedRoom._id,
        location_code: selectedRoom.fullName,
      }));
    }

    if (name === "acquisition_source") {
      setFormData((prev) => ({
        ...prev,
        acquisition_source: value as "Lẻ" | "DA",
      }));
    }
  }

  // Thêm hàm xử lý thay đổi loại tài sản
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      type: e.target.value
    }));
  };

  async function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
      }
      if (!token) {
        showToast("Không thể xác thực. Vui lòng đăng nhập lại.", "error");
        return;
      }

      const {
        _id,
        unit_price_formatted,
        origin_price_formatted,
        remaining_value_formatted,
        responsible_user_name,
        responsible_user_userid,
        location_code,
        history,
        ...requestData
      } = formData;

      const assetRequest: AssetRequest = {
        ...requestData,
        location: getLocationId(requestData.location),
        responsible_user: getUserId(requestData.responsible_user),
      };

      if (!assetRequest.asset_name) {
        showToast("Vui lòng nhập tên tài sản", "warning");
        return;
      }

      if (
        !assetRequest.accounting?.quantity ||
        assetRequest.accounting?.quantity <= 0
      ) {
        showToast("Vui lòng nhập số lượng hợp lệ", "warning");
        return;
      }

      if (
        !assetRequest.accounting?.unit_price ||
        assetRequest.accounting?.unit_price <= 0
      ) {
        showToast("Vui lòng nhập đơn giá hợp lệ", "warning");
        return;
      }

      assetRequest.accounting.origin_price =
        assetRequest.accounting.quantity * assetRequest.accounting.unit_price;

      console.log("Sending data:", assetRequest);

      const result = await createAsset(assetRequest, token);

      if (result) {
        showToast("Tạo tài sản thành công!", "success");
        navigate("/asset-dashboard");
      } else {
        showToast("Không thể tạo tài sản. Vui lòng thử lại!", "error");
      }
    } catch (error: any) {
      console.error("Error creating asset:", error);

      if (error.response?.data) {
        console.error("Server error details:", error.response.data);
        showToast(`Lỗi: ${error.response.data.message || error.message}`, "error");
      } else {
        showToast("Đã xảy ra lỗi khi tạo tài sản", "error");
      }
    }
  }

  // Function to handle input change with suggestions
  const handleAssetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, asset_name: value }));

    const suggestions = getFilteredSuggestions(value, "name");
    setFilteredSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
    setHighlightedSuggestion(-1);
    setActiveField("name");
  };

  const handleAssetCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, asset_code: value }));

    const suggestions = getFilteredSuggestions(value, "code");
    setFilteredSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
    setHighlightedSuggestion(-1);
    setActiveField("code");
  };

  const handleSelectSuggestion = (suggestion: { name: string; code: string }) => {
    setFormData((prev) => ({
      ...prev,
      asset_name: suggestion.name,
      asset_code: suggestion.code,
    }));
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedSuggestion((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedSuggestion >= 0) {
          handleSelectSuggestion(filteredSuggestions[highlightedSuggestion]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  if (isLoadingUserList || isLoadingRoomList) {
    return <Loader />;
  }

  return (
    <main ref={mainRef} className="info-page">
      <div className="container">
        <div className="layout">
          <div className="back-button" onClick={() => navigate("/asset-dashboard")}>
            <FaAngleLeft size={20} />
            <p>Trở về</p>
          </div>
          <h1 className="title">Tạo Tài Sản Mới</h1>

          <form className="info-body">
            {/* Phần chọn loại tài sản - Thêm vào đầu form */}
            <div className="normal-info">
              <div className="info-container">
                <div className="info-header">
                  Loại tài sản: <span className="required">*</span>
                </div>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleTypeChange}
                  required
                >
                  {ASSET_TYPES.map((assetType) => (
                    <option key={assetType.value} value={assetType.value}>
                      {assetType.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 1: Tên tài sản và mã tài sản */}
            <div className="two-column-row">
              <div className="column">
                <div className="info-container">
                  <div className="info-header">
                    Tên tài sản: <span className="required">*</span>
                  </div>
                  <div className="autocomplete-container">
                    <input
                      type="text"
                      name="asset_name"
                      value={formData.asset_name || ""}
                      onChange={handleAssetNameChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        setNameInputFocused(true);
                        if (
                          formData.asset_name &&
                          getFilteredSuggestions(formData.asset_name, "name")
                            .length > 0
                        ) {
                          setShowSuggestions(true);
                          setActiveField("name");
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setNameInputFocused(false);
                          if (!codeInputFocused) {
                            setShowSuggestions(false);
                          }
                        }, 200);
                      }}
                      className="autocomplete-input"
                      required
                    />
                    {activeField === "name" && (
                      <AutocompleteSuggestions
                        suggestions={filteredSuggestions}
                        onSelect={handleSelectSuggestion}
                        visible={showSuggestions}
                        highlightedIndex={highlightedSuggestion}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="column">
                <div className="info-container">
                  <div className="info-header">Mã tài sản: </div>
                  <div className="autocomplete-container">
                    <input
                      type="text"
                      name="asset_code"
                      value={formData.asset_code || ""}
                      onChange={handleAssetCodeChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        setCodeInputFocused(true);
                        if (
                          formData.asset_code &&
                          getFilteredSuggestions(formData.asset_code, "code")
                            .length > 0
                        ) {
                          setShowSuggestions(true);
                          setActiveField("code");
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setCodeInputFocused(false);
                          if (!nameInputFocused) {
                            setShowSuggestions(false);
                          }
                        }, 200);
                      }}
                      className="autocomplete-input"
                    />
                    {activeField === "code" && (
                      <AutocompleteSuggestions
                        suggestions={filteredSuggestions}
                        onSelect={handleSelectSuggestion}
                        visible={showSuggestions}
                        highlightedIndex={highlightedSuggestion}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Quy cách và năm sử dụng */}
            <div className="two-column-row uneven">
              <div className="column wide">
                <div className="info-container">
                  <div className="info-header">
                    Quy cách, đặc điểm tài sản:{" "}
                  </div>
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

            {/* ACCOUNTING SECTION */}
            <div className="section-divider">
              <h3 className="section-title">Theo sổ kế toán</h3>
            </div>

            <div className="normal-info accounting-section">
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

            {/* DIFFERENTIAL SECTION */}
            <div className="section-divider">
              <h3 className="section-title">Chênh lệch</h3>
            </div>

            <div className="normal-info differential-section">
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

              <div className="info-container">
                <div className="info-header">SL thừa:</div>
                <input
                  type="number"
                  name="surplus_quantity"
                  value={formData.quantity_differential?.surplus_quantity || 0}
                  disabled
                />
              </div>

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
              <div className="info-container">
                <div className="info-header">
                  Nguồn: <span className="required">*</span>
                </div>
                <select
                  name="acquisition_source"
                  onChange={handleSelect}
                  value={formData.acquisition_source}
                  required
                >
                  <option value="Lẻ">Lẻ</option>
                  <option value="DA">Dự án</option>
                </select>
              </div>
              
              <div className="info-container">
                <div className="info-header">Địa chỉ phòng: </div>
                <select
                  name="location"
                  onChange={handleSelect}
                  value={getLocationId(formData.location)}
                >
                  <option value="">Chọn địa chỉ phòng</option>
                  {roomList?.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.fullName} - {room.name}
                    </option>
                  ))}
                </select>
              </div>

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

            {/* Submit Button */}
            <div className="button-container">
              <button className="submit-btn" onClick={handleSubmit}>
                Tạo tài sản
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default CreateAssetPage;