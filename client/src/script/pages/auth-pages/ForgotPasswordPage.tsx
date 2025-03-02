import React, { useState } from "react";
import "../../../css/AuthPages.css";
import { MdOutlineEmail } from "react-icons/md";
import { FaLock } from "react-icons/fa";
import f1Building from "../../../assets/F1.jpg";
import hcmuteLogo from "../../../assets/hcmute-logo.png";
import { Link } from "react-router-dom";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import AuthPageWrapper from "../../components/AuthPageWrapper";
import OTPInput from "../../components/OTPInput";

const ForgotPassword = () => {
  const mainRef = useMainRef();
  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "newPassword">("email");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const ICON_SIZE = 32;

  useScrollToMain();

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("code");
  };

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("newPassword");
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password reset logic
  };

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
          <form className="auth-form slide-up">
            <div className="logo-container">
              <img
                src={hcmuteLogo}
                alt="HCMUTE Logo"
                className="hcmute-logo scale-in"
              />
            </div>
            <h1 className='title'>Quên mật khẩu</h1>
            {step === "email" && (
              <div className="input-group">
                <div className="input-area">
                  <div className="icon-wrapper">
                    <MdOutlineEmail size={ICON_SIZE} />
                  </div>
                  <div className="input-container">
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="input-focus-line"></div>
                  </div>
                </div>
                <button
                  className="submit-btn"
                  onClick={handleSubmitEmail}
                  type="submit"
                >
                  Gửi mã xác thực
                </button>
              </div>
            )}

            {step === "code" && (
              <div className="input-group">
                <p className="verification-text">
                  Mã xác thực đã được gửi đến email của bạn
                </p>
                <OTPInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                />
                <div className="resend-code">
                  <button
                    type="button"
                    className="resend-button"
                    onClick={() => {
                      // TODO: Implement resend logic
                      console.log("Resend code");
                    }}
                  >
                    Gửi lại mã xác thực
                  </button>
                </div>
                <button
                  className="submit-btn"
                  onClick={handleSubmitCode}
                  type="submit"
                  disabled={verificationCode.length !== 6}
                >
                  Xác nhận
                </button>
              </div>
            )}

            {step === "newPassword" && (
              <div className="input-group">
                <div className="input-area">
                  <div className="icon-wrapper">
                    <FaLock size={ICON_SIZE} />
                  </div>
                  <div className="input-container">
                    <label>Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                    <label>Xác nhận mật khẩu</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <div className="input-focus-line"></div>
                  </div>
                </div>
                <button
                  className="submit-btn"
                  onClick={handleResetPassword}
                  type="submit"
                >
                  Đổi mật khẩu
                </button>
              </div>
            )}

            <div className="register-section">
              <Link to="/login">
                <p className="register-btn">Quay lại trang đăng nhập</p>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </AuthPageWrapper>
  );
};

export default ForgotPassword;
