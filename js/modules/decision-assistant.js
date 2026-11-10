/**
 * GetCalcu Decision Co-Pilot
 * Context-Aware AI Financial Decision Assistant
 *
 * Connects natural language user queries with GetCalcu's verified
 * deterministic calculation engines.
 *
 * @module modules/decision-assistant
 */

import { escapeHtml } from '../utils/index.js';

let _activeDrawer = null;

const QUICK_PROMPTS = {
    'mortgage-calculator': [
        'Can I afford a $380,000 home on $7,500 monthly income with $450 car debt?',
        'What if interest rates increase to 7.5%?',
        'How much down payment do I need to eliminate PMI?',
        'Compare 15-year vs 30-year payment trade-offs for $300k.'
    ],
    'house-affordability-calculator': [
        'How much home can I safely buy earning $90,000 annually?',
        'I have $60,000 saved and $500/mo debt. What is my realistic budget?',
        'Keep my debt-to-income ratio strictly under 32%.'
    ],
    'loan-calculator': [
        'How much will an extra $100 monthly payment save on a $25,000 loan?',
        'Compare a 3-year vs 5-year repayment schedule.',
        'What is the true total interest cost if APR is 9.5%?'
    ],
    'retirement-calculator': [
        'I am 30 years old, have $25k saved, and save $600/month. Am I on track?',
        'What happens if inflation averages 3.5% instead of 2.5%?',
        'How much do I need to retire at age 60 with $5,000/mo purchasing power?'
    ],
    'emergency-fund-calculator': [
        'My monthly expenses are $3,800. How many months of emergency fund do I need?',
        'I am a freelancer with variable income. How should I size my buffer?'
    ]
};

/**
 * Initialize the Decision Assistant for the active calculator
 *
 * @param {Object} tool - The tool object (name, id, fields)
 * @param {string} slug - The calculator slug
 * @param {Function} onApply - Callback when user clicks 'Apply to Calculator'
 * @param {Function} getValues - Callback returning current calculator values
 */
export function initDecisionAssistant(tool, slug, onApply, getValues) {
    if (!tool || !tool.fields) return;

    // Attach trigger to toolbar if not already present
    const toolbar = document.getElementById('results-action-toolbar');
    if (toolbar && !document.getElementById('action-ai-decision-btn')) {
        const btn = document.createElement('button');
        btn.id = 'action-ai-decision-btn';
        btn.className = 'btn btn-outline btn-sm action-btn ai-copilot-trigger-btn';
        btn.title = 'Analyze this decision with the AI Decision Co-Pilot';
        btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary-color);"></i> <span>Decision Co-Pilot</span>`;
        btn.addEventListener('click', () => openDecisionDrawer(tool, slug, onApply, getValues));

        // Insert at the front of toolbar
        toolbar.insertBefore(btn, toolbar.firstChild);
    }
}

/**
 * Open the Decision Co-Pilot drawer
 */
