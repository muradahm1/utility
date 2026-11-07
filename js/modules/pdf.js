/**
 * PDF Module - World-Class Executive Report Generator
 * 
 * Generates an executive, publication-grade PDF report for any GetCalcu calculator:
 *  - Premium branded header & verified calculation badge
 *  - Primary KPI & secondary metrics grid with color-coded accents
 *  - Deep recommendation cards (Why?, Risks, Savings, Confidence, Break-even)
 *  - Full narrative insights (headline + detail) with tone-matched accents
 *  - Form input parameters & assumptions reference table
 *  - Formatted schedule / amortization breakdown table with zebra stripes
 *  - Dynamic pagination with running header banners and page numbers (Page X of Y)
 * 
 * @module modules/pdf
 */

let pdfLibraryLoaded = false;
let jsPDF = null;

import { escapeHtml } from '../utils/index.js';

export function isPDFSupported() {
    return typeof window !== 'undefined';
}

export async function loadPDFLibrary() {
    if (pdfLibraryLoaded && jsPDF) return jsPDF;
    
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('PDF generation requires a browser environment'));
            return;
        }
        
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
            pdfLibraryLoaded = true;
            resolve(jsPDF);
            return;
        }

        const tryLoad = (src, fallback) => {
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                if (window.jspdf && window.jspdf.jsPDF) {
                    jsPDF = window.jspdf.jsPDF;
                    pdfLibraryLoaded = true;
                    resolve(jsPDF);
                } else if (fallback) {
                    fallback();
                } else {
                    reject(new Error('Failed to load jsPDF library'));
                }
            };
            script.onerror = () => {
                if (fallback) {
                    fallback();
                } else {
                    reject(new Error('Failed to load jsPDF library'));
                }
            };
            document.head.appendChild(script);
        };

        // Try jsdelivr first (CSP safe), fallback to cdnjs
        tryLoad(
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
            () => tryLoad('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', null)
        );
    });
}

function formatPdfValue(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    if (typeof val === 'boolean') {
        return val ? 'Yes' : 'No';
    }
    if (typeof val === 'object') {
        if (val.value !== undefined) return formatPdfValue(val.value);
        if (val.val !== undefined) return formatPdfValue(val.val);
        if (val.text !== undefined) return String(val.text);
        if (Array.isArray(val)) return val.map(formatPdfValue).join(', ');
        try { return JSON.stringify(val); } catch { return ''; }
    }
    return String(val);
}

function normalizeRecommendation(rec) {
    if (!rec) return null;
    if (typeof rec === 'string') {
        return {
            title: 'STRATEGIC RECOMMENDATION',
            headline: rec,
            winner: '',
            savings: '',
            confidence: '',
            breakEvenYear: '',
            reasons: [],
            risks: []
        };
    }
    if (typeof rec === 'object') {
        const winner = rec.winner ? String(rec.winner).toUpperCase() : '';
        const title = winner ? `RECOMMENDATION: ${winner} IS THE BETTER CHOICE` : 'STRATEGIC RECOMMENDATION';
        let headline = rec.headline || '';
        if (!headline && rec.winner) {
            headline = `${winner === 'BUY' ? 'Buying' : 'Renting'} is projected to ${rec.savings ? 'save you approximately ' + rec.savings : 'be the better financial choice'} over the analysis period.`;
        }
        return {
            title,
            headline: headline || 'Recommendation based on your specific financial numbers.',
            winner: rec.winner || '',
            savings: rec.savings || '',
            confidence: rec.confidence || '',
            breakEvenYear: rec.breakEvenYear || '',
            reasons: Array.isArray(rec.reasons) ? rec.reasons.map(String) : [],
            risks: Array.isArray(rec.risks) ? rec.risks.map(String) : []
        };
    }
    return null;
}

