/**
 * PDF Module
 * 
 * Professional PDF report generation with executive branding,
 * metric cards, input summaries, visual charts, and schedule tables.
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

/**
 * Generates an executive, beautifully formatted PDF report for any calculator result.
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
        
        // ── 1. Branded Header Banner ──
        doc.setFillColor(79, 70, 229); // #4F46E5 Royal Indigo
        doc.rect(0, 0, pageWidth, 28, 'F');
        
        // Brand Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('GetCalcu', margin, 12);
        
        // Subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('www.getcalcu.com • Fast, Free & Accurate Calculators', margin, 18);
        
        // Timestamp & Badge
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        doc.setFontSize(8);
        doc.text(`Calculated on: ${dateStr}`, pageWidth - margin, 12, { align: 'right' });
        doc.text('VERIFIED REPORT', pageWidth - margin, 18, { align: 'right' });
        
        y = 36;
        
        // ── 2. Report Title & Description ──
        doc.setTextColor(15, 23, 42); // #0F172A
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(tool.name || 'Calculation Report', margin, y);
        y += 6;
        
        if (tool.description) {
            doc.setTextColor(100, 116, 139); // #64748B
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const descLines = doc.splitTextToSize(tool.description, contentWidth);
            doc.text(descLines, margin, y);
            y += (descLines.length * 4) + 4;
        }
        
        // ── 3. Primary Key Metric Callout ──
        if (result.stats && result.stats.length > 0) {
            const primaryStat = result.stats[0];
            const isWarn = primaryStat.warn;
            
            if (isWarn) {
                doc.setFillColor(254, 242, 242); // #FEF2F2
                doc.setDrawColor(239, 68, 68); // #EF4444
            } else {
                doc.setFillColor(238, 242, 255); // #EEF2FF
                doc.setDrawColor(99, 102, 241); // #6366F1
            }
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');
            
            doc.setTextColor(isWarn ? 185 : 79, isWarn ? 28 : 70, isWarn ? 28 : 229);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text((primaryStat.label || 'PRIMARY RESULT').toUpperCase(), margin + 6, y + 6);
            
            doc.setFontSize(16);
            doc.text(String(primaryStat.value || ''), margin + 6, y + 14);
            
            y += 24;
        }
        
        // ── 4. Key Results Grid ──
        if (result.stats && result.stats.length > 1) {
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Summary of Results', margin, y);
            y += 5;
            
            const secondaryStats = result.stats.slice(1);
            const colWidth = (contentWidth - 6) / 2;
            let currentX = margin;
            let currentY = y;
            
            secondaryStats.forEach((stat, index) => {
                const isEven = index % 2 === 0;
                currentX = isEven ? margin : margin + colWidth + 6;
                if (!isEven) {
                    // Same row as previous
                } else if (index > 0) {
                    currentY += 14;
                }
                
                doc.setFillColor(248, 250, 252); // #F8FAFC
                doc.setDrawColor(226, 232, 240); // #E2E8F0
                doc.setLineWidth(0.3);
                doc.roundedRect(currentX, currentY, colWidth, 12, 1.5, 1.5, 'FD');
                
                doc.setTextColor(100, 116, 139);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text(stat.label, currentX + 4, currentY + 4.5);
                
                doc.setTextColor(15, 23, 42);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(String(stat.value), currentX + 4, currentY + 9.5);
            });
            
            y = currentY + 18;
        }
        
        // ── 5. Insights & Recommendation ──
        if (result.insight || result.recommendation) {
            const raw = result.insight || result.recommendation;
            let headline = 'INSIGHT & RECOMMENDATION';
            let detail = '';
            let isWarning = false;
            
            if (typeof raw === 'string') {
                detail = raw;
            } else if (raw && typeof raw === 'object') {
                if (raw.headline) headline = raw.headline;
                detail = raw.detail || raw.text || raw.message || '';
                if (raw.tone === 'warning') isWarning = true;
            }
            
            const insLines = doc.splitTextToSize(String(detail), contentWidth - 8);
            const boxHeight = Math.max(14, (insLines.length * 4) + 8);
            
            if (y + boxHeight > 270) {
                doc.addPage();
                drawHeaderBanner(doc, pageWidth, margin, tool.name);
                y = 36;
            }
            
            if (isWarning) {
                doc.setFillColor(254, 242, 242); // #FEF2F2
                doc.setDrawColor(239, 68, 68); // #EF4444
                doc.setLineWidth(0.4);
                doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');
                doc.setTextColor(185, 28, 28);
            } else {
                doc.setFillColor(240, 253, 244); // #F0FDF4
                doc.setDrawColor(34, 197, 94); // #22C55E
                doc.setLineWidth(0.4);
                doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');
                doc.setTextColor(22, 101, 52);
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(headline.toUpperCase(), margin + 4, y + 4.5);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text(insLines, margin + 4, y + 9);
            
            y += boxHeight + 4;
        }

        // ── 5b. Bulleted Insights (if present) ──
        if (result.insights && Array.isArray(result.insights) && result.insights.length > 0) {
            if (y > 240) {
                doc.addPage();
                drawHeaderBanner(doc, pageWidth, margin, tool.name);
                y = 36;
            }
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Key Observations & Financial Analysis', margin, y);
            y += 4.5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);

            result.insights.slice(0, 4).forEach(ins => {
                const bulletLines = doc.splitTextToSize(`• ${ins}`, contentWidth - 4);
                doc.text(bulletLines, margin + 2, y);
                y += (bulletLines.length * 3.8) + 1.5;
            });
            y += 2;
        }

        // ── 5c. Visual Summary / Charts (if present in DOM) ──
        if (typeof document !== 'undefined') {
            const chartCanvas = document.getElementById('result-chart') || document.querySelector('.chart-container canvas');
            if (chartCanvas && typeof chartCanvas.toDataURL === 'function') {
                try {
                    const imgData = chartCanvas.toDataURL('image/png');
                    if (imgData && imgData.length > 500) {
                        if (y > 210) {
                            doc.addPage();
                            drawHeaderBanner(doc, pageWidth, margin, tool.name);
                            y = 36;
                        }
                        doc.setTextColor(15, 23, 42);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(10);
                        doc.text('Visual Summary', margin, y);
                        y += 4;

                        const chartWidth = 90;
                        const chartHeight = 55;
                        const chartX = margin + (contentWidth - chartWidth) / 2;
                        doc.addImage(imgData, 'PNG', chartX, y, chartWidth, chartHeight);
                        y += chartHeight + 6;
                    }
                } catch (chartErr) {
                    console.warn('[PDF] Chart embedding skipped:', chartErr);
                }
            }
        }
        
        // ── 6. Schedule Table (if applicable) ──
        if (result.table && Array.isArray(result.table) && result.table.length > 0) {
            if (y > 210) {
                doc.addPage();
                drawHeaderBanner(doc, pageWidth, margin, tool.name);
                y = 36;
            }
            
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Schedule / Itemized Breakdown', margin, y);
            y += 5;
            
            const rows = result.table.slice(0, 36); // first 36 periods
            const headers = Object.keys(rows[0] || {});
            const numCols = headers.length;
            
            // Proportional column widths
            const colWidths = [];
            if (headers.includes('Category')) {
                const firstColWidth = contentWidth * 0.35;
                const otherColWidth = (contentWidth - firstColWidth) / (numCols - 1);
                headers.forEach((h, i) => colWidths.push(i === 0 ? firstColWidth : otherColWidth));
            } else {
                const uniform = contentWidth / numCols;
                headers.forEach(() => colWidths.push(uniform));
            }
            
            // Table Header
            doc.setFillColor(51, 65, 85); // #334155
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            
            let curColX = margin;
            headers.forEach((h, i) => {
                const label = h.charAt(0).toUpperCase() + h.slice(1);
                doc.text(label, curColX + 3, y + 4.8);
                curColX += colWidths[i];
            });
            y += 7;
            
            // Table Rows
            rows.forEach((row, rowIndex) => {
                if (y > 275) {
                    doc.addPage();
                    drawHeaderBanner(doc, pageWidth, margin, tool.name);
                    y = 36;
                }
                
                const isSummaryRow = row.Type === 'Summary' || (row.Category && String(row.Category).startsWith('──'));
                
                if (isSummaryRow) {
                    doc.setFillColor(238, 242, 255);
                    doc.rect(margin, y, contentWidth, 5.5, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(79, 70, 229);
                } else if (rowIndex % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin, y, contentWidth, 5.5, 'F');
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);
                }
                doc.setFontSize(7);
                
                curColX = margin;
                headers.forEach((h, i) => {
                    const val = String(row[h] || '');
                    doc.text(val, curColX + 3, y + 3.8);
                    curColX += colWidths[i];
                });
                y += 5.5;
            });
            
            if (result.table.length > 36) {
                y += 4;
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                doc.text(`* Showing first 36 of ${result.table.length} rows. Full dataset available via CSV export.`, margin, y);
            }
        }
        
        // ── 7. Page Footers ──
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('GetCalcu • Free Online Calculators (https://www.getcalcu.com) • For informational purposes only', margin, pageHeight - 8);
            doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
        }
        
        const cleanSlug = tool.id || (tool.name ? tool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'calculator');
        doc.save(`${cleanSlug}-report.pdf`);
        return true;
    } catch (error) {
        console.error('PDF generation failed:', error);
        return false;
    }
}

function drawHeaderBanner(doc, pageWidth, margin, title) {
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('GetCalcu', margin, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Report: ${title || 'Results'}`, margin, 17);
}

export function buildPDFButton(options = {}) {
    const { label = 'Download PDF', onclick = '' } = options;
    return `<button class="btn btn-outline btn-sm" id="pdf-btn" ${onclick ? `onclick="${onclick}"` : ''}><i class="fa-solid fa-file-pdf"></i> ${escapeHtml(label)}</button>`;
}
