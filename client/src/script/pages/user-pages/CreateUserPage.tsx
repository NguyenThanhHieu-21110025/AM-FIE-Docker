import "../../../css/InfoPage.css";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { createUser, CreateUserPayload, ServerRole } from "../../interfaces/User";
import { useAuth } from "../../context/AuthContext";
import { FaAngleLeft } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/useToast";

const CreateUserPage = () => {
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    position: "",
    role: "user", // Thay thế isAdmin bằng role mặc định "user"
  });
  const [loading, setLoading] = useState(false);
  const { refreshAccessToken, accessToken } = useAuth();
  const ICON_SIZE = 20;
  const { showToast } = useToast();

  const navigate = useNavigate();
  const mainRef = useMainRef();
  useScrollToMain();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }
  
  // Thêm hàm xử lý cho select element
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      showToast("Vui lòng điền đầy đủ thông tin bắt buộc", "warning");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast("Email không hợp lệ", "warning");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      showToast("Mật khẩu phải có ít nhất 6 ký tự", "warning");
      return;
    }

    setLoading(true);
    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) throw new Error("Phiên đăng nhập hết hạn");
      }

      const result = await createUser(formData, token);
      
      if (result.status === 'success') {
        showToast("Tạo tài khoản thành công", "success");
        navigate('/user-dashboard');
      } else {
        showToast(result.message || "Có lỗi xảy ra khi tạo tài khoản", "error");
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || error.message || "Có lỗi xảy ra", 
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main ref={mainRef} className="info-page">
      <div className="container">
        <div className="layout">
          <div
            className="back-button"
            onClick={() => navigate("/user-dashboard")}
          >
            <FaAngleLeft size={ICON_SIZE} />
            <p>Trở về</p>
          </div>
          <h1 className="title">Tạo Tài Khoản Mới</h1>
          <form className="info-body" onSubmit={handleSubmit}>
            <div className="long-info">
              <div className="info-header required">Tên người dùng: </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nhập tên người dùng"
                required
                minLength={6}
                maxLength={50}
              />
            </div>
            <div className="normal-info">
              <div className="info-container">
                <div className="info-header required">Email:</div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Nhập email"
                  required
                />
              </div>
              <div className="info-container">
                <div className="info-header required">Mật khẩu:</div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  required
                  minLength={6}
                />
              </div>
              <div className="info-container">
                <div className="info-header">Số điện thoại:</div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber || ""}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                  pattern="(84|0[3|5|7|8|9])+([0-9]{8})\b"
                />
              </div>
              <div className="info-container">
                <div className="info-header">Chức vụ:</div>
                <input
                  type="text"
                  name="position"
                  value={formData.position || ""}
                  onChange={handleChange}
                  placeholder="Nhập chức vụ"
                />
              </div>
              {/* Thay checkbox bằng select cho role */}
              <div className="info-container">
                <div className="info-header">Quyền người dùng:</div>
                <select
                  name="role"
                  value={formData.role || "user"}
                  onChange={handleSelectChange}
                  className="role-select"
                >
                  <option value="user">Người dùng</option>
                  <option value="powerUser">Người dùng nâng cao</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="button-container">
              <button 
                type="submit" 
                className="submit-btn" 
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Tạo tài khoản"}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/user-dashboard')}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default CreateUserPage;