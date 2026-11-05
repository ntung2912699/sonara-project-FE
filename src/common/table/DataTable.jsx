export function DataTable({ columns, rows, rowKey, className = '', rowClassName = '' }) {
  return (
    <div className={`data-table ${className}`} role="table">
      <div className="data-table-header" role="row">
        {columns.map((column) => (
          <div className={`data-table-cell ${column.className || ''}`} role="columnheader" key={column.key}>
            {column.label}
          </div>
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div className={`data-table-row ${rowClassName}`} role="row" key={rowKey ? row[rowKey] : rowIndex}>
          {columns.map((column) => (
            <div className={`data-table-cell ${column.className || ''}`} role="cell" key={column.key}>
              {column.render ? column.render(row, rowIndex) : row[column.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
