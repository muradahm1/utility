/**
 * Tables Module
 * 
 * Sortable, responsive, paginated tables with virtualization.
 * 
 * @module modules/tables
 */

import { escapeHtml } from '../utils/index.js';

const tableState = new Map();

export function buildTable(config) {
    const { id, columns, rows, title, sortable = true, searchable = true, pageSize = 10 } = config;
    const tableId = id || `table-${Date.now()}`;
    
    tableState.set(tableId, {
        rows: rows || [],
        columns,
        currentPage: 0,
        pageSize,
        sortColumn: null,
        sortDirection: 'asc',
        searchQuery: ''
    });
    
    return renderTable(tableId, title, sortable, searchable);
}

export function buildVirtualTable(config, rowHeight = 40) {
    const { id, columns, rows, title, visibleRows = 20 } = config;
    const tableId = id || `vtable-${Date.now()}`;
    
    tableState.set(tableId, {
        rows: rows || [],
        columns,
        scrollTop: 0,
        rowHeight,
        visibleRows
    });
    
    return `
        <div class="virtual-table-container" id="${tableId}" style="height:${visibleRows * rowHeight}px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr>${columns.map(c => `<th style="padding:10px 14px;text-align:left;font-weight:700;font-size:12px;text-transform:uppercase;background:var(--bg-main);border-bottom:2px solid var(--border-color);position:sticky;top:0;z-index:1;">${escapeHtml(c.label)}</th>`).join('')}</tr>
                </thead>
                <tbody id="${tableId}-body"></tbody>
            </table>
        </div>
    `;
}

export function sort(tableId, columnKey) {
    const state = tableState.get(tableId);
    if (!state) return;
    
    if (state.sortColumn === columnKey) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortColumn = columnKey;
        state.sortDirection = 'asc';
    }
    
    const column = state.columns.find(c => c.key === columnKey);
    const format = column?.format;
    
    state.rows.sort((a, b) => {
        let aVal = a[columnKey];
        let bVal = b[columnKey];
        
        if (format === 'currency') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
        } else if (format === 'number') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
        } else {
            aVal = String(aVal || '').toLowerCase();
            bVal = String(bVal || '').toLowerCase();
        }
        
        if (aVal < bVal) return state.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return state.sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderTable(tableId);
}

export function search(tableId, query) {
    const state = tableState.get(tableId);
    if (!state) return;
    
    state.searchQuery = query.toLowerCase();
    state.currentPage = 0;
    renderTable(tableId);
}

export function paginate(tableId, page) {
    const state = tableState.get(tableId);
    if (!state) return;
    
    state.currentPage = page;
    renderTable(tableId);
}

export function nextPage(tableId) {
    const state = tableState.get(tableId);
    if (!state) return;
    
    const totalPages = Math.ceil(getFilteredRows(state).length / state.pageSize);
    if (state.currentPage < totalPages - 1) {
        state.currentPage++;
        renderTable(tableId);
    }
}

export function prevPage(tableId) {
    const state = tableState.get(tableId);
    if (!state) return;
    
    if (state.currentPage > 0) {
        state.currentPage--;
        renderTable(tableId);
    }
}

export function exportCSV(tableId) {
    const state = tableState.get(tableId);
    if (!state) return '';
    
    const rows = getFilteredRows(state);
    const headers = state.columns.map(c => c.label).join(',');
    const csvRows = rows.map(row => 
        state.columns.map(c => {
            const val = row[c.key];
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(',')
    );
    
    return [headers, ...csvRows].join('\n');
}

function getFilteredRows(state) {
    if (!state.searchQuery) return state.rows;
    return state.rows.filter(row => 
        state.columns.some(c => {
            const val = row[c.key];
            return val !== undefined && String(val).toLowerCase().includes(state.searchQuery);
        })
    );
}

function renderTable(tableId, title, sortable, searchable) {
    const state = tableState.get(tableId);
    if (!state) return '';
    
    const filteredRows = getFilteredRows(state);
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / state.pageSize));
    const start = state.currentPage * state.pageSize;
    const pageRows = filteredRows.slice(start, start + state.pageSize);
    
    const sortIcon = (col) => {
        if (state.sortColumn !== col) return '<i class="fa-solid fa-sort" style="margin-left:4px;opacity:0.3;"></i>';
        return state.sortDirection === 'asc' 
            ? '<i class="fa-solid fa-sort-up" style="margin-left:4px;color:var(--primary-color);"></i>'
            : '<i class="fa-solid fa-sort-down" style="margin-left:4px;color:var(--primary-color);"></i>';
    };
    
    const headerCells = state.columns.map(c => `
        <th ${c.emphasis ? 'style="font-weight:700;color:var(--text-primary);"' : ''}>
            ${sortable ? `<button class="table-sort-btn" data-sort="${c.key}" style="background:none;border:none;cursor:pointer;color:inherit;font:inherit;">${escapeHtml(c.label)}${sortIcon(c.key)}</button>` : escapeHtml(c.label)}
        </th>
    `).join('');
    
    const dataRows = pageRows.map(row => {
        const cells = state.columns.map(c => {
            const formatted = formatCell(row[c.key], c.format);
            return `<td${c.emphasis ? ' style="font-weight:600;color:var(--text-primary);"' : ''}>${formatted}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    
    const footerRow = state.footer ? `<tr style="font-weight:700;border-top:2px solid var(--border-color);">${state.columns.map(c => {
        const formatted = formatCell(state.footer[c.key], c.format);
        return `<td${c.emphasis ? ' style="font-weight:700;color:var(--text-primary);"' : ''}>${formatted}</td>`;
    }).join('')}</tr>` : '';
    
    const searchHtml = searchable ? `
        <div style="margin-bottom:12px;">
            <input type="text" id="${tableId}-search" placeholder="Search..." style="padding:8px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:14px;width:100%;max-width:300px;">
        </div>
    ` : '';
    
    const paginationHtml = totalPages > 1 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);">
            <button class="btn btn-outline btn-sm" id="${tableId}-prev" ${state.currentPage === 0 ? 'disabled' : ''}>Previous</button>
            <span style="font-size:13px;color:var(--text-secondary);">Page ${state.currentPage + 1} of ${totalPages}</span>
            <button class="btn btn-outline btn-sm" id="${tableId}-next" ${state.currentPage >= totalPages - 1 ? 'disabled' : ''}>Next</button>
        </div>
    ` : '';
    
    return `
        <div class="result-table-container calc-data-table" id="${tableId}-container">
            ${title ? `<h4>${escapeHtml(title)}</h4>` : ''}
            ${searchHtml}
            <div class="table-wrapper">
                <table>
                    <thead><tr>${headerCells}</tr></thead>
                    <tbody>${dataRows}${footerRow}</tbody>
                </table>
            </div>
            ${paginationHtml}
        </div>
    `;
}

function formatCell(value, format) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return escapeHtml(value);
    if (format === 'currency') return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (format === 'percent') return (Number(value) * 100).toFixed(2) + '%';
    if (format === 'number') return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return escapeHtml(String(value));
}
