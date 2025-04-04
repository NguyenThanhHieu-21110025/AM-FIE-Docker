import "../../../css/StatisticsPage.css";
import { useMainRef, useScrollToMain } from "../../context/MainRefContext";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getAssetList } from "../../interfaces/Asset";
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
  bgColor: string;
}

interface AssetsByRoom {
  name: string;
  value: number;
}

interface AssetsByValue {
  range: string;
  quantity: number;
}

// More ShadCN-like colors (muted, harmonious)
const COLORS = [
  "#2563eb", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#f97316", // orange
  "#8b5cf6", // violet
  "#ec4899", // pink
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

  // Data loading queries - no changes needed here
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

    // Calculate stats - no changes needed here
    const totalAssets = assetList.reduce(
      (sum, asset) => sum + (asset.accounting?.quantity || 0),
      0
    );

    const totalValue = assetList.reduce(
      (sum, asset) => sum + (asset.accounting?.origin_price || 0),
      0
    );

    const remainingValue = assetList.reduce(
      (sum, asset) => sum + (asset.remaining_value || 0),
      0
    );

    const usedRooms = new Set(
      assetList
        .map((asset) =>
          typeof asset.location === "object"
            ? asset.location?._id
            : asset.location
        )
        .filter(Boolean)
    );

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

  // Updated stat cards with ShadCN-style colors
  const statCards: StatCard[] = [
    {
      title: "Tổng số tài sản",
      value: stats.totalAssets,
      icon: <FaWarehouse size={24} />,
      color: "#2563eb",
      bgColor: "rgba(37, 99, 235, 0.1)",
    },
    {
      title: "Nguyên giá",
      value: formatPrice(stats.totalValue),
      icon: <FaCoins size={24} />,
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.1)",
    },
    {
      title: "Giá trị còn lại",
      value: formatPrice(stats.remainingValue),
      icon: <FaTools size={24} />,
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.1)",
    },
    {
      title: "Phòng có tài sản",
      value: stats.uniqueRooms,
      icon: <FaBuilding size={24} />,
      color: "#8b5cf6",
      bgColor: "rgba(139, 92, 246, 0.1)",
    },
  ];

  if (isLoadingUser || isLoadingRoom || isLoadingAsset) {
    return <Loader />;
  }

  return (
    <main ref={mainRef} className="dashboard-page">
      <h1 className="title">Thống kê tài sản</h1>
      <div className="dashboard-container">
        {/* Stats Cards - ShadCN style */}
        <div className="stats-cards">
          {statCards.map((card, index) => (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: card.bgColor, color: card.color }}>
                {card.icon}
              </div>
              <div className="stat-content">
                <h3>{card.title}</h3>
                <p className="stat-value">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section - ShadCN style */}
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
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} tài sản`, "Số lượng"]}
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--card-foreground)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => (
                    <span style={{ color: 'var(--card-foreground)' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="chart-container">
            <h2>Tài sản theo giá trị</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.assetsByValue}>
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: 'var(--card-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis 
                  tick={{ fill: 'var(--card-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip
                  formatter={(value) => [`${value} tài sản`, "Số lượng"]}
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--card-foreground)'
                  }}
                />
                <Legend 
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span style={{ color: 'var(--card-foreground)' }}>{value}</span>
                  )}
                />
                <Bar
                  dataKey="quantity"
                  name="Số lượng tài sản"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
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