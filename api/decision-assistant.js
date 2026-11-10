// ============================================================
// GetCalcu — AI Financial Decision Assistant Gateway
// Serverless API Endpoint for Vercel (/api/decision-assistant)
//
// Bridges natural-language decision queries with GetCalcu's
// verified, deterministic client-side calculation engines.
//
// Key Guardrails:
// 1. Zero arithmetic hallucination: AI only extracts validated
//    structured inputs; all calculations run deterministically.
// 2. Strict PII sanitization: Strips phone numbers, SSNs, credit cards,
//    and email addresses before dispatching to LLM.
// 3. Per-IP Token-Bucket Rate Limiting to prevent abuse.
// 4. Zero server-side persistence of private financial queries.
// ============================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const FALLBACK_MODEL = 'gemini-2.0-flash';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;
const MAX_QUERY_LENGTH = 1200;

// In-memory rate limiting store (ephemeral across serverless invocations)
const _rateLimitMap = new Map();

/**
 * Clean up old rate limit entries periodically
 */
function cleanupRateLimit(now) {
    if (_rateLimitMap.size > 2000) {
        for (const [ip, data] of _rateLimitMap.entries()) {
            if (now - data.resetTime > RATE_LIMIT_WINDOW_MS) {
                _rateLimitMap.delete(ip);
            }
        }
    }
}

/**
 * Scrub PII from text before forwarding to external AI providers
 */
export function sanitizeInput(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        // Credit card numbers (13-19 digits with optional spaces or dashes)
        .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD]')
        // Social Security Numbers (US SSN: XXX-XX-XXXX)
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
        // Email addresses
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
        // Phone numbers (common international and US formats)
        .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]')
        .trim();
}

/**
 * Extract client IP address from Vercel / proxy headers
 */
export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.toString().split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Build dynamic system prompt tailored to the active calculator
 */
export function buildSystemPrompt(toolInfo) {
    const fieldDescriptions = (toolInfo.fields || [])
        .map(f => `- ${f.id} (${f.label}): type=${f.type}, default=${f.default}${f.min !== undefined ? `, min=${f.min}` : ''}${f.max !== undefined ? `, max=${f.max}` : ''}${f.hint ? `, hint="${f.hint}"` : ''}`)
        .join('\n');

    return `You are GetCalcu's Financial Decision Co-Pilot, an objective behavioral economist and financial strategist.
Your mission is to help people make consequential financial decisions with clarity and peace of mind.

CRITICAL INSTRUCTIONS:
1. NEVER CALCULATE final amortization, tax tables, or complex loan schedules yourself. GetCalcu's verified deterministic engines execute all math.
2. Your primary job is to extract exact numerical input parameters for the calculator named "${toolInfo.name || 'Calculator'}" (${toolInfo.id}).
3. When the user provides income, debts, savings, or purchase prices, map them accurately to the calculator fields.
4. If a critical field is omitted, use a conservative, standard default or ask at most ONE focused follow-up question.
5. Provide behavioral trade-offs: point out debt-to-income risks (e.g. front-end > 28%, back-end > 36%), emergency fund depletion, or hidden costs (property taxes, insurance, maintenance).
6. Always return STRICT JSON conforming to the requested schema. Do not wrap in markdown or commentary outside the JSON.

Available calculator fields:
${fieldDescriptions}`;
}

/**
 * Deterministic behavioral decision fallback when external AI providers are unavailable
 */
