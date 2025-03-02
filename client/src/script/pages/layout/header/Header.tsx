import "../../../../css/Header.css";
import uteFullName from "../../../../assets/uteFullName.png";
import DropdownLogin from "./DropdownLogin";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaChartBar } from "react-icons/fa";

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const showUTEFullLogo =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgotPassword";

  return (
    <header>
      <div className="header-section">
        <div className="nav-buttons">
          <button onClick={() => navigate("/")}>
            <FaHome />
            Trang chủ
          </button>
          <button onClick={() => navigate("/asset-dashboard")}>
            <FaChartBar />
            Bảng điều khiển
          </button>
        </div>
        <DropdownLogin />
      </div>
      {showUTEFullLogo && (
        <div className="logo-section">
          <Link to="/">
            <img 
              className="ute-img" 
              src={uteFullName} 
              alt="UTE Logo"
            />
          </Link>
        </div>
      )}
    </header>
  );
}

export default Header;