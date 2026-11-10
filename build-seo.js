const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_URL = 'https://www.getcalcu.com';
const TODAY = new Date().toISOString().split('T')[0];

const CATEGORIES = {
  finance: {
    name: 'Finance',
    slug: 'finance',
    icon: 'fa-calculator',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    title: 'Finance Calculators & Free Financial Tools | GetCalcu',
    metaDescription: 'Free financial calculators for mortgages, loans, investments, retirement, budgeting, compound interest, and debt payoff. Fast, accurate, and completely private.',
    heading: 'Financial Calculators & Decision Tools',
    subheading: 'Make confident financial moves. Calculate mortgage payments, evaluate debt payoff strategies, plan retirement, and forecast investments with verified formulas.',
  },
  health: {
    name: 'Health',
    slug: 'health',
    icon: 'fa-heart-pulse',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    title: 'Health & Fitness Calculators — Free Online | GetCalcu',
    metaDescription: 'Free health and fitness calculators including Body Mass Index (BMI), daily calorie needs (TDEE), and wellness targets. Fast and reliable.',
    heading: 'Health & Fitness Calculators',
    subheading: 'Track vital wellness metrics, calculate Body Mass Index (BMI), and explore healthy target weight ranges backed by standard health guidelines.',
  },
  math: {
    name: 'Math',
    slug: 'math',
    icon: 'fa-percent',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    title: 'Math Calculators & Percentage Tools | GetCalcu',
    metaDescription: 'Free online math calculators for percentages, date differences, unit conversions, and everyday arithmetic calculations.',
    heading: 'Everyday Math & Percentage Tools',
    subheading: 'Get fast, accurate answers for percentage changes, date arithmetic, discount calculations, and split totals.',
  },
  business: {
    name: 'Business',
    slug: 'business',
    icon: 'fa-briefcase',
    iconClass: 'icon-business',
    tagClass: 'tag-business',
    title: 'Business & Commercial Calculators | GetCalcu',
    metaDescription: 'Free business and commercial calculators for profit margins, break-even targets, customer lifetime value, and financial planning.',
    heading: 'Business & Commerce Calculators',
    subheading: 'Calculate profit margins, break-even points, customer lifetime value, and key metrics to run and grow your business.',
  },
  education: {
    name: 'Education',
    slug: 'education',
    icon: 'fa-graduation-cap',
    iconClass: 'icon-education',
    tagClass: 'tag-education',
    title: 'Educational & Study Calculators | GetCalcu',
    metaDescription: 'Free educational calculators and study tools for students and educators, including GPA and grade calculators.',
    heading: 'Academic & Study Calculators',
    subheading: 'Streamline your coursework with reliable GPA calculations, final exam targets, and practical study utilities.',
  },
  construction: {
    name: 'Construction',
    slug: 'construction',
    icon: 'fa-helmet-safety',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    title: 'Construction & Material Estimators | GetCalcu',
    metaDescription: 'Free construction calculators for concrete volume, paint coverage, tile layout, and raw building materials.',
    heading: 'Construction & Material Estimators',
    subheading: 'Plan home improvement and job site projects with precision. Accurately estimate concrete volume, paint coverage, tile layout, and raw materials.',
  },
  engineering: {
    name: 'Engineering',
    slug: 'engineering',
    icon: 'fa-gears',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    title: 'Engineering & Physics Calculators | GetCalcu',
    metaDescription: 'Free engineering calculators for Ohm\'s Law, beam deflection, pressure units, and physics formulas.',
    heading: 'Engineering & Physics Calculators',
    subheading: 'Solve circuit equations, structural beam deflections, fluid pressure conversions, and physics formulas with engineering precision.',
  },
};

// ── 1. Load the tool registry by executing tools.js in a sandbox ─────
function loadTools() {
  const source = fs.readFileSync(path.join(__dirname, 'js', 'tools.js'), 'utf8');

  const sandbox = {
    window: {},
    document: { createElement: () => ({ setAttribute() {}, appendChild() {} }) },
    navigator: { userAgent: 'node' },
    console,
    URLSearchParams,
    URL,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    JSON,
    isFinite,
    isNaN,
    parseFloat,
    parseInt,
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'tools.js' });

  return sandbox.window.TOOLS || {};
}

// ── 2. Load modular calculator files (ES modules) ────────────────────
// These are ES modules with imports, so we can't execute them directly.
// We parse them for id/name/category/metaDescription via regex.
function loadModularTools() {
  const tools = {};
  const modularFiles = [
    path.join(__dirname, 'js', 'calculators', 'construction.js'),
    path.join(__dirname, 'js', 'calculators', 'engineering.js'),
    path.join(__dirname, 'js', 'calculators', 'finance.js'),
    path.join(__dirname, 'js', 'calculators', 'health.js'),
  ];

  modularFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const source = fs.readFileSync(filePath, 'utf8');
    const calcRegex = /export\s+const\s+\w+\s*=\s*\{([\s\S]*?)\n\s*\};/g;
    let match;
    while ((match = calcRegex.exec(source)) !== null) {
      const body = match[1];
      const idMatch = body.match(/id:\s*'([a-z0-9-]+)'/);
      if (!idMatch) continue;
      const slug = idMatch[1];
      const nameMatch = body.match(/name:\s*'([^']+)'/);
      const catMatch = body.match(/category:\s*'([^']+)'/);
      const descMatch = body.match(/metaDescription:\s*'([^']+)'/);
      const descMatch2 = body.match(/description:\s*'([^']+)'/);
      tools[slug] = {
        slug,
        name: nameMatch ? nameMatch[1] : slug.replace(/-/g, ' '),
        category: catMatch ? catMatch[1] : 'General',
        description: descMatch2 ? descMatch2[1] : '',
        metaDescription: descMatch ? descMatch[1] : (descMatch2 ? descMatch2[1] : ''),
        metaTitle: null,
        keywords: [],
        formula: null,
        articleHeading: null,
        articleIntro: null,
        faqs: [],
      };
    }
  });
  return tools;
}

