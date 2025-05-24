import React, { useState } from "react";
import "../../../css/ForgotPasswordPage.css";
import { MdOutlineEmail } from "react-icons/md";
import { FaLock } from "react-icons/fa";
import { IoCheckmarkCircle, IoWarning } from "react-icons/io5";
import f1Building from "../../../assets/F1.jpg";
import hcmuteLogo from "../../../assets/hcmute-logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import AuthPageWrapper from "../../components/AuthPageWrapper";
import OTPInput from "../../components/OTPInput";
import authService from "../../services/authService";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const mainRef = useMainRef();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "newPassword">("email");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const ICON_SIZE = 32;

  useScrollToMain();

  // Email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Password validation
  const isValidPassword = (password: string) => {
    return password.length >= 8;
  };

  // Handle countdown for resend button
  const startResendCountdown = () => {
    setResendDisabled(true);
    setCountdown(60);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!email) {
      setError("Vui lòng nhập email");
      return;
    }
    
    if (!isValidEmail(email)) {
      setError("Email không đúng định dạng");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await authService.requestPasswordReset(email);
      
      if (response.data.status === "success") {
        setSuccess(response.data.message || "Mã xác thực đã được gửi đến email của bạn");
        setStep("code");
        startResendCountdown();
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Có lỗi xảy ra. Vui lòng thử lại sau");
      }
      console.error("Error requesting password reset:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (verificationCode.length !== 6) {
      setError("Vui lòng nhập đầy đủ mã xác thực");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await authService.verifyResetCode(email, verificationCode);
      
      if (response.data.status === "success") {
        setSuccess("Mã xác thực hợp lệ");
        setStep("newPassword");
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Mã xác thực không hợp lệ");
      }
      console.error("Error verifying code:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      const response = await authService.requestPasswordReset(email);
      
      if (response.data.status === "success") {
        setSuccess("Đã gửi lại mã xác thực");
        startResendCountdown();
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Có lỗi xảy ra khi gửi lại mã");
      }
      console.error("Error resending code:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!newPassword) {
      setError("Vui lòng nhập mật khẩu mới");
      return;
    }
    
    if (!isValidPassword(newPassword)) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await authService.resetPassword(email, verificationCode, newPassword);
      
      if (response.data.status === "success") {
        setSuccess("Đặt lại mật khẩu thành công!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Có lỗi xảy ra khi đặt lại mật khẩu");
      }
      console.error("Error resetting password:", err);
    } finally {
      setLoading(false);
    }
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
            
            {/* Error and success messages */}
            {error && (
              <div className="auth-message error">
                <IoWarning size={20} />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="auth-message success">
                <IoCheckmarkCircle size={20} />
                <span>{success}</span>
              </div>
            )}
            
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
                  className={`submit-btn ${loading ? 'loading' : ''}`}
                  onClick={handleSubmitEmail}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
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
                    className={`resend-button ${resendDisabled ? 'disabled' : ''}`}
                    onClick={handleResendCode}
                    disabled={resendDisabled || loading}
                  >
                    {resendDisabled 
                      ? `Gửi lại mã sau (${countdown}s)` 
                      : 'Gửi lại mã xác thực'}
                  </button>
                </div>
                <button
                  className={`submit-btn ${loading ? 'loading' : ''}`}
                  onClick={handleSubmitCode}
                  type="submit"
                  disabled={verificationCode.length !== 6 || loading}
                >
                  {loading ? 'Đang kiểm tra...' : 'Xác nhận'}
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
                      minLength={8}
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
                <div className="password-requirements">
                  <p>Mật khẩu phải có ít nhất 8 ký tự</p>
                </div>
                <button
                  className={`submit-btn ${loading ? 'loading' : ''}`}
                  onClick={handleResetPassword}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
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