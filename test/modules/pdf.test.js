import { describe, it, expect } from 'vitest';
import { isPDFSupported, formatPdfValue } from '../../js/modules/pdf.js';

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
        expect(typeof pdfModule.formatPdfValue).toBe('function');
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

    it('formatPdfValue gracefully handles complex and nested values without [object Object]', () => {
        expect(formatPdfValue(null)).toBe('—');
        expect(formatPdfValue(undefined)).toBe('—');
        expect(formatPdfValue(1234.56)).toBe('1,234.56');
        expect(formatPdfValue(true)).toBe('Yes');
        expect(formatPdfValue(false)).toBe('No');
        expect(formatPdfValue('Test value')).toBe('Test value');

        // Object with .value
        expect(formatPdfValue({ value: '$500.00' })).toBe('$500.00');
        // Object with .val
        expect(formatPdfValue({ val: '7.5%' })).toBe('7.5%');
        // Object with .text
        expect(formatPdfValue({ text: 'Detailed note' })).toBe('Detailed note');
        // Object with headline + detail
        expect(formatPdfValue({ headline: 'Growth', detail: 'Up 10%' })).toBe('Growth - Up 10%');
        // Array of objects
        expect(formatPdfValue([{ value: 'A' }, { val: 'B' }])).toBe('A, B');

        // Never returns [object Object]
        const arbitraryObj = { foo: 'bar', count: 42 };
        const res = formatPdfValue(arbitraryObj);
        expect(res).not.toContain('[object Object]');
    });
});