export function openDecisionDrawer(tool, slug, onApply, getValues) {
    let drawer = document.getElementById('decision-copilot-drawer');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'decision-copilot-drawer';
        drawer.className = 'decision-copilot-drawer';
        document.body.appendChild(drawer);
    }

    _activeDrawer = drawer;

    const quickList = QUICK_PROMPTS[slug] || [
        'Help me understand what inputs to choose for my situation.',
        'What are the main risks and trade-offs of this calculation?',
        'What happens if my income or expenses change by 15%?'
    ];

    drawer.innerHTML = `
        <div class="decision-drawer-backdrop" id="decision-drawer-backdrop"></div>
        <div class="decision-drawer-panel" role="dialog" aria-labelledby="decision-drawer-title" aria-modal="true">
            <header class="decision-drawer-header">
                <div class="decision-header-left">
                    <span class="decision-header-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                    <div>
                        <h2 id="decision-drawer-title" class="decision-title">Decision Co-Pilot</h2>
                        <span class="decision-subtitle">Objective guidance for ${escapeHtml(tool.name)}</span>
                    </div>
                </div>
                <button class="decision-close-btn" id="decision-close-btn" aria-label="Close Assistant">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </header>

            <div class="decision-drawer-body">
                <div class="decision-privacy-pill">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>Private & Anonymous: Zero bank tracking. Deterministic calculations.</span>
                </div>

                <div class="decision-query-box">
                    <label for="decision-query-input" class="decision-label">Describe your situation or question:</label>
                    <textarea id="decision-query-input" class="decision-textarea" rows="3" placeholder="e.g., I earn $7,000/mo and have $400 car debt. Can I afford a $360,000 home with $50,000 saved?"></textarea>
                    
                    <div class="decision-quick-prompts">
                        <span class="quick-prompts-label"><i class="fa-regular fa-lightbulb"></i> Suggested Scenarios:</span>
                        <div class="quick-prompts-chips">
                            ${quickList.map(q => `<button type="button" class="quick-prompt-chip" data-prompt="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}
                        </div>
                    </div>

                    <button type="button" class="btn btn-primary btn-block decision-submit-btn" id="decision-submit-btn">
                        <i class="fa-solid fa-sparkles"></i> <span>Analyze Decision</span>
                    </button>
                </div>

                <div class="decision-output-area" id="decision-output-area" style="display:none;"></div>
            </div>
        </div>
    `;

    // Event listeners
    const backdrop = drawer.querySelector('#decision-drawer-backdrop');
    const closeBtn = drawer.querySelector('#decision-close-btn');
    const submitBtn = drawer.querySelector('#decision-submit-btn');
    const textarea = drawer.querySelector('#decision-query-input');
    const chips = drawer.querySelectorAll('.quick-prompt-chip');

    const closeDrawer = () => {
        drawer.classList.remove('is-open');
        setTimeout(() => drawer.remove(), 250);
        _activeDrawer = null;
    };

    backdrop.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            textarea.value = chip.getAttribute('data-prompt');
            textarea.focus();
        });
    });

    submitBtn.addEventListener('click', () => handleQuerySubmit(tool, slug, onApply, getValues));

    // Open animation trigger
    requestAnimationFrame(() => {
        drawer.classList.add('is-open');
        textarea.focus();
    });
}

/**
 * Handle user question submission
 */
async function handleQuerySubmit(tool, slug, onApply, getValues) {
    const textarea = document.getElementById('decision-query-input');
    const outputArea = document.getElementById('decision-output-area');
    const submitBtn = document.getElementById('decision-submit-btn');

    if (!textarea || !outputArea || !submitBtn) return;

    const query = textarea.value.trim();
    if (!query) {
        textarea.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Evaluating trade-offs...</span>`;

    outputArea.style.display = 'block';
    outputArea.innerHTML = `
        <div class="decision-loading-state">
            <div class="decision-spinner"><i class="fa-solid fa-brain-circuit fa-spin"></i></div>
            <p>Analyzing scenario against GetCalcu's verified financial models...</p>
        </div>
    `;

    try {
        const currentVals = typeof getValues === 'function' ? getValues() : {};
        const response = await fetch('/api/decision-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                tool: {
                    id: tool.id || slug,
                    name: tool.name,
                    fields: tool.fields
                },
                currentValues: currentVals
            })
        });

        const resData = await response.json();

        if (!response.ok || !resData.ok) {
            outputArea.innerHTML = `
                <div class="decision-card-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <h4>Unable to complete analysis</h4>
                        <p>${escapeHtml(resData.error || 'Server connection failed. Please try again.')}</p>
                        ${resData.details && resData.details !== resData.error ? `<p style="font-size:12px; opacity:0.85; margin-top:6px; font-family:monospace;">${escapeHtml(resData.details)}</p>` : ''}
                    </div>
                </div>
            `;
            return;
        }

        renderAnalysisOutput(resData.data, tool, onApply);

    } catch (err) {
        console.error('[GetCalcu Decision Co-Pilot] Network error:', err);
        outputArea.innerHTML = `
            <div class="decision-card-error">
                <i class="fa-solid fa-circle-exclamation"></i>
                <div>
                    <h4>Network Communication Error</h4>
                    <p>Could not reach the decision gateway. Please verify your internet connection.</p>
                </div>
            </div>
        `;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Analyze Decision</span>`;
    }
}

/**
 * Render structured decision intelligence output
 */
function renderAnalysisOutput(data, tool, onApply) {
    const outputArea = document.getElementById('decision-output-area');
    if (!outputArea || !data) return;

    const hasParams = data.parameters && Object.keys(data.parameters).length > 0;

    let tradeOffsHtml = '';
    if (data.tradeOffs && data.tradeOffs.length) {
        tradeOffsHtml = `
            <div class="decision-section">
                <h4><i class="fa-solid fa-scale-balanced" style="color:var(--primary-color);"></i> Key Trade-Offs</h4>
                <ul class="decision-list trade-offs-list">
                    ${data.tradeOffs.map(t => `<li><i class="fa-solid fa-check"></i> <span>${escapeHtml(t)}</span></li>`).join('')}
                </ul>
            </div>
        `;
    }

    let risksHtml = '';
    if (data.riskWarnings && data.riskWarnings.length) {
        risksHtml = `
            <div class="decision-section">
                <h4><i class="fa-solid fa-triangle-exclamation" style="color:#F59E0B;"></i> Risks & Vulnerabilities to Monitor</h4>
                <ul class="decision-list risks-list">
                    ${data.riskWarnings.map(r => `<li><i class="fa-solid fa-arrow-right"></i> <span>${escapeHtml(r)}</span></li>`).join('')}
                </ul>
            </div>
        `;
    }

    let followUpHtml = '';
    if (data.followUpQuestion) {
        followUpHtml = `
            <div class="decision-followup-card">
                <i class="fa-solid fa-circle-question"></i>
                <div>
                    <strong>Clarifying Question:</strong>
                    <p>${escapeHtml(data.followUpQuestion)}</p>
                </div>
            </div>
        `;
    }

    let applyParamsHtml = '';
    if (hasParams) {
        const paramKeys = Object.keys(data.parameters);
        const previewList = paramKeys.map(k => {
            const field = tool.fields.find(f => f.id === k);
            const label = field ? field.label.replace(/\(.*\)/, '').trim() : k;
            return `<strong>${escapeHtml(label)}</strong>: ${escapeHtml(String(data.parameters[k]))}`;
        }).join(' &nbsp;•&nbsp; ');

        applyParamsHtml = `
            <div class="decision-apply-box">
                <div class="apply-box-header">
                    <i class="fa-solid fa-sliders"></i>
                    <span>Extracted Parameters:</span>
                </div>
                <div class="apply-box-preview">${previewList}</div>
                <button type="button" class="btn btn-primary btn-block decision-apply-btn" id="decision-apply-btn">
                    <i class="fa-solid fa-arrow-down-to-bracket"></i> <span>Apply These Values to Calculator</span>
                </button>
            </div>
        `;
    }

    outputArea.innerHTML = `
        <div class="decision-result-card">
            <div class="decision-explanation">
                <p>${escapeHtml(data.explanation)}</p>
            </div>
            ${tradeOffsHtml}
            ${risksHtml}
            ${followUpHtml}
            ${applyParamsHtml}
        </div>
    `;

    if (hasParams && typeof onApply === 'function') {
        const applyBtn = document.getElementById('decision-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                onApply(data.parameters);
                applyBtn.disabled = true;
                applyBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Applied to Calculator!</span>`;
                applyBtn.style.background = '#10B981';

                setTimeout(() => {
                    if (_activeDrawer) {
                        _activeDrawer.classList.remove('is-open');
                        setTimeout(() => _activeDrawer.remove(), 250);
                        _activeDrawer = null;
                    }
                }, 800);
            });
        }
    }
}