// ── Comprehensive Decision Pathways (SEO Interlinking Mesh) ──────────
const DECISION_PATHWAYS = {
  // Real Estate & Mortgage Cluster
  'mortgage-calculator': [
    { slug: '15-year-mortgage-calculator', reason: 'Compare 15-yr vs 30-yr fixed payments and save tens of thousands in lifetime interest.' },
    { slug: 'refinance-calculator', reason: 'Calculate your exact break-even horizon when refinancing to a lower interest rate.' },
    { slug: 'fha-loan-calculator', reason: 'Evaluate low down-payment options (3.5%) with upfront and annual monthly MIP.' },
    { slug: 'house-affordability-calculator', reason: 'Determine your maximum purchase price based on debt-to-income (DTI) ratios.' },
    { slug: 'rent-vs-buy-calculator', reason: 'Compare long-term net wealth accumulation between homeownership and renting.' },
    { slug: 'amortization-calculator', reason: 'Inspect payment-by-payment principal reduction across 360 monthly installments.' },
    { slug: 'true-home-buying-system', reason: 'Audit true cash-to-close with closing fees, property tax reserves, and maintenance.' }
  ],
  '15-year-mortgage-calculator': [
    { slug: 'mortgage-calculator', reason: 'Benchmark against standard 30-year fixed loan payments and amortization.' },
    { slug: 'refinance-calculator', reason: 'See if refinancing an existing 30-year loan into a 15-year term accelerates equity.' },
    { slug: 'amortization-calculator', reason: 'Inspect the steep equity acceleration curve on a 180-month timeline.' },
    { slug: 'house-affordability-calculator', reason: 'Check if higher 15-year payments fit within qualifying debt limits.' },
    { slug: 'fha-loan-calculator', reason: 'Compare with government-backed 15-year FHA loan options.' },
    { slug: 'true-home-buying-system', reason: 'Factor in property taxes, insurance, and closing reserves.' }
  ],
  'fha-loan-calculator': [
    { slug: 'mortgage-calculator', reason: 'Compare conventional mortgage financing with private mortgage insurance (PMI).' },
    { slug: '15-year-mortgage-calculator', reason: 'Evaluate shorter loan durations for FHA borrowing.' },
    { slug: 'house-affordability-calculator', reason: 'See how the 3.5% down payment impacts your total purchasing power.' },
    { slug: 'refinance-calculator', reason: 'Model when you can refinance out of FHA MIP into a conventional mortgage.' },
    { slug: 'true-home-buying-system', reason: 'Audit all upfront cash requirements including upfront MIP fees.' }
  ],
  'refinance-calculator': [
    { slug: 'mortgage-calculator', reason: 'Calculate standard baseline mortgage costs and monthly obligations.' },
    { slug: '15-year-mortgage-calculator', reason: 'Test refinancing from a 30-year to a 15-year term for massive interest savings.' },
    { slug: 'amortization-calculator', reason: 'Analyze reset amortization timeline and total interest changes.' },
    { slug: 'auto-refinance-calculator', reason: 'Explore refinancing your auto loans alongside home refinancing.' },
    { slug: 'debt-snowball-calculator', reason: 'Apply monthly mortgage refinance savings toward accelerating debt freedom.' }
  ],
  'rent-vs-buy-calculator': [
    { slug: 'mortgage-calculator', reason: 'Model detailed monthly homeownership obligations and interest.' },
    { slug: 'house-affordability-calculator', reason: 'Calculate comfortable purchase limits for your household income.' },
    { slug: 'true-home-buying-system', reason: 'Account for closing costs, property taxes, HOA, and maintenance reserves.' },
    { slug: 'investment-calculator', reason: 'Project returns on invested down payment cash if you choose to rent.' },
    { slug: 'fha-loan-calculator', reason: 'Check whether a 3.5% down FHA loan bridges the homeownership gap.' }
  ],
  'house-affordability-calculator': [
    { slug: 'mortgage-calculator', reason: 'Calculate exact payment schedules for target homes.' },
    { slug: 'fha-loan-calculator', reason: 'See if an FHA loan expands your purchase price range with 3.5% down.' },
    { slug: 'rent-vs-buy-calculator', reason: 'Weigh buying affordability against local rental rates.' },
    { slug: 'debt-snowball-calculator', reason: 'Lower your DTI ratio by knocking out debt balances first.' },
    { slug: 'true-home-buying-system', reason: 'Audit true upfront cash needed beyond down payment.' }
  ],
  'amortization-calculator': [
    { slug: 'mortgage-calculator', reason: 'Recalculate monthly mortgage payments and terms.' },
    { slug: 'loan-calculator', reason: 'Amortize personal or business term loans.' },
    { slug: '15-year-mortgage-calculator', reason: 'Compare 15-year vs 30-year amortization curves.' },
    { slug: 'date-calculator', reason: 'Determine exact debt-free calendar dates based on repayment speed.' },
    { slug: 'debt-snowball-calculator', reason: 'Apply extra payments strategically across multiple amortizing loans.' }
  ],
  'true-home-buying-system': [
    { slug: 'mortgage-calculator', reason: 'Determine baseline principal and interest payments.' },
    { slug: 'house-affordability-calculator', reason: 'Verify debt-to-income limits and qualifying income.' },
    { slug: 'rent-vs-buy-calculator', reason: 'Compare total cost of ownership against market rent.' },
    { slug: 'fha-loan-calculator', reason: 'Model cash requirements with 3.5% down FHA financing.' },
    { slug: 'emergency-fund-calculator', reason: 'Preserve home maintenance reserves after closing.' }
  ],

  // Debt, Credit & Loans Cluster
  'loan-calculator': [
    { slug: 'loan-interest-calculator', reason: 'Calculate total interest paid across various compounding frequencies.' },
    { slug: 'debt-snowball-calculator', reason: 'Model payoff timelines across multiple debts using Snowball or Avalanche.' },
    { slug: 'credit-card-payoff-calculator', reason: 'Tackle high-interest revolving credit lines.' },
    { slug: 'student-loan-calculator', reason: 'Evaluate student loan terms, grace periods, and interest capitalization.' },
    { slug: 'auto-loan-calculator', reason: 'Calculate specific auto financing with dealer trade-ins and taxes.' },
    { slug: 'amortization-calculator', reason: 'Inspect payment amortization schedule and principal payoff curve.' }
  ],
  'loan-interest-calculator': [
    { slug: 'loan-calculator', reason: 'Compare overall loan payments and principal costs.' },
    { slug: 'credit-card-payoff-calculator', reason: 'Analyze compound interest accumulation on credit cards.' },
    { slug: 'debt-snowball-calculator', reason: 'Prioritize loans by highest interest rate (Debt Avalanche).' },
    { slug: 'student-loan-calculator', reason: 'Measure student loan interest deductions and repayment costs.' },
    { slug: 'amortization-calculator', reason: 'View payment-by-payment interest versus principal breakdown.' }
  ],
  'auto-loan-calculator': [
    { slug: 'auto-refinance-calculator', reason: 'Calculate monthly and lifetime savings by refinancing your car loan.' },
    { slug: 'loan-calculator', reason: 'Compare auto loan financing against personal bank loan options.' },
    { slug: 'budget-planner', reason: 'Ensure your total vehicle expenses stay under 10-15% of net income.' },
    { slug: 'loan-interest-calculator', reason: 'Evaluate total interest paid over 36, 48, 60, or 72 months.' }
  ],
  'auto-refinance-calculator': [
    { slug: 'auto-loan-calculator', reason: 'Calculate baseline payments for auto loan comparisons.' },
    { slug: 'loan-calculator', reason: 'Examine consolidation loan alternatives.' },
    { slug: 'budget-planner', reason: 'Reallocate monthly car payment savings into your emergency buffer.' },
    { slug: 'refinance-calculator', reason: 'Compare auto refinancing with residential mortgage refinancing.' },
    { slug: 'debt-snowball-calculator', reason: 'Channel monthly auto interest savings into accelerated debt elimination.' }
  ],
  'debt-snowball-calculator': [
    { slug: 'credit-card-payoff-calculator', reason: 'Model specific payoff strategies for revolving cards.' },
    { slug: 'student-loan-calculator', reason: 'Incorporate federal and private student debt into your payoff plan.' },
    { slug: 'auto-refinance-calculator', reason: 'Refinance high-rate auto loans to accelerate debt snowball velocity.' },
    { slug: 'loan-calculator', reason: 'Check consolidation loan options to lower average interest rates.' },
    { slug: 'budget-planner', reason: 'Free up discretionary cash flow to accelerate debt elimination.' },
    { slug: 'emergency-fund-calculator', reason: 'Build a starter buffer so unexpected costs do not cause new debt.' }
  ],
  'credit-card-payoff-calculator': [
    { slug: 'debt-snowball-calculator', reason: 'Coordinate credit cards into a multi-debt payoff roadmap.' },
    { slug: 'loan-calculator', reason: 'Explore a fixed personal loan to replace 20%+ credit card APRs.' },
    { slug: 'budget-planner', reason: 'Re-align monthly cash flow to eliminate card balances faster.' },
    { slug: 'savings-calculator', reason: 'Transition card payments into automated savings once debt-free.' },
    { slug: 'emergency-fund-calculator', reason: 'Prevent falling back into credit card balances with emergency cash.' }
  ],
  'student-loan-calculator': [
    { slug: 'loan-calculator', reason: 'Compare standard student loan terms against private refinancing.' },
    { slug: 'debt-snowball-calculator', reason: 'Include student loans in your systematic payoff schedule.' },
    { slug: 'salary-calculator', reason: 'Project net take-home salary to establish affordable loan repayment.' },
    { slug: 'budget-planner', reason: 'Incorporate student loan payments into your monthly living budget.' },
    { slug: 'loan-interest-calculator', reason: 'Audit total lifetime interest accrued during deferment and repayment.' }
  ],

  // Cash Flow, Budgeting & Emergency Cluster
  'budget-planner': [
    { slug: 'emergency-fund-calculator', reason: 'Size your 3 to 6-month safety buffer based on essential expenses.' },
    { slug: 'debt-snowball-calculator', reason: 'Direct surplus budget funds toward accelerating debt elimination.' },
    { slug: 'savings-calculator', reason: 'Set up automated savings goals for upcoming milestones.' },
    { slug: 'salary-calculator', reason: 'Calculate your accurate net take-home pay to power your budget.' },
    { slug: 'student-loan-calculator', reason: 'Budget fixed monthly student debt installments.' },
    { slug: 'tip-calculator', reason: 'Factor dining out gratuities and discretionary spending into monthly cash flow.' },
    { slug: 'net-worth-calculator', reason: 'Track overall assets and liabilities as your budget succeeds.' }
  ],
  'emergency-fund-calculator': [
    { slug: 'budget-planner', reason: 'Identify baseline essential living expenses to size your runway.' },
    { slug: 'savings-calculator', reason: 'Calculate monthly timeline to fund your full emergency target.' },
    { slug: 'debt-snowball-calculator', reason: 'Balance building emergency reserves with paying down debt.' },
    { slug: 'date-calculator', reason: 'Calculate exact target completion date for your safety fund.' },
    { slug: 'compound-interest-calculator', reason: 'Model high-yield savings growth on your emergency reserves.' }
  ],

  // Wealth, Investing & Retirement Cluster
  'retirement-calculator': [
    { slug: '401k-calculator', reason: 'Maximize your employer match and tax-deferred retirement growth.' },
    { slug: 'fire-calculator', reason: 'Calculate your Financial Independence number and early retirement horizon.' },
    { slug: 'compound-interest-calculator', reason: 'Visualize long-term compound growth on retirement contributions.' },
    { slug: 'investment-calculator', reason: 'Benchmark investment portfolios against $100k, $500k, and $1M milestones.' },
    { slug: 'inflation-calculator', reason: 'Protect your retirement nest egg against eroding purchasing power.' },
    { slug: 'date-calculator', reason: 'Determine exact target retirement date based on current age and savings rate.' },
    { slug: 'net-worth-calculator', reason: 'Track your current financial baseline toward retirement readiness.' }
  ],
  '401k-calculator': [
    { slug: 'retirement-calculator', reason: 'Integrate 401(k) projections into your comprehensive retirement plan.' },
    { slug: 'compound-interest-calculator', reason: 'See the exponential impact of employer matching contributions.' },
    { slug: 'investment-calculator', reason: 'Compare tax-advantaged 401(k) returns with taxable brokerage investing.' },
    { slug: 'salary-calculator', reason: 'Check how pre-tax 401(k) contributions lower your taxable paycheck.' },
    { slug: 'fire-calculator', reason: 'Determine if 401(k) assets support your target retirement age.' }
  ],
  'fire-calculator': [
    { slug: 'retirement-calculator', reason: 'Benchmark FIRE assumptions against traditional retirement models.' },
    { slug: '401k-calculator', reason: 'Model tax-advantaged accounts in your early retirement bridge strategy.' },
    { slug: 'investment-calculator', reason: 'Project milestone growth rates toward your FIRE target number.' },
    { slug: 'savings-calculator', reason: 'Model aggressive 40% to 70% savings rates needed for early retirement.' },
    { slug: 'net-worth-calculator', reason: 'Monitor total liquid assets contributing to your financial independence.' }
  ],
  'investment-calculator': [
    { slug: 'compound-interest-calculator', reason: 'Calculate compounding returns with recurring deposits.' },
    { slug: '401k-calculator', reason: 'Compare taxable investing with tax-advantaged employer matching.' },
    { slug: 'retirement-calculator', reason: 'Map portfolio growth to your desired retirement lifestyle.' },
    { slug: 'savings-calculator', reason: 'Balance guaranteed cash yields with equity market investments.' },
    { slug: 'inflation-calculator', reason: 'Compute real (inflation-adjusted) portfolio purchasing power.' }
  ],
  'compound-interest-calculator': [
    { slug: 'investment-calculator', reason: 'Test market asset allocation and investment milestone targets.' },
    { slug: 'savings-calculator', reason: 'Model high-yield savings compounding intervals.' },
    { slug: '401k-calculator', reason: 'Evaluate compound growth with employer matching contributions.' },
    { slug: 'retirement-calculator', reason: 'Connect compound savings directly to retirement readiness.' }
  ],
  'savings-calculator': [
    { slug: 'emergency-fund-calculator', reason: 'Model funding your emergency cash safety cushion.' },
    { slug: 'compound-interest-calculator', reason: 'See how interest compounding accelerates goal completion.' },
    { slug: 'budget-planner', reason: 'Optimize monthly spending to boost your savings rate.' },
    { slug: 'date-calculator', reason: 'Calculate the exact calendar milestone date for your savings goal.' },
    { slug: 'inflation-calculator', reason: 'Verify that cash savings beat inflation over time.' }
  ],
  'net-worth-calculator': [
    { slug: 'budget-planner', reason: 'Improve monthly savings to grow net worth over time.' },
    { slug: 'debt-snowball-calculator', reason: 'Reduce liabilities to increase net equity.' },
    { slug: 'investment-calculator', reason: 'Track investment asset expansion.' },
    { slug: 'fire-calculator', reason: 'Evaluate how close your liquid net worth is to your FIRE target.' }
  ],
  'inflation-calculator': [
    { slug: 'investment-calculator', reason: 'Ensure your investment returns outpace inflation.' },
    { slug: 'retirement-calculator', reason: 'Calculate future living costs in retirement dollars.' },
    { slug: 'savings-calculator', reason: 'Analyze purchasing power loss on uninvested cash.' },
    { slug: 'salary-calculator', reason: 'Check if your annual wage increases match real inflation.' }
  ],

  // Career, Income & Self-Employment Cluster
  'salary-calculator': [
    { slug: 'salary-calculator/za', reason: 'South Africa SARS income tax brackets and net take-home pay.' },
    { slug: 'salary-calculator/ke', reason: 'Kenya KRA PAYE tax, NSSF, and SHA health insurance.' },
    { slug: 'salary-calculator/ng', reason: 'Nigeria Personal Income Tax (PIT) and pension deductions.' },
    { slug: 'salary-calculator/et', reason: 'Ethiopia employment income tax and employee pension calculations.' },
    { slug: 'self-employment-tax-calculator', reason: 'Calculate 1099 freelance taxes vs W-2 employment.' },
    { slug: 'student-loan-calculator', reason: 'Ensure net paycheck comfortably covers student loan repayment.' },
    { slug: 'budget-planner', reason: 'Allocate your take-home pay with the 50/30/20 budget framework.' }
  ],
  'salary-calculator/za': [
    { slug: 'salary-calculator', reason: 'Compare South African net pay with US/Global tax benchmarks.' },
    { slug: 'salary-calculator/ke', reason: 'Compare with Kenya KRA PAYE tax brackets.' },
    { slug: 'salary-calculator/ng', reason: 'Compare with Nigeria PIT tax rates.' },
    { slug: 'salary-calculator/et', reason: 'Compare with Ethiopia employment income tax brackets.' },
    { slug: 'budget-planner', reason: 'Plan monthly expenses and savings with South African net income.' },
    { slug: 'emergency-fund-calculator', reason: 'Size your emergency cushion based on South African expenses.' }
  ],
  'salary-calculator/ke': [
    { slug: 'salary-calculator', reason: 'Compare Kenyan net salary against US/Global standards.' },
    { slug: 'salary-calculator/za', reason: 'Compare with South Africa SARS tax tables.' },
    { slug: 'salary-calculator/ng', reason: 'Compare with Nigeria PIT tax rates.' },
    { slug: 'salary-calculator/et', reason: 'Compare with Ethiopia employment tax brackets.' },
    { slug: 'budget-planner', reason: 'Structure your budget around your KRA take-home earnings.' },
    { slug: 'emergency-fund-calculator', reason: 'Build an emergency savings reserve in KES.' }
  ],
  'salary-calculator/ng': [
    { slug: 'salary-calculator', reason: 'Compare Nigerian take-home pay against global benchmarks.' },
    { slug: 'salary-calculator/za', reason: 'Compare with South African income tax brackets.' },
    { slug: 'salary-calculator/ke', reason: 'Compare with Kenyan PAYE tax rates.' },
    { slug: 'salary-calculator/et', reason: 'Compare with Ethiopian employee income tax brackets.' },
    { slug: 'budget-planner', reason: 'Plan savings and living costs from your net paycheck.' },
    { slug: 'emergency-fund-calculator', reason: 'Maintain emergency reserves in Nigerian Naira.' }
  ],
  'salary-calculator/et': [
    { slug: 'salary-calculator', reason: 'Compare Ethiopian take-home income against international standards.' },
    { slug: 'salary-calculator/ke', reason: 'Compare with Kenya KRA tax rules.' },
    { slug: 'salary-calculator/za', reason: 'Compare with South Africa SARS brackets.' },
    { slug: 'salary-calculator/ng', reason: 'Compare with Nigeria Personal Income Tax rates.' },
    { slug: 'budget-planner', reason: 'Allocate net earnings into savings and living essentials.' },
    { slug: 'emergency-fund-calculator', reason: 'Safeguard essential living runway in Ethiopian Birr.' }
  ],
  'self-employment-tax-calculator': [
    { slug: 'freelance-hourly-rate-calculator', reason: 'Set minimum billing rates factoring in self-employment taxes.' },
    { slug: 'freelance-true-rate-system', reason: 'Comprehensive freelance pricing system with overhead & buffers.' },
    { slug: 'salary-calculator', reason: 'Compare 1099 contractor earnings against equivalent W-2 employee pay.' },
    { slug: 'break-even-calculator', reason: 'Calculate monthly business sales needed to cover expenses and taxes.' },
    { slug: 'budget-planner', reason: 'Set aside quarterly estimated taxes without cash flow crunches.' }
  ],
  'freelance-hourly-rate-calculator': [
    { slug: 'self-employment-tax-calculator', reason: 'Calculate SECA tax and quarterly 1040-ES payments.' },
    { slug: 'freelance-true-rate-system', reason: 'Comprehensive rate calculator with unpaid time and equipment reserves.' },
    { slug: 'salary-calculator', reason: 'Determine equivalent annual corporate salary.' },
    { slug: 'profit-margin-calculator', reason: 'Ensure healthy profit margins on client contracts.' }
  ],
  'freelance-true-rate-system': [
    { slug: 'freelance-hourly-rate-calculator', reason: 'Quick baseline hourly rate comparison.' },
    { slug: 'self-employment-tax-calculator', reason: 'Calculate quarterly tax obligations.' },
    { slug: 'break-even-calculator', reason: 'Calculate monthly billable hours needed to break even.' },
    { slug: 'emergency-fund-calculator', reason: 'Build a 6-month buffer for freelance income volatility.' }
  ],
  'break-even-calculator': [
    { slug: 'profit-margin-calculator', reason: 'Analyze gross, operating, and net profit margins.' },
    { slug: 'customer-lifetime-value-calculator', reason: 'Evaluate customer acquisition cost versus lifetime profit.' },
    { slug: 'freelance-true-rate-system', reason: 'Calculate freelance business break-even hourly rates.' }
  ],
  'profit-margin-calculator': [
    { slug: 'break-even-calculator', reason: 'Determine sales volume required to hit target margins.' },
    { slug: 'customer-lifetime-value-calculator', reason: 'Analyze unit economics and customer profitability.' },
    { slug: 'freelance-hourly-rate-calculator', reason: 'Price services to maintain strong profit margins.' }
  ],
  'customer-lifetime-value-calculator': [
    { slug: 'profit-margin-calculator', reason: 'Understand margin impact on customer lifetime profitability.' },
    { slug: 'break-even-calculator', reason: 'Calculate break-even payback on customer acquisition costs.' }
  ],

  // Health & Wellness Cluster
  'bmi-calculator': [
    { slug: 'body-fat-percentage-calculator', reason: 'Measure body composition and lean muscle mass vs fat.' },
    { slug: 'tdee-calculator', reason: 'Calculate daily calorie expenditure based on physical activity.' }
  ],
  'body-fat-percentage-calculator': [
    { slug: 'bmi-calculator', reason: 'Compare US Navy body fat formula results with standard BMI.' },
    { slug: 'tdee-calculator', reason: 'Align calorie intake with body composition targets.' }
  ],
  'tdee-calculator': [
    { slug: 'bmi-calculator', reason: 'Check your baseline BMI category.' },
    { slug: 'body-fat-percentage-calculator', reason: 'Fine-tune calorie needs based on body fat percentage.' }
  ],

  // Construction Cluster
  'concrete-calculator': [
    { slug: 'paint-calculator', reason: 'Estimate surface area and paint gallon requirements.' },
    { slug: 'tile-calculator', reason: 'Calculate tile square footage and waste factors.' },
    { slug: 'stair-calculator', reason: 'Calculate stair stringers, risers, and treads.' }
  ],
  'paint-calculator': [
    { slug: 'concrete-calculator', reason: 'Estimate concrete slab and footing materials.' },
    { slug: 'tile-calculator', reason: 'Calculate flooring tile requirements.' },
    { slug: 'stair-calculator', reason: 'Calculate surface area for painting or staining wooden stairs.' }
  ],
  'tile-calculator': [
    { slug: 'concrete-calculator', reason: 'Calculate subfloor concrete materials.' },
    { slug: 'paint-calculator', reason: 'Estimate wall paint for room finishing.' },
    { slug: 'stair-calculator', reason: 'Calculate step tiling and riser coverage.' }
  ],
  'stair-calculator': [
    { slug: 'concrete-calculator', reason: 'Calculate concrete volume for poured steps.' },
    { slug: 'tile-calculator', reason: 'Calculate tile surface area for steps and landings.' },
    { slug: 'unit-converter', reason: 'Convert construction measurements between metric and imperial.' }
  ],

  // Engineering & Math Cluster
  'ohms-law-calculator': [
    { slug: 'beam-deflection-calculator', reason: 'Calculate structural beam deflection under load.' },
    { slug: 'pressure-calculator', reason: 'Convert and calculate fluid and atmospheric pressure.' },
    { slug: 'unit-converter', reason: 'Convert electrical and mechanical units with precision.' }
  ],
  'beam-deflection-calculator': [
    { slug: 'ohms-law-calculator', reason: 'Solve electrical circuit voltage, current, and resistance.' },
    { slug: 'pressure-calculator', reason: 'Calculate hydraulic and mechanical pressure.' },
    { slug: 'unit-converter', reason: 'Convert metric and imperial structural measurements.' }
  ],
  'pressure-calculator': [
    { slug: 'ohms-law-calculator', reason: 'Calculate electrical engineering parameters.' },
    { slug: 'beam-deflection-calculator', reason: 'Compute structural loads and deflection.' },
    { slug: 'unit-converter', reason: 'Convert engineering units across PSI, bar, and Pascals.' }
  ],
  'unit-converter': [
    { slug: 'pressure-calculator', reason: 'Perform detailed pressure unit conversions.' },
    { slug: 'beam-deflection-calculator', reason: 'Convert engineering structural dimensions.' },
    { slug: 'ohms-law-calculator', reason: 'Calculate circuit values using standard units.' }
  ],
  'percentage-calculator': [
    { slug: 'tip-calculator', reason: 'Calculate tip percentages and bill splitting.' },
    { slug: 'inflation-calculator', reason: 'Calculate percentage purchasing power erosion.' },
    { slug: 'student-loan-calculator', reason: 'Calculate interest percentages on educational debt.' },
    { slug: 'gpa-calculator', reason: 'Convert percentage grades into standard 4.0 GPA.' },
    { slug: 'final-grade-calculator', reason: 'Calculate weighted percentage needed on final exams.' }
  ],
  'tip-calculator': [
    { slug: 'percentage-calculator', reason: 'Calculate discounts, sales taxes, and general percentages.' },
    { slug: 'budget-planner', reason: 'Track dining out spending within your monthly budget.' },
    { slug: 'date-calculator', reason: 'Calculate days and split expenses across group vacations.' }
  ],
  'date-calculator': [
    { slug: 'amortization-calculator', reason: 'Calculate loan maturity dates and repayment timelines.' },
    { slug: 'savings-calculator', reason: 'Calculate exact target dates for savings milestones.' },
    { slug: 'tip-calculator', reason: 'Split shared travel bills and restaurant tips across group itineraries.' },
    { slug: 'retirement-calculator', reason: 'Determine exact years and months until target retirement age.' }
  ],
  'gpa-calculator': [
    { slug: 'final-grade-calculator', reason: 'Calculate the score needed on your final exam to achieve target grade.' },
    { slug: 'student-loan-calculator', reason: 'Estimate post-graduation student loan repayment based on degree.' },
    { slug: 'percentage-calculator', reason: 'Convert course points to percentages.' }
  ],
  'final-grade-calculator': [
    { slug: 'gpa-calculator', reason: 'Calculate cumulative semester GPA.' },
    { slug: 'percentage-calculator', reason: 'Calculate exam weighting percentages.' },
    { slug: 'student-loan-calculator', reason: 'Plan degree completion and financial aid qualifications.' }
  ]
};