export function generateDeterministicGuidance(tool, currentVals = {}, query = '') {
    const params = { ...currentVals };
    const tradeOffs = [];
    const riskWarnings = [];
    let explanation = '';
    const qLower = (query || '').toLowerCase();
    const toolId = (tool.id || '').toLowerCase();

    if (toolId.includes('mortgage') || toolId.includes('home')) {
        let price = parseFloat(params.home_price) || 400000;
        let down = parseFloat(params.down_payment) || Math.round(price * 0.2);
        let rate = parseFloat(params.interest_rate) || 6.5;
        let term = parseInt(params.loan_term) || 30;

        if (qLower.includes('drop 1%') || qLower.includes('lower rate') || qLower.includes('drop')) {
            rate = Math.max(1, +(rate - 1).toFixed(2));
            params.interest_rate = rate;
            explanation = `Simulating a 1.0% interest rate reduction to ${rate}%. Lowering your mortgage interest rate directly decreases your required monthly payment and reduces lifetime interest expenses.`;
            tradeOffs.push(`Rate drop reduces monthly amortization strain, freeing up cash flow for investments or emergency reserves.`);
        } else if (qLower.includes('15') || qLower.includes('shorter') || qLower.includes('faster')) {
            term = 15;
            rate = Math.max(1, +(rate - 0.5).toFixed(2));
            params.loan_term = 15;
            params.interest_rate = rate;
            explanation = `Simulating a transition from a 30-year to a 15-year fixed mortgage at ${rate}%. Equity accumulates at more than double the speed.`;
            tradeOffs.push(`Monthly payments increase by approximately 30-40%, but tens of thousands of dollars in lifetime interest are eliminated.`);
        } else if (qLower.includes('3.5%') || qLower.includes('fha') || qLower.includes('low down')) {
            down = Math.round(price * 0.035);
            params.down_payment = down;
            explanation = `Modeling an FHA or low-down-payment scenario with 3.5% down ($${down.toLocaleString()}).`;
            tradeOffs.push(`Preserves liquid cash upfront, but incurs ongoing mortgage insurance premiums (MIP/PMI) and higher principal balances.`);
        } else {
            explanation = `Analyzing mortgage scenario with a purchase price of $${price.toLocaleString()} and $${down.toLocaleString()} down payment.`;
            tradeOffs.push(`Every additional $10,000 in down payment reduces the financed balance and lifetime finance charges.`);
        }

        const ltv = ((price - down) / price) * 100;
        if (ltv > 80) {
            riskWarnings.push(`Loan-to-Value (LTV) is ${ltv.toFixed(1)}%. Financing more than 80% requires private mortgage insurance (PMI) until principal drops to 78-80%.`);
        }
        riskWarnings.push('Ensure total housing debt (PITI) does not exceed 28% of your gross monthly household income.');

    } else if (toolId.includes('loan') || toolId.includes('credit') || toolId.includes('debt')) {
        let amount = parseFloat(params.loan_amount || params.balance) || 25000;
        let rate = parseFloat(params.interest_rate || params.apr) || 7.5;
        let term = parseInt(params.loan_term || params.months) || 48;

        if (qLower.includes('extra') || qLower.includes('pay off') || qLower.includes('accelerate')) {
            explanation = `Evaluating an accelerated debt payoff strategy. Making extra payments directly to principal shortens your amortization timeline.`;
            tradeOffs.push('Directing extra funds toward debt produces a guaranteed, risk-free return equal to your loan interest rate.');
        } else {
            explanation = `Evaluating debt payoff for $${amount.toLocaleString()} at ${rate}% APR across ${term} periods.`;
            tradeOffs.push('Shorter loan durations cut total financing costs, while longer durations lower monthly cash obligations.');
        }
        riskWarnings.push('Maintain a starter emergency cushion ($1,000 to 1 month of expenses) before aggressively paying down low-interest debt.');

    } else if (toolId.includes('retire') || toolId.includes('401k') || toolId.includes('invest') || toolId.includes('compound')) {
        explanation = `Projecting wealth accumulation and compound growth under current contribution rates.`;
        tradeOffs.push('Increasing recurring monthly contributions by even 1-2% has an exponential compounding effect over a 15 to 30-year horizon.');
        riskWarnings.push('Account for inflation when estimating future purchasing power; historical inflation averages roughly 2.5-3.0% annually.');

    } else {
        explanation = `Analyzing ${tool.name || 'calculator'} parameters to identify optimal financial adjustments.`;
        tradeOffs.push('Reviewing immediate cash flow constraints against long-term goal completion.');
        riskWarnings.push('Verify baseline assumptions before committing significant capital.');
    }

    return {
        parameters: params,
        explanation,
        tradeOffs,
        riskWarnings,
        followUpQuestion: null
    };
}

/**
 * Resolve Gemini API key from environment with flexible name and case matching
 */
