import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./pages/layout/Layout";
import LoginPage from "./pages/auth-pages/LoginPage";
import RegisterPage from "./pages/auth-pages/RegisterPage";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/home-page/HomePage";
import AssetDashboardPage from "./pages/asset-pages/AssetDashboardPage";
import { MainRefProvider } from "./context/MainRefContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AssetInfoPage from "./pages/asset-pages/AssetInfoPage";
import CreateAssetPage from "./pages/asset-pages/CreateAssetPage";
import React from "react";
import UserDashboardPage from "./pages/user-pages/UserDashboardPage";
import UserInfoPage from "./pages/user-pages/UserInfoPage";
import RoomDashboardPage from "./pages/room-pages/RoomDashboardPage";
import RoomInfoPage from "./pages/room-pages/RoomInfoPage";
import CreateRoomPage from "./pages/room-pages/CreateRoomPage";
import ForgotPassword from "./pages/auth-pages/ForgotPasswordPage";
import CreateUserPage from "./pages/user-pages/CreateUserPage";
import AssetStatisticsPage from "./pages/asset-dashboard-statistics/AssetStatisticsPage";
import ChatbotPage from "./pages/chatbot/ChatbotPage";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../css/toast.css'

function App() {
  const queryClient = new QueryClient();

  return (
    <>
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <MainRefProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgotPassword" element={<ForgotPassword />} />
                <Route
                  path="/asset-dashboard"
                  element={<ProtectedRoute Component={AssetDashboardPage} />}
                />
                <Route
                  path="/asset-dashboard/:id"
                  element={<ProtectedRoute Component={AssetInfoPage} />}
                />
                <Route
                  path="/asset-dashboard/create"
                  element={<ProtectedRoute Component={CreateAssetPage} />}
                />
                <Route
                  path="/room-dashboard"
                  element={<ProtectedRoute Component={RoomDashboardPage} />}
                />
                <Route
                  path="/room-dashboard/:id"
                  element={<ProtectedRoute Component={RoomInfoPage} />}
                />
                <Route
                  path="/room-dashboard/create"
                  element={<ProtectedRoute Component={CreateRoomPage} />}
                />
                <Route
                  path="/user-dashboard"
                  element={<ProtectedRoute Component={UserDashboardPage} />}
                />
                <Route
                  path="/user-dashboard/:id"
                  element={<ProtectedRoute Component={UserInfoPage} />}
                />
                <Route
                  path="/user-dashboard/create"
                  element={<ProtectedRoute Component={CreateUserPage} />}
                />
                <Route
                  path="/asset-statistics"
                  element={<ProtectedRoute Component={AssetStatisticsPage} />}
                />
                <Route
                  path="/chatbot"
                  element={<ProtectedRoute Component={ChatbotPage} />}
                />
              </Routes>
            </Layout>
          </MainRefProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
    <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}
interface ProtectedRouteProps {
  Component: React.FC;
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ Component }) => {
  const authContext = React.useContext(AuthContext);
  const [retryCount, setRetryCount] = useState(0);

  if (!authContext) {
    throw new Error("useContext must be used within an AuthProvider");
  }

  const { email, loading, refreshAccessToken } = authContext;
  
  // Add a single retry when authentication fails
  useEffect(() => {
    if (!loading && !email && retryCount < 1) {
      console.log("Authentication failed, trying refresh once more...");
      refreshAccessToken().catch(console.error);
      setRetryCount(prev => prev + 1);
    }
  }, [email, loading, refreshAccessToken, retryCount]);

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  return <Component />;
};
export default App;
