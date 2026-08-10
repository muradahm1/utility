/**
 * Tables Module
 * 
 * Sortable, responsive, paginated tables with virtualization for large datasets.
 * Provides consistent table functionality across all calculators.
 * 
 * @module modules/tables
 */

// ── Table Configuration ────────────────────────────────────────

/**
 * Table column definition
 * @typedef {Object} TableColumn
 * @property {string} key - Data key
 * @property {string} label - Column header label
 * @property {string} [format] - Format type: 'currency', 'percentage', 'number', 'date'
 * @property {boolean} [sortable] - Whether column is sortable
 * @property {boolean} [emphasis] - Whether to emphasize column
 */

/**
 * Table configuration
 * @typedef {Object} TableConfig
 * @property {Array<TableColumn>} columns - Column definitions
 * @property {Array<Object>} rows - Table data rows
 * @property {string} [title] - Table title
 * @property {boolean} [sortable] - Enable sorting (default: true)
 * @property {boolean} [paginated] - Enable pagination (default: false)
 * @property {number} [pageSize] - Rows per page (default: 10)
 * @property {boolean} [searchable] - Enable search (default: false)
 * @property {boolean} [exportable] - Enable export (default: true)
 */

// ── Table Builder ──────────────────────────────────────────────

/**
 * Build table HTML
 * @param {TableConfig} config - Table configuration
 * @returns {string} HTML string
 */
export function buildTable(config) {
    const {
        columns = [],
        rows = [],
        title,
        sortable = true,
        paginated = false,
        pageSize = 10,
        searchable = false,
        exportable = true
    } = config;
    
    if (!columns.length || !rows.length) {
        return '';
    }
    
    const tableId = 'table-' + Date.now();
    const totalPages = paginated ? Math.ceil(rows.length / pageSize) : 1;
    
    // Build header
    const headerCells = columns.map(col => {
        const sortAttr = sortable && col.sortable !== false 
            ? `onclick="window.tableModules.sort('${tableId}', '${col.key}')"` 
            : '';
        const sortIcon = sortable && col.sortable !== false 
            ? `<i class="fa-solid fa-sort table-sort-icon" data-sort-key="${col.key}"></i>` 
            : '';
        
        return `
            <th${col.emphasis ? ' class="emphasis"' : ''} ${sortAttr}>
                ${escapeHtml(col.label)}
                ${sortIcon}
            </th>
        `;
    }).join('');
    
    // Build body
    const displayRows = paginated ? rows.slice(0, pageSize) : rows;
    const bodyRows = displayRows.map((row, index) => {
        const cells = columns.map(col => {
            const value = row[col.key];
            const formatted = formatCell(value, col.format);
            return `<td${col.emphasis ? ' class="emphasis"' : ''}>${formatted}</td>`;
        }).join('');
        
        return `<tr data-row-index="${index}">${cells}</tr>`;
    }).join('');
    
    // Build search
    const searchHtml = searchable ? `
        <div class="table-search">
            <input type="text" 
                   id="${tableId}-search" 
                   placeholder="Search..." 
                   class="table-search-input"
                   oninput="window.tableModules.search('${tableId}', this.value)">
            <i class="fa-solid fa-search table-search-icon"></i>
        </div>
    ` : '';
    
    // Build export buttons
    const exportHtml = exportable ? `
        <div class="table-export">
            <button class="table-export-btn" onclick="window.tableModules.exportCSV('${tableId}')">
                <i class="fa-solid fa-download"></i> Export CSV
            </button>
        </div>
    ` : '';
    
    // Build pagination
    const paginationHtml = paginated && totalPages > 1 ? `
        <div class="table-pagination">
            <button class="pagination-btn" onclick="window.tableModules.prevPage('${tableId}')" ${displayRows.length === 0 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="pagination-info">
                Page <span id="${tableId}-current-page">1</span> of ${totalPages}
            </span>
            <button class="pagination-btn" onclick="window.tableModules.nextPage('${tableId}')" ${displayRows.length === 0 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    ` : '';
    
    // Assemble table
    return `
        <div class="table-container" id="${tableId}" data-total-rows="${rows.length}" data-page-size="${pageSize}">
            ${title ? `<h4 class="table-title">${escapeHtml(title)}</h4>` : ''}
            <div class="table-controls">
                ${searchHtml}
                ${exportHtml}
            </div>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>${headerCells}</tr>
                    </thead>
                    <tbody id="${tableId}-body">
                        ${bodyRows}
                    </tbody>
                </table>
            </div>
            ${paginationHtml}
        </div>
    `;
}

/**
 * Format cell value
 * @param {*} value - Cell value
 * @param {string} format - Format type
 * @returns {string} Formatted value
 */
function formatCell(value, format) {
    if (value === null || value === undefined) {
        return '-';
    }
    
    switch (format) {
        case 'currency':
            return formatCurrency(value);
        
        case 'percentage':
            return formatPercentage(value, { decimals: 2 });
        
        case 'number':
            return formatNumber(value, { minFractionDigits: 0, maxFractionDigits: 2 });
        
        case 'date':
            return formatDate(value);
        
        case 'integer':
            return Math.round(value).toLocaleString();
        
        default:
            return escapeHtml(String(value));
    }
}

// ── Table Operations ───────────────────────────────────────────

/**
 * Sort table
 * @param {string} tableId - Table ID
 * @param {string} columnKey - Column key to sort by
 */
