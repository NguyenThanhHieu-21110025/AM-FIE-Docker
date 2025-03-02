import "../../../css/AuthPages.css";
import { MdOutlineEmail } from "react-icons/md";
import { FaLock } from "react-icons/fa";
import f1Building from "../../../assets/F1.jpg";
import hcmuteLogo from "../../../assets/hcmute-logo.png";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, LoginUser } from "../../context/AuthContext";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useState } from "react";
import AuthPageWrapper from "../../components/AuthPageWrapper";
import ErrorMessage from "../../components/ErrorMessage";


const LoginPage = () => {
  const [loginUser, setLoginUser] = useState<LoginUser>({} as LoginUser);
  const { login } = useAuth();
  const navigate = useNavigate();
  const ICON_SIZE = 32;

  const mainRef = useMainRef();
  const [error, setError] = useState<string>("");
  useScrollToMain();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name } = e.target;
    const value = e.target.value;
    setLoginUser((prevState) => ({ ...prevState, [name]: value }));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const success = await login(loginUser);
      if (success) {
        navigate("/");
      } else {
        setError("Email hoặc mật khẩu không chính xác");
      }
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại sau");
    }
  }

  return (
    <AuthPageWrapper>
    <main className="auth-page login-page" ref={mainRef}>
      <div className="picture-section">
        <img
          src={f1Building}
          alt="Building"
          className="building-image fade-in"
        />
      </div>

      <div className="auth-section">
        <form className="auth-form slide-up" onSubmit={handleLogin}>
          <div className="logo-container">
            <img
              src={hcmuteLogo}
              alt="HCMUTE Logo"
              className="hcmute-logo scale-in"
            />
          </div>
          <h1 className='title'>Đăng Nhập</h1>
          <div className="input-group">
            <div className="input-area">
              <div className="icon-wrapper">
                <MdOutlineEmail size={ICON_SIZE} />
              </div>
              <div className="input-container">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={loginUser.email}
                  onChange={handleChange}
                  required
                />
                <div className="input-focus-line"></div>
              </div>
            </div>

            <div className="input-area">
              <div className="icon-wrapper">
                <FaLock size={ICON_SIZE} />
              </div>
              <div className="input-container">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  name="password"
                  value={loginUser.password}
                  onChange={handleChange}
                  required
                />
                <div className="input-focus-line"></div>
              </div>
            </div>
          </div>
          {error && <ErrorMessage message={error} />}
          <div className="forgot-password">
            <a href="/forgotPassword" className="hover-underline">
              Bạn quên mật khẩu? Hãy nhấn đây
            </a>
          </div>

          <button className="submit-btn" type="submit">
            Đăng Nhập
          </button>

          <div className="register-section">
            <p>Nếu bạn là người mới, hãy nhấn vào nút phía dưới.</p>
            <Link to="/register">
              <p className="register-btn">Tạo tài khoản mới</p>
            </Link>
          </div>
        </form>
      </div>
    </main>
    </AuthPageWrapper>
  );
};

export default LoginPage;
