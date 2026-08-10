/**
 * GetCalcu Tool Template
 * 
 * Use this template to quickly add new calculators to GetCalcu.
 * 
 * HOW TO ADD A NEW TOOL:
 * 1. Copy this file to js/tools-new.js
 * 2. Replace the example tool with your calculator
 * 3. Add your tool to the TOOLS object
 * 4. Load it in tool.html after js/tools.js
 * 
 * Each tool needs:
 * - id: Unique slug (used in URL: /tool?slug=your-tool)
 * - name: Display name
 * - category: Finance, Health, Math, Business, Education, Construction, Engineering
 * - icon: Font Awesome icon class
 * - description: Short description shown on cards
 * - metaDescription: SEO description
 * - fields: Input definitions
 * - calculate: Function that returns results
 * 
 * Optional:
 * - faqs: FAQ items for SEO
 * - article: SEO article content
 * - howTo: Usage instructions
 * - examples: Example calculations
 * - formula: Formula documentation
 * - chart: Chart data for visualization
 * - table: Table data (amortization schedules, etc.)
 */

// ── Example Tool: Tip Calculator ────────────────────────────────

const TIP_CALCULATOR = {
    id: 'tip-calculator',
    name: 'Tip Calculator',
    category: 'Finance',
    icon: 'fa-money-bill-wave',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate tip amounts, split bills, and see the total per person.',
    metaDescription: 'Free tip calculator — calculate tip amounts, split bills among friends, and see the total per person instantly.',
    fields: [
        { id: 'bill_amount', label: 'Bill Amount ($)', type: 'number', default: 100, min: 0, step: 0.01, hint: 'The total bill amount before tip.' },
        { id: 'tip_percent', label: 'Tip Percentage (%)', type: 'number', default: 15, min: 0, max: 100, step: 1, hint: 'Typical tips: 15% standard, 18% good, 20% great.' },
        { id: 'num_people', label: 'Number of People', type: 'number', default: 1, min: 1, max: 100, step: 1, hint: 'How many people are splitting the bill.' },
    ],
    calculate(v) {
        const bill = safeNum(v.bill_amount, 0);
        const tipPct = safeNum(v.tip_percent, 15);
        const people = Math.max(1, Math.round(safeNum(v.num_people, 1)));
        
        const tipAmount = bill * (tipPct / 100);
        const total = bill + tipAmount;
        const perPerson = total / people;
        
        return {
            stats: [
                { label: 'Tip Amount', value: fmt(tipAmount), highlight: true },
                { label: 'Total Bill', value: fmt(total) },
                { label: 'Per Person', value: fmt(perPerson) },
                { label: 'Tip Per Person', value: fmt(tipAmount / people) },
            ],
            chart: {
                type: 'doughnut',
                labels: ['Bill', 'Tip'],
                data: [bill, tipAmount],
                colors: ['#6366F1', '#F59E0B']
            }
        };
    },
    faqs: [
        { q: 'What is a standard tip percentage?', a: 'The standard tip is 15-20% of the pre-tax bill. 15% for standard service, 18% for good service, and 20% for excellent service.' },
        { q: 'Should I tip on the pre-tax or post-tax amount?', a: 'Most people tip on the pre-tax amount, but tipping on the post-tax amount is also common. The difference is usually small.' },
        { q: 'How do I split a bill evenly?', a: 'Divide the total bill (including tip) by the number of people. Our calculator does this automatically.' },
    ],
    article: {
        heading: 'How to Calculate Tips and Split Bills',
        intro: 'Tipping is a common practice in restaurants, but calculating the right amount and splitting bills can be tricky. This guide explains how to calculate tips and split bills fairly.',
        sections: [
            { heading: 'Standard Tip Percentages', body: 'The standard tip in the US is 15-20% of the pre-tax bill. For exceptional service, 25% or more is appropriate. For poor service, 10% or less is acceptable.' },
            { heading: 'Splitting Bills', body: 'When splitting a bill, divide the total (including tip) by the number of people. For uneven splits, each person can pay for their own items plus their share of the tip.' },
        ],
    },
    howTo: [
        'Enter the total bill amount.',
        'Enter the tip percentage you want to leave.',
        'Enter how many people are splitting the bill.',
        'View the tip amount, total, and per-person cost.',
    ],
    formula: 'Tip = Bill × (Tip% / 100) | Total = Bill + Tip | Per Person = Total / People',
    examples: [
        { title: 'Standard Dinner', input: 'Bill: $100, Tip: 15%, 2 people', result: 'Tip: $15.00 | Total: $115.00 | Per Person: $57.50' },
        { title: 'Large Group', input: 'Bill: $250, Tip: 20%, 5 people', result: 'Tip: $50.00 | Total: $300.00 | Per Person: $60.00' },
    ],
};

// ── Add your new tools here ─────────────────────────────────────

const NEW_TOOLS = {
    'tip-calculator': TIP_CALCULATOR,
    // 'your-tool-slug': YOUR_TOOL,
};

// ── Register with window.TOOLS ─────────────────────────────────

if (typeof window !== 'undefined') {
    // Merge with existing tools
    window.TOOLS = { ...window.TOOLS, ...NEW_TOOLS };
    console.log(`✓ Loaded ${Object.keys(NEW_TOOLS).length} new tools from template`);
}