function normalizeInsights(result) {
    const list = [];
    
    // Primary insight (result.insight)
    if (result.insight) {
        if (typeof result.insight === 'string') {
            list.push({
                headline: 'Key Financial Insight',
                detail: result.insight,
                tone: 'neutral'
            });
        } else if (typeof result.insight === 'object') {
            list.push({
                headline: result.insight.headline || 'Key Financial Insight',
                detail: result.insight.detail || '',
                tone: result.insight.tone || 'neutral'
            });
        }
    }
    
    // Secondary insights array (result.insights)
    if (Array.isArray(result.insights)) {
        result.insights.forEach(ins => {
            if (typeof ins === 'string') {
                list.push({ headline: '', detail: ins, tone: 'neutral' });
            } else if (ins && typeof ins === 'object') {
                list.push({
                    headline: ins.title || ins.headline || '',
                    detail: ins.text || ins.detail || ins.message || '',
                    tone: ins.tone || 'neutral'
                });
            }
        });
    }
    
    return list;
}

function extractInputParameters(tool, inputs) {
    if (!inputs || Object.keys(inputs).length === 0) return [];
    const fieldsMap = {};
    if (tool && Array.isArray(tool.fields)) {
        tool.fields.forEach(f => {
            if (f && f.id) fieldsMap[f.id] = f;
        });
    }
    
    const params = [];
    Object.keys(inputs).forEach(key => {
        const val = inputs[key];
        if (val === undefined || val === null || val === '') return;
        const field = fieldsMap[key] || {};
        const label = field.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let displayVal = formatPdfValue(val);
        if (field.unit && typeof val === 'number') {
            displayVal = `${displayVal} ${field.unit}`;
        }
        params.push({ label, value: displayVal });
    });
    return params;
}

function extractTableData(result) {
    if (result.table) {
        if (Array.isArray(result.table) && result.table.length > 0) {
            return {
                title: 'Schedule / Amortization Breakdown',
                rows: result.table
            };
        }
        if (result.table.rows && Array.isArray(result.table.rows) && result.table.rows.length > 0) {
            return {
                title: result.table.title || 'Schedule Breakdown',
                headers: result.table.headers,
                rows: result.table.rows
            };
        }
    }
    if (result.assetTable && Array.isArray(result.assetTable)) {
        return {
            title: 'Asset & Liability Breakdown',
            rows: result.assetTable.concat(result.liabilityTable || [])
        };
    }
    return null;
}

