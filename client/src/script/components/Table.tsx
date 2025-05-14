import "../../css/Table.css";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import {
  FaSort,
  FaSortDown,
  FaSortUp,
  FaPlus,
  FaSearch,
  FaFileExcel,
} from "react-icons/fa";
import { FilterSidebar } from "./FilterSideBar";
import { Link, useNavigate } from "react-router-dom";
import { Column } from "../utils/tableColumns";
import { useLocation } from "react-router-dom";
import { Room } from "../interfaces/Room";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";


interface Props {
  data: any[];
  columns: Column[];
  baseURL: string;
  roomList?: Room[];
  onRoomSelect?: (roomId: string) => void;
  showExportButton?: boolean;
  exportEndpoint?: string;
  multiple?: boolean;

}

const Table = ({
  data,
  columns,
  baseURL,
  roomList,
  onRoomSelect,
  showExportButton = false,
  exportEndpoint = "/export/export",
}: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filtering, setFiltering] = useState("");
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomSearch, setRoomSearch] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false); // điều khiển hiển thị popup
  const location = useLocation();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const navigate = useNavigate();
  const { refreshAccessToken, accessToken } = useAuth();

  const isAssetDashboard = location.pathname === "/asset-dashboard";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/export/export/types`)
      .then(res => res.json())
      .then(data => {
        setTypes(data.types); //mảng types
      })
      .catch(error => {
        console.error("Failed to load export types", error);
      });
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      pagination: pagination,
      sorting: sorting,
      globalFilter: filtering,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
  });

  // Handle Excel export
  const handleExportExcel = async () => {
    if (selectedTypes.length === 0) {
      alert("Vui lòng chọn ít nhất một loại dữ liệu để xuất");
      return;
    }

    try {
      setIsExporting(true);
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
        if (!token) {
          throw new Error("Unable to refresh access token");
        }
      }

      let response: Response;

      if (selectedTypes.length === 1) {
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/export/export/${selectedTypes[0]}`,
          {
            headers: {
              token: `Bearer ${token}`,
            },
          }
        );
      } else {
        response = await fetch(`${import.meta.env.VITE_API_URL}/export/export/multiple`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: `Bearer ${token}`,
          },
          body: JSON.stringify({ types: selectedTypes }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Xuất dữ liệu thất bại");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `export-${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Xuất dữ liệu thất bại: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };


  const handleRoomSelection = (roomId: string) => {
    setSelectedRooms((prev) => {
      const isSelected = prev.includes(roomId);
      if (isSelected) {
        return prev.filter((id) => id !== roomId);
      }
      return [...prev, roomId];
    });
  };

  const handleApplyRoomFilter = () => {
    // If no rooms selected or "All rooms" selected, show all assets
    if (selectedRooms.length === 0) {
      onRoomSelect?.("");
      setShowRoomModal(false);
      return;
    }

    // Pass selected room IDs to filter assets
    onRoomSelect?.(selectedRooms.join(","));
    setShowRoomModal(false);
  };

  const filteredRooms = roomList?.filter((room) =>
    `${room.name} ${room.building}`
      .toLowerCase()
      .includes(roomSearch.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Filter Sidebar */}
      <FilterSidebar table={table} columns={columns} />

      {/* Main Table Container */}
      <div className="table-background">
        {/* Table Header Actions */}
        <div className="table-buttons">
          {/* Search Bar */}
          <div className="search-bar">
            <div className="search-icon">
              <FaSearch size={16} />
            </div>
            <input
              type="text"
              value={filtering}
              onChange={(e) => setFiltering(e.target.value)}
              placeholder="Tìm kiếm..."
            />
          </div>

          {/* Action Buttons */}
          <div className="button-group">
            {isAssetDashboard && roomList && (
              <button
                className="search-btn"
                onClick={() => setShowRoomModal(true)}
              >
                <FaSearch size={16} />
                <span>Tìm theo phòng</span>
              </button>
            )}

            <div className="table-container">
              {showExportButton && (
                <div style={{ position: "relative" }}>
                  <button
                    className="export-btn"
                    onClick={() => {
                      console.log("Clicked Export button");
                      setShowExportPopup(true); //set show popup to true
                    }}
                    disabled={isExporting}
                  >
                    <FaFileExcel size={16} />
                    <span>{isExporting ? "Đang xuất..." : "Xuất Excel"}</span>
                  </button>

                  {showExportPopup && (
                    <div className="export-popup">
                      <div className="popup-content">
                        <h4>Chọn loại dữ liệu để xuất</h4>
                        <div className="checkbox-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedTypes.length === types.length}
                              onChange={(e) => {
                                setSelectedTypes(e.target.checked ? types : []);
                              }}
                            />
                            Chọn tất cả
                          </label>
                          {types.map((type) => (
                            <label key={type}>
                              <input
                                type="checkbox"
                                value={type}
                                checked={selectedTypes.includes(type)}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setSelectedTypes((prev) =>
                                    prev.includes(value)
                                      ? prev.filter((t) => t !== value)
                                      : [...prev, value]
                                  );
                                }}
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                        <div className="popup-actions">
                          <button
                            onClick={() => {
                              handleExportExcel();
                              setShowExportPopup(false);
                            }}
                            disabled={selectedTypes.length === 0}
                          >
                            Xác nhận xuất
                          </button>
                          <button onClick={() => setShowExportPopup(false)}>Hủy</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            <div
              onClick={() => navigate(`${baseURL}/create`)}
              className="create-btn"
            >
              <FaPlus size={22} className="icon" />
              <label>Tạo mới</label>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-container">
          <table className="table-grid">
            {/* Table Header */}
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan} // Add colSpan for grouped headers
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {!header.isPlaceholder && (
                        <div>
                          {/* Column Header */}
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}

                          {/* Sort Icons */}
                          <span className="inline-block w-4">
                            {header.column.getCanSort() &&
                              {
                                asc: <FaSortUp className="icon" />,
                                desc: <FaSortDown className="icon" />,
                                false: <FaSort className="icon" />,
                              }[
                              (header.column.getIsSorted() as string) ??
                              "false"
                              ]}
                          </span>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Table Body */}
            <tbody>
              {table.getRowModel().rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell, index) =>
                    index === 0 ? (
                      <td key={cell.id}>
                        <Link to={`${baseURL}/${data[rowIndex]._id}`}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </Link>
                      </td>
                    ) : (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>

            {/* Table Footer */}
            <tfoot />
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span aria-hidden="true">«</span>
          </button>
          <button
            className="pagination-btn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span aria-hidden="true">‹</span>
          </button>

          {/* Show only 5 page buttons */}
          {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
            const pageIndex = table.getState().pagination.pageIndex;
            let buttonIndex;

            if (table.getPageCount() <= 5) {
              buttonIndex = i;
            } else if (pageIndex < 3) {
              buttonIndex = i;
            } else if (pageIndex > table.getPageCount() - 3) {
              buttonIndex = table.getPageCount() - 5 + i;
            } else {
              buttonIndex = pageIndex - 2 + i;
            }

            return (
              <button
                key={buttonIndex}
                className={`pagination-btn ${pageIndex === buttonIndex ? "active-page" : ""
                  }`}
                onClick={() => table.setPageIndex(buttonIndex)}
              >
                {buttonIndex + 1}
              </button>
            );
          })}

          <button
            className="pagination-btn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span aria-hidden="true">›</span>
          </button>
          <button
            className="pagination-btn"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span aria-hidden="true">»</span>
          </button>
        </div>
      </div>

      {/* Room Selection Modal */}
      {showRoomModal && roomList && (
        <Modal title="Chọn phòng" onClose={() => setShowRoomModal(false)}>
          <div className="modal-body">
            <div className="room-search">
              <input
                type="text"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Tìm kiếm phòng..."
              />
              <FaSearch className="search-icon" />
            </div>

            <div className="room-list">
              <label className="room-item">
                <input
                  type="checkbox"
                  checked={selectedRooms.length === 0}
                  onChange={() => setSelectedRooms([])}
                />
                <span className="room-text">Tất cả phòng</span>
              </label>

              {filteredRooms?.map((room) => (
                <label key={room._id} className="room-item">
                  <input
                    type="checkbox"
                    checked={selectedRooms.includes(room._id)}
                    onChange={() => handleRoomSelection(room._id)}
                  />
                  <span className="room-text">{`${room.fullName}`}</span>
                </label>
              ))}
            </div>

            <div className="modal-footer">
              <button className="apply-btn" onClick={handleApplyRoomFilter}>
                Áp dụng
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowRoomModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Table;
