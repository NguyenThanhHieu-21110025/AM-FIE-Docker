import "../../../css/InfoPage.css";
import { useState, useEffect } from "react";
import {
  Asset,
  AssetRequest,
  AssetType,
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
import { FaAngleLeft, FaSave, FaTimes, FaInfoCircle } from "react-icons/fa";
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

// Định nghĩa các loại tài sản với mã màu tương ứng
const ASSET_TYPES = [
  {
    value: "TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE",
    label: "Tài sản cố định",
    color: "#4f46e5", // indigo
  },
  {
    value: "TAI SAN QUAN LY TT HOP TAC DAO TAO QUOC TE",
    label: "Tài sản công cụ quản lý",
    color: "#0891b2", // cyan
  },
  {
    value: "TAI SAN TANG NAM",
    label: "Tài sản tăng năm",
    color: "#059669", // emerald
  },
  {
    value: "TAI SAN VNT CONG CU DUNG CU TT HOP TAC DAO TAO QUOC TE",
    label: "Tài sản vật nội thất, công cụ dụng cụ",
    color: "#d97706", // amber
  },
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
    type: "TAI SAN CO DINH TT HOP TAC DAO TAO QUOC TE", // Giá trị mặc định
  } as Asset;

  const [formData, setFormData] = useState<Asset>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useScrollToMain();

  // Các section của form
  const formSections = [
    { title: "Thông tin chung", icon: "📋" },
    { title: "Kế toán & Kiểm kê", icon: "💰" },
    { title: "Khấu hao & Vị trí", icon: "📍" }
  ];

  // Auto-calculate remaining value based on depreciation rate
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

  // Fetch user list
  const { data: userList, isLoading: isLoadingUserList } = useQuery({
    queryFn: async () => {
      const token = (await refreshAccessToken()) || accessToken;
      if (!token) throw new Error("Unable to refresh access token");
      return getUserList(token);
    },
    queryKey: ["userList"],
  });

  // Fetch room list
  const { data: roomList, isLoading: isLoadingRoomList } = useQuery({
    queryFn: async () => {
      const token = (await refreshAccessToken()) || accessToken;
      if (!token) throw new Error("Unable to refresh access token");
      return getRoomList(token, userList as User[]);
    },
    queryKey: ["roomList", userList],
    enabled: !!userList && userList.length > 0,
  });

  // Handle input changes for regular inputs and textareas
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    
    // Clear error on field change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

    // Handle price inputs with formatting
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

    // Handle quantity input changes with calculations
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

    // Handle real count updates
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

    // Handle depreciation rate with min/max constraints
    if (name === "depreciation_rate") {
      const rate = Math.min(Math.max(parseFloat(value) || 0, 0), 100);
      setFormData((prev) => ({
        ...prev,
        depreciation_rate: rate,
      }));
      return;
    }

    // Generic handler for other fields
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Handle select element changes
  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;
    
    // Clear error on field change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

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

  // Handle asset type changes
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      type: e.target.value as AssetType,
    }));
    
    if (errors.type) {
      setErrors(prev => ({ ...prev, type: "" }));
    }
  };

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
    
    if (!formData.accounting?.unit_price || formData.accounting.unit_price <= 0) {
      newErrors.unit_price = "Vui lòng nhập đơn giá hợp lệ";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  async function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast("Vui lòng điền đầy đủ thông tin bắt buộc", "warning");
      return;
    }
    
    setIsSubmitting(true);

    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
      }
      if (!token) {
        showToast("Không thể xác thực. Vui lòng đăng nhập lại.", "error");
        setIsSubmitting(false);
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
        type: formData.type,
        location: getLocationId(requestData.location),
        responsible_user: getUserId(requestData.responsible_user),
      };

      // Ensure origin price is calculated correctly
      assetRequest.accounting.origin_price =
        assetRequest.accounting.quantity * assetRequest.accounting.unit_price;

      console.log("Sending data:", assetRequest);

      const result = await createAsset(assetRequest, token);

      if (result) {
        showToast("Tạo tài sản thành công!", "success");
        navigate("/asset-dashboard");
      } else {
        showToast("Không thể tạo tài sản. Vui lòng thử lại!", "error");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error("Error creating asset:", error);

      if (error.response?.data) {
        console.error("Server error details:", error.response.data);
        showToast(
          `Lỗi: ${error.response.data.message || error.message}`,
          "error"
        );
      } else {
        showToast("Đã xảy ra lỗi khi tạo tài sản", "error");
      }
      setIsSubmitting(false);
    }
  }

  // Handle asset name suggestions
  const handleAssetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, asset_name: value }));
    
    if (errors.asset_name) {
      setErrors(prev => ({ ...prev, asset_name: "" }));
    }

    const suggestions = getFilteredSuggestions(value, "name");
    setFilteredSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
    setHighlightedSuggestion(-1);
    setActiveField("name");
  };

  // Handle asset code suggestions
  const handleAssetCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, asset_code: value }));

    const suggestions = getFilteredSuggestions(value, "code");
    setFilteredSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
    setHighlightedSuggestion(-1);
    setActiveField("code");
  };

  // Handle selection from suggestions
  const handleSelectSuggestion = (suggestion: {
    name: string;
    code: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      asset_name: suggestion.name,
      asset_code: suggestion.code,
    }));
    setShowSuggestions(false);
    
    if (errors.asset_name) {
      setErrors(prev => ({ ...prev, asset_name: "" }));
    }
  };

  // Handle keyboard navigation for suggestions
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

  // Find selected asset type to get its color
  const selectedAssetType = ASSET_TYPES.find(type => type.value === formData.type);
  const assetTypeColor = selectedAssetType?.color || "#4f46e5";

  // Render form section navigation
  const renderSectionNav = () => (
    <div className="form-section-nav">
      {formSections.map((section, index) => (
        <button
          key={index}
          type="button"
          className={`section-nav-item ${currentSection === index ? 'active' : ''}`}
          onClick={() => setCurrentSection(index)}
        >
          <span className="section-icon">{section.icon}</span>
          <span className="section-title">{section.title}</span>
        </button>
      ))}
    </div>
  );

  return (
    <main ref={mainRef} className="info-page">
      <div className="container">
        <div className="layout">
          <div className="header-actions">
            <button
              className="back-button"
              onClick={() => navigate("/asset-dashboard")}
              disabled={isSubmitting}
            >
              <FaAngleLeft size={20} />
              <span>Trở về</span>
            </button>
            
            <h1 className="title">
              <span className="asset-type-badge" style={{ backgroundColor: assetTypeColor }}>
                {selectedAssetType?.label || "Tài sản mới"}
              </span>
            </h1>

            <div className="action-buttons">
              <button 
                className="cancel-btn" 
                onClick={() => navigate("/asset-dashboard")}
                disabled={isSubmitting}
              >
                <FaTimes size={16} />
                <span>Hủy</span>
              </button>
              <button 
                className="submit-btn" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <FaSave size={16} />
                <span>{isSubmitting ? "Đang lưu..." : "Lưu tài sản"}</span>
              </button>
            </div>
          </div>

          {renderSectionNav()}

          <form className="info-body">
            {/* Section 0: Thông tin chung */}
            <div className={`form-section ${currentSection === 0 ? 'visible' : 'hidden'}`}>
              {/* Loại tài sản */}
              <div className="section-card">
                <h3 className="section-card-title">Loại tài sản</h3>
                <div className="asset-type-selector">
                  {ASSET_TYPES.map(type => (
                    <div 
                      key={type.value} 
                      className={`asset-type-option ${formData.type === type.value ? 'selected' : ''}`}
                      style={{ 
                        borderColor: formData.type === type.value ? type.color : 'transparent',
                        backgroundColor: formData.type === type.value ? `${type.color}15` : 'transparent'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value as AssetType }))}
                    >
                      <div className="asset-type-color" style={{ backgroundColor: type.color }}></div>
                      <div className="asset-type-label">{type.label}</div>
                    </div>
                  ))}
                </div>
                {errors.type && <div className="error-message">{errors.type}</div>}
              </div>

              {/* Thông tin cơ bản */}
              <div className="section-card">
                <h3 className="section-card-title">Thông tin cơ bản</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="asset_name" className="required">Tên tài sản</label>
                    <div className="autocomplete-container">
                      <input
                        id="asset_name"
                        type="text"
                        name="asset_name"
                        value={formData.asset_name || ""}
                        onChange={handleAssetNameChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                          setNameInputFocused(true);
                          if (
                            formData.asset_name &&
                            getFilteredSuggestions(formData.asset_name, "name").length > 0
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
                        className={`autocomplete-input ${errors.asset_name ? 'input-error' : ''}`}
                        placeholder="Nhập tên tài sản"
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
                    {errors.asset_name && <div className="error-message">{errors.asset_name}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="asset_code">Mã tài sản</label>
                    <div className="autocomplete-container">
                      <input
                        id="asset_code"
                        type="text"
                        name="asset_code"
                        value={formData.asset_code || ""}
                        onChange={handleAssetCodeChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                          setCodeInputFocused(true);
                          if (
                            formData.asset_code &&
                            getFilteredSuggestions(formData.asset_code, "code").length > 0
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
                        placeholder="Nhập mã tài sản (không bắt buộc)"
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

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="specifications">Quy cách, đặc điểm tài sản</label>
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
                    <label htmlFor="year_of_use" className="required">Năm sử dụng</label>
                    <input
                      id="year_of_use"
                      type="number"
                      name="year_of_use"
                      value={formData.year_of_use || ""}
                      onChange={handleChange}
                      className={errors.year_of_use ? 'input-error' : ''}
                      min="1970"
                      max={new Date().getFullYear() + 5}
                      required
                    />
                    {errors.year_of_use && <div className="error-message">{errors.year_of_use}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="acquisition_source" className="required">Nguồn tài sản</label>
                    <select
                      id="acquisition_source"
                      name="acquisition_source"
                      onChange={handleSelect}
                      value={formData.acquisition_source}
                      required
                    >
                      <option value="Lẻ">Lẻ</option>
                      <option value="DA">Dự án</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Kế toán & Kiểm kê */}
            <div className={`form-section ${currentSection === 1 ? 'visible' : 'hidden'}`}>
              <div className="section-card">
                <h3 className="section-card-title">Theo sổ kế toán</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="quantity" className="required">Số lượng</label>
                    <input
                      id="quantity"
                      type="number"
                      name="quantity"
                      value={formData.accounting?.quantity || 0}
                      onChange={handleChange}
                      className={errors.quantity ? 'input-error' : ''}
                      min="0"
                      required
                    />
                    {errors.quantity && <div className="error-message">{errors.quantity}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="unit_price" className="required">Đơn giá (VNĐ)</label>
                    <input
                      id="unit_price"
                      type="text"
                      name="unit_price"
                      className={`input-price ${errors.unit_price ? 'input-error' : ''}`}
                      value={
                        formData.unit_price_formatted ||
                        formatPrice(formData.accounting?.unit_price || 0)
                      }
                      onChange={handleChange}
                      required
                    />
                    {errors.unit_price && <div className="error-message">{errors.unit_price}</div>}
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
                    <small className="helper-text">Tự động tính từ Số lượng × Đơn giá</small>
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
            <div className={`form-section ${currentSection === 2 ? 'visible' : 'hidden'}`}>
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
                    <small className="helper-text">Tự động tính từ Nguyên giá × (100% - Tỷ lệ hao mòn)</small>
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
                        <FaInfoCircle size={12} /> Nếu không chọn phòng, tài sản sẽ được đặt vào kho mặc định
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
                          {user.name} {user.userid ? `(${user.userid})` : ''}
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
            </div>

            <div className="form-navigation">
              {currentSection > 0 && (
                <button
                  type="button"
                  className="prev-section-btn"
                  onClick={() => setCurrentSection(prev => prev - 1)}
                  disabled={isSubmitting}
                >
                  Quay lại
                </button>
              )}
              
              {currentSection < formSections.length - 1 && (
                <button
                  type="button"
                  className="next-section-btn"
                  onClick={() => setCurrentSection(prev => prev + 1)}
                  disabled={isSubmitting}
                >
                  Tiếp tục
                </button>
              )}
              
              {currentSection === formSections.length - 1 && (
                <button
                  type="button"
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Tạo tài sản"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default CreateAssetPage;