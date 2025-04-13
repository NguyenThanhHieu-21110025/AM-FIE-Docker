import "../../../../css/Header.css";
import uteFullName from "../../../../assets/uteFullName.png";
import DropdownLogin from "./DropdownLogin";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaChartBar } from "react-icons/fa";
import ThemeToggle from "../../../components/ThemeToggle";
import NotificationDropdown from "../../../components/NotificationDropdown";

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
          <button onClick={() => navigate("/asset-statistics")}>
            <FaChartBar />
            Bảng điều khiển
          </button>
        </div>
        
        <div className="header-right">
          <ThemeToggle />
          <NotificationDropdown />
          <DropdownLogin />
        </div>
      </div>
      
      {showUTEFullLogo && (
        <div className="logo-section">
          <Link to="/">
            <img 
              className="ute-img" 
              src={uteFullName} 
              alt="UTE Full Name"
            />
          </Link>
        </div>
      )}
    </header>
  );
}

export default Header;