// ── 3. Merge and normalize the registry ──────────────────────────────
function buildRegistry() {
  const legacy = loadTools();
  const modular = loadModularTools();
  const merged = { ...legacy, ...modular };

  // Normalize each tool to a clean SEO metadata object
  const registry = {};
  Object.keys(merged).forEach(slug => {
    const t = merged[slug];
    registry[slug] = {
      slug,
      name: t.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      category: t.category || 'General',
      description: t.description || '',
      metaDescription: t.metaDescription || t.description || '',
      metaTitle: t.metaTitle || null,
      keywords: Array.isArray(t.keywords) ? t.keywords : [],
      formula: t.formula || null,
      articleHeading: (t.article && t.article.heading) || null,
      articleIntro: (t.article && t.article.intro) || null,
      faqs: Array.isArray(t.faqs) ? t.faqs.map(f => ({ q: f.q, a: f.a })) : [],
      revisionDate: t.revisionDate || null,
      lastReviewed: t.lastReviewed || null,
    };
  });
  return registry;
}

// ── 4. Helpers ───────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTitle(tool) {
  if (tool.metaTitle) return tool.metaTitle;
  const t = `${tool.name} — Free Online Calculator | GetCalcu`;
  return t.length > 60 ? `${tool.name} | Free Calculator — GetCalcu` : t;
}

function buildCanonical(slug) {
  return `${BASE_URL}/tool/${slug}`;
}

function buildSoftwareAppJsonLd(tool) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: tool.currency || 'USD' },
    description: tool.metaDescription || tool.description,
    url: buildCanonical(tool.slug),
  };
}

