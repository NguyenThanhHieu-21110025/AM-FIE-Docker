import "../../../css/InfoPage.css";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { createUser, CreateUserPayload } from "../../interfaces/User";
import { useAuth } from "../../context/AuthContext";
import { FaAngleLeft } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const CreateUserPage = () => {
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    position: "",
    admin: false,
  });
  const [loading, setLoading] = useState(false);
  const { refreshAccessToken, accessToken } = useAuth();
  const ICON_SIZE = 20;

  const navigate = useNavigate();
  const mainRef = useMainRef();
  useScrollToMain();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setLoading(true);
    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) throw new Error("Không thể xác thực");
      }

      const result = await createUser(formData, token);
      
      if (result.status === 'success') {
        toast.success(result.message);
        navigate('/user-dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra khi tạo tài khoản");
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
                  value={formData.phoneNumber}
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
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Nhập chức vụ"
                />
              </div>
              <div className="info-container checkbox">
                <div className="info-header">Quyền admin:</div>
                <input
                  type="checkbox"
                  name="admin"
                  checked={formData.admin}
                  onChange={handleChange}
                />
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