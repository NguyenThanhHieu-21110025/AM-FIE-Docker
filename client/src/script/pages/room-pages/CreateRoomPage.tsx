import "../../../css/InfoPage.css";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useAuth } from "../../context/AuthContext";
import { FaAngleLeft } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Room,
  RoomRequest,
  createRoom,
} from "../../interfaces/Room";
import { useQuery } from "@tanstack/react-query";
import { getUserList, User } from "../../interfaces/User";
import Loader from "../../components/Loader";
import { useToast } from "../../hooks/useToast";

const CreateRoomPage = () => {
  const initialFormData: Room = {
    name: "",
    building: "",
    responsible_user: "",
    note: "",
    // Các trường khác sẽ được tự động khởi tạo bởi server
  } as Room;

  const [formData, setFormData] = useState<Room>(initialFormData);
  const { refreshAccessToken, accessToken } = useAuth();
  const ICON_SIZE = 20;
  const { showToast } = useToast();

  const navigate = useNavigate();
  const mainRef = useMainRef();
  useScrollToMain();

  const { data: userList, isLoading } = useQuery<User[]>({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      return getUserList(token);
    },
    queryKey: ["userList"],
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    if (typeof userList === "undefined") return;
    const { name, value } = e.target;
    
    if (name === "responsible_user") {
      const selectedUser = userList.find(user => user._id === value);
      if (!selectedUser) return;
      
      setFormData((prevState) => ({
        ...prevState,
        responsible_user: selectedUser._id,
        responsible_user_name: selectedUser.name,
      }));
    }
  }

  async function handleSubmit(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name) {
      showToast("Vui lòng nhập tên phòng", "warning"); 
      return;
    }
    
    if (!formData.building) {
      showToast("Vui lòng nhập tên tòa nhà", "warning"); 
      return;
    }

    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          showToast("Không thể xác thực. Vui lòng đăng nhập lại.", "error"); 
          return;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { responsible_user_name, ...filteredData } = formData;
      const roomRequest = { ...filteredData } as RoomRequest;
      
      const result = await createRoom(roomRequest, token);
      
      if (result) {
        showToast("Tạo phòng thành công", "success"); 
        navigate("/room-dashboard");
      } else {
        showToast("Không thể tạo phòng. Vui lòng thử lại!", "error"); 
      }
    } catch (error: any) {
      console.error("Error creating room:", error);
      
      // Show detailed error information from server if available
      if (error.response?.data) {
        const errorMsg = typeof error.response.data === 'string' 
          ? error.response.data 
          : error.response.data.message || JSON.stringify(error.response.data);
        showToast(`Lỗi: ${errorMsg}`, "error"); 
      } else {
        showToast("Đã xảy ra lỗi khi tạo phòng: " + (error.message || "Unknown error"), "error"); 
      }
    }
  }

  return (
    <main ref={mainRef} className="info-page">
      <div className="container">
        <div className="layout">
          <div className="back-button" onClick={() => navigate("/room-dashboard")}>
            <FaAngleLeft size={ICON_SIZE} />
            <p>Trở về</p>
          </div>
          <h1 className="title">Tạo Phòng Mới</h1>
          
          {isLoading ? (
            <Loader />
          ) : (
            <form className="info-body">
              {/* Basic Information Section */}
              <div className="section-divider">
                <h3 className="section-title">Thông tin cơ bản</h3>
              </div>

              <div className="long-info">
                <div className="info-header">
                  Tên phòng: <span className="required">*</span>
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="long-info">
                <div className="info-header">
                  Tên tòa nhà: <span className="required">*</span>
                </div>
                <input
                  type="text"
                  name="building"
                  value={formData.building || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="long-info">
                <div className="info-header">Người chịu trách nhiệm: </div>
                <select
                  name="responsible_user"
                  onChange={handleSelect}
                  value={formData.responsible_user_name || ""}
                >
                  <option value="">Chọn người chịu trách nhiệm</option>
                  {userList?.map((user) => (
                    <option key={user._id} value={user._id}>
                      {`${user.name} - ${user.userid || ""}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="long-info">
                <div className="info-header">Ghi chú: </div>
                <textarea
                  name="note"
                  value={formData.note || ""}
                  onChange={handleChange}
                />
              </div>
              
              <div className="button-container">
                <button className="submit-btn" onClick={handleSubmit}>
                  Tạo phòng
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
};

export default CreateRoomPage;