const TOOLS = {
  'mortgage-calculator': {
    name: 'Mortgage Calculator',
    category: 'Finance',
    icon: 'fa-house',
    iconClass: 'icon-home',
    tagClass: 'tag-finance',
    description: 'Calculate your monthly mortgage payment, total interest paid, and full amortization schedule.',
    metaDescription: 'Free mortgage calculator — instantly calculate monthly payments, total interest, and amortization schedule for any home loan.',
    fields: [
      { id: 'home_price',    label: 'Home Price ($)',         type: 'number', default: 400000, min: 1000,   step: 1000  },
      { id: 'down_payment',  label: 'Down Payment ($)',       type: 'number', default: 80000,  min: 0,      step: 1000  },
      { id: 'interest_rate', label: 'Annual Interest Rate (%)',type: 'number', default: 7.0,   min: 0.1,    step: 0.05  },
      { id: 'loan_term',     label: 'Loan Term (years)',      type: 'select', default: 30,
        options: [10,15,20,25,30].map(v => ({ value: v, label: `${v} years` })) },
      { id: 'property_tax',  label: 'Annual Property Tax ($)',type: 'number', default: 4800,   min: 0,      step: 100   },
      { id: 'insurance',     label: 'Annual Insurance ($)',   type: 'number', default: 1200,   min: 0,      step: 100   },
    ],
    calculate(v) {
      const principal = v.home_price - v.down_payment;
      const r = v.interest_rate / 100 / 12;
      const n = v.loan_term * 12;
      const base = r === 0 ? principal / n : principal * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
      const monthly = base + v.property_tax/12 + v.insurance/12;
      const totalPaid = base * n;
      const totalInterest = totalPaid - principal;
      const schedule = buildAmortization(principal, r, n, base);
      return {
        stats: [
          { label: 'Monthly Payment',   value: fmt(monthly),       highlight: true  },
          { label: 'Principal & Interest', value: fmt(base)                          },
          { label: 'Total Interest',    value: fmt(totalInterest), warn: true        },
          { label: 'Total Cost',        value: fmt(totalPaid + v.down_payment)       },
          { label: 'Loan Amount',       value: fmt(principal)                        },
          { label: 'Down Payment',      value: pct(v.down_payment / v.home_price)   },
        ],
        chart: { principal, totalInterest },
        table: schedule,
      };
    },
  },

  'bmi-calculator': {
    name: 'BMI Calculator',
    category: 'Health',
    icon: 'fa-heart',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    description: 'Calculate your Body Mass Index (BMI) and find out your healthy weight range.',
    metaDescription: 'Free BMI calculator — instantly calculate your Body Mass Index, health category, and ideal weight range.',
    fields: [
      { id: 'unit',   label: 'Unit System', type: 'select', default: 'metric',
        options: [{ value:'metric', label:'Metric (kg / cm)' }, { value:'imperial', label:'Imperial (lb / in)' }] },
      { id: 'weight', label: 'Weight',      type: 'number', default: 70,  min: 1,   step: 0.1 },
      { id: 'height', label: 'Height',      type: 'number', default: 175, min: 1,   step: 0.1 },
      { id: 'age',    label: 'Age',         type: 'number', default: 30,  min: 1,   max: 120, step: 1 },
    ],
    fieldLabels(v) {
      return {
        weight: v.unit === 'imperial' ? 'Weight (lb)' : 'Weight (kg)',
        height: v.unit === 'imperial' ? 'Height (in)' : 'Height (cm)',
      };
    },
    calculate(v) {
      let weightKg = v.weight, heightM = v.height / 100;
      if (v.unit === 'imperial') { weightKg = v.weight * 0.453592; heightM = v.height * 0.0254; }
      const bmi = weightKg / (heightM * heightM);
      const { label, color } = bmiCategory(bmi);
      const minW = 18.5 * heightM * heightM, maxW = 24.9 * heightM * heightM;
      const minDisp = v.unit === 'imperial' ? `${(minW/0.453592).toFixed(1)} lb` : `${minW.toFixed(1)} kg`;
      const maxDisp = v.unit === 'imperial' ? `${(maxW/0.453592).toFixed(1)} lb` : `${maxW.toFixed(1)} kg`;
      return {
        stats: [
          { label: 'Your BMI',        value: bmi.toFixed(1),          highlight: true, color },
          { label: 'Category',        value: label,                   color                  },
          { label: 'Healthy Range',   value: `${minDisp} – ${maxDisp}`                       },
          { label: 'Healthy BMI',     value: '18.5 – 24.9'                                   },
        ],
        bmiGauge: { bmi, label, color },
      };
    },
  },

  'percentage-calculator': {
    name: 'Percentage Calculator',
    category: 'Math',
    icon: 'fa-percent',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    description: 'Calculate percentages, percentage change, and percentage of a total instantly.',
    metaDescription: 'Free percentage calculator — calculate what percent one number is of another, percentage increase/decrease, and more.',
    fields: [
      { id: 'mode', label: 'Calculation Type', type: 'select', default: 'of',
        options: [
          { value: 'of',      label: 'What is X% of Y?'           },
          { value: 'is',      label: 'X is what % of Y?'          },
          { value: 'change',  label: '% Change from X to Y'       },
          { value: 'add',     label: 'Add X% to Y'                },
          { value: 'remove',  label: 'Remove X% from Y'           },
        ]
      },
      { id: 'val_a', label: 'Value A (X)', type: 'number', default: 25,   step: 'any' },
      { id: 'val_b', label: 'Value B (Y)', type: 'number', default: 200,  step: 'any' },
    ],
    calculate(v) {
      let result, explanation;
      switch (v.mode) {
        case 'of':     result = (v.val_a / 100) * v.val_b; explanation = `${v.val_a}% of ${v.val_b} = ${fmtN(result)}`; break;
        case 'is':     result = (v.val_a / v.val_b) * 100; explanation = `${v.val_a} is ${fmtN(result)}% of ${v.val_b}`; break;
        case 'change': result = ((v.val_b - v.val_a) / Math.abs(v.val_a)) * 100; explanation = `Change from ${v.val_a} to ${v.val_b} = ${fmtN(result)}%`; break;
        case 'add':    result = v.val_b * (1 + v.val_a/100); explanation = `${v.val_b} + ${v.val_a}% = ${fmtN(result)}`; break;
        case 'remove': result = v.val_b * (1 - v.val_a/100); explanation = `${v.val_b} − ${v.val_a}% = ${fmtN(result)}`; break;
      }
      const isPercent = v.mode === 'is' || v.mode === 'change';
      return {
        stats: [
          { label: 'Result', value: isPercent ? `${fmtN(result)}%` : fmtN(result), highlight: true },
          { label: 'Formula', value: explanation },
        ],
      };
    },
  },

  'loan-calculator': {
    name: 'Loan Calculator',
    category: 'Finance',
    icon: 'fa-hand-holding-dollar',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate monthly loan payments, total interest, and full amortization schedule for any loan.',
    metaDescription: 'Free loan calculator — calculate monthly payments, total interest, and amortization schedule for personal, auto, or student loans.',
    fields: [
      { id: 'loan_amount',   label: 'Loan Amount ($)',          type: 'number', default: 25000, min: 100,  step: 100  },
      { id: 'interest_rate', label: 'Annual Interest Rate (%)', type: 'number', default: 6.5,  min: 0.01, step: 0.05 },
      { id: 'loan_term',     label: 'Loan Term',                type: 'select', default: 5,
        options: [1,2,3,4,5,6,7,10,15,20].map(v => ({ value: v, label: `${v} year${v>1?'s':''}` })) },
    ],
    calculate(v) {
      const r = v.interest_rate / 100 / 12;
      const n = v.loan_term * 12;
      const payment = r === 0 ? v.loan_amount / n : v.loan_amount * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
      const totalPaid = payment * n;
      const totalInterest = totalPaid - v.loan_amount;
      const schedule = buildAmortization(v.loan_amount, r, n, payment);
      return {
        stats: [
          { label: 'Monthly Payment',  value: fmt(payment),       highlight: true },
          { label: 'Total Interest',   value: fmt(totalInterest), warn: true      },
          { label: 'Total Paid',       value: fmt(totalPaid)                      },
          { label: 'Loan Amount',      value: fmt(v.loan_amount)                  },
        ],
        chart: { principal: v.loan_amount, totalInterest },
        table: schedule,
      };
    },
  },

  'date-calculator': {
    name: 'Date Calculator',
    category: 'Math',
    icon: 'fa-calendar-days',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    description: 'Calculate the duration between two dates or find a future/past date by adding or subtracting time.',
    metaDescription: 'Free and easy Date Calculator to find the duration between two dates in years, months, and days. Also, add or subtract days, weeks, months, or years from any date.',
    fields: [
      { id: 'mode', label: 'Calculation Mode', type: 'select', default: 'duration',
        options: [
          { value: 'duration', label: 'Find Duration Between Dates' },
          { value: 'add',      label: 'Add to a Date' },
          { value: 'subtract', label: 'Subtract from a Date' },
        ]
      },
      { id: 'start_date', label: 'Start Date', type: 'date', default: () => new Date().toISOString().split('T')[0] },
      { id: 'end_date',   label: 'End Date',   type: 'date', default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: v => v.mode === 'duration' },
      { id: 'add_years',   label: 'Years',   type: 'number', default: 0, min: 0, step: 1, condition: v => v.mode === 'add' || v.mode === 'subtract' },
      { id: 'add_months',  label: 'Months',  type: 'number', default: 1, min: 0, step: 1, condition: v => v.mode === 'add' || v.mode === 'subtract' },
      { id: 'add_weeks',   label: 'Weeks',   type: 'number', default: 0, min: 0, step: 1, condition: v => v.mode === 'add' || v.mode === 'subtract' },
      { id: 'add_days',    label: 'Days',    type: 'number', default: 0, min: 0, step: 1, condition: v => v.mode === 'add' || v.mode === 'subtract' },
    ],
    calculate(v) {
      const startDate = new Date(v.start_date + 'T00:00:00');
      if (v.mode === 'duration') {
        const endDate = new Date(v.end_date + 'T00:00:00');
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffWeeks = (diffDays / 7).toFixed(2);
        const diffMonths = (diffDays / 30.44).toFixed(2);
        const diffYears = (diffDays / 365.25).toFixed(2);
        return {
          stats: [
            { label: 'Duration', value: `${diffDays} days`, highlight: true },
            { label: 'In Other Units', value: `${diffWeeks} weeks / ${diffMonths} months / ${diffYears} years` },
          ],
        };
      } else {
        let newDate = new Date(startDate);
        const sign = v.mode === 'add' ? 1 : -1;
        newDate.setFullYear(newDate.getFullYear() + sign * v.add_years);
        newDate.setMonth(newDate.getMonth() + sign * v.add_months);
        newDate.setDate(newDate.getDate() + sign * (v.add_weeks * 7 + v.add_days));
        return {
          stats: [{
            label: 'Resulting Date',
            value: `${newDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${newDate.toISOString().split('T')[0]}`,
            highlight: true
                              }],
        };
      }

    },
  },

  // ── Loan Interest Calculator ────────────────────────────────
  'loan-interest-calculator': {
    name: 'Loan Interest Calculator',
    category: 'Finance',
    icon: 'fa-hand-holding-dollar',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate total interest payable, monthly payments, and generate a complete amortization schedule for any loan.',
    metaDescription: 'Free loan interest calculator — compute total interest, monthly payments, and download full amortization schedule for personal, auto, or business loans.',
    fields: [
      { id: 'principal',      label: 'Loan Amount ($)',        type: 'number', default: 25000,  min: 100,    step: 100   },
      { id: 'annual_rate',    label: 'Annual Interest Rate (%)', type: 'number', default: 6.5,   min: 0.1,    step: 0.05  },
      { id: 'loan_tenure',    label: 'Loan Tenure (years)',    type: 'number', default: 5,     min: 1,      step: 1 },
      { id: 'repayment_freq', label: 'Repayment Frequency',    type: 'select', default: 'monthly',
        options: [
          { value: 'monthly',   label: 'Monthly (12/yr)' },
          { value: 'biweekly',  label: 'Bi-weekly (26/yr)' },
          { value: 'weekly',    label: 'Weekly (52/yr)' },
          { value: 'quarterly', label: 'Quarterly (4/yr)' },
        ]
      },
    ],
    calculate(v) {
      const principal = v.principal;
      const annualRate = v.annual_rate / 100;
      const years = v.loan_tenure;
      const freq = v.repayment_freq;

      const periodsPerYear = { monthly: 12, biweekly: 26, weekly: 52, quarterly: 4 }[freq];
      const totalPeriods = years * periodsPerYear;
      const periodicRate = annualRate / periodsPerYear;

      let payment;
      if (periodicRate === 0) {
        payment = principal / totalPeriods;
      } else {
        payment = principal * (periodicRate * Math.pow(1 + periodicRate, totalPeriods)) / (Math.pow(1 + periodicRate, totalPeriods) - 1);
      }

      const totalPaid = payment * totalPeriods;
      const totalInterest = totalPaid - principal;

      const schedule = buildAmortization(principal, periodicRate, totalPeriods, payment);

      const freqLabel = { monthly: 'Monthly', biweekly: 'Bi-weekly', weekly: 'Weekly', quarterly: 'Quarterly' }[freq];

      return {
        stats: [
          { label: freqLabel + ' Payment', value: fmtCurrency(payment), highlight: true },
          { label: 'Total Interest Payable', value: fmtCurrency(totalInterest), warn: true },
          { label: 'Total Amount Payable', value: fmtCurrency(totalPaid) },
          { label: 'Loan Amount', value: fmtCurrency(principal) },
          { label: 'Interest-to-Principal Ratio', value: pct(totalInterest / principal) },
          { label: 'Total Payments', value: totalPeriods + ' ' + freqLabel.toLowerCase() + ' payments' },
        ],
        chart: { principal, totalInterest },
        table: schedule,
      };
    },
  },

  // ── Compound Interest Calculator ──────────────────────────────
  'compound-interest-calculator': {
    name: 'Compound Interest Calculator',
    category: 'Finance',
    icon: 'fa-chart-line',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Project how your savings and investments grow over time with compound interest and recurring monthly contributions.',
    metaDescription: 'Free compound interest calculator — see how your money grows with compounding and monthly contributions. Get year-by-year projections, total interest earned, and charts.',
    fields: [
      { id: 'principal',         label: 'Starting Balance ($)',          type: 'number', default: 10000, min: 0,      step: 100   },
      { id: 'annual_rate',       label: 'Annual Interest Rate (%)',       type: 'number', default: 8.0,   min: 0.01,   step: 0.1   },
      { id: 'compounding_freq',  label: 'Compounding Frequency',         type: 'select', default: 'monthly',
        options: [
          { value: 'annually',       label: 'Annually (1/yr)' },
          { value: 'semi-annually',  label: 'Semi-annually (2/yr)' },
          { value: 'quarterly',      label: 'Quarterly (4/yr)' },
          { value: 'monthly',        label: 'Monthly (12/yr)' },
          { value: 'daily',          label: 'Daily (365/yr)' },
        ]
      },
      { id: 'monthly_contribution', label: 'Monthly Contribution ($)',   type: 'number', default: 500,   min: 0,      step: 50    },
      { id: 'time_years',          label: 'Time Horizon (years)',        type: 'number', default: 30,    min: 1,      max: 100,   step: 1 },
    ],
    calculate(v) {
      const principal = v.principal;
      const annualRate = v.annual_rate / 100;
      const years = v.time_years;
      const contribution = v.monthly_contribution;

      const periodsPerYear = { annually: 1, 'semi-annually': 2, quarterly: 4, monthly: 12, daily: 365 }[v.compounding_freq];
      const totalPeriods = years * periodsPerYear;
      const periodicRate = annualRate / periodsPerYear;
      const contributionPerPeriod = contribution * (12 / periodsPerYear);

      let futureValue;
      if (periodicRate === 0) {
        futureValue = principal + contributionPerPeriod * totalPeriods;
      } else {
        const growthFactor = Math.pow(1 + periodicRate, totalPeriods);
        const lumpSumPortion = principal * growthFactor;
        const contribPortion = contributionPerPeriod * (growthFactor - 1) / periodicRate;
        futureValue = lumpSumPortion + contribPortion;
      }

      const totalContributions = principal + contribution * 12 * years;
      const totalInterest = futureValue - totalContributions;

      // Year-by-year schedule
      const schedule = [];
      for (let y = 1; y <= years; y++) {
        const yPeriods = y * periodsPerYear;
        let yValue;
        if (periodicRate === 0) {
          yValue = principal + contributionPerPeriod * yPeriods;
        } else {
          const yGrowth = Math.pow(1 + periodicRate, yPeriods);
          const yLump = principal * yGrowth;
          const yContrib = contributionPerPeriod * (yGrowth - 1) / periodicRate;
          yValue = yLump + yContrib;
        }
        const yContributions = principal + contribution * 12 * y;
        const yInterest = yValue - yContributions;
        schedule.push({
          month: y,
          payment: fmtCurrency(contribution * 12),
          principal: fmtCurrency(yContributions),
          interest: fmtCurrency(yInterest),
          balance: fmtCurrency(yValue),
        });
      }

      const freqMap = { annually: 'Annual', 'semi-annually': 'Semi-Annual', quarterly: 'Quarterly', monthly: 'Monthly', daily: 'Daily' };

      return {
        stats: [
          { label: 'Final Balance',       value: fmtCurrency(futureValue),         highlight: true },
          { label: 'Total Contributions', value: fmtCurrency(totalContributions)                        },
          { label: 'Total Interest Earned', value: fmtCurrency(totalInterest),      warn: false          },
          { label: 'Compounding',         value: freqMap[v.compounding_freq] + ' (' + periodsPerYear + '/yr)' },
          { label: 'Interest-to-Contributions Ratio', value: pct(totalInterest / (totalContributions || 1)) },
          { label: 'Annual Return',       value: (annualRate * 100).toFixed(2) + '%'                     },
        ],
        chart: { principal: totalContributions, totalInterest },
        table: schedule,
      };
    },
    examples: [
      {
        icon: 'fa-building-columns',
        title: 'Retirement at 65',
        description: 'Start with $10,000 at age 30, add $500/month at 9% compounded monthly. After 35 years you have over $1.6 million.',
        inputs: { 'Starting Balance': '$10,000', 'Monthly Contribution': '$500', 'Rate': '9%', 'Time': '35 years' },
      },
      {
        icon: 'fa-graduation-cap',
        title: 'College Fund',
        description: 'Save $200/month from birth, 7% compounded monthly. At age 18 you have over $85,000 for tuition.',
        inputs: { 'Starting Balance': '$0', 'Monthly Contribution': '$200', 'Rate': '7%', 'Time': '18 years' },
      },
      {
        icon: 'fa-house',
        title: 'Down Payment Savings',
        description: 'Save $800/month at 4.5% compounded monthly. In 5 years you have nearly $54,000 for a down payment.',
        inputs: { 'Starting Balance': '$0', 'Monthly Contribution': '$800', 'Rate': '4.5%', 'Time': '5 years' },
      },
    ],
    faqs: [
      {
        q: 'How often should I compound interest for the best results?',
        a: 'More frequent compounding yields higher returns, but the benefit shrinks as frequency increases. Monthly compounding is the standard sweet spot for savings and investment projections. Daily compounding adds marginal extra growth. The big difference is between annual and monthly — not between daily and continuous compounding.',
      },
      {
        q: 'What is the difference between compound interest and simple interest?',
        a: 'Simple interest earns returns only on your original principal. Compound interest earns returns on your principal plus all previously earned interest. On $10,000 at 8% over 30 years, simple interest gives you $24,000 in earnings — compound interest gives you over $90,000. The gap grows exponentially with time.',
      },
      {
        q: 'Can compound interest work against me?',
        a: 'Yes. Credit cards and adjustable-rate loans often compound interest daily. If you carry a balance on a card with 22% APR compounded daily, your debt can spiral fast. The same math that grows your savings can accelerate your debt. Use this calculator with your loan terms to see the true cost of carrying a balance.',
      },
      {
        q: 'What is a reasonable rate of return to use for long-term projections?',
        a: 'For US stock market investments: 7-10% before inflation, 5-7% after inflation. For high-yield savings accounts: check current rates (typically 4-5%). For bonds: 3-6% depending on duration and credit quality. When in doubt, use a lower rate — undershooting your goal is better than overshooting it.',
      },
    ],
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n)  { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function pct(n)  { return (n * 100).toFixed(2) + '%'; }

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight',    color: '#3B82F6' };
  if (bmi < 25)   return { label: 'Normal Weight',  color: '#10B981' };
  if (bmi < 30)   return { label: 'Overweight',     color: '#F59E0B' };
  return              { label: 'Obese',           color: '#EF4444' };
}

function buildAmortization(principal, r, n, payment) {
  const rows = [];
  let balance = principal;
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance -= principalPaid;
    rows.push({ month: i, payment, principal: principalPaid, interest, balance: Math.max(0, balance) });
    if (balance <= 0) break;
  }
  return rows;
}

function fmtCurrency(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