function buildHreflangTags(slug) {
  const baseSlug = slug.split('/')[0];
  if (baseSlug === 'salary-calculator') {
    return `
    <link rel="alternate" hreflang="x-default" href="${BASE_URL}/tool/salary-calculator">
    <link rel="alternate" hreflang="en-US" href="${BASE_URL}/tool/salary-calculator">
    <link rel="alternate" hreflang="en-ET" href="${BASE_URL}/tool/salary-calculator/et">
    <link rel="alternate" hreflang="en-KE" href="${BASE_URL}/tool/salary-calculator/ke">
    <link rel="alternate" hreflang="en-NG" href="${BASE_URL}/tool/salary-calculator/ng">
    <link rel="alternate" hreflang="en-ZA" href="${BASE_URL}/tool/salary-calculator/za">`;
  }
  return '';
}

function renderCountrySwitcher(slug, currentCountry = 'us') {
  const baseSlug = slug.split('/')[0];
  if (baseSlug === 'salary-calculator') {
    const isET = currentCountry === 'et' || slug === 'salary-calculator/et';
    const isKE = currentCountry === 'ke' || slug === 'salary-calculator/ke';
    const isNG = currentCountry === 'ng' || slug === 'salary-calculator/ng';
    const isZA = currentCountry === 'za' || slug === 'salary-calculator/za';
    const isUS = !isET && !isKE && !isNG && !isZA;
    return `
      <div class="country-switcher-bar" role="group" aria-label="Select Country / Jurisdiction">
        <span class="country-switcher-label"><i class="fa-solid fa-earth-americas"></i> Jurisdiction:</span>
        <div class="country-switcher-options">
          <a href="/tool/salary-calculator" class="country-pill ${isUS ? 'active' : ''}">
            <span class="country-flag">🇺🇸</span> <span>United States</span>
          </a>
          <a href="/tool/salary-calculator/et" class="country-pill ${isET ? 'active' : ''}">
            <span class="country-flag">🇪🇹</span> <span>Ethiopia (ETB)</span>
          </a>
          <a href="/tool/salary-calculator/ke" class="country-pill ${isKE ? 'active' : ''}">
            <span class="country-flag">🇰🇪</span> <span>Kenya (KES)</span>
          </a>
          <a href="/tool/salary-calculator/ng" class="country-pill ${isNG ? 'active' : ''}">
            <span class="country-flag">🇳🇬</span> <span>Nigeria (NGN)</span>
          </a>
          <a href="/tool/salary-calculator/za" class="country-pill ${isZA ? 'active' : ''}">
            <span class="country-flag">🇿🇦</span> <span>South Africa (ZAR)</span>
          </a>
        </div>
      </div>`;
  }
  return '';
}

function buildBreadcrumbJsonLd(tool) {
  const catSlug = (tool.category || 'finance').toLowerCase();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: tool.category, item: `${BASE_URL}/category/${catSlug}` },
      { '@type': 'ListItem', position: 3, name: tool.name, item: buildCanonical(tool.slug) },
    ],
  };
}

function buildFaqJsonLd(tool) {
  if (!tool.faqs || !tool.faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tool.faqs.map(f => ({
      '@type': 'Question',
      name: f.q || f.question || '',
      acceptedAnswer: { '@type': 'Answer', text: f.a || f.answer || '' },
    })),
  };
}

