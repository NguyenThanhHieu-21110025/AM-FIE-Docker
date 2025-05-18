import "../../../css/Navbar.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import uteLogo from "../../../assets/ute-logo.png";
import { FaWarehouse, FaUserCircle, FaChartBar, FaRobot } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { useEffect, useState } from "react";

interface Props {
  children: JSX.Element;
}

const Navbar = (props: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
    // Theo dõi role và set isAdmin khi role thay đổi
  useEffect(() => {
    const checkAdminStatus = () => {
      // Check role from context first
      if (role === "admin") {
        setIsAdmin(true);
        // Store role in localStorage for persistence
        localStorage.setItem("userRole", role);
        return;
      } 
      
      // If role is not admin but is something else, not admin
      if (role && role !== "admin") {
        setIsAdmin(false);
        // Still store the non-admin role
        localStorage.setItem("userRole", role);
        return;
      }
      
      // If no role in context (undefined/null), check localStorage
      try {
        const userRole = localStorage.getItem("userRole");
        if (userRole === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Error checking local storage for role:", err);
        setIsAdmin(false);
      }
    };
    
    if (!loading) {
      checkAdminStatus();
    }
  }, [role, loading]);
  
  const showNavbar =
    location.pathname !== "/" &&
    location.pathname !== "/login" &&
    location.pathname !== "/register" &&
    location.pathname !== "/forgotPassword";
  const ICON_SIZE = 30;

  return showNavbar ? (
    <div className="ams-body">
      <nav className="navbar-bg">
        <div className="navbar-container">
          <div className="ute-logo" onClick={() => navigate("/")}>
            <img src={uteLogo} alt="UTE Logo" />
            <h1>HCMUTE</h1>
          </div>
          <ul className="navbar-menu">
            <li
              className={
                location.pathname.startsWith("/asset-statistics")
                  ? "active"
                  : ""
              }
              onClick={() => navigate("/asset-statistics")}
            >
              <FaChartBar size={ICON_SIZE} />
              <p>Thống kê</p>
            </li>
            <li
              className={
                location.pathname.startsWith("/asset-dashboard") ? "active" : ""
              }
              onClick={() => navigate("/asset-dashboard")}
            >
              <FaWarehouse size={ICON_SIZE} />
              <p>Tài sản</p>
            </li>            <li
              className={
                location.pathname.startsWith("/room-dashboard") ? "active" : ""
              }
              onClick={() => navigate("/room-dashboard")}
            >
              <FaLocationDot size={ICON_SIZE} />
              <p>Phòng</p>
            </li>
            {isAdmin && (
              <li
                className={
                  location.pathname.startsWith("/user-dashboard")
                    ? "active"
                    : ""
                }
                onClick={() => navigate("/user-dashboard")}
              >
                <FaUserCircle size={ICON_SIZE} />
                <p>Người dùng</p>
              </li>
            )}
            <li 
              className={
                location.pathname.startsWith("/chatbot") ? "active" : ""
              }
              onClick={() => navigate("/chatbot")}
            >
              <FaRobot size={ICON_SIZE} />
              <p>Chatbot</p>
            </li>
          </ul>
        </div>
      </nav>
      {props.children}
    </div>
  ) : (
    <>{props.children}</>
  );
};

export default Navbar;