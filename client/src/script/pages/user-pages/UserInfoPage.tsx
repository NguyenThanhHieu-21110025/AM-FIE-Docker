import "../../../css/InfoPage.css";
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import {
  changeStatusUser,
  deleteUser,
  getUserById,
  updateUser,
  User,
} from "../../interfaces/User";
import Loader from "../../components/Loader";
import { useAuth } from "../../context/AuthContext";
import { FaAngleLeft, FaCircle } from "react-icons/fa";
import { useToast } from "../../hooks/useToast";

const UserInfoPage = () => {
  const [formData, setFormData] = useState<User>({} as User);
  const [mode, setMode] = useState<"info" | "update">("info");
  const { refreshAccessToken, accessToken, _id: accountId, isAdmin } = useAuth();
  const location = useLocation();
  const id = location.pathname.split("/").pop() as string;
  const isMyAccount = id === accountId;
  const ICON_SIZE = 20;
  const { showToast } = useToast();

  const { data, isLoading } = useQuery<User>({
    queryFn: async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            throw new Error("Unable to refresh access token");
          }
        }
        return getUserById(id, token);
      } catch (error: any) {
        showToast("Không thể tải thông tin người dùng", "error");
        throw error;
      }
    },
    queryKey: ["user", id],
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

  async function handleSubmit(
    e:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email) {
      showToast("Vui lòng điền đầy đủ thông tin cần thiết", "warning");
      return;
    }
    
    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          showToast("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại", "error");
          return;
        }
      }
      
      const result = await updateUser(id, formData, token);
      
      if (result) {
        showToast("Cập nhật thông tin người dùng thành công", "success");
        setMode("info");
      } else {
        showToast("Không thể cập nhật thông tin người dùng", "error");
      }
    } catch (error: any) {
      showToast(
        `Lỗi: ${error.response?.data?.message || error.message || "Không xác định"}`, 
        "error"
      );
    }
  }

  async function handleDelete(
    e:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    
    // Confirm deletion
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này không?")) {
      return;
    }
    
    try {
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          showToast("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại", "error");
          return;
        }
      }
      
      const result = await deleteUser(
        id,
        accountId as string,
        isAdmin as boolean,
        token
      );
      
      if (result) {
        showToast("Xóa tài khoản thành công", "success");
        if (isMyAccount) {
          setTimeout(() => window.location.reload(), 1000);
        } else {
          navigate("/user-dashboard");
        }
      } else {
        showToast("Không thể xóa tài khoản", "error");
      }
    } catch (error: any) {
      showToast(
        `Lỗi: ${error.response?.data?.message || error.message || "Không xác định"}`, 
        "error"
      );
    }
  }

  async function handleStatus(
    e:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();
    let token = accessToken;
    if (!token) {
      token = await refreshAccessToken();
      if (!token) {
        throw new Error("Unable to refresh access token");
      }
    }
    const result = await changeStatusUser(
      id,
      accountId as string,
      isAdmin as boolean,
      token
    );
    if (result) window.location.reload();
  }

  const InfoMode = (): ReactNode => {
    return (
      <div className="info-body">
        <div className="long-info">
          <div className="info-header">Tên tài khoản: </div>
          <p>{formData.name}</p>
        </div>
        <div className="long-info">
          <div className="info-header">ID tài khoản: </div>
          <p>{formData.userid}</p>
        </div>
        <div className="normal-info">
          <div className="info-container">
            <div className="info-header">Email:</div>
            <p>{formData.email}</p>
          </div>
          <div className="info-container">
            <div className="info-header">Số điện thoại:</div>
            <p>{formData.phoneNumber || "Không có"}</p>
          </div>
          <div className="info-container">
            <div className="info-header">Chức vụ:</div>
            <p>{formData.position || "Không có"}</p>
          </div>
          <div className="info-container">
            <div className="info-header">Trạng thái:</div>
            <p>
              <FaCircle
                size={ICON_SIZE}
                color={formData.isActive ? "green" : "red"}
              />{" "}
              {formData.status}
            </p>
            {isAdmin && !isMyAccount && (
              <button className="status-btn" onClick={handleStatus}>
                Chuyển trạng thái
              </button>
            )}
          </div>
        </div>
        {(isMyAccount || isAdmin) && (
          <div className="button-container">
            <button className="update-btn" onClick={() => setMode("update")}>
              Cập nhật thông tin
            </button>
            <button className="delete-btn" onClick={handleDelete}>
              Xóa tài khoản
            </button>
          </div>
        )}
      </div>
    );
  };

  const UpdateMode = (): ReactNode => {
    return (
      <form className="info-body">
        <div className="long-info">
          <div className="info-header">Tên tài khoản: </div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        <div className="long-info">
          <div className="info-header">ID tài khoản: </div>
          <input
            type="text"
            name="userid"
            className="read-only"
            value={formData.userid}
            onChange={handleChange}
            readOnly
          />
        </div>
        <div className="normal-info">
          <div className="info-container">
            <div className="info-header">Email:</div>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="info-container">
            <div className="info-header">Số điện thoại:</div>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>
          <div className="info-container">
            <div className="info-header">Chức vụ:</div>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
            />
          </div>
          <div className="info-container">
            <div className="info-header">Trạng thái:</div>
            <input
              type="text"
              name="role"
              value={formData.status}
              onChange={handleChange}
              readOnly
            />
          </div>
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
            onClick={() => navigate("/user-dashboard")}
          >
            <FaAngleLeft size={ICON_SIZE} />
            <p>Trở về</p>
          </div>
          <h1 className="title">
            {mode === "info" ? "Thông Tin" : "Cập Nhật"} Người Dùng
          </h1>
          {isLoading ? <Loader /> : mode === "info" ? InfoMode() : UpdateMode()}
        </div>
      </div>
    </main>
  );
};

export default UserInfoPage;
