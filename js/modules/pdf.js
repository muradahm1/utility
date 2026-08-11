/**
 * PDF Module
 * 
 * PDF generation with consistent branding and layouts.
 * Lazy-loads the PDF library on demand.
 * 
 * @module modules/pdf
 */

let pdfLibraryLoaded = false;
let jsPDF = null;

import { escapeHtml } from '../utils/index.js';

export function isPDFSupported() {
    return typeof window !== 'undefined' && typeof window.print !== 'undefined';
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
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            if (window.jspdf && window.jspdf.jsPDF) {
                jsPDF = window.jspdf.jsPDF;
                pdfLibraryLoaded = true;
                resolve(jsPDF);
            } else {
                reject(new Error('Failed to load jsPDF library'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load jsPDF library'));
        document.head.appendChild(script);
    });
}

export async function generatePDF(options = {}) {
    const { content, filename = 'document.pdf', title = 'Document' } = options;
    
    try {
        const jsPDF = await loadPDFLibrary();
        const doc = new jsPDF();
        
        doc.setProperties({
            title,
            subject: title,
            creator: 'GetCalcu',
            author: 'GetCalcu'
        });
        
        if (typeof content === 'string') {
            doc.text(content, 10, 10);
        } else if (typeof content === 'object') {
            let y = 10;
            if (content.title) {
                doc.setFontSize(18);
                doc.text(content.title, 10, y);
                y += 10;
            }
            if (content.subtitle) {
                doc.setFontSize(12);
                doc.text(content.subtitle, 10, y);
                y += 8;
            }
            y += 4;
            
            doc.setFontSize(10);
            if (content.sections) {
                content.sections.forEach(section => {
                    if (section.heading) {
                        doc.setFontSize(14);
                        doc.text(section.heading, 10, y);
                        y += 8;
                    }
                    if (section.body) {
                        doc.setFontSize(10);
                        const lines = doc.splitTextToSize(section.body, 180);
                        doc.text(lines, 10, y);
                        y += lines.length * 6;
                    }
                    y += 4;
                });
            }
        }
        
        doc.save(filename);
        return true;
    } catch (error) {
        console.error('PDF generation failed:', error);
        return false;
    }
}

export async function generateResultsPDF(tool, result) {
    if (!tool || !result) return false;
    
    const sections = [];
    
    if (tool.name) {
        sections.push({ heading: tool.name, body: tool.description || '' });
    }
    
    if (result.stats) {
        const statsText = result.stats.map(s => `${s.label}: ${s.value}`).join('\n');
        sections.push({ heading: 'Results', body: statsText });
    }
    
    if (result.table) {
        sections.push({ heading: 'Amortization Schedule', body: 'See attached schedule.' });
    }
    
    return generatePDF({
        content: { title: tool.name, sections },
        filename: `${tool.id}-results.pdf`,
        title: tool.name
    });
}

export function buildPDFButton(options = {}) {
    const { label = 'Download PDF', onclick = '' } = options;
    return `<button class="btn btn-outline btn-sm" id="pdf-btn" ${onclick ? `onclick="${onclick}"` : ''}><i class="fa-solid fa-file-pdf"></i> ${escapeHtml(label)}</button>`;
}
