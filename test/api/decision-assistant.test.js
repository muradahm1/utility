import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import handler, {
    sanitizeInput,
    getClientIp,
    buildSystemPrompt,
    isOriginAllowed,
    validateAndClampParameters,
    getScenarioCacheKey,
    getCachedScenario,
    setCachedScenario,
    clearScenarioCache,
    getVerifiedModel,
    setVerifiedModel,
    clearVerifiedModel
} from '../../api/decision-assistant.js';

describe('AI Decision Assistant Gateway (/api/decision-assistant)', () => {
    const mockTool = {
        id: 'mortgage-calculator',
        name: 'Mortgage Calculator',
        fields: [
            { id: 'home_price', label: 'Home Price ($)', type: 'number', default: 400000, min: 10000, max: 10000000 },
            { id: 'down_payment', label: 'Down Payment ($)', type: 'number', default: 80000, min: 0, max: 5000000 },
            { id: 'interest_rate', label: 'Interest Rate (%)', type: 'number', default: 6.5, min: 0.1, max: 25 },
            { id: 'loan_term', label: 'Loan Term (years)', type: 'select', default: 30, options: [15, 20, 30] }
        ]
    };

    function createMockRes() {
        const headers = {};
        const res = {
            statusCode: 200,
            _data: null,
            headers,
            setHeader(key, val) {
                headers[key] = val;
            },
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this._data = payload;
                return this;
            },
            end() {
                return this;
            }
        };
        return res;
    }

    beforeEach(() => {
        clearScenarioCache();
        clearVerifiedModel();
    });

    describe('PII Sanitization & Input Security', () => {
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

        it('redacts IBAN and cryptocurrency wallet addresses', () => {
            const ibanRaw = 'Transfer to DE89370400440532013000 please';
            expect(sanitizeInput(ibanRaw)).toBe('Transfer to [REDACTED_IBAN] please');

            const btcRaw = 'My wallet is bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq for funds';
            expect(sanitizeInput(btcRaw)).toBe('My wallet is [REDACTED_CRYPTO] for funds');

            const ethRaw = 'Send to 0x71C8451C3C43344F2380d73853E45fCE07B72aB3 now';
            expect(sanitizeInput(ethRaw)).toBe('Send to [REDACTED_CRYPTO] now');
        });

        it('strips HTML and script injection attempts', () => {
            const xss = '<script>alert("hack")</script> What if interest rates drop 1%?';
            const sanitized = sanitizeInput(xss);
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('</script>');
            expect(sanitized).toContain('What if interest rates drop 1%?');
        });
    });

    describe('Origin & CORS Access Control', () => {
        it('permits localhost, 127.0.0.1, getcalcu.com, and vercel.app domains', () => {
            expect(isOriginAllowed('http://localhost:3000')).toBe(true);
            expect(isOriginAllowed('http://127.0.0.1:8080')).toBe(true);
            expect(isOriginAllowed('https://getcalcu.com')).toBe(true);
            expect(isOriginAllowed('https://www.getcalcu.com')).toBe(true);
            expect(isOriginAllowed('https://preview-deploy.vercel.app')).toBe(true);
            expect(isOriginAllowed('')).toBe(true);
            expect(isOriginAllowed(null)).toBe(true);
        });

        it('rejects unauthorized external origins', () => {
            expect(isOriginAllowed('https://evil-hacker.com')).toBe(false);
            expect(isOriginAllowed('https://phishing-calcu.org')).toBe(false);
        });

        it('returns 403 Forbidden when request origin is untrusted', async () => {
            const req = {
                method: 'POST',
                headers: {
                    origin: 'https://malicious-scraper.xyz'
                },
                body: { query: 'Can I afford this?', tool: mockTool }
            };
            const res = createMockRes();
            await handler(req, res);

            expect(res.statusCode).toBe(403);
            expect(res._data.ok).toBe(false);
            expect(res._data.error).toContain('Forbidden');
        });

        it('handles OPTIONS preflight requests cleanly with 204', async () => {
            const req = {
                method: 'OPTIONS',
                headers: {
                    origin: 'https://www.getcalcu.com'
                }
            };
            const res = createMockRes();
            await handler(req, res);

            expect(res.statusCode).toBe(204);
            expect(res.headers['Access-Control-Allow-Origin']).toBe('https://www.getcalcu.com');
        });
    });

    describe('Parameter Validation & Clamping', () => {
        it('clamps numbers below min or above max boundaries', () => {
            const raw = {
                home_price: 99999999999, // Exceeds max 10,000,000
                down_payment: -5000,     // Below min 0
                interest_rate: 6.75,
                unrelated_key: 'hacked'
            };
            const clamped = validateAndClampParameters(raw, mockTool.fields);
            expect(clamped.home_price).toBe(10000000);
            expect(clamped.down_payment).toBe(0);
            expect(clamped.interest_rate).toBe(6.75);
            expect(clamped.unrelated_key).toBeUndefined();
        });

        it('validates select dropdown options and discards invalid options', () => {
            const valid = { loan_term: 15 };
            expect(validateAndClampParameters(valid, mockTool.fields).loan_term).toBe(15);

            const invalid = { loan_term: 45 }; // Not in [15, 20, 30]
            expect(validateAndClampParameters(invalid, mockTool.fields).loan_term).toBe(30); // Falls back to default
        });
    });

    describe('Model Memoization & Scenario Caching (Speed Protections)', () => {
        it('saves and clears verified model & endpoint memoization', () => {
            expect(getVerifiedModel().model).toBeNull();
            setVerifiedModel('https://generativelanguage.googleapis.com/v1beta/models', 'gemini-2.0-flash');
            expect(getVerifiedModel().model).toBe('gemini-2.0-flash');
            expect(getVerifiedModel().endpoint).toContain('v1beta');

            clearVerifiedModel();
            expect(getVerifiedModel().model).toBeNull();
        });

        it('caches scenario results and serves instant cache hits', () => {
            const key = getScenarioCacheKey('mortgage-calculator', { home_price: 400000 }, 'Drop 1% rate');
            expect(getCachedScenario(key)).toBeNull();

            const payload = {
                model: 'gemini-2.0-flash',
                data: { parameters: { interest_rate: 5.5 }, explanation: 'Cached analysis' }
            };
            setCachedScenario(key, payload);

            const hit = getCachedScenario(key);
            expect(hit).not.toBeNull();
            expect(hit.model).toBe('gemini-2.0-flash');
            expect(hit.data.parameters.interest_rate).toBe(5.5);
        });
    });

    describe('Prompt Construction & IP Extraction', () => {
        it('builds system prompt containing tool fields, behavioral instructions and security rules', () => {
            const prompt = buildSystemPrompt(mockTool);
            expect(prompt).toContain('GetCalcu\'s Financial Decision Co-Pilot');
            expect(prompt).toContain('NEVER CALCULATE');
            expect(prompt).toContain('home_price');
            expect(prompt).toContain('down_payment');
            expect(prompt).toContain('Mortgage Calculator');
            expect(prompt).toContain('SECURITY RULE');
            expect(prompt).toContain('<user_financial_scenario>');
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

        it('successfully executes mock test payload with field filtering and boundary clamping', async () => {
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
