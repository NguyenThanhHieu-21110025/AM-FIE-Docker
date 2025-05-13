import "../../../css/DashboardPage.css";
import { useQuery } from "@tanstack/react-query";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import Table from "../../components/Table";
import { roomTableColumns } from "../../utils/tableColumns";
import Loader from "../../components/Loader";
import { useAuth } from "../../context/AuthContext";
import { getRoomList } from "../../interfaces/Room";
import { getUserList, User } from "../../interfaces/User";
import { useToast } from "../../hooks/useToast"; 

const RoomDashboardPage = () => {
  const mainRef = useMainRef();
  const { refreshAccessToken, accessToken } = useAuth();
  const { showToast } = useToast(); 

  useScrollToMain();

  const { data: userList, isLoading: isLoadingUser } = useQuery({
    queryFn: async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            throw new Error("Unable to refresh access token");
          }
        }
        return getUserList(token);
      } catch (error) {
        showToast("Không thể tải danh sách người dùng", "error"); 
        throw error;
      }
    },
    queryKey: ["userList"],
  });
  
  const { data: roomList, isLoading: isLoadingRoom } = useQuery({
    queryFn: async () => {
      try {
        let token = accessToken;
        if (!token) {
          token = await refreshAccessToken();
          if (!token) {
            throw new Error("Unable to refresh access token");
          }
        }
        return getRoomList(token, userList as User[]);
      } catch (error) {
        showToast("Không thể tải danh sách phòng", "error"); 
        throw error;
      }
    },
    queryKey: ["roomList", userList],
    enabled: !!userList && userList.length > 0,
  });

  return (
    <main className="dashboard-page" ref={mainRef}>
      <div className="title">Danh Sách Địa Chỉ Phòng</div>
      {isLoadingUser || isLoadingRoom || typeof roomList === "undefined" ? (
        <Loader />
      ) : (
        <Table
          data={roomList}
          columns={roomTableColumns}
          baseURL="/room-dashboard"
        />
      )}
    </main>
  );
};

export default RoomDashboardPage;
