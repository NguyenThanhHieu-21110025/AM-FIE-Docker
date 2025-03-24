import "../../../css/StatisticsPage.css";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Asset, getAssetList } from "../../interfaces/Asset";
import { Room, getRoomList } from "../../interfaces/Room";
import { User, getUserList } from "../../interfaces/User";
import Loader from "../../components/Loader";
import { formatPrice } from "../../utils/formatPrice";
import { FaBuilding, FaCoins, FaTools, FaWarehouse } from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface AssetsByRoom {
  name: string;
  value: number;
}

interface AssetsByValue {
  range: string;
  quantity: number;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

const AssetStatisticsPage = () => {
  const mainRef = useMainRef();
  const { refreshAccessToken, accessToken } = useAuth();
  useScrollToMain();

  const [stats, setStats] = useState<{
    totalAssets: number;
    totalValue: number;
    remainingValue: number;
    uniqueRooms: number;
    assetsByRoom: AssetsByRoom[];
    assetsByValue: AssetsByValue[];
  }>({
    totalAssets: 0,
    totalValue: 0,
    remainingValue: 0,
    uniqueRooms: 0,
    assetsByRoom: [],
    assetsByValue: [],
  });

  const { data: userList, isLoading: isLoadingUser } = useQuery({
    queryFn: async () => {
      const token = (await refreshAccessToken()) || accessToken;
      if (!token) throw new Error("Unable to refresh access token");
      return getUserList(token);
    },
    queryKey: ["userList"],
  });

  const { data: roomList, isLoading: isLoadingRoom } = useQuery({
    queryFn: async () => {
      const token = (await refreshAccessToken()) || accessToken;
      if (!token) throw new Error("Unable to refresh access token");
      return getRoomList(token, userList as User[]);
    },
    queryKey: ["roomList", userList],
    enabled: !!userList && userList.length > 0,
  });

  const { data: assetList, isLoading: isLoadingAsset } = useQuery({
    queryFn: async () => {
      const token = (await refreshAccessToken()) || accessToken;
      if (!token) throw new Error("Unable to refresh access token");
      return getAssetList(token, userList as User[], roomList as Room[]);
    },
    queryKey: ["assetList", userList, roomList],
    enabled:
      !!userList && !!roomList && userList.length > 0 && roomList.length > 0,
  });

  useEffect(() => {
    if (!assetList) return;

    // Calculate total assets
    const totalAssets = assetList.reduce(
      (sum, asset) => sum + (asset.accounting?.quantity || 0),
      0
    );

    // Calculate total value
    const totalValue = assetList.reduce(
      (sum, asset) => sum + (asset.accounting?.origin_price || 0),
      0
    );

    // Calculate remaining value after depreciation
    const remainingValue = assetList.reduce(
      (sum, asset) => sum + (asset.remaining_value || 0),
      0
    );

    // Get unique rooms with assets
    const usedRooms = new Set(
      assetList
        .map((asset) =>
          typeof asset.location === "object"
            ? asset.location?._id
            : asset.location
        )
        .filter(Boolean)
    );

    // Group assets by room for pie chart
    const roomAssetMap = new Map<string, number>();

    assetList.forEach((asset) => {
      const roomId =
        typeof asset.location === "object"
          ? asset.location?._id
          : asset.location;

      const roomName =
        typeof asset.location === "object"
          ? asset.location?.name
          : roomList?.find((room) => room._id === asset.location)?.name ||
            "Không xác định";

      if (roomId) {
        const existingCount = roomAssetMap.get(roomName) || 0;
        roomAssetMap.set(
          roomName,
          existingCount + (asset.accounting?.quantity || 0)
        );
      }
    });

    const assetsByRoom = Array.from(roomAssetMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Take top 6 for better visualization

    // Group assets by value range
    const valueRanges = [
      { min: 0, max: 1000000, label: "0-1M" },
      { min: 1000000, max: 5000000, label: "1M-5M" },
      { min: 5000000, max: 10000000, label: "5M-10M" },
      { min: 10000000, max: 50000000, label: "10M-50M" },
      { min: 50000000, max: Infinity, label: "> 50M" },
    ];

    const valueCounter = valueRanges.reduce((acc, range) => {
      acc[range.label] = 0;
      return acc;
    }, {} as Record<string, number>);

    assetList.forEach((asset) => {
      const value = asset.accounting?.origin_price || 0;
      const range = valueRanges.find((r) => value >= r.min && value < r.max);
      if (range) {
        valueCounter[range.label] += 1;
      }
    });

    const assetsByValue = Object.entries(valueCounter).map(
      ([range, quantity]) => ({ range, quantity })
    );

    setStats({
      totalAssets,
      totalValue,
      remainingValue,
      uniqueRooms: usedRooms.size,
      assetsByRoom,
      assetsByValue,
    });
  }, [assetList, roomList]);

  const statCards: StatCard[] = [
    {
      title: "Tổng số tài sản",
      value: stats.totalAssets,
      icon: <FaWarehouse size={30} />,
      color: "#0088FE",
    },
    {
      title: "Nguyên giá",
      value: formatPrice(stats.totalValue),
      icon: <FaCoins size={30} />,
      color: "#00C49F",
    },
    {
      title: "Giá trị còn lại",
      value: formatPrice(stats.remainingValue),
      icon: <FaTools size={30} />,
      color: "#FFBB28",
    },
    {
      title: "Phòng có tài sản",
      value: stats.uniqueRooms,
      icon: <FaBuilding size={30} />,
      color: "#FF8042",
    },
  ];

  if (isLoadingUser || isLoadingRoom || isLoadingAsset) {
    return <Loader />;
  }

  return (
    <main ref={mainRef} className="dashboard-page">
      <h1 className="title">Thống kê tài sản</h1>
      <div className="dashboard-container">
        {/* Stats Cards */}
        <div className="stats-cards">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="stat-card"
              style={{ borderLeft: `4px solid ${card.color}` }}
            >
              <div className="stat-icon" style={{ color: card.color }}>
                {card.icon}
              </div>
              <div className="stat-content">
                <h3>{card.title}</h3>
                <p className="stat-value">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Pie Chart */}
          <div className="chart-container">
            <h2>Tài sản theo phòng</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.assetsByRoom}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {stats.assetsByRoom.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} tài sản`, "Số lượng"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="chart-container">
            <h2>Tài sản theo giá trị</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.assetsByValue}>
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`${value} tài sản`, "Số lượng"]}
                />
                <Legend />
                <Bar
                  dataKey="quantity"
                  name="Số lượng tài sản"
                  fill="#8884d8"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AssetStatisticsPage;
