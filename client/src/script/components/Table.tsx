import "../../css/Table.css";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  getFilteredRowModel,
  PaginationState,
} from "@tanstack/react-table";
import { useState, useEffect, useMemo } from "react";
import {
  FaSort,
  FaSortDown,
  FaSortUp,
  FaPlus,
  FaSearch,
  FaFileExcel,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaRegFileExcel,
  FaTable,
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
  title?: string;
}

const Table = ({
  data,
  columns,
  baseURL,
  roomList,
  onRoomSelect,
  showExportButton = false,
  exportEndpoint = "/export/export",
  title,
}: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filtering, setFiltering] = useState("");
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomSearch, setRoomSearch] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const location = useLocation();
  const [pagination, setPagination] = useState<PaginationState>({ 
    pageIndex: 0, 
    pageSize: 10 
  });
  const navigate = useNavigate();
  const { refreshAccessToken, accessToken } = useAuth();

  const isAssetDashboard = location.pathname === "/asset-dashboard";
  
  // Paginate options
  const pageSizeOptions = [5, 10, 20, 30, 50];

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/export/export/types`)
      .then((res) => res.json())
      .then((data) => {
        setTypes(data.types);
      })
      .catch((error) => {
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
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/export/export/multiple`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: `Bearer ${token}`,
            },
            body: JSON.stringify({ types: selectedTypes }),
          }
        );
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
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.classList.add('export-success-message');
      successMessage.textContent = 'Xuất dữ liệu thành công!';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        successMessage.classList.add('show');
      }, 100);
      
      setTimeout(() => {
        successMessage.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(successMessage);
        }, 300);
      }, 3000);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        "Xuất dữ liệu thất bại: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsExporting(false);
      setShowExportPopup(false);
    }
  };

  const handleSelectAllTypes = () => {
    setSelectedTypes([...types]);
  };

  const handleDeselectAllTypes = () => {
    setSelectedTypes([]);
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

  const filteredRooms = useMemo(() => 
    roomList?.filter((room) =>
      `${room.name} ${room.building}`
        .toLowerCase()
        .includes(roomSearch.toLowerCase())
    ), [roomList, roomSearch]
  );

  // Calculate pagination information
  const { pageSize, pageIndex } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();
  const firstRow = pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="relative">
      {/* Filter Sidebar */}
      <FilterSidebar table={table} columns={columns} />

      {/* Main Table Container */}
      <div className="table-background">
        {/* Optional Title */}
        {title && (
          <div className="table-title">
            <h2>{title}</h2>
          </div>
        )}
      
        {/* Table Header Actions */}
        <div className="table-buttons">
          {/* Search Bar */}
          <div className="search-bar">
            <FaSearch className="search-icon" />
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

            {showExportButton && (
              <button
                className="export-btn"
                onClick={() => setShowExportPopup(true)}
                disabled={isExporting}
              >
                <FaRegFileExcel size={16} />
                <span>{isExporting ? "Đang xuất..." : "Xuất Excel"}</span>
              </button>
            )}

            <button
              onClick={() => navigate(`${baseURL}/create`)}
              className="create-btn"
            >
              <FaPlus size={16} />
              <span>Tạo mới</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-container">
          {data.length > 0 ? (
            <table className="table-grid">
              {/* Table Header */}
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        onClick={header.column.getToggleSortingHandler()}
                        aria-sort={header.column.getIsSorted() === 'asc' 
                          ? 'ascending' 
                          : header.column.getIsSorted() === 'desc' 
                            ? 'descending' 
                            : 'none'}
                      >
                        {!header.isPlaceholder && (
                          <div className="header-content">
                            {/* Column Header */}
                            <span className="header-text">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>

                            {/* Sort Icons */}
                            {header.column.getCanSort() && (
                              <span className="sort-icon">
                                {
                                  {
                                    asc: <FaSortUp />,
                                    desc: <FaSortDown />,
                                    false: <FaSort />,
                                  }[
                                    (header.column.getIsSorted() as string) ??
                                      "false"
                                  ]
                                }
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              {/* Table Body */}
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const rowData = row.original as any;

                  return (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell, index) =>
                        index === 0 ? (
                          <td key={cell.id}>
                            <Link to={`${baseURL}/${rowData._id}`}>
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
                  );
                })}
              </tbody>

              {/* Table Footer */}
              <tfoot />
            </table>
          ) : (
            // Empty state
            <div className="table-empty-state">
              <FaTable className="empty-icon" />
              <p className="empty-text">Không có dữ liệu để hiển thị</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data.length > 0 && (
          <div className="pagination">
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                title="Trang đầu"
              >
                <span aria-hidden="true">«</span>
              </button>
              <button
                className="pagination-btn"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                title="Trang trước"
              >
                <FaChevronLeft size={14} />
              </button>

              {/* Show page buttons */}
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
                    className={`pagination-btn ${
                      pageIndex === buttonIndex ? "active-page" : ""
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
                title="Trang sau"
              >
                <FaChevronRight size={14} />
              </button>
              <button
                className="pagination-btn"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                title="Trang cuối"
              >
                <span aria-hidden="true">»</span>
              </button>
            </div>
            
            <div className="pagination-info">
              <span>
                {firstRow}-{lastRow} của {totalRows} bản ghi
              </span>
              
              <div className="page-size-selector">
                <span>Hiển thị</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    table.setPageSize(Number(e.target.value));
                  }}
                >
                  {pageSizeOptions.map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
                <span>bản ghi</span>
              </div>
            </div>
          </div>
        )}
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
                <label 
                  key={room._id} 
                  className={`room-item ${selectedRooms.includes(room._id) ? 'selected' : ''}`}
                >
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
              <button className="cancel-btn" onClick={() => setShowRoomModal(false)}>
                Hủy
              </button>
              <button className="apply-btn" onClick={handleApplyRoomFilter}>
                Áp dụng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Export Popup */}
      {showExportPopup && (
        <>
          <div className="export-backdrop" onClick={() => setShowExportPopup(false)} />
          <div className="export-popup">
            <div className="popup-content">
              <div className="popup-header">
                <h4>Chọn loại dữ liệu để xuất</h4>
                <p>Xuất dữ liệu ra định dạng Excel</p>
              </div>
              
              <div className="checkbox-container">
                <div className="select-actions">
                  <button onClick={handleSelectAllTypes}>Chọn tất cả</button>
                  <button onClick={handleDeselectAllTypes}>Bỏ chọn tất cả</button>
                </div>
                
                <div className="checkbox-group">
                  {types.map((type) => (
                    <div key={type} className="checkbox-item">
                      <label>
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
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="popup-actions">
                <button 
                  className="cancel-btn" 
                  onClick={() => setShowExportPopup(false)}
                >
                  Hủy
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleExportExcel}
                  disabled={selectedTypes.length === 0 || isExporting}
                >
                  {isExporting ? "Đang xuất..." : "Xuất Excel"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Table;
