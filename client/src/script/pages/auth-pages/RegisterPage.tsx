import React, { useState } from "react";
import "../../../css/AuthPages.css";
import { MdOutlineEmail, MdPersonOutline } from "react-icons/md";
import { FaLock } from "react-icons/fa";
import f1Building from "../../../assets/F1.jpg";
import hcmuteLogo from "../../../assets/hcmute-logo.png";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, RegisterUser } from "../../context/AuthContext";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import AuthPageWrapper from "../../components/AuthPageWrapper";
import ErrorMessage from "../../components/ErrorMessage";

const RegisterPage = () => {
  const mainRef = useMainRef();
  const [error, setError] = useState<string>("");
  const [registerUser, setRegisterUser] = useState<RegisterUser>(
    {} as RegisterUser
  );
  const [cPassword, setCPassword] = useState<string>("");
  const { register } = useAuth();
  const navigate = useNavigate();
  const ICON_SIZE = 32;

  useScrollToMain();

  function onChangeInput(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.name === "confirm-password") {
      setCPassword(event.target.value);
      return;
    }
    setRegisterUser((prevUser) => ({
      ...prevUser,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (registerUser.password !== cPassword) {
        setError("Mật khẩu xác nhận không khớp");
        return;
      }
      const success = await register(registerUser);
      if (success) {
        navigate("/login");
      } else {
        setError("Email đã được sử dụng");
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
          <form className="auth-form slide-up" onSubmit={handleRegister}>
            <div className="logo-container">
              <img
                src={hcmuteLogo}
                alt="HCMUTE Logo"
                className="hcmute-logo scale-in"
              />
            </div>
            <h1 className='title'>Đăng ký tài khoản mới</h1>
            <div className="input-group">
              <div className="input-area">
                <div className="icon-wrapper">
                  <MdPersonOutline size={ICON_SIZE} />
                </div>
                <div className="input-container">
                  <label>Tên tài khoản</label>
                  <input
                    type="text"
                    name="name"
                    value={registerUser.name}
                    onChange={onChangeInput}
                    required
                  />
                  <div className="input-focus-line"></div>
                </div>
              </div>

              <div className="input-area">
                <div className="icon-wrapper">
                  <MdOutlineEmail size={ICON_SIZE} />
                </div>
                <div className="input-container">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={registerUser.email}
                    onChange={onChangeInput}
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
                    value={registerUser.password}
                    onChange={onChangeInput}
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
                  <label>Nhập lại mật khẩu</label>
                  <input
                    type="password"
                    name="confirm-password"
                    value={cPassword}
                    onChange={onChangeInput}
                    required
                  />
                  <div className="input-focus-line"></div>
                </div>
              </div>
            </div>
            {error && <ErrorMessage message={error} />}
            <button className="submit-btn" type="submit">
              Đăng Ký
            </button>

            <div className="register-section">
              <p>Bạn đã có tài khoản?</p>
              <Link to="/login">
                <p className="register-btn">Đăng nhập ngay</p>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </AuthPageWrapper>
  );
};

export default RegisterPage;
