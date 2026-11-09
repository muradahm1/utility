/**
 * PDF Module - World-Class Executive Report Generator
 * 
 * Generates an executive, publication-grade PDF report for any GetCalcu calculator:
 *  - Premium branded header & verified calculation badge
 *  - Primary KPI & secondary metrics grid with color-coded accents
 *  - BMI Assessment card with visual health status coloring
 *  - Distribution & Coverage progress bar visualizations
 *  - Deep recommendation cards (Why?, Risks, Savings, Confidence, Break-even)
 *  - Full narrative insights (headline + detail) with tone-matched accents
 *  - Applied scientific and mathematical formulas
 *  - Form input parameters & assumptions reference table
 *  - Formatted schedule / amortization and asset/liability breakdown tables with zebra stripes
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

/**
 * Formats any value into a clean, human-readable string for PDF text nodes.
 * Guarantees zero [object Object] output across all data types.
 * 
 * @param {*} val - Value to format
 * @returns {string} Clean string representation
 */
export function formatPdfValue(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        return Number.isFinite(val) ? val.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';
    }
    if (typeof val === 'boolean') {
        return val ? 'Yes' : 'No';
    }
    if (typeof val === 'object') {
        if (val.formatted !== undefined) return formatPdfValue(val.formatted);
        if (val.value !== undefined) return formatPdfValue(val.value);
        if (val.val !== undefined) return formatPdfValue(val.val);
        if (val.text !== undefined) return formatPdfValue(val.text);
        if (val.amount !== undefined) return formatPdfValue(val.amount);
        if (val.label !== undefined && val.value === undefined) return formatPdfValue(val.label);
        if (val.headline || val.detail) {
            return [val.headline, val.detail].filter(Boolean).join(' - ');
        }
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
            savings: rec.savings ? formatPdfValue(rec.savings) : '',
            confidence: rec.confidence ? formatPdfValue(rec.confidence) : '',
            breakEvenYear: rec.breakEvenYear ? formatPdfValue(rec.breakEvenYear) : '',
            reasons: Array.isArray(rec.reasons) ? rec.reasons.map(formatPdfValue) : [],
            risks: Array.isArray(rec.risks) ? rec.risks.map(formatPdfValue) : []
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

function renderPdfTable(doc, title, data, currentY, toolName, pageWidth, pageHeight, margin, contentWidth) {
    if (!data) return currentY;
    let rows = [];
    let headers = null;
    if (Array.isArray(data) && data.length > 0) {
        rows = data;
    } else if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
        rows = data.rows;
        headers = data.headers;
    }
    if (rows.length === 0) return currentY;
    
    let y = ensureSpace(doc, 30, currentY, toolName, pageWidth, pageHeight, margin);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(title, margin, y);
    y += 4.5;
    
    const sliceRows = rows.slice(0, 48);
    const rawHeaders = headers || Object.keys(sliceRows[0] || {});
    
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
    
    sliceRows.forEach((row, rowIndex) => {
        y = ensureSpace(doc, 5.5, y, toolName, pageWidth, pageHeight, margin);
        
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
    
    if (rows.length > 48) {
        y += 3;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`* Showing first 48 of ${rows.length} records. Full breakdown available via CSV export at getcalcu.com.`, margin, y);
        y += 4;
    }
    
    return y + 6;
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
        
        // Resolve stats array (with summary.kpis fallback)
        const allStats = (result.stats && Array.isArray(result.stats) && result.stats.length > 0)
            ? result.stats
            : ((result.summary && Array.isArray(result.summary.kpis)) ? result.summary.kpis : []);

        // ── 3. Primary Key Metric Callout ────────────────────────────────
        if (allStats.length > 0) {
            y = ensureSpace(doc, 24, y, tool.name, pageWidth, pageHeight, margin);
            const primaryStat = allStats[0];
            const statVal = primaryStat.value !== undefined ? primaryStat.value : primaryStat.val;
            
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
            doc.text(formatPdfValue(statVal), margin + 6, y + 15);
            
            y += 26;
        }

        // ── 3b. BMI Assessment Callout Card ──────────────────────────────
        if (result.bmiGauge) {
            y = ensureSpace(doc, 26, y, tool.name, pageWidth, pageHeight, margin);
            
            const bmiVal = typeof result.bmiGauge.bmi === 'number'
                ? result.bmiGauge.bmi.toFixed(1)
                : formatPdfValue(result.bmiGauge.bmi);
            const bmiCategory = result.bmiGauge.label || 'Standard';
            
            const isNormal = bmiCategory.toLowerCase().includes('normal');
            const isUnder = bmiCategory.toLowerCase().includes('under');
            const cardBg = isNormal ? [236, 253, 245] : (isUnder ? [239, 246, 255] : [254, 242, 242]);
            const cardBorder = isNormal ? [16, 185, 129] : (isUnder ? [59, 130, 246] : [239, 68, 68]);
            const textBadge = isNormal ? [4, 120, 87] : (isUnder ? [29, 78, 216] : [185, 28, 28]);
            
            doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
            doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');
            
            doc.setTextColor(textBadge[0], textBadge[1], textBadge[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('BODY MASS INDEX (BMI) ASSESSMENT', margin + 6, y + 7);
            
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(15);
            doc.text(`BMI: ${bmiVal}`, margin + 6, y + 16.5);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(textBadge[0], textBadge[1], textBadge[2]);
            doc.text(`Classification: ${bmiCategory}`, pageWidth - margin - 6, y + 16.5, { align: 'right' });
            
            y += 28;
        }

        // ── 3c. Visual Progress & Coverage Bars ──────────────────────────
        if (result.bars && Array.isArray(result.bars) && result.bars.length > 0) {
            const barHeight = (result.bars.length * 10) + 12;
            y = ensureSpace(doc, barHeight + 4, y, tool.name, pageWidth, pageHeight, margin);
            
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Distribution & Breakdown', margin, y);
            y += 5;
            
            result.bars.forEach(bar => {
                const label = bar.label || '';
                const pct = typeof bar.pct === 'number' ? bar.pct : (parseFloat(bar.pct) || 0);
                const displayVal = bar.value ? formatPdfValue(bar.value) : `${pct.toFixed(1)}%`;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                doc.text(label, margin, y + 3.5);
                
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(displayVal, pageWidth - margin, y + 3.5, { align: 'right' });
                
                // Track background
                doc.setFillColor(241, 245, 249);
                doc.roundedRect(margin, y + 4.5, contentWidth, 3, 1, 1, 'F');
                
                // Progress fill
                const fillWidth = Math.min(contentWidth, Math.max(1, (pct / 100) * contentWidth));
                doc.setFillColor(99, 102, 241);
                doc.roundedRect(margin, y + 4.5, fillWidth, 3, 1, 1, 'F');
                
                y += 10;
            });
            y += 4;
        }
        
        // ── 4. Key Results Grid (Secondary Stats) ────────────────────────
        if (allStats.length > 1) {
            const secondaryStats = allStats.slice(1);
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
                const statVal = stat.value !== undefined ? stat.value : stat.val;
                
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
                doc.text(formatPdfValue(statVal), currentX + 3.5, currentY + 9.5);
            });
            
            y += (numRows * 14) + 6;
        }
        
        // ── 5. Executive Recommendation Section ──────────────────────────
        const rec = normalizeRecommendation(result.recommendation);
        if (rec) {
            let recHeight = 22;
            const headlineLines = doc.splitTextToSize(rec.headline, contentWidth - 12);
            recHeight += (headlineLines.length * 3.8);
            
            if (rec.reasons.length > 0) recHeight += 6 + (rec.reasons.length * 4);
            if (rec.risks.length > 0) recHeight += 6 + (rec.risks.length * 4);
            
            y = ensureSpace(doc, recHeight + 6, y, tool.name, pageWidth, pageHeight, margin);
            
            const isBuy = rec.winner === 'buy' || rec.winner === 'BUY';
            const cardBg = isBuy ? [236, 253, 245] : [245, 243, 255];
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

        // ── 6b. Applied Mathematical Formula & Model ─────────────────────
        if (result.formula) {
            const formulaText = formatPdfValue(result.formula);
            const formulaLines = doc.splitTextToSize(formulaText, contentWidth - 12);
            const boxH = 10 + (formulaLines.length * 4);
            y = ensureSpace(doc, boxH + 4, y, tool.name, pageWidth, pageHeight, margin);
            
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text('APPLIED FORMULA & MATHEMATICAL MODEL', margin + 6, y + 5.5);
            
            doc.setFont('courier', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(formulaLines, margin + 6, y + 10);
            
            y += boxH + 6;
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
        
        // ── 8. Schedule & Breakdown Tables ───────────────────────────────
        if (result.table) {
            y = renderPdfTable(doc, 'Schedule / Breakdown Table', result.table, y, tool.name, pageWidth, pageHeight, margin, contentWidth);
        }
        if (result.assetTable) {
            y = renderPdfTable(doc, 'Asset Breakdown Table', result.assetTable, y, tool.name, pageWidth, pageHeight, margin, contentWidth);
        }
        if (result.liabilityTable) {
            y = renderPdfTable(doc, 'Liability Breakdown Table', result.liabilityTable, y, tool.name, pageWidth, pageHeight, margin, contentWidth);
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
