import "../../../css/RoomInfoPage.css";
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { getUserList, User } from "../../interfaces/User";
import Loader from "../../components/Loader";
import { useAuth } from "../../context/AuthContext";
import { FaAngleLeft, FaTable } from "react-icons/fa";
import {
  Room,
  RoomRequest,
  deleteRoom,
  getRoomById,
  updateRoom,
} from "../../interfaces/Room";
import { useToast } from "../../hooks/useToast";

const RoomInfoPage = () => {
  const [formData, setFormData] = useState<Room>({} as Room);
  const [mode, setMode] = useState<"info" | "update">("info");
  const { refreshAccessToken, accessToken } = useAuth();
  const location = useLocation();
  const id = location.pathname.split("/").pop() as string;
  const ICON_SIZE = 20;
  const { showToast } = useToast();

  const { data, isLoading: isLoadingRoom } = useQuery<Room>({
    queryFn: async () => {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }
      return getRoomById(id, token);
    },
    queryKey: ["room", id],
  });

  function getUserId(user: string | { _id: string; name: string; userid?: string }): string {
    if (typeof user === 'object' && user !== null) {
      return user._id;
    }
    return user || "";
  }
  const { data: userList, isLoading: isLoadingUserList } = useQuery<User[]>({
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
    queryKey: ["user"],
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const navigate = useNavigate();
  const mainRef = useMainRef();
  useScrollToMain();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name } = e.target;
    const value =
      e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    if (typeof userList === "undefined") return;
    const { name, _id } = userList.find(
      (user) => user._id === e.target.value
    ) as User;
    console.log(name, _id);
    setFormData((prevState) => ({
      ...prevState,
      responsible_user: _id,
      responsible_user_name: name,
    }));
  }

  async function handleSubmit(
    e:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          showToast("Không thể xác thực. Vui lòng đăng nhập lại.", "error"); 
          return;
        }
      }
      
      // Validate required fields
      if (!formData.name) {
        showToast("Vui lòng nhập tên phòng", "warning"); 
        return;
      }
      
      if (!formData.building) {
        showToast("Vui lòng nhập tên tòa nhà", "warning"); 
        return;
      }

      const { responsible_user_name, ...filteredData } = formData;
      const roomRequest = { ...filteredData } as RoomRequest;
      
      const result = await updateRoom(id, roomRequest, token);
      
      if (result) {
        showToast("Cập nhật phòng thành công", "success"); 
        setMode("info");
      } else {
        showToast("Không thể cập nhật phòng. Vui lòng thử lại!", "error"); 
      }
    } catch (error: any) {
      console.error("Error updating room:", error);
      
      if (error.response?.data) {
        showToast(`Lỗi: ${error.response.data.message || error.message}`, "error"); 
      } else {
        showToast("Đã xảy ra lỗi khi cập nhật phòng", "error"); 
      }
    }
  }

  async function handleDelete(
    e:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    
    if (!confirm("Bạn có chắc chắn muốn xóa phòng này không?")) {
      return;
    }
    
    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          showToast("Không thể xác thực. Vui lòng đăng nhập lại.", "error"); // Thay thế addAlert
          return;
        }
      }
      
      const result = await deleteRoom(id, token);
      
      if (result) {
        showToast("Xóa phòng thành công", "success"); // Thay thế addAlert
        navigate("/room-dashboard");
      } else {
        showToast("Không thể xóa phòng. Vui lòng thử lại!", "error"); // Thay thế addAlert
      }
    } catch (error: any) {
      console.error("Error deleting room:", error);
      
      if (error.response?.data) {
        showToast(`Lỗi: ${error.response.data.message || error.message}`, "error"); // Thay thế addAlert
      } else {
        showToast("Đã xảy ra lỗi khi xóa phòng", "error"); // Thay thế addAlert
      }
    }
  }

  const InfoMode = (): ReactNode => {
    const responsibleUserId = getUserId(formData.responsible_user);
    
    const responsibleUser = userList?.find(user => user._id === responsibleUserId);
    
    return (
      <div className="info-body">
        <div className="long-info">
          <div className="info-header">Tên phòng: </div>
          <p>{formData.name}</p>
        </div>
        <div className="long-info">
          <div className="info-header">Tên tòa nhà: </div>
          <p>{formData.building}</p>
        </div>
        <div className="long-info">
          <div className="info-header">Người chịu trách nhiệm: </div>
          <p>
            {formData.responsible_user_name 
              ? `${formData.responsible_user_name}${responsibleUser?.userid ? ' - ' + responsibleUser.userid : ''}` 
              : 'Không có người chịu trách nhiệm'}
          </p>
        </div>        <div className="button-container">
          <button className="update-btn" onClick={() => setMode("update")}>
            Cập nhật thông tin
          </button>
          <button className="delete-btn" onClick={handleDelete}>
            Xóa phòng
          </button>          <button 
            className="view-assets-btn" 
            onClick={() => navigate(`/asset-dashboard?room=${id}&roomName=${encodeURIComponent(formData.fullName || formData.name)}`)}
          >
            <FaTable size={16} />
            Xem tài sản phòng này
          </button>
        </div>
      </div>
    );
  };

  const UpdateMode = (): ReactNode => {
    return (
      <form className="info-body">
        <div className="long-info">
          <div className="info-header">Tên phòng: </div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        <div className="long-info">
          <div className="info-header">Tên tòa nhà: </div>
          <input
            type="text"
            name="building"
            value={formData.building}
            onChange={handleChange}
          />
        </div>
        <div className="long-info">
          <div className="info-header">Người chịu trách nhiệm: </div>
          <select
            id="dropdown"
            className="dropdown"
            name="responsible_user"
            onChange={handleSelect}
            aria-placeholder="Chọn người chịu trách nhiệm"
            value={getUserId(formData.responsible_user)}
          >
            <option value="">Không có người chịu trách nhiệm</option>
            {userList?.map((user) => (
              <option key={user._id} value={user._id}>
                {`${user.name} - ${user.userid || ""}`}
              </option>
            ))}
          </select>
        </div>
        <div className="button-container">
          <button className="submit-btn" onClick={handleSubmit}>
            Lưu thông tin
          </button>
          <button className="cancel-btn" onClick={() => setMode("info")}>
            Hủy cập nhật
          </button>
        </div>
      </form>
    );
  };

  return (
    <main ref={mainRef} className="info-page">
      <div className="container">
        <div className="layout">
          <div
            className="back-button"
            onClick={() => navigate("/room-dashboard")}
          >
            <FaAngleLeft size={ICON_SIZE} />
            <p>Trở về</p>
          </div>
          <h1 className="title">
            {mode === "info" ? "Thông Tin" : "Cập Nhật"} Phòng
          </h1>
          {isLoadingRoom || isLoadingUserList ? (
            <Loader />
          ) : mode === "info" ? (
            InfoMode()
          ) : (
            UpdateMode()
          )}
        </div>
      </div>
    </main>
  );
};

export default RoomInfoPage;
