import { Table } from "@tanstack/react-table";
import { BsFilterLeft, BsChevronLeft, BsChevronRight } from "react-icons/bs";
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
      {isOpen && <div className="backdrop" onClick={() => setIsOpen(false)} />}

      <div className={`sidebar-container ${isOpen ? "open" : ""}`}>
        <button onClick={() => setIsOpen(!isOpen)} className="sidebar-toggle">
          {isOpen ? <BsChevronRight /> : <BsChevronLeft />}
        </button>

        <div className="sidebar-content">
          <div className="sidebar-header">
            <BsFilterLeft className="text-xl" />
            <h2 className="sidebar-title">Chọn Cột</h2>
          </div>

          <div className="sidebar-actions">
            <button
              onClick={() => toggleAllColumns(true)}
              className="sidebar-button sidebar-button-primary"
            >
              Chọn tất cả
            </button>
            <button
              onClick={() => toggleAllColumns(false)}
              className="sidebar-button sidebar-button-secondary"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="column-list">
            {table.getAllLeafColumns().map((column) => (
              <div key={column.id} className="column-item">
                <label className="column-label">
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                  <span>
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