function buildHowToJsonLd(tool) {
  if (!tool.howTo || !tool.howTo.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Use the ${tool.name}`,
    description: tool.description,
    step: tool.howTo.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: `Step ${idx + 1}`,
      text: typeof step === 'string' ? step : (step.text || step.name || ''),
    })),
  };
}

function buildArticleJsonLd(tool) {
  if (!tool.article || !tool.article.heading) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: tool.article.heading,
    description: tool.article.intro || tool.metaDescription || tool.description,
    author: { '@type': 'Organization', name: 'GetCalcu' },
    publisher: { '@type': 'Organization', name: 'GetCalcu', url: `${BASE_URL}/` },
    about: tool.name,
    url: buildCanonical(tool.slug),
    dateModified: tool.revisionDate || TODAY,
  };
}

function renderSidebarNav(activeSlug = null, isHome = false) {
  const items = [
    { href: '/', icon: 'fa-house', label: 'Home', active: isHome },
    { href: '/category/finance', icon: 'fa-calculator', label: 'Finance', active: activeSlug === 'finance' },
    { href: '/category/health', icon: 'fa-heart-pulse', label: 'Health', active: activeSlug === 'health' },
    { href: '/category/business', icon: 'fa-briefcase', label: 'Business', active: activeSlug === 'business' },
    { href: '/category/education', icon: 'fa-graduation-cap', label: 'Education', active: activeSlug === 'education' },
    { href: '/category/construction', icon: 'fa-helmet-safety', label: 'Construction', active: activeSlug === 'construction' },
    { href: '/category/engineering', icon: 'fa-gears', label: 'Engineering', active: activeSlug === 'engineering' },
    { href: '/category/math', icon: 'fa-percent', label: 'Math', active: activeSlug === 'math' },
  ];

  return `
        <aside class="sidebar">
            <a href="/" class="brand">
                <div class="brand-icon"><img src="/logo.svg" alt="" width="36" height="36"></div>
                <span class="brand-name">GetCalcu</span>
            </a>
            <nav class="nav-menu">
                ${items.map(it => `<a href="${it.href}" class="nav-item ${it.active ? 'active' : ''}"><i class="fa-solid ${it.icon}"></i><span>${it.label}</span></a>`).join('\n                ')}
                <a href="/history" class="nav-item auth-only hidden"><i class="fa-solid fa-clock-rotate-left"></i><span>History</span></a>
            </nav>
            <div class="sidebar-footer">
                <div class="promo-card" id="sidebar-promo">
                    <h4>Save your results</h4>
                    <p>Create a free account to save your calculations and history.</p>
                    <a href="/auth?mode=signup" class="btn btn-primary btn-sm">Sign up free</a>
                </div>
                <div class="theme-switch-container">
                    <span class="theme-label"><i class="fa-solid fa-moon"></i> Dark mode</span>
                    <label class="switch">
                        <input type="checkbox" id="theme-toggle-switch" aria-label="Toggle dark mode">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        </aside>`;
}

// ── Contextual Trust Standards & Authority Scoping ─────────────────
function getToolTrustInfo(tool, slug) {
  const cat = (tool.category || '').toLowerCase();
  if (cat === 'finance') {
    if (['mortgage-calculator', 'auto-loan-calculator', 'loan-calculator', 'loan-interest-calculator', 'credit-card-payoff-calculator', 'amortization-calculator', 'house-affordability-calculator', 'student-loan-calculator'].includes(slug)) {
      return {
        standard: 'Consumer Financial Protection Bureau (CFPB) Regulation Z (12 CFR § 1026.22) & Truth in Lending Act (TILA) amortization standards.',
        policy: 'Deterministic in-browser amortization'
      };
    }
    if (['debt-snowball-calculator'].includes(slug)) {
      return {
        standard: 'Harvard Business School debt payoff empirical behavioral research & CFPB debt reduction guidelines.',
        policy: 'Deterministic mathematical payoff simulation'
      };
    }
    if (['refinance-calculator'].includes(slug)) {
      return {
        standard: 'Consumer Financial Protection Bureau (CFPB) TILA disclosure standards & break-even mortgage amortization formulas.',
        policy: 'Deterministic break-even computation'
      };
    }
    if (['self-employment-tax-calculator'].includes(slug)) {
      return {
        standard: 'IRS Schedule SE (Form 1040) statutory 92.35% SECA rules & Social Security Administration statutory wage limits.',
        policy: 'Deterministic progressive tax modeling'
      };
    }
    if (['salary-calculator'].includes(slug)) {
      return {
        standard: 'IRS Title 26 Internal Revenue Code (Rev. Proc. 2024-40) 2026 federal brackets, standard deductions, and FICA statutory rates.',
        policy: 'Deterministic in-browser payroll calculation'
      };
    }
    if (slug === 'salary-calculator/et') {
      return {
        standard: 'Federal Income Tax Proclamation No. 979/2016 (Schedule A) & Pension Proclamation No. 715/2011 statutory pension framework.',
        policy: 'Deterministic in-browser Schedule A tax and pension computation'
      };
    }
    if (slug === 'salary-calculator/ke') {
      return {
        standard: 'Kenya Revenue Authority (KRA) Income Tax Act (Cap. 470), Finance Act, NSSF Act 2013, SHIF Act 2023 & Affordable Housing Act 2024.',
        policy: 'Deterministic in-browser PAYE, NSSF, SHIF, and Housing Levy computation'
      };
    }
    if (slug === 'salary-calculator/ng') {
      return {
        standard: 'Personal Income Tax Act (PITA) Cap P8 LFN 2004 (amended by Finance Acts), Pension Reform Act (PRA) 2014 & NHF Act.',
        policy: 'Deterministic in-browser PAYE, CRA, pension, and NHF computation'
      };
    }
    if (slug === 'salary-calculator/za') {
      return {
        standard: 'South African Revenue Service (SARS) Income Tax Act No. 58 of 1962 & Unemployment Insurance Contributions Act No. 4 of 2002.',
        policy: 'Deterministic in-browser SARS PAYE, UIF, Section 11F, and Section 6 rebate computation'
      };
    }
    if (['investment-calculator', 'compound-interest-calculator', 'retirement-calculator', 'fire-calculator', 'savings-calculator', 'emergency-fund-calculator', '401k-calculator', 'net-worth-calculator'].includes(slug)) {
      return {
        standard: 'Fisher Real Rate of Return Equation & SEC / FINRA compound interest modeling guidelines (4% Safe Withdrawal Framework).',
        policy: 'Deterministic real purchasing-power projection'
      };
    }
    return {
      standard: 'Generally Accepted Accounting Principles (GAAP) & CFPB financial disclosure guidelines.',
      policy: 'Deterministic client-side computation'
    };
  }
  if (cat === 'health') {
    if (slug === 'bmi-calculator') {
      return {
        standard: 'CDC Adult & Pediatric Body Mass Index criteria and World Health Organization (WHO) international classification thresholds.',
        policy: 'Deterministic anthropometric evaluation'
      };
    }
    return {
      standard: 'Mifflin-St Jeor Energy Expenditure Equations (validated by the Academy of Nutrition and Dietetics).',
      policy: 'Deterministic metabolic computation'
    };
  }
  if (cat === 'engineering') {
    if (slug === 'ohms-law-calculator') {
      return {
        standard: "IEEE standard DC/AC resistive circuit principles and Ohm's Law governing electrical relations.",
        policy: 'Deterministic physics evaluation'
      };
    }
    if (slug === 'beam-deflection-calculator') {
      return {
        standard: 'American Institute of Steel Construction (AISC) & classical Euler-Bernoulli beam theory deflection formulations.',
        policy: 'Deterministic structural mechanics calculation'
      };
    }
    return {
      standard: 'ISO 80000-4 Quantities and Units (Mechanics) & standard hydrostatic pressure equations.',
      policy: 'Deterministic fluid mechanics computation'
    };
  }
  if (cat === 'construction') {
    return {
      standard: 'ASTM International standard specifications for construction materials and standard architectural coverage ratios.',
      policy: 'Deterministic volumetric & material estimation'
    };
  }
  if (cat === 'education') {
    return {
      standard: 'AACRAO (American Association of Collegiate Registrars and Admissions Officers) standard 4.0 GPA weighting conventions.',
      policy: 'Deterministic academic calculation'
    };
  }
  if (cat === 'business') {
    return {
      standard: 'Corporate Finance Institute (CFI) standard unit economics, GAAP gross margin formulas, and SaaS LTV/CAC metrics.',
      policy: 'Deterministic commercial calculation'
    };
  }
  if (cat === 'math') {
    if (slug === 'unit-converter') {
      return {
        standard: 'NIST Special Publication 811 (Guide for the Use of the International System of Units) & BIPM definitions.',
        policy: 'Deterministic floating-point unit conversion'
      };
    }
    return {
      standard: 'ISO 80000 mathematical sign standards and deterministic algebraic formulas.',
      policy: 'Deterministic arithmetic evaluation'
    };
  }
  return {
    standard: 'Deterministic mathematical principles and open peer-reviewed computational standards.',
    policy: 'In-browser deterministic computation'
  };
}

const METHODOLOGY_BYLINE = 'Built and maintained by the GetCalcu founder.';

function buildMethodologyHtml(tool, slug) {
  if (!tool.methodology && !tool.formula) return '';
  const m = tool.methodology || {};
  const trustInfo = getToolTrustInfo(tool, slug);
  const standards = m.standards || trustInfo.standard || 'Calculations are based on recognized financial, mathematical, and scientific models verified against authoritative reference standards.';
  const lastReviewed = tool.lastReviewed || m.lastReviewed || 'September 2026';
  const assumptions = m.assumptions || [];
  const rawSources = Array.isArray(m.sources) ? m.sources : [];
  const sources = rawSources.filter(s => s && !/GetCalcu/i.test(s));

  let assumptionsHtml = '';
  if (assumptions.length > 0) {
    assumptionsHtml = `
      <div class="methodology-block">
        <h4 class="methodology-subheading">Key Modeling Assumptions:</h4>
        <ul class="methodology-list">
          ${assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>`;
  }
  let sourcesHtml = '';
  if (sources.length > 0) {
    sourcesHtml = `
      <div class="methodology-sources">
        <span class="methodology-sources-label"><i class="fa-solid fa-book-bookmark"></i> Reference Sources:</span>
        <span class="methodology-sources-list">${sources.map(s => escapeHtml(s)).join(' • ')}</span>
      </div>`;
  }

  return `
    <section class="tool-runner-card methodology-card" id="methodology" aria-labelledby="methodology-heading">
      <div class="methodology-header">
        <div class="methodology-title-wrap">
          <span class="methodology-badge"><i class="fa-solid fa-shield-check"></i> Editorial Standard</span>
          <h2 id="methodology-heading">GetCalcu Methodology &amp; Editorial Standards</h2>
        </div>
        <span class="methodology-review-date"><i class="fa-regular fa-calendar-check"></i> ${escapeHtml(METHODOLOGY_BYLINE)}</span>
      </div>
      <p class="methodology-summary">${escapeHtml(m.summary || standards)}</p>
      ${assumptionsHtml}
      ${sourcesHtml}
    </section>
  `;
}

function buildOnThisPageHtml(tocItems) {
  if (!tocItems || !tocItems.length) return '';
  return `
    <div class="on-this-page-container">
      <details class="on-this-page-details" open>
        <summary class="on-this-page-summary">
          <span class="on-this-page-title"><i class="fa-solid fa-list-ul"></i> On this page</span>
          <i class="fa-solid fa-chevron-down on-this-page-chevron" aria-hidden="true"></i>
        </summary>
        <nav class="on-this-page-nav" aria-label="On this page">
          <ul class="on-this-page-list">
            ${tocItems.map(item => `
              <li class="on-this-page-item">
                <a href="#${escapeHtml(item.id)}" class="on-this-page-link">${escapeHtml(item.label)}</a>
              </li>
            `).join('')}
          </ul>
        </nav>
      </details>
    </div>
  `;
}

// ── 3. Build Pre-Rendered Full Static HTML for Non-JS Crawlers & Humans ─
function renderPreRenderedToolContent(tool, slug, allTools = {}) {
  // Compute default values
  const defaultVals = {};
  if (tool.fields && Array.isArray(tool.fields)) {
    tool.fields.forEach(f => {
      defaultVals[f.id] = typeof f.default === 'function' ? f.default() : f.default;
    });
  }

  let result = null;
  if (typeof tool.calculate === 'function') {
    try {
      result = tool.calculate(defaultVals);
    } catch (e) {
      // fallback
    }
  }

  // 1. Presets HTML
  let presetsHtml = '';
  if (tool.presets && tool.presets.length > 0) {
    presetsHtml = `
      <div class="preset-chips-container" role="group" aria-label="Quick Scenario Presets">
        <div class="preset-chips-header">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>Quick Scenarios</span>
        </div>
        <div class="preset-chips-list">
          ${tool.presets.map((p, idx) => `
            <button type="button" class="preset-chip ${idx === 0 ? 'active' : ''}" data-preset-idx="${idx}">
              <i class="fa-solid fa-sliders"></i> <span>${escapeHtml(p.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 2. Form HTML
  let formHtml = presetsHtml;
  if (tool.fields && Array.isArray(tool.fields)) {
    for (const field of tool.fields) {
      const label = field.label || field.id;
      const val = defaultVals[field.id] !== undefined ? defaultVals[field.id] : '';
      if (field.type === 'select') {
        const optionsHtml = (field.options || []).map(o => `
          <option value="${escapeHtml(o.value)}" ${o.value === val ? 'selected' : ''}>${escapeHtml(o.label)}</option>
        `).join('');
        formHtml += `
          <div class="form-group" data-field="${field.id}">
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}
            <select id="${field.id}" data-id="${field.id}">${optionsHtml}</select>
          </div>
        `;
      } else if (field.type === 'range') {
        formHtml += `
          <div class="form-group" data-field="${field.id}">
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}
            <div class="range-input-wrap">
              <input type="number" id="${field.id}" data-id="${field.id}" value="${val}" inputmode="decimal">
              <input type="range" id="${field.id}-range" data-range-for="${field.id}" value="${val}">
            </div>
          </div>
        `;
      } else if (field.type !== 'section') {
        formHtml += `
          <div class="form-group" data-field="${field.id}">
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}
            <input type="${field.type || 'number'}" id="${field.id}" data-id="${field.id}" value="${val}" inputmode="decimal">
          </div>
        `;
      }
    }
  }

  // 3. Stats & Result Cards HTML
  let statsHtml = '';
  if (result && result.stats && Array.isArray(result.stats)) {
    statsHtml = `
      <div class="stats-grid">
        ${result.stats.map(s => `
          <div class="stat-card ${s.highlight ? 'stat-card--highlight' : ''} ${s.warn ? 'stat-card--warn' : ''}">
            <span class="stat-label">${escapeHtml(s.label)}</span>
            <span class="stat-value">${escapeHtml(s.value)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  let insightHtml = '';
  if (result && result.insight) {
    const icon = result.insight.icon || (result.insight.tone === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check');
    const headline = result.insight.headline || result.insight.title || '';
    const detail = result.insight.detail || result.insight.text || '';
    const tone = result.insight.tone || 'positive';
    insightHtml = `
      <div class="insight-banner insight-banner--${tone}">
        <i class="fa-solid ${icon}"></i>
        <div class="insight-content">
          <h4>${escapeHtml(headline)}</h4>
          <p>${escapeHtml(detail)}</p>
        </div>
      </div>
    `;
  }

  // 4. Action Toolbar
  const toolbarHtml = `
    <div class="results-action-toolbar" id="results-action-toolbar" role="toolbar" aria-label="Calculation actions">
      <button class="btn btn-outline btn-sm action-btn ai-copilot-trigger-btn" id="action-ai-decision-btn" title="Analyze this decision with AI Decision Co-Pilot"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary-color);"></i> <span>Decision Co-Pilot</span></button>
      <button class="btn btn-primary btn-sm action-btn action-save-btn" id="action-save-btn" title="Save calculation to your history"><i class="fa-solid fa-bookmark"></i> <span>Save</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-compare-btn"><i class="fa-solid fa-code-compare"></i> <span>Compare A vs B</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-share-btn"><i class="fa-solid fa-share-nodes"></i> <span>Share</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-pdf-btn"><i class="fa-solid fa-file-pdf"></i> <span>PDF</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-csv-btn"><i class="fa-solid fa-file-csv"></i> <span>CSV</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-print-btn"><i class="fa-solid fa-print"></i> <span>Print</span></button>
      <button class="btn btn-outline btn-sm action-btn copy-results-btn" id="copy-results-btn"><i class="fa-regular fa-copy"></i> <span>Copy</span></button>
    </div>
  `;

  // TOC Item Accumulator
  const tocItems = [];

  // 5. Methodology
  const methodologyHtml = buildMethodologyHtml(tool, slug);
  if (methodologyHtml) {
    tocItems.push({ id: 'methodology', label: 'Methodology & Standards' });
  }

  // 6. Article & Educational Sections
  let articleHtml = '';
  if (tool.article) {
    const a = tool.article;
    const articleId = a.id || 'how-to-calculate';
    tocItems.push({ id: articleId, label: a.heading || 'How to Calculate' });

    const sectionsHtml = (a.sections && a.sections.length)
      ? a.sections.map((s, idx) => {
        const bodyText = typeof s.body === 'string'
          ? `<p>${escapeHtml(s.body)}</p>`
          : (Array.isArray(s.body) ? s.body.map(p => `<p>${escapeHtml(p)}</p>`).join('') : `<p>${escapeHtml(s.body || s.content || '')}</p>`);
        return `
          <div class="article-subsection" ${s.id ? `id="${escapeHtml(s.id)}"` : ''}>
            <h3 class="article-subheading">${escapeHtml(s.heading)}</h3>
            <div class="article-body-text">${bodyText}</div>
          </div>`;
      }).join('')
      : '';

    articleHtml = `
      <article class="tool-runner-card educational-card" id="${escapeHtml(articleId)}" aria-labelledby="${escapeHtml(articleId)}-title">
        <h2 id="${escapeHtml(articleId)}-title" class="educational-section-title">${escapeHtml(a.heading)}</h2>
        <div class="article-intro-text"><p>${escapeHtml(a.intro)}</p></div>
        ${sectionsHtml}
      </article>
    `;
  }

  // 7. How To
  let howToHtml = '';
  if (tool.howTo && tool.howTo.length) {
    const howToId = 'how-to-use';
    const howToTitle = `How to Use the ${tool.name}`;
    tocItems.push({ id: howToId, label: howToTitle });

    const steps = tool.howTo.map((step, i) => {
      const stepText = typeof step === 'string' ? escapeHtml(step) : (step.name ? `<strong>${escapeHtml(step.name)}:</strong> ${escapeHtml(step.text)}` : escapeHtml(step.text || ''));
      return `
        <li class="how-to-step">
          <span class="step-num">${i + 1}</span>
          <div class="step-content">${stepText}</div>
        </li>
      `;
    }).join('');

    howToHtml = `
      <section class="tool-runner-card educational-card" id="${howToId}" aria-labelledby="${howToId}-title">
        <h2 id="${howToId}-title" class="educational-section-title">${escapeHtml(howToTitle)}</h2>
        <ol class="how-to-steps-list">${steps}</ol>
      </section>
    `;
  }

  // 8. Formula
  let formulaHtml = '';
  if (tool.formula || tool.formulaBreakdown) {
    const formulaId = 'formula';
    const formulaTitle = tool.formulaTitle || `${tool.name} Formula`;
    tocItems.push({ id: formulaId, label: formulaTitle });

    const formulaText = typeof tool.formula === 'string'
      ? tool.formula
      : (tool.formula && tool.formula.text ? tool.formula.text : (tool.formulaBreakdown || ''));
    const rawVars = tool.formulaVariables || (tool.formula && tool.formula.variables) || [];

    let variablesHtml = '';
    if (rawVars && rawVars.length) {
      variablesHtml = `
        <div class="formula-variables-wrap">
          <h4 class="formula-variables-heading">Variable Definitions:</h4>
          <ul class="formula-variables-list">
            ${rawVars.map(v => `<li><strong>${escapeHtml(v.name || v.symbol || '')}</strong>: ${escapeHtml(v.description || '')}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let plainEnglishHtml = '';
    const explanation = tool.formulaExplanation || (tool.formula && tool.formula.explanation);
    if (explanation) {
      plainEnglishHtml = `<div class="article-body-text"><p>${escapeHtml(explanation)}</p></div>`;
    }

    formulaHtml = `
      <section class="tool-runner-card educational-card" id="${formulaId}" aria-labelledby="${formulaId}-title">
        <h2 id="${formulaId}-title" class="educational-section-title">${escapeHtml(formulaTitle)}</h2>
        <div class="formula-display-box">
          <code>${escapeHtml(formulaText)}</code>
        </div>
        ${plainEnglishHtml}
        ${variablesHtml}
      </section>
    `;
  }

  // 9. Examples
  let examplesHtml = '';
  if (tool.examples && tool.examples.length) {
    const examplesId = 'worked-examples';
    const examplesTitle = 'Real-World Worked Examples';
    tocItems.push({ id: examplesId, label: examplesTitle });

    const exCards = tool.examples.map(ex => `
      <div class="worked-example-card">
        <h3 class="worked-example-title">${escapeHtml(ex.title)}</h3>
        <div class="worked-example-row"><span class="example-label"><strong>Input:</strong></span> <span class="example-val">${escapeHtml(ex.input)}</span></div>
        <div class="worked-example-row worked-example-result"><span class="example-label"><strong>Result:</strong></span> <span class="example-val-highlight">${escapeHtml(ex.result)}</span></div>
        ${ex.explanation ? `<p style="font-size:12px;color:var(--text-secondary);margin-top:6px;line-height:1.5;">${escapeHtml(ex.explanation)}</p>` : ''}
      </div>
    `).join('');

    examplesHtml = `
      <section class="tool-runner-card educational-card" id="${examplesId}" aria-labelledby="${examplesId}-title">
        <h2 id="${examplesId}-title" class="educational-section-title">${escapeHtml(examplesTitle)}</h2>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:14px;">These scenarios demonstrate how key input parameters alter your calculation outcome.</p>
        <div class="worked-examples-grid">${exCards}</div>
      </section>
    `;
  }

  // 10. Additional domain-specific sections
  let additionalSectionsHtml = '';
  if (tool.additionalSections && tool.additionalSections.length) {
    tool.additionalSections.forEach(sec => {
      const secId = sec.id || 'domain-guide';
      tocItems.push({ id: secId, label: sec.heading });

      let contentHtml = '';
      if (sec.items && sec.items.length) {
        contentHtml = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
            ${sec.items.map(item => `
              <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-primary);">${escapeHtml(item.title)}</h4>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin:0;">${escapeHtml(item.description)}</p>
                ${item.note ? `<span style="display:inline-block;margin-top:8px;font-size:11px;color:var(--primary-color);font-weight:600;">${escapeHtml(item.note)}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      } else if (sec.body) {
        contentHtml = `<div class="article-body-text">${typeof sec.body === 'string' ? `<p>${escapeHtml(sec.body)}</p>` : sec.body.map(p => `<p>${escapeHtml(p)}</p>`).join('')}</div>`;
      }

      additionalSectionsHtml += `
        <section class="tool-runner-card educational-card" id="${escapeHtml(secId)}" aria-labelledby="${escapeHtml(secId)}-title">
          <h2 id="${escapeHtml(secId)}-title" class="educational-section-title">${escapeHtml(sec.heading)}</h2>
          ${sec.intro ? `<p style="font-size:14px;color:var(--text-secondary);margin-bottom:14px;">${escapeHtml(sec.intro)}</p>` : ''}
          ${contentHtml}
        </section>
      `;
    });
  }

  // 11. FAQs
  let faqsHtml = '';
  if (tool.faqs && tool.faqs.length) {
    const faqsId = 'faqs';
    const faqsTitle = 'Frequently Asked Questions';
    tocItems.push({ id: faqsId, label: faqsTitle });

    const faqItems = tool.faqs.map(f => {
      const q = f.q || f.question || '';
      const a = f.a || f.answer || '';
      return `
        <details class="faq-item" style="border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:10px;padding:12px 16px;background:var(--bg-card);">
          <summary style="font-weight:600;cursor:pointer;color:var(--text-primary);">${escapeHtml(q)}</summary>
          <p style="margin-top:10px;font-size:14px;color:var(--text-secondary);line-height:1.6;">${escapeHtml(a)}</p>
        </details>
      `;
    }).join('');

    faqsHtml = `
      <section class="tool-runner-card educational-card" id="${faqsId}" aria-labelledby="${faqsId}-title">
        <h2 id="${faqsId}-title" class="educational-section-title">${escapeHtml(faqsTitle)}</h2>
        ${faqItems}
      </section>
    `;
  }

  // 12. Decision Pathways & Interlinking Mesh
  let relatedToolsHtml = '';
  const pathwayEntries = DECISION_PATHWAYS[slug] || [];
  let relItems = [];

  if (pathwayEntries.length > 0) {
    relItems = pathwayEntries;
  } else if (Array.isArray(tool.related) && tool.related.length > 0) {
    relItems = tool.related.map(r => typeof r === 'string' ? { slug: r, reason: 'Complementary decision tool.' } : r);
  } else if (allTools) {
    relItems = Object.keys(allTools)
      .filter(s => s !== slug && allTools[s].category === tool.category)
      .slice(0, 4)
      .map(s => ({ slug: s, reason: 'Complementary calculation tool.' }));
  }

  if (relItems.length > 0) {
    const relatedId = 'related-tools';
    const relatedTitle = 'Next Decision Steps';
    tocItems.push({ id: relatedId, label: relatedTitle });

    const linkCards = relItems.map(item => {
      const relSlug = typeof item === 'string' ? item : item.slug;
      const relReason = (typeof item === 'object' && item.reason) ? item.reason : null;
      const relTool = allTools && allTools[relSlug] ? allTools[relSlug] : null;
      const relName = relTool ? relTool.name : relSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const relDesc = relTool ? (relTool.metaDescription || relTool.description) : 'Calculate and evaluate metrics with precision.';
      const relCat = relTool ? relTool.category : (tool.category || 'Finance');
      const relIcon = (relTool && relTool.icon) || 'fa-calculator';
      const relIconClass = (relTool && relTool.iconClass) || 'icon-finance';
      const relTagClass = (relTool && relTool.tagClass) || 'tag-finance';

      return `
        <a href="/tool/${encodeURIComponent(relSlug)}" class="tool-card decision-pathway-card" style="text-decoration:none; display:flex; flex-direction:column; justify-content:space-between; position:relative;">
          <div>
            <div class="tool-card-header" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
              <div class="tool-icon ${escapeHtml(relIconClass)}"><i class="fa-solid ${escapeHtml(relIcon)}"></i></div>
              <span class="tag ${escapeHtml(relTagClass)}" style="font-size:11px;">${escapeHtml(relCat)}</span>
            </div>
            <h3 style="font-size:15px; font-weight:700; margin-bottom:6px; color:var(--text-primary); line-height:1.3;">${escapeHtml(relName)}</h3>
            ${relReason ? `
              <div style="background:rgba(99,102,241,0.06); border-radius:6px; padding:6px 10px; margin-bottom:8px; font-size:12px; color:var(--primary-color); font-weight:600; line-height:1.4;">
                <i class="fa-solid fa-arrow-trend-up" style="margin-right:4px;"></i>${escapeHtml(relReason)}
              </div>
            ` : ''}
            <p style="font-size:12px; color:var(--text-secondary); line-height:1.5; margin:0;">${escapeHtml(relDesc)}</p>
          </div>
          <div class="tool-card-footer" style="margin-top:14px; display:flex; justify-content:flex-end; align-items:center;">
            <span style="font-size:12px; color:var(--primary-color); font-weight:600; display:flex; align-items:center; gap:6px;">
              <span>Calculate Next Step</span> <i class="fa-solid fa-arrow-right"></i>
            </span>
          </div>
        </a>
      `;
    }).join('');

    relatedToolsHtml = `
      <section class="tool-runner-card educational-card" id="${relatedId}" aria-labelledby="${relatedId}-title">
        <h2 id="${relatedId}-title" class="educational-section-title">
          <i class="fa-solid fa-arrows-split-up-and-left" style="color:var(--primary-color); margin-right:8px;"></i>
          ${escapeHtml(relatedTitle)} & Related Calculators
        </h2>
        <p style="color:var(--text-secondary); font-size:14px; margin-top:-8px; margin-bottom:20px; line-height:1.5;">
          Connect your calculation into a complete financial decision path with these recommended next steps.
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px;">
          ${linkCards}
        </div>
      </section>
    `;
  }

  // 13. Sidebar TOC HTML
  const onThisPageHtml = buildOnThisPageHtml(tocItems);

  return `
    <div class="tool-runner-card">
      <div class="tool-header">
        <h1>${escapeHtml(tool.name)}</h1>
        <p>${escapeHtml(tool.description)}</p>
        ${renderCountrySwitcher(slug, tool.country || 'us')}
      </div>
      <div class="tool-grid-workspace">
        <div class="calculator-form-inputs">
          ${formHtml}
        </div>
        <div class="calculator-results-card" aria-live="polite" aria-atomic="true">
          ${insightHtml}
          ${statsHtml}
          ${toolbarHtml}
        </div>
      </div>
    </div>
    ${methodologyHtml}
    <div class="educational-layout">
      <div class="educational-main-content">
        ${articleHtml}
        ${howToHtml}
        ${formulaHtml}
        ${examplesHtml}
        ${additionalSectionsHtml}
        ${faqsHtml}
        ${relatedToolsHtml}
      </div>
      <aside class="educational-sidebar" aria-label="Page navigation sidebar">
        ${onThisPageHtml}
      </aside>
    </div>
  `;
}

// ── 4. Generate Static per-tool HTML pages ───────────────────────────
const toolDir = path.join(__dirname, 'tool');
if (!fs.existsSync(toolDir)) fs.mkdirSync(toolDir, { recursive: true });

const toolPageTemplate = (tool, allTools = {}) => {
  const title = buildTitle(tool);
  const canonical = buildCanonical(tool.slug);
  const desc = escapeHtml(tool.metaDescription || tool.description);
  const jsonLdBlocks = [
    buildSoftwareAppJsonLd(tool),
    buildBreadcrumbJsonLd(tool),
    buildFaqJsonLd(tool),
    buildHowToJsonLd(tool),
    buildArticleJsonLd(tool),
  ].filter(Boolean);

  const catSlug = (tool.category || 'finance').toLowerCase();
  const preRenderedBody = renderPreRenderedToolContent(tool, tool.slug, allTools);

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#6366F1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${canonical}">
    ${buildHreflangTags(tool.slug)}
    ${(tool.country && tool.currency) ? `<script>window.__GETCALCU_COUNTRY__ = '${tool.country}'; window.__ACTIVE_CURRENCY__ = '${tool.currency}'; window.__ACTIVE_CURRENCY_SYMBOL__ = '${tool.currencySymbol || tool.currency}';</script>` : ''}
    <meta name="robots" content="index, follow">
    ${tool.keywords && tool.keywords.length ? `<meta name="keywords" content="${escapeHtml(tool.keywords.join(', '))}">` : ''}

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="GetCalcu">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${BASE_URL}/og-image.png">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${BASE_URL}/og-image.png">

    <!-- Structured Data (JSON-LD) -->
    ${jsonLdBlocks.map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n    ')}

    <!-- Favicon & Icons -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
    <link rel="shortcut icon" href="/favicon.svg">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
    <link rel="preconnect" href="https://www.google-analytics.com" crossorigin>

    <!-- Google Analytics & Tag Manager Non-blocking Init -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-M2PTXPP9QG');
      
      (function() {
        function loadAnalytics() {
          var ga = document.createElement('script');
          ga.async = true;
          ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-M2PTXPP9QG';
          document.head.appendChild(ga);

          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-WT5JT9KH');
        }

        if (window.requestIdleCallback) {
          requestIdleCallback(function() { setTimeout(loadAnalytics, 50); }, { timeout: 1500 });
        } else {
          window.addEventListener('load', function() { setTimeout(loadAnalytics, 50); });
        }
      })();
    </script>
    <!-- Font Preload for instant icon rendering -->
    <link rel="preload" href="/css/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin>

    <link rel="stylesheet" href="/css/style.min.css">
    <link rel="stylesheet" href="/css/icons.css">
</head>
<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WT5JT9KH"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="app-container">
        ${renderSidebarNav(catSlug, false)}

        <main class="main-wrapper" id="main-content">
            <header class="top-header">
                <button class="hamburger-btn" id="hamburger-btn" aria-label="Open navigation" aria-expanded="false">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="search-trigger" id="cmd-k-trigger">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <span>Search calculators, converters, tools...</span>
                    <kbd>⌘K</kbd>
                </div>
                <div class="header-actions">
                    <button class="icon-btn" id="theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
                    <div id="auth-header-slot">
                        <a href="/auth" class="btn btn-primary btn-pill">Sign in</a>
                    </div>
                </div>
            </header>

            <div class="content-body" id="tool-runner-container">
                ${preRenderedBody}
            </div>
        </main>
    </div>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <div class="modal-overlay hidden" id="search-modal" role="dialog" aria-label="Search calculators">
        <div class="modal-card">
            <div class="modal-search-input-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="modal-search-field" placeholder="Search all calculators...">
                <button class="close-btn" id="modal-close-btn">&times;</button>
            </div>
            <div class="search-results-list" id="search-results"></div>
        </div>
    </div>

    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <div class="brand-icon"><img src="/logo.svg" alt="" width="36" height="36"></div>
                <span class="brand-name">GetCalcu</span>
            </div>
            <p class="footer-tagline">Free, fast and accurate tools for everyday problems.</p>
            <div class="footer-social-links" aria-label="Social media links">
                <a href="https://www.linkedin.com/in/getcalcu-community-963923383/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" class="footer-social-icon" title="Follow GetCalcu on LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align: -2px;"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
            </div>
            <nav class="footer-links" aria-label="Footer navigation">
                <a href="/about">About</a>
                <a href="/contact">Contact</a>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/cookie-policy">Cookie Policy</a>
            </nav>
            <p class="footer-copy">&copy; <span id="footer-year"></span> GetCalcu. All rights reserved.</p>
        </div>
    </footer>

    <div class="cookie-consent-banner" id="cookie-banner" role="dialog" aria-label="Cookie consent">
        <p class="cookie-consent-text">
            <i class="fa-solid fa-cookie-bite" style="color: var(--primary-color); margin-right: 6px;"></i>
            We use cookies to improve your experience and analyze anonymous traffic. See our <a href="/cookie-policy">Cookie Policy</a>.
        </p>
        <div class="cookie-consent-actions">
            <button class="btn btn-outline btn-sm" id="cookie-essential-btn">Essential Only</button>
            <button class="btn btn-primary btn-sm" id="cookie-accept-btn">Accept All</button>
            <button class="btn btn-outline btn-sm btn-reset" id="reset-consent-btn">Reset Preferences</button>
        </div>
    </div>

    <script src="/js/tools.min.js"></script>
    <script src="/js/tools-template.js"></script>
    <script src="/js/tool-runner.js" type="module"></script>
    <script src="/js/app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js" defer></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js" defer></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js" defer></script>
    <script src="/js/config.js" defer></script>
    <script src="/js/firebase.js" defer></script>
    <script src="/js/cookie-consent.js" defer></script>
    <script src="/js/maintenance-banner.js" defer></script>
    <script src="/js/pwa.js" defer></script>
    <script>
        // Redirect legacy ?slug= URLs to pretty URLs
        (function() {
            const params = new URLSearchParams(window.location.search);
            const slug = params.get('slug');
            if (slug) {
                window.location.replace('/tool/' + encodeURIComponent(slug));
            }
        })();
    </script>
</body>
</html>`;
};

// ── 5. Generate static per-category HTML pages ───────────────────────
const categoryDir = path.join(__dirname, 'category');
if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

const CATEGORY_GUIDES = {
  finance: {
    heading: 'Navigating Financial Calculations: Key Formulas & Rules of Thumb',
    intro: 'Whether you are buying your first home, aggressively paying off debt, or planning a multi-decade retirement, sound financial decisions start with clear mathematical principles.',
    sections: [
      {
        title: 'The 28/36 Rule for Home Affordability',
        text: 'Most mortgage lenders recommend spending no more than 28% of your gross monthly income on housing expenses (PITI: Principal, Interest, Taxes, and Insurance) and no more than 36% on total debt servicing (including student loans, auto payments, and credit cards).'
      },
      {
        title: 'Debt Payoff: Snowball vs. Avalanche',
        text: 'The Debt Snowball method focuses on psychological momentum by paying off the smallest balances first. The Debt Avalanche method focuses on mathematical efficiency by attacking the highest interest rate first, minimizing lifetime finance charges.'
      },
      {
        title: 'The Rule of 72 for Compound Growth',
        text: 'To estimate how many years it takes for an investment to double at a constant annual return, divide 72 by the annual interest rate (e.g., at an 8% annual return, your money doubles in approximately 9 years: 72 / 8 = 9).'
      }
    ]
  },
  health: {
    heading: 'Understanding Health & Body Composition Metrics',
    intro: 'Health tracking is most effective when combining multiple baseline measurements rather than relying on a single number.',
    sections: [
      {
        title: 'BMI vs. Body Fat Percentage',
        text: 'Body Mass Index (BMI) is a rapid epidemiological screening tool comparing height to total weight. However, because BMI cannot distinguish muscle from adipose tissue, pairing BMI with circumference-based body fat percentage (such as the US Navy Method) provides a much clearer picture of overall fitness.'
      },
      {
        title: 'The Energy Balance Equation (TDEE)',
        text: 'Total Daily Energy Expenditure (TDEE) accounts for Basal Metabolic Rate (BMR), the thermic effect of food, and physical activity. Creating a moderate 300 to 500 calorie daily deficit supports sustainable fat loss while preserving lean muscle mass.'
      }
    ]
  },
  math: {
    heading: 'Everyday Mathematical Relationships & Percentages',
    intro: 'From shopping discounts and sales tax to loan amortization and unit conversions, percentage math forms the foundation of daily problem-solving.',
    sections: [
      {
        title: 'Percentage Increase & Decrease',
        text: 'To find the percentage change between an old value and a new value, subtract the old value from the new value, divide by the absolute value of the old value, and multiply by 100: Change % = ((New - Old) / Old) * 100.'
      },
      {
        title: 'Dimensional Analysis & Unit Conversions',
        text: 'Converting between metric and imperial systems requires exact conversion factors (such as 1 inch = 2.54 cm, 1 pound = 0.453592 kg, and 1 gallon = 3.78541 liters) to maintain precision across scientific, culinary, and technical applications.'
      }
    ]
  },
  business: {
    heading: 'Core Business Economics: Profitability & Unit Economics',
    intro: 'Sustainable business growth relies on understanding unit economics, pricing markup vs. gross margin, and customer acquisition payback horizons.',
    sections: [
      {
        title: 'Margin vs. Markup',
        text: 'Gross Margin is profit as a percentage of selling price ((Price - Cost) / Price), while Markup is profit as a percentage of cost ((Price - Cost) / Cost). For example, buying an item for $50 and selling it for $100 yields a 50% gross margin, but a 100% markup.'
      },
      {
        title: 'The 3:1 LTV to CAC Benchmark',
        text: 'In recurring revenue and SaaS businesses, a healthy business typically aims for Customer Lifetime Value (LTV) to be at least 3 times Customer Acquisition Cost (CAC), with a payback period under 12 months.'
      }
    ]
  },
  construction: {
    heading: 'Practical Material Estimation Standards',
    intro: 'Accurate job site material calculations prevent expensive mid-project delays and minimize waste disposal costs.',
    sections: [
      {
        title: 'The 10% Waste Factor Rule',
        text: 'When ordering tiles, flooring, or brickwork, always add 10% to 15% extra material to account for diagonal cuts, edge trimming, and future repairs.'
      },
      {
        title: 'Concrete Volume Calculation',
        text: 'Concrete is ordered in cubic yards. To calculate cubic yards for a slab: multiply Length (ft) * Width (ft) * Thickness (ft), then divide by 27.'
      }
    ]
  },
  engineering: {
    heading: 'Engineering Principles & Physical Formulas',
    intro: 'Engineering calculations rely on deterministic physical laws governing electrical circuits, structural mechanics, and fluid dynamics.',
    sections: [
      {
        title: "Ohm's Law in DC & AC Circuits",
        text: 'Voltage (V), Current (I), and Resistance (R) are related by V = I * R. Electrical power dissipated in a resistive load equals P = V * I = I^2 * R.'
      },
      {
        title: 'Beam Deflection Mechanics',
        text: 'Euler-Bernoulli beam theory dictates that maximum deflection under load is inversely proportional to the modulus of elasticity (E) and area moment of inertia (I).'
      }
    ]
  },
  education: {
    heading: 'Academic Grading Standards & Coursework Planning',
    intro: 'Grade Point Average (GPA) calculations reflect weighted academic performance across credit hours.',
    sections: [
      {
        title: '4.0 Unweighted vs. Weighted 5.0 Scales',
        text: 'Standard coursework is evaluated on a 4.0 scale (A=4.0, B=3.0, C=2.0). Honors courses typically add +0.5 quality points, while Advanced Placement (AP) and International Baccalaureate (IB) courses add +1.0 quality point to reward academic rigor.'
      }
    ]
  }
};

const categoryPageTemplate = (cat, catTools) => {
  const canonical = `${BASE_URL}/category/${cat.slug}`;
  const desc = escapeHtml(cat.metaDescription);
  
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: `${cat.name} Calculators`, item: canonical },
    ]
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.name} Calculators & Tools`,
    description: cat.metaDescription,
    numberOfItems: catTools.length,
    itemListElement: catTools.map((t, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: t.name,
      url: `${BASE_URL}/tool/${t.slug}`,
      description: t.description,
    }))
  };

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#6366F1">
    <title>${escapeHtml(cat.title)}</title>
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${canonical}">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="GetCalcu">
    <meta property="og:title" content="${escapeHtml(cat.title)}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${BASE_URL}/og-image.png">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(cat.title)}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${BASE_URL}/og-image.png">

    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(itemListJsonLd)}</script>

    <!-- Favicon & Icons -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
    <link rel="shortcut icon" href="/favicon.svg">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
    <link rel="preconnect" href="https://www.google-analytics.com" crossorigin>

    <!-- Google Analytics & Tag Manager Non-blocking Init -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-M2PTXPP9QG');
      
      (function() {
        function loadAnalytics() {
          var ga = document.createElement('script');
          ga.async = true;
          ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-M2PTXPP9QG';
          document.head.appendChild(ga);

          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-WT5JT9KH');
        }

        if (window.requestIdleCallback) {
          requestIdleCallback(function() { setTimeout(loadAnalytics, 50); }, { timeout: 1500 });
        } else {
          window.addEventListener('load', function() { setTimeout(loadAnalytics, 50); });
        }
      })();
    </script>
    <!-- Font Preload for instant icon rendering -->
    <link rel="preload" href="/css/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin>

    <link rel="stylesheet" href="/css/style.min.css">
    <link rel="stylesheet" href="/css/icons.css">
</head>
<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WT5JT9KH"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="app-container">
        ${renderSidebarNav(cat.slug, false)}

        <main class="main-wrapper" id="main-content">
            <header class="top-header">
                <button class="hamburger-btn" id="hamburger-btn" aria-label="Open navigation" aria-expanded="false">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="search-trigger" id="cmd-k-trigger">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <span>Search calculators, converters, tools...</span>
                    <kbd>⌘K</kbd>
                </div>
                <div class="header-actions">
                    <button class="icon-btn" id="theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
                    <div id="auth-header-slot">
                        <a href="/auth" class="btn btn-primary btn-pill">Sign in</a>
                    </div>
                </div>
            </header>

            <div class="content-body">
                <!-- World-Class Category Hero Banner -->
                <section class="category-hero-banner theme-${cat.slug}">
                    <div class="category-hero-content">
                        <div class="category-hero-header-row">
                            <div class="category-hero-icon-wrap">
                                <i class="fa-solid ${cat.icon}"></i>
                            </div>
                            <div class="category-hero-title-group">
                                <div class="category-hero-badge-row">
                                    <span class="category-badge-chip"><i class="fa-solid fa-sparkles"></i> ${escapeHtml(cat.name)} Suite</span>
                                    <span class="category-badge-chip"><i class="fa-solid fa-shield-halved"></i> 100% Free &amp; Private</span>
                                </div>
                                <h1 class="category-hero-heading">${escapeHtml(cat.heading)}</h1>
                                <p class="category-hero-slogan">${escapeHtml(cat.subheading)}</p>
                            </div>
                        </div>

                        <div class="category-search-container">
                            <div class="category-search-box">
                                <i class="fa-solid fa-magnifying-glass category-search-icon"></i>
                                <input type="text" class="category-search-field" id="category-filter-input" placeholder="Search ${catTools.length} ${escapeHtml(cat.name).toLowerCase()} calculators &amp; tools..." aria-label="Search ${escapeHtml(cat.name)} calculators">
                                <button type="button" class="category-search-clear hidden" id="category-search-clear" aria-label="Clear search">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                                <button type="button" class="category-search-btn" id="category-search-btn">
                                    <i class="fa-solid fa-magnifying-glass"></i>
                                    <span>Search</span>
                                </button>
                            </div>
                            <div class="category-search-stats">
                                <span>Showing <strong id="category-filtered-count">${catTools.length}</strong> of <strong>${catTools.length}</strong> calculators</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Pre-rendered Tools Grid -->
                <section class="section-container" id="all-tools">
                    <div class="section-header">
                        <h2>Available ${escapeHtml(cat.name)} Tools</h2>
                    </div>
                    <div class="tools-grid">
                        ${catTools.map(t => `
                            <a href="/tool/${t.slug}" class="tool-card">
                                <div>
                                    <div class="tool-card-header">
                                        <div class="tool-icon ${t.iconClass || ('icon-' + cat.slug)}"><i class="fa-solid ${t.icon || 'fa-calculator'}"></i></div>
                                    </div>
                                    <h3>${escapeHtml(t.name)}</h3>
                                    <p>${escapeHtml(t.description)}</p>
                                </div>
                                <div class="tool-card-footer">
                                    <span class="tag ${t.tagClass || ('tag-' + cat.slug)}">${escapeHtml(t.category)}</span>
                                    <span class="tool-card-cta">Calculate <i class="fa-solid fa-arrow-right"></i></span>
                                </div>
                            </a>
                        `).join('\n                        ')}
                    </div>
                    <div id="category-empty-filter" class="tool-not-found" style="display:none; padding:40px 20px;">
                        <div class="not-found-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                        <h2>No matching calculators found</h2>
                        <p>Try adjusting your search terms or browse all tools.</p>
                    </div>
                
                <!-- Category Topical Authority & Decision Guide -->
                ${CATEGORY_GUIDES[cat.slug] ? `
                <section class="section-container" style="margin-top:40px;">
                    <div class="tool-runner-card" style="padding:32px 28px;">
                        <h2 style="font-size:20px; font-weight:800; color:var(--text-primary); margin-bottom:12px;">
                            ${escapeHtml(CATEGORY_GUIDES[cat.slug].heading)}
                        </h2>
                        <p style="font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:24px;">
                            ${escapeHtml(CATEGORY_GUIDES[cat.slug].intro)}
                        </p>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                            ${CATEGORY_GUIDES[cat.slug].sections.map(s => `
                                <div style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:20px;">
                                    <h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
                                        ${escapeHtml(s.title)}
                                    </h3>
                                    <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; margin:0;">
                                        ${escapeHtml(s.text)}
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
                ` : ''}

            </div>
        </main>
    </div>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <div class="modal-overlay hidden" id="search-modal" role="dialog" aria-label="Search calculators">
        <div class="modal-card">
            <div class="modal-search-input-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="modal-search-field" placeholder="Search all calculators...">
                <button class="close-btn" id="modal-close-btn">&times;</button>
            </div>
            <div class="search-results-list" id="search-results"></div>
        </div>
    </div>

    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <div class="brand-icon"><img src="/logo.svg" alt="" width="36" height="36"></div>
                <span class="brand-name">GetCalcu</span>
            </div>
            <p class="footer-tagline">Free, fast and accurate tools for everyday problems.</p>
            <div class="footer-social-links" aria-label="Social media links">
                <a href="https://www.linkedin.com/in/getcalcu-community-963923383/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" class="footer-social-icon" title="Follow GetCalcu on LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align: -2px;"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
            </div>
            <nav class="footer-links" aria-label="Footer navigation">
                <a href="/about">About</a>
                <a href="/contact">Contact</a>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/cookie-policy">Cookie Policy</a>
            </nav>
            <p class="footer-copy">&copy; <span id="footer-year"></span> GetCalcu. All rights reserved.</p>
        </div>
    </footer>

    <div class="cookie-consent-banner" id="cookie-banner" role="dialog" aria-label="Cookie consent">
        <p class="cookie-consent-text">
            <i class="fa-solid fa-cookie-bite" style="color: var(--primary-color); margin-right: 6px;"></i>
            We use cookies to improve your experience and analyze anonymous traffic. See our <a href="/cookie-policy">Cookie Policy</a>.
        </p>
        <div class="cookie-consent-actions">
            <button class="btn btn-outline btn-sm" id="cookie-essential-btn">Essential Only</button>
            <button class="btn btn-primary btn-sm" id="cookie-accept-btn">Accept All</button>
            <button class="btn btn-outline btn-sm btn-reset" id="reset-consent-btn">Reset Preferences</button>
        </div>
    </div>

    <script src="/js/tools.js"></script>
    <script src="/js/app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js" defer></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js" defer></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js" defer></script>
    <script src="/js/config.js" defer></script>
    <script src="/js/firebase.js" defer></script>
    <script src="/js/cookie-consent.js" defer></script>
    <script src="/js/maintenance-banner.js" defer></script>
    <script src="/js/pwa.js" defer></script>
</body>
</html>`;
};

// ── 6. Main Build Runner ─────────────────────────────────────────────
async function loadLocalizedTools() {
  const localized = {};
  try {
    const etModule = await import('./js/modules/tax-ethiopia.js');
    localized['salary-calculator/et'] = etModule.ethiopiaSalaryCalculator;
  } catch (err) {
    console.error('Failed to load Ethiopian tax module in build-seo.js:', err);
  }
  try {
    const keModule = await import('./js/modules/tax-kenya.js');
    localized['salary-calculator/ke'] = keModule.kenyaSalaryCalculator;
  } catch (err) {
    console.error('Failed to load Kenyan tax module in build-seo.js:', err);
  }
  try {
    const ngModule = await import('./js/modules/tax-nigeria.js');
    localized['salary-calculator/ng'] = ngModule.nigeriaSalaryCalculator;
  } catch (err) {
    console.error('Failed to load Nigerian tax module in build-seo.js:', err);
  }
  try {
    const zaModule = await import('./js/modules/tax-south-africa.js');
    localized['salary-calculator/za'] = zaModule.southAfricaSalaryCalculator;
  } catch (err) {
    console.error('Failed to load South African tax module in build-seo.js:', err);
  }
  return localized;
}

async function build() {
  const baseTools = loadTools();
  const localizedTools = await loadLocalizedTools();
  const tools = { ...baseTools, ...localizedTools };
  const allSlugs = Object.keys(tools);
  const primarySlugs = allSlugs.filter(s => !s.includes('/'));

  // 1. Generate tool landing pages
  allSlugs.forEach(slug => {
    const tool = { ...tools[slug], slug };
    const toolSubDir = path.join(toolDir, slug);
    if (!fs.existsSync(toolSubDir)) fs.mkdirSync(toolSubDir, { recursive: true });

    const html = toolPageTemplate(tool, tools);
    fs.writeFileSync(path.join(toolSubDir, 'index.html'), html, 'utf8');
  });

  // 2. Generate category landing pages
  Object.keys(CATEGORIES).forEach(catKey => {
    const cat = CATEGORIES[catKey];
    const catTools = primarySlugs
      .map(s => ({ ...tools[s], slug: s }))
      .filter(t => (t.category || '').toLowerCase() === cat.slug);

    const catSubDir = path.join(categoryDir, cat.slug);
    if (!fs.existsSync(catSubDir)) fs.mkdirSync(catSubDir, { recursive: true });

    const html = categoryPageTemplate(cat, catTools);
    fs.writeFileSync(path.join(catSubDir, 'index.html'), html, 'utf8');
  });

  // 3. Generate sitemap.xml (Clean, canonical indexable URLs; omit changefreq, priority, and lastmod per hygiene guidelines)
  const sitemapUrls = [
    `${BASE_URL}/`,
    ...Object.keys(CATEGORIES).map(k => `${BASE_URL}/category/${CATEGORIES[k].slug}`),
    ...allSlugs.map(s => `${BASE_URL}/tool/${s}`),
    `${BASE_URL}/about`,
    `${BASE_URL}/contact`,
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${u}</loc>
  </url>`).join('\n')}
</urlset>\n`;

  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml, 'utf8');

  // 4. Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /auth*
Disallow: /history
Disallow: /?category=*

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), robotsTxt, 'utf8');

  console.log(`✓ build-seo.js complete`);
  console.log(`  Tools registered: ${allSlugs.length} (including localized variants)`);
  console.log(`  Static tool pages: ${allSlugs.length} (in /tool/{slug}/)`);
  console.log(`  Static category pages: ${Object.keys(CATEGORIES).length} (in /category/{slug}/)`);
  console.log(`  Sitemap URLs: ${sitemapUrls.length}`);
  console.log(`  robots.txt updated`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
