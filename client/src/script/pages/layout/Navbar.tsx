import "../../../css/Navbar.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import uteLogo from "../../../assets/ute-logo.png";
import { FaWarehouse, FaUserCircle, FaChartBar, FaRobot } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";

interface Props {
  children: JSX.Element;
}

const Navbar = (props: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin } = useAuth();

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
            </li>
            <li
              className={
                location.pathname.startsWith("/room-dashboard") ? "active" : ""
              }
              onClick={() => navigate("/room-dashboard")}
            >
              <FaLocationDot size={ICON_SIZE} />
              <p>Phòng</p>
            </li>
            {admin && (
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
