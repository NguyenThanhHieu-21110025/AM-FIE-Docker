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
import { useState } from "react";
import { FaSort, FaSortDown, FaSortUp, FaPlus, FaSearch } from "react-icons/fa";
import { FilterSidebar } from "./FilterSideBar";
import { Link, useNavigate } from "react-router-dom";
import { Column } from "../utils/tableColumns";
import { useLocation } from "react-router-dom";
import { Address } from "../interfaces/Address";
import Modal from "./Modal";

interface Props {
  data: any[];
  columns: Column[];
  baseURL: string;
  addressList?: Address[];
  onRoomSelect?: (roomId: string) => void;
}

const Table = ({
  data,
  columns,
  baseURL,
  addressList,
  onRoomSelect,
}: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filtering, setFiltering] = useState("");
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomSearch, setRoomSearch] = useState("");
  const location = useLocation();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const navigate = useNavigate();

  const isAssetDashboard = location.pathname === "/asset-dashboard";

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

  const filteredRooms = addressList?.filter((room) =>
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
            <input
              type="text"
              value={filtering}
              onChange={(e) => setFiltering(e.target.value)}
              placeholder="Tìm kiếm tất cả cột..."
            />
            <div className="search-icon">
              <FaSearch size={22} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="button-group">
            {/* Room Search Button - Only for Asset Dashboard */}
            {isAssetDashboard && addressList && (
              <button
                className="search-btn"
                onClick={() => setShowRoomModal(true)}
              >
                <FaSearch size={16} />
                <span>Tìm theo phòng</span>
              </button>
            )}

            {/* Create New Button */}
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
          <table>
            {/* Table Header */}
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
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
            <tfoot />
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          {/* First Page */}
          <button
            className="pagination-btn"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {"<<"}
          </button>

          {/* Previous Page */}
          <button
            className="pagination-btn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {"<"}
          </button>

          {/* Page Numbers */}
          {Array.from({ length: table.getPageCount() }, (_, index) => (
            <button
              key={index}
              className="pagination-btn index-btn"
              onClick={() => table.setPageIndex(index)}
            >
              {index + 1}
            </button>
          ))}

          {/* Next Page */}
          <button
            className="pagination-btn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {">"}
          </button>

          {/* Last Page */}
          <button
            className="pagination-btn"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {">>"}
          </button>

          {/* Page Info */}
          <span className="page-number">
            <div>Trang</div>
            <strong>
              {table.getState().pagination.pageIndex + 1} trên{" "}
              {table.getPageCount()}
            </strong>
          </span>
        </div>
      </div>

      {/* Room Selection Modal */}
      {showRoomModal && addressList && (
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
                  <span className="room-text">{`${room.name} - ${room.building}`}</span>
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
