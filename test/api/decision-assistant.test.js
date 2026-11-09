import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import handler, { sanitizeInput, getClientIp, buildSystemPrompt } from '../../api/decision-assistant.js';

describe('AI Decision Assistant Gateway (/api/decision-assistant)', () => {
    const mockTool = {
        id: 'mortgage-calculator',
        name: 'Mortgage Calculator',
        fields: [
            { id: 'home_price', label: 'Home Price ($)', type: 'number', default: 400000 },
            { id: 'down_payment', label: 'Down Payment ($)', type: 'number', default: 80000 },
            { id: 'interest_rate', label: 'Interest Rate (%)', type: 'number', default: 6.5 },
            { id: 'loan_term', label: 'Loan Term (years)', type: 'select', default: 30 }
        ]
    };

    function createMockRes() {
        const res = {
            statusCode: 200,
            _data: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this._data = payload;
                return this;
            }
        };
        return res;
    }

    describe('PII Sanitization', () => {
        it('redacts social security numbers', () => {
            const raw = 'My SSN is 123-45-6789 and I want to buy a house';
            expect(sanitizeInput(raw)).toBe('My SSN is [REDACTED_SSN] and I want to buy a house');
        });

        it('redacts credit card numbers', () => {
            const raw = 'I paid off card 4532-1234-5678-9012 last week';
            expect(sanitizeInput(raw)).toBe('I paid off card [REDACTED_CARD] last week');
        });

        it('redacts email addresses', () => {
            const raw = 'Send the quote to user.name@domain.com please';
            expect(sanitizeInput(raw)).toBe('Send the quote to [REDACTED_EMAIL] please');
        });

        it('redacts phone numbers', () => {
            const raw = 'Call me at (555) 234-5678 or +1-555-234-5678';
            const sanitized = sanitizeInput(raw);
            expect(sanitized).toContain('[REDACTED_PHONE]');
            expect(sanitized).not.toContain('234-5678');
        });
    });

    describe('Prompt Construction & IP Extraction', () => {
        it('builds system prompt containing tool fields and behavioral instructions', () => {
            const prompt = buildSystemPrompt(mockTool);
            expect(prompt).toContain('GetCalcu\'s Financial Decision Co-Pilot');
            expect(prompt).toContain('NEVER CALCULATE');
            expect(prompt).toContain('home_price');
            expect(prompt).toContain('down_payment');
            expect(prompt).toContain('Mortgage Calculator');
        });

        it('extracts IP correctly from x-forwarded-for header', () => {
            const req = { headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' } };
            expect(getClientIp(req)).toBe('203.0.113.195');
        });
    });

    describe('HTTP Handler Request Validation', () => {
        it('rejects GET requests with 405 Method Not Allowed', async () => {
            const req = { method: 'GET', headers: {} };
            const res = createMockRes();
            await handler(req, res);
            expect(res.statusCode).toBe(405);
            expect(res._data.ok).toBe(false);
        });

        it('rejects empty query with 400 Bad Request', async () => {
            const req = {
                method: 'POST',
                headers: {},
                body: { query: '   ', tool: mockTool }
            };
            const res = createMockRes();
            await handler(req, res);
            expect(res.statusCode).toBe(400);
            expect(res._data.error).toContain('Query parameter is required');
        });

        it('rejects invalid or missing tool definition with 400 Bad Request', async () => {
            const req = {
                method: 'POST',
                headers: {},
                body: { query: 'Can I afford 300k?', tool: null }
            };
            const res = createMockRes();
            await handler(req, res);
            expect(res.statusCode).toBe(400);
            expect(res._data.error).toContain('Valid tool definition');
        });

        it('returns 500 if GEMINI_API_KEY is not configured and not in mock mode', async () => {
            const origKey = process.env.GEMINI_API_KEY;
            delete process.env.GEMINI_API_KEY;
            delete process.env.GOOGLE_API_KEY;

            const req = {
                method: 'POST',
                headers: {},
                body: { query: 'Can I afford 300k house?', tool: mockTool }
            };
            const res = createMockRes();
            await handler(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._data.error).toContain('GEMINI_API_KEY is not configured');

            if (origKey) process.env.GEMINI_API_KEY = origKey;
        });

        it('successfully executes mock test payload with field filtering', async () => {
            const req = {
                method: 'POST',
                headers: { 'x-forwarded-for': '12.34.56.78' },
                body: {
                    query: 'Can I afford a $350k house with 70k down?',
                    tool: mockTool,
                    _mockResponse: {
                        parameters: {
                            home_price: 350000,
                            down_payment: 70000,
                            unrelated_hacked_field: 'exploit'
                        },
                        explanation: 'A $350,000 home with $70k down gives you an 80% LTV.',
                        tradeOffs: ['Zero PMI'],
                        riskWarnings: ['Check property taxes'],
                        followUpQuestion: null
                    }
                }
            };
            const res = createMockRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            expect(res._data.ok).toBe(true);
            expect(res._data.data.parameters.home_price).toBe(350000);
            expect(res._data.data.parameters.down_payment).toBe(70000);
            // Must filter out unknown fields not in tool.fields
            expect(res._data.data.parameters.unrelated_hacked_field).toBeUndefined();
            expect(res._data.data.explanation).toContain('A $350,000 home');
        });
    });
});