function drawHeaderBanner(doc, pageWidth, margin, toolName) {
    doc.setFillColor(30, 27, 75); // Deep Indigo #1E1B4B
    doc.rect(0, 0, pageWidth, 24, 'F');
    
    doc.setFillColor(99, 102, 241); // Accent stripe #6366F1
    doc.rect(0, 23, pageWidth, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('GetCalcu', margin, 11);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(199, 210, 254);
    doc.text(`Official Report • ${toolName || 'Results'}`, margin, 17);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text('VERIFIED CALCULATION', pageWidth - margin, 14, { align: 'right' });
}

function ensureSpace(doc, neededHeight, currentY, toolName, pageWidth, pageHeight, margin) {
    if (currentY + neededHeight > pageHeight - 16) {
        doc.addPage();
        drawHeaderBanner(doc, pageWidth, margin, toolName);
        return 32;
    }
    return currentY;
}

/**
 * Generates an executive, publication-grade PDF report for any calculator result.
 * 
 * @param {Object} tool - Tool configuration and metadata
 * @param {Object} result - Calculation output object
 * @param {Object} [inputs={}] - User input values
 * @returns {Promise<boolean>} True if generation and download succeeded
 */
export async function generateResultsPDF(tool, result, inputs = {}) {
    if (!tool || !result) return false;
    
    try {
        const jsPDFClass = await loadPDFLibrary();
        const doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 14;
        const contentWidth = pageWidth - (margin * 2);
        
        let y = 0;
        
        // ── 1. Cover / Top Branded Banner ────────────────────────────────
        doc.setFillColor(30, 27, 75); // Deep Indigo
        doc.rect(0, 0, pageWidth, 28, 'F');
        
        doc.setFillColor(99, 102, 241); // Accent Line
        doc.rect(0, 27, pageWidth, 1.2, 'F');
        
        // Brand Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('GetCalcu', margin, 12);
        
        // Subtitle & URL
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(199, 210, 254);
        doc.text('www.getcalcu.com • Fast, Accurate & Free Financial Calculators', margin, 18);
        
        // Timestamp & Badge
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.text(`Generated: ${dateStr}`, pageWidth - margin, 12, { align: 'right' });
        doc.setTextColor(165, 180, 252);
        doc.text('EXECUTIVE AUDIT REPORT', pageWidth - margin, 18, { align: 'right' });
        
        y = 36;
        
        // ── 2. Report Title & Description ────────────────────────────────
        doc.setTextColor(15, 23, 42); // #0F172A
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(tool.name || 'Calculation Report', margin, y);
        y += 6;
        
        if (tool.description) {
            doc.setTextColor(100, 116, 139); // #64748B
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            const descLines = doc.splitTextToSize(tool.description, contentWidth);
            doc.text(descLines, margin, y);
            y += (descLines.length * 3.8) + 4;
        }
        
        // ── 3. Primary Key Metric Callout ────────────────────────────────
        if (result.stats && result.stats.length > 0) {
            y = ensureSpace(doc, 24, y, tool.name, pageWidth, pageHeight, margin);
            const primaryStat = result.stats[0];
            
            doc.setFillColor(238, 242, 255); // #EEF2FF
            doc.setDrawColor(99, 102, 241); // #6366F1
            doc.setLineWidth(0.6);
            doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');
            
            doc.setTextColor(79, 70, 229);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text((primaryStat.label || 'PRIMARY RESULT').toUpperCase(), margin + 6, y + 6.5);
            
            doc.setTextColor(30, 27, 75);
            doc.setFontSize(17);
            doc.text(formatPdfValue(primaryStat.value), margin + 6, y + 15);
            
            y += 26;
        }
        
        // ── 4. Key Results Grid (Secondary Stats) ────────────────────────
        if (result.stats && result.stats.length > 1) {
            const secondaryStats = result.stats.slice(1);
            const numCols = Math.min(3, secondaryStats.length);
            const numRows = Math.ceil(secondaryStats.length / numCols);
            const gridHeight = (numRows * 14) + 8;
            
            y = ensureSpace(doc, gridHeight + 6, y, tool.name, pageWidth, pageHeight, margin);
            
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.text('Detailed Results Summary', margin, y);
            y += 5;
            
            const colGap = 4;
            const colWidth = (contentWidth - ((numCols - 1) * colGap)) / numCols;
            
            secondaryStats.forEach((stat, index) => {
                const col = index % numCols;
                const row = Math.floor(index / numCols);
                const currentX = margin + (col * (colWidth + colGap));
                const currentY = y + (row * 14);
                
                doc.setFillColor(248, 250, 252); // #F8FAFC
                doc.setDrawColor(226, 232, 240); // #E2E8F0
                doc.setLineWidth(0.3);
                doc.roundedRect(currentX, currentY, colWidth, 12, 1.5, 1.5, 'FD');
                
                doc.setTextColor(100, 116, 139);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                const labelText = doc.splitTextToSize(stat.label || '', colWidth - 6);
                doc.text(labelText[0] || '', currentX + 3.5, currentY + 4.5);
                
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text(formatPdfValue(stat.value), currentX + 3.5, currentY + 9.5);
            });
            
            y += (numRows * 14) + 6;
        }
        
        // ── 5. Executive Recommendation Section ──────────────────────────
        const rec = normalizeRecommendation(result.recommendation);
        if (rec) {
            // Calculate height for recommendation
            let recHeight = 22;
            const headlineLines = doc.splitTextToSize(rec.headline, contentWidth - 12);
            recHeight += (headlineLines.length * 3.8);
            
            if (rec.reasons.length > 0) recHeight += 6 + (rec.reasons.length * 4);
            if (rec.risks.length > 0) recHeight += 6 + (rec.risks.length * 4);
            
            y = ensureSpace(doc, recHeight + 6, y, tool.name, pageWidth, pageHeight, margin);
            
            const isBuy = rec.winner === 'buy' || rec.winner === 'BUY';
            const cardBg = isBuy ? [236, 253, 245] : [245, 243, 255]; // emerald or violet
            const cardBorder = isBuy ? [16, 185, 129] : [129, 140, 248];
            const titleColor = isBuy ? [4, 120, 87] : [67, 56, 202];
            
            doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
            doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, contentWidth, recHeight, 2, 2, 'FD');
            
            let insideY = y + 6;
            
            // Recommendation Title & Pill
            doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(rec.title, margin + 6, insideY);
            
            if (rec.confidence || rec.breakEvenYear) {
                const badgeText = [
                    rec.confidence ? `Confidence: ${rec.confidence}` : '',
                    rec.breakEvenYear ? `Break-even: ${rec.breakEvenYear}` : ''
                ].filter(Boolean).join(' • ');
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.text(badgeText, pageWidth - margin - 6, insideY, { align: 'right' });
            }
            
            insideY += 5;
            
            // Headline text
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(headlineLines, margin + 6, insideY);
            insideY += (headlineLines.length * 3.8) + 3;
            
            // Reasons list
            if (rec.reasons.length > 0) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
                doc.text('Key Supporting Factors:', margin + 6, insideY);
                insideY += 4;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(51, 65, 85);
                rec.reasons.forEach(r => {
                    const lines = doc.splitTextToSize(`• ${r}`, contentWidth - 14);
                    doc.text(lines, margin + 6, insideY);
                    insideY += (lines.length * 3.5);
                });
                insideY += 2;
            }
            
            // Risks list
            if (rec.risks.length > 0) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(180, 83, 9); // amber
                doc.text('Considerations & Risks:', margin + 6, insideY);
                insideY += 4;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(51, 65, 85);
                rec.risks.forEach(rk => {
                    const lines = doc.splitTextToSize(`• ${rk}`, contentWidth - 14);
                    doc.text(lines, margin + 6, insideY);
                    insideY += (lines.length * 3.5);
                });
            }
            
            y += recHeight + 6;
        }
        
        // ── 6. Key Insights Section ──────────────────────────────────────
        const insightsList = normalizeInsights(result);
        if (insightsList.length > 0) {
            insightsList.forEach(ins => {
                const detailLines = doc.splitTextToSize(ins.detail, contentWidth - 12);
                const hasHeadline = Boolean(ins.headline);
                const boxHeight = 10 + (hasHeadline ? 5 : 0) + (detailLines.length * 3.8);
                
                y = ensureSpace(doc, boxHeight + 4, y, tool.name, pageWidth, pageHeight, margin);
                
                const isWarn = ins.tone === 'warning';
                const isPos = ins.tone === 'positive';
                const bg = isWarn ? [254, 242, 242] : (isPos ? [240, 253, 244] : [248, 250, 252]);
                const border = isWarn ? [239, 68, 68] : (isPos ? [16, 185, 129] : [99, 102, 241]);
                const titleColor = isWarn ? [185, 28, 28] : (isPos ? [4, 120, 87] : [67, 56, 202]);
                
                doc.setFillColor(bg[0], bg[1], bg[2]);
                doc.setDrawColor(border[0], border[1], border[2]);
                doc.setLineWidth(0.4);
                doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');
                
                let curY = y + 5;
                if (hasHeadline) {
                    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.text(ins.headline.toUpperCase(), margin + 5, curY);
                    curY += 4.5;
                }
                
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text(detailLines, margin + 5, curY);
                
                y += boxHeight + 4;
            });
        }
        
        // ── 7. Input Assumptions Table ───────────────────────────────────
        const inputParams = extractInputParameters(tool, inputs);
        if (inputParams.length > 0) {
            y = ensureSpace(doc, 24, y, tool.name, pageWidth, pageHeight, margin);
            
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.text('Input Assumptions & Parameters', margin, y);
            y += 4;
            
            const numParams = inputParams.length;
            const mid = Math.ceil(numParams / 2);
            const col1 = inputParams.slice(0, mid);
            const col2 = inputParams.slice(mid);
            const colWidth = (contentWidth - 6) / 2;
            
            const maxRows = Math.max(col1.length, col2.length);
            
            for (let r = 0; r < maxRows; r++) {
                y = ensureSpace(doc, 7, y, tool.name, pageWidth, pageHeight, margin);
                
                const item1 = col1[r];
                const item2 = col2[r];
                
                if (r % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin, y, contentWidth, 5.5, 'F');
                }
                
                doc.setFontSize(7.5);
                if (item1) {
                    doc.setTextColor(100, 116, 139);
                    doc.setFont('helvetica', 'normal');
                    doc.text(item1.label, margin + 3, y + 3.8);
                    
                    doc.setTextColor(15, 23, 42);
                    doc.setFont('helvetica', 'bold');
                    doc.text(item1.value, margin + colWidth - 3, y + 3.8, { align: 'right' });
                }
                
                if (item2) {
                    const startX = margin + colWidth + 6;
                    doc.setTextColor(100, 116, 139);
                    doc.setFont('helvetica', 'normal');
                    doc.text(item2.label, startX + 3, y + 3.8);
                    
                    doc.setTextColor(15, 23, 42);
                    doc.setFont('helvetica', 'bold');
                    doc.text(item2.value, startX + colWidth - 3, y + 3.8, { align: 'right' });
                }
                
                y += 5.5;
            }
            y += 6;
        }
        
        // ── 8. Schedule / Breakdown Table ────────────────────────────────
        const tableData = extractTableData(result);
        if (tableData && tableData.rows && tableData.rows.length > 0) {
            y = ensureSpace(doc, 30, y, tool.name, pageWidth, pageHeight, margin);
            
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.text(tableData.title, margin, y);
            y += 4.5;
            
            const rows = tableData.rows.slice(0, 48); // First 48 periods
            const rawHeaders = tableData.headers || Object.keys(rows[0] || {});
            
            // Clean up headers (e.g. 'totalInterest' -> 'Total Interest')
            const formattedHeaders = rawHeaders.map(h => {
                return h.replace(/([A-Z])/g, ' $1')
                        .replace(/_/g, ' ')
                        .replace(/^\w/, c => c.toUpperCase())
                        .trim();
            });
            
            const numCols = rawHeaders.length;
            const tableColWidth = contentWidth / numCols;
            
            // Header row
            doc.setFillColor(30, 41, 59); // Slate-800
            doc.rect(margin, y, contentWidth, 6.5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            
            formattedHeaders.forEach((h, i) => {
                doc.text(h, margin + (i * tableColWidth) + 2.5, y + 4.4);
            });
            y += 6.5;
            
            // Data rows
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            
            rows.forEach((row, rowIndex) => {
                y = ensureSpace(doc, 5.5, y, tool.name, pageWidth, pageHeight, margin);
                
                if (rowIndex % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin, y, contentWidth, 5.2, 'F');
                }
                
                doc.setTextColor(51, 65, 85);
                rawHeaders.forEach((h, i) => {
                    const val = formatPdfValue(row[h]);
                    doc.text(val, margin + (i * tableColWidth) + 2.5, y + 3.6);
                });
                y += 5.2;
            });
            
            if (tableData.rows.length > 48) {
                y += 3;
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text(`* Showing first 48 of ${tableData.rows.length} rows. Full schedule available via CSV export at getcalcu.com.`, margin, y);
            }
        }
        
        // ── 9. Page Footers (Running on all pages) ───────────────────────
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('GetCalcu • Free Financial & Utility Tools (https://www.getcalcu.com) • For informational purposes only.', margin, pageHeight - 7);
            doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
        }
        
        const cleanSlug = tool.id || (tool.name ? tool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'calculator');
        doc.save(`${cleanSlug}-report.pdf`);
        return true;
    } catch (error) {
        console.error('PDF generation failed:', error);
        return false;
    }
}

export function buildPDFButton(options = {}) {
    const { label = 'Download PDF', onclick = '' } = options;
    return `<button class="btn btn-outline btn-sm" id="pdf-btn" ${onclick ? `onclick="${onclick}"` : ''}><i class="fa-solid fa-file-pdf"></i> ${escapeHtml(label)}</button>`;
}
