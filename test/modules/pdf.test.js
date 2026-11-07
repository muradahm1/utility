import { describe, it, expect } from 'vitest';
import { isPDFSupported } from '../../js/modules/pdf.js';

describe('PDF Export Module', () => {
    it('isPDFSupported returns boolean in environment', () => {
        expect(typeof isPDFSupported()).toBe('boolean');
    });

    it('exports all expected functions cleanly', async () => {
        const pdfModule = await import('../../js/modules/pdf.js');
        expect(typeof pdfModule.generateResultsPDF).toBe('function');
        expect(typeof pdfModule.isPDFSupported).toBe('function');
        expect(typeof pdfModule.loadPDFLibrary).toBe('function');
        expect(typeof pdfModule.buildPDFButton).toBe('function');
    });

    it('generateResultsPDF returns false when tool or result is missing', async () => {
        const { generateResultsPDF } = await import('../../js/modules/pdf.js');
        const resNull = await generateResultsPDF(null, null);
        expect(resNull).toBe(false);
    });

    it('buildPDFButton generates accessible markup', async () => {
        const { buildPDFButton } = await import('../../js/modules/pdf.js');
        const html = buildPDFButton({ label: 'Export PDF' });
        expect(html).toContain('Export PDF');
        expect(html).toContain('fa-file-pdf');
        expect(html).toContain('id="pdf-btn"');
    });
});