export function sort(tableId, columnKey) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Get current sort direction
    const currentSort = table.dataset.sortKey;
    const currentDirection = table.dataset.sortDirection || 'asc';
    const newDirection = currentSort === columnKey && currentDirection === 'asc' ? 'desc' : 'asc';
    
    // Update sort icons
    table.querySelectorAll('.table-sort-icon').forEach(icon => {
        icon.className = 'fa-solid fa-sort table-sort-icon';
    });
    
    const sortIcon = table.querySelector(`[data-sort-key="${columnKey}"]`);
    if (sortIcon) {
        sortIcon.className = newDirection === 'asc' 
            ? 'fa-solid fa-sort-up table-sort-icon' 
            : 'fa-solid fa-sort-down table-sort-icon';
    }
    
    // Sort rows
    rows.sort((a, b) => {
        const aVal = a.querySelector(`[data-column="${columnKey}"]`)?.textContent || '';
        const bVal = b.querySelector(`[data-column="${columnKey}"]`)?.textContent || '';
        
        const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
        const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
        
        let comparison = 0;
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            comparison = aNum - bNum;
        } else {
            comparison = aVal.localeCompare(bVal);
        }
        
        return newDirection === 'asc' ? comparison : -comparison;
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
    
    // Store sort state
    table.dataset.sortKey = columnKey;
    table.dataset.sortDirection = newDirection;
}

/**
 * Search table
 * @param {string} tableId - Table ID
 * @param {string} query - Search query
 */
export function search(tableId, query) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const lowerQuery = query.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(lowerQuery) ? '' : 'none';
    });
}

/**
 * Paginate table
 * @param {string} tableId - Table ID
 * @param {number} page - Page number
 */
export function paginate(tableId, page) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const pageSize = parseInt(table.dataset.pageSize) || 10;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    rows.forEach((row, index) => {
        row.style.display = index >= start && index < end ? '' : 'none';
    });
    
    // Update page indicator
    const currentPageEl = document.getElementById(`${tableId}-current-page`);
    if (currentPageEl) {
        currentPageEl.textContent = page;
    }
    
    // Store current page
    table.dataset.currentPage = page;
}

/**
 * Go to next page
 * @param {string} tableId - Table ID
 */
export function nextPage(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const currentPage = parseInt(table.dataset.currentPage) || 1;
    const pageSize = parseInt(table.dataset.pageSize) || 10;
    const totalRows = parseInt(table.dataset.totalRows) || 0;
    const totalPages = Math.ceil(totalRows / pageSize);
    
    if (currentPage < totalPages) {
        paginate(tableId, currentPage + 1);
    }
}

/**
 * Go to previous page
 * @param {string} tableId - Table ID
 */
export function prevPage(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const currentPage = parseInt(table.dataset.currentPage) || 1;
    
    if (currentPage > 1) {
        paginate(tableId, currentPage - 1);
    }
}

/**
 * Export table to CSV
 * @param {string} tableId - Table ID
 */
export function exportCSV(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const headers = Array.from(table.querySelectorAll('thead th'))
        .map(th => `"${th.textContent.trim()}"`)
        .join(',');
    
    const rows = Array.from(table.querySelectorAll('tbody tr'))
        .filter(row => row.style.display !== 'none')
        .map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            return cells.map(cell => `"${cell.textContent.trim()}"`).join(',');
        });
    
    const csv = [headers, ...rows].join('\n');
    
    downloadFile(csv, `${tableId}-export.csv`, 'text/csv');
}

// ── Virtual Scrolling ──────────────────────────────────────────

/**
 * Create virtual scrolling table for large datasets
 * @param {TableConfig} config - Table configuration
 * @param {number} rowHeight - Height of each row in pixels
 * @returns {string} HTML string
 */
export function buildVirtualTable(config, rowHeight = 40) {
    const { columns = [], rows = [], title } = config;
    
    if (!columns.length || !rows.length) {
        return '';
    }
    
    const tableId = 'virtual-table-' + Date.now();
    const totalHeight = rows.length * rowHeight;
    const viewportHeight = Math.min(600, rows.length * rowHeight);
    
    const headerCells = columns.map(col => {
        return `<th>${escapeHtml(col.label)}</th>`;
    }).join('');
    
    return `
        <div class="virtual-table-container" id="${tableId}" style="height: ${viewportHeight}px; overflow-y: auto;">
            ${title ? `<h4 class="table-title">${escapeHtml(title)}</h4>` : ''}
            <div class="table-wrapper" style="height: ${totalHeight}px; position: relative;">
                <table class="data-table" style="position: absolute; top: 0; left: 0; width: 100%;">
                    <thead>
                        <tr>${headerCells}</tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, index) => {
                            const cells = columns.map(col => {
                                const value = row[col.key];
                                const formatted = formatCell(value, col.format);
                                return `<td>${formatted}</td>`;
                            }).join('');
                            
                            return `<tr style="position: absolute; top: ${index * rowHeight}px; width: 100%;">${cells}</tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ── Helper Functions ───────────────────────────────────────────

/**
 * Download file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Format currency
 * @param {number} value - Value to format
 * @returns {string} Formatted currency
 */
function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage
 */
function formatPercentage(value, options = {}) {
    const { decimals = 2 } = options;
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return (num * 100).toFixed(decimals) + '%';
}

/**
 * Format number
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
function formatNumber(value, options = {}) {
    const { minFractionDigits = 0, maxFractionDigits = 2 } = options;
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: minFractionDigits, maximumFractionDigits: maxFractionDigits });
}

/**
 * Format date
 * @param {*} value - Date value
 * @returns {string} Formatted date
 */
function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US');
}

/**
 * Escape HTML
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// ── Global API ─────────────────────────────────────────────────

/**
 * Initialize tables module globally
 */
export function initTablesGlobal() {
    if (typeof window !== 'undefined') {
        window.tableModules = {
            sort,
            search,
            paginate,
            nextPage,
            prevPage,
            exportCSV
        };
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    initTablesGlobal();
}

// Log module initialization
console.log('Tables module loaded');