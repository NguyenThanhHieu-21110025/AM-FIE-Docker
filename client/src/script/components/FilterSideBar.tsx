import { Table } from "@tanstack/react-table";
import { BsFilterLeft, BsChevronLeft, BsChevronRight, BsCheckLg, BsEye, BsEyeSlash } from "react-icons/bs";
import { useState } from "react";
import "../../css/FilterSidebar.css";
import { Column } from "../utils/tableColumns";

interface FilterSidebarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>;
  columns: Column[];
}

export const FilterSidebar = ({ table, columns }: FilterSidebarProps) => {
  // Fix: Only add to columnHeaders when accessorKey is defined
  const columnHeaders = columns.reduce((acc, column) => {
    // Handle nested columns
    if (column.columns) {
      column.columns.forEach(subColumn => {
        if (subColumn.accessorKey) {
          acc[subColumn.accessorKey] = subColumn.header;
        }
      });
    }
    
    // Handle this column
    if (column.accessorKey) {
      acc[column.accessorKey] = column.header;
    }
    return acc;
  }, {} as Record<string, string>);
  
  const [isOpen, setIsOpen] = useState(false);
  const visibleColumnCount = table.getAllLeafColumns().filter(col => col.getIsVisible()).length;
  const totalColumnCount = table.getAllLeafColumns().length;

  const toggleAllColumns = (value: boolean) => {
    table.toggleAllColumnsVisible(value);
  };

  // Helper function to get column header
  const getColumnDisplayName = (column: any): string => {
    // Try to find header in our mapping
    if (column.id && columnHeaders[column.id]) {
      return columnHeaders[column.id];
    }
    
    // Check for a column header directly on the column
    if (column.columnDef && column.columnDef.header) {
      return typeof column.columnDef.header === 'string' 
        ? column.columnDef.header 
        : column.id;
    }
    
    // Fallback to formatted column ID
    return column.id 
      ? column.id.charAt(0).toUpperCase() + column.id.slice(1).replace(/([A-Z])/g, ' $1').trim()
      : 'Unknown';
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />}

      <div className={`sidebar-container ${isOpen ? "open" : ""}`}>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="sidebar-toggle"
          title={isOpen ? "Đóng bộ lọc" : "Mở bộ lọc"}
        >
          <div className="toggle-icon">
            {isOpen ? <BsChevronRight /> : <BsChevronLeft />}
          </div>
          <div className="toggle-label">
            <BsFilterLeft />
            <span className="column-count">
              {visibleColumnCount}/{totalColumnCount}
            </span>
          </div>
        </button>

        <div className="sidebar-content">
          <div className="sidebar-header">
            <BsFilterLeft className="filter-icon" />
            <h2 className="sidebar-title">Hiển thị cột</h2>
          </div>

          <div className="sidebar-actions">
            <button
              onClick={() => toggleAllColumns(true)}
              className="sidebar-button sidebar-button-primary"
            >
              <BsEye />
              <span>Hiển thị tất cả</span>
            </button>
            <button
              onClick={() => toggleAllColumns(false)}
              className="sidebar-button sidebar-button-secondary"
            >
              <BsEyeSlash />
              <span>Ẩn tất cả</span>
            </button>
          </div>

          <div className="column-list">
            {table.getAllLeafColumns().map((column) => (
              <div 
                key={column.id} 
                className={`column-item ${column.getIsVisible() ? 'visible' : ''}`}
              >
                <label className="column-label">
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                  <span className="checkbox-custom">
                    {column.getIsVisible() && <BsCheckLg className="check-icon" />}
                  </span>
                  <span className="column-name">
                    {getColumnDisplayName(column)}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