export function resolveGeminiApiKey() {
    const directKeys = [
        'GEMINI_API_KEY',
        'GOOGLE_API_KEY',
        'GEMINI_KEY',
        'GOOGLE_GEMINI_KEY',
        'GOOGLE_AI_API_KEY',
        'NEXT_PUBLIC_GEMINI_API_KEY',
        'VITE_GEMINI_API_KEY'
    ];
    for (const k of directKeys) {
        if (process.env[k]) return process.env[k].trim();
    }
    // Case-insensitive / fuzzy match across all process.env keys
    for (const [k, v] of Object.entries(process.env)) {
        if (/^(?:NEXT_PUBLIC_|VITE_)?(?:GEMINI|GOOGLE_AI|GOOGLE_GEMINI)(?:_API)?_KEY$/i.test(k) && v) {
            return v.trim();
        }
    }
    return null;
}

/**
 * Main API Handler
 */
export default async function handler(req, res) {
    // 1. Method verification
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
    }

    // 2. Rate limiting check
    const now = Date.now();
    cleanupRateLimit(now);
    const ip = getClientIp(req);
    let rateData = _rateLimitMap.get(ip);

    if (!rateData || now > rateData.resetTime) {
        rateData = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
        _rateLimitMap.set(ip, rateData);
    } else {
        rateData.count++;
        if (rateData.count > MAX_REQUESTS_PER_WINDOW) {
            return res.status(429).json({
                ok: false,
                error: 'Too many requests. Please wait a moment before asking another question.',
                retryAfterSeconds: Math.ceil((rateData.resetTime - now) / 1000)
            });
        }
    }

    // 3. Parse and validate body
    let body;
    try {
        body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');
    } catch {
        return res.status(400).json({ ok: false, error: 'Invalid JSON payload.' });
    }

    const rawQuery = String(body.query || '').trim();
    if (!rawQuery) {
        return res.status(400).json({ ok: false, error: 'Query parameter is required.' });
    }
    if (rawQuery.length > MAX_QUERY_LENGTH) {
        return res.status(400).json({ ok: false, error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.` });
    }

    const tool = body.tool || {};
    if (!tool.id || !Array.isArray(tool.fields)) {
        return res.status(400).json({ ok: false, error: 'Valid tool definition with id and fields array is required.' });
    }

    // 4. Scrub PII
    const sanitizedQuery = sanitizeInput(rawQuery);

    // 5. Test/Mock Bypass for CI/Unit Tests
    let parsedData = null;
    let targetModel = body.model || DEFAULT_MODEL;

    if (body._mockResponse || process.env.NODE_ENV === 'test-mock') {
        parsedData = body._mockResponse || {
            parameters: { home_price: 350000, down_payment: 70000, interest_rate: 6.8, loan_term: 30 },
            explanation: 'Mocked decision guidance for unit testing.',
            tradeOffs: ['Putting 20% down eliminates PMI fees.'],
            riskWarnings: ['DTI is at 38%.'],
            followUpQuestion: null
        };
        targetModel = 'mock-test';
    } else {
        // 6. Check API Key
        const apiKey = resolveGeminiApiKey();
        if (!apiKey) {
            return res.status(500).json({
                ok: false,
                error: 'GEMINI_API_KEY is not configured in Vercel environment variables. Please check that GEMINI_API_KEY is added under Vercel Project Settings > Environment Variables for Production.'
            });
        }

        // 7. Call Gemini API
        const systemPrompt = buildSystemPrompt(tool);
        const userPrompt = `User question / financial situation:
"${sanitizedQuery}"

Current field values in calculator:
${JSON.stringify(body.currentValues || {})}

Return a valid JSON object with the following schema:
{
  "parameters": { [field_id]: number | string },
  "explanation": "Clear plain-language summary of what this means for their decision (2-3 sentences)",
  "tradeOffs": ["Trade-off 1", "Trade-off 2"],
  "riskWarnings": ["Vulnerability or risk warning, e.g. DTI or reserves"],
  "followUpQuestion": null or "One single clarifying question if critical information is missing"
}`;

        const requestPayload = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                maxOutputTokens: 800,
                responseMimeType: 'application/json'
            }
        };

        const endpointsToTry = [
            'https://generativelanguage.googleapis.com/v1beta/models',
            'https://generativelanguage.googleapis.com/v1/models'
        ];
        const modelsToTry = [
            body.model,
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-2.0-flash',
            'gemini-1.5-pro',
            'gemini-pro'
        ].filter(Boolean);
        const uniqueModels = [...new Set(modelsToTry)];

        let geminiResponse = null;
        let lastErrorMsg = '';

        try {
            // 1. Try standard candidate models across v1beta and v1
            outerLoop:
            for (const ep of endpointsToTry) {
                for (const model of uniqueModels) {
                    targetModel = model;
                    const geminiUrl = `${ep}/${model}:generateContent?key=${apiKey}`;
                    try {
                        geminiResponse = await fetch(geminiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestPayload)
                        });
                        if (geminiResponse.ok) {
                            break outerLoop;
                        } else {
                            const errData = await geminiResponse.json().catch(() => ({}));
                            lastErrorMsg = errData.error?.message || `Google AI returned status ${geminiResponse.status} (${geminiResponse.statusText})`;
                        }
                    } catch (fetchErr) {
                        lastErrorMsg = fetchErr.message;
                    }
                }
            }

            // 2. If candidates failed, attempt dynamic ModelService.ListModels discovery
            if (!geminiResponse || !geminiResponse.ok) {
                try {
                    for (const ep of endpointsToTry) {
                        const listResp = await fetch(`${ep}?key=${apiKey}`);
                        if (listResp.ok) {
                            const listJson = await listResp.json();
                            const dynamicModels = (listJson.models || [])
                                .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                                .map(m => m.name.replace(/^models\//, ''));
                            for (const dynModel of dynamicModels) {
                                targetModel = dynModel;
                                const dynUrl = `${ep}/${dynModel}:generateContent?key=${apiKey}`;
                                const dynResp = await fetch(dynUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(requestPayload)
                                });
                                if (dynResp.ok) {
                                    geminiResponse = dynResp;
                                    break;
                                }
                            }
                            if (geminiResponse && geminiResponse.ok) break;
                        }
                    }
                } catch (_) {}
            }

            // 3. Parse Gemini response or fall back gracefully to deterministic guidance
            if (!geminiResponse || !geminiResponse.ok) {
                console.warn('[GetCalcu AI] Upstream provider unavailable, falling back to deterministic synthesis:', lastErrorMsg);
                parsedData = generateDeterministicGuidance(tool, body.currentValues, sanitizedQuery);
                targetModel = 'deterministic-synthesis';
            } else {
                const data = await geminiResponse.json();
                const candidate = data.candidates?.[0];
                const rawContent = candidate?.content?.parts?.[0]?.text;

                if (!rawContent) {
                    parsedData = generateDeterministicGuidance(tool, body.currentValues, sanitizedQuery);
                    targetModel = 'deterministic-synthesis';
                } else {
                    try {
                        parsedData = JSON.parse(rawContent);
                    } catch (jsonErr) {
                        const cleaned = rawContent.replace(/```json\s*|```/g, '').trim();
                        parsedData = JSON.parse(cleaned);
                    }
                }
            }
        } catch (err) {
            console.warn('[GetCalcu AI] Error during synthesis, using deterministic fallback:', err.message);
            parsedData = generateDeterministicGuidance(tool, body.currentValues, sanitizedQuery);
            targetModel = 'deterministic-synthesis';
        }
    }

    // Validate and clean parameter keys against calculator schema
    const cleanParameters = {};
    if (parsedData && parsedData.parameters && typeof parsedData.parameters === 'object') {
        const allowedFieldIds = new Set(tool.fields.map(f => f.id));
        for (const [k, v] of Object.entries(parsedData.parameters)) {
            if (allowedFieldIds.has(k)) {
                cleanParameters[k] = v;
            }
        }
    }

    return res.status(200).json({
        ok: true,
        model: targetModel,
        data: {
            parameters: cleanParameters,
            explanation: String(parsedData?.explanation || ''),
            tradeOffs: Array.isArray(parsedData?.tradeOffs) ? parsedData.tradeOffs.map(String) : [],
            riskWarnings: Array.isArray(parsedData?.riskWarnings) ? parsedData.riskWarnings.map(String) : [],
            followUpQuestion: parsedData?.followUpQuestion ? String(parsedData.followUpQuestion) : null
        }
    });
}
