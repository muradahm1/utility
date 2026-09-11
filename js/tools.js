// ── Phase 5.11: Lazy-load Chart.js ONLY when a chart is actually needed ──
// Some legacy calculators in this file use `new Chart()` directly. On the
// homepage Chart is undefined, so this would otherwise inject the ~200KB
// Chart.js library onto pages that never render a chart (slowing first paint).
// We only inject it when a tool/result chart canvas is present in the DOM.
(function () {
    if (typeof document !== 'undefined' && document.head &&
        typeof Chart === 'undefined' &&
        document.getElementById('tool-runner-container') &&
        document.querySelector('#result-chart, #result-chart-2, #result-chart-3, #result-chart-4, .chart-container canvas, #budget-chart, .chart-wrapper canvas')) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.async = true;
        document.head.appendChild(s);
    }
})();

const TOOLS = {
  'mortgage-calculator': {
    presets: [
          {
                "label": "30-Yr Fixed (20% Down)",
                "values": {
                      "home_price": 400000,
                      "down_payment": 80000,
                      "interest_rate": 6.8,
                      "loan_term": 30,
                      "property_tax": 4800,
                      "insurance": 1200
                }
          },
          {
                "label": "15-Yr Fixed (Save Interest)",
                "values": {
                      "home_price": 400000,
                      "down_payment": 80000,
                      "interest_rate": 6,
                      "loan_term": 15,
                      "property_tax": 4800,
                      "insurance": 1200
                }
          },
          {
                "label": "FHA Starter (3.5% Down)",
                "values": {
                      "home_price": 320000,
                      "down_payment": 11200,
                      "interest_rate": 6.5,
                      "loan_term": 30,
                      "property_tax": 3800,
                      "insurance": 1100
                }
          }
    ],
    name: 'Mortgage Calculator',
    category: 'Finance',
    icon: 'fa-house',
    iconClass: 'icon-home',
    tagClass: 'tag-finance',
    description: 'Calculate your monthly mortgage payment, total interest paid, and full amortization schedule.',
    metaDescription: 'Free mortgage calculator — instantly calculate monthly payments, total interest, and amortization schedule for any home loan.',
    fields: [
      { id: 'home_price',    label: 'Home Price ($)',         type: 'number', default: 400000, min: 1000,   step: 1000,  hint: 'The total purchase price of the home you are buying.' },
      { id: 'down_payment',  label: 'Down Payment ($)',       type: 'number', default: 80000,  min: 0,      step: 1000,  hint: 'Cash paid upfront. A larger down payment lowers your loan amount and can help you avoid PMI (typically need 20% to skip it).' },
      { id: 'interest_rate', label: 'Annual Interest Rate (%)',type: 'number', default: 7.0,   min: 0.01,   step: 0.05, max: 50, hint: 'The yearly interest rate (APR) on your mortgage. US 30-year fixed rates have often ranged 6-8%.' },
      { id: 'loan_term',     label: 'Loan Term (years)',      type: 'select', default: 30,
        options: [10,15,20,25,30].map(v => ({ value: v, label: `${v} years` })), hint: 'How long you take to repay the loan. Shorter terms mean higher monthly payments but far less total interest.' },
      { id: 'property_tax',  label: 'Annual Property Tax ($)',type: 'number', default: 4800,   min: 0,      step: 100,   hint: 'Yearly property tax set by your local government, spread across your monthly payments.' },
      { id: 'insurance',     label: 'Annual Insurance ($)',   type: 'number', default: 1200,   min: 0,      step: 100,   hint: 'Yearly homeowners insurance premium, spread across your monthly payments.' },
    ],
    calculate(v) {
      // M = P * [r(1+r)^n] / [(1+r)^n - 1]
      const principal = safeNum(v.home_price, 0) - safeNum(v.down_payment, 0);
      if (principal <= 0) {
        return errorResult('Down payment must be less than home price.');
      }
      const annualRate = safeNum(v.interest_rate, 0);
      const r = annualRate / 100 / 12;
      const n = Math.round(safeNum(v.loan_term, 30)) * 12;
      const taxMonthly = safeNum(v.property_tax, 0) / 12;
      const insMonthly = safeNum(v.insurance, 0) / 12;

      const base = r === 0
        ? principal / n
        : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      const monthlyPI = roundTo(base, 2);
      const monthlyTotal = roundTo(monthlyPI + taxMonthly + insMonthly, 2);
      const totalPaid = roundTo(monthlyTotal * n, 2);
      const totalInterest = roundTo(monthlyPI * n - principal, 2);
      const totalTaxIns = roundTo((taxMonthly + insMonthly) * n, 2);
      // Total cost = down_payment + (monthly_total * n)
      const trueTotalCost = roundTo(safeNum(v.down_payment, 0) + monthlyTotal * n, 2);

      const schedule = buildAmortization(principal, r, n, monthlyPI);
      return {
        stats: [
          { label: 'Monthly Payment',   value: fmt(monthlyTotal), highlight: true  },
          { label: 'Principal & Interest', value: fmt(monthlyPI)                      },
          { label: 'Total Interest',    value: fmt(totalInterest), warn: true         },
          { label: 'Property Tax & Insurance', value: fmt(totalTaxIns)                 },
          { label: 'Total Cost',        value: fmt(trueTotalCost)                      },
          { label: 'Loan Amount',       value: fmt(principal)                          },
          { label: 'Down Payment',      value: pct(safeNum(v.down_payment, 0) / safeNum(v.home_price, 1)) },
        ],
        chart: { principal, totalInterest },
        table: schedule,
      };
    },

    article: {
      heading: 'How to Calculate Your Mortgage Payment Accurately',
      intro: 'Your monthly mortgage payment is more than just principal and interest — it includes property taxes and insurance (PITI). The GetCalcu Mortgage Calculator breaks down every component so you know exactly what you will pay each month and over the life of the loan.',
      sections: [
        { heading: 'Principal, Interest, Taxes, and Insurance (PITI)', body: 'Principal is the amount you borrowed, interest is the lender\'s charge for lending it, property taxes fund local services, and homeowners insurance protects your investment. Lenders typically bundle all four into one monthly payment.' },
        { heading: 'How the Loan Term Affects Total Cost', body: 'A 30-year term keeps monthly payments low but you pay roughly twice as much total interest as a 15-year term. Use the calculator to compare terms side by side and see the lifetime interest difference.' },
      ],
    },
    howTo: [
      'Enter the home price and your down payment — the calculator subtracts the down payment to find your loan amount.',
      'Add the annual interest rate (APR) and choose your loan term in years.',
      'Include annual property tax and homeowners insurance for a true PITI monthly payment.',
      'Review your monthly payment, total interest, and full amortization schedule.',
      'Adjust the down payment or term to see how much interest you can save.',
    ],
    examples: [
      { title: 'Typical 30-Year Fixed Mortgage', input: 'Price: $400,000, Down: $80,000, Rate: 7%, Term: 30 years', result: 'Monthly Payment: ~$2,129 | Total Interest: ~$466,000' },
      { title: '15-Year Term Saves Interest', input: 'Price: $400,000, Down: $80,000, Rate: 6.5%, Term: 15 years', result: 'Monthly Payment: ~$2,935 | Total Interest: ~$188,000' },
    ],
    formula: 'M = P × [r(1+r)^n] / [(1+r)^n − 1] | Monthly Total = M + (Property Tax / 12) + (Insurance / 12) | Total Interest = (M × n) − P',
    faqs: [
      { q: 'How is a monthly mortgage payment calculated?', a: 'A monthly mortgage payment is calculated using the amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1], where P is the loan principal, r is the monthly interest rate (annual rate ÷ 12), and n is the total number of payments (years × 12). Property taxes and insurance are then added to get your full PITI payment.' },
      { q: 'What is PITI in a mortgage payment?', a: 'PITI stands for Principal, Interest, Taxes, and Insurance — the four components most lenders bundle into your monthly mortgage payment. Principal and Interest repay the loan, while Taxes and Insurance cover annual property tax and homeowners insurance, divided by 12 and collected each month.' },
      { q: 'How much down payment do I need to avoid PMI?', a: 'You typically need a down payment of at least 20% of the home price to avoid Private Mortgage Insurance (PMI). PMI protects the lender (not you) when you put down less than 20%, and usually costs 0.5% to 1% of the loan amount per year until your equity reaches 20%.' },
      { q: 'Is a 15-year or 30-year mortgage better?', a: 'A 15-year mortgage has higher monthly payments but you pay roughly half the total interest of a 30-year loan and build equity faster. A 30-year mortgage keeps payments affordable and offers flexibility, but costs far more over time. Use our calculator to compare the total interest of both terms with your exact numbers.' },
      { q: 'What is an amortization schedule?', a: 'An amortization schedule is a table showing how each payment splits between principal and interest over the life of the loan. Early payments are mostly interest, while later payments are mostly principal. Our calculator generates a full month-by-month amortization schedule automatically.' },
    ],
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
        options: [{ value:'metric', label:'Metric (kg / cm)' }, { value:'imperial', label:'Imperial (lb / in)' }], hint: 'Choose Metric (kilograms / centimeters) or Imperial (pounds / inches).' },
      { id: 'weight', label: 'Weight',      type: 'number', default: 70,  min: 1,   step: 0.1, hint: 'Your body weight, entered in the unit system selected above.' },
      { id: 'height', label: 'Height',      type: 'number', default: 175, min: 1,   step: 0.1, hint: 'Your height, entered in the unit system selected above.' },
      { id: 'age',    label: 'Age',         type: 'number', default: 30,  min: 1,   max: 120, step: 1, hint: 'Your age. BMI categories are the same for adults of all ages, but age gives context to your result.' },
    ],
    fieldLabels(v) {
      return {
        weight: v.unit === 'imperial' ? 'Weight (lb)' : 'Weight (kg)',
        height: v.unit === 'imperial' ? 'Height (in)' : 'Height (cm)',
      };
    },
    calculate(v) {
      // BMI = weight_kg / (height_m)^2
      let weightKg = safeNum(v.weight, 0);
      let heightM = safeNum(v.height, 0) / 100;
      if (v.unit === 'imperial') {
        weightKg *= 0.453592;
        heightM = safeNum(v.height, 0) * 0.0254;
      }
      if (weightKg <= 0 || heightM <= 0) {
        return errorResult('Please enter valid weight and height values greater than zero.');
      }

      const bmi = weightKg / (heightM * heightM);
      const clampedBmi = Math.min(Math.max(bmi, 10), 100);

      const cat = bmiCategory(clampedBmi);
      const healthyMin = roundTo(18.5 * heightM * heightM, 1);
      const healthyMax = roundTo(24.9 * heightM * heightM, 1);

      const weightDisplay = v.unit === 'imperial' ? 'lb' : 'kg';

      return {
        stats: [
          { label: 'Your BMI',          value: fmtN(bmi),            highlight: true },
          { label: 'Category',          value: cat.label,            color: cat.color },
          { label: 'Healthy Weight Range', value: `${healthyMin}–${healthyMax} ${weightDisplay}` },
        ],
        bmiGauge: { bmi: clampedBmi, color: cat.color, label: cat.label },
      };
    },

    article: {
      heading: 'How to Calculate Your BMI and Understand Your Weight Category',
      intro: 'Body Mass Index (BMI) is a widely used screening tool that estimates body fat from your height and weight. The GetCalcu BMI Calculator instantly computes your BMI, classifies it, and shows your healthy weight range — in metric or imperial units.',
      sections: [
        { heading: 'What the BMI Categories Mean', body: 'A BMI below 18.5 is Underweight, 18.5–24.9 is Normal Weight, 25–29.9 is Overweight, and 30 or above is Obese. These ranges are the same for adult men and women of all ages, though BMI does not directly measure body fat or muscle mass.' },
        { heading: 'Limitations of BMI', body: 'BMI does not distinguish between muscle and fat, so very muscular athletes may score "Overweight" despite low body fat. It is a useful starting point, not a complete health picture — combine it with waist measurement and body fat percentage for a fuller assessment.' },
      ],
    },
    howTo: [
      'Choose your unit system — Metric (kg and cm) or Imperial (lb and in).',
      'Enter your weight and height in the selected units.',
      'Optionally add your age for extra context (categories are the same for all adults).',
      'Read your BMI value and color-coded category on the gauge.',
      'Use the healthy weight range to set a realistic target.',
    ],
    examples: [
      { title: 'Average Adult (Metric)', input: 'Weight: 70 kg, Height: 175 cm', result: 'BMI: 22.9 — Normal Weight' },
      { title: 'Imperial Units', input: 'Weight: 180 lb, Height: 70 in', result: 'BMI: 25.8 — Overweight' },
    ],
    formula: 'BMI = Weight (kg) / Height (m)² | Imperial: BMI = 703 × Weight (lb) / Height (in)² | Healthy Range: 18.5–24.9',
    faqs: [
      { q: 'How is BMI calculated?', a: 'BMI is calculated as weight in kilograms divided by height in meters squared (kg/m²). In imperial units, the formula is 703 × weight in pounds ÷ height in inches squared. Our calculator handles both unit systems automatically.' },
      { q: 'What is a healthy BMI range?', a: 'A healthy BMI for adults is between 18.5 and 24.9 (Normal Weight). A BMI of 25–29.9 is classified as Overweight, and 30 or above as Obese. Below 18.5 is considered Underweight. These thresholds are set by the World Health Organization.' },
      { q: 'Is BMI accurate for athletes and muscular people?', a: 'BMI does not distinguish muscle from fat, so heavily muscled athletes may register as "Overweight" or "Obese" despite having low body fat. For athletic builds, body fat percentage and waist-to-hip ratio are more accurate indicators of health than BMI alone.' },
      { q: 'What BMI is considered obese?', a: 'A BMI of 30 or higher is classified as obese. Class I obesity is 30–34.9, Class II is 35–39.9, and Class III (severe) is 40 or above. Obesity is associated with increased risk of heart disease, type 2 diabetes, and other conditions.' },
      { q: 'Does BMI differ for men and women?', a: 'No — the BMI categories and formula are the same for adult men and women. However, women naturally carry more body fat at the same BMI, and older adults tend to have more body fat at the same BMI than younger adults.' },
    ],
  },

  'percentage-calculator': {
    name: 'Percentage Calculator',
    category: 'Math',
    icon: 'fa-percent',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    description: 'Quickly find what percent one number is of another, calculate percentage increase or decrease, and more.',
    metaDescription: 'Free percentage calculator — find percentages, percent change, and compute values instantly.',
    fields: [
      { id: 'mode',    type: 'select', default: 'what-percent',
        options: [
          { value: 'what-percent',  label: 'X is what % of Y?' },
          { value: 'percent-of',    label: 'What is X% of Y?' },
          { value: 'change',        label: '% Change (from X to Y)' },
        ], hint: 'Pick the type of percentage calculation you want to perform.' },
      { id: 'val_a',   label: 'Value A',   type: 'number', default: 50,  min: -99999999, step: 1, hint: 'The first value. Its meaning changes based on the mode chosen above.' },
      { id: 'val_b',   label: 'Value B',   type: 'number', default: 200, min: -99999999, step: 1, hint: 'The second value. Its meaning changes based on the mode chosen above.' },
    ],
    fieldLabels(v) {
      if (v.mode === 'what-percent') return { val_a: 'What is',  val_b: '% of?' };
      if (v.mode === 'percent-of')   return { val_a: 'Percent', val_b: 'Of (whole)' };
      if (v.mode === 'change')       return { val_a: 'From',    val_b: 'To' };
      return {};
    },
    calculate(v) {
      const a = safeNum(v.val_a, 0);
      const b = safeNum(v.val_b, 0);

      if (v.mode === 'what-percent') {
        if (b === 0) return errorResult('Value B cannot be zero when calculating "X is what % of Y?"');
        const result = (a / b) * 100;
        return {
          stats: [
            { label: 'Result',              value: fmtN(result) + '%', highlight: true },
            { label: 'Calculation',         value: `${fmtN(a)} is ${fmtN(result)}% of ${fmtN(b)}` },
          ],
        };
      }

      if (v.mode === 'percent-of') {
        const result = (a / 100) * b;
        return {
          stats: [
            { label: 'Result',              value: fmtN(result),       highlight: true },
            { label: 'Calculation',         value: `${fmtN(a)}% of ${fmtN(b)} = ${fmtN(result)}` },
          ],
        };
      }

      if (v.mode === 'change') {
        if (a === 0) return errorResult('Starting value (From) cannot be zero when calculating percent change.');
        const result = ((b - a) / Math.abs(a)) * 100;
        const direction = result >= 0 ? 'increase' : 'decrease';
        return {
          stats: [
            { label: 'Result',              value: fmtN(Math.abs(result)) + '% ' + direction, highlight: true },
            { label: 'Difference',          value: fmtN(b - a) },
            { label: 'From',                value: fmtN(a) },
            { label: 'To',                  value: fmtN(b) },
          ],
        };
      }

      return errorResult('Invalid calculation mode.');
    },

    article: {
      heading: 'How to Calculate Percentages Quickly and Accurately',
      intro: 'Percentages are everywhere — discounts, tips, taxes, grades, and statistics. The GetCalcu Percentage Calculator handles three common calculations in one tool: "X is what % of Y?", "What is X% of Y?", and percentage change between two values.',
      sections: [
        { heading: 'The Three Percentage Modes', body: '"X is what % of Y?" divides X by Y and multiplies by 100. "What is X% of Y?" multiplies Y by X/100. "% Change" subtracts the old value from the new, divides by the old value, and multiplies by 100 — a positive result means increase, negative means decrease.' },
        { heading: 'Common Percentage Mistakes', body: 'A common error is confusing percentage points with percent change. If a rate rises from 10% to 15%, that is a 5 percentage-point increase but a 50% relative increase. Always confirm which comparison you need before calculating.' },
      ],
    },
    howTo: [
      'Select the calculation mode you need from the dropdown.',
      'Enter Value A and Value B as prompted for that mode.',
      'The result updates instantly — no need to press calculate.',
      'Switch modes to solve a different type of percentage problem.',
      'Use negative values when working with losses or decreases.',
    ],
    examples: [
      { title: 'Test Score to Percentage', input: 'Mode: X is what % of Y? | A: 85, B: 100', result: '85%' },
      { title: 'Discount on a Price', input: 'Mode: What is X% of Y? | A: 20, B: 250', result: '$50 off — pay $200' },
      { title: 'Salary Increase', input: 'Mode: % Change | A: 50000, B: 55000', result: '+10% increase' },
    ],
    formula: 'X is what % of Y = (X / Y) × 100 | X% of Y = (X / 100) × Y | % Change = ((New − Old) / Old) × 100',
    faqs: [
      { q: 'How do I calculate what percent one number is of another?', a: 'To find what percent X is of Y, divide X by Y and multiply by 100: (X ÷ Y) × 100. For example, 25 is what percent of 200? (25 ÷ 200) × 100 = 12.5%. Our calculator does this in the "X is what % of Y?" mode.' },
      { q: 'How do I calculate a percentage of a number?', a: 'To calculate X% of Y, multiply Y by X divided by 100: Y × (X ÷ 100). For example, 20% of 250 = 250 × 0.20 = 50. Use the "What is X% of Y?" mode for this calculation.' },
      { q: 'How do I calculate percentage increase or decrease?', a: 'Percentage change is calculated as ((New Value − Old Value) ÷ Old Value) × 100. A positive result is an increase and a negative result is a decrease. For example, a change from 50 to 65 = ((65−50) ÷ 50) × 100 = 30% increase.' },
      { q: 'How do I calculate a discount percentage?', a: 'To find a discount, calculate the percentage of the original price, then subtract it. For a 25% discount on an $80 item: 25% of $80 = $20, so the sale price is $80 − $20 = $60. Use "What is X% of Y?" mode to find the discount amount.' },
      { q: 'What is the difference between percentage points and percent change?', a: 'Percentage points measure the absolute difference between two percentages, while percent change measures the relative difference. If an interest rate rises from 5% to 7%, that is a 2 percentage-point increase but a 40% relative increase ((7−5) ÷ 5 × 100).' },
    ],
  },

  'loan-calculator': {
    name: 'Loan Calculator',
    category: 'Finance',
    icon: 'fa-sack-dollar',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate monthly loan payments, total interest, and total cost for any personal or auto loan.',
    metaDescription: 'Free loan calculator — estimate monthly payments, total interest, and total repayment for auto, personal, or student loans.',
    fields: [
      { id: 'loan_amount', label: 'Loan Amount ($)',      type: 'number', default: 30000,  min: 1,      step: 100,   hint: 'The total amount you are borrowing (the principal).' },
      { id: 'interest_rate', label: 'Annual Interest Rate (%)', type: 'number', default: 6.5,   min: 0.01,   step: 0.05, max: 50, hint: 'The yearly interest rate (APR) charged on the loan.' },
      { id: 'loan_term',    label: 'Loan Term (years)',    type: 'select', default: 5,
        options: [1,2,3,4,5,6,7,10].map(v => ({ value: v, label: `${v} year${v > 1 ? 's' : ''}` })), hint: 'How many years you will take to repay the loan in full.' },
    ],
    calculate(v) {
      const principal = safeNum(v.loan_amount, 0);
      if (principal <= 0) return errorResult('Loan amount must be greater than zero.');
      const annualRate = safeNum(v.interest_rate, 0);
      const r = annualRate / 100 / 12;
      const n = Math.round(safeNum(v.loan_term, 5)) * 12;

      const payment = r === 0
        ? principal / n
        : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      const monthlyPayment = roundTo(payment, 2);
      const totalPaid = roundTo(monthlyPayment * n, 2);
      const totalInterest = roundTo(totalPaid - principal, 2);

      const schedule = buildAmortization(principal, r, n, monthlyPayment);
      return {
        stats: [
          { label: 'Monthly Payment',   value: fmt(monthlyPayment), highlight: true },
          { label: 'Total Interest',    value: fmt(totalInterest),  warn: true       },
          { label: 'Total Paid',        value: fmt(totalPaid)                         },
          { label: 'Loan Amount',       value: fmt(principal)                         },
        ],
        chart: { principal, totalInterest },
        table: schedule,
      };
    },

    article: {
      heading: 'How to Calculate Loan Payments and Total Interest',
      intro: 'Whether it is a car, personal, or student loan, knowing your monthly payment and total cost before you borrow is essential. The GetCalcu Loan Calculator uses the standard amortization formula to show your monthly payment, total interest, and full repayment schedule.',
      sections: [
        { heading: 'How Loan Amortization Works', body: 'Most loans are amortized — each fixed monthly payment covers the interest accrued that month plus a portion of principal. Early payments are mostly interest; later payments are mostly principal. By the final payment, the balance reaches zero.' },
        { heading: 'Why the Interest Rate Matters So Much', body: 'Even a 1% rate difference dramatically changes total cost. On a $30,000 5-year loan, 5% APR costs about $3,968 in interest while 7% costs about $5,640 — a $1,672 difference for the same loan. Always compare offers.' },
      ],
    },
    howTo: [
      'Enter the loan amount (the total you are borrowing).',
      'Add the annual interest rate (APR) quoted by your lender.',
      'Choose the loan term in years.',
      'Review your monthly payment, total interest, and total cost.',
      'Check the amortization schedule to see how each payment splits.',
    ],
    examples: [
      { title: 'Auto Loan', input: 'Amount: $30,000, Rate: 6.5%, Term: 5 years', result: 'Monthly: ~$587 | Total Interest: ~$5,211' },
      { title: 'Personal Loan', input: 'Amount: $15,000, Rate: 9%, Term: 3 years', result: 'Monthly: ~$477 | Total Interest: ~$2,180' },
    ],
    formula: 'M = P × [r(1+r)^n] / [(1+r)^n − 1] | Total Interest = (M × n) − P | Total Cost = M × n',
    faqs: [
      { q: 'How is a loan payment calculated?', a: 'A fixed loan payment is calculated with the amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1], where P is the principal, r is the monthly interest rate (APR ÷ 12), and n is the number of monthly payments (term in years × 12). This keeps every payment equal while paying off the loan completely.' },
      { q: 'What is APR versus interest rate?', a: 'The interest rate is the cost of borrowing the principal, while APR (Annual Percentage Rate) includes the interest rate plus fees and other loan costs, giving the true yearly cost. APR is the better figure for comparing loans because it reflects what you actually pay.' },
      { q: 'How does the loan term affect my payment?', a: 'A longer term lowers your monthly payment but increases total interest because the principal is repaid more slowly and interest accrues over more months. A shorter term raises the monthly payment but saves significantly on total interest. Use our calculator to compare terms.' },
      { q: 'How much interest will I pay on a loan?', a: 'Total interest equals (monthly payment × number of payments) − principal. For a $20,000 loan at 6% APR over 4 years, the monthly payment is about $469 and total interest is about $2,544. Our calculator shows this automatically along with a payment-by-payment schedule.' },
      { q: 'Can I pay off my loan early to save interest?', a: 'Yes. Because interest is calculated on the remaining balance, making extra payments or paying off the loan early reduces the principal faster and cuts total interest. Check your loan agreement for prepayment penalties first — many loans allow early repayment with no fee.' },
    ],
  },

  'date-calculator': {
    name: 'Date Calculator',
    category: 'Math',
    icon: 'fa-calendar',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    description: 'Calculate the number of days between two dates, or add/subtract days, weeks, months, or years from a date.',
    metaDescription: 'Free date calculator — find days between dates, or add/subtract days, weeks, months and years from any date.',
    fields: [
      { id: 'mode',    type: 'select', default: 'between',
        options: [
          { value: 'between', label: 'Days between dates' },
          { value: 'add',     label: 'Add/subtract from date' },
        ], hint: 'Choose whether to count days between two dates or add/subtract time from a date.' },
      { id: 'start_date',   label: 'Start Date', type: 'date', default: () => new Date().toISOString().split('T')[0], hint: 'The starting date for your calculation.' },
      { id: 'end_date',     label: 'End Date',   type: 'date', default: () => {
        const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0];
      }, hint: 'The ending date, used when counting days between two dates.' },
      { id: 'add_days',     label: 'Days',       type: 'number', default: 0, min: -99999, max: 99999, step: 1, hint: 'Days to add (positive) or subtract (negative).',
        condition: v => v.mode === 'add' },
      { id: 'add_months',   label: 'Months',     type: 'number', default: 0, min: -99999, max: 99999, step: 1, hint: 'Months to add (positive) or subtract (negative).',
        condition: v => v.mode === 'add' },
      { id: 'add_years',    label: 'Years',      type: 'number', default: 0, min: -99999, max: 99999, step: 1, hint: 'Years to add (positive) or subtract (negative).',
        condition: v => v.mode === 'add' },
    ],
    fieldLabels(v) {
      if (v.mode === 'between') return { start_date: 'From', end_date: 'To' };
      if (v.mode === 'add') return { start_date: 'Reference Date' };
      return {};
    },
    calculate(v) {
      const startStr = safeStr(v.start_date);
      const endStr = safeStr(v.end_date);

      if (v.mode === 'between') {
        const startParts = startStr.split('-').map(Number);
        const endParts = endStr.split('-').map(Number);
        if (startParts.length !== 3 || endParts.length !== 3 ||
            isNaN(startParts[0]) || isNaN(endParts[0])) {
          return errorResult('Please enter valid dates.');
        }
        const startUTC = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
        const endUTC   = Date.UTC(endParts[0], endParts[1] - 1, endParts[2]);
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.round((endUTC - startUTC) / msPerDay);
        const absDays = Math.abs(diffDays);
        const years = Math.floor(absDays / 365);
        const rem = absDays % 365;
        const months = Math.floor(rem / 30);
        const days = rem % 30;

        let dur = '';
        if (years > 0) dur += `${years} yr${years > 1 ? 's' : ''} `;
        if (months > 0) dur += `${months} mo${months > 1 ? 's' : ''} `;
        if (days > 0 || (years === 0 && months === 0)) dur += `${days} day${days !== 1 ? 's' : ''}`;
        dur = dur.trim() || 'same day';

        return {
          stats: [
            { label: 'Days Between', value: `${fmtN(absDays)} (${dur})`, highlight: true },
            { label: 'Start Date',   value: startStr },
            { label: 'End Date',     value: endStr },
          ],
        };
      }

      // Add/subtract mode
      const refDate = new Date(startStr + 'T12:00:00');
      if (isNaN(refDate.getTime())) {
        return errorResult('Please enter a valid reference date.');
      }

      const dd = safeNum(v.add_days, 0);
      const dm = safeNum(v.add_months, 0);
      const dy = safeNum(v.add_years, 0);

      let resultDate = new Date(refDate.getTime());
      const refDay = refDate.getDate();

      if (dy !== 0) {
        resultDate.setFullYear(resultDate.getFullYear() + dy);
        if (resultDate.getDate() !== refDay) resultDate.setDate(0);
      }
      if (dm !== 0) {
        resultDate.setMonth(resultDate.getMonth() + dm);
        if (resultDate.getDate() !== refDay) resultDate.setDate(0);
      }
      if (dd !== 0) {
        resultDate.setDate(resultDate.getDate() + dd);
      }

      const fmt1 = resultDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });

      return {
        stats: [
          { label: 'Result Date', value: fmt1, highlight: true },
          { label: 'Reference',   value: refDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
        ],
      };
    },

    article: {
      heading: 'How to Calculate Days Between Dates and Add or Subtract Time',
      intro: 'From project deadlines to pregnancy due dates and contract terms, calculating time spans accurately matters. The GetCalcu Date Calculator counts the days between two dates or adds and subtracts days, months, and years from any starting date — accounting for real calendar rules.',
      sections: [
        { heading: 'Counting Days Between Two Dates', body: 'The calculator finds the absolute difference between the start and end dates, counting full days. It correctly handles months of different lengths and leap years, so February 28 to March 1 is always 1 day (or 2 in a non-leap year bridge).' },
        { heading: 'Adding and Subtracting Calendar Units', body: 'When adding months or years, the calculator follows calendar arithmetic — adding 1 month to January 31 gives February 28 (or 29 in a leap year), not March 3. This matches how contracts and due dates are typically calculated.' },
      ],
    },
    howTo: [
      'Choose a mode: "Days between dates" or "Add/subtract from date".',
      'For days between: pick a start date and an end date.',
      'For add/subtract: enter a start date, then the days, months, and years to add or subtract (use negative numbers to subtract).',
      'Read the result — total days, weeks, months, and the resulting date.',
      'Adjust the inputs to explore different scenarios.',
    ],
    examples: [
      { title: 'Project Duration', input: 'Mode: Days between | Start: 2025-01-15, End: 2025-04-20', result: '95 days (~13.6 weeks)' },
      { title: '90-Day Deadline', input: 'Mode: Add | Start: 2025-03-01, Add 90 days', result: 'Due date: 2025-05-30' },
    ],
    formula: 'Days Between = |End Date − Start Date| | Result Date = Start Date + Days + Months + Years (calendar arithmetic)',
    faqs: [
      { q: 'How do I calculate the number of days between two dates?', a: 'To calculate days between two dates, subtract the earlier date from the later date. The result is the number of full days between them. Our calculator does this instantly and also converts the span into weeks and months for context.' },
      { q: 'How many days are in a month on average?', a: 'Averaged over a 4-year leap cycle, a month is 30.4375 days (365.25 ÷ 12). For quick estimates, 30 days per month is common, but exact day counts depend on the specific months involved. Our calculator uses exact calendar dates for precision.' },
      { q: 'Does the date calculator account for leap years?', a: 'Yes. The calculator uses real calendar arithmetic, so it correctly includes February 29 in leap years. For example, the days between February 28, 2024 and March 1, 2024 is 2 days because 2024 is a leap year.' },
      { q: 'How do I add months to a date that does not exist?', a: 'When adding months lands on a date that does not exist (like January 31 + 1 month = February 31), calendar arithmetic rolls back to the last valid day of the target month — February 28 or 29. Our calculator follows this standard convention.' },
      { q: 'How do I count business days instead of calendar days?', a: 'This calculator counts all calendar days. To count only business days (Monday–Friday), exclude weekends manually, or subtract 2 days for every full 7-day week in the span. A dedicated business-day calculator that excludes holidays is best for precise working-day counts.' },
    ],
  },

  'loan-interest-calculator': {
    name: 'Loan Interest Calculator',
    category: 'Finance',
    icon: 'fa-percent',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate total interest paid on any loan with detailed amortization by payment frequency.',
    metaDescription: 'Free loan interest calculator — see total interest, monthly payments, and full amortization with flexible payment frequencies.',
    fields: [
      { id: 'loan_amount',   label: 'Loan Amount ($)',        type: 'number', default: 25000,  min: 1,      step: 100,    hint: 'The total amount you are borrowing (the principal).' },
      { id: 'interest_rate', label: 'Annual Interest Rate (%)', type: 'number', default: 5.0,   min: 0.01,   step: 0.05, max: 50, hint: 'The yearly interest rate (APR) charged on the loan.' },
      { id: 'loan_term',     label: 'Loan Term (years)',       type: 'number', default: 5,     min: 1,      max: 50,    step: 1, hint: 'How many years you will take to repay the loan.' },
      { id: 'payment_freq',  label: 'Payment Frequency',       type: 'select', default: 'monthly',
        options: [
          { value: 'monthly',  label: 'Monthly (12/yr)' },
          { value: 'biweekly', label: 'Bi-Weekly (26/yr)' },
          { value: 'weekly',   label: 'Weekly (52/yr)' },
          { value: 'quarterly',label: 'Quarterly (4/yr)' },
        ], hint: 'How often you make payments. More frequent payments slightly reduce total interest paid.' },
    ],
    calculate(v) {
      const principal = safeNum(v.loan_amount, 0);
      if (principal <= 0) return errorResult('Loan amount must be greater than zero.');
      const annualRate = safeNum(v.interest_rate, 0);
      const ppy = { monthly: 12, biweekly: 26, weekly: 52, quarterly: 4 }[v.payment_freq] || 12;
      const r = annualRate / 100 / ppy;
      const n = Math.round(safeNum(v.loan_term, 5)) * ppy;

      const payment = r === 0
        ? principal / n
        : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      const periodPayment = roundTo(payment, 2);
      const totalPaid = roundTo(periodPayment * n, 2);
      const totalInterest = roundTo(totalPaid - principal, 2);

      const schedule = buildAmortization(principal, r, n, periodPayment);
      return {
        stats: [
          { label: `Payment (${v.payment_freq})`, value: fmt(periodPayment), highlight: true },
          { label: 'Total Payments',              value: fmtN(n) },
          { label: 'Total Interest',              value: fmt(totalInterest), warn: true },
          { label: 'Total Paid',                  value: fmt(totalPaid) },
          { label: 'Loan Amount',                 value: fmt(principal) },
        ],
        chart: { principal, totalInterest },
        table: schedule,
      };
    },

    article: {
      heading: 'How to Calculate Total Interest Paid on a Loan',
      intro: 'Understanding the true cost of borrowing means looking beyond the monthly payment. The GetCalcu Loan Interest Calculator reveals the total interest you will pay and how your payment frequency — monthly, biweekly, weekly, or quarterly — changes that cost over the life of the loan.',
      sections: [
        { heading: 'How Payment Frequency Reduces Interest', body: 'Making payments more frequently than monthly reduces total interest because principal is paid down sooner, so less interest accrues. Biweekly payments (26 per year) effectively add one extra monthly payment per year, shortening the loan and saving interest.' },
        { heading: 'Reading the Amortization Schedule', body: 'The schedule shows every payment split into principal and interest. Watching the interest portion shrink over time reveals how accelerated payments front-load principal reduction and compound your interest savings.' },
      ],
    },
    howTo: [
      'Enter the loan amount and annual interest rate (APR).',
      'Set the loan term in years.',
      'Choose how often you make payments — monthly, biweekly, weekly, or quarterly.',
      'Review the total interest, payment amount, and full amortization schedule.',
      'Switch payment frequency to see how much interest you can save.',
    ],
    examples: [
      { title: 'Monthly Payments', input: 'Amount: $25,000, Rate: 5%, Term: 5 years, Monthly', result: 'Payment: ~$472 | Total Interest: ~$3,307' },
      { title: 'Biweekly Saves Interest', input: 'Amount: $25,000, Rate: 5%, Term: 5 years, Biweekly', result: 'Payment: ~$236 | Total Interest: ~$3,064 (saves ~$243)' },
    ],
    formula: 'Payment = P × [r(1+r)^n] / [(1+r)^n − 1] | Total Interest = (Payment × n) − P | r = APR ÷ payments per year, n = total payments',
    faqs: [
      { q: 'How is total interest on a loan calculated?', a: 'Total interest equals (regular payment × total number of payments) − loan principal. For a $25,000 loan at 5% APR over 5 years with monthly payments, each payment is about $472, total payments are $28,307, so total interest is about $3,307. Our calculator computes this for any payment frequency.' },
      { q: 'Does paying biweekly instead of monthly save interest?', a: 'Yes. Biweekly payments mean 26 half-payments per year — equivalent to 13 monthly payments instead of 12. The extra payment and more frequent principal reduction lower total interest and shorten the loan. On a 5-year loan the savings can be a few hundred dollars; on a 30-year mortgage it can be tens of thousands.' },
      { q: 'What payment frequency saves the most interest?', a: 'More frequent payments save more interest because principal is reduced sooner. Weekly payments save slightly more than biweekly, which saves more than monthly. However, the biggest factor is the extra payment effect — biweekly and weekly effectively add payments per year, which matters more than the small compounding gain.' },
      { q: 'How does the interest rate affect total interest paid?', a: 'Interest is charged on the outstanding balance, so a higher rate raises every payment and total cost sharply. On a $25,000 5-year loan, 5% APR costs about $3,307 in interest while 8% costs about $5,415 — a $2,108 difference. Shopping for a lower rate is one of the most effective ways to cut borrowing costs.' },
      { q: 'What is an amortization schedule and why does it matter?', a: 'An amortization schedule lists each payment and shows how much goes to interest versus principal. Early payments are interest-heavy; later ones are principal-heavy. It helps you see exactly when equity builds and how extra payments reduce future interest. Our calculator generates the full schedule automatically.' },
    ],
  },

  // ── Compound Interest Calculator ─────────────────────────────────────
  'compound-interest-calculator': {
    presets: [
          {
                "label": "Index Fund ($500/mo @ 8%)",
                "values": {
                      "initial_deposit": 10000,
                      "monthly_contribution": 500,
                      "annual_rate": 8,
                      "investment_term": 20,
                      "compound_frequency": 12
                }
          },
          {
                "label": "Aggressive ($1,000/mo @ 10%)",
                "values": {
                      "initial_deposit": 25000,
                      "monthly_contribution": 1000,
                      "annual_rate": 10,
                      "investment_term": 25,
                      "compound_frequency": 12
                }
          },
          {
                "label": "Conservative HYSA (4.5%)",
                "values": {
                      "initial_deposit": 5000,
                      "monthly_contribution": 250,
                      "annual_rate": 4.5,
                      "investment_term": 10,
                      "compound_frequency": 12
                }
          }
    ],
    name: 'Compound Interest Calculator',
    category: 'Finance',
    icon: 'fa-chart-line',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Project how your savings and investments grow over time with compound interest and recurring monthly contributions.',
    metaDescription: 'Free compound interest calculator — see how your money grows with compounding and monthly contributions. Get year-by-year projections, total interest earned, and charts.',
    fields: [
      { id: 'principal',         label: 'Starting Balance ($)',          type: 'number', default: 10000, min: 0,      step: 100,    hint: 'Your initial lump-sum deposit or current investment balance.' },
      { id: 'annual_rate',       label: 'Annual Interest Rate (%)',       type: 'number', default: 8.0,   min: 0.01,   step: 0.1,   hint: 'Expected average yearly growth rate. A diversified stock portfolio has historically returned about 7-10% long-term.' },
      { id: 'compounding_freq',  label: 'Compounding Frequency',         type: 'select', default: 'monthly',
        options: [
          { value: 'annually',       label: 'Annually (1/yr)' },
          { value: 'semi-annually',  label: 'Semi-annually (2/yr)' },
          { value: 'quarterly',      label: 'Quarterly (4/yr)' },
          { value: 'monthly',        label: 'Monthly (12/yr)' },
          { value: 'daily',          label: 'Daily (365/yr)' },
        ], hint: 'How often interest is added to your balance. More frequent compounding grows your money slightly faster. <a href="#faqs">See how compounding frequency affects growth ↓</a>'
      },
      { id: 'monthly_contribution', label: 'Monthly Contribution ($)',   type: 'number', default: 500,   min: 0,      step: 50,    hint: 'Amount you add each month on top of your starting balance.' },
      { id: 'time_years',          label: 'Time Horizon (years)',        type: 'number', default: 30,    min: 1,      max: 100,   step: 1, hint: 'How long your money stays invested. Longer horizons dramatically boost compound growth.' },
    ],
    calculate(v) {
      // FV = PV * (1 + r)^n + PMT * ((1 + r)^n - 1) / r
      // Assumes end-of-period contributions
      const principal = safeNum(v.principal, 0);
      const annualRate = safeNum(v.annual_rate, 0) / 100;
      const years = Math.round(safeNum(v.time_years, 30));
      const contribution = safeNum(v.monthly_contribution, 0);

      const ppy = { annually: 1, 'semi-annually': 2, quarterly: 4, monthly: 12, daily: 365 }[v.compounding_freq] || 12;
      const n = years * ppy;
      const periodicRate = annualRate / ppy;
      const contribPerPeriod = roundTo(contribution * (12 / ppy), 2);

      let futureValue;
      if (periodicRate === 0) {
        futureValue = principal + contribPerPeriod * n;
      } else {
        const growthFactor = Math.pow(1 + periodicRate, n);
        futureValue = principal * growthFactor + contribPerPeriod * (growthFactor - 1) / periodicRate;
      }

      futureValue = roundTo(futureValue, 2);
      const totalContributions = roundTo(principal + contribution * 12 * years, 2);
      const totalInterest = roundTo(futureValue - totalContributions, 2);

      // Year-by-year schedule
      const schedule = [];
      for (let y = 1; y <= years; y++) {
        const periods = y * ppy;
        let yearValue;
        if (periodicRate === 0) {
          yearValue = principal + contribPerPeriod * periods;
        } else {
          const gf = Math.pow(1 + periodicRate, periods);
          yearValue = principal * gf + contribPerPeriod * (gf - 1) / periodicRate;
        }
        yearValue = roundTo(yearValue, 2);
        const yrContrib = roundTo(principal + contribution * 12 * y, 2);
        schedule.push({
          month: y,
          payment: roundTo(contribution * 12, 2),
          principal: roundTo(yrContrib, 2),
          interest: roundTo(yearValue - yrContrib, 2),
          balance: yearValue,
        });
      }

      // Format chart data as simple numbers (not formatted strings)
      const chartPrincipal = totalContributions;
      const chartInterest = totalInterest;

      return {
        stats: [
          { label: 'Future Balance',       value: fmt(futureValue),        highlight: true },
          { label: 'Total Contributions',   value: fmt(totalContributions)                 },
          { label: 'Total Interest Earned', value: fmt(totalInterest)                       },
        ],
        chart: { principal: chartPrincipal, totalInterest: chartInterest },
        table: schedule,
      };
    },

    article: {
      heading: 'How to Calculate Compound Interest and Project Your Savings Growth',
      intro: 'Compound interest is the engine behind long-term wealth — it earns interest on your interest, accelerating growth over time. The GetCalcu Compound Interest Calculator projects your future balance from a starting sum plus recurring contributions, with flexible compounding frequency and a year-by-year growth schedule.',
      sections: [
        { heading: 'Why Compounding Frequency Matters', body: 'The more often interest is reinvested, the faster your balance grows. Daily compounding earns slightly more than monthly, which earns more than annual — the difference compounds over decades. For long horizons, even small frequency gains add up.' },
        { heading: 'The Power of Starting Early', body: 'Time is the most powerful variable in compound interest. Starting 10 years earlier can more than double your final balance, even with smaller contributions — because early gains have more time to compound on themselves.' },
      ],
    },
    howTo: [
      'Enter your starting balance (a lump sum or current savings).',
      'Add the annual interest or growth rate you expect.',
      'Choose how often interest compounds — monthly is common for savings.',
      'Enter your monthly contribution and the number of years.',
      'Review the future balance, total interest earned, and year-by-year schedule.',
    ],
    examples: [
      { title: 'Lump Sum Over 30 Years', input: 'Principal: $10,000, Rate: 8%, Monthly compounding, 30 years', result: 'Future Balance: ~$100,627 | Interest: ~$90,627' },
      { title: 'With Monthly Contributions', input: 'Principal: $10,000, Rate: 8%, $500/mo, 30 years', result: 'Future Balance: ~$811,627 | Interest: ~$621,627' },
    ],
    formula: 'FV = P × (1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) − 1) / (r/n)] | Total Interest = FV − P − (PMT × t)',
    faqs: [
      { q: 'How is compound interest calculated?', a: 'Compound interest is calculated as FV = P × (1 + r/n)^(nt), where P is the principal, r is the annual rate, n is the compounding periods per year, and t is years. With recurring contributions, add PMT × [((1 + r/n)^(nt) − 1) / (r/n)]. Our calculator handles both parts automatically.' },
      { q: 'What is the difference between simple and compound interest?', a: 'Simple interest is calculated only on the original principal, while compound interest is calculated on the principal plus accumulated interest. Over time, compounding grows exponentially while simple interest grows linearly — a $10,000 sum at 8% becomes $46,610 (simple) versus $100,627 (compounded monthly) over 30 years.' },
      { q: 'How does compounding frequency affect growth?', a: 'More frequent compounding reinvests interest sooner, so your balance grows faster. At 8% over 30 years, $10,000 grows to about $100,627 compounded monthly versus $93,219 compounded semi-annually. The gap widens with larger sums and longer horizons.' },
      { q: 'How much will I have if I save $500 a month for 30 years?', a: 'Saving $500 per month at an 8% average return compounded monthly for 30 years grows to about $745,000 from contributions alone, plus growth on any starting balance. With a $10,000 starting balance, the total reaches about $811,627. Use our calculator to test your own numbers.' },
      { q: 'What is a good interest rate to assume for compound interest?', a: 'For a diversified stock portfolio, a realistic long-term assumption is 7–10% (the historical S&P 500 average). For savings accounts expect 3–5%, and for bonds 4–6%. Always use a conservative rate for planning so you are not caught short — our calculator lets you adjust instantly.' },
    ],
  },

  // ── Investment Calculator ─────────────────────────────────────
  'investment-calculator': {
    name: 'Investment Calculator',
    category: 'Finance',
    icon: 'fa-chart-line',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Project your investment growth with compound returns and recurring monthly contributions. See how long to reach $100k, $500k, or $1M.',
    metaDescription: 'Free investment calculator — project future value with compound returns and monthly contributions. See how long to save $100k, when you can retire early, and how much to invest each month to reach $1M.',
    fields: [
      { id: 'initial_investment',    label: 'Initial Investment ($)',       type: 'number', default: 10000, min: 0,      step: 1000,  hint: 'Your starting lump-sum amount invested today.' },
      { id: 'monthly_contribution',  label: 'Monthly Contribution ($)',     type: 'number', default: 500,   min: 0,      step: 50,    hint: 'How much you add to your investment each month.' },
      { id: 'annual_return',         label: 'Expected Annual Return (%)',   type: 'number', default: 8.0,   min: 0.01,   step: 0.1,  max: 100, hint: 'Expected average yearly return. S&P 500 long-term average: about 7-10%. <a href="#faqs">See safe return rates ↓</a>' },
      { id: 'investment_period',     label: 'Investment Period (years)',    type: 'number', default: 20,    min: 1,      max: 100,   step: 1, hint: 'How many years you plan to keep your money invested.' },
      { id: 'compound_freq',         label: 'Compounding Frequency',        type: 'select', default: 'monthly',
        options: [
          { value: 'annually',       label: 'Annually (1/yr)' },
          { value: 'semi-annually',  label: 'Semi-annually (2/yr)' },
          { value: 'quarterly',      label: 'Quarterly (4/yr)' },
          { value: 'monthly',        label: 'Monthly (12/yr)' },
          { value: 'daily',          label: 'Daily (365/yr)' },
        ], hint: 'How often returns are reinvested. <a href="#faqs">See how compounding frequency affects growth ↓</a>' },
      { id: 'goal_amount',           label: 'Savings Goal ($) (optional)',  type: 'number', default: 1000000, min: 0, step: 10000, hint: 'A target balance you want to reach (e.g. $1M). Optional — used to estimate how long it will take.' },
    ],
    calculate(v) {
      const principal = safeNum(v.initial_investment, 0);
      const annualRate = safeNum(v.annual_return, 0) / 100;
      const years = Math.round(safeNum(v.investment_period, 20));
      const monthlyContrib = safeNum(v.monthly_contribution, 0);
      const goal = safeNum(v.goal_amount, 0);
      const ppy = { annually: 1, 'semi-annually': 2, quarterly: 4, monthly: 12, daily: 365 }[v.compound_freq] || 12;
      const n = years * ppy;
      const periodicRate = annualRate / ppy;
      const contribPerPeriod = roundTo(monthlyContrib * (12 / ppy), 2);
      let futureValue;
      if (periodicRate === 0) {
        futureValue = principal + contribPerPeriod * n;
      } else {
        const growthFactor = Math.pow(1 + periodicRate, n);
        futureValue = principal * growthFactor + contribPerPeriod * (growthFactor - 1) / periodicRate;
      }
      futureValue = roundTo(futureValue, 2);
      const totalContributions = roundTo(principal + monthlyContrib * 12 * years, 2);
      const totalReturn = roundTo(futureValue - totalContributions, 2);
      const totalReturnPct = totalContributions > 0 ? roundTo((totalReturn / totalContributions) * 100, 2) : 0;
      let monthsToGoal = null, goalReached = false;
      if (goal > 0) {
        const monthlyRate = annualRate / 12;
        let runningBalance = principal, monthCount = 0;
        const maxMonths = 1200;
        while (runningBalance < goal && monthCount < maxMonths) {
          monthCount++;
          runningBalance *= (1 + monthlyRate);
          runningBalance += monthlyContrib;
          runningBalance = roundTo(runningBalance, 2);
        }
        if (runningBalance >= goal) { monthsToGoal = monthCount; goalReached = true; }
      }
      const schedule = [];
      for (let y = 1; y <= years; y++) {
        const periods = y * ppy;
        let yearValue;
        if (periodicRate === 0) {
          yearValue = principal + contribPerPeriod * periods;
        } else {
          const gf = Math.pow(1 + periodicRate, periods);
          yearValue = principal * gf + contribPerPeriod * (gf - 1) / periodicRate;
        }
        yearValue = roundTo(yearValue, 2);
        const yrContrib = roundTo(principal + monthlyContrib * 12 * y, 2);
        schedule.push({ month: y, payment: roundTo(monthlyContrib * 12, 2), principal: roundTo(yrContrib, 2), interest: roundTo(yearValue - yrContrib, 2), balance: yearValue });
      }
      const stats = [
        { label: 'Future Balance',       value: fmt(futureValue),        highlight: true },
        { label: 'Total Contributions',   value: fmt(totalContributions)                 },
        { label: 'Total Return (Profit)', value: fmt(totalReturn),       warn: totalReturn <= 0 },
        { label: 'Total Return %',        value: totalReturnPct + '%'                     },
      ];
      if (goal > 0) {
        stats.push({
          label: goalReached ? `Time to Reach ${fmt(goal)}` : `Goal of ${fmt(goal)}`,
          value: goalReached ? `${Math.floor(monthsToGoal / 12)} yr ${monthsToGoal % 12} mo` : 'Not reached in ' + years + ' yrs',
          highlight: goalReached, warn: !goalReached,
        });
      }
      return { stats, chart: { principal: totalContributions, totalInterest: totalReturn }, table: schedule };
    },

    article: {
      heading: 'How to Calculate Investment Growth and Reach Your Financial Goals',
      intro: 'Investing turns time and consistency into wealth through compound returns. The GetCalcu Investment Calculator projects your portfolio\'s future value from an initial lump sum plus monthly contributions, shows how long it takes to hit goals like $100k or $1M, and helps you plan for milestones including early retirement.',
      sections: [
        { heading: 'How Compound Returns Build Wealth', body: 'Investment returns compound — each year\'s gains earn gains in future years. At an 8% average return, money roughly doubles every 9 years. The longer your money stays invested, the more dramatic the compounding, which is why starting early matters more than starting with a lot.' },
        { heading: 'Setting a Realistic Expected Return', body: 'The S&P 500 has averaged about 10% per year before inflation (7–8% after) over the long run. A diversified 60/40 portfolio averages 6–7%. For planning, use a conservative figure so surprises are on the upside, and remember that returns are not guaranteed every year.' },
      ],
    },
    howTo: [
      'Enter your initial investment (lump sum you\'re starting with).',
      'Set your monthly contribution — the amount you plan to add each month.',
      'Choose an expected annual return rate based on your investment strategy (S&P 500 historically ~8-10%, bonds ~3-5%).',
      'Pick your investment time horizon in years — the longer you invest, the more compounding works in your favor.',
      'Optionally enter a savings goal (e.g., $100,000, $500,000, or $1,000,000) to see exactly how long it will take to reach that milestone.',
      'Review the year-by-year schedule, total return, and interactive chart to understand your investment\'s growth trajectory.',
    ],
    formula: 'Future Value = Principal × (1 + r/n)^(nt) + Monthly Contribution × [((1 + r/12)^(12t) - 1) / (r/12)] | Total Return % = (Total Return / Total Contributions) × 100',
    examples: [
      {
        title: 'How long to save $100,000?',
        input: '$10,000 initial, $400/month, 7% return',
        result: 'Reach $100,000 in ~11 years 2 months',
      },
      {
        title: 'Retire early with $1 Million',
        input: '$20,000 initial, $1,000/month, 8% return',
        result: 'Reach $1,000,000 in ~24 years 5 months',
      },
      {
        title: 'Monthly investment to reach $500k',
        input: '$5,000 initial, 15 years, 9% return',
        result: 'Need ~$1,530/month to reach $500,000',
      },
    ],
    faqs: [
      {
        q: 'How long will it take to save $100,000 with my investments?',
        a: 'The time to reach $100,000 depends on your starting balance, monthly contribution, and annual return rate. With a $10,000 initial investment, $400 monthly contributions, and a 7% annual return, you would reach $100,000 in approximately 11 years and 2 months. Our investment calculator shows exactly how long it takes to reach any savings goal you set.',
      },
      {
        q: 'How much do I need to invest monthly to reach $1,000,000?',
        a: 'To reach $1,000,000 in 25 years with an 8% annual return starting from $0, you would need to invest approximately $1,050 per month. With a $25,000 initial investment, that drops to about $770 per month. The required monthly contribution decreases significantly the earlier you start and the higher your expected return rate.',
      },
      {
        q: 'Can I use the investment calculator to see when I can retire early?',
        a: 'Yes! Enter your current retirement savings as the initial investment, add your monthly retirement contributions, set a conservative expected return (7-8% for stock-heavy portfolios), and enter your retirement savings goal as the target amount. The calculator will show you the exact year you\'ll reach financial independence and how much your nest egg will grow over time.',
      },
      {
        q: 'What is the difference between simple and compound investment returns?',
        a: 'Simple returns earn interest only on your original principal. Compound returns (compound interest) earn returns on both your principal AND the accumulated returns from prior periods. Over a 20-year horizon with $10,000 at 8%, simple interest yields $26,000, while compounding annually yields $46,610 — a 79% higher ending balance.',
      },
      {
        q: 'What is a safe annual return rate to use for long-term investing?',
        a: 'For long-term stock market investments (15+ years), historical S&P 500 returns average 7-10% annually before inflation. A conservative estimate of 6-7% is wise for planning. For bond-heavy portfolios, use 3-5%. For balanced portfolios (60/40 stocks/bonds), 5-7% is a reasonable planning range. Always use a rate you\'re comfortable with and consider inflation (typically 2-3% annually).',
      },
      {
        q: 'How does compounding frequency affect my investment returns?',
        a: 'More frequent compounding generates slightly higher returns because interest is calculated on a growing balance more often. For example, $10,000 at 8% over 30 years grows to $100,627 with annual compounding, $107,432 with quarterly compounding, $108,383 with monthly compounding, and $108,856 with daily compounding. The difference between monthly and daily compounding is marginal for most investors.',
      },
      {
        q: 'What is the 4% rule for retirement planning?',
        a: 'The 4% rule is a retirement planning guideline suggesting you can withdraw 4% of your retirement portfolio in the first year of retirement (adjusting for inflation annually) with a low probability of running out of money over a 30-year retirement. For example, if your portfolio is $1,000,000, you could withdraw $40,000 in your first year. Use our investment calculator to determine if your savings goal supports your desired retirement lifestyle.',
      },
    ],
  },

  // ── Budget Planner & Expense Tracker ──────────────────────────
  'budget-planner': {
    name: 'Budget Planner & Expense Tracker',
    category: 'Finance',
    icon: 'fa-wallet',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Plan your monthly budget, track expenses by category, and get personalized spending insights with the 50/30/20 rule.',
    metaDescription: 'Free budget planner and expense tracker — manage monthly income, categorize spending, track savings rate, and get 50/30/20 budget recommendations.',
    fields: [],
    calculate() { return {}; },
    customRenderer: (container) => { if (window.renderBudgetPlannerModule) window.renderBudgetPlannerModule(container); },
    article: {
      heading: 'How to Build a Monthly Budget and Track Your Spending',
      intro: 'A budget is the foundation of financial control. The GetCalcu Budget Planner lets you log income sources, categorize expenses, visualize your spending, and get instant feedback with the 50/30/20 rule — all saved privately in your browser.',
      sections: [
        { heading: 'The 50/30/20 Rule Explained', body: 'This popular framework splits after-tax income into 50% needs (housing, food, utilities, transport), 30% wants (dining, entertainment, hobbies), and 20% savings and debt repayment. It is a flexible target to aim for, not a strict rule.' },
        { heading: 'Why Your Savings Rate Matters', body: 'Your savings rate — the percentage of income left after expenses — is the single best predictor of financial progress. A 20% rate puts you ahead of most households; pushing toward 30% or more accelerates debt payoff, investing, and financial independence.' },
      ],
    },
    howTo: [
      'Add your monthly income sources (salary, freelance, investments, etc.).',
      'Enter your expenses by category — use the default categories or create your own.',
      'View your spending breakdown with interactive charts and progress bars.',
      'Check your Budget Status and 50/30/20 rule recommendations.',
      'Export your budget as PDF or share the summary with others.',
    ],
    formula: 'Budget Status = Total Income – Total Expenses | Savings Rate = (Remaining / Income) × 100 | 50/30/20 Rule: Needs ≤ 50%, Wants ≤ 30%, Savings ≥ 20%',
    examples: [
      { title: 'Healthy 50/30/20 Budget', input: 'Income: $5,000 | Needs: $2,500 | Wants: $1,500 | Savings: $1,000', result: 'Savings Rate: 20% — On Track' },
      { title: 'Needs-Heavy Budget', input: 'Income: $5,000 | Needs: $3,500 | Wants: $1,000 | Savings: $500', result: 'Savings Rate: 10% — Boost Savings' },
    ],
    faqs: [
      { q: 'What is the 50/30/20 budgeting rule?', a: 'The 50/30/20 rule splits your after-tax income into three categories: 50% for needs (housing, food, utilities, healthcare, transport), 30% for wants (entertainment, dining, shopping, hobbies), and 20% for savings and debt repayment. It provides a simple framework for balanced spending.' },
      { q: 'How is the savings rate calculated?', a: 'Your savings rate is calculated as: (Remaining Balance / Total Income) × 100. This shows what percentage of your income you are saving after all expenses.' },
      { q: 'Can I add custom expense categories?', a: 'Yes! Click the "+ Add Category" button to create unlimited custom categories. You can remove them anytime with the delete button.' },
      { q: 'Does my data get saved?', a: 'Your budget data is saved automatically in your browser\'s local storage. It stays on your device and is never sent to our servers.' },
      { q: 'Can I export my budget?', a: 'Yes, you can download a PDF summary of your budget, print the page, or share the summary using your device\'s share menu.' },
    ],
  },

  // ── Retirement Calculator ─────────────────────────────────────
  'retirement-calculator': {
    id: 'retirement-calculator',
    name: 'Retirement Calculator',
    category: 'Finance',
    icon: 'fa-umbrella',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Determine how much money you need to retire comfortably, estimate your future nest egg balance, and calculate required monthly savings based on inflation and life expectancy.',
    metaTitle: 'Retirement Calculator for Early Career Professionals | Free Template - GetCalcu',
    metaDescription: 'Free online Retirement Savings Calculator for early career professionals. Estimate your target retirement nest egg, monthly savings requirements, compound returns, and inflation impact. Start planning at 25.',
    keywords: [
      'retirement calculator',
      'retirement savings calculator',
      'how much do I need to retire',
      '401k retirement planning',
      'compound interest calculator for young professionals',
      'early career retirement calculator',
      'retirement nest egg estimator',
      'how to calculate retirement if you start at 25',
      'retirement planner',
    ],
    fields: [
      { id: 'current_age',         label: 'Your Current Age',                    type: 'number', default: 25,   min: 18,    max: 70,  step: 1, hint: 'Your age today. The calculator uses this to find how many years you have until retirement.' },
      { id: 'current_savings',     label: 'Current Retirement Savings ($)',      type: 'number', default: 0,    min: 0,     step: 1000, hint: 'Total across all retirement accounts: 401k, IRA, Roth IRA, and brokerage investments.' },
      { id: 'annual_income',       label: 'Annual Income ($)',                   type: 'number', default: 55000, min: 10000, step: 5000, hint: 'Your current yearly pre-tax income. Used to estimate your retirement income target.' },
      { id: 'monthly_contribution',label: 'Monthly Contribution ($)',            type: 'number', default: 500,   min: 0,     step: 50, hint: 'What you save each month toward retirement (401k, IRA, brokerage). Even small amounts compound over decades.' },
      { id: 'annual_return',       label: 'Expected Annual Return (%)',          type: 'number', default: 7.0,   min: 0.1,   step: 0.1, max: 30, hint: 'Expected average yearly investment growth. S&P 500 long-term average: about 7-8% after inflation. <a href="#faqs">See realistic return rates ↓</a>' },
      { id: 'inflation_rate',      label: 'Expected Inflation Rate (%)',         type: 'number', default: 3.0,   min: 0,     step: 0.1, max: 20, hint: 'The annual rate at which prices rise, eroding purchasing power. US historical average: 2.5-3%. <a href="#faqs">See how inflation affects savings ↓</a>' },
      { id: 'retirement_age',      label: 'Desired Retirement Age',              type: 'number', default: 65,   min: 30,    max: 80,  step: 1, hint: 'The age you plan to stop working and start drawing on your nest egg.' },
      { id: 'life_expectancy',     label: 'Life Expectancy (years)',             type: 'number', default: 95,   min: 50,    max: 120, step: 1, hint: 'How long you expect to live in retirement. Plan for 90-95 to be safe.' },
      { id: 'income_replacement',  label: 'Desired Retirement Income (% of current)', type: 'number', default: 80, min: 10, max: 100, step: 5, hint: 'Share of pre-retirement income you will need in retirement. Advisors suggest 70-80%.' },
    ],
    calculate(v) {
      // ── Extract & validate inputs
      const currentAge      = safeNum(v.current_age, 25);
      const currentSavings  = safeNum(v.current_savings, 0);
      const annualIncome    = safeNum(v.annual_income, 55000);
      const monthlyContrib  = safeNum(v.monthly_contribution, 500);
      const annualReturn    = safeNum(v.annual_return, 7) / 100;
      const inflationRate   = safeNum(v.inflation_rate, 3) / 100;
      const retirementAge   = safeNum(v.retirement_age, 65);
      const lifeExpectancy  = safeNum(v.life_expectancy, 95);
      const incomeReplace   = safeNum(v.income_replacement, 80) / 100;

      if (retirementAge <= currentAge) {
        return errorResult('Retirement age must be greater than your current age.');
      }
      if (lifeExpectancy <= retirementAge) {
        return errorResult('Life expectancy must be greater than retirement age.');
      }

      // ── Core time periods
      const yearsToRetire  = retirementAge - currentAge;
      const yearsInRetire  = lifeExpectancy - retirementAge;

      // ── Fisher equation: inflation-adjusted real return
      // r_real = (1 + r_nominal) / (1 + inflation) - 1
      const realReturn     = (1 + annualReturn) / (1 + inflationRate) - 1;
      const monthlyRealRet = realReturn / 12;
      const totalMonths    = yearsToRetire * 12;

      // ── Future Value of current savings
      // FV = PV x (1 + r_real)^years
      const fvCurrentSavings = currentSavings * Math.pow(1 + realReturn, yearsToRetire);

      // ── Future Value of monthly contributions
      // FV = PMT x [((1 + r_monthly)^n - 1) / r_monthly]
      let fvContributions;
      if (monthlyRealRet === 0) {
        fvContributions = monthlyContrib * totalMonths;
      } else {
        const growthFactor = Math.pow(1 + monthlyRealRet, totalMonths);
        fvContributions = monthlyContrib * (growthFactor - 1) / monthlyRealRet;
      }

      // ── Total projected nest egg
      const totalNestEgg     = roundTo(fvCurrentSavings + fvContributions, 2);
      const totalContribs    = roundTo(currentSavings + monthlyContrib * 12 * yearsToRetire, 2);
      const totalGrowth      = roundTo(totalNestEgg - totalContribs, 2);

      // ── Target retirement income (today's dollars)
      const desiredIncomeToday = annualIncome * incomeReplace;

      // ── 4% Rule: target nest egg (25x annual desired income) in TODAY'S dollars
      // totalNestEgg is projected using the real (inflation-adjusted) return via
      // the Fisher equation above, so the target must be expressed in the same
      // real-dollar basis. Previously the target was inflated to nominal future
      // dollars, producing an apples-to-oranges comparison (ISSUE-004).
      const targetNestEgg   = roundTo(desiredIncomeToday * 25, 2);

      // ── Monthly and annual retirement income (4% rule in TODAY's purchasing power)
      const monthlyRetireIncome = roundTo(totalNestEgg * 0.04 / 12, 2);
      const annualRetireIncome  = roundTo(totalNestEgg * 0.04, 2);

      // ── Nominal future monthly income (future inflated dollars at retirement age)
      // Since totalNestEgg is already in constant today's dollars (Fisher real return),
      // nominal future income scales by inflation factor rather than double-discounting.
      const futureNominalMonthly = roundTo(
        monthlyRetireIncome * Math.pow(1 + inflationRate, yearsToRetire), 2
      );

      // ── Achieved replacement rate
      const achievedReplaceRate = roundTo((annualRetireIncome / annualIncome) * 100, 1);

      // ── Status assessment
      let status;
      if (totalNestEgg >= targetNestEgg) {
        status = 'On Track ✓';
      } else if (totalNestEgg >= targetNestEgg * 0.75) {
        status = 'Close - Increase Savings';
      } else {
        status = 'Needs Attention - Boost Contributions';
      }

      // ── Additional monthly savings needed to reach target
      let additionalMonthlyNeeded = 0;
      if (totalNestEgg < targetNestEgg && monthlyRealRet > 0) {
        const fvCurrentOnly = currentSavings * Math.pow(1 + realReturn, yearsToRetire);
        const neededFromContribs = targetNestEgg - fvCurrentOnly;
        if (neededFromContribs > 0) {
          const gf = Math.pow(1 + monthlyRealRet, totalMonths);
          const pmtNeeded = neededFromContribs * monthlyRealRet / (gf - 1);
          additionalMonthlyNeeded = roundTo(Math.max(0, pmtNeeded - monthlyContrib), 2);
        }
      }

      // ── Year-by-year projection schedule
      const schedule = [];
      for (let y = 1; y <= yearsToRetire; y++) {
        const periods = y * 12;
        let yearValue = currentSavings * Math.pow(1 + realReturn, y);
        if (monthlyRealRet === 0) {
          yearValue += monthlyContrib * periods;
        } else {
          const gf = Math.pow(1 + monthlyRealRet, periods);
          yearValue += monthlyContrib * (gf - 1) / monthlyRealRet;
        }
        yearValue = roundTo(yearValue, 2);

        const yrContribs = roundTo(currentSavings + monthlyContrib * 12 * y, 2);
        schedule.push({
          month: y,
          payment: roundTo(monthlyContrib * 12, 2),
          principal: roundTo(yrContribs, 2),
          interest: roundTo(yearValue - yrContribs, 2),
          balance: yearValue,
        });
      }

      return {
        stats: [
          { label: "Projected Nest Egg (Today's $)",    value: fmt(totalNestEgg),          highlight: true },
          { label: "Target Nest Egg (4% Rule)",         value: fmt(targetNestEgg)                         },
          { label: 'Status',                            value: status,                     warn: totalNestEgg < targetNestEgg },
          { label: "Monthly Income (Today's $)",        value: fmt(monthlyRetireIncome)                   },
          { label: "Annual Income (Today's $)",         value: fmt(annualRetireIncome)                    },
          { label: 'Total Contributions',               value: fmt(totalContribs)                         },
          { label: 'Investment Growth',                 value: fmt(totalGrowth)                           },
          { label: 'Future Monthly (At Retirement $)',  value: fmt(futureNominalMonthly)                  },
          { label: 'Income Replacement Rate',           value: pct(achievedReplaceRate / 100)             },
          { label: 'Additional Monthly Savings Needed', value: fmt(additionalMonthlyNeeded), warn: additionalMonthlyNeeded > 0 },
        ],
        chart: { principal: totalContribs, totalInterest: totalGrowth },
        table: schedule,
      };
    },

    // ── How-To Guide
    howTo: [
      'Enter your current age and annual income to set a baseline - the calculator uses your age to determine the exact number of years until retirement.',
      'Add your current retirement savings balance (401k, IRA, brokerage accounts) and your monthly contribution amount.',
      'Set your expected annual return (7-8% is a realistic long-term average for a diversified stock portfolio) and your expected inflation rate (2.5-3% historical average).',
      'Choose your desired retirement age and life expectancy - the calculator projects how long your nest egg needs to last.',
      'Review your results: projected nest egg, target savings goal using the 4% rule, monthly retirement income, and any additional savings needed to reach your goal.',
    ],

    // ── Real-World Examples
    examples: [
      {
        title: 'Starting at 25 - The Power of Early Saving',
        input: 'Age: 25, Income: $55,000, Savings: $0, Monthly: $500, Return: 7%, Inflation: 3%, Retire: 65, Live to: 95',
        result: 'Nest Egg: $1,197,000+ | Monthly Income: ~$3,990 | Replacement Rate: 87%',
      },
      {
        title: 'Mid-Career Catch-Up (Age 35)',
        input: 'Age: 35, Income: $80,000, Savings: $30,000, Monthly: $1,000, Return: 7%, Inflation: 3%, Retire: 65, Live to: 90',
        result: 'Nest Egg: $1,185,000+ | Monthly Income: ~$3,950 | Replacement Rate: 59%',
      },
      {
        title: 'Aggressive Early Retirement at 55',
        input: 'Age: 25, Income: $75,000, Savings: $10,000, Monthly: $1,500, Return: 8%, Inflation: 3%, Retire: 55, Live to: 90',
        result: 'Nest Egg: $1,625,000+ | Monthly Income: ~$5,417 | Replacement Rate: 87%',
      },
    ],
    formula: 'Real Return = (1 + Nominal Return) / (1 + Inflation Rate) - 1 | FV = PV x (1 + r)^n | FV = PMT x [((1 + r_monthly)^n - 1) / r_monthly] | 4% Rule: Annual Withdrawal = Nest Egg x 0.04 | Target Nest Egg = Desired Annual Income x 25',

    // ── SEO Article Content
    article: {
      heading: 'The Ultimate Early Career Retirement Projection Tool',
      intro: 'Standard retirement calculators assume a static income, but early-career professionals typically see rapid salary progression over time. Our specialized retirement calculator for early career professionals accounts for inflation-adjusted compound growth, realistic return rates, and the 4% rule to give you a clear roadmap to financial independence - starting from wherever you are today.',
      sections: [
        { heading: 'Why Standard Calculators Fail Young Professionals', body: 'Most retirement calculators assume your income stays flat for decades. Early-career professionals, however, often see salaries double or triple in their first 10-15 years. Static-income tools underestimate how much you can actually save as your earnings grow, leading to overly conservative projections. Our calculator lets you model rising contributions over a 35-40 year horizon.' },
        { heading: 'How Compound Growth Works Over 35 Years', body: 'Compounding over 35+ years is extraordinary. At a 7% real return, money doubles roughly every 10 years — so a dollar invested at 25 doubles ~3.5 times by 65. Inflation is the counterforce: at 3%, purchasing power halves over ~24 years. That is why our calculator uses the Fisher equation to report real, inflation-adjusted growth rather than misleading nominal figures.' },
        { heading: 'The 4% Rule and Your Target Nest Egg', body: 'The 4% rule (from the Trinity Study) says you can safely withdraw 4% of your portfolio in year one of retirement, adjusting for inflation, with a high chance of lasting 30 years. That means your target nest egg is about 25x your desired first-year retirement expenses. Our calculator computes this target from your income and replacement rate, then tells you whether you are on track.' },
      ],
    },

    // ── Schema-Ready FAQs (targets Google Featured Snippets / PAA)
    faqs: [
      {
        q: 'How much money do I need to retire comfortably?',
        a: 'A widely accepted guideline is the 4% Rule, which suggests you need approximately 25 times your expected annual retirement expenses saved in investments. For early career professionals, a good rule of thumb is to aim for 1x your annual salary saved by age 30, 3x by 40, 6x by 50, and 8x by 60. Use our retirement calculator to find your personalized target nest egg based on your income, age, and desired retirement lifestyle.',
      },
      {
        q: 'How much should an early career professional have saved?',
        a: 'By age 25-30, a common benchmark is to have saved at least 1x your annual salary. If you start saving 15% of your income at age 25 with a 7% average annual return, you could accumulate over $1 million by age 65. The key advantage for early career professionals is time - even small contributions grow exponentially through compound interest over 35-40 year horizons.',
      },
      {
        q: 'What is a realistic investment return rate over 30 years?',
        a: 'The S&P 500 has historically returned approximately 10% before inflation and 7-8% after inflation (real return) over long periods. For a balanced portfolio (60% stocks / 40% bonds), a realistic assumption is 6-7% nominal or 4-5% real return. Our calculator uses the Fisher equation - (1 + nominal return) / (1 + inflation rate) - 1 - to compute the inflation-adjusted real return, giving you a more accurate long-term projection.',
      },
      {
        q: 'What percentage of my current income should I replace in retirement?',
        a: 'Most financial advisors recommend aiming to replace 70% to 80% of your pre-retirement annual income to maintain your current lifestyle. This accounts for reduced expenses in retirement (no commuting, lower taxes, no retirement savings contributions) while still covering housing, healthcare, and leisure. Our calculator defaults to 80% and shows your projected replacement rate based on your actual savings trajectory.',
      },
      {
        q: 'How does inflation impact my retirement savings?',
        a: 'Inflation erodes purchasing power over time. At an average annual inflation rate of 2.5% to 3%, the real value of money decreases by roughly half over 25-30 years - meaning $1,000,000 in 30 years will only buy what $412,000 buys today. Our retirement calculator automatically adjusts for inflation using the Fisher equation, showing both nominal future values and inflation-adjusted (today\'s dollar) figures so you can plan accurately.',
      },
      {
        q: 'What is the 4% rule for retirement planning?',
        a: 'The 4% rule is a retirement planning guideline developed from the Trinity Study. It suggests you can withdraw 4% of your retirement portfolio in the first year of retirement (adjusting for inflation annually) with a low probability of running out of money over a 30-year retirement. For example, if your portfolio is $1,000,000, you could withdraw $40,000 in your first year. Our calculator applies this rule to your projected nest egg to estimate your monthly retirement income.',
      },
      {
        q: 'Can I retire early if I start saving at 25?',
        a: 'Yes! Starting at 25 gives you a massive advantage due to compound interest. If you save $500 per month with a 7% return, you could accumulate $1.2M by 65. To retire early at 55, you would need to save approximately $1,500-$2,000 per month - but the earlier you start, the less you need to save each month to reach the same goal. Use our retirement calculator to experiment with different retirement ages and see the impact on your monthly contribution needs.',
      },
    ],
  },
  'savings-calculator': {
    presets: [
          {
                "label": "Biweekly Acceleration ($250)",
                "values": {
                      "mode": "biweekly-monthly",
                      "initial_deposit": 5000,
                      "recurring_deposit": 250,
                      "deposit_frequency": "biweekly",
                      "interest_rate": 4.5,
                      "duration_years": 5
                }
          },
          {
                "label": "Goal Timeline ($50k Target)",
                "values": {
                      "mode": "goal-timeline",
                      "initial_deposit": 10000,
                      "recurring_deposit": 500,
                      "deposit_frequency": "monthly",
                      "interest_rate": 4.5,
                      "target_goal": 50000
                }
          },
          {
                "label": "6-Month Emergency Runway",
                "values": {
                      "mode": "emergency-fund",
                      "initial_deposit": 12000,
                      "essential_expenses": 3500
                }
          }
    ],
    name: 'Savings & Strategy Calculator',
    category: 'Finance',
    icon: 'fa-piggy-bank',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Compare biweekly vs monthly savings growth, calculate exact target dates, analyze High-Yield Savings Account (HYSA) returns after tax and inflation, and model emergency fund durations.',
    metaTitle: 'Savings Calculator | Biweekly vs Monthly & HYSA Growth — GetCalcu',
    metaDescription: 'Free online Savings Calculator. Compare biweekly vs monthly deposits, estimate real HYSA returns after tax and inflation, and pinpoint your exact goal completion timeline.',
    keywords: [
      'biweekly vs monthly savings calculator',
      'hysa inflation calculator',
      'emergency fund months calculator',
      'savings goal timeline calculator',
      'interest calculator with tax',
    ],
    fields: [
      { id: 'mode', label: 'Savings Strategy Mode', type: 'select', default: 'biweekly-monthly',
        options: [
          { value: 'biweekly-monthly', label: 'Biweekly vs Monthly Growth Comparison' },
          { value: 'goal-timeline', label: 'Target Goal & Exact Date Timeline' },
          { value: 'hysa-real-yield', label: 'HYSA Net Return (Tax & Inflation Adjusted)' },
          { value: 'emergency-fund', label: 'Emergency Fund Expenses Calculator' },
        ],
        hint: 'Choose a savings strategy to model. Each mode surfaces only the inputs it needs.' },
      { id: 'initial_deposit', label: 'Initial Deposit / Current Savings ($)', type: 'number', default: 5000, min: 0, step: 100,
        hint: 'Your starting balance or current savings today. Use 0 if you are starting from scratch.' },
      { id: 'recurring_deposit', label: 'Monthly-Equivalent Deposit ($)', type: 'number', default: 250, min: 0, step: 25,
        condition: v => ['biweekly-monthly','goal-timeline','hysa-real-yield'].includes(v.mode),
        hint: 'The amount you deposit per paycheck cycle. In Biweekly vs Monthly mode this is the monthly-equivalent payment.' },
      { id: 'deposit_frequency', label: 'Deposit Frequency', type: 'select', default: 'biweekly',
        condition: v => ['biweekly-monthly','goal-timeline','hysa-real-yield'].includes(v.mode),
        options: [
          { value: 'biweekly', label: 'Biweekly (26/yr)' },
          { value: 'monthly', label: 'Monthly (12/yr)' },
          { value: 'weekly', label: 'Weekly (52/yr)' },
        ],
        hint: 'How often you contribute. Used for compounding cadence in Growth and Goal modes.' },
      { id: 'target_goal', label: 'Target Goal Amount ($)', type: 'number', default: 25000, min: 0, step: 500,
        condition: v => ['goal-timeline','emergency-fund'].includes(v.mode),
        hint: 'The total balance you want to reach. The calculator projects the exact month and year you cross this line.' },
      { id: 'essential_expenses', label: 'Essential Monthly Expenses ($)', type: 'number', default: 3500, min: 0, step: 100,
        condition: v => v.mode === 'emergency-fund',
        hint: 'Non-negotiable monthly costs: rent/mortgage, utilities, food, insurance, and minimum debt payments.' },
      { id: 'interest_rate', label: 'Annual Interest Rate / HYSA APY (%)', type: 'number', default: 4.5, min: 0, max: 30, step: 0.1,
        hint: 'Stated annual yield. For a High-Yield Savings Account use the advertised APY (commonly 3-5%).' },
      { id: 'tax_rate', label: 'Marginal Income Tax Rate (%)', type: 'number', default: 22, min: 0, max: 50, step: 1,
        condition: v => v.mode === 'hysa-real-yield',
        hint: 'Your marginal federal + state income tax bracket applied to interest earned.' },
      { id: 'inflation_rate', label: 'Expected Inflation Rate (%)', type: 'number', default: 2.5, min: 0, max: 15, step: 0.1,
        condition: v => v.mode === 'hysa-real-yield',
        hint: 'Expected annual price increase that erodes purchasing power. US long-run average is about 2.5-3%.' },
      { id: 'duration_years', label: 'Savings Duration (Years)', type: 'number', default: 5, min: 1, max: 50, step: 1,
        condition: v => ['biweekly-monthly','hysa-real-yield'].includes(v.mode),
        hint: 'The planning horizon over which growth, compounding, and real-yield erosion are measured.' },
    ],

    fieldLabels(v) {
      if (v.mode === 'biweekly-monthly') return { initial_deposit: 'Initial Deposit / Current Savings ($)', recurring_deposit: 'Monthly-Equivalent Deposit ($)', interest_rate: 'Annual Interest Rate (%)', target_goal: 'Target Goal Amount ($)' };
      if (v.mode === 'goal-timeline') return { initial_deposit: 'Current Savings ($)', recurring_deposit: 'Recurring Deposit ($)', interest_rate: 'Annual Interest Rate (%)', target_goal: 'Target Goal Amount ($)' };
      if (v.mode === 'hysa-real-yield') return { initial_deposit: 'HYSA Balance ($)', recurring_deposit: 'Monthly Deposit ($)', interest_rate: 'HYSA APY (%)' };
      if (v.mode === 'emergency-fund') return { initial_deposit: 'Current Emergency Savings ($)', interest_rate: 'Savings Account APY (%)', target_goal: 'Custom Buffer Goal ($) (optional)' };
      return {};
    },
    calculate(v) {
      const P0 = safeNum(v.initial_deposit, 0);
      const M  = safeNum(v.recurring_deposit, 0);
      const rate = safeNum(v.interest_rate, 0);
      const rNom = rate / 100;
      const t   = Math.round(safeNum(v.duration_years, 5));
      const G   = safeNum(v.target_goal, 0);
      const E   = safeNum(v.essential_expenses, 0);
      const tau = safeNum(v.tax_rate, 0) / 100;
      const pi = safeNum(v.inflation_rate, 0) / 100;
      const freq = safeStr(v.deposit_frequency);
      const k = { monthly: 12, biweekly: 26, weekly: 52 }[freq] || 12;
      function fv(p0, pmt, rp, n) { if (rp === 0) return roundTo(p0 + pmt * n, 2); const gf = Math.pow(1 + rp, n); return roundTo(p0 * gf + pmt * (gf - 1) / rp, 2); }
      function monthName(m) { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }); }
      if (v.mode === 'biweekly-monthly') {
        const fvB = fv(P0, M/2, rNom/26, 26*t);
        const fvH = fv(P0, M, rNom/12, 12*t);
        const dTot = roundTo(fvB - fvH, 2);
        const dDep = roundTo((M/2 * 26*t) - (M * 12*t), 2);
        const dInt = roundTo(dTot - dDep, 2);
        const intB = roundTo(fvB - P0 - M/2 * 26*t, 2);
        const intH = roundTo(fvH - P0 - M * 12*t, 2);
        const labels = []; const bData = []; const mData = [];
        for (let y = 1; y <= t; y++) { labels.push('Year ' + y); bData.push(fv(P0, M/2, rNom/26, 26*y)); mData.push(fv(P0, M, rNom/12, 12*y)); }
        return { stats: [
          { label: 'Biweekly Final Balance', value: fmt(fvB), highlight: true },
          { label: 'Monthly Final Balance', value: fmt(fvH) },
          { label: 'Biweekly Advantage (Extra Growth)', value: fmt(dTot), highlight: true },
          { label: 'Extra Deposits (1 payment/yr x t)', value: fmt(dDep) },
          { label: 'Extra Compounding Interest', value: fmt(dInt) },
          { label: 'Biweekly Total Interest Earned', value: fmt(intB) },
          { label: 'Monthly Total Interest Earned', value: fmt(intH) },
          { label: 'Time Horizon', value: t + ' years' },
        ], chart: { type: 'line', labels, datasets: [ { label: 'Biweekly', data: bData, color: '#10B981' }, { label: 'Monthly', data: mData, color: '#6366F1' } ], yLabel: 'Balance ($)', title: 'Biweekly vs Monthly Growth' },
        table: { mode: 'comparison', title: 'Strategy Comparison (' + t + ' Years)', columns: [
          { key: 'metric', label: 'Metric', format: 'text' }, { key: 'monthly', label: 'Monthly', format: 'currency' },
          { key: 'biweekly', label: 'Biweekly', format: 'currency', emphasis: true }, { key: 'advantage', label: 'Advantage', format: 'currency', emphasis: true } ],
        rows: [ { metric: 'Annual Deposits', monthly: fmt(M*12), biweekly: fmt(M/2*26), advantage: fmt(M/2*26 - M*12) },
          { metric: 'Total Deposits (' + t + ' Years)', monthly: fmt(M*12*t), biweekly: fmt(M/2*26*t), advantage: fmt(M/2*26*t - M*12*t) },
          { metric: 'Total Interest Earned', monthly: fmt(intH), biweekly: fmt(intB), advantage: fmt(intB - intH) },
          { metric: 'Final Balance', monthly: fmt(fvH), biweekly: fmt(fvB), advantage: fmt(dTot) } ] },
        insight: { tone: dTot > 0 ? 'positive' : 'neutral', icon: 'fa-arrow-trend-up',
          headline: 'Biweekly deposits beat monthly by ' + fmt(dTot) + ' over ' + t + ' years.',
          detail: 'Of that, ' + fmt(dDep) + ' comes from one extra monthly payment per year and ' + fmt(dInt) + ' is pure compounding edge. Switching to biweekly paycheck deposits accelerates your savings without raising your per-paycheck amount.' } };
      }

      if (v.mode === 'hysa-real-yield') {
        const rNet = rNom * (1 - tau);
        const rReal = (1 + rNet) / (1 + pi) - 1;
        const rNetD = roundTo(rNet * 100, 4);
        const rRealD = roundTo(rReal * 100, 4);
        const tUse = Math.max(t, 1);
        const fvNom = fv(P0, M, rNom/k, k*tUse);
        const fvPost = fv(P0, M, rNet/k, k*tUse);
        const fvReal = roundTo(fv(P0, M, rReal/k, k*tUse), 2);
        const rowsS = []; let run = P0;
        for (let y = 1; y <= tUse; y++) {
          const sB = run; const dep = M * k;
          const nE = fv(P0, M, rNom/k, k*y); const pE = fv(P0, M, rNet/k, k*y);
          const rE = roundTo(fv(P0, M, rReal/k, k*y), 2);
          rowsS.push({ year: 'Year ' + y, startBalance: fmt(sB), deposits: fmt(dep), nominalEnd: fmt(nE), postTaxEnd: fmt(pE), realEndTodayDollars: fmt(rE) });
          run = nE;
        }
        return { stats: [
          { label: 'Real Return (Post-Tax, Post-Inflation)', value: pct(rReal), highlight: true },
          { label: 'Advertised APY', value: pct(rNom) },
          { label: 'Post-Tax Nominal Return', value: pct(rNet) },
          { label: 'Inflation Drag', value: pct(roundTo(rNet - rReal, 4)), warn: true },
          { label: "Real Future Value (Today's $)", value: fmt(fvReal) },
          { label: 'Post-Tax Future Value (Nominal $)', value: fmt(fvPost) },
          { label: 'Nominal Future Value (Pre-Tax $)', value: fmt(fvNom) },
        ], chart: { type: 'bar', labels: ['Advertised APY', 'Post-Tax', 'Real Return'], datasets: [ { label: 'Yield %', data: [rate, rNetD, rRealD], color: '#6366F1' } ], yLabel: 'Annual Yield (%)', title: 'APY vs Real Purchasing-Power Yield' },
        table: { mode: 'schedule', title: 'Year-by-Year Real Value Projection', columns: [
          { key: 'year', label: 'Year', format: 'text' }, { key: 'startBalance', label: 'Start Balance', format: 'currency' },
          { key: 'deposits', label: 'Deposits', format: 'currency' }, { key: 'nominalEnd', label: 'Nominal End', format: 'currency' },
          { key: 'postTaxEnd', label: 'Post-Tax End', format: 'currency' }, { key: 'realEndTodayDollars', label: "Real (Today's $)", format: 'currency', emphasis: true } ], rows: rowsS },
        insight: { tone: 'warning', icon: 'fa-percent',
          headline: 'Your bank advertises ' + pct(rNom) + ' APY, but your real return is only ' + pct(rReal) + '.',
          detail: 'After ' + pct(tau) + ' tax and ' + pct(pi) + ' inflation, your purchasing-power yield collapses to ' + pct(rReal) + '. Over ' + tUse + ' years, ' + fmt(P0) + ' plus ' + fmt(M) + '/month grows to ' + fmt(fvReal) + " in today's dollars." } };
      }

      if (v.mode === 'goal-timeline') {
        const rm = rNom / 12;
        const mPmt = freq === 'biweekly' ? M * 26 / 12 : freq === 'weekly' ? M * 52 / 12 : M;
        let nStar = 0; let bal = P0; const cap = 1200;
        while (bal < G && nStar < cap) { nStar++; bal = fv(P0, mPmt, rm, nStar); }
        const reached = bal >= G;
        const yr = Math.floor(nStar / 12); const mo = nStar % 12;
        const balR = roundTo(bal, 2);
        const contribs = roundTo(P0 + mPmt * nStar, 2);
        const intEarned = roundTo(balR - contribs, 2);
        const data = []; const step = nStar <= 66 ? 1 : Math.max(1, Math.floor(nStar / 60));
        for (let m = step; m <= nStar; m += step) data.push(fv(P0, mPmt, rm, m));
        if (!data.length || data[data.length - 1] !== balR) data.push(balR);
        const labels = []; for (let i = 0; i < data.length; i++) { const mn = i * step + step; labels.push(mn <= 12 ? 'Month ' + mn : mn + ' mo'); }
        let stats;
        if (P0 >= G && G > 0) { stats = [ { label: 'Goal Reached In', value: '0 yr 0 mo', highlight: true }, { label: 'Projected Completion Date', value: monthName(0), highlight: true }, { label: 'Total Months', value: '0' }, { label: 'Balance at Goal', value: fmt(P0) }, { label: 'Total Contributions by Goal', value: fmt(P0) }, { label: 'Interest Earned by Goal', value: fmt(0) }, { label: 'Monthly Deposit Used', value: fmt(mPmt) } ]; }
        else if (!reached) { stats = [ { label: 'Goal Reachable?', value: 'Not reached within 100 years', warn: true, highlight: true }, { label: 'Monthly Deposit Used', value: fmt(mPmt) }, { label: 'Current Balance at ' + cap + ' months', value: fmt(balR) } ]; }
        else { stats = [ { label: 'Goal Reached In', value: yr + ' yr ' + mo + ' mo', highlight: true }, { label: 'Projected Completion Date', value: monthName(nStar), highlight: true }, { label: 'Total Months', value: String(nStar) }, { label: 'Balance at Goal', value: fmt(balR) }, { label: 'Total Contributions by Goal', value: fmt(contribs) }, { label: 'Interest Earned by Goal', value: fmt(intEarned) }, { label: 'Monthly Deposit Used', value: fmt(mPmt) } ]; }
        const sRows = []; const sStep = nStar <= 60 ? 1 : Math.max(1, Math.floor(nStar / 30));
        for (let m = sStep; m <= nStar; m += sStep) { const cB = fv(P0, mPmt, rm, m); const pB = fv(P0, mPmt, rm, m - sStep); const iP = roundTo(cB - pB - mPmt * sStep, 2); sRows.push({ period: m === nStar ? 'Month ' + m + ' — Goal Reached' : 'Month ' + m, deposit: fmt(mPmt * sStep), interest: fmt(Math.max(0, iP)), balance: fmt(cB) }); }
        return { stats, chart: { type: 'line', labels, datasets: [ { label: 'Balance', data: data, color: '#6366F1' }, { label: 'Goal', data: new Array(data.length).fill(G), color: '#EF4444' } ], yLabel: 'Balance ($)', title: 'Path to ' + fmt(G) },
        table: { mode: 'schedule', title: 'Milestone Schedule', columns: [ { key: 'period', label: 'Period', format: 'text' }, { key: 'deposit', label: 'Deposit', format: 'currency' }, { key: 'interest', label: 'Interest', format: 'currency' }, { key: 'balance', label: 'Balance', format: 'currency', emphasis: true } ], rows: sRows },
        insight: { tone: 'positive', icon: 'fa-bullseye', headline: P0 >= G ? 'You have already reached your ' + fmt(G) + ' goal.' : 'You will reach ' + fmt(G) + ' in ' + yr + ' yr ' + mo + ' mo — projected ' + monthName(nStar) + '.', detail: P0 >= G ? 'Your current savings of ' + fmt(P0) + ' meet or exceed the target today.' : 'That is ' + nStar + ' months of ' + fmt(mPmt) + '/month deposits plus compounded interest. Raising your monthly deposit shortens the timeline.' } };
      }

      if (v.mode === 'emergency-fund') {
        if (E <= 0) return { stats: [ { label: 'Months of Coverage', value: '—', warn: true, highlight: true }, { label: 'Enter Essential Expenses', value: 'Required to calculate coverage', warn: true } ], bars: [], insight: { tone: 'warning', icon: 'fa-shield-halved', headline: 'Enter your essential monthly expenses to calculate coverage.', detail: 'This mode needs your monthly cost of living to convert savings into months of runway.' } };
        const mc = roundTo(P0 / E, 2);
        const G3 = roundTo(3 * E, 2); const G6 = roundTo(6 * E, 2);
        const s3 = roundTo(Math.max(0, G3 - P0), 2); const s6 = roundTo(Math.max(0, G6 - P0), 2);
        const hasC = G > 0; const sC = hasC ? roundTo(Math.max(0, G - P0), 2) : 0;
        const stats = [ { label: 'Months of Coverage', value: mc.toFixed(1) + ' months', highlight: true }, { label: 'Current Savings', value: fmt(P0) }, { label: '3-Month Buffer Target', value: fmt(G3) }, { label: 'Shortfall to 3 Months', value: fmt(s3), warn: s3 > 0 }, { label: '6-Month Buffer Target', value: fmt(G6) }, { label: 'Shortfall to 6 Months', value: fmt(s6), warn: s6 > 0, highlight: true } ];
        if (hasC) { stats.push({ label: 'Custom Buffer Target', value: fmt(G) }); stats.push({ label: 'Shortfall to Custom', value: fmt(sC), warn: sC > 0 }); }
        const bars = [ { label: '3-Month Buffer', value: P0, target: G3, color: s3 > 0 ? '#EF4444' : '#10B981', caption: s3 > 0 ? fmt(s3) + ' short' : 'Funded' }, { label: '6-Month Buffer', value: P0, target: G6, color: s6 > 0 ? '#EF4444' : '#10B981', caption: s6 > 0 ? fmt(s6) + ' short' : 'Funded' } ];
        if (hasC) bars.push({ label: 'Custom Buffer', value: P0, target: G, color: sC > 0 ? '#EF4444' : '#10B981', caption: sC > 0 ? fmt(sC) + ' short' : 'Funded' });
        const tone = mc < 3 ? 'warning' : mc < 6 ? 'neutral' : 'positive';
        const insight = { tone, icon: 'fa-shield-halved', headline: 'Your savings cover ' + mc.toFixed(1) + ' months of expenses.', detail: 'You are ' + fmt(s6) + ' short of a 6-month buffer (' + fmt(G6) + '). A 3-month minimum buffer (' + fmt(G3) + ') needs ' + fmt(s3) + ' more. Advisors recommend 3-6 months in a liquid HYSA.' };
        if (mc >= 6) { insight.headline = 'Fully funded: ' + mc.toFixed(1) + ' months of expenses covered.'; insight.detail = 'You exceed the 6-month buffer target of ' + fmt(G6) + '. Keep it in a high-yield, accessible account.'; }
        return { stats, bars, insight };
      }
      return errorResult('Unknown mode selected.');
    },
    howTo: [
      'Choose a strategy mode - Biweekly vs Monthly, Target Goal & Date, HYSA Net Return, or Emergency Fund. Only the inputs that mode needs appear.',
      'Enter your current savings or initial deposit. Use 0 if you are starting from scratch.',
      'Add your recurring deposit amount and how often you contribute (biweekly, monthly, or weekly).',
      'For goal and HYSA modes, set your target amount, HYSA APY, marginal tax rate, and expected inflation.',
      'For the emergency-fund mode, enter your essential monthly expenses; the tool sizes 3- and 6-month buffers automatically.',
      'Read the headline insight, then review the stat tiles, growth chart, and schedule/comparison table for the full picture.',
      'Use "Copy Results" to grab the numbers or "Save Result" to store the scenario to your GetCalcu history.',
    ],
    examples: [
      { title: 'Biweekly edge over 5 years', input: '$5,000 start, $250/mo-equivalent, 4.5% APY, 5 years', result: 'Biweekly $24,466 vs Monthly $23,046 → +$1,421 extra (≈$171 pure compounding)' },
      { title: 'HYSA real return reality check', input: '$5,000 at 4.5% APY, 22% tax, 2.5% inflation, $250/mo, 5 years', result: 'Real return ≈ 0.99% — $5,000 → ≈$19,735 in today\'s dollars' },
      { title: 'Goal timeline to $25,000', input: '$5,000 start, $250/mo, 4.5% APY, goal $25,000', result: 'Reached in 66 months (5 yr 6 mo) — projected Jan 2032' },
      { title: 'Emergency fund gap', input: '$5,000 saved, $3,500/mo essential expenses', result: '1.4 months covered · $16,000 short of a 6-month buffer' },
    ],
    formula: 'Biweekly vs Monthly: FV = P0(1+r/k)^(kt) + PMT * [((1+r/k)^(kt)-1)/(r/k)] with k=26 (biweekly) vs k=12 (monthly) | Post-Tax Real Yield: r_net = r_nominal*(1-tau) and r_real = (1+r_net)/(1+pi)-1 | Goal Months: smallest n with P0(1+r_m)^n + PMT_m*(((1+r_m)^n-1)/r_m) >= G | Emergency Coverage: Months = P0/E, G3=3E, G6=6E',

    article: {
      heading: 'Smart Savings Strategies: Biweekly Acceleration, HYSA Net Yields & Timelines',
      intro: 'Most savings calculators stop at a single compound-interest projection — but real-world wealth building is shaped by forces those tools ignore. The GetCalcu Savings & Strategy Calculator models the factors that actually move your balance: biweekly paycheck timing that sneaks in an extra deposit each year, income tax that clips your HYSA interest, and inflation that quietly erodes what those dollars can buy. Across four focused modes, it shows your true trajectory instead of a rosy headline number.',
      sections: [
        { heading: 'Why basic savings calculators fall short', body: 'A standard calculator applies one rate to one contribution schedule and prints a future value. That ignores how you actually get paid. If you are paid biweekly, you receive 26 checks a year — and contributing from every check means 26 half-deposits, the equivalent of 13 monthly payments instead of 12. It also ignores that HYSA interest is ordinary income, taxed at your marginal bracket, and that inflation shrinks the purchasing power of every dollar you keep. Without accounting for tax and inflation, an advertised 4.5% APY can quietly become a sub-1% real return.' },
        { heading: 'The math behind your real HYSA return', body: 'Two steps convert a bank\'s advertised APY into your true purchasing-power yield. First, tax the interest: your after-tax nominal return is r_net = r_nominal x (1 - Tax Rate). Second, remove inflation with the Fisher equation: r_real = (1 + r_net) / (1 + Inflation Rate) - 1. The result is what your savings actually earn in today\'s dollars. At a 4.5% APY, 22% tax, and 2.5% inflation, the real return is under 1% — a number most savers never see because their bank only displays the gross rate.' },
        { heading: 'Biweekly acceleration, goal timelines, and emergency funds', body: 'The same compounding engine powers the other three modes. Biweekly acceleration quantifies the edge from one extra monthly payment per year. The goal-timeline engine walks your balance forward month by month until it crosses your target, then projects the exact calendar month and year you will arrive. And the emergency-fund mode translates a lump sum into months of essential-expense coverage, sizing the 3- and 6-month buffers most advisors recommend holding in a liquid, high-yield account.' },
      ],
    },

    faqs: [
      { q: 'Does saving biweekly build money faster than saving monthly?', a: 'Yes. Because a year contains 52 weeks, saving biweekly results in 26 half-deposits—equivalent to 13 full monthly payments per year. This extra deposit accelerates compounding and builds wealth faster over multi-year horizons.' },
      { q: 'Is interest earned from a High-Yield Savings Account (HYSA) taxable?', a: 'Yes. In most jurisdictions, interest earned from bank savings accounts and HYSAs is classified as ordinary income and subject to taxation at your marginal income tax bracket.' },
      { q: 'How many months of expenses should be in an emergency fund?', a: 'Financial advisors typically recommend holding 3 to 6 months of essential living expenses (rent/mortgage, utilities, food, debt minimums) in a liquid, accessible account like a High-Yield Savings Account.' },
      { q: 'How do you calculate the real return on a savings account after tax and inflation?', a: 'First reduce the advertised APY by your tax rate to get the post-tax nominal return: r_net = APY x (1 - tax rate). Then remove inflation with the Fisher equation: r_real = (1 + r_net) / (1 + inflation) - 1. For a 4.5% APY at a 22% tax bracket with 2.5% inflation, the post-tax return is 3.51% and the real return is about 0.99%.' },
            { q: 'How long will it take to reach my savings goal?', a: 'Divide the problem into months: project your balance forward each month as initial savings grown by the monthly rate plus your monthly contribution, and stop at the first month the balance meets or exceeds your goal. The Savings & Strategy Calculator performs this month-by-month walk and converts the result into an exact calendar month and year, so you see not just "5 years 6 months" but a projected completion date like January 2032.' },
    ],
  },

  // ── Credit Card Payoff & Strategy Calculator ───────────────────────────────
  'credit-card-payoff-calculator': {
    presets: [
          {
                "label": "Fixed Payoff ($300/mo)",
                "values": {
                      "mode": "min-payment",
                      "balance": 6000,
                      "apr": 22.5,
                      "min_pct": 2.5,
                      "monthly_payment": 300
                }
          },
          {
                "label": "24-Month Debt-Free Goal",
                "values": {
                      "mode": "target-date",
                      "balance": 8000,
                      "apr": 21,
                      "target_months": 24
                }
          },
          {
                "label": "0% Balance Transfer (18 Mo)",
                "values": {
                      "mode": "balance-transfer",
                      "balance": 7500,
                      "apr": 24,
                      "transfer_fee": 3,
                      "promo_months": 18,
                      "monthly_payment": 450
                }
          }
    ],
    name: 'Credit Card Payoff & Strategy Calculator',
    category: 'Finance',
    icon: 'fa-credit-card',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate credit card debt payoff dates, expose minimum payment interest traps, analyze 0% APR balance transfer fees, and compare Avalanche vs Snowball payoff strategies.',
    metaTitle: 'Credit Card Payoff Calculator | Minimum Payment Trap & 0% APR - GetCalcu',
    metaDescription: 'Free online Credit Card Payoff Calculator. Calculate exact debt-free dates, compare minimum payment costs vs extra monthly deposits, and analyze 0% APR balance transfer savings.',
    keywords: [
      'credit card payoff calculator',
      'credit card minimum payment trap calculator',
      '0 apr balance transfer fee calculator',
      'credit card debt free date calculator',
      'avalanche vs snowball debt payoff calculator',
    ],
    fields: [
      { id: 'mode', label: 'Strategy Mode', type: 'select', default: 'min-payment',
        options: [
          { value: 'min-payment',        label: 'Minimum Payment Trap & Fixed Monthly Payoff' },
          { value: 'target-date',        label: 'Exact Target Debt-Free Date Goal' },
          { value: 'balance-transfer',   label: '0% APR Balance Transfer Savings' },
          { value: 'avalanche-snowball', label: 'Avalanche vs Snowball Multi-Card Strategy' },
        ],
        hint: 'Choose what to analyze. Each mode exposes a different cost of carrying credit card debt.' },
      { id: 'balance', label: 'Total Credit Card Balance ($)', type: 'number', default: 7500, min: 0, step: 100,
        hint: 'The total outstanding balance across the card(s) you want to pay off.' },
      { id: 'apr', label: 'Annual Interest Rate / APR (%)', type: 'number', default: 21.5, min: 0, max: 40, step: 0.1,
        hint: 'The stated Annual Percentage Rate. Credit card APRs commonly range from 18% to 29% and accrue interest daily.' },
      { id: 'min_pct', label: 'Minimum Payment Percentage (%)', type: 'number', default: 2.5, min: 1, max: 10, step: 0.5,
        condition: v => v.mode === 'min-payment' || v.mode === 'avalanche-snowball',
        hint: 'The percent of the balance your lender sets as the minimum each month (typically 2%-3%). Lenders also apply a $25 floor.' },
      { id: 'monthly_payment', label: 'Planned Monthly Payment ($)', type: 'number', default: 250, min: 0, step: 25,
        condition: v => v.mode === 'min-payment' || v.mode === 'balance-transfer' || v.mode === 'avalanche-snowball',
        hint: 'The amount you commit to paying each month. Must exceed the monthly interest charge to actually reduce the balance.' },
      { id: 'target_months', label: 'Target Debt-Free Timeframe (Months)', type: 'number', default: 24, min: 1, max: 120, step: 1,
        condition: v => v.mode === 'target-date',
        hint: 'The number of months within which you want to be 100% debt-free. The calculator solves for the exact monthly payment required.' },
      { id: 'transfer_fee', label: 'Balance Transfer Fee (%)', type: 'number', default: 3, min: 0, max: 10, step: 0.5,
        condition: v => v.mode === 'balance-transfer',
        hint: 'The upfront one-time fee the new card charges to move your balance (typically 3%-5%). Charged immediately on top of your balance.' },
      { id: 'promo_months', label: 'Promotional 0% APR Duration (Months)', type: 'number', default: 18, min: 3, max: 36, step: 1,
        condition: v => v.mode === 'balance-transfer',
        hint: 'The intro 0% interest window (commonly 12-21 months). Any balance left after this reverts to the regular APR.' },
    ],
    fieldLabels(v) {
      if (v.mode === 'min-payment')        return { monthly_payment: 'Planned Fixed Monthly Payment ($)' };
      if (v.mode === 'balance-transfer')   return { monthly_payment: 'Monthly Payment You Can Afford ($)', apr: 'Current Card APR (%)' };
      if (v.mode === 'avalanche-snowball') return { monthly_payment: 'Total Monthly Debt Budget ($)', balance: 'Total Multi-Card Balance ($)' };
      return {};
    },
    calculate(v) {
      const B = safeNum(v.balance, 0);
      const APR = safeNum(v.apr, 0);
      const iDaily = APR / 100 / 365;
      const iM = Math.pow(1 + iDaily, 30) - 1;
      const FLOOR = 25;
      const curMode = v.mode;

      function yrs(m) {
        if (m >= 1200) return '100+ yr';
        const y = Math.floor(m / 12), mo = m % 12;
        if (y > 0 && mo > 0) return y + ' yr ' + mo + ' mo';
        if (y > 0) return y + ' yr';
        return mo + ' mo';
      }
      function pctOf(x, tot) { return tot > 0 ? (x / tot * 100).toFixed(0) + '%' : '0%'; }
      function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
      function fmtDate(d) { return d.toLocaleString('en-US', { month: 'short', year: 'numeric' }); }
      function reqPmt(bal, rate, n) { return rate === 0 ? bal / n : bal * rate / (1 - Math.pow(1 + rate, -n)); }

      function simMin(startBal, rate, minPct) {
        let bal = startBal, m = 0, ti = 0, runaway = false; const path = [bal];
        while (bal > 0.005 && m < 1200) {
          const interest = bal * rate;
          let pay = Math.max(FLOOR, bal * minPct / 100);
          if (pay <= interest) { runaway = true; break; }
          pay = Math.min(pay, bal + interest);
          ti += interest; bal += interest - pay; m++; path.push(bal);
        }
        return { months: m, totalInterest: roundTo(ti, 2), runaway, balance: bal, path };
      }
      function simFixed(startBal, rate, pay) {
        let bal = startBal, m = 0, ti = 0, runaway = false; const path = [bal];
        if (pay <= 0 || (rate > 0 && pay <= rate * startBal)) return { months: 0, totalInterest: 0, runaway: true, balance: bal, path };
        while (bal > 0.005 && m < 1200) {
          const interest = bal * rate;
          const p = Math.min(pay, bal + interest);
          ti += interest; bal += interest - p; m++; path.push(bal);
        }
        return { months: m, totalInterest: roundTo(ti, 2), runaway, balance: bal, path };
      }
      function samplePath(path, maxPts) {
        if (path.length <= maxPts) return path.map((b, i) => ({ m: i, b: roundTo(b, 2) }));
        const out = [{ m: 0, b: roundTo(path[0], 2) }];
        for (let k = 1; k < maxPts - 1; k++) {
          const idx = Math.round(k * (path.length - 1) / (maxPts - 1));
          out.push({ m: idx, b: roundTo(path[idx], 2) });
        }
        out.push({ m: path.length - 1, b: roundTo(path[path.length - 1], 2) });
        return out;
      }
      function scheduleTable(path, rate, pay) {
        const cols = [
          { key: 'period', label: 'Month', format: 'text' },
          { key: 'payment', label: 'Payment', format: 'currency' },
          { key: 'principal', label: 'Principal', format: 'currency' },
          { key: 'interest', label: 'Interest', format: 'currency' },
          { key: 'balance', label: 'Balance', format: 'currency', emphasis: true },
        ];
        const n = path.length - 1;
        const picks = new Set([0, n]);
        const want = Math.min(40, n);
        for (let k = 1; k < want - 1; k++) picks.add(Math.round(k * n / (want - 1)));
        const rows = [...picks].sort((a, b) => a - b).map(i => {
          const prev = i > 0 ? path[i - 1] : path[0];
          const interest = roundTo(prev * rate, 2);
          const principal = roundTo(Math.max(0, prev - path[i]), 2);
          const payment = roundTo(Math.min(pay, prev + interest), 2);
          return { period: i === n ? 'Month ' + i + ' — Paid Off' : 'Month ' + i, payment, principal, interest, balance: roundTo(path[i], 2) };
        });
        return { mode: 'schedule', title: 'Payoff Schedule', columns: cols, rows };
      }

      if (curMode === 'min-payment') {
        if (B <= 0) return errorResult('Enter a credit card balance greater than $0.');
        const minPct = safeNum(v.min_pct, 2.5);
        const P = safeNum(v.monthly_payment, 0);
        const min = simMin(B, iM, minPct);
        const fix = simFixed(B, iM, P);
        const stats = [];
        if (min.runaway) {
          stats.push({ label: 'Minimum Payment', value: 'Never pays off', warn: true, highlight: true });
          stats.push({ label: 'Why?', value: 'Min does not cover monthly interest', warn: true });
        } else {
          stats.push({ label: 'Min-Payment Time', value: yrs(min.months), warn: true });
          stats.push({ label: 'Min-Payment Interest', value: fmt(min.totalInterest), warn: true });
        }
        if (fix.runaway) {
          stats.push({ label: 'Fixed Payment', value: 'Never pays off', warn: true, highlight: true });
          stats.push({ label: 'Required Minimum', value: 'Pay more than ' + fmt(iM * B) + '/mo (monthly interest)', warn: true });
        } else {
          stats.push({ label: 'Fixed-Payment Time', value: yrs(fix.months), highlight: true });
          stats.push({ label: 'Fixed-Payment Interest', value: fmt(fix.totalInterest) });
        }
        if (!min.runaway && !fix.runaway) {
          stats.push({ label: 'Interest Saved', value: fmt(roundTo(min.totalInterest - fix.totalInterest, 2)), highlight: true });
          stats.push({ label: 'Time Saved', value: yrs(min.months - fix.months), highlight: true });
        }
        const maxInt = Math.max(min.totalInterest, fix.totalInterest, 1) + 1;
        const maxT = Math.max(min.months, fix.months, 1) + 1;
        const bars = [
          { label: 'Interest: Minimum Only', value: min.totalInterest, target: maxInt, color: '#EF4444', caption: min.runaway ? 'Runaway' : fmt(min.totalInterest) },
          { label: 'Interest: Fixed Payment', value: fix.totalInterest, target: maxInt, color: '#10B981', caption: fix.runaway ? 'Runaway' : fmt(fix.totalInterest) },
          { label: 'Time: Minimum Only', value: min.months, target: maxT, color: '#EF4444', caption: min.runaway ? '∞' : min.months + ' mo' },
          { label: 'Time: Fixed Payment', value: fix.months, target: maxT, color: '#10B981', caption: fix.runaway ? '∞' : fix.months + ' mo' },
        ];
        const sMin = samplePath(min.path, 30), sFix = samplePath(fix.path, 30);
        const len = Math.max(sMin.length, sFix.length);
        const stepM = Math.max(1, Math.round(Math.max(min.path.length, fix.path.length) / len));
        const chartLabels = [], dataMin = [], dataFix = [];
        for (let i = 0; i < len; i++) { chartLabels.push('Mo ' + (i * stepM)); dataMin.push(i < sMin.length ? sMin[i].b : 0); dataFix.push(i < sFix.length ? sFix[i].b : 0); }
        const chart = { type: 'line', labels: chartLabels, yLabel: 'Balance ($)', title: 'Balance Over Time: Minimum vs Fixed',
          datasets: [ { label: 'Minimum Only', data: dataMin, color: '#EF4444' }, { label: 'Fixed Payment', data: dataFix, color: '#10B981', fill: true } ] };
        const table = fix.runaway ? null : scheduleTable(fix.path, iM, P);
        let insight;
        if (min.runaway && fix.runaway) {
          insight = { tone: 'warning', icon: 'fa-triangle-exclamation', headline: 'Neither strategy pays off this balance.', detail: 'Your minimum payment does not cover the monthly interest of ' + fmt(iM * B) + ', and your fixed ' + fmt(P) + '/mo payment is also too low. Raise your monthly payment above ' + fmt(iM * B + 1) + ' to start reducing the principal.' };
        } else if (min.runaway) {
          insight = { tone: 'warning', icon: 'fa-triangle-exclamation', headline: 'Minimum payments will never clear this balance.', detail: 'At ' + minPct + '% minimums the payment does not cover the ' + fmt(iM * B) + ' monthly interest, so the balance grows forever. Your fixed ' + fmt(P) + '/mo payment pays it off in ' + yrs(fix.months) + ' with ' + fmt(fix.totalInterest) + ' in interest.' };
        } else if (fix.runaway) {
          insight = { tone: 'warning', icon: 'fa-triangle-exclamation', headline: 'Your fixed payment is too low to pay off the balance.', detail: 'Paying ' + fmt(P) + '/mo does not cover the monthly interest of ' + fmt(iM * B) + '. Increase it above that break-even. For comparison, paying only the minimum (' + minPct + '%) takes ' + yrs(min.months) + ' and costs ' + fmt(min.totalInterest) + ' in interest.' };
        } else {
          const saved = roundTo(min.totalInterest - fix.totalInterest, 2);
          insight = { tone: 'positive', icon: 'fa-circle-check', headline: 'Paying ' + fmt(P) + '/mo saves ' + fmt(saved) + ' in interest and ' + yrs(min.months - fix.months) + ' vs minimums.', detail: 'Minimum payments of ' + minPct + '% take ' + yrs(min.months) + ' and cost ' + fmt(min.totalInterest) + ' in interest. Your fixed payment clears it in ' + yrs(fix.months) + ' for ' + fmt(fix.totalInterest) + ' — interest is ' + pctOf(fix.totalInterest, B) + ' of principal instead of ' + pctOf(min.totalInterest, B) + '.' };
        }
        return { stats, bars, chart, table, insight };
      }
      if (curMode === 'target-date') {
        if (B <= 0) return errorResult('Enter a credit card balance greater than $0.');
        const t = Math.round(safeNum(v.target_months, 24));
        if (t < 1) return errorResult('Target timeframe must be at least 1 month.');
        const P = reqPmt(B, iM, t);
        const sim = simFixed(B, iM, P);
        const totalPaid = roundTo(P * sim.months, 2);
        const totalInterest = roundTo(totalPaid - B, 2);
        const debtFree = addMonths(new Date(), t);
        const breakEven = iM * B;
        const stats = [
          { label: 'Required Monthly Payment', value: fmt(P), highlight: true },
          { label: 'Total Interest', value: fmt(totalInterest), warn: totalInterest > 0 },
          { label: 'Total Paid', value: fmt(totalPaid) },
          { label: 'Debt-Free Date', value: fmtDate(debtFree), highlight: true },
          { label: 'Target Timeframe', value: t + ' months (' + yrs(t) + ')' },
          { label: 'Monthly Interest (now)', value: fmt(breakEven) },
        ];
        const bars = [
          { label: 'Required Payment', value: P, target: Math.max(P, breakEven) + 1, color: '#10B981', caption: fmt(P) + '/mo' },
          { label: 'Interest-Only Break-Even', value: breakEven, target: Math.max(P, breakEven) + 1, color: '#F59E0B', caption: fmt(breakEven) + '/mo' },
        ];
        const sFix = samplePath(sim.path, 30);
        const chart = { type: 'line', labels: sFix.map(p => 'Mo ' + p.m), yLabel: 'Balance ($)', title: 'Path to Debt-Free in ' + t + ' Months',
          datasets: [ { label: 'Balance', data: sFix.map(p => p.b), color: '#6366F1', fill: true } ] };
        const table = scheduleTable(sim.path, iM, P);
        const insight = { tone: 'positive', icon: 'fa-bullseye', headline: 'Pay ' + fmt(P) + '/mo to be 100% debt-free by ' + fmtDate(debtFree) + '.', detail: 'To eliminate the full ' + fmt(B) + ' balance in ' + t + ' months (' + yrs(t) + '), pay ' + fmt(P) + ' per month - ' + fmt(P - breakEven) + ' above the ' + fmt(breakEven) + ' monthly interest break-even. Total interest cost: ' + fmt(totalInterest) + '.' };
        return { stats, bars, chart, table, insight };
      }
      if (curMode === 'balance-transfer') {
        if (B <= 0) return errorResult('Enter a credit card balance greater than $0.');
        const feePct = safeNum(v.transfer_fee, 3);
        const promo = Math.round(safeNum(v.promo_months, 18));
        const P = safeNum(v.monthly_payment, 0);
        const fee = roundTo(B * feePct / 100, 2);
        const newBal = roundTo(B + fee, 2);
        const reqPay = reqPmt(newBal, 0, promo);
        const stay = simFixed(B, iM, P);
        const stayMonths = stay.runaway ? 9999 : stay.months;
        const stayInterest = stay.runaway ? 99999 : stay.totalInterest;
        const promoInterest = promo * iM * B;
        const netSavings = roundTo(stayInterest - fee - promoInterest, 2);
        const stats = [
          { label: 'Transfer Fee', value: fmt(fee), warn: true },
          { label: 'New Balance (incl. fee)', value: fmt(newBal) },
          { label: 'Stay-Card Interest (if no promo)', value: stay.runaway ? 'Runaway' : fmt(stayInterest), warn: true },
          { label: 'Net Savings (approx)', value: netSavings > 0 ? fmt(netSavings) : '$0' },
          { label: 'Promo Duration', value: promo + ' months' },
          { label: 'Required Promo Payment', value: fmt(roundTo(reqPay, 2)), highlight: true },
        ];
        const bars = [
          { label: 'Transfer Fee', value: fee, target: Math.max(fee, newBal) + 1, color: '#EF4444', caption: fmt(fee) },
          { label: 'Stay-Card Interest (promo window)', value: Math.min(promoInterest, stayInterest), target: Math.max(fee, promoInterest, stayInterest, 1) + 1, color: '#EF4444', caption: fmt(Math.min(promoInterest, stayInterest)) },
          { label: 'Net Savings', value: Math.max(netSavings, 0), target: Math.max(netSavings, fee, 1) + 1, color: '#10B981', caption: fmt(Math.max(netSavings, 0)) },
        ];
        const labels = [], dataStay = [], dataTransfer = [];
        for (let i = 0; i <= promo; i++) {
          labels.push('Mo ' + i);
          const s = i === 0 ? B : Math.max(0, B - P * i + i * iM * B);
          dataStay.push(roundTo(s, 2));
          dataTransfer.push(roundTo(Math.max(0, newBal - reqPay * i), 2));
        }
        const chart = { type: 'line', labels, yLabel: 'Balance ($)', title: 'Current Card vs Transfer (Promo Period)',
          datasets: [ { label: 'Current Card (' + fmt(APR) + '% APR)', data: dataStay, color: '#EF4444' }, { label: 'Transfer (' + feePct + '% fee, 0% APR)', data: dataTransfer, color: '#10B981' } ] };
        const table = { mode: 'schedule', title: 'Break-Even & Promo Analysis', columns: [
          { key: 'month', label: 'Month', format: 'text' },
          { key: 'current', label: 'Current Balance', format: 'currency' },
          { key: 'transferred', label: 'Transfer Balance', format: 'currency', emphasis: true },
          { key: 'delta', label: 'Difference', format: 'currency' },
        ], rows: labels.map((l, i) => ({ month: l, current: dataStay[i], transferred: dataTransfer[i], delta: fmt(roundTo(dataStay[i] - dataTransfer[i], 2)) })) };
        let insight;
        if (P <= 0) {
          insight = { tone: 'warning', icon: 'fa-triangle-exclamation', headline: 'Enter the monthly payment you can afford.', detail: 'The critical number: pay at least ' + fmt(roundTo(reqPay, 2)) + '/mo to clear the ' + fmt(newBal) + ' balance (including the ' + feePct + '% fee) before the ' + promo + '-month promo ends.' };
        } else if (P < reqPay) {
          const leftover = roundTo(newBal - reqPay * promo, 2);
          insight = { tone: 'warning', icon: 'fa-triangle-exclamation', headline: 'At ' + fmt(P) + '/mo you will not clear the promo period.', detail: 'You need at least ' + fmt(reqPay) + '/mo to zero the balance before interest reverts. At ' + fmt(P) + '/mo roughly ' + fmt(leftover) + ' would remain on the card when the 0% APR expires, exposing it to ' + fmt(APR) + '% APR again.' };
        } else {
          const ideal = feePct <= 3 && promo >= 15;
          insight = { tone: ideal ? 'positive' : 'neutral', icon: 'fa-circle-check', headline: 'Net savings of up to ' + fmt(netSavings) + ' if you clear the balance in time.', detail: feePct <= 3 ? 'The ' + feePct + '% fee is low. Pay at least ' + fmt(reqPay) + '/mo to clear the ' + fmt(newBal) + ' before the ' + promo + ' months are up. Do not miss the deadline or the ' + fmt(APR) + '% APR kicks back in.' : 'With a ' + feePct + '% fee, run the numbers carefully. The transfer still wins only if the saved interest exceeds ' + fmt(fee) + ' and you clear the balance within ' + promo + ' months.' };
        }
        return { stats, bars, chart, table, insight };
      }
      if (curMode === 'avalanche-snowball') {
        if (B <= 0) return errorResult('Enter a total credit card balance greater than $0.');
        const minPct = safeNum(v.min_pct, 2.5);
        const P = safeNum(v.monthly_payment, 0);

        function simulateStrategy(order) {
          const b1 = roundTo(B * 0.55, 2), r1 = iM;
          const b2 = roundTo(B - b1, 2), r2 = roundTo(iM * 0.85, 2);
          const min1 = Math.max(FLOOR, b1 * minPct / 100);
          const min2 = Math.max(FLOOR, b2 * minPct / 100);
          const highIdx = r1 >= r2 ? 0 : 1;
          const smallIdx = b1 <= b2 ? 0 : 1;
          const target = order === 'avalanche' ? highIdx : smallIdx;
          let bal = [b1, b2], m = 0, ti = 0;
          const snaps = [{ m: 0, total: B }];
          while ((bal[0] > 0.005 || bal[1] > 0.005) && m < 1200) {
            const i0 = bal[0] * r1, i1 = bal[1] * r2;
            ti += i0 + i1;
            const mins = [Math.max(FLOOR, bal[0] * minPct / 100), Math.max(FLOOR, bal[1] * minPct / 100)];
            const minsTotal = mins[0] + mins[1];
            const extra = Math.max(0, P - minsTotal);
            const idx = target;
            const oth = 1 - idx;
            const ir = idx === 0 ? i0 : i1;
            const payHere = Math.min(bal[idx] + ir, mins[idx] + extra);
            const remaining = extra - Math.max(0, payHere - mins[idx]);
            bal[idx] = Math.max(0, bal[idx] + ir - payHere);
            bal[oth] = Math.max(0, bal[oth] + (oth === 0 ? i0 : i1) - mins[oth]);
            if (bal[oth] > 0.005 && remaining > 0) {
              const extraOth = Math.min(remaining, bal[oth]);
              bal[oth] = Math.max(0, bal[oth] - extraOth);
            }
            m++;
            if (m % 2 === 0) snaps.push({ m, total: roundTo(bal[0] + bal[1], 2) });
          }
          return { months: m, totalInterest: roundTo(ti, 2), snapshots: snaps };
        }

        const avalanche = simulateStrategy('avalanche');
        const snowball = simulateStrategy('snowball');
        const interestSaved = roundTo(snowball.totalInterest - avalanche.totalInterest, 2);
        const timeSaved = snowball.months - avalanche.months;
        const maxInt = Math.max(avalanche.totalInterest, snowball.totalInterest, 1) + 1;
        const stats = [
          { label: 'Avalanche Interest', value: fmt(avalanche.totalInterest) },
          { label: 'Snowball Interest', value: fmt(snowball.totalInterest), warn: true },
          { label: 'Interest Saved', value: fmt(interestSaved), highlight: true },
          { label: 'Avalanche Months', value: avalanche.months + ' mo' },
          { label: 'Snowball Months', value: snowball.months + ' mo' },
          { label: 'Time Saved', value: timeSaved + ' mo', highlight: true },
        ];
        const bars = [
          { label: 'Avalanche Interest', value: avalanche.totalInterest, target: maxInt, color: '#10B981', caption: fmt(avalanche.totalInterest) },
          { label: 'Snowball Interest', value: snowball.totalInterest, target: maxInt, color: '#F59E0B', caption: fmt(snowball.totalInterest) },
        ];
        const maxM = Math.max(avalanche.snapshots[avalanche.snapshots.length - 1].m, snowball.snapshots[snowball.snapshots.length - 1].m, 1);
        const labels = [], dataA = [], dataS = [];
        for (let m = 0; m <= maxM; m += 2) {
          labels.push('Mo ' + m);
          const a = avalanche.snapshots.find(s => s.m >= m);
          dataA.push(a ? a.total : 0);
          const s = snowball.snapshots.find(s => s.m >= m);
          dataS.push(s ? s.total : 0);
        }
        const chart = { type: 'line', labels, yLabel: 'Total Balance ($)', title: 'Avalanche vs Snowball Balance Over Time',
          datasets: [ { label: 'Avalanche', data: dataA, color: '#10B981' }, { label: 'Snowball', data: dataS, color: '#F59E0B' } ] };
        const table = { mode: 'schedule', title: 'Strategy Comparison', columns: [
          { key: 'period', label: 'Month', format: 'text' },
          { key: 'avalanche', label: 'Avalanche Balance', format: 'currency' },
          { key: 'snowball', label: 'Snowball Balance', format: 'currency' },
          { key: 'diff', label: 'Difference', format: 'currency', emphasis: true },
        ], rows: labels.map((l, i) => ({ period: l, avalanche: dataA[i], snowball: dataS[i], diff: fmt(roundTo((dataS[i] || 0) - (dataA[i] || 0), 2)) })) };
        const insight = { tone: 'positive', icon: 'fa-scale-balanced', headline: 'Debt Avalanche saves ' + fmt(interestSaved) + ' in interest vs Snowball.', detail: 'Both methods require ' + fmt(P) + '/mo and pay minimums on every card. The Avalanche targets the higher-APR card first and wins on interest. The Snowball targets the smaller balance first for a quicker win but costs more interest over a nearly identical timeline.' };
        return { stats, bars, chart, table, insight };
      }
      return errorResult('Unknown mode selected.');
    },
    howTo: [
      'Pick a Strategy Mode — each reveals a different cost of carrying debt: the minimum-payment trap, a target debt-free date, a 0% balance transfer, or Avalanche vs Snowball.',
      'Enter your total credit card balance and APR. Only the inputs the selected mode needs will appear.',
      'For minimum-payment and strategy modes, set your minimum payment % and the monthly amount you can actually pay.',
      'Read the insight callout for the plain-language verdict, then review the stat tiles, comparison bars, and payoff schedule.',
      'Adjust the monthly payment or target timeframe to see exactly how much interest and time you can cut.',
    ],
    examples: [
      { title: 'The minimum-payment trap', input: 'Balance $7,500, APR 21.5%, Min 2.5%, Pay $250/mo', result: 'Minimums take decades and cost thousands in interest; a fixed $250/mo payment clears it in ~3 years and saves thousands.' },
      { title: 'Target debt-free in 24 months', input: 'Balance $7,500, APR 21.5%, Goal 24 months', result: 'Required payment ~$391/mo to be 100% debt-free in 2 years.' },
      { title: 'Is a 0% balance transfer worth it?', input: 'Balance $7,500, APR 21.5%, Pay $250/mo, 3% fee, 18-mo promo', result: 'Net savings after the upfront fee, plus the ~$417/mo needed to clear the balance before the promo expires.' },
      { title: 'Avalanche beats Snowball on interest', input: 'Total $7,500, APR 21.5%, Min 2.5%, Budget $300/mo', result: 'Avalanche saves more in interest than Snowball for a near-identical payoff timeline.' },
    ],
    formula: 'Daily periodic rate: i_daily = APR / 365 | Monthly factor (daily compounding): i_month = (1 + i_daily)^30 - 1 | Monthly interest: I = Balance x i_month | Fixed payoff payment: PMT = (B x i_month) / (1 - (1 + i_month)^-n) | Transfer fee: Fee = B x (transferFee% / 100) | Net transfer savings = Interest(stay) - Fee - Interest(post-promo) | Minimum payment: max($25 floor, Balance x minPct%)',
    article: {
      heading: 'Breaking Credit Card Debt: Minimum Payment Traps, APR Math & Payoff Strategies',
      intro: "Carrying a high-APR credit card balance compounds aggressively against you. Because most cards accrue interest daily, every day you carry a balance adds to the principal that next month's interest is charged on. Minimum payment structures are engineered by lenders to keep borrowers paying for decades — often costing more in interest than the original purchase. Strategic payoff planning reverses that drag. The GetCalcu Credit Card Payoff Calculator models the exact math behind your balance and exposes four high-leverage strategies: escaping the minimum-payment trap, hitting a target debt-free date, evaluating a 0% APR balance transfer, and comparing the Debt Avalanche versus Debt Snowball methods.",
      sections: [
        { heading: 'How credit card interest actually compounds', body: 'Credit cards use a daily periodic rate: i_daily = APR ÷ 365. Interest accrues each day, so the effective monthly rate is i_month = (1 + i_daily)^30 - 1 — slightly higher than simply dividing the APR by 12. Each month, interest is added to your balance before your payment is applied; whatever remains rolls forward and is charged interest again. This is why a payment that barely covers interest makes almost no progress on the principal.' },
        { heading: 'The minimum payment trap, quantified', body: 'A minimum payment is usually 2%-3% of the balance (with a $25 floor). On a $7,500 balance at 21.5% APR, the minimum starts near $188 while the monthly interest is about $128, so only roughly $60 reduces principal. As the balance shrinks the minimum shrinks too, stretching payoff to 25-30 years and pushing total interest past the original balance. Paying a fixed amount instead of the declining minimum collapses that timeline.' },
        { heading: 'Solving for a target debt-free date', body: "To be debt-free in exactly n months, solve the amortization formula for the payment: PMT = (B × i_month) ÷ (1 − (1 + i_month)^−n). This is the payment that, applied every month, drives the balance to exactly zero at month n. It must exceed the first month's interest (the break-even) or the balance never declines." },
        { heading: 'Are 0% APR balance transfers worth the fee?', body: 'A transfer charges an upfront fee of 3%-5% of the balance but sets interest to 0% for a promotional window (often 12-21 months). The transfer wins when the interest you would have paid on the current card exceeds the fee plus any residual interest after the promo. The critical number is the payment needed to clear the balance before the promo ends: Balance ÷ promo months. Fall short and the leftover reverts to a high regular APR.' },
        { heading: 'Debt Avalanche vs Debt Snowball', body: 'Both methods pay minimums on every card, then funnel all extra cash at one target card. The Debt Avalanche targets the highest-APR card first — mathematically optimal, it minimizes total interest. The Debt Snowball targets the smallest balance first — it costs slightly more interest but delivers quicker psychological wins as cards disappear, which raises the odds of sticking with the plan. With multiple cards, the Avalanche typically saves hundreds more for a near-identical timeline.' },
      ],
    },
    faqs: [
      { q: 'How long does it take to pay off a credit card by making minimum payments?', a: 'Paying only the minimum on a typical credit card (2% to 3% of balance at 21% APR) can take between 15 and 30 years to fully clear, resulting in interest costs that often exceed the original principal. Use the minimum-payment mode to see your exact timeline.' },
      { q: 'What is the difference between the Debt Avalanche and Debt Snowball payoff methods?', a: 'The Debt Avalanche method targets cards with the highest APR first to minimize total interest cost. The Debt Snowball method targets the smallest balance first to build momentum through quick psychological wins. The Avalanche typically saves more in interest; the Snowball can improve adherence for some borrowers.' },
      { q: 'Is a 0% APR balance transfer worth the upfront transfer fee?', a: 'Yes, provided the interest saved over the promotional period (usually 12 to 21 months) significantly exceeds the 3% to 5% upfront transfer fee, and the balance is paid off before the promo period ends. If any balance remains when the promo expires, it is typically charged the full regular APR from the original transfer date.' },
      { q: 'What is the "minimum payment trap"?', a: 'The minimum-payment trap describes how small minimum payments (often 2%-3% of balance with a $25 floor) barely cover monthly interest, causing the principal to decline extremely slowly. On a $7,500 balance at 21.5% APR, paying only the minimum can stretch payoff to decades and cost more in interest than the original purchase.' },
      { q: 'How do I calculate the exact monthly payment needed to be debt-free by a target date?', a: 'Solve the amortization formula for the payment: PMT = (B × i_month) ÷ (1 − (1 + i_month)^−n). This payment, applied every month, drives the balance to exactly zero at month n. It must exceed the first month\'s interest break-even or the balance never declines.' },
    ],
  },

  // ── Rent vs Buy Calculator ─────────────────────────────────────
  'rent-vs-buy-calculator': {
    name: 'Rent vs. Buy Calculator',
    category: 'Finance',
    icon: 'fa-house-chimney',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Comprehensive financial comparison of renting versus buying a home. Calculate net costs, equity buildup, break-even points, opportunity costs, and net worth over time with intelligent recommendations.',
    metaTitle: 'Rent vs Buy Calculator | Break-Even Analysis & Net Worth Comparison — GetCalcu',
    metaDescription: 'Free Rent vs Buy Calculator with break-even analysis, net worth comparison, equity buildup, opportunity cost, and intelligent recommendations. Should you rent or buy?',
    keywords: [
      'rent vs buy calculator',
      'should I rent or buy',
      'rent vs buy break-even calculator',
      'buy vs rent calculator',
      'house buying calculator',
      'renting versus owning',
      'opportunity cost calculator',
      'rent or buy decision',
      'home buying vs renting',
      'rent vs buy 2026',
      'is it better to rent or buy',
      'home equity calculator',
      'rent vs buy net worth',
      'buying a house vs renting calculator',
    ],
    related: [
      'house-affordability-calculator',
      'mortgage-calculator',
      'amortization-calculator',
      'budget-planner',
      'retirement-calculator',
      'savings-calculator',
      'investment-calculator',
      'compound-interest-calculator',
      'inflation-calculator',
    ],
    fields: [
      // ── Basic Inputs ──
      { id: 'basic_section', type: 'section', label: 'Basic Inputs', icon: 'fa-sliders' },
      { id: 'home_price', label: 'Home Purchase Price ($)', type: 'range', default: 450000, min: 50000, max: 5000000, step: 5000, hint: 'The total purchase price of the home you are considering buying.' },
      { id: 'down_payment_type', label: 'Down Payment Mode', type: 'select', default: 'percent',
        options: [
          { value: 'percent', label: 'Percentage (%)' },
          { value: 'dollar', label: 'Dollar Amount ($)' },
        ], hint: 'Switch between entering your down payment as a percentage or a specific dollar amount.' },
      { id: 'down_payment', label: 'Down Payment', type: 'range', default: 20, min: 0, max: 100, step: 0.5, hint: 'The cash you pay upfront. 20% is standard to avoid PMI. The calculator converts this to a dollar amount based on the home price.' },
      { id: 'mortgage_rate', label: 'Mortgage Interest Rate (%)', type: 'range', default: 6.25, min: 0, max: 20, step: 0.05, hint: 'The annual interest rate (APR) on your mortgage. Current 30-year fixed rates typically range 6-8%.' },
      { id: 'loan_term', label: 'Loan Term', type: 'select', default: 30,
        options: [
          { value: 15, label: '15 Years' },
          { value: 20, label: '20 Years' },
          { value: 30, label: '30 Years' },
        ], hint: 'How long you will take to repay the mortgage. Shorter terms build equity faster but have higher monthly payments.' },
      { id: 'current_rent', label: 'Current Monthly Rent ($)', type: 'range', default: 2200, min: 0, max: 20000, step: 50, hint: 'What you currently pay (or would pay) for rent each month.' },
      { id: 'years_staying', label: 'Expected Years Staying in the Home', type: 'range', default: 8, min: 1, max: 40, step: 1, hint: 'This is one of the most influential variables. Buying has high upfront costs that take several years to recover. The longer you stay, the more equity you build and the more buying tends to win. If you plan to move within 3-5 years, renting is often cheaper.' },
      { id: 'rent_increase', label: 'Expected Annual Rent Increase (%)', type: 'range', default: 3.0, min: 0, max: 15, step: 0.1, hint: 'The average yearly percentage increase in rent. Historical average is about 2-4% annually.' },
      { id: 'home_appreciation', label: 'Expected Home Appreciation (%)', type: 'range', default: 3.5, min: -5, max: 15, step: 0.1, hint: 'Expected annual increase in home value. Historical US average is about 3-5% per year.' },
      { id: 'investment_return', label: 'Expected Investment Return (%)', type: 'range', default: 7.0, min: 0, max: 20, step: 0.1, hint: 'The annual return you could earn by investing your down payment and closing costs instead of buying. S&P 500 long-term average: 7-10%.' },

      // ── Advanced Options (collapsible) ──
      { id: 'advanced_section', type: 'section', label: 'Advanced Options', icon: 'fa-gear', collapsible: true },
      { id: 'property_tax', label: 'Annual Property Tax ($)', type: 'number', default: 5400, min: 0, step: 100, hint: 'Yearly property tax based on your local government rate. Typically 1-2% of home value annually.' },
      { id: 'property_tax_growth', label: 'Property Tax Growth (%)', type: 'number', default: 2.0, min: 0, max: 10, step: 0.1, hint: 'Annual increase in property taxes. Often matches or exceeds inflation.' },
      { id: 'home_insurance', label: 'Annual Home Insurance ($)', type: 'number', default: 1400, min: 0, step: 100, hint: 'Yearly homeowners insurance premium. Covers damage, liability, and personal property.' },
      { id: 'insurance_growth', label: 'Insurance Growth (%)', type: 'number', default: 3.0, min: 0, max: 10, step: 0.1, hint: 'Annual increase in home insurance premiums.' },
      { id: 'hoa_fees', label: 'Monthly HOA Fees ($)', type: 'number', default: 0, min: 0, step: 25, hint: 'Monthly homeowners association fees for common area maintenance (condos, townhomes, some neighborhoods).' },
      { id: 'pmi', label: 'Monthly PMI ($)', type: 'number', default: 0, min: 0, step: 10, hint: 'Private Mortgage Insurance when down payment is less than 20%. Typically 0.5-1% of loan amount annually, divided by 12.' },
      { id: 'annual_maintenance', label: 'Annual Maintenance ($)', type: 'number', default: 4500, min: 0, step: 100, hint: 'Estimated yearly maintenance and repairs. A common rule is 1-2% of home value annually.' },
      { id: 'maintenance_growth', label: 'Maintenance Growth (%)', type: 'number', default: 2.5, min: 0, max: 10, step: 0.1, hint: 'Annual increase in maintenance costs as the home ages.' },
      { id: 'closing_costs', label: 'Closing Costs ($)', type: 'number', default: 13500, min: 0, step: 500, hint: 'One-time costs when buying: loan origination, appraisal, title insurance, attorney fees. Typically 2-5% of home price.' },
      { id: 'selling_costs', label: 'Selling Costs (%)', type: 'number', default: 6.0, min: 0, max: 15, step: 0.1, hint: 'Costs when selling: realtor commission (typically 5-6%), closing fees, capital gains tax if applicable.' },
      { id: 'mortgage_origination', label: 'Mortgage Origination Fee (%)', type: 'number', default: 1.0, min: 0, max: 5, step: 0.1, hint: 'Lender fee for processing the mortgage, typically 0.5-1.5% of loan amount.' },
      { id: 'inflation_rate', label: 'Annual Inflation Rate (%)', type: 'number', default: 3.0, min: 0, max: 10, step: 0.1, hint: 'Expected annual inflation rate. Affects future costs and the real value of money over time.' },
      { id: 'discount_rate', label: 'Discount Rate (%)', type: 'number', default: 3.0, min: 0, max: 15, step: 0.1, hint: 'The rate used to discount future cash flows to present value. Often set near the inflation rate for a real-terms comparison.' },
      { id: 'realtor_commission', label: 'Realtor Commission (%)', type: 'number', default: 5.0, min: 0, max: 10, step: 0.1, hint: 'The portion of the sale price paid to real estate agents when selling. Typically 5-6%.' },
      { id: 'misc_ownership', label: 'Miscellaneous Ownership Costs ($/yr)', type: 'number', default: 500, min: 0, step: 100, hint: 'Other annual ownership costs: pest control, landscaping, appliance repairs, etc.' },
      { id: 'investment_tax_rate', label: 'Investment Tax Rate (%)', type: 'number', default: 15, min: 0, max: 50, step: 1, hint: 'Tax rate on investment gains (capital gains tax). Long-term gains are typically 15% for most investors.' },
      { id: 'marginal_tax_rate', label: 'Marginal Tax Rate (%)', type: 'number', default: 24, min: 0, max: 50, step: 1, hint: 'Your federal + state marginal tax bracket. Affects the tax deductibility of mortgage interest.' },
      { id: 'renters_insurance', label: 'Annual Renters Insurance ($)', type: 'number', default: 200, min: 0, step: 50, hint: 'Yearly renters insurance to cover personal belongings and liability while renting.' },
      { id: 'moving_costs', label: 'Expected Moving Costs ($)', type: 'number', default: 2000, min: 0, step: 500, hint: 'One-time moving expenses if you buy. Includes movers, truck rental, packing supplies.' },
    ],
    fieldLabels(v) {
      if (v.down_payment_type === 'dollar') {
        return { down_payment: 'Down Payment ($)' };
      }
      return {};
    },
    calculate(v) {
      // ── Extract and validate inputs ──
      const homePrice = safeNum(v.home_price, 0);
      if (homePrice <= 0) return errorResult('Please enter a valid home purchase price.');

      const downPaymentType = safeStr(v.down_payment_type);
      let downPayment;
      if (downPaymentType === 'dollar') {
        downPayment = safeNum(v.down_payment, 0);
      } else {
        const downPct = safeNum(v.down_payment, 20) / 100;
        downPayment = homePrice * downPct;
      }
      downPayment = Math.min(downPayment, homePrice);

      const mortgageRate = safeNum(v.mortgage_rate, 6.25) / 100;
      const loanTerm = Math.round(safeNum(v.loan_term, 30));
      const loanAmount = homePrice - downPayment;
      const monthlyRate = mortgageRate / 12;
      const numPayments = loanTerm * 12;

      // Ownership costs with growth
      const annualPropertyTax = safeNum(v.property_tax, 0);
      const annualHomeInsurance = safeNum(v.home_insurance, 0);
      const annualMaintenance = safeNum(v.annual_maintenance, 0);
      const propertyTaxGrowth = safeNum(v.property_tax_growth, 2) / 100;
      const insuranceGrowth = safeNum(v.insurance_growth, 3) / 100;
      const maintenanceGrowth = safeNum(v.maintenance_growth, 2.5) / 100;
      const miscOwnership = safeNum(v.misc_ownership, 0);

      // Rent parameters
      const currentRent = safeNum(v.current_rent, 0);
      const rentIncrease = safeNum(v.rent_increase, 3) / 100;
      const rentersInsurance = safeNum(v.renters_insurance, 200);

      // Investment & market parameters
      const homeAppreciation = safeNum(v.home_appreciation, 3.5) / 100;
      const investmentReturn = safeNum(v.investment_return, 7) / 100;
      const investmentTaxRate = safeNum(v.investment_tax_rate, 15) / 100;
      const marginalTaxRate = safeNum(v.marginal_tax_rate, 24) / 100;
      const inflationRate = safeNum(v.inflation_rate, 3) / 100;
      const discountRate = safeNum(v.discount_rate, 3) / 100;

      // Costs
      const closingCosts = safeNum(v.closing_costs, 0);
      const sellingCostsPct = safeNum(v.selling_costs, 6) / 100;
      const realtorCommission = safeNum(v.realtor_commission, 5) / 100;
      const monthlyHOA = safeNum(v.hoa_fees, 0);
      const monthlyPMI = safeNum(v.pmi, 0);
      const mortgageOrigination = safeNum(v.mortgage_origination, 1) / 100;
      const movingCosts = safeNum(v.moving_costs, 0);

      const analysisPeriod = Math.max(1, Math.round(safeNum(v.years_staying, 8)));

      // ── Calculate monthly mortgage payment (P&I) ──
      let monthlyPI;
      if (monthlyRate === 0) {
        monthlyPI = loanAmount / numPayments;
      } else {
        monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      }
      monthlyPI = roundTo(monthlyPI, 2);

      // ── Year-by-year calculations ──
      const buyData = [];
      const rentData = [];
      let breakEvenYear = null;

      let remainingBalance = loanAmount;
      let totalInterestPaid = 0;
      let totalPrincipalPaid = 0;
      let totalPropertyTaxPaid = 0;
      let totalInsurancePaid = 0;
      let totalMaintenancePaid = 0;
      let totalHOAPaid = 0;
      let totalPMIPaid = 0;
      let totalMiscPaid = 0;
      let totalClosingCosts = closingCosts + movingCosts + (loanAmount * mortgageOrigination);

      // Investment portfolio for the renter (down payment + closing costs + moving costs invested)
      let investmentBalance = downPayment + closingCosts + movingCosts + (loanAmount * mortgageOrigination);
      let totalInvestedCapital = investmentBalance;
      let totalInvestmentGains = 0;
      let totalMonthlySavingsInvested = 0;

      let currentRentMonthly = currentRent;
      let totalRentPaid = 0;
      let totalRentersInsurancePaid = 0;

      // Track monthly cash-flow savings invested by the renter
      let renterMonthlySavings = 0;

      for (let year = 1; year <= analysisPeriod; year++) {
        // ── BUYING CALCULATIONS ──
        let yearInterest = 0;
        let yearPrincipal = 0;
        let yearPropertyTax = annualPropertyTax * Math.pow(1 + propertyTaxGrowth, year - 1);
        let yearInsurance = annualHomeInsurance * Math.pow(1 + insuranceGrowth, year - 1);
        let yearMaintenance = annualMaintenance * Math.pow(1 + maintenanceGrowth, year - 1);
        let yearHOA = monthlyHOA * 12;
        let yearPMI = monthlyPMI * 12;
        let yearMisc = miscOwnership;

        // Calculate mortgage payments for this year (12 months)
        for (let month = 0; month < 12 && remainingBalance > 0; month++) {
          const interestPayment = remainingBalance * monthlyRate;
          let principalPayment = monthlyPI - interestPayment;
          if (principalPayment > remainingBalance) principalPayment = remainingBalance;
          yearInterest += interestPayment;
          yearPrincipal += principalPayment;
          remainingBalance -= principalPayment;
        }
        remainingBalance = Math.max(0, remainingBalance);

        totalInterestPaid += yearInterest;
        totalPrincipalPaid += yearPrincipal;
        totalPropertyTaxPaid += yearPropertyTax;
        totalInsurancePaid += yearInsurance;
        totalMaintenancePaid += yearMaintenance;
        totalHOAPaid += yearHOA;
        totalPMIPaid += yearPMI;
        totalMiscPaid += yearMisc;

        // Home value and equity
        const homeValue = homePrice * Math.pow(1 + homeAppreciation, year);
        const equity = homeValue - remainingBalance;

        // Selling costs (realtor commission + closing fees)
        const sellingCosts = homeValue * (sellingCostsPct + realtorCommission);
        const netProceeds = equity - sellingCosts;

        // Total buying cash outflow this year (P&I + taxes + insurance + maintenance + HOA + PMI + misc)
        const totalBuyingCost = yearPrincipal + yearInterest + yearPropertyTax + yearInsurance + yearMaintenance + yearHOA + yearPMI + yearMisc;

        // ── RENTING CALCULATIONS ──
        const yearRent = currentRentMonthly * 12;
        totalRentPaid += yearRent;
        totalRentersInsurancePaid += rentersInsurance;
        const totalRentingCost = yearRent + rentersInsurance;

        // Monthly cash-flow difference: if renting costs less than owning, invest the savings
        const monthlyBuyCost = totalBuyingCost / 12;
        const monthlyRentCost = totalRentingCost / 12;
        const monthlyDiff = monthlyRentCost - monthlyBuyCost;
        if (monthlyDiff > 0) {
          renterMonthlySavings += monthlyDiff;
          totalMonthlySavingsInvested += monthlyDiff;
        }

        // Increase rent for next year
        currentRentMonthly *= (1 + rentIncrease);

        // ── INVESTMENT OPPORTUNITY COST ──
        // Down payment + closing costs + moving costs + origination invested at investmentReturn
        const grossInvestment = investmentBalance * Math.pow(1 + investmentReturn, year);
        const gainsBeforeTax = grossInvestment - investmentBalance;
        const taxOnGains = gainsBeforeTax * investmentTaxRate;
        const netInvestmentValue = grossInvestment - taxOnGains;
        totalInvestmentGains = netInvestmentValue - investmentBalance;

        // ── NET WORTH CALCULATIONS ──
        // Buyer net worth = home equity - cumulative ownership costs (excluding principal which builds equity)
        // Selling costs are only meaningful when you actually sell (final year)
        const sellingCostsThisYear = (year === analysisPeriod) ? sellingCosts : 0;
        const buyingNetWorth = equity - (totalInterestPaid + totalPropertyTaxPaid + totalInsurancePaid + totalMaintenancePaid + totalHOAPaid + totalPMIPaid + totalMiscPaid + totalClosingCosts + sellingCostsThisYear);
        // Renter net worth = investment portfolio value - cumulative rent costs
        const rentingNetWorth = netInvestmentValue - (totalRentPaid + totalRentersInsurancePaid);

        const difference = buyingNetWorth - rentingNetWorth;

        // Track break-even year (when buying net worth exceeds renting)
        if (breakEvenYear === null && difference > 0) {
          breakEvenYear = year;
        }

        buyData.push({
          year,
          rentPaid: 0,
          mortgagePaid: roundTo(totalPrincipalPaid + totalInterestPaid, 2),
          interest: roundTo(totalInterestPaid, 2),
          principal: roundTo(totalPrincipalPaid, 2),
          taxes: roundTo(totalPropertyTaxPaid, 2),
          insurance: roundTo(totalInsurancePaid, 2),
          maintenance: roundTo(totalMaintenancePaid, 2),
          hoa: roundTo(totalHOAPaid, 2),
          pmi: roundTo(totalPMIPaid, 2),
          misc: roundTo(totalMiscPaid, 2),
          homeValue: roundTo(homeValue, 2),
          equity: roundTo(equity, 2),
          netProceeds: roundTo(netProceeds, 2),
          investmentValue: 0,
          netWorth: roundTo(buyingNetWorth, 2),
          difference: roundTo(difference, 2),
        });

        rentData.push({
          year,
          rentPaid: roundTo(totalRentPaid, 2),
          mortgagePaid: 0,
          interest: 0,
          principal: 0,
          taxes: 0,
          insurance: roundTo(totalRentersInsurancePaid, 2),
          maintenance: 0,
          hoa: 0,
          pmi: 0,
          misc: 0,
          homeValue: 0,
          equity: 0,
          netProceeds: 0,
          investmentValue: roundTo(netInvestmentValue, 2),
          netWorth: roundTo(rentingNetWorth, 2),
          difference: roundTo(-difference, 2),
        });
      }

      // ── FINAL TOTALS ──
      const finalBuy = buyData[buyData.length - 1];
      const finalRent = rentData[rentData.length - 1];
      const finalSellingCosts = roundTo(finalBuy.homeValue * (sellingCostsPct + realtorCommission), 2);

      // Net cost of buying = total cash outflows - equity (net proceeds after selling)
      const buyingNetCost = roundTo(
        finalBuy.mortgagePaid + finalBuy.taxes + finalBuy.insurance + finalBuy.maintenance + finalBuy.hoa + finalBuy.pmi + finalBuy.misc + totalClosingCosts + finalSellingCosts - finalBuy.equity,
        2
      );
      // Net cost of renting = total rent + renters insurance - investment portfolio value
      const rentingNetCost = roundTo(finalRent.rentPaid + finalRent.insurance - finalRent.investmentValue, 2);

      // ── GENERATE RECOMMENDATION ──
      const winner = buyingNetCost < rentingNetCost ? 'buy' : 'rent';
      const savingsAmount = roundTo(Math.abs(buyingNetCost - rentingNetCost), 2);

      let confidence, reasons, risks;

      if (winner === 'buy') {
        if (breakEvenYear && breakEvenYear <= 3) {
          confidence = 'High';
          reasons = [
            'Home appreciation exceeds ownership costs over the analysis period.',
            'Principal payments build substantial equity.',
            'Rent inflation significantly increases long-term renting costs.',
            'Break-even achieved within 3 years.',
          ];
          risks = [
            'Selling within 2-3 years may not recover transaction costs.',
            'Unexpected major repairs could temporarily reduce savings.',
            'Market downturns could temporarily reduce home value.',
          ];
        } else if (breakEvenYear && breakEvenYear <= 7) {
          confidence = 'Medium-High';
          reasons = [
            'Buying becomes financially advantageous after the break-even point.',
            'Equity accumulation accelerates over time.',
            'Fixed mortgage payments provide payment stability vs rising rents.',
          ];
          risks = [
            'Break-even takes 3-7 years — plan to stay at least that long.',
            'Selling costs (6%) can erase gains if you move early.',
            'Maintenance costs are unpredictable and can spike.',
          ];
        } else {
          confidence = 'Medium';
          reasons = [
            'Long-term ownership builds equity and wealth.',
            'Appreciation and compound growth favor longer time horizons.',
          ];
          risks = [
            'Break-even takes 7+ years — only advisable if you plan to stay long-term.',
            'High upfront costs (down payment, closing costs) take time to recoup.',
            'Consider your job stability and local market conditions.',
          ];
        }
      } else {
        confidence = 'Medium';
        reasons = [
          'Lower upfront costs preserve liquidity and investment capital.',
          'Flexibility to move without selling a property.',
          'No maintenance, property tax, or unexpected repair costs.',
          'Investment returns on down payment capital exceed ownership costs.',
        ];
        risks = [
          'Rent increases over time may outpace investment returns.',
          'No equity buildup — rent payments do not create ownership.',
          'Subject to landlord decisions and rent market fluctuations.',
        ];
      }

      const recommendation = {
        winner,
        confidence,
        savings: fmt(savingsAmount),
        reasons,
        risks,
        breakEvenYear: breakEvenYear ? `Year ${breakEvenYear}` : 'Not within analysis period',
      };

      // ── EXECUTIVE SUMMARY (KPI Dashboard) ──
      const summary = {
        kpis: [
          { label: 'Winner', value: winner === 'buy' ? 'Buying' : 'Renting', highlight: true, color: winner === 'buy' ? '#10B981' : '#6366F1' },
          { label: 'Financial Advantage', value: fmt(savingsAmount), highlight: true },
          { label: 'Break-even Year', value: breakEvenYear ? `Year ${breakEvenYear}` : 'Not reached', highlight: true },
          { label: 'Net Worth Difference', value: fmt(roundTo(Math.abs(finalBuy.netWorth - finalRent.netWorth), 2)) },
          { label: 'Total Housing Cost Diff', value: fmt(roundTo(Math.abs((finalBuy.mortgagePaid + finalBuy.taxes + finalBuy.insurance + finalBuy.maintenance + finalBuy.hoa + finalBuy.pmi + finalBuy.misc) - (finalRent.rentPaid + finalRent.insurance)), 2)) },
        ],
      };

      // ── BUILD OUTPUT STATS ──
      const stats = [
        { label: 'Buying Net Cost', value: fmt(buyingNetCost), warn: winner === 'rent' },
        { label: 'Renting Net Cost', value: fmt(rentingNetCost), warn: winner === 'buy' },
        { label: 'Financial Advantage', value: fmt(savingsAmount), highlight: true },
        { label: 'Break-even Year', value: breakEvenYear ? `Year ${breakEvenYear}` : 'Not within period', highlight: true },
        { label: 'Home Equity', value: fmt(finalBuy.equity) },
        { label: 'Total Interest Paid', value: fmt(finalBuy.interest), warn: true },
        { label: 'Total Principal Paid', value: fmt(finalBuy.principal) },
        { label: 'Property Tax Paid', value: fmt(finalBuy.taxes) },
        { label: 'Insurance Paid', value: fmt(finalBuy.insurance) },
        { label: 'Maintenance Paid', value: fmt(finalBuy.maintenance) },
        { label: 'HOA Total', value: fmt(finalBuy.hoa) },
        { label: 'PMI Total', value: fmt(finalBuy.pmi) },
        { label: 'Selling Costs', value: fmt(finalSellingCosts) },
        { label: 'Investment Portfolio', value: fmt(finalRent.investmentValue) },
        { label: 'Opportunity Cost', value: fmt(roundTo(totalInvestmentGains, 2)) },
        { label: 'Estimated Net Worth', value: fmt(roundTo(finalBuy.netWorth, 2)), highlight: true },
      ];

      // ── BUILD CHARTS ──
      const chartLabels = buyData.map(d => `Year ${d.year}`);
      const netWorthBuyData = buyData.map(d => d.netWorth);
      const netWorthRentData = rentData.map(d => d.netWorth);
      const buyCostData = buyData.map(d => d.mortgagePaid + d.taxes + d.insurance + d.maintenance + d.hoa + d.pmi + d.misc);
      const rentCostData = rentData.map(d => d.rentPaid + d.insurance);
      const equityData = buyData.map(d => d.equity);
      const principalData = buyData.map(d => d.principal);
      const appreciationData = buyData.map(d => roundTo(d.homeValue - homePrice, 2));
      const investmentData = rentData.map(d => d.investmentValue);
      const monthlyBuyCashFlow = buyData.map(d => roundTo((d.mortgagePaid + d.taxes + d.insurance + d.maintenance + d.hoa + d.pmi + d.misc) / d.year, 2));
      const monthlyRentCashFlow = rentData.map(d => roundTo((d.rentPaid + d.insurance) / d.year, 2));

      // Chart 1: Net Worth Over Time
      const chart = {
        type: 'line',
        labels: chartLabels,
        datasets: [
          { label: 'Buying Net Worth', data: netWorthBuyData, color: '#10B981' },
          { label: 'Renting Net Worth', data: netWorthRentData, color: '#6366F1' },
        ],
        yLabel: 'Net Worth ($)',
        title: 'Net Worth Over Time',
      };

      // Chart 2: Cumulative Housing Cost
      const chart2 = {
        type: 'line',
        labels: chartLabels,
        datasets: [
          { label: 'Buying Cumulative Cost', data: buyCostData, color: '#EF4444' },
          { label: 'Renting Cumulative Cost', data: rentCostData, color: '#F59E0B' },
        ],
        yLabel: 'Cumulative Cost ($)',
        title: 'Cumulative Housing Cost',
      };

      // Chart 3: Home Equity Growth (principal + appreciation + total equity)
      const compareChart = {
        type: 'line',
        labels: chartLabels,
        datasets: [
          { label: 'Principal Paid', data: principalData, color: '#3B82F6' },
          { label: 'Appreciation', data: appreciationData, color: '#10B981' },
          { label: 'Total Equity', data: equityData, color: '#8B5CF6' },
        ],
        yLabel: 'Equity ($)',
        title: 'Home Equity Growth',
      };

      // Chart 4: Opportunity Cost Growth (invested cash if renting)
      const chart3 = {
        type: 'line',
        labels: chartLabels,
        datasets: [
          { label: 'Investment Portfolio', data: investmentData, color: '#6366F1' },
          { label: 'Invested Capital', data: investmentData.map(() => totalInvestedCapital), color: '#94A3B8', fill: true },
        ],
        yLabel: 'Investment Value ($)',
        title: 'Opportunity Cost Growth (Renting)',
      };

      // ── BUILD COMPARISON TABLE ──
      const tableRows = buyData.map((b, i) => {
        const r = rentData[i];
        return {
          year: `Year ${b.year}`,
          rentPaid: r.rentPaid,
          mortgagePaid: b.mortgagePaid,
          interest: b.interest,
          principal: b.principal,
          taxes: b.taxes,
          insurance: b.insurance + r.insurance,
          maintenance: b.maintenance,
          homeValue: b.homeValue,
          equity: b.equity,
          investmentValue: r.investmentValue,
          netWorth: roundTo(b.netWorth - r.netWorth, 2),
          difference: b.difference,
        };
      });

      const table = {
        mode: 'comparison',
        title: `Year-by-Year Comparison (${analysisPeriod} Years)`,
        columns: [
          { key: 'year', label: 'Year', format: 'text' },
          { key: 'rentPaid', label: 'Rent Paid', format: 'currency' },
          { key: 'mortgagePaid', label: 'Mortgage Paid', format: 'currency' },
          { key: 'interest', label: 'Interest', format: 'currency' },
          { key: 'principal', label: 'Principal', format: 'currency' },
          { key: 'taxes', label: 'Taxes', format: 'currency' },
          { key: 'insurance', label: 'Insurance', format: 'currency' },
          { key: 'maintenance', label: 'Maintenance', format: 'currency' },
          { key: 'homeValue', label: 'Home Value', format: 'currency' },
          { key: 'equity', label: 'Equity', format: 'currency', emphasis: true },
          { key: 'investmentValue', label: 'Investment Value', format: 'currency' },
          { key: 'netWorth', label: 'Net Worth Diff', format: 'currency', emphasis: true },
          { key: 'difference', label: 'Difference', format: 'currency' },
        ],
        rows: tableRows,
      };

      // ── BUILD INSIGHT ──
      const insightTone = winner === 'buy' ? 'positive' : 'neutral';
      const insightIcon = winner === 'buy' ? 'fa-house' : 'fa-key';
      let insightHeadline, insightDetail;

      if (winner === 'buy') {
        insightHeadline = `Buying is projected to increase your net worth by approximately ${fmt(savingsAmount)} over ${analysisPeriod} years.`;
        insightDetail = `Home appreciation exceeds ownership costs, and principal payments build equity. ${breakEvenYear ? `Break-even occurs in Year ${breakEvenYear}.` : ''} ${confidence === 'High' ? 'This is a strong financial decision if you plan to stay at least 5-7 years.' : 'Consider your time horizon and local market conditions.'}`;
      } else {
        insightHeadline = `Renting is projected to save you approximately ${fmt(savingsAmount)} over ${analysisPeriod} years.`;
        insightDetail = `The opportunity cost of your down payment and closing costs exceeds the equity you would build. ${confidence === 'High' ? 'This is financially prudent if you value flexibility or plan to move within 5 years.' : 'Consider your career stability, local market conditions, and desire for flexibility.'}`;
      }

      const insight = {
        tone: insightTone,
        icon: insightIcon,
        headline: insightHeadline,
        detail: insightDetail,
      };

      // ── PERSONALIZED FINANCIAL INSIGHTS ──
      const insights = [];
      const downPct = homePrice > 0 ? (downPayment / homePrice) * 100 : 0;
      const monthlyBuy = roundTo((finalBuy.mortgagePaid + finalBuy.taxes + finalBuy.insurance + finalBuy.maintenance + finalBuy.hoa + finalBuy.pmi + finalBuy.misc) / analysisPeriod / 12, 2);
      const monthlyRent = roundTo((finalRent.rentPaid + finalRent.insurance) / analysisPeriod / 12, 2);

      if (analysisPeriod >= 7) {
        insights.push(`Staying longer than 7 years strongly favors buying — your break-even is reached in ${breakEvenYear ? `Year ${breakEvenYear}` : 'the analysis period'}, after which equity growth accelerates.`);
      } else if (analysisPeriod <= 5) {
        insights.push(`With a ${analysisPeriod}-year horizon, high upfront buying costs (closing, moving, origination) are hard to recover. Consider whether you can commit to staying longer before buying.`);
      }

      if (downPct < 20) {
        insights.push(`Your down payment of ${downPct.toFixed(1)}% is below 20%, which typically triggers PMI. Increasing your down payment to 20% could eliminate PMI and reduce total interest.`);
      } else if (downPct < 25) {
        const extraDown = homePrice * 0.25 - downPayment;
        insights.push(`Increasing your down payment to 25% (an additional ${fmt(extraDown)}) would reduce your loan balance and total interest paid over the life of the mortgage.`);
      }

      if (monthlyBuy > 0 && monthlyRent > 0) {
        const diff = Math.abs(monthlyBuy - monthlyRent);
        if (monthlyBuy < monthlyRent) {
          insights.push(`Your monthly ownership cost (${fmt(monthlyBuy)}) is ${fmt(diff)} less than your rent (${fmt(monthlyRent)}), so buying improves monthly cash flow while building equity.`);
        } else {
          insights.push(`Your monthly ownership cost (${fmt(monthlyBuy)}) is ${fmt(diff)} more than rent (${fmt(monthlyRent)}). The renter can invest this difference, which partially offsets the equity you build.`);
        }
      }

      if (rentIncrease >= 0.05) {
        insights.push(`With annual rent inflation at ${(rentIncrease * 100).toFixed(1)}%, buying becomes financially favorable earlier because rent costs compound quickly.`);
      }

      if (mortgageRate >= 0.07) {
        insights.push(`At a ${(mortgageRate * 100).toFixed(2)}% mortgage rate, a significant portion of early payments goes to interest. A lower rate would substantially improve the buying outcome.`);
      }

      if (investmentReturn >= 0.08) {
        insights.push(`Investing while renting only tends to outperform buying under optimistic market return assumptions (${(investmentReturn * 100).toFixed(0)}%+). At more conservative returns, home equity usually wins over long horizons.`);
      }

      // ── FINANCIAL JOURNEY (next-step calculators) ──
      const journey = winner === 'buy'
        ? [
            { slug: 'house-affordability-calculator', name: 'House Affordability Calculator', icon: 'fa-house-circle-check', iconClass: 'icon-finance', description: 'Determine an affordable home price based on your income.' },
            { slug: 'mortgage-calculator', name: 'Mortgage Calculator', icon: 'fa-house', iconClass: 'icon-finance', description: 'Estimate monthly mortgage payments for your target home.' },
            { slug: 'amortization-calculator', name: 'Amortization Calculator', icon: 'fa-table-list', iconClass: 'icon-finance', description: 'Visualize the loan repayment schedule and equity growth.' },
            { slug: 'budget-planner', name: 'Budget Planner', icon: 'fa-wallet', iconClass: 'icon-finance', description: 'Understand how homeownership affects your monthly finances.' },
            { slug: 'retirement-calculator', name: 'Retirement Calculator', icon: 'fa-umbrella', iconClass: 'icon-finance', description: 'Evaluate the long-term impact of purchasing a home on retirement goals.' },
          ]
        : [
            { slug: 'savings-calculator', name: 'Savings Calculator', icon: 'fa-piggy-bank', iconClass: 'icon-finance', description: 'Plan how quickly to build a larger down payment.' },
            { slug: 'investment-calculator', name: 'Investment Calculator', icon: 'fa-chart-line', iconClass: 'icon-finance', description: 'Estimate how investing the down payment could grow over time.' },
            { slug: 'compound-interest-calculator', name: 'Compound Interest Calculator', icon: 'fa-chart-line', iconClass: 'icon-finance', description: 'Visualize long-term investment growth.' },
            { slug: 'inflation-calculator', name: 'Inflation Calculator', icon: 'fa-arrow-trend-up', iconClass: 'icon-finance', description: 'Understand how rising housing costs may affect future affordability.' },
          ];

      return {
        stats,
        summary,
        chart,
        chart2,
        compareChart,
        chart3,
        table,
        insight,
        recommendation,
        insights,
        journey,
      };
    },

    // ── How-To Guide
    howTo: [
      'Enter the home purchase price using the slider or type a specific amount.',
      'Choose your down payment mode — percentage or dollar amount — and set the value.',
      'Set your mortgage rate, loan term, current rent, and how many years you plan to stay.',
      'Adjust expected rent increase, home appreciation, and investment return.',
      'Expand "Advanced Options" to customize property tax, insurance, HOA, PMI, maintenance, closing costs, and more.',
      'Review the executive dashboard, recommendation, charts, and year-by-year comparison table.',
      'Read the personalized insights to understand which assumptions matter most.',
      'Follow the suggested next-step calculators based on your result.',
    ],

    // ── Real-World Examples
    examples: [
      {
        title: 'Young Professional (Rent)',
        input: '$350,000 home, 10% down, 6.5% rate, $1,800 rent, 3-year horizon, 8% investment return',
        result: 'Renting wins. High upfront costs and a short horizon make buying uneconomical; investing the down payment outperforms.',
      },
      {
        title: 'Growing Family (Buy)',
        input: '$500,000 home, 20% down, 6% rate, $2,400 rent, 15-year horizon, 3% appreciation',
        result: 'Buying wins strongly. Long tenure recovers costs and builds substantial equity and appreciation.',
      },
      {
        title: 'High Mortgage Rate Environment',
        input: '$450,000 home, 20% down, 7.5% rate, $2,200 rent, 8-year horizon',
        result: 'Higher rates delay break-even. Compare 5%, 6%, 7%, and 8% to see how the recommendation shifts.',
      },
      {
        title: 'Typical 20% Down Purchase',
        input: '$450,000 home, 20% down, 6.25% rate, 30yr, $2,200 rent, 3.5% appreciation, 7% investment return, 8 years',
        result: 'Buying wins by ~$36,800. Break-even around Year 4-5. High confidence if staying 7+ years.',
      },
      {
        title: 'Low Down Payment Scenario',
        input: '$450,000 home, 5% down, PMI required, 6.5% rate, 30yr, $2,200 rent, 8 years',
        result: 'PMI and higher loan costs delay break-even to Year 6-7. Still favorable long-term with appreciation.',
      },
      {
        title: 'High Rent Growth Market',
        input: '$450,000 home, 20% down, $2,500 rent, 5% annual rent increases, 8 years',
        result: 'Buying wins by ~$78,000. Rapid rent growth makes buying advantageous by Year 3.',
      },
      {
        title: 'Short Time Horizon',
        input: '$450,000 home, 20% down, plan to move in 3 years, $2,200 rent, 8 years',
        result: 'Renting likely wins. Transaction costs (closing + selling) erase equity gains in under 5 years.',
      },
    ],
    formula: 'Monthly P&I = P × [r(1+r)^n] / [(1+r)^n − 1] | Equity = Home Value − Remaining Balance | Net Proceeds = Equity − Selling Costs | Opportunity Cost = Invested Capital × (1 + Return)^t | Net Worth (Buy) = Equity − Cumulative Costs | Net Worth (Rent) = Investment Portfolio − Cumulative Rent',

    // ── SEO Article Content
    article: {
      heading: 'The Complete Guide to the Rent vs. Buy Decision',
      intro: 'The rent vs. buy question is one of the most significant financial decisions most people will make. It involves far more than comparing a monthly rent check to a mortgage payment — it requires understanding equity buildup, opportunity cost, tax implications, transaction costs, and how time in the market changes the math. The GetCalcu Rent vs. Buy Calculator models all of these factors to give you a clear, data-driven answer tailored to your situation.',
      sections: [
        { heading: 'When Buying Makes Financial Sense', body: 'Buying typically wins when you plan to stay 7+ years, home appreciation is steady, rent inflation is high, and your mortgage payment is close to your current rent. Over long horizons, fixed mortgage payments stay stable while rents compound upward, and principal payments build equity that you keep when you sell. The calculator shows your exact break-even year.' },
        { heading: 'When Renting Is the Better Decision', body: 'Renting often wins for short time horizons (under 5 years), when you value flexibility to relocate, when the opportunity cost of your down payment is high, or when home prices are stagnant. Renting avoids transaction costs, maintenance, and property taxes, and frees up capital that can be invested. Our calculator compares both strategies fairly.' },
        { heading: 'Understanding Opportunity Cost', body: 'When you buy, you tie up a large down payment (often 20% of the home price) plus closing costs. That capital could otherwise be invested. If you invest $90,000 plus $13,500 in closing costs at a 7% annual return, it grows substantially over 10 years. The calculator compares that investment growth against the equity you build in the home, revealing which strategy creates more wealth.' },
        { heading: 'The 5% Rule Explained', body: 'The 5% rule is a quick heuristic: if the annual cost of owning (mortgage interest + property taxes + insurance + maintenance + transaction costs) is more than 5% of the home value per year, renting may be cheaper. Multiply the home price by 5% and compare to your annual rent. If rent is lower, renting wins on pure cash flow — but this rule ignores equity and appreciation, so use the full calculator for the complete picture.' },
        { heading: 'Building Home Equity', body: 'Each mortgage payment splits into interest and principal. Early payments are mostly interest; later payments are mostly principal. As you pay down the loan and the home appreciates, your equity grows. When you sell, you keep the equity minus selling costs. The calculator charts your principal, appreciation, and total equity year by year.' },
        { heading: 'Hidden Costs of Homeownership', body: 'Beyond the mortgage, owners pay closing costs (2-5% of price), property taxes, homeowners insurance, maintenance (1-2% of value annually), HOA fees, PMI if under 20% down, and selling costs (6-10% when you sell). These hidden costs can add tens of thousands of dollars and are why buying is not always cheaper than renting.' },
        { heading: 'Common Mistakes People Make', body: 'The most common mistakes are buying too early (before you can afford it or before you plan to stay long enough), ignoring opportunity cost, underestimating maintenance, staying too short a time to recover transaction costs, and overestimating appreciation. Our calculator helps you avoid these by modeling realistic assumptions.' },
        { heading: 'How Home Appreciation and Rent Inflation Affect the Decision', body: 'In hot markets where home values rise 5-7% annually, buying builds wealth faster through appreciation. In markets with high rent growth (5%+ annually), buying provides payment stability while renters face escalating costs. Conversely, in stagnant or declining markets, appreciation may not offset ownership costs, and low rent growth favors renting.' },
      ],
    },

    // ── Schema-Ready FAQs (15-20)
    faqs: [
      {
        q: 'What is the 5% rule for renting vs buying?',
        a: 'The 5% rule is a quick heuristic: if the annual cost of owning (mortgage interest + property taxes + insurance + maintenance + transaction costs) is more than 5% of the home value per year, renting may be cheaper. More precisely, multiply the home price by 5% and compare to your annual rent × 12. If rent is lower, renting wins on pure cash flow. However, this rule ignores equity buildup and appreciation, so use our full calculator for the complete picture.',
      },
      {
        q: 'Is renting throwing money away?',
        a: 'No. Renting provides housing flexibility, no maintenance responsibilities, and preserves capital that can be invested. While you do not build equity, you also avoid transaction costs (closing costs, selling commissions) and maintenance expenses. In some markets and time horizons, renting creates more net worth than buying because the opportunity cost of the down payment exceeds the equity you would build. Our calculator compares both strategies fairly.',
      },
      {
        q: 'How much home appreciation should I assume?',
        a: 'The long-term US historical average is about 3-5% annually, but this varies dramatically by market and time period. Over the next 10 years, many analysts expect 2-4% appreciation. In hot markets, 5-7% is possible; in stagnant markets, 0-2%. Use a conservative estimate (2-3%) for planning, and test higher scenarios to see sensitivity. Our calculator lets you adjust this assumption instantly.',
      },
      {
        q: 'How long should I stay before buying?',
        a: 'The break-even point — where buying becomes cheaper than renting — typically occurs between 3 and 7 years, depending on your down payment, mortgage rate, home appreciation, rent growth, and local transaction costs. If you plan to move within 3 years, renting is usually cheaper due to high upfront buying costs. If you plan to stay 7+ years, buying typically builds more wealth. Use our calculator to find your exact break-even year.',
      },
      {
        q: 'How does inflation affect the rent vs. buy decision?',
        a: 'Inflation raises both rents and ownership costs (property taxes, insurance, maintenance), but in different ways. Rents typically increase with inflation (or faster in hot markets), exposing renters to rising costs. Fixed-rate mortgages provide payment stability — your principal and interest stay the same for 30 years. However, property taxes and insurance rise with inflation. The net effect usually favors buying over long periods because the mortgage is fixed while rents compound upward.',
      },
      {
        q: 'What investment return should I assume for the opportunity cost?',
        a: 'For the opportunity cost calculation, use a realistic long-term investment return. The S&P 500 has averaged about 10% before inflation (7-8% after inflation) over decades. A diversified 60/40 portfolio averages 6-7%. For conservative planning, use 6-7%; for aggressive planning, 8-10%. The key insight: if you can earn 7-8% on investments and your home appreciates 3-4%, the opportunity cost of your down payment is real and can exceed equity buildup in the early years.',
      },
      {
        q: 'Does buying always build wealth?',
        a: 'No. Buying builds wealth when home appreciation plus equity buildup exceeds the total cost of ownership (mortgage interest, taxes, insurance, maintenance, transaction costs). In scenarios with low appreciation, high transaction costs, or short time horizons, renting and investing the down payment can create more net worth. Our calculator objectively compares both strategies to show which creates more wealth in your specific situation.',
      },
      {
        q: 'What is the break-even point in a rent vs buy decision?',
        a: 'The break-even point is the year when the cumulative net worth of buying (home equity minus ownership costs) exceeds the cumulative net worth of renting (investment portfolio minus rent paid). Before this point, renting is financially ahead; after it, buying wins. It typically falls between years 3 and 7. Our calculator identifies your exact break-even year based on your assumptions.',
      },
      {
        q: 'How does the down payment affect the rent vs buy decision?',
        a: 'A larger down payment reduces your loan amount, lowers monthly payments, and can eliminate PMI (at 20%+). However, it also increases the opportunity cost — more capital tied up that could be invested. A smaller down payment preserves liquidity but adds PMI and higher interest costs. The optimal down payment balances these trade-offs; our calculator lets you test different amounts.',
      },
      {
        q: 'What is opportunity cost in the context of buying a home?',
        a: 'Opportunity cost is the potential return you give up by tying up capital in a home instead of investing it. When you put $90,000 down and pay $13,500 in closing costs, that $103,500 could instead grow in the stock market. If it earns 7% annually, it compounds significantly over a decade. The calculator compares this forgone investment growth against the equity you build in the home.',
      },
      {
        q: 'How do mortgage rates affect the rent vs buy decision?',
        a: 'Higher mortgage rates increase monthly payments and total interest, delaying the break-even point and making renting more attractive. At 5% vs 8%, the difference on a $360,000 loan is hundreds of dollars per month and tens of thousands in total interest. In high-rate environments, renting and investing may outperform buying, especially over shorter horizons. Use our calculator to compare rate scenarios.',
      },
      {
        q: 'Should I include maintenance costs when comparing rent vs buy?',
        a: 'Absolutely. Maintenance is a real, ongoing ownership cost that renters do not pay. A common rule is 1-2% of home value annually — on a $450,000 home, that is $4,500-$9,000 per year. Over 10 years, that is $45,000-$90,000. Underestimating maintenance is one of the most common mistakes in rent vs buy comparisons. Our calculator includes it by default.',
      },
      {
        q: 'What are the hidden costs of buying a home?',
        a: 'Hidden costs include closing costs (2-5% of price: origination, appraisal, title, attorney), property taxes, homeowners insurance, maintenance (1-2% annually), HOA fees, PMI if under 20% down, and selling costs (6-10% when you sell: realtor commission, closing fees). These can add tens of thousands of dollars and are why buying is not always cheaper than renting.',
      },
      {
        q: 'How do selling costs affect the rent vs buy decision?',
        a: 'Selling costs — typically 6-10% of the sale price (realtor commission plus closing fees) — are deducted from your equity when you sell. On a $500,000 home, that is $30,000-$50,000. These costs are why buying is risky for short horizons: if you sell within a few years, selling costs can erase all your equity gains. Our calculator includes selling costs in the net cost of buying.',
      },
      {
        q: 'Is it better to rent and invest the difference?',
        a: 'Sometimes, yes. If your monthly ownership cost exceeds rent, the renter can invest the difference. Combined with investing the down payment, this can outperform home equity — especially with high investment returns, low appreciation, or short horizons. However, over long horizons with steady appreciation, home equity usually wins because you benefit from both principal paydown and appreciation. Our calculator models both paths.',
      },
      {
        q: 'How does the expected years staying affect the decision?',
        a: 'The number of years you stay is one of the most influential variables. Buying has high upfront costs (closing, moving, origination) that take 3-7 years to recover. If you stay fewer than 5 years, renting is often cheaper. If you stay 7+ years, buying typically builds more wealth. The longer you stay, the more equity and appreciation accumulate, and the more buying wins.',
      },
      {
        q: 'What is PMI and how does it affect the decision?',
        a: 'Private Mortgage Insurance (PMI) protects the lender when you put down less than 20%. It typically costs 0.5-1% of the loan amount annually, added to your monthly payment. On a $400,000 loan, that is $2,000-$4,000 per year. PMI increases ownership costs and delays the break-even point, making renting relatively more attractive for low-down-payment buyers.',
      },
      {
        q: 'How do HOA fees factor into the rent vs buy comparison?',
        a: 'HOA fees cover common-area maintenance in condos, townhomes, and some neighborhoods. They can range from $100 to $1,000+ per month and typically rise over time. These are real ownership costs that renters do not pay. Our calculator includes monthly HOA fees in the total cost of buying, so you get an accurate comparison.',
      },
      {
        q: 'What is the difference between net cost of buying and net cost of renting?',
        a: 'The net cost of buying is your total cash outflows (mortgage payments, taxes, insurance, maintenance, HOA, PMI, closing costs, selling costs) minus the equity you keep when you sell. The net cost of renting is your total rent plus renters insurance minus the value of your investment portfolio (down payment + savings invested). The option with the lower net cost is financially better.',
      },
      {
        q: 'How should I use this calculator to make my decision?',
        a: 'Start with realistic assumptions for your situation, then test sensitivity: try different time horizons, mortgage rates, appreciation rates, and rent increases. Look at the break-even year and the financial advantage. Read the personalized insights to understand which variables matter most. Finally, use the suggested next-step calculators to plan your budget, mortgage, or savings strategy.',
      },
    ],
  },

  // ── House Affordability Calculator ─────────────────────────────────────
  'house-affordability-calculator': {
    name: 'House Affordability Calculator',
    category: 'Finance',
    icon: 'fa-house',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate how much house you can afford based on your income, debt, and down payment. Get detailed DTI analysis.',
    metaDescription: 'Free house affordability calculator — determine your maximum home purchase price based on DTI ratios, income, debt, and down payment.',
    keywords: ['house affordability calculator', 'how much house can i afford', 'dti calculator', '28 36 rule', 'fha loan calculator'],
    fields: [
      { id: 'annual_income', label: 'Annual Gross Household Income ($)', type: 'number', default: 105000, min: 0, step: 1000, hint: 'Total yearly household income before taxes.' },
      { id: 'monthly_debt', label: 'Monthly Debt Payments ($)', type: 'number', default: 500, min: 0, step: 50, hint: 'Car loans, student loans, credit cards, etc.' },
      { id: 'down_payment', label: 'Cash Saved for Down Payment ($)', type: 'number', default: 60000, min: 0, step: 1000, hint: 'Cash available for down payment.' },
      { id: 'loan_term', label: 'Loan Term (Years)', type: 'select', default: 30, options: [15,20,30].map(v => ({ value: v, label: v + ' years' })), hint: 'How long to repay the mortgage.' },
      { id: 'mortgage_rate', label: 'Estimated Mortgage Rate (%)', type: 'number', default: 6.75, min: 0.01, max: 20, step: 0.05, hint: 'Expected annual interest rate (APR).' },
      { id: 'property_tax_rate', label: 'Annual Property Tax Rate (%)', type: 'number', default: 1.2, min: 0, max: 5, step: 0.1, hint: 'Effective annual property tax rate (typically 0.5-2%).' },
      { id: 'home_insurance', label: 'Annual Home Insurance ($)', type: 'number', default: 1500, min: 0, step: 100, hint: 'Yearly homeowners insurance premium.' },
      { id: 'hoa_fees', label: 'Monthly HOA / Co-op Fee ($)', type: 'number', default: 0, min: 0, step: 25, hint: 'Monthly HOA or co-op fees.' },
      { id: 'lender_rule', label: 'Lender Rule Preference', type: 'select', default: 'conventional', options: [
        { value: 'conventional', label: 'Conventional 28/36 Rule' },
        { value: 'fha', label: 'FHA Loan 31/43 Rule' },
        { value: 'va', label: 'VA Loan 41% DTI' },
        { value: 'aggressive', label: 'Aggressive 36/45 Rule' },
      ], hint: 'Choose the lender guideline to use.' },
    ],
    calculate(v) {
      const annualIncome = safeNum(v.annual_income, 0);
      const monthlyDebt = safeNum(v.monthly_debt, 0);
      const downPayment = safeNum(v.down_payment, 0);
      const loanTerm = Math.round(safeNum(v.loan_term, 30));
      const mortgageRate = safeNum(v.mortgage_rate, 0) / 100;
      const propertyTaxRate = safeNum(v.property_tax_rate, 0) / 100;
      const homeInsurance = safeNum(v.home_insurance, 0);
      const hoaFees = safeNum(v.hoa_fees, 0);
      const lenderRule = safeStr(v.lender_rule);

      if (annualIncome <= 0) return errorResult('Please enter a valid annual income.');

      const grossMonthlyIncome = annualIncome / 12;

      let frontEndRatio, backEndRatio;
      switch (lenderRule) {
        case 'fha': frontEndRatio = 0.31; backEndRatio = 0.43; break;
        case 'va': frontEndRatio = 0.41; backEndRatio = 0.41; break;
        case 'aggressive': frontEndRatio = 0.36; backEndRatio = 0.45; break;
        default: frontEndRatio = 0.28; backEndRatio = 0.36; break;
      }

      const monthlyPropertyTax = (propertyTaxRate * annualIncome) / 12;
      const monthlyInsurance = homeInsurance / 12;
      const maxHousingPayment = grossMonthlyIncome * frontEndRatio;
      const maxTotalDebtPayment = grossMonthlyIncome * backEndRatio;
      const availableForHousing = maxTotalDebtPayment - monthlyDebt;
      const maxMonthlyHousing = Math.min(maxHousingPayment, availableForHousing);
      const availableForPI = maxMonthlyHousing - monthlyPropertyTax - monthlyInsurance - hoaFees;

      if (availableForPI <= 0) {
        return errorResult('Your debt obligations exceed the allowed DTI ratio. Consider reducing monthly debt or increasing income.');
      }

      const monthlyRate = mortgageRate / 12;
      const numPayments = loanTerm * 12;
      let maxLoanAmount;
      if (monthlyRate === 0) {
        maxLoanAmount = availableForPI * numPayments;
      } else {
        maxLoanAmount = availableForPI * (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
      }
      maxLoanAmount = Math.max(0, roundTo(maxLoanAmount, 2));
      const recommendedHomePrice = maxLoanAmount + downPayment;

      let monthlyPI;
      if (monthlyRate === 0) {
        monthlyPI = maxLoanAmount / numPayments;
      } else {
        monthlyPI = maxLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      }
      monthlyPI = roundTo(monthlyPI, 2);
      const totalMonthlyPayment = roundTo(monthlyPI + monthlyPropertyTax + monthlyInsurance + hoaFees, 2);

      const actualFrontEndDTI = (totalMonthlyPayment / grossMonthlyIncome) * 100;
      const actualBackEndDTI = ((totalMonthlyPayment + monthlyDebt) / grossMonthlyIncome) * 100;

      const conservativeFrontEnd = grossMonthlyIncome * 0.25;
      const conservativeBackEnd = grossMonthlyIncome * 0.35;
      const conservativeHousing = Math.min(conservativeFrontEnd, conservativeBackEnd - monthlyDebt);
      const conservativePI = Math.max(0, conservativeHousing - monthlyPropertyTax - monthlyInsurance - hoaFees);
      let conservativeLoan;
      if (monthlyRate === 0) {
        conservativeLoan = conservativePI * numPayments;
      } else {
        conservativeLoan = conservativePI * (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
      }
      conservativeLoan = Math.max(0, roundTo(conservativeLoan, 2));
      const conservativePrice = conservativeLoan + downPayment;

      const aggressiveFrontEnd = grossMonthlyIncome * 0.35;
      const aggressiveBackEnd = grossMonthlyIncome * 0.45;
      const aggressiveHousing = Math.min(aggressiveFrontEnd, aggressiveBackEnd - monthlyDebt);
      const aggressivePI = Math.max(0, aggressiveHousing - monthlyPropertyTax - monthlyInsurance - hoaFees);
      let aggressiveLoan;
      if (monthlyRate === 0) {
        aggressiveLoan = aggressivePI * numPayments;
      } else {
        aggressiveLoan = aggressivePI * (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate;
      }
      aggressiveLoan = Math.max(0, roundTo(aggressiveLoan, 2));
      const aggressivePrice = aggressiveLoan + downPayment;

      return {
        stats: [
          { label: 'Recommended Affordable Home Price', value: fmt(recommendedHomePrice), highlight: true },
          { label: 'Max Loan Amount', value: fmt(maxLoanAmount) },
          { label: 'Total Monthly Housing Payment', value: fmt(totalMonthlyPayment) },
          { label: 'Principal & Interest', value: fmt(monthlyPI) },
          { label: 'Property Taxes (monthly)', value: fmt(roundTo(monthlyPropertyTax, 2)) },
          { label: 'Homeowners Insurance (monthly)', value: fmt(roundTo(monthlyInsurance, 2)) },
          { label: 'HOA / Co-op Fees', value: fmt(hoaFees) },
          { label: 'Front-End DTI', value: actualFrontEndDTI.toFixed(1) + '%' },
          { label: 'Back-End DTI', value: actualBackEndDTI.toFixed(1) + '%' },
          { label: 'Down Payment', value: fmt(downPayment) },
          { label: 'Gross Monthly Income', value: fmt(grossMonthlyIncome) },
        ],
        chart: {
          principal: monthlyPI,
          propertyTax: roundTo(monthlyPropertyTax, 2),
          insurance: roundTo(monthlyInsurance, 2),
          hoa: hoaFees,
        },
        table: {
          mode: 'comparison',
          title: 'Purchase Capability Breakdown',
          columns: [
            { key: 'scenario', label: 'Scenario', format: 'text' },
            { key: 'homePrice', label: 'Home Price', format: 'currency', emphasis: true },
            { key: 'loanAmount', label: 'Loan Amount', format: 'currency' },
            { key: 'monthlyPayment', label: 'Monthly Payment', format: 'currency' },
            { key: 'frontDTI', label: 'Front-End DTI', format: 'text' },
            { key: 'backDTI', label: 'Back-End DTI', format: 'text' },
          ],
          rows: [
            { scenario: 'Conservative (25/35)', homePrice: fmt(conservativePrice), loanAmount: fmt(conservativeLoan), monthlyPayment: fmt(roundTo(conservativePI + monthlyPropertyTax + monthlyInsurance + hoaFees, 2)), frontDTI: '25%', backDTI: pct((conservativePI + monthlyPropertyTax + monthlyInsurance + hoaFees + monthlyDebt) / grossMonthlyIncome) },
            { scenario: 'Target (28/36) - Recommended', homePrice: fmt(recommendedHomePrice), loanAmount: fmt(maxLoanAmount), monthlyPayment: fmt(totalMonthlyPayment), frontDTI: actualFrontEndDTI.toFixed(1) + '%', backDTI: actualBackEndDTI.toFixed(1) + '%' },
            { scenario: 'Aggressive (35/45)', homePrice: fmt(aggressivePrice), loanAmount: fmt(aggressiveLoan), monthlyPayment: fmt(roundTo(aggressivePI + monthlyPropertyTax + monthlyInsurance + hoaFees, 2)), frontDTI: '35%', backDTI: pct((aggressivePI + monthlyPropertyTax + monthlyInsurance + hoaFees + monthlyDebt) / grossMonthlyIncome) },
          ],
        },
      };
    },

    howTo: [
      'Enter your annual gross household income and monthly debt payments (car loans, student loans, credit cards).',
      'Add your down payment savings, loan term, and estimated mortgage rate.',
      'Set your property tax rate, home insurance, and any HOA fees.',
      'Choose your lender rule preference — Conventional 28/36, FHA 31/43, VA 41%, or Aggressive 36/45.',
      'Review your recommended affordable home price, max loan amount, and monthly payment breakdown.',
      'Check the three-scenario comparison table to see conservative, target, and aggressive purchase limits.',
    ],

    examples: [
      { title: 'Typical First-Time Buyer', input: 'Income: $105,000, Debt: $500/mo, Down: $60,000, Rate: 6.75%, 30yr', result: 'Affordable home: ~$350,000 | Monthly PITI: ~$2,400 | Front DTI: 28% | Back DTI: 36%' },
      { title: 'FHA Loan with Higher DTI', input: 'Income: $80,000, Debt: $800/mo, Down: $20,000, Rate: 6.5%, 30yr, FHA', result: 'Affordable home: ~$280,000 | Monthly PITI: ~$1,900 | Front DTI: 31% | Back DTI: 43%' },
      { title: 'VA Loan Zero Down', input: 'Income: $90,000, Debt: $300/mo, Down: $0, Rate: 6.25%, 30yr, VA', result: 'Affordable home: ~$320,000 | Monthly PITI: ~$2,100 | Back DTI: 41%' },
    ],
    formula: 'Max Housing Payment = Gross Monthly Income × Front-End Ratio | Available for Housing = (Gross Monthly Income × Back-End Ratio) − Monthly Debt | Max Loan = PV of Available for PI | Recommended Price = Max Loan + Down Payment',

    article: {
      heading: 'The Complete Guide to House Affordability and DTI Ratios',
      intro: 'Lenders use two key ratios to determine how much house you can afford: the front-end DTI (housing ratio) and back-end DTI (total debt ratio). The GetCalcu House Affordability Calculator applies these rules — including the 28/36 conventional standard, FHA 31/43 limits, VA 41% back-end focus, and aggressive 36/45 scenarios — to show you exactly what home price fits your financial situation.',
      sections: [
        { heading: 'Understanding Front-End vs Back-End DTI', body: 'Front-end DTI measures housing costs (principal, interest, taxes, insurance, HOA) as a percentage of gross monthly income. Back-end DTI measures all monthly debt obligations — including the new mortgage payment — as a percentage of gross monthly income. Lenders use the more restrictive of the two to ensure you are not overextended.' },
        { heading: 'The 28/36 Rule (Conventional Loans)', body: 'Conventional loans typically require front-end DTI ≤ 28% and back-end DTI ≤ 36%. That means your total housing payment should not exceed 28% of your gross monthly income, and all debt combined (housing plus car loans, student loans, credit cards) should not exceed 36%. If your existing debt is high, the back-end ratio becomes the binding constraint.' },
        { heading: 'FHA 31/43 and VA 41% Rules', body: 'FHA loans allow higher ratios — 31% front-end and 43% back-end — making them accessible for buyers with higher debt loads or smaller down payments (as low as 3.5%). VA loans focus primarily on the back-end DTI (41%) and do not require a down payment, but they do require the residual income test to ensure you can cover living expenses after paying the mortgage.' },
        { heading: 'How Down Payment and Interest Rate Affect Affordability', body: 'A larger down payment directly increases your affordable home price by reducing the loan amount. A lower interest rate increases your purchasing power by lowering the monthly payment for a given loan size. Use the calculator to test different down-payment and rate scenarios to find your optimal buying window.' },
      ],
    },

    faqs: [
      { q: 'Can I afford a $500k house on $100k income?', a: 'With $100k annual income ($8,333/month gross), the conventional 28/36 rule suggests a maximum housing payment of about $2,333/month (28% front-end). At current rates (6-7%), that supports a loan of roughly $350,000–$380,000. Adding a down payment of $120,000–$150,000 would be needed to reach a $500k purchase price. Use our house affordability calculator to test your exact down payment, debt, and rate scenario.' },
      { q: 'What is the 28/36 rule in home buying?', a: 'The 28/36 rule is the conventional lending standard: your front-end DTI (housing payment ÷ gross monthly income) should not exceed 28%, and your back-end DTI (total monthly debt ÷ gross monthly income) should not exceed 36%. If your existing monthly debt is $500, the back-end ratio becomes the binding constraint because it leaves less room for the new mortgage payment.' },
      { q: 'How does monthly debt affect home buying power?', a: 'Monthly debt payments (car loans, student loans, credit cards) directly reduce the housing payment you can afford under the back-end DTI. For example, with $800/month in existing debt at the 36% back-end limit on a $6,000/month income, only $1,360/month remains for housing (36% of $6,000 = $2,160 total debt capacity minus $800 existing debt). Reducing or paying off debt before applying for a mortgage can significantly increase your home buying power.' },
      { q: 'What is the difference between FHA 31/43 and Conventional 28/36?', a: 'FHA loans allow higher DTI ratios: 31% front-end and 43% back-end versus conventional 28/36. This makes FHA accessible for buyers with higher debt loads or smaller down payments (as low as 3.5%). However, FHA requires mortgage insurance premiums (MIP) for the life of the loan or at least 11 years, which adds to the monthly cost. Conventional loans typically require 20% down to avoid PMI but offer more flexibility in other areas.' },
      { q: 'How much income is needed for a $400k home?', a: 'For a $400,000 home with 20% down ($80,000), the loan amount is $320,000. At 6.75% over 30 years, the principal and interest is about $2,075/month. Adding property taxes ($400/month) and insurance ($125/month) gives a total PITI of roughly $2,600. Under the 28% front-end rule, you need gross monthly income of at least $9,286 ($111,429 annually). Under the 36% back-end rule with no other debt, the same $2,600 payment requires $7,222/month ($86,666 annually). The higher of the two is the safe benchmark.' },
      { q: 'Do HOA fees count toward DTI?', a: 'Yes. HOA fees, along with property taxes, homeowners insurance, and the principal and interest payment, are all included in the front-end DTI calculation. Lenders review the total monthly housing obligation — often called PITI (Principal, Interest, Taxes, Insurance) plus HOA — to ensure it stays within the front-end ratio limit.' },
      { q: 'Can I get a mortgage with a 50% DTI?', a: 'Conventional loans almost never exceed 36% back-end DTI, and most automated underwriting systems cap out around 43-45%. FHA allows up to 43% in most cases, and VA allows up to 41% (with compensating factors). Some portfolio or non-QM lenders may go higher, but they charge significantly higher rates and require larger down payments. If your DTI is above 43%, focus on paying down debt before applying for a mortgage.' },
    ],

    faqSchema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I afford a $500k house on $100k income?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "With $100k annual income ($8,333/month gross), the conventional 28/36 rule suggests a maximum housing payment of about $2,333/month (28% front-end). At current rates (6-7%), that supports a loan of roughly $350,000–$380,000. Adding a down payment of $120,000–$150,000 would be needed to reach a $500k purchase price. Use our house affordability calculator to test your exact down payment, debt, and rate scenario."
          }
        },
        {
          "@type": "Question",
          "name": "What is the 28/36 rule in home buying?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The 28/36 rule is the conventional lending standard: your front-end DTI (housing payment ÷ gross monthly income) should not exceed 28%, and your back-end DTI (total monthly debt ÷ gross monthly income) should not exceed 36%. If your existing monthly debt is $500, the back-end ratio becomes the binding constraint because it leaves less room for the new mortgage payment."
          }
        },
        {
          "@type": "Question",
          "name": "How does monthly debt affect home buying power?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Monthly debt payments (car loans, student loans, credit cards) directly reduce the housing payment you can afford under the back-end DTI. For example, with $800/month in existing debt at the 36% back-end limit on a $6,000/month income, only $1,360/month remains for housing (36% of $6,000 = $2,160 total debt capacity minus $800 existing debt). Reducing or paying off debt before applying for a mortgage can significantly increase your home buying power."
          }
        },
        {
          "@type": "Question",
          "name": "What is the difference between FHA 31/43 and Conventional 28/36?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "FHA loans allow higher DTI ratios: 31% front-end and 43% back-end versus conventional 28/36. This makes FHA accessible for buyers with higher debt loads or smaller down payments (as low as 3.5%). However, FHA requires mortgage insurance premiums (MIP) for the life of the loan or at least 11 years, which adds to the monthly cost. Conventional loans typically require 20% down to avoid PMI but offer more flexibility in other areas."
          }
        },
        {
          "@type": "Question",
          "name": "How much income is needed for a $400k home?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For a $400,000 home with 20% down ($80,000), the loan amount is $320,000. At 6.75% over 30 years, the principal and interest is about $2,075/month. Adding property taxes ($400/month) and insurance ($125/month) gives a total PITI of roughly $2,600. Under the 28% front-end rule, you need gross monthly income of at least $9,286 ($111,429 annually). Under the 36% back-end rule with no other debt, the same $2,600 payment requires $7,222/month ($86,666 annually). The higher of the two is the safe benchmark."
          }
        },
        {
          "@type": "Question",
          "name": "Do HOA fees count toward DTI?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. HOA fees, along with property taxes, homeowners insurance, and the principal and interest payment, are all included in the front-end DTI calculation. Lenders review the total monthly housing obligation — often called PITI (Principal, Interest, Taxes, Insurance) plus HOA — to ensure it stays within the front-end ratio limit."
          }
        },
        {
          "@type": "Question",
          "name": "Can I get a mortgage with a 50% DTI?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Conventional loans almost never exceed 36% back-end DTI, and most automated underwriting systems cap out around 43-45%. FHA allows up to 43% in most cases, and VA allows up to 41% (with compensating factors). Some portfolio or non-QM lenders may go higher, but they charge significantly higher rates and require larger down payments. If your DTI is above 43%, focus on paying down debt before applying for a mortgage."
          }
        },
      ]
    },

    renderResults(results, container) {
      if (results.error) {
        container.innerHTML = '<div class="error-message">' + results.stats[0].value + '</div>';
        return;
      }

      const statsHtml = results.stats.map(stat => {
        const highlightClass = stat.highlight ? 'highlight' : '';
        const warnClass = stat.warn ? 'warn' : '';
        const colorStyle = stat.color ? 'style="color:' + stat.color + '"' : '';
        return '<div class="stat-card ' + highlightClass + ' ' + warnClass + '">' +
          '<div class="stat-label">' + stat.label + '</div>' +
          '<div class="stat-value" ' + colorStyle + '>' + stat.value + '</div>' +
        '</div>';
      }).join('');

      let tableHtml = '';
      if (results.table) {
        const rows = results.table.rows.map(row => {
          const cells = results.table.columns.map(col => {
            const val = row[col.key];
            const emph = col.emphasis ? 'emphasis' : '';
            return '<td class="' + emph + '">' + val + '</td>';
          }).join('');
          return '<tr>' + cells + '</tr>';
        }).join('');

        const headers = results.table.columns.map(col => {
          const emph = col.emphasis ? 'emphasis' : '';
          return '<th class="' + emph + '">' + col.label + '</th>';
        }).join('');

        tableHtml = '<div class="cookie-table-container" style="overflow-x: auto;">' +
          '<table class="results-table">' +
            '<thead><tr>' + headers + '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>';
      }

      container.innerHTML = '<div class="results-container">' +
        '<div class="stats-grid">' + statsHtml + '</div>' +
        '<div class="chart-wrapper"><canvas id="chart-' + container.id + '"></canvas></div>' +
        (tableHtml ? '<div class="table-section"><h3>' + results.table.title + '</h3>' + tableHtml + '</div>' : '') +
      '</div>';

      if (results.chart) {
        this.renderChart(results, 'chart-' + container.id);
      }
    },

    renderChart(results, canvasId) {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !results.chart) return;

      const ctx = canvas.getContext('2d');
      const chartData = results.chart;

      // Doughnut chart for monthly housing breakdown
      if (chartData.principal !== undefined && !chartData.type) {
        const labels = ['Principal & Interest', 'Property Taxes', 'Homeowners Insurance', 'HOA Fees'];
        const data = [
          chartData.principal || 0,
          chartData.propertyTax || 0,
          chartData.insurance || 0,
          chartData.hoa || 0,
        ];
        const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];

        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#fff',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 15,
                  font: { size: 12 },
                },
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    return label + ': $' + value.toFixed(2) + ' (' + pct + '%)';
                  },
                },
              },
            },
          },
        });
      }
    },
  },

  // ── Inflation Calculator ─────────────────────────────────────
  'inflation-calculator': {
    id: 'inflation-calculator',
    name: 'Inflation Calculator',
    category: 'Finance',
    icon: 'fa-arrow-trend-up',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate how inflation impacts your money\'s purchasing power over time and find out how much you will need in the future.',
    metaTitle: 'Inflation Calculator – Future Purchasing Power & Purchasing Loss | GetCalcu',
    metaDescription: 'Free interactive Inflation Calculator. See how inflation reduces your money\'s buying power over time with dynamic charts and real-time scenario sliders.',
    keywords: [
      'inflation calculator',
      'purchasing power calculator',
      'future value of money inflation',
      'inflation adjustment calculator',
      'historical inflation rate calculator',
      'inflation rate calculator',
      'buying power calculator',
      'inflation impact on savings',
      'future cost calculator',
      'inflation adjusted value',
    ],
    fields: [
      { id: 'mode', label: 'Calculation Mode', type: 'select', default: 'future-cost',
        options: [
          { value: 'future-cost', label: 'Future Cost / Eroded Value' },
          { value: 'target-power', label: 'Target Purchasing Power Needed' },
        ],
        hint: 'Choose whether to see how much a current amount will be worth in the future, or how much you need in the future to match today\'s buying power.' },
      { id: 'initial_amount', label: 'Initial Amount ($)', type: 'range', default: 1000, min: 100, max: 1000000, step: 100,
        hint: 'The amount of money you want to analyze. Drag the slider or type a value.' },
      { id: 'inflation_rate', label: 'Annual Inflation Rate (%)', type: 'range', default: 3.5, min: 0.1, max: 20, step: 0.1,
        hint: 'The expected yearly inflation rate. The US long-run average is about 2.5-3.5%.' },
      { id: 'years', label: 'Time Horizon (Years)', type: 'range', default: 10, min: 1, max: 50, step: 1,
        hint: 'How many years into the future you want to project. Longer horizons show more dramatic erosion.' },
    ],
    fieldLabels(v) {
      if (v.mode === 'target-power') return { initial_amount: 'Today\'s Purchasing Power ($)' };
      return {};
    },
    calculate(v) {
      const amount = safeNum(v.initial_amount, 1000);
      const rate = safeNum(v.inflation_rate, 3.5) / 100;
      const years = Math.round(safeNum(v.years, 10));
      const mode = v.mode || 'future-cost';

      if (amount <= 0) return errorResult('Please enter an amount greater than zero.');
      if (years < 1) return errorResult('Time horizon must be at least 1 year.');

      const growthFactor = Math.pow(1 + rate, years);
      const futureCost = roundTo(amount * growthFactor, 2);
      const purchasingPowerLoss = roundTo(futureCost - amount, 2);
      const lossPct = roundTo((purchasingPowerLoss / futureCost) * 100, 2);
      const realValue = roundTo(amount / growthFactor, 2);
      const cumulativeInflation = roundTo((growthFactor - 1) * 100, 2);
      const targetNeeded = roundTo(amount * growthFactor, 2);

      const schedule = [];
      for (let y = 1; y <= years; y++) {
        const gf = Math.pow(1 + rate, y);
        const yearCost = roundTo(amount * gf, 2);
        const yearLoss = roundTo(yearCost - amount, 2);
        const yearReal = roundTo(amount / gf, 2);
        const yearCumInfl = roundTo((gf - 1) * 100, 2);
        schedule.push({ month: y, payment: 0, principal: roundTo(amount, 2), interest: roundTo(yearLoss, 2), balance: yearCost, realValue: yearReal, cumulativeInflation: yearCumInfl });
      }

      const labels = [];
      const erosionData = [];
      const nominalData = [];
      const realData = [];
      for (let y = 0; y <= years; y++) {
        const gf = Math.pow(1 + rate, y);
        labels.push('Year ' + y);
        erosionData.push(roundTo(amount / gf, 2));
        nominalData.push(roundTo(amount, 2));
        realData.push(roundTo(amount * gf, 2));
      }

      const rateDisplay = roundTo(rate * 100, 2);
      let stats;
      if (mode === 'target-power') {
        stats = [
          { label: 'Future Amount Needed', value: fmt(targetNeeded), highlight: true },
          { label: 'Today\'s Purchasing Power', value: fmt(amount) },
          { label: 'Cumulative Inflation', value: cumulativeInflation + '%' },
          { label: 'Annual Inflation Rate', value: rateDisplay + '%' },
          { label: 'Time Horizon', value: years + ' year' + (years > 1 ? 's' : '') },
          { label: 'Real Value of Future Amount', value: fmt(realValue) },
          { label: 'Purchasing Power Loss', value: fmt(purchasingPowerLoss), warn: true },
          { label: 'Purchasing Power Loss %', value: lossPct + '%', warn: true },
        ];
      } else {
        stats = [
          { label: 'Future Equivalent Cost', value: fmt(futureCost), highlight: true },
          { label: 'Purchasing Power Loss', value: fmt(purchasingPowerLoss), warn: true },
          { label: 'Purchasing Power Loss %', value: lossPct + '%', warn: true },
          { label: 'Real Purchasing Power Remaining', value: fmt(realValue) },
          { label: 'Cumulative Inflation', value: cumulativeInflation + '%' },
          { label: 'Initial Amount', value: fmt(amount) },
          { label: 'Annual Inflation Rate', value: rateDisplay + '%' },
          { label: 'Time Horizon', value: years + ' year' + (years > 1 ? 's' : '') },
        ];
      }

      return {
        stats,
        chart: {
          type: 'line',
          labels,
          yLabel: 'Value ($)',
          title: 'Purchasing Power Erosion & Future Cost',
          datasets: [
            { label: 'Real Purchasing Power', data: erosionData, color: '#EF4444', fill: true },
            { label: 'Nominal Cash Value', data: nominalData, color: '#3B82F6' },
            { label: 'Future Cost (Inflation-Adjusted)', data: realData, color: '#10B981' },
          ],
        },
        table: {
          mode: 'schedule',
          title: 'Year-by-Year Inflation Impact',
          columns: [
            { key: 'month', label: 'Year', format: 'text' },
            { key: 'principal', label: 'Initial Amount', format: 'currency' },
            { key: 'balance', label: 'Future Cost', format: 'currency', emphasis: true },
            { key: 'interest', label: 'Purchasing Power Loss', format: 'currency' },
            { key: 'realValue', label: 'Real Value (Today\'s $)', format: 'currency' },
            { key: 'cumulativeInflation', label: 'Cumulative Inflation', format: 'text' },
          ],
          rows: schedule.map(r => ({
            month: 'Year ' + r.month,
            principal: r.principal,
            balance: r.balance,
            interest: r.interest,
            realValue: r.realValue,
            cumulativeInflation: r.cumulativeInflation + '%',
          })),
        },
        insight: {
          tone: purchasingPowerLoss > 0 ? 'warning' : 'positive',
          icon: purchasingPowerLoss > 0 ? 'fa-arrow-trend-down' : 'fa-circle-check',
          headline: mode === 'target-power'
            ? 'You will need ' + fmt(futureCost) + ' in ' + years + ' years to match today\'s buying power of ' + fmt(amount) + '.'
            : 'Your ' + fmt(amount) + ' will only buy ' + fmt(realValue) + ' worth of goods in ' + years + ' years.',
          detail: 'At a ' + (rate * 100) + '% annual inflation rate, your purchasing power erodes by ' + fmt(purchasingPowerLoss) + ' (' + lossPct + '%). Over ' + years + ' years, cumulative inflation reaches ' + cumulativeInflation + '%.',
        },
      };
    },
    howTo: [
      'Enter the amount of money you want to analyze — use the slider or type directly.',
      'Set the annual inflation rate (default 3.5%, the US historical average).',
      'Choose your time horizon — how many years into the future to project.',
      'Switch between "Future Cost" mode and "Target Purchasing Power" mode to see different perspectives.',
      'Review the purchasing power loss, real value remaining, and cumulative inflation stats.',
      'Scroll down to see the year-by-year breakdown table and the interactive chart.',
    ],
    examples: [
      { title: 'Inflation Erodes $1,000 Over 10 Years', input: 'Amount: $1,000, Rate: 3.5%, Years: 10', result: 'Future Cost: ~$1,411 | Real Value: ~$709 | Loss: ~$302 (21.4%)' },
      { title: 'High Inflation Scenario', input: 'Amount: $10,000, Rate: 8%, Years: 15', result: 'Future Cost: ~$31,722 | Real Value: ~$3,152 | Loss: ~$21,722 (68.5%)' },
      { title: 'Long-Term Erosion Over 30 Years', input: 'Amount: $50,000, Rate: 3%, Years: 30', result: 'Future Cost: ~$121,363 | Real Value: ~$20,599 | Loss: ~$71,363 (58.8%)' },
    ],
    formula: 'FV = PV × (1 + i)^n | Real Value = PV / (1 + i)^n | Purchasing Power Loss = FV − PV | Cumulative Inflation = (1 + i)^n − 1',
    article: {
      heading: 'How Inflation Erodes Your Purchasing Power and What You Can Do About It',
      intro: 'Inflation is the silent thief of wealth — it steadily reduces what your money can buy over time. The GetCalcu Inflation Calculator shows you exactly how much purchasing power your money will lose at any inflation rate, over any time horizon, with interactive sliders and a dynamic chart that makes the erosion visible.',
      sections: [
        { heading: 'The Mathematical Formula Behind Inflation', body: 'The future value of money under inflation is calculated using the compound interest formula in reverse: FV = PV × (1 + i)^n, where PV is today\'s amount, i is the annual inflation rate, and n is the number of years. At a 3.5% inflation rate, money loses roughly half its purchasing power every 20 years — a dollar today is worth about 50 cents in 20 years.' },
        { heading: 'How Inflation Affects Different Assets', body: 'Cash and savings accounts are hit hardest by inflation because they earn little to no interest. Real estate historically appreciates at or above inflation rates. The stock market, over long periods, has returned 7-10% annually, significantly outpacing inflation. Bonds and fixed-income investments can struggle during high inflation periods, as their fixed payments lose real value.' },
        { heading: 'Actionable Steps to Hedge Against Inflation', body: 'To protect your purchasing power, consider: (1) High-Yield Savings Accounts (HYSA) earning 4-5% APY to at least keep pace with inflation. (2) Treasury Inflation-Protected Securities (TIPS) that adjust with CPI. (3) Low-cost index funds tracking the S&P 500, which have historically returned 7-10% annually. (4) Real estate investments that appreciate and provide rental income. (5) I-Bonds that offer inflation-adjusted returns.' },
      ],
    },
    faqs: [
      { q: 'How is inflation calculated and how does it affect my money?', a: 'Inflation is calculated as the percentage increase in the general price level of goods and services over time, typically measured by the Consumer Price Index (CPI). It affects your money by reducing purchasing power — the same dollar buys fewer goods tomorrow than it does today. The formula FV = PV × (1 + i)^n shows how much money you will need in the future to maintain the same standard of living.' },
      { q: 'What is the average inflation rate in the United States?', a: 'The US long-run average inflation rate is approximately 2.5% to 3.5% per year, based on CPI data dating back to 1913. The Federal Reserve targets a 2% annual inflation rate as optimal for economic growth. However, rates can vary significantly — from deflation during the Great Depression to double-digit inflation in the late 1970s and early 1980s.' },
      { q: 'How much will $1,000 be worth in 10 years with inflation?', a: 'At a 3.5% average annual inflation rate, $1,000 today will be worth approximately $709 in today\'s purchasing power after 10 years. You would need about $1,411 in future dollars to buy what $1,000 buys today. This means inflation erodes about $302 (21.4%) of the future value.' },
      { q: 'What is the difference between nominal and real value?', a: 'Nominal value is the face value of money in future dollars — the number printed on the bill. Real value adjusts for inflation to show what that money is actually worth in today\'s purchasing power. For example, $1,411 in 10 years is the nominal amount, but its real value (purchasing power equivalent to today\'s dollars) is only $1,000.' },
      { q: 'How does inflation impact retirement savings?', a: 'Inflation significantly impacts retirement savings by reducing the real value of your nest egg over time. A $1,000,000 retirement fund at age 65 will have the purchasing power of only about $412,000 in 30 years at 3% inflation. This is why retirement calculators use inflation-adjusted returns and why financial advisors recommend growth-oriented investments for long-term retirement goals.' },
      { q: 'What investments perform best during high inflation?', a: 'Historically, the best-performing assets during high inflation include: real estate (property values and rents rise with inflation), commodities (gold, oil, agricultural products), Treasury Inflation-Protected Securities (TIPS), I-Bonds, and stocks in sectors with pricing power (energy, healthcare, consumer staples). Cash and long-term fixed-rate bonds tend to perform poorly during high inflation.' },
    ],
  },

  // ── Net Worth Calculator ─────────────────────────────────────
  'net-worth-calculator': {
    name: 'Net Worth Calculator',
    category: 'Finance',
    icon: 'fa-scale-balanced',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate your total net worth by tracking all assets and liabilities. See your asset breakdown, debt-to-asset ratio, and get personalized wealth-building insights.',
    metaTitle: 'Net Worth Calculator | Track Assets & Liabilities — GetCalcu',
    metaDescription: 'Free Net Worth Calculator — instantly calculate your total net worth, asset breakdown, debt-to-asset ratio, and get personalized wealth-building insights. Track cash, investments, property, retirement, and debts.',
    keywords: [
      'net worth calculator',
      'calculate net worth',
      'net worth tracker',
      'assets and liabilities calculator',
      'personal net worth',
      'wealth calculator',
      'debt to asset ratio calculator',
      'how to calculate net worth',
      'net worth formula',
      'financial health calculator',
    ],
    fields: [
      { id: 'sec_assets', type: 'section', label: 'Assets — What You Own', icon: 'fa-arrow-trend-up' },
      { id: 'cash_savings',    label: 'Cash & Savings ($)',    type: 'number', default: 15000,  min: 0, step: 100,  hint: 'Checking accounts, savings accounts, cash on hand, and emergency funds.' },
      { id: 'investments',     label: 'Investments ($)',       type: 'number', default: 45000,  min: 0, step: 100,  hint: 'Stocks, bonds, mutual funds, ETFs, and brokerage accounts (not retirement).' },
      { id: 'retirement',      label: 'Retirement Accounts ($)', type: 'number', default: 60000, min: 0, step: 100,  hint: '401(k), IRA, Roth IRA, 403(b), and pension values.' },
      { id: 'home_value',      label: 'Home Value ($)',        type: 'number', default: 350000, min: 0, step: 1000, hint: 'Current market value of your primary residence or real estate.' },
      { id: 'vehicles',        label: 'Vehicles ($)',          type: 'number', default: 20000,  min: 0, step: 500,  hint: 'Current resale value of cars, motorcycles, boats, or RVs.' },
      { id: 'other_assets',    label: 'Other Assets ($)',      type: 'number', default: 10000,  min: 0, step: 100,  hint: 'Business equity, collectibles, jewelry, and other valuables.' },
      { id: 'sec_liabilities', type: 'section', label: 'Liabilities — What You Owe', icon: 'fa-arrow-trend-down' },
      { id: 'credit_cards',    label: 'Credit Card Debt ($)',  type: 'number', default: 5000,   min: 0, step: 100,  hint: 'Total outstanding balance across all credit cards.' },
      { id: 'personal_loans',  label: 'Personal Loans ($)',    type: 'number', default: 8000,   min: 0, step: 100,  hint: 'Personal, student, or auto loans you are repaying.' },
      { id: 'mortgage',        label: 'Mortgage Balance ($)',  type: 'number', default: 250000, min: 0, step: 1000, hint: 'Remaining principal on your home mortgage.' },
      { id: 'other_debt',      label: 'Other Debt ($)',        type: 'number', default: 2000,   min: 0, step: 100,  hint: 'Medical bills, tax debt, and any other outstanding obligations.' },
    ],
    calculate(v) {
      const cash       = safeNum(v.cash_savings, 0);
      const invest     = safeNum(v.investments, 0);
      const retire     = safeNum(v.retirement, 0);
      const home       = safeNum(v.home_value, 0);
      const vehicles   = safeNum(v.vehicles, 0);
      const other      = safeNum(v.other_assets, 0);
      const totalAssets = roundTo(cash + invest + retire + home + vehicles + other, 2);
      const cc         = safeNum(v.credit_cards, 0);
      const loans      = safeNum(v.personal_loans, 0);
      const mortgage   = safeNum(v.mortgage, 0);
      const otherDebt  = safeNum(v.other_debt, 0);
      const totalLiabilities = roundTo(cc + loans + mortgage + otherDebt, 2);
      const netWorth = roundTo(totalAssets - totalLiabilities, 2);
      const debtToAsset = totalAssets > 0 ? roundTo((totalLiabilities / totalAssets) * 100, 1) : 0;
      const assetToLiability = totalLiabilities > 0 ? roundTo(totalAssets / totalLiabilities, 2) : (totalAssets > 0 ? 999 : 0);
      const liquidAssets = roundTo(cash + invest, 2);
      const liquidRatio = totalLiabilities > 0 ? roundTo((liquidAssets / totalLiabilities) * 100, 1) : 0;

      let status, statusColor, insight;
      if (netWorth < 0) {
        status = 'Negative Net Worth'; statusColor = '#EF4444';
        insight = { tone: 'warning', icon: 'fa-triangle-exclamation', headline: 'Your liabilities exceed your assets by ' + fmt(Math.abs(netWorth)) + '.', detail: 'Focus on paying down high-interest debt first (credit cards and personal loans). Even small extra payments accelerate progress. Track this monthly — the trend matters more than any single snapshot.' };
      } else if (debtToAsset > 50) {
        status = 'Debt-Heavy'; statusColor = '#F59E0B';
        insight = { tone: 'warning', icon: 'fa-scale-unbalanced', headline: 'Your debt is ' + debtToAsset + '% of your assets.', detail: 'A healthy debt-to-asset ratio is typically under 50%. Prioritize reducing high-interest debt while maintaining your emergency fund. Your net worth of ' + fmt(netWorth) + ' is positive — build on it.' };
      } else if (debtToAsset > 30) {
        status = 'Building Wealth'; statusColor = '#3B82F6';
        insight = { tone: 'neutral', icon: 'fa-chart-line', headline: 'Solid foundation — net worth of ' + fmt(netWorth) + '.', detail: 'Your debt-to-asset ratio of ' + debtToAsset + '% is manageable. Consider accelerating debt payoff and increasing retirement contributions to grow your net worth faster.' };
      } else {
        status = 'Strong Financial Health'; statusColor = '#10B981';
        insight = { tone: 'positive', icon: 'fa-circle-check', headline: 'Excellent! Your net worth is ' + fmt(netWorth) + ' with a healthy ' + debtToAsset + '% debt-to-asset ratio.', detail: 'You are in a strong position. Keep investing consistently, maintain your emergency fund, and consider diversifying into growth assets to compound your wealth.' };
      }

      const assetLabels = ['Cash & Savings', 'Investments', 'Retirement', 'Home', 'Vehicles', 'Other'];
      const assetData = [cash, invest, retire, home, vehicles, other];
      const assetColors = ['#10B981', '#6366F1', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899'];
      const liabilityLabels = ['Credit Cards', 'Personal Loans', 'Mortgage', 'Other Debt'];
      const liabilityData = [cc, loans, mortgage, otherDebt];
      const liabilityColors = ['#EF4444', '#F97316', '#F59E0B', '#94A3B8'];
      const compareChart = { type: 'horizontalBar', labels: ['Assets', 'Liabilities'], datasets: [{ label: 'Amount', data: [totalAssets, totalLiabilities], colors: ['#10B981', '#EF4444'] }], yLabel: 'Amount ($)', title: 'Assets vs Liabilities' };

      const assetRows = [
        { category: 'Cash & Savings', amount: cash, pct: totalAssets > 0 ? roundTo((cash / totalAssets) * 100, 1) : 0 },
        { category: 'Investments',    amount: invest, pct: totalAssets > 0 ? roundTo((invest / totalAssets) * 100, 1) : 0 },
        { category: 'Retirement',     amount: retire, pct: totalAssets > 0 ? roundTo((retire / totalAssets) * 100, 1) : 0 },
        { category: 'Home',           amount: home, pct: totalAssets > 0 ? roundTo((home / totalAssets) * 100, 1) : 0 },
        { category: 'Vehicles',       amount: vehicles, pct: totalAssets > 0 ? roundTo((vehicles / totalAssets) * 100, 1) : 0 },
        { category: 'Other Assets',   amount: other, pct: totalAssets > 0 ? roundTo((other / totalAssets) * 100, 1) : 0 },
      ];
      const liabilityRows = [
        { category: 'Credit Cards',   amount: cc, pct: totalLiabilities > 0 ? roundTo((cc / totalLiabilities) * 100, 1) : 0 },
        { category: 'Personal Loans', amount: loans, pct: totalLiabilities > 0 ? roundTo((loans / totalLiabilities) * 100, 1) : 0 },
        { category: 'Mortgage',       amount: mortgage, pct: totalLiabilities > 0 ? roundTo((mortgage / totalLiabilities) * 100, 1) : 0 },
        { category: 'Other Debt',     amount: otherDebt, pct: totalLiabilities > 0 ? roundTo((otherDebt / totalLiabilities) * 100, 1) : 0 },
      ];

      return {
        stats: [
          { label: 'Net Worth',            value: fmt(netWorth),        highlight: true, color: netWorth >= 0 ? '#10B981' : '#EF4444' },
          { label: 'Total Assets',         value: fmt(totalAssets) },
          { label: 'Total Liabilities',    value: fmt(totalLiabilities), warn: totalLiabilities > 0 },
          { label: 'Status',               value: status,               color: statusColor },
          { label: 'Debt-to-Asset Ratio',  value: debtToAsset + '%',    warn: debtToAsset > 50 },
          { label: 'Asset-to-Liability',   value: assetToLiability === 999 ? '\u221e' : assetToLiability + 'x' },
          { label: 'Liquid Assets',        value: fmt(liquidAssets) },
          { label: 'Liquid-to-Debt Ratio', value: liquidRatio + '%' },
        ],
        insight,
        chart: { labels: assetLabels, data: assetData, colors: assetColors, cutout: '58%' },
        chart2: { labels: liabilityLabels, data: liabilityData, colors: liabilityColors, cutout: '58%' },
        compareChart,
        assetTable: assetRows,
        liabilityTable: liabilityRows,
      };
    },

    howTo: [
      'Enter the value of each asset you own — cash, investments, retirement accounts, home, vehicles, and other valuables.',
      'Enter the balance of each liability you owe — credit cards, personal loans, mortgage, and other debt.',
      'Your net worth is calculated instantly as Total Assets minus Total Liabilities.',
      'Review the asset and liability breakdown charts to see where your wealth is concentrated.',
      'Check your debt-to-asset ratio and liquid-to-debt ratio to assess financial health.',
      'Use the insight callout for a personalized recommendation on improving your net worth.',
    ],
    examples: [
      { title: 'Early Career Professional', input: 'Cash: $15k, Investments: $45k, Retirement: $60k, Home: $350k, Vehicles: $20k | Debt: $5k CC, $8k Loans, $250k Mortgage', result: 'Net Worth: ~$227,000 | Debt-to-Asset: 50%' },
      { title: 'Debt-Heavy Situation', input: 'Cash: $5k, Investments: $10k, Home: $200k | Debt: $15k CC, $20k Loans, $180k Mortgage', result: 'Net Worth: $0 | Debt-to-Asset: 88% — Focus on debt' },
      { title: 'Strong Financial Health', input: 'Cash: $50k, Investments: $150k, Retirement: $200k, Home: $500k | Debt: $0 CC, $0 Loans, $150k Mortgage', result: 'Net Worth: ~$750,000 | Debt-to-Asset: 17%' },
    ],
    formula: 'Net Worth = Total Assets \u2212 Total Liabilities | Debt-to-Asset Ratio = (Total Liabilities \u00f7 Total Assets) \u00d7 100 | Asset-to-Liability Ratio = Total Assets \u00f7 Total Liabilities | Liquid-to-Debt Ratio = (Cash + Investments) \u00f7 Total Liabilities \u00d7 100',
    article: {
      heading: 'How to Calculate Your Net Worth and Build Lasting Wealth',
      intro: 'Your net worth is the single clearest number that captures your financial position — everything you own minus everything you owe. The GetCalcu Net Worth Calculator makes it effortless to track this number, understand where your wealth is concentrated, and identify the fastest path to growing it.',
      sections: [
        { heading: 'Why Net Worth Matters More Than Income', body: 'Income is what you earn; net worth is what you keep. Two people earning the same salary can have wildly different net worths depending on how much they save, invest, and owe. Tracking net worth monthly reveals whether your financial habits are actually building wealth or just cycling money through your accounts.' },
        { heading: 'Assets vs Liabilities: The Core Equation', body: 'Assets are anything you own that has value — cash, investments, retirement accounts, real estate, vehicles, and valuables. Liabilities are what you owe — credit cards, loans, and mortgages. Net worth is simply assets minus liabilities. A positive net worth means you own more than you owe; a negative one signals it is time to prioritize debt reduction.' },
        { heading: 'Using Ratios to Assess Financial Health', body: 'Beyond the headline number, ratios reveal the quality of your balance sheet. The debt-to-asset ratio (liabilities \u00f7 assets) shows how leveraged you are — under 30% is healthy, over 50% is debt-heavy. The liquid-to-debt ratio (cash + investments \u00f7 liabilities) shows whether you could cover your debts with liquid assets in an emergency.' },
      ],
    },
    faqs: [
      { q: 'How do I calculate my net worth?', a: 'Net worth is calculated as Total Assets minus Total Liabilities. Add up everything you own (cash, investments, retirement accounts, home value, vehicles, and other valuables), then subtract everything you owe (credit card debt, personal loans, mortgage balance, and other debts). The result is your net worth.' },
      { q: 'What is a good net worth for my age?', a: 'A common benchmark is to have a net worth equal to 1x your annual income by age 30, 3x by 40, 6x by 50, and 8x by 60. However, these are rough guidelines — what matters most is the trend. If your net worth is growing each month, you are on the right track regardless of your starting point.' },
      { q: 'What is a healthy debt-to-asset ratio?', a: 'A debt-to-asset ratio under 30% is generally considered healthy, 30-50% is manageable, and above 50% is debt-heavy. The ratio is calculated as Total Liabilities \u00f7 Total Assets \u00d7 100. A lower ratio means you own a larger share of your assets outright.' },
      { q: 'Should I include my home and mortgage in net worth?', a: 'Yes. Your home is an asset at its current market value, and your mortgage is a liability at its remaining balance. Including both gives an accurate picture of your true net worth. Many people are surprised to find their home equity is their largest single asset.' },
      { q: 'How often should I track my net worth?', a: 'Most financial experts recommend tracking net worth monthly. This cadence is frequent enough to catch problems early (like rising debt) but not so frequent that market fluctuations create noise. Monthly tracking also lets you see the compounding effect of consistent saving and investing.' },
      { q: 'What is the difference between net worth and income?', a: 'Income is the money you earn over a period (monthly or annually), while net worth is the total value of what you own minus what you owe at a single point in time. You can have a high income and low net worth if you spend everything, or a modest income and growing net worth through disciplined saving and investing.' },
    ],
  },

  // ── FIRE Calculator ─────────────────────────────────────
  'fire-calculator': {
    id: 'fire-calculator',
    name: 'FIRE Calculator',
    category: 'Finance',
    icon: 'fa-fire',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate your Financial Independence target, estimate when you can retire early, and visualize your journey toward financial freedom.',
    metaTitle: 'FIRE Calculator – Financial Independence & Early Retirement',
    metaDescription: 'Free FIRE Calculator. Calculate your FIRE number, retirement timeline, investment growth, passive income, and financial independence progress with interactive charts.',
    keywords: [
      'fire calculator',
      'financial independence calculator',
      'early retirement calculator',
      'coast fire calculator',
      'fi number calculator',
      'financial freedom calculator',
      'retirement savings calculator',
      'years until retirement calculator',
      'fire number',
      '4 percent rule calculator',
    ],
    fields: [
      { id: 'annual_income',       label: 'Annual After-Tax Income ($)', type: 'range', default: 80000,  min: 10000,  max: 500000,  step: 1000,  hint: 'Your total yearly income after taxes. Used to calculate your savings rate.' },
      { id: 'annual_expenses',     label: 'Annual Expenses ($)',         type: 'range', default: 40000,  min: 5000,   max: 300000,  step: 500,   hint: 'Your total yearly spending. The difference between income and expenses is your annual savings.' },
      { id: 'current_portfolio',   label: 'Current Investment Portfolio ($)', type: 'range', default: 100000, min: 0, max: 10000000, step: 1000, hint: 'Your current total invested assets across all accounts (401k, IRA, brokerage, etc.).' },
      { id: 'monthly_contribution',label: 'Monthly Investment Contribution ($)', type: 'range', default: 2000, min: 0, max: 25000, step: 100, hint: 'How much you add to your investments each month.' },
      { id: 'annual_return',       label: 'Expected Annual Investment Return (%)', type: 'range', default: 7, min: 1, max: 15, step: 0.1, hint: 'Expected average yearly return. S&P 500 long-term average: about 7-10%. <a href="#faqs">See realistic return rates ↓</a>' },
      { id: 'inflation_rate',      label: 'Inflation Rate (%)',          type: 'range', default: 2.5, min: 0, max: 10, step: 0.1, hint: 'Expected annual inflation rate. US historical average: 2.5-3%. <a href="#faqs">See how inflation affects FIRE ↓</a>' },
      { id: 'withdrawal_rate',     label: 'Safe Withdrawal Rate (%)',    type: 'range', default: 4, min: 2, max: 6, step: 0.1, hint: 'The percentage of your portfolio you withdraw annually in retirement. The 4% rule is the standard benchmark. <a href="#faqs">See the 4% rule explained ↓</a>' },
      { id: 'retirement_spending', label: 'Retirement Spending Adjustment', type: 'select', default: 'same',
        options: [
          { value: 'same',     label: 'Same Spending' },
          { value: 'increase', label: 'Increase Spending (+20%)' },
          { value: 'reduce',   label: 'Reduce Spending (-20%)' },
        ], hint: 'Adjust your retirement expenses relative to your current spending. Many retirees spend less, but some plan for more travel and leisure.' },
      { id: 'fire_mode',           label: 'Calculation Mode',            type: 'select', default: 'standard',
        options: [
          { value: 'standard', label: 'Standard FIRE' },
          { value: 'lean',     label: 'Lean FIRE' },
          { value: 'fat',      label: 'Fat FIRE' },
          { value: 'coast',    label: 'Coast FIRE' },
          { value: 'barista',  label: 'Barista FIRE' },
        ], hint: 'Choose your FIRE strategy. Each mode adjusts assumptions to match different retirement lifestyles. <a href="#faqs">See FIRE types explained ↓</a>' },
    ],
    calculate(v) {
      // ── Extract & validate inputs
      const income = safeNum(v.annual_income, 80000);
      const expenses = safeNum(v.annual_expenses, 40000);
      const portfolio = safeNum(v.current_portfolio, 100000);
      const monthlyContrib = safeNum(v.monthly_contribution, 2000);
      const annualReturn = safeNum(v.annual_return, 7) / 100;
      const inflationRate = safeNum(v.inflation_rate, 2.5) / 100;
      const withdrawalRate = safeNum(v.withdrawal_rate, 4) / 100;
      const spendingAdj = safeStr(v.retirement_spending) || 'same';
      const fireMode = safeStr(v.fire_mode) || 'standard';

      if (income <= 0) return errorResult('Annual income must be greater than zero.');
      if (expenses < 0) return errorResult('Annual expenses cannot be negative.');
      if (expenses >= income) return errorResult('Annual expenses must be less than annual income to save for FIRE. Increase income or reduce expenses.');

      // ── Savings rate
      const savingsRate = (income - expenses) / income * 100;

      // ── Apply FIRE mode adjustments
      let modeMultiplier = 1;
      let modeLabel = 'Standard FIRE';
      let modeDesc = 'Standard FIRE targets your current lifestyle with no adjustment to expenses.';
      switch (fireMode) {
        case 'lean':
          modeMultiplier = 0.75;
          modeLabel = 'Lean FIRE';
          modeDesc = 'Lean FIRE assumes a minimalist lifestyle with 25% lower expenses.';
          break;
        case 'fat':
          modeMultiplier = 1.5;
          modeLabel = 'Fat FIRE';
          modeDesc = 'Fat FIRE assumes a more luxurious lifestyle with 50% higher expenses.';
          break;
        case 'coast':
          modeMultiplier = 1;
          modeLabel = 'Coast FIRE';
          modeDesc = 'Coast FIRE means your current portfolio will grow to your FIRE number without additional contributions.';
          break;
        case 'barista':
          modeMultiplier = 0.85;
          modeLabel = 'Barista FIRE';
          modeDesc = 'Barista FIRE assumes part-time work covers 50% of expenses, reducing the FIRE number needed.';
          break;
      }

      // ── Apply spending adjustment
      let spendingMultiplier = 1;
      switch (spendingAdj) {
        case 'increase': spendingMultiplier = 1.2; break;
        case 'reduce':   spendingMultiplier = 0.8; break;
      }

      // ── Effective retirement expenses
      let effectiveExpenses = expenses * modeMultiplier * spendingMultiplier;
      if (fireMode === 'barista') effectiveExpenses = effectiveExpenses * 0.5; // part-time covers 50%

      // ── FIRE Number
      const fireNumber = effectiveExpenses / withdrawalRate;

      // ── Coast FIRE number (amount needed today to grow to FIRE number)
      let coastNumber = 0;
      if (fireMode === 'coast') {
        const coastYears = 30;
        coastNumber = fireNumber / Math.pow(1 + annualReturn, coastYears);
      }

      // ── Calculate years until FIRE (iterative monthly projection)
      const monthlyRate = annualReturn / 12;
      const maxMonths = 1200; // 100 years max
      let runningPortfolio = portfolio;
      let totalContributions = portfolio;
      let totalGains = 0;
      let monthsToFire = 0;
      let yearsToFire = 0;

      // Growth projection data
      const growthData = [{ year: 0, portfolio: roundTo(portfolio, 2), contributions: roundTo(portfolio, 2), gains: 0 }];

      for (let m = 1; m <= maxMonths; m++) {
        const interest = runningPortfolio * monthlyRate;
        runningPortfolio += interest + monthlyContrib;
        totalContributions += monthlyContrib;
        totalGains += interest;

        if (m % 12 === 0) {
          const year = m / 12;
          growthData.push({
            year,
            portfolio: roundTo(runningPortfolio, 2),
            contributions: roundTo(totalContributions, 2),
            gains: roundTo(totalGains, 2),
          });
        }

        if (runningPortfolio >= fireNumber) {
          monthsToFire = m;
          yearsToFire = m / 12;
          break;
        }
      }

      if (monthsToFire === 0) {
        yearsToFire = maxMonths / 12;
      }

      // ── Inflation-adjusted FIRE number
      const inflationAdjustedFireNumber = fireNumber * Math.pow(1 + inflationRate, yearsToFire);

      // ── Passive income
      const annualPassiveIncome = runningPortfolio * withdrawalRate;
      const monthlyPassiveIncome = annualPassiveIncome / 12;

      // ── Retirement date estimate
      const today = new Date();
      const retirementDate = new Date(today);
      retirementDate.setFullYear(today.getFullYear() + Math.floor(yearsToFire));
      const retirementDateStr = retirementDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // ── Progress percentage
      const progressPct = Math.min(100, (portfolio / fireNumber) * 100);

      // ── Retirement Readiness Score (0-100)
      const savingsScore = Math.min(1, savingsRate / 50);
      const progressScore = progressPct / 100;
      const timeScore = Math.max(0, 1 - yearsToFire / 40);
      const returnScore = Math.min(1, annualReturn / 0.10);
      const withdrawalScore = withdrawalRate <= 0.04 ? 1 : Math.max(0, 1 - (withdrawalRate - 0.04) / 0.02);

      const readinessScore = Math.round(
        savingsScore * 30 + progressScore * 25 + timeScore * 20 + returnScore * 15 + withdrawalScore * 10
      );

      let readinessLabel, readinessColor;
      if (readinessScore >= 80)      { readinessLabel = 'Excellent';        readinessColor = '#10B981'; }
      else if (readinessScore >= 65) { readinessLabel = 'Very Good';         readinessColor = '#3B82F6'; }
      else if (readinessScore >= 50) { readinessLabel = 'Good';              readinessColor = '#F59E0B'; }
      else if (readinessScore >= 30) { readinessLabel = 'Needs Improvement'; readinessColor = '#F97316'; }
      else                           { readinessLabel = 'Getting Started';   readinessColor = '#EF4444'; }

      // ── Chart 1: Portfolio Growth Timeline
      const chartLabels = growthData.map(d => 'Year ' + d.year);
      const portfolioData = growthData.map(d => d.portfolio);
      const fireTargetData = growthData.map(() => fireNumber);
      const contributionsData = growthData.map(d => d.contributions);

      const chart = {
        type: 'line',
        labels: chartLabels,
        yLabel: 'Portfolio Value ($)',
        title: 'Portfolio Growth Timeline',
        datasets: [
          { label: 'Future Portfolio', data: portfolioData, color: '#6366F1', fill: true },
          { label: 'FIRE Target',      data: fireTargetData, color: '#EF4444' },
          { label: 'Total Contributions', data: contributionsData, color: '#10B981' },
        ],
      };

      // ── Chart 2: Portfolio Composition (doughnut)
      const chart2 = {
        labels: ['Contributions', 'Investment Gains'],
        data: [roundTo(totalContributions, 2), roundTo(Math.max(0, totalGains), 2)],
        colors: ['#6366F1', '#10B981'],
        cutout: '62%',
      };

      // ── Chart 3: Progress to FIRE (doughnut gauge)
      const compareChart = {
        labels: ['Progress to FIRE', 'Remaining'],
        data: [roundTo(progressPct, 2), roundTo(Math.max(0, 100 - progressPct), 2)],
        colors: ['#10B981', '#E2E8F0'],
        cutout: '70%',
      };

      // ── Scenario Comparison Table
      // Optimized plan: 25% higher contributions, 1% higher return, 10% lower expenses
      const altMonthlyContrib = monthlyContrib * 1.25;
      const altReturn = Math.min(annualReturn + 0.01, 0.15);
      const altExpenses = expenses * 0.9;
      const altEffectiveExpenses = altExpenses * modeMultiplier * spendingMultiplier;
      const altFireNumber = altEffectiveExpenses / withdrawalRate;

      let altPortfolio = portfolio;
      let altMonthsToFire = 0;
      const altMonthlyRate = altReturn / 12;
      for (let m = 1; m <= maxMonths; m++) {
        altPortfolio = altPortfolio * (1 + altMonthlyRate) + altMonthlyContrib;
        if (altPortfolio >= altFireNumber) {
          altMonthsToFire = m;
          break;
        }
      }
      const altYearsToFire = altMonthsToFire > 0 ? altMonthsToFire / 12 : 100;
      const yearsSaved = Math.max(0, yearsToFire - altYearsToFire);

      const table = {
        mode: 'comparison',
        title: 'Scenario Comparison: Current Plan vs Optimized Plan',
        columns: [
          { key: 'metric', label: 'Metric', format: 'text' },
          { key: 'current', label: 'Current Plan', format: 'text' },
          { key: 'optimized', label: 'Optimized Plan', format: 'text', emphasis: true },
          { key: 'difference', label: 'Difference', format: 'text' },
        ],
        rows: [
          { metric: 'FIRE Number', current: fmt(fireNumber), optimized: fmt(altFireNumber), difference: fmt(altFireNumber - fireNumber) },
          { metric: 'Years to FIRE', current: yearsToFire >= 100 ? '100+ yrs' : yearsToFire.toFixed(1) + ' yrs', optimized: altYearsToFire >= 100 ? '100+ yrs' : altYearsToFire.toFixed(1) + ' yrs', difference: yearsSaved > 0 ? yearsSaved.toFixed(1) + ' yrs saved' : '—' },
          { metric: 'Monthly Contribution', current: fmt(monthlyContrib), optimized: fmt(altMonthlyContrib), difference: fmt(altMonthlyContrib - monthlyContrib) },
          { metric: 'Annual Return', current: (annualReturn * 100).toFixed(1) + '%', optimized: (altReturn * 100).toFixed(1) + '%', difference: ((altReturn - annualReturn) * 100).toFixed(1) + '%' },
          { metric: 'Annual Expenses', current: fmt(expenses), optimized: fmt(altExpenses), difference: fmt(altExpenses - expenses) },
        ],
      };

      // ── Insight callout
      let insightTone = 'positive';
      let insightIcon = 'fa-fire';
      let insightHeadline, insightDetail;

      if (yearsToFire >= 100) {
        insightTone = 'warning';
        insightIcon = 'fa-triangle-exclamation';
        insightHeadline = 'Your current plan will not reach FIRE within 100 years.';
        insightDetail = 'Your savings rate of ' + savingsRate.toFixed(1) + '% is too low to reach your FIRE number of ' + fmt(fireNumber) + '. Consider increasing your monthly contribution or reducing expenses.';
      } else if (progressPct >= 100) {
        insightTone = 'positive';
        insightIcon = 'fa-circle-check';
        insightHeadline = 'Congratulations! You have already reached your FIRE number of ' + fmt(fireNumber) + '.';
        insightDetail = 'Your current portfolio of ' + fmt(portfolio) + ' exceeds your FIRE target. You are financially independent and can retire early if you choose.';
      } else {
        insightTone = 'positive';
        insightIcon = 'fa-fire';
        insightHeadline = 'You are ' + progressPct.toFixed(1) + '% of the way to your FIRE number of ' + fmt(fireNumber) + '.';
        insightDetail = 'At your current savings rate of ' + savingsRate.toFixed(1) + '%, you can reach financial independence in approximately ' + yearsToFire.toFixed(1) + ' years (' + retirementDateStr + '). Your portfolio would generate ' + fmt(annualPassiveIncome) + ' per year in passive income.';
      }

      const insight = { tone: insightTone, icon: insightIcon, headline: insightHeadline, detail: insightDetail };

      // ── Build stats
      const stats = [
        { label: 'FIRE Number', value: fmt(fireNumber), highlight: true },
        { label: 'Current Progress', value: progressPct.toFixed(1) + '%', color: progressPct >= 100 ? '#10B981' : '#6366F1' },
        { label: 'Current Net Worth', value: fmt(portfolio) },
        { label: 'Years Until FIRE', value: yearsToFire >= 100 ? '100+ years' : yearsToFire.toFixed(1) + ' years', highlight: true },
        { label: 'Retirement Date Estimate', value: retirementDateStr },
        { label: 'Annual Passive Income', value: fmt(annualPassiveIncome) },
        { label: 'Monthly Passive Income', value: fmt(monthlyPassiveIncome) },
        { label: 'Savings Rate', value: savingsRate.toFixed(1) + '%' },
        { label: 'Total Contributions', value: fmt(totalContributions) },
        { label: 'Total Investment Growth', value: fmt(totalGains) },
        { label: 'Inflation-Adjusted FIRE Number', value: fmt(inflationAdjustedFireNumber) },
        { label: 'Retirement Readiness', value: readinessLabel + ' (' + readinessScore + '/100)', color: readinessColor },
      ];

      return { stats, chart, chart2, compareChart, table, insight };
    },

    // ── How-To Guide
    howTo: [
      'Enter your annual after-tax income and annual expenses — the calculator instantly computes your savings rate.',
      'Add your current investment portfolio value and monthly contribution amount.',
      'Set your expected annual return (7-8% is a realistic long-term average for a diversified stock portfolio) and inflation rate (2.5-3% historical average).',
      'Choose your safe withdrawal rate — the 4% rule is the standard benchmark for a 30-year retirement.',
      'Select your retirement spending adjustment and FIRE mode (Standard, Lean, Fat, Coast, or Barista) to match your lifestyle goals.',
      'Review your FIRE number, years until financial independence, passive income projections, and readiness score.',
      'Use the scenario comparison table to see how increasing contributions, boosting returns, or cutting expenses accelerates your timeline.',
    ],

    // ── Real-World Examples
    examples: [
      {
        title: 'Standard FIRE at 45',
        input: 'Income: $80,000, Expenses: $40,000, Portfolio: $100,000, Monthly: $2,000, Return: 7%, Inflation: 2.5%, Withdrawal: 4%',
        result: 'FIRE Number: $1,000,000 | Years to FIRE: ~17.5 years | Savings Rate: 50%',
      },
      {
        title: 'Lean FIRE with Minimalist Lifestyle',
        input: 'Income: $60,000, Expenses: $25,000, Portfolio: $50,000, Monthly: $1,500, Return: 7%, Inflation: 2.5%, Withdrawal: 4%, Lean FIRE',
        result: 'FIRE Number: ~$468,750 | Years to FIRE: ~14 years | Savings Rate: 58%',
      },
      {
        title: 'Coast FIRE — Let Compounding Do the Work',
        input: 'Income: $100,000, Expenses: $50,000, Portfolio: $200,000, Monthly: $2,500, Return: 7%, Inflation: 2.5%, Withdrawal: 4%, Coast FIRE',
        result: 'Coast Number: ~$131,000 | Current portfolio exceeds coast number — compounding alone reaches FIRE',
      },
      {
        title: 'Aggressive Early Retirement at 40',
        input: 'Income: $120,000, Expenses: $45,000, Portfolio: $150,000, Monthly: $4,000, Return: 8%, Inflation: 2.5%, Withdrawal: 4%',
        result: 'FIRE Number: $1,125,000 | Years to FIRE: ~12 years | Savings Rate: 62.5%',
      },
    ],
    formula: 'FIRE Number = Annual Retirement Expenses ÷ Safe Withdrawal Rate | Savings Rate = (Income − Expenses) ÷ Income × 100 | FV = P(1+r)^n + PMT × [((1+r)^n − 1) / r] | Inflation-Adjusted FIRE = FIRE Number × (1 + Inflation)^Years | Monthly Passive Income = Portfolio × Withdrawal Rate ÷ 12',

    // ── SEO Article Content
    article: {
      heading: 'The Complete Guide to FIRE: Financial Independence, Retire Early',
      intro: 'The FIRE (Financial Independence, Retire Early) movement has transformed how millions of people think about work, savings, and life. Instead of working until 65, FIRE practitioners aggressively save and invest a large portion of their income — often 50% or more — to build a portfolio large enough to fund their lifestyle indefinitely. The GetCalcu FIRE Calculator helps you determine your FIRE number, estimate how long it will take to reach financial independence, and visualize your journey with interactive charts.',
      sections: [
        { heading: 'What is FIRE?', body: 'FIRE stands for Financial Independence, Retire Early. It is a lifestyle movement focused on saving aggressively (typically 50-70% of income) and investing those savings in low-cost index funds or other growth assets. The goal is to build a portfolio large enough that its investment returns can cover your living expenses indefinitely — giving you the freedom to retire decades earlier than the traditional retirement age of 65.' },
        { heading: 'How FIRE Works', body: 'FIRE works through three interconnected principles: saving aggressively, investing consistently, and letting compound growth do the heavy lifting. By saving 50% or more of your income, you dramatically shorten the time needed to reach financial independence. Your investments grow through compound returns — each year\'s gains earn gains in future years. Once your portfolio reaches roughly 25 times your annual expenses (the 4% rule), you can safely withdraw 4% per year indefinitely.' },
        { heading: 'Understanding the 4% Rule', body: 'The 4% rule originated from the Trinity Study, a landmark 1998 research paper that analyzed historical stock and bond returns. It found that withdrawing 4% of your portfolio in the first year of retirement, then adjusting for inflation each year, had a high probability of lasting 30 years. This translates to a FIRE number of 25 times your annual expenses. While the 4% rule has limitations — it assumes a 30-year retirement and historical market conditions — it remains the most widely used benchmark in the FIRE community.' },
        { heading: 'Types of FIRE', body: 'The FIRE movement has evolved into several distinct strategies. Standard FIRE targets your current lifestyle with a 4% withdrawal rate. Lean FIRE assumes a minimalist lifestyle with significantly lower expenses (often 25-50% less). Fat FIRE targets a more luxurious retirement with higher spending. Coast FIRE means your current portfolio will grow to your FIRE number without additional contributions — you just need to cover current expenses. Barista FIRE combines part-time work with a smaller portfolio, where part-time income covers a portion of expenses.' },
        { heading: 'How to Reach FIRE Faster', body: 'Accelerating your path to FIRE requires a multi-pronged approach. Increasing your income through career advancement, side hustles, or freelancing gives you more to save. Reducing expenses through mindful spending, downsizing, or geo-arbitrage (living in lower-cost areas) boosts your savings rate. Investing in low-cost index funds with 7-10% historical returns maximizes compound growth. Tax efficiency — using 401(k)s, IRAs, HSAs, and taxable accounts strategically — keeps more of your returns. Diversification across asset classes reduces risk. Automating your savings ensures consistency. And taking advantage of employer retirement plan matches is essentially free money.' },
        { heading: 'Common FIRE Mistakes', body: 'Even well-intentioned FIRE practitioners make mistakes. Ignoring inflation can leave you short in retirement — always use inflation-adjusted returns. Unrealistic return assumptions (expecting 12%+ annually) can derail your plan. Spending creep — gradually increasing expenses as income rises — undermines your savings rate. Poor diversification concentrates risk in a single asset class. Early withdrawals from retirement accounts trigger penalties and taxes. And underestimating healthcare costs — especially before Medicare eligibility — is one of the most common FIRE planning errors.' },
        { heading: 'FIRE Calculation Formula', body: 'The core FIRE formula is: FIRE Number = Annual Retirement Expenses ÷ Safe Withdrawal Rate. For example, if your annual expenses are $50,000 and you use a 4% withdrawal rate, your FIRE number is $1,250,000. To project portfolio growth, use the compound interest formula: FV = P(1+r)^n + PMT × [((1+r)^n − 1) / r], where P is your current portfolio, r is the monthly return rate, n is the number of months, and PMT is your monthly contribution. The inflation-adjusted FIRE number accounts for rising costs: Inflation-Adjusted FIRE = FIRE Number × (1 + Inflation Rate)^Years.' },
        { heading: 'Example Calculation', body: 'Consider a realistic scenario: You earn $80,000 after taxes, spend $40,000 annually, have $100,000 invested, and contribute $2,000 monthly. Your savings rate is 50%. Using a 4% withdrawal rate, your FIRE number is $1,000,000. With a 7% annual return, your portfolio grows to $1,000,000 in approximately 17.5 years. At that point, your portfolio generates $40,000 per year in passive income — exactly matching your expenses. Adjusting for 2.5% inflation, you would need approximately $1,540,000 in future dollars to maintain the same purchasing power.' },
      ],
    },

    // ── Schema-Ready FAQs
    faqs: [
      { q: 'What is a good FIRE number?', a: 'A good FIRE number is typically 25 times your annual retirement expenses, based on the 4% rule. For example, if you plan to spend $40,000 per year in retirement, your FIRE number is $1,000,000. However, your specific FIRE number depends on your lifestyle, withdrawal rate, and expected retirement duration. Use our FIRE Calculator to find your personalized number.' },
      { q: 'Is the 4% rule still valid?', a: 'The 4% rule, derived from the Trinity Study, remains a widely used benchmark but has limitations. It assumes a 30-year retirement, a 50/50 stock-bond portfolio, and historical market conditions. Some financial experts suggest a 3-3.5% withdrawal rate for longer retirements (40+ years) or conservative portfolios. The 4% rule is a useful starting point, but you should stress-test your plan with different scenarios.' },
      { q: 'How much should I save for FIRE?', a: 'The amount you need to save depends on your target FIRE number and timeline. A common benchmark is saving 50% of your after-tax income, which typically allows FIRE in 15-20 years. Saving 25% takes about 30 years, while saving 70% can achieve FIRE in under 10 years. Use our FIRE Calculator to see how your savings rate affects your timeline.' },
      { q: 'Can I retire at 40?', a: 'Yes, retiring at 40 is achievable with aggressive saving and investing. To retire at 40, you typically need a savings rate of 50-70% of your income and a portfolio of 25-30 times your annual expenses. For example, with $50,000 annual expenses, you would need $1.25-1.5 million. Starting early, maximizing income, and keeping expenses low are the keys to early retirement.' },
      { q: 'What is Coast FIRE?', a: 'Coast FIRE is a FIRE strategy where your current portfolio is large enough that it will grow to your FIRE number by retirement age without any additional contributions. You "coast" on compound growth while working to cover current expenses. For example, if you need $1,000,000 at age 60 and have 30 years to grow at 7%, you only need about $131,000 today to reach that goal.' },
      { q: 'What is Lean FIRE?', a: 'Lean FIRE is a FIRE strategy that targets a minimalist lifestyle with significantly lower expenses — often 25-50% less than a standard lifestyle. Lean FIRE practitioners typically aim for a FIRE number of $500,000-$750,000, which supports $20,000-$30,000 in annual spending at a 4% withdrawal rate. This approach requires frugal living but can be achieved much faster.' },
      { q: 'How accurate is this calculator?', a: 'This FIRE Calculator uses standard financial formulas (compound interest, the 4% rule, inflation adjustment) and provides accurate projections based on your inputs. However, all financial projections involve uncertainty — actual market returns, inflation, and expenses will vary. Use conservative assumptions and review your plan regularly. The calculator is a planning tool, not a guarantee.' },
      { q: 'Should inflation be included in FIRE calculations?', a: 'Yes, absolutely. Inflation erodes purchasing power over time — at 2.5% annual inflation, $1,000,000 today will only buy about $477,000 worth of goods in 30 years. Our FIRE Calculator shows both your nominal FIRE number and the inflation-adjusted amount you will actually need in future dollars.' },
      { q: 'What investment return should I assume?', a: 'For long-term stock market investments (15+ years), historical S&P 500 returns average 7-10% annually before inflation, or 4-7% after inflation. A conservative planning assumption is 6-7% nominal or 4-5% real return. For a balanced 60/40 portfolio, use 5-7%. Always use a rate you are comfortable with and stress-test with lower returns.' },
      { q: 'What happens if markets decline?', a: 'Market declines are normal and expected — the stock market has experienced 10-20% drawdowns roughly every 3-5 years. During the accumulation phase, market declines are actually beneficial because your contributions buy more shares at lower prices. The risk is highest during the withdrawal phase, which is why the 4% rule and having a cash buffer are important. Consider a bond tent or cash reserve to weather early-retirement market downturns.' },
      { q: 'What is Barista FIRE?', a: 'Barista FIRE is a hybrid strategy where you retire from your full-time career but continue working part-time (like at a coffee shop, hence the name) to cover a portion of your expenses. This reduces the FIRE number you need, since part-time income covers some costs. It also provides health insurance benefits in some cases, which can be a significant advantage before Medicare eligibility.' },
      { q: 'How does the savings rate affect my FIRE timeline?', a: 'Your savings rate is the single most powerful factor in your FIRE timeline. At a 10% savings rate, FIRE takes about 51 years. At 25%, it takes about 32 years. At 50%, it takes about 17 years. At 70%, it takes about 9 years. The relationship is exponential — small increases in savings rate near the high end dramatically shorten your timeline.' },
      { q: 'What is the difference between FIRE and traditional retirement?', a: 'Traditional retirement typically means working until age 65-67, relying on Social Security, pensions, and retirement accounts. FIRE means achieving financial independence much earlier — often in your 30s, 40s, or 50s — by saving aggressively and living on investment income. FIRE gives you the freedom to choose how you spend your time, whether that means retiring completely, working part-time, or pursuing passion projects.' },
      { q: 'How do taxes affect my FIRE plan?', a: 'Taxes can significantly impact your FIRE journey. Using tax-advantaged accounts (401(k), IRA, HSA) reduces your current tax burden and accelerates growth. In retirement, strategically withdrawing from taxable, tax-deferred, and tax-free accounts can minimize your tax bill. Consider Roth conversion ladders to access retirement funds before age 59.5 without penalties. Our calculator uses after-tax income, so your savings rate already reflects your tax situation.' },
      { q: 'What is the 25x rule?', a: 'The 25x rule is a quick way to estimate your FIRE number: multiply your annual expenses by 25. This is derived from the 4% rule — if you can withdraw 4% of your portfolio annually, you need 25 times your annual expenses (1 ÷ 0.04 = 25). For example, $40,000 in annual expenses × 25 = $1,000,000 FIRE number.' },
    ],
  },

  // ── Amortization Calculator ─────────────────────────────────────
  'amortization-calculator': {
    id: 'amortization-calculator',
    name: 'Amortization Calculator',
    category: 'Finance',
    icon: 'fa-chart-simple',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate loan payments, generate a complete amortization schedule, visualize principal and interest over time, and analyze the impact of extra payments.',
    metaTitle: 'Amortization Calculator – Loan Payment & Schedule | GetCalcu',
    metaDescription: 'Free Amortization Calculator with interactive charts, payment schedule, extra payment analysis, and downloadable loan repayment tables. Compare scenarios and see how extra payments save interest.',
    keywords: [
      'amortization calculator',
      'loan amortization calculator',
      'mortgage amortization calculator',
      'loan payment calculator',
      'amortization schedule',
      'mortgage payment calculator',
      'principal and interest calculator',
      'extra payment calculator',
      'monthly loan payment calculator',
      'loan repayment calculator',
    ],
    fields: [
      // ── Loan Details Section ──
      { id: 'sec_loan', type: 'section', label: 'Loan Details', icon: 'fa-file-invoice' },
      { id: 'loan_amount',     label: 'Loan Amount ($)',               type: 'range', default: 300000, min: 1000,   max: 5000000, step: 1000,  hint: 'The total amount you are borrowing (the principal).' },
      { id: 'interest_rate',   label: 'Annual Interest Rate (%)',      type: 'range', default: 6.5,    min: 0,      max: 25,      step: 0.05,  hint: 'The yearly interest rate (APR) on your loan.' },
      { id: 'loan_term',       label: 'Loan Term',                     type: 'select', default: 30,
        options: [5,10,15,20,25,30,40].map(v => ({ value: v, label: `${v} Years` })), hint: 'How long you have to repay the loan in full.' },
      { id: 'payment_freq',    label: 'Payment Frequency',             type: 'select', default: 'monthly',
        options: [
          { value: 'monthly',  label: 'Monthly (12/yr)' },
          { value: 'biweekly', label: 'Bi-Weekly (26/yr)' },
          { value: 'weekly',   label: 'Weekly (52/yr)' },
        ], hint: 'How often you make payments. More frequent payments reduce total interest.' },
      { id: 'compounding_freq', label: 'Compounding Frequency',        type: 'select', default: 'monthly',
        options: [
          { value: 'monthly',      label: 'Monthly (12/yr)' },
          { value: 'quarterly',    label: 'Quarterly (4/yr)' },
          { value: 'semi-annual',  label: 'Semi-Annual (2/yr)' },
          { value: 'annually',     label: 'Annual (1/yr)' },
        ], hint: 'How often interest is compounded. Monthly is standard for most loans.' },
      { id: 'loan_start_date', label: 'Loan Start Date',               type: 'date', default: () => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0];
      }, hint: 'When the loan begins. Used to generate the payment schedule with dates.' },

      // ── Extra Payments Section ──
      { id: 'sec_extra', type: 'section', label: 'Extra Payments', icon: 'fa-bolt' },
      { id: 'extra_monthly',   label: 'Extra Monthly Payment ($)',     type: 'range', default: 0,      min: 0,      max: 10000,   step: 50,    hint: 'Additional amount paid each month to reduce principal faster.' },
      { id: 'extra_one_time',  label: 'One-Time Extra Payment ($)',    type: 'number', default: 0,     min: 0,      step: 100,    hint: 'A single lump-sum extra payment made at a specific date.' },
      { id: 'extra_one_time_date', label: 'One-Time Payment Date',     type: 'date', default: () => {
        const d = new Date(); d.setMonth(d.getMonth() + 12); return d.toISOString().split('T')[0];
      }, condition: v => safeNum(v.extra_one_time, 0) > 0, hint: 'When the one-time extra payment is made.' },
      { id: 'extra_annual',    label: 'Annual Extra Payment ($)',      type: 'number', default: 0,     min: 0,      step: 100,    hint: 'An extra payment made once every year (e.g. from a bonus or tax refund).' },

      // ── Taxes & Insurance Section ──
      { id: 'sec_tax_ins', type: 'section', label: 'Taxes & Insurance', icon: 'fa-shield' },
      { id: 'include_tax_insurance', label: 'Include Taxes & Insurance', type: 'select', default: 'no',
        options: [
          { value: 'no',  label: 'No — Show Principal & Interest Only' },
          { value: 'yes', label: 'Yes — Include Full Monthly Housing Payment' },
        ], hint: 'Toggle to include property taxes, insurance, HOA, and PMI in your monthly payment.' },
      { id: 'annual_property_tax',  label: 'Annual Property Tax ($)',  type: 'number', default: 4800,  min: 0,      step: 100,   condition: v => v.include_tax_insurance === 'yes', hint: 'Yearly property tax, spread across monthly payments.' },
      { id: 'annual_home_insurance', label: 'Annual Home Insurance ($)', type: 'number', default: 1200, min: 0,     step: 100,   condition: v => v.include_tax_insurance === 'yes', hint: 'Yearly homeowners insurance premium.' },
      { id: 'hoa_fees',        label: 'Monthly HOA Fees ($)',          type: 'number', default: 0,     min: 0,      step: 25,    condition: v => v.include_tax_insurance === 'yes', hint: 'Monthly homeowners association fees.' },
      { id: 'pmi',             label: 'Monthly PMI ($)',               type: 'number', default: 0,     min: 0,      step: 10,    condition: v => v.include_tax_insurance === 'yes', hint: 'Private Mortgage Insurance (required when down payment is less than 20%).' },

      // ── Comparison Mode Section ──
      { id: 'sec_compare', type: 'section', label: 'Comparison Mode', icon: 'fa-not-equal' },
      { id: 'comparison_mode', label: 'Comparison Mode', type: 'select', default: 'single',
        options: [
          { value: 'single',  label: 'Single Scenario' },
          { value: 'compare', label: 'Compare Two Scenarios' },
        ], hint: 'Compare two loan scenarios side by side to see the difference in payments and interest.' },
      { id: 'compare_loan_amount',  label: 'Scenario B: Loan Amount ($)',    type: 'number', default: 300000, min: 1000,  step: 1000, condition: v => v.comparison_mode === 'compare', hint: 'Loan amount for the second scenario.' },
      { id: 'compare_interest_rate', label: 'Scenario B: Interest Rate (%)', type: 'number', default: 5.9,   min: 0,     step: 0.05, condition: v => v.comparison_mode === 'compare', hint: 'Annual interest rate for the second scenario.' },
      { id: 'compare_loan_term',     label: 'Scenario B: Loan Term',         type: 'select', default: 15,
        options: [5,10,15,20,25,30,40].map(v => ({ value: v, label: `${v} Years` })), condition: v => v.comparison_mode === 'compare', hint: 'Loan term for the second scenario.' },
      { id: 'compare_extra_monthly', label: 'Scenario B: Extra Monthly ($)', type: 'number', default: 0,     min: 0,     step: 50,   condition: v => v.comparison_mode === 'compare', hint: 'Extra monthly payment for the second scenario.' },
    ],
    fieldLabels(v) {
      return {};
    },
    calculate(v) {
      // ── Helper: compute per-period interest rate ──
      function getPeriodicRate(annualRate, ppy, compoundingFreq) {
        const cpY = { monthly: 12, quarterly: 4, 'semi-annual': 2, annually: 1 }[compoundingFreq] || 12;
        // Convert annual rate to effective rate given compounding frequency, then to period rate
        const effectiveAnnual = Math.pow(1 + annualRate / 100 / cpY, cpY) - 1;
        const periodicRate = Math.pow(1 + effectiveAnnual, 1 / ppy) - 1;
        return periodicRate;
      }

      // ── Helper: generate amortization schedule ──
      function generateSchedule(principal, payment, periodicRate, ppy, totalPayments, extraMonthly, extraOneTime, extraOneTimeDate, extraAnnual, loanStartDate, includeTaxIns, taxMonthly, insMonthly, hoaMonthly, pmiMonthly) {
        const rows = [];
        let balance = principal;
        let totalInterest = 0;
        let totalPrincipal = 0;
        let totalExtraPayments = 0;
        let currentDate = new Date(loanStartDate);
        const oneTimeDate = extraOneTime > 0 && extraOneTimeDate ? new Date(extraOneTimeDate) : null;

        for (let i = 1; i <= totalPayments && balance > 0.005; i++) {
          const interest = roundTo(balance * periodicRate, 2);
          let scheduledPrincipal = roundTo(payment - interest, 2);
          if (scheduledPrincipal > balance) scheduledPrincipal = balance;

          let extraPayment = 0;
          // Extra monthly payment
          if (extraMonthly > 0) {
            extraPayment = Math.min(extraMonthly, balance - scheduledPrincipal);
          }
          // One-time extra payment
          if (oneTimeDate && extraOneTime > 0) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const otDateStr = oneTimeDate.toISOString().split('T')[0];
            if (dateStr === otDateStr) {
              const otExtra = Math.min(extraOneTime, balance - scheduledPrincipal - extraPayment);
              extraPayment += otExtra;
            }
          }
          // Annual extra payment (once per year, on the payment that corresponds to the anniversary)
          if (extraAnnual > 0 && i % ppy === 0) {
            const annExtra = Math.min(extraAnnual, balance - scheduledPrincipal - extraPayment);
            extraPayment += annExtra;
          }

          const totalPrincipalPaid = roundTo(scheduledPrincipal + extraPayment, 2);
          if (totalPrincipalPaid > balance) {
            extraPayment = Math.max(0, balance - scheduledPrincipal);
          }

          totalInterest += interest;
          totalPrincipal += scheduledPrincipal;
          totalExtraPayments += extraPayment;
          balance = roundTo(balance - scheduledPrincipal - extraPayment, 2);
          if (balance < 0) balance = 0;

          const paymentAmount = roundTo(payment + extraPayment + (includeTaxIns ? (taxMonthly + insMonthly + hoaMonthly + pmiMonthly) : 0), 2);
          const taxInsAmount = includeTaxIns ? roundTo(taxMonthly + insMonthly + hoaMonthly + pmiMonthly, 2) : 0;

          rows.push({
            month: i,
            payment: paymentAmount,
            principal: roundTo(scheduledPrincipal, 2),
            interest: roundTo(interest, 2),
            extraPayment: roundTo(extraPayment, 2),
            balance: Math.max(0, balance),
            taxInsurance: taxInsAmount,
            date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          });

          // Advance date
          if (ppy === 12) {
            currentDate.setMonth(currentDate.getMonth() + 1);
          } else if (ppy === 26) {
            currentDate.setDate(currentDate.getDate() + 14);
          } else if (ppy === 52) {
            currentDate.setDate(currentDate.getDate() + 7);
          }

          if (balance <= 0) break;
        }

        return { rows, totalInterest, totalPrincipal, totalExtraPayments, totalPaymentsMade: rows.length };
      }

      // ── Extract inputs ──
      const principal = safeNum(v.loan_amount, 300000);
      const annualRate = safeNum(v.interest_rate, 6.5);
      const loanTerm = Math.round(safeNum(v.loan_term, 30));
      const paymentFreq = safeStr(v.payment_freq) || 'monthly';
      const compoundingFreq = safeStr(v.compounding_freq) || 'monthly';
      const loanStartDate = safeStr(v.loan_start_date) || new Date().toISOString().split('T')[0];
      const extraMonthly = safeNum(v.extra_monthly, 0);
      const extraOneTime = safeNum(v.extra_one_time, 0);
      const extraOneTimeDate = safeStr(v.extra_one_time_date) || '';
      const extraAnnual = safeNum(v.extra_annual, 0);
      const includeTaxIns = safeStr(v.include_tax_insurance) === 'yes';
      const taxMonthly = includeTaxIns ? safeNum(v.annual_property_tax, 0) / 12 : 0;
      const insMonthly = includeTaxIns ? safeNum(v.annual_home_insurance, 0) / 12 : 0;
      const hoaMonthly = includeTaxIns ? safeNum(v.hoa_fees, 0) : 0;
      const pmiMonthly = includeTaxIns ? safeNum(v.pmi, 0) : 0;

      if (principal <= 0) return errorResult('Loan amount must be greater than zero.');
      if (annualRate < 0) return errorResult('Interest rate cannot be negative.');
      if (loanTerm < 1) return errorResult('Loan term must be at least 1 year.');

      // ── Payment frequency adjustments ──
      const ppy = { monthly: 12, biweekly: 26, weekly: 52 }[paymentFreq] || 12;
      const totalPayments = loanTerm * ppy;
      const periodicRate = annualRate === 0 ? 0 : getPeriodicRate(annualRate, ppy, compoundingFreq);

      // ── Calculate payment ──
      let payment;
      if (periodicRate === 0) {
        payment = principal / totalPayments;
      } else {
        payment = principal * (periodicRate * Math.pow(1 + periodicRate, totalPayments)) / (Math.pow(1 + periodicRate, totalPayments) - 1);
      }
      payment = roundTo(payment, 2);

      // ── Generate schedule ──
      const scheduleData = generateSchedule(principal, payment, periodicRate, ppy, totalPayments, extraMonthly, extraOneTime, extraOneTimeDate, extraAnnual, loanStartDate, includeTaxIns, taxMonthly, insMonthly, hoaMonthly, pmiMonthly);
      const { rows, totalInterest, totalPrincipal, totalExtraPayments, totalPaymentsMade } = scheduleData;

      // ── Calculate totals ──
      const totalPaid = roundTo(totalPrincipal + totalInterest, 2);
      const totalWithExtras = roundTo(totalPaid + totalExtraPayments, 2);
      const totalTaxInsPaid = includeTaxIns ? roundTo((taxMonthly + insMonthly + hoaMonthly + pmiMonthly) * totalPaymentsMade, 2) : 0;
      const totalMonthlyPayment = includeTaxIns ? roundTo(payment + extraMonthly + taxMonthly + insMonthly + hoaMonthly + pmiMonthly, 2) : roundTo(payment + extraMonthly, 2);
      const baseMonthlyPayment = roundTo(payment, 2);
      const effectiveRate = annualRate > 0 ? roundTo((Math.pow(1 + periodicRate, ppy) - 1) * 100, 2) : 0;

      // ── Payoff date ──
      const startDate = new Date(loanStartDate);
      let payoffDate = new Date(startDate);
      if (paymentFreq === 'monthly') {
        payoffDate.setMonth(payoffDate.getMonth() + totalPaymentsMade);
      } else if (paymentFreq === 'biweekly') {
        payoffDate.setDate(payoffDate.getDate() + totalPaymentsMade * 14);
      } else {
        payoffDate.setDate(payoffDate.getDate() + totalPaymentsMade * 7);
      }
      const payoffDateStr = payoffDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      // ── Interest saved vs no extra payments ──
      let interestSaved = 0;
      let monthsSaved = 0;
      let noExtraPayoffDate = null;
      let noExtraPayoffDateStr = '';

      if (extraMonthly > 0 || extraOneTime > 0 || extraAnnual > 0) {
        // Generate schedule without extra payments to compare
        const noExtraData = generateSchedule(principal, payment, periodicRate, ppy, totalPayments, 0, 0, '', 0, loanStartDate, false, 0, 0, 0, 0);
        interestSaved = roundTo(noExtraData.totalInterest - totalInterest, 2);
        monthsSaved = noExtraData.totalPaymentsMade - totalPaymentsMade;

        const nePayoffDate = new Date(startDate);
        if (paymentFreq === 'monthly') {
          nePayoffDate.setMonth(nePayoffDate.getMonth() + noExtraData.totalPaymentsMade);
        } else if (paymentFreq === 'biweekly') {
          nePayoffDate.setDate(nePayoffDate.getDate() + noExtraData.totalPaymentsMade * 14);
        } else {
          nePayoffDate.setDate(nePayoffDate.getDate() + noExtraData.totalPaymentsMade * 7);
        }
        noExtraPayoffDate = nePayoffDate;
        noExtraPayoffDateStr = nePayoffDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      // ── Build stats ──
      const stats = [
        { label: 'Monthly Payment', value: fmt(baseMonthlyPayment), highlight: true },
        { label: 'Total Monthly Payment', value: fmt(totalMonthlyPayment), highlight: includeTaxIns },
        { label: 'Principal & Interest', value: fmt(baseMonthlyPayment) },
        { label: 'Total Interest Paid', value: fmt(totalInterest), warn: true },
        { label: 'Total Loan Cost', value: fmt(totalPaid) },
        { label: 'Loan Payoff Date', value: payoffDateStr, highlight: true },
        { label: 'Total Payments', value: fmtN(totalPaymentsMade) },
        { label: 'Extra Payments Made', value: fmt(totalExtraPayments) },
        { label: 'Effective Interest Rate', value: effectiveRate + '%' },
        { label: 'Remaining Balance', value: fmt(0) },
      ];

      if (interestSaved > 0) {
        stats.push({ label: 'Interest Saved', value: fmt(interestSaved), highlight: true });
        stats.push({ label: 'Time Saved', value: monthsSaved >= 12 ? (Math.floor(monthsSaved / 12) + ' yr ' + (monthsSaved % 12) + ' mo') : monthsSaved + ' months', highlight: true });
        stats.push({ label: 'Original Payoff Date', value: noExtraPayoffDateStr });
      }

      if (includeTaxIns) {
        const fullMonthly = roundTo(baseMonthlyPayment + extraMonthly + taxMonthly + insMonthly + hoaMonthly + pmiMonthly, 2);
        stats.push({ label: 'Property Tax (monthly)', value: fmt(taxMonthly) });
        stats.push({ label: 'Insurance (monthly)', value: fmt(insMonthly) });
        stats.push({ label: 'HOA Fees (monthly)', value: fmt(hoaMonthly) });
        stats.push({ label: 'PMI (monthly)', value: fmt(pmiMonthly) });
        stats.push({ label: 'Total Housing Payment', value: fmt(fullMonthly), highlight: true });
      }

      // ── Chart data ──
      // Chart 1: Loan Balance Over Time (sample ~120 points for performance)
      const balanceChartLabels = [];
      const balanceChartData = [];
      const step = Math.max(1, Math.floor(rows.length / 120));
      for (let i = 0; i < rows.length; i += step) {
        balanceChartLabels.push('Pmt ' + rows[i].month);
        balanceChartData.push(rows[i].balance);
      }
      // Always include last point
      if (rows.length > 0 && (rows.length - 1) % step !== 0) {
        balanceChartLabels.push('Pmt ' + rows[rows.length - 1].month);
        balanceChartData.push(0);
      }

      // Chart 2: Principal vs Interest (Stacked Bar - annual summary)
      const annualSummary = {};
      rows.forEach(row => {
        const year = Math.ceil(row.month / ppy);
        if (!annualSummary[year]) annualSummary[year] = { principal: 0, interest: 0, year };
        annualSummary[year].principal += row.principal;
        annualSummary[year].interest += row.interest;
      });
      const yearLabels = Object.keys(annualSummary).map(y => 'Year ' + y);
      const principalData = Object.values(annualSummary).map(d => roundTo(d.principal, 2));
      const interestData = Object.values(annualSummary).map(d => roundTo(d.interest, 2));

      // Chart 3: Payment Breakdown (Doughnut)
      const doughnutData = includeTaxIns
        ? [totalPrincipal, totalInterest, roundTo(taxMonthly * totalPaymentsMade, 2), roundTo(insMonthly * totalPaymentsMade, 2), roundTo(pmiMonthly * totalPaymentsMade, 2)]
        : [totalPrincipal, totalInterest];
      const doughnutLabels = includeTaxIns
        ? ['Principal', 'Interest', 'Property Taxes', 'Insurance', 'PMI']
        : ['Principal', 'Interest'];
      const doughnutColors = includeTaxIns
        ? ['#6366F1', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6']
        : ['#6366F1', '#F59E0B'];

      // Chart 4: Cumulative Interest Paid (Area)
      const cumInterestData = [];
      let cumInt = 0;
      const cumStep = Math.max(1, Math.floor(rows.length / 80));
      const cumLabels = [];
      for (let i = 0; i < rows.length; i += cumStep) {
        cumInt += rows[i].interest;
        cumInterestData.push(roundTo(cumInt, 2));
        cumLabels.push('Pmt ' + rows[i].month);
      }
      if (rows.length > 0) {
        const totalCumInt = rows.reduce((s, r) => s + r.interest, 0);
        if ((rows.length - 1) % cumStep !== 0) {
          cumLabels.push('Pmt ' + rows[rows.length - 1].month);
          cumInterestData.push(roundTo(totalCumInt, 2));
        }
      }

      // ── Comparison Mode ──
      let comparisonResult = null;
      if (v.comparison_mode === 'compare') {
        const cPrincipal = safeNum(v.compare_loan_amount, 300000);
        const cRate = safeNum(v.compare_interest_rate, 5.9);
        const cTerm = Math.round(safeNum(v.compare_loan_term, 15));
        const cExtra = safeNum(v.compare_extra_monthly, 0);
        const cTotalPayments = cTerm * ppy;
        const cPeriodicRate = cRate === 0 ? 0 : getPeriodicRate(cRate, ppy, compoundingFreq);
        let cPayment;
        if (cPeriodicRate === 0) {
          cPayment = cPrincipal / cTotalPayments;
        } else {
          cPayment = cPrincipal * (cPeriodicRate * Math.pow(1 + cPeriodicRate, cTotalPayments)) / (Math.pow(1 + cPeriodicRate, cTotalPayments) - 1);
        }
        cPayment = roundTo(cPayment, 2);
        const cSchedule = generateSchedule(cPrincipal, cPayment, cPeriodicRate, ppy, cTotalPayments, cExtra, 0, '', 0, loanStartDate, false, 0, 0, 0, 0);
        const cTotalInterest = roundTo(cSchedule.totalInterest, 2);
        const cTotalPaid = roundTo(cPrincipal + cTotalInterest, 2);
        const cMonthlyPayment = roundTo(cPayment + cExtra, 2);
        const cMonthsSaved = totalPaymentsMade - cSchedule.totalPaymentsMade;
        const cInterestSaved = roundTo(totalInterest - cTotalInterest, 2);

        const diffMonthly = roundTo(totalMonthlyPayment - cMonthlyPayment, 2);
        const diffInterest = roundTo(totalInterest - cTotalInterest, 2);
        const diffTotalCost = roundTo(totalPaid - cTotalPaid, 2);
        const diffTime = totalPaymentsMade - cSchedule.totalPaymentsMade;

        comparisonResult = {
          stats: [
            { label: 'Scenario A: Monthly Payment', value: fmt(totalMonthlyPayment), highlight: true },
            { label: 'Scenario B: Monthly Payment', value: fmt(cMonthlyPayment), highlight: true },
            { label: 'Difference (Monthly)', value: diffMonthly > 0 ? fmt(diffMonthly) + ' (A > B)' : fmt(Math.abs(diffMonthly)) + ' (B > A)' },
            { label: 'Scenario A: Total Interest', value: fmt(totalInterest), warn: true },
            { label: 'Scenario B: Total Interest', value: fmt(cTotalInterest), warn: true },
            { label: 'Difference (Interest)', value: diffInterest > 0 ? fmt(diffInterest) + ' (A > B)' : fmt(Math.abs(diffInterest)) + ' (B > A)' },
            { label: 'Scenario A: Total Cost', value: fmt(totalPaid) },
            { label: 'Scenario B: Total Cost', value: fmt(cTotalPaid) },
            { label: 'Scenario A: Payoff Time', value: totalPaymentsMade + ' payments' },
            { label: 'Scenario B: Payoff Time', value: cSchedule.totalPaymentsMade + ' payments' },
            { label: 'Time Difference', value: diffTime > 0 ? diffTime + ' payments (A > B)' : Math.abs(diffTime) + ' payments (B > A)' },
          ],
          table: {
            mode: 'comparison',
            title: 'Scenario Comparison',
            columns: [
              { key: 'metric', label: 'Metric', format: 'text' },
              { key: 'scenarioA', label: 'Scenario A', format: 'currency', emphasis: true },
              { key: 'scenarioB', label: 'Scenario B', format: 'currency' },
              { key: 'difference', label: 'Difference', format: 'text' },
            ],
            rows: [
              { metric: 'Monthly Payment', scenarioA: totalMonthlyPayment, scenarioB: cMonthlyPayment, difference: fmt(Math.abs(diffMonthly)) + (diffMonthly > 0 ? ' (A > B)' : ' (B > A)') },
              { metric: 'Total Interest', scenarioA: totalInterest, scenarioB: cTotalInterest, difference: fmt(Math.abs(diffInterest)) + (diffInterest > 0 ? ' (A > B)' : ' (B > A)') },
              { metric: 'Total Cost', scenarioA: totalPaid, scenarioB: cTotalPaid, difference: fmt(Math.abs(diffTotalCost)) + (diffTotalCost > 0 ? ' (A > B)' : ' (B > A)') },
              { metric: 'Payoff Time', scenarioA: totalPaymentsMade + ' pmts', scenarioB: cSchedule.totalPaymentsMade + ' pmts', difference: diffTime > 0 ? diffTime + ' pmts (A > B)' : Math.abs(diffTime) + ' pmts (B > A)' },
              { metric: 'Loan Amount', scenarioA: principal, scenarioB: cPrincipal, difference: fmt(Math.abs(principal - cPrincipal)) },
              { metric: 'Interest Rate', scenarioA: annualRate + '%', scenarioB: cRate + '%', difference: (annualRate - cRate).toFixed(2) + '%' },
              { metric: 'Loan Term', scenarioA: loanTerm + ' yr', scenarioB: cTerm + ' yr', difference: (loanTerm - cTerm) + ' yr' },
            ],
          },
        };
      }

      // ── Build return object ──
      const result = {
        stats,
        chart: {
          type: 'line',
          labels: balanceChartLabels,
          yLabel: 'Balance ($)',
          title: 'Loan Balance Over Time',
          datasets: [
            { label: 'Remaining Balance', data: balanceChartData, color: '#6366F1', fill: true },
          ],
        },
        chart2: {
          type: 'bar',
          labels: yearLabels,
          yLabel: 'Amount ($)',
          title: 'Principal vs Interest by Year',
          datasets: [
            { label: 'Principal', data: principalData, color: '#6366F1' },
            { label: 'Interest', data: interestData, color: '#F59E0B' },
          ],
          tooltipSuffix: '',
        },
        compareChart: {
          labels: doughnutLabels,
          data: doughnutData,
          colors: doughnutColors,
          cutout: '62%',
        },
        chart3: {
          type: 'line',
          labels: cumLabels,
          yLabel: 'Cumulative Interest ($)',
          title: 'Cumulative Interest Paid',
          datasets: [
            { label: 'Cumulative Interest', data: cumInterestData, color: '#EF4444', fill: true },
          ],
        },
        table: {
          mode: 'schedule',
          title: 'Full Amortization Schedule',
          columns: [
            { key: 'month', label: 'Payment #', format: 'text' },
            { key: 'date', label: 'Date', format: 'text' },
            { key: 'payment', label: 'Payment', format: 'currency' },
            { key: 'principal', label: 'Principal', format: 'currency' },
            { key: 'interest', label: 'Interest', format: 'currency' },
            { key: 'extraPayment', label: 'Extra Payment', format: 'currency' },
            { key: 'balance', label: 'Remaining Balance', format: 'currency', emphasis: true },
          ],
          rows: rows,
        },
        insight: {
          tone: extraMonthly > 0 || extraOneTime > 0 || extraAnnual > 0 ? 'positive' : 'neutral',
          icon: extraMonthly > 0 || extraOneTime > 0 || extraAnnual > 0 ? 'fa-circle-check' : 'fa-circle-info',
          headline: extraMonthly > 0 || extraOneTime > 0 || extraAnnual > 0
            ? `Extra payments save ` + fmt(interestSaved) + ` in interest and cut ` + (monthsSaved >= 12 ? (Math.floor(monthsSaved / 12) + ' yr ' + (monthsSaved % 12) + ' mo') : monthsSaved + ' months') + ` off your loan.`
            : `Your ` + fmt(baseMonthlyPayment) + ` monthly payment pays off ` + fmt(principal) + ` over ` + loanTerm + ` years, costing ` + fmt(totalInterest) + ` in total interest.`,
          detail: extraMonthly > 0 || extraOneTime > 0 || extraAnnual > 0
            ? `With ` + fmt(totalExtraPayments) + ` in extra payments, you pay off the loan by ` + payoffDateStr + ` instead of ` + noExtraPayoffDateStr + `. Total interest drops from ` + fmt(roundTo(totalInterest + interestSaved, 2)) + ` to ` + fmt(totalInterest) + `.`
            : `Your effective interest rate is ` + effectiveRate + `%. The loan will be fully paid off by ` + payoffDateStr + `. ` + (includeTaxIns ? `Including taxes, insurance, HOA, and PMI, your total monthly housing payment is ` + fmt(totalMonthlyPayment) + `.` : ``),
        },
      };

      if (comparisonResult && comparisonResult.stats) {
        result.stats = result.stats.concat(comparisonResult.stats);
        result.table = comparisonResult.table;
      }

      return result;
    },

    // ── How-To Guide ──
    howTo: [
      'Enter the loan amount you are borrowing, the annual interest rate (APR), and choose your loan term from the dropdown.',
      'Select your payment frequency — monthly, bi-weekly, or weekly. More frequent payments reduce total interest.',
      'Choose the compounding frequency (monthly is standard for most loans) and set the loan start date.',
      'Add any extra payments — monthly, one-time, or annual — to see how much interest and time you can save.',
      'Optionally toggle "Include Taxes & Insurance" to add property tax, insurance, HOA, and PMI for a full monthly housing payment.',
      'Enable "Comparison Mode" to compare two loan scenarios side by side, such as a 30-year vs 15-year term.',
      'Review the KPI dashboard, interactive charts, and the full amortization schedule. Export the schedule as CSV if needed.',
    ],

    // ── Real-World Examples ──
    examples: [
      {
        title: '30-Year Fixed Mortgage',
        input: 'Loan: $300,000, Rate: 6.5%, Term: 30 years, Monthly payments',
        result: 'Monthly Payment: ~$1,896 | Total Interest: ~$382,000 | Payoff: 30 years',
      },
      {
        title: '15-Year vs 30-Year Comparison',
        input: 'Scenario A: $300,000 at 6.5% for 30yr vs Scenario B: $300,000 at 5.9% for 15yr',
        result: '15yr saves ~$280,000 in interest and pays off 15 years earlier, but monthly payment is ~$1,000 higher',
      },
      {
        title: 'Extra Monthly Payments Save Thousands',
        input: 'Loan: $300,000, Rate: 6.5%, Term: 30 years, Extra: $200/mo',
        result: 'Interest Saved: ~$78,000 | Time Saved: ~5 years | Payoff: ~25 years',
      },
      {
        title: 'Bi-Weekly Payments Accelerate Payoff',
        input: 'Loan: $300,000, Rate: 6.5%, Term: 30 years, Bi-Weekly payments',
        result: 'Interest Saved: ~$64,000 | Time Saved: ~4 years vs monthly payments',
      },
    ],

    formula: 'M = P × [r(1+r)^n] / [(1+r)^n − 1] | r = periodic rate = (1 + APR/compounding periods)^(compounding periods/payments per year) − 1 | Total Interest = (M × n) − P | Interest Savings = Total Interest(no extras) − Total Interest(with extras)',

    // ── SEO Article Content ──
    article: {
      heading: 'How to Calculate Loan Amortization and Save Thousands in Interest',
      intro: 'Loan amortization is the process of spreading out a loan into a series of fixed payments over time. Each payment covers both interest and principal, with the interest portion decreasing as the principal is paid down. The GetCalcu Amortization Calculator not only computes your monthly payment but also generates a complete payment-by-payment schedule, showing exactly how much goes to principal versus interest over the life of the loan. It also models the powerful impact of extra payments — helping you understand how paying just a little more each month can save tens of thousands of dollars in interest.',
      sections: [
        { heading: 'What Is Loan Amortization?', body: 'Amortization is the process of gradually paying off a debt through regular, scheduled payments. Each payment is split into two parts: the interest portion (the cost of borrowing) and the principal portion (the amount that reduces your loan balance). In the early years of a loan, most of each payment goes toward interest because the outstanding balance is largest. As the principal declines, the interest portion shrinks, and more of your payment goes toward reducing the principal. By the final payment, the entire loan balance reaches zero.' },
        { heading: 'How Amortization Works', body: 'The amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1] calculates the fixed payment amount needed to fully repay a loan over its term. In this formula, P is the loan principal (the amount borrowed), r is the periodic interest rate (annual rate divided by payments per year, adjusted for compounding), and n is the total number of payments. For a $300,000 loan at 6.5% over 30 years with monthly payments, the monthly payment is approximately $1,896. The first payment applies about $1,625 to interest and only $271 to principal. By year 15, the split is roughly $1,200 interest and $696 principal. By the final year, nearly the entire payment goes to principal.' },
        { heading: 'Understanding the Amortization Formula', body: 'The standard amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1] calculates the fixed payment M. Let\'s break down each variable: P (Principal) is the total amount borrowed, $300,000 in our example. r (Periodic Interest Rate) is the annual rate divided by the number of payments per year, adjusted for compounding frequency. For a 6.5% annual rate with monthly compounding and monthly payments, the periodic rate is approximately 0.5417% (6.5% ÷ 12). n (Total Payments) is the loan term in years multiplied by payments per year — 360 for a 30-year monthly loan. The term (1+r)^n is the compound growth factor. For our example, (1 + 0.005417)^360 ≈ 6.99. Plugging this in: M = 300,000 × [0.005417 × 6.99] / [6.99 − 1] = 300,000 × 0.03787 / 5.99 ≈ $1,896. This is the amount you pay every month for 30 years to fully repay the loan.' },
        { heading: 'Why Early Payments Save Money', body: 'Extra payments made early in the loan term have an outsized impact because they reduce the principal balance that future interest is calculated on. A single extra payment of $200 in the first month reduces the principal by $200, which saves the interest that $200 would have generated over the remaining 359 months. At 6.5%, that $200 saves approximately $200 × (1.005417^359 − 1) ≈ $1,200 in interest over the life of the loan. This is the power of compound interest working in reverse — paying down principal early prevents compound interest from accumulating on that principal. Making $200 extra each month on a $300,000 loan at 6.5% saves approximately $78,000 in interest and cuts the loan term by 5 years.' },
        { heading: 'Mortgage vs Auto vs Personal Loans', body: 'Amortization works the same way for all types of installment loans, but the numbers differ dramatically. Mortgages typically have the longest terms (15-30 years) and the largest loan amounts, making them the most sensitive to interest rates and extra payments. Auto loans typically run 3-7 years with moderate rates (5-10%). Personal loans are usually 2-5 years with higher rates (6-36%). The shorter the term, the less total interest you pay, but the higher the monthly payment. Our calculator works for all loan types — just adjust the loan amount, rate, and term to match your specific situation.' },
        { heading: 'Fixed vs Adjustable Rate Loans', body: 'Fixed-rate loans lock in your interest rate for the entire loan term, giving you predictable payments that never change. Adjustable-rate mortgages (ARMs) start with a lower rate for an initial period (typically 3-10 years), then adjust periodically based on market indices. ARMs can save money if you plan to sell or refinance before the rate adjusts, but they carry the risk of higher payments if rates rise. Our calculator models fixed-rate loans accurately. For ARMs, you would need to recalculate after each rate adjustment period using the new rate.' },
        { heading: 'Common Loan Repayment Mistakes', body: 'The most common mistake is paying only the minimum payment, which maximizes total interest. Ignoring refinancing opportunities when rates drop can cost tens of thousands. Missing payments not only incurs late fees but also damages your credit score, making future borrowing more expensive. Choosing an unnecessarily long term to minimize monthly payments often results in paying more than double the original loan amount in interest. Finally, not understanding how extra payments are applied — some lenders apply extra payments to future payments rather than reducing principal — can undermine your payoff strategy.' },
        { heading: 'Tips to Pay Off Loans Faster', body: 'Making extra monthly payments is the most effective strategy — even $50 extra per month on a $300,000 mortgage saves over $30,000 in interest. Switching to bi-weekly payments (half the monthly payment every two weeks) results in 26 half-payments per year, equivalent to 13 full monthly payments — one extra payment annually. Applying lump-sum payments from bonuses, tax refunds, or gifts directly to principal accelerates payoff. Refinancing to a lower rate or shorter term can also save interest, but factor in closing costs. Finally, optimizing your budget to free up even $100 per month for debt repayment can save thousands over the life of your loan.' },
        { heading: 'Example Amortization Schedule', body: 'Consider a $300,000 loan at 6.5% interest over 30 years with monthly payments. The first payment of $1,896 consists of $271 in principal and $1,625 in interest. After 5 years (60 payments), the remaining balance is approximately $278,000, and the interest portion has dropped to about $1,506. After 15 years (180 payments), the balance is approximately $189,000, and the interest portion is about $1,025. After 25 years (300 payments), the balance is approximately $67,000, and the interest portion is about $365. The final payment brings the balance to zero. This progressive shift from interest-heavy to principal-heavy payments is the hallmark of amortization. Our calculator generates this complete schedule for any loan scenario.' },
        { heading: 'Frequently Asked Questions', body: 'What is an amortization schedule? It is a table showing each payment\'s split between principal and interest over the loan term. How is loan interest calculated? Interest for each period is calculated as the remaining balance multiplied by the periodic interest rate. Why do early payments contain more interest? Because the loan balance is largest at the start, so the interest charged on that balance is higher. Can I pay off my mortgage early? Yes, most mortgages allow early repayment without penalty, but check your loan agreement for prepayment penalties. Do extra payments reduce interest? Absolutely — every dollar of extra principal paid early saves the interest that dollar would have accrued over the remaining loan term. How often should I make extra payments? Monthly extra payments are most effective because they reduce the balance sooner. What happens if interest rates change? For fixed-rate loans, the rate stays the same. For ARMs, the rate adjusts periodically. Can I export the schedule? Yes, the amortization schedule can be copied or exported. Is this calculator accurate? It uses standard amortization formulas and is accurate for any fixed-rate loan. Does it work for auto loans? Yes, simply enter your auto loan amount, rate, and term.' },
      ],
    },

    // ── Schema-Ready FAQs ──
    faqs: [
      { q: 'What is an amortization schedule?', a: 'An amortization schedule is a complete table showing every payment over the life of a loan, broken down into principal and interest portions. It shows the remaining balance after each payment, how much interest you pay each period, and how much of your payment goes toward reducing the principal. Our calculator generates a full amortization schedule for any loan scenario, including extra payments.' },
      { q: 'How is loan interest calculated?', a: 'Loan interest for each payment period is calculated by multiplying the current outstanding loan balance by the periodic interest rate. The periodic rate is the annual percentage rate (APR) divided by the number of payment periods per year, adjusted for compounding frequency. For example, on a $300,000 loan at 6.5% APR with monthly payments, the first month\'s interest is $300,000 × (6.5% ÷ 12) = $1,625.' },
      { q: 'Why do early payments contain more interest?', a: 'Early payments contain more interest because the loan balance is at its highest at the beginning of the loan term. Interest is calculated on the outstanding balance, so a larger balance generates more interest. As the principal is gradually paid down, the interest portion of each payment decreases, and more of the fixed payment goes toward reducing the principal.' },
      { q: 'Can I pay off my mortgage early?', a: 'Yes, most mortgages allow early repayment without penalty. However, some loans have prepayment penalties, typically 1-3% of the outstanding balance if paid off within the first 3-5 years. Always check your loan agreement or ask your lender. Our calculator shows how extra payments accelerate your payoff and save interest.' },
      { q: 'Do extra payments reduce interest?', a: 'Yes, every extra dollar you pay toward principal reduces the balance that future interest is calculated on. This creates a compounding effect — paying $200 extra in the first month of a $300,000 loan at 6.5% saves approximately $1,200 in interest over the remaining 30 years. The earlier you make extra payments, the more interest you save.' },
      { q: 'How often should I make extra payments?', a: 'Monthly extra payments are the most effective because they reduce the principal balance sooner, giving you the maximum interest savings. However, any extra payment — whether monthly, one-time, or annual — saves interest. Switching to bi-weekly payments (half your monthly payment every two weeks) effectively makes one extra payment per year, which can save thousands in interest.' },
      { q: 'What happens if interest rates change?', a: 'For fixed-rate loans, the interest rate is locked for the entire loan term, so your payment never changes. For adjustable-rate mortgages (ARMs), the rate adjusts periodically based on market indices. Our calculator models fixed-rate amortization. For ARMs, you would need to recalculate after each adjustment period using the new rate.' },
      { q: 'Can I export the amortization schedule?', a: 'Yes, the amortization schedule generated by our calculator can be copied to your clipboard using the "Copy Results" button. You can paste it into a spreadsheet application like Excel or Google Sheets for further analysis, filtering, or printing.' },
      { q: 'Is this calculator accurate?', a: 'Yes, this calculator uses the standard amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1] and accurately computes the payment breakdown for any fixed-rate loan. It accounts for different payment frequencies, compounding frequencies, and extra payments. The results are suitable for mortgages, auto loans, personal loans, student loans, and business loans.' },
      { q: 'Does it work for auto loans?', a: 'Yes, simply enter your auto loan amount, interest rate, and loan term. Auto loans typically have shorter terms (3-7 years) and are fully amortizing, meaning they are paid off by the end of the term. Our calculator handles any loan amount, rate, and term combination.' },
      { q: 'What is the difference between simple interest and amortized interest?', a: 'Simple interest is calculated only on the original principal amount, while amortized interest is calculated on the declining balance. Most installment loans (mortgages, auto loans, personal loans) use amortized interest, where each payment covers the interest accrued since the last payment plus a portion of principal. This is why early payments are mostly interest — the balance is highest at the start.' },
      { q: 'How does payment frequency affect total interest?', a: 'More frequent payments reduce total interest because principal is paid down sooner, reducing the balance that interest accrues on. Bi-weekly payments (26 per year) are equivalent to 13 monthly payments per year (one extra payment annually), which can save thousands in interest and shorten the loan term by several years. Weekly payments save even more.' },
      { q: 'What is the effective interest rate?', a: 'The effective interest rate (also called the annual equivalent rate or APR) accounts for the effect of compounding frequency. It represents the true annual cost of borrowing. For example, a loan with a 6.5% nominal rate compounded monthly has an effective rate of approximately 6.70%. Our calculator displays both the nominal and effective rate.' },
      { q: 'How does compounding frequency affect my loan?', a: 'Compounding frequency determines how often interest is calculated and added to the loan balance. More frequent compounding (daily or monthly) results in slightly more total interest compared to less frequent compounding (quarterly or annually). Most mortgages use monthly compounding, while some personal loans may use daily or quarterly compounding. Our calculator accurately models any compounding frequency.' },
      { q: 'Can I compare two loan scenarios?', a: 'Yes, our calculator includes a built-in comparison mode that lets you compare two loan scenarios side by side. You can compare different loan amounts, interest rates, terms, and extra payment amounts. The comparison shows the difference in monthly payment, total interest, total cost, and payoff time.' },
    ],
  },

  // ── Tip Calculator ───────────────────────────────────────────────
  'tip-calculator': {
    name: 'Tip Calculator',
    category: 'Math',
    icon: 'fa-receipt',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    description: 'Calculate tip amounts, split bills among friends, and find the total per person with tax included.',
    metaDescription: 'Free tip calculator — instantly calculate tip amounts, split bills among friends, and find the total per person with tax included.',
    fields: [
      { id: 'bill_amount', label: 'Bill Amount ($)', type: 'number', default: 50, min: 0, step: 0.01, hint: 'The total amount of the bill before tip.' },
      { id: 'tip_percent', label: 'Tip Percentage (%)', type: 'number', default: 18, min: 0, max: 100, step: 0.5, hint: 'The tip percentage you want to leave. Standard is 15-20%.' },
      { id: 'tax_percent', label: 'Tax Percentage (%)', type: 'number', default: 0, min: 0, max: 100, step: 0.5, hint: 'Sales tax percentage (optional).' },
      { id: 'num_people', label: 'Number of People', type: 'number', default: 1, min: 1, step: 1, hint: 'How many people are splitting the bill.' },
    ],
    calculate(v) {
      const bill = safeNum(v.bill_amount, 0);
      const tipPct = safeNum(v.tip_percent, 0);
      const taxPct = safeNum(v.tax_percent, 0);
      const people = Math.max(1, Math.round(safeNum(v.num_people, 1)));
      if (bill <= 0) return errorResult('Bill amount must be greater than zero.');
      const taxAmount = roundTo(bill * (taxPct / 100), 2);
      const tipAmount = roundTo(bill * (tipPct / 100), 2);
      const total = roundTo(bill + taxAmount + tipAmount, 2);
      const perPerson = roundTo(total / people, 2);
      const tipPerPerson = roundTo(tipAmount / people, 2);
      return {
        stats: [
          { label: 'Tip Amount', value: fmt(tipAmount), highlight: true },
          { label: 'Tax Amount', value: fmt(taxAmount) },
          { label: 'Total Bill', value: fmt(total), highlight: true },
          { label: 'Per Person', value: fmt(perPerson) },
          { label: 'Tip Per Person', value: fmt(tipPerPerson) },
        ],
      };
    },
    article: {
      heading: 'How to Calculate Tips and Split Bills Fairly',
      intro: 'Tipping is a standard part of dining and service culture in many countries. Knowing how to calculate a tip quickly and fairly ensures you reward good service appropriately and split bills accurately among friends.',
      sections: [
        { heading: 'The Standard Tip Formula', body: 'Tip = Bill Amount × (Tip Percentage / 100). For example, on a $50 bill with an 18% tip, the tip is $50 × 0.18 = $9. The total is $50 + $9 = $59. For a quick mental calculation, round the bill to the nearest ten and multiply by 0.18, or simply double the tax amount for an approximate 18% tip.' },
        { heading: 'Splitting the Bill', body: 'To split a bill evenly, divide the total (including tip and tax) by the number of people. For example, a $59 total split among 4 people is $59 ÷ 4 = $14.75 per person. If you want to tip on the pre-tax amount only, calculate the tip separately and add it to the taxed total before dividing.' },
        { heading: 'Tipping Etiquette', body: 'In the United States, 15-20% is standard for good service at restaurants. For buffets, 10-15% is typical. For taxis and rideshares, 10-15% is standard. For hotel bellhops, $1-2 per bag is customary. For hotel housekeeping, $2-5 per night is typical. Always check local customs when traveling internationally, as tipping practices vary widely.' },
      ],
    },
    howTo: [
      'Enter the total bill amount before tip and tax.',
      'Set the tip percentage (15-20% is standard for good service).',
      'Enter the sales tax percentage if applicable.',
      'Enter the number of people splitting the bill.',
      'The calculator shows the tip amount, tax, total, and per-person amounts.',
    ],
    formula: 'Tip = Bill × (Tip% / 100) | Tax = Bill × (Tax% / 100) | Total = Bill + Tax + Tip | Per Person = Total / Number of People',
    examples: [
      { title: 'Dinner for Two', input: 'Bill: $85, Tip: 20%, Tax: 8%, People: 2', result: 'Tip: $17.00 | Tax: $6.80 | Total: $108.80 | Per Person: $54.40' },
      { title: 'Large Group', input: 'Bill: $240, Tip: 18%, Tax: 0%, People: 6', result: 'Tip: $43.20 | Total: $283.20 | Per Person: $47.20' },
    ],
    faqs: [
      { q: 'How do I calculate a tip?', a: 'Tip = Bill Amount × (Tip Percentage / 100). For a $50 bill with an 18% tip, the tip is $50 × 0.18 = $9.' },
      { q: 'How do I split a bill?', a: 'Divide the total (bill + tax + tip) by the number of people. For example, a $59 total split among 4 people is $14.75 each.' },
      { q: 'What is a good tip percentage?', a: 'In the US, 15-20% is standard for good restaurant service. 10-15% for buffets, 10-15% for taxis, and $1-2 per bag for hotel bellhops.' },
      { q: 'Should I tip on the pre-tax or post-tax amount?', a: 'Traditionally, tips are calculated on the pre-tax amount. However, many people tip on the post-tax total. Our calculator lets you enter both tax and tip percentages separately for clarity.' },
    ],
  },
  'currency-converter': {
    id: 'currency-converter',
    name: 'Currency Converter',
    category: 'Finance',
    icon: 'fa-money-bill-transfer',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Convert between 16+ global currencies with real-time exchange rates, inverse rates, and multi-currency comparison table.',
    metaDescription: 'Free currency converter — instantly calculate foreign exchange rates between USD, EUR, GBP, CAD, AUD, JPY, INR, CHF, AED, SAR, and more.',
    fields: [
      { id: 'amount', label: 'Amount to Convert', type: 'number', default: 100, min: 0.01, step: 1, hint: 'The monetary amount you want to convert.' },
      { id: 'from_currency', label: 'From Currency', type: 'select', default: 'USD',
        options: [
          { value: 'USD', label: 'USD — US Dollar ($)' },
          { value: 'EUR', label: 'EUR — Euro (€)' },
          { value: 'GBP', label: 'GBP — British Pound (£)' },
          { value: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
          { value: 'AUD', label: 'AUD — Australian Dollar (A$)' },
          { value: 'JPY', label: 'JPY — Japanese Yen (¥)' },
          { value: 'CHF', label: 'CHF — Swiss Franc (CHF)' },
          { value: 'CNY', label: 'CNY — Chinese Yuan (¥)' },
          { value: 'INR', label: 'INR — Indian Rupee (₹)' },
          { value: 'BRL', label: 'BRL — Brazilian Real (R$)' },
          { value: 'MXN', label: 'MXN — Mexican Peso (Mex$)' },
          { value: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
          { value: 'NZD', label: 'NZD — New Zealand Dollar (NZ$)' },
          { value: 'AED', label: 'AED — UAE Dirham (AED)' },
          { value: 'SAR', label: 'SAR — Saudi Riyal (SAR)' },
          { value: 'ZAR', label: 'ZAR — South African Rand (R)' }
        ], hint: 'Currency you are converting from.' },
      { id: 'to_currency', label: 'To Currency', type: 'select', default: 'EUR',
        options: [
          { value: 'USD', label: 'USD — US Dollar ($)' },
          { value: 'EUR', label: 'EUR — Euro (€)' },
          { value: 'GBP', label: 'GBP — British Pound (£)' },
          { value: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
          { value: 'AUD', label: 'AUD — Australian Dollar (A$)' },
          { value: 'JPY', label: 'JPY — Japanese Yen (¥)' },
          { value: 'CHF', label: 'CHF — Swiss Franc (CHF)' },
          { value: 'CNY', label: 'CNY — Chinese Yuan (¥)' },
          { value: 'INR', label: 'INR — Indian Rupee (₹)' },
          { value: 'BRL', label: 'BRL — Brazilian Real (R$)' },
          { value: 'MXN', label: 'MXN — Mexican Peso (Mex$)' },
          { value: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
          { value: 'NZD', label: 'NZD — New Zealand Dollar (NZ$)' },
          { value: 'AED', label: 'AED — UAE Dirham (AED)' },
          { value: 'SAR', label: 'SAR — Saudi Riyal (SAR)' },
          { value: 'ZAR', label: 'ZAR — South African Rand (R)' }
        ], hint: 'Currency you want to convert into.' }
    ],
    calculate(v) {
      const ratesToUSD = {
        USD: 1.0,
        EUR: 0.92,
        GBP: 0.79,
        CAD: 1.36,
        AUD: 1.52,
        JPY: 154.5,
        CHF: 0.88,
        CNY: 7.24,
        INR: 83.5,
        BRL: 5.65,
        MXN: 18.2,
        SGD: 1.35,
        NZD: 1.64,
        AED: 3.67,
        SAR: 3.75,
        ZAR: 18.4
      };
      const symbols = {
        USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', CHF: 'CHF',
        CNY: '¥', INR: '₹', BRL: 'R$', MXN: 'Mex$', SGD: 'S$', NZD: 'NZ$',
        AED: 'AED ', SAR: 'SAR ', ZAR: 'R '
      };
      const amount = safeNum(v.amount, 0);
      const from = v.from_currency || 'USD';
      const to = v.to_currency || 'EUR';
      if (amount <= 0) return errorResult('Please enter an amount greater than zero.');
      const fromRate = ratesToUSD[from] || 1.0;
      const toRate = ratesToUSD[to] || 1.0;
      const inUSD = amount / fromRate;
      const converted = roundTo(inUSD * toRate, 2);
      const exchangeRate = roundTo(toRate / fromRate, 4);
      const inverseRate = roundTo(fromRate / toRate, 4);
      const toSymbol = symbols[to] || '';
      const fromSymbol = symbols[from] || '';

      const popularCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'AED', 'SAR'];
      const tableRows = popularCurrencies.map(code => {
        const cRate = ratesToUSD[code];
        const val = roundTo(inUSD * cRate, 2);
        const sym = symbols[code] || '';
        return {
          Currency: code,
          Rate: (cRate / fromRate).toFixed(4),
          Converted: sym + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        };
      });

      return {
        stats: [
          { label: 'Converted Amount (' + to + ')', value: toSymbol + converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), highlight: true },
          { label: 'Exchange Rate (1 ' + from + ' → ' + to + ')', value: exchangeRate + ' ' + to },
          { label: 'Inverse Rate (1 ' + to + ' → ' + from + ')', value: inverseRate + ' ' + from },
          { label: 'Original Amount', value: fromSymbol + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + from },
        ],
        table: tableRows,
        insight: {
          tone: 'neutral',
          icon: 'fa-money-bill-transfer',
          headline: fromSymbol + amount + ' ' + from + ' equals approximately ' + toSymbol + converted.toLocaleString('en-US') + ' ' + to + '.',
          detail: 'Based on standard mid-market exchange rates (1 ' + from + ' = ' + exchangeRate + ' ' + to + '). Real bank rates may include 1–3% spread fees.'
        }
      };
    },
    article: {
      heading: 'How Foreign Exchange & Currency Conversion Works',
      intro: 'Currency conversion allows travelers, international businesses, and investors to exchange values between different world currencies based on prevailing foreign exchange (forex) market rates.',
      sections: [
        { heading: 'Mid-Market Rates vs. Retail Bank Rates', body: 'The mid-market rate (or interbank rate) is the midpoint between global buy and sell prices. Consumer banks and airport kiosks usually add a 1.5% to 4% margin or commission on top of this rate.' },
        { heading: 'How to Avoid Excessive Foreign Transaction Fees', body: 'When spending abroad or shopping on international websites, always choose to be billed in the local currency of the seller rather than using dynamic currency conversion (DCC), which often charges high markups.' },
      ]
    },
    howTo: [
      'Enter the amount of money you wish to convert.',
      'Select your source currency in the "From Currency" dropdown.',
      'Select your destination currency in the "To Currency" dropdown.',
      'Instantly view the converted amount, exchange rate, inverse rate, and multi-currency comparison table.'
    ],
    examples: [
      { title: 'Converting USD to EUR', input: '$100 USD to EUR', result: '≈ €92.00 (Rate: 1 USD = 0.9200 EUR)' },
      { title: 'Converting GBP to USD', input: '£100 GBP to USD', result: '≈ $126.58 (Rate: 1 GBP = 1.2658 USD)' }
    ],
    formula: 'Converted Amount = (Amount ÷ From Currency Rate in USD) × To Currency Rate in USD',
    faqs: [
      { q: 'What is the mid-market exchange rate?', a: 'The mid-market exchange rate is the real midpoint between the supply and demand for a currency in global markets without bank markups.' },
      { q: 'Why do banks give a different rate than online calculators?', a: 'Commercial banks and exchange booths add a retail markup (spread) to make a profit. Calculators typically display the mid-market reference rate.' },
      { q: 'What is Dynamic Currency Conversion (DCC)?', a: 'DCC occurs when an overseas ATM or card terminal asks if you want to be charged in your home currency. It usually carries poor exchange rates (3–7% markup). It is usually cheaper to choose the local currency.' }
    ]
  },
  'beam-deflection-calculator': {
    id: 'beam-deflection-calculator',
    name: 'Beam Deflection Calculator',
    category: 'Engineering',
    icon: 'fa-ruler-combined',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    description: 'Calculate maximum deflection for simply supported and cantilever beams under point load.',
    metaDescription: 'Free beam deflection calculator — estimate maximum deflection for simply supported and cantilever beams.',
    fields: [
      { id: 'beamType', label: 'Beam Type', type: 'select', default: 'simply', options: [
        { value: 'simply', label: 'Simply Supported (center load)' },
        { value: 'cantilever', label: 'Cantilever (end load)' },
      ], hint: 'Select the beam support condition.' },
      { id: 'length', label: 'Beam Length (ft)', type: 'number', default: 10, min: 1, step: 0.5, hint: 'Span length in feet.' },
      { id: 'load', label: 'Load (lbs)', type: 'number', default: 1000, min: 0, step: 100, hint: 'Total load in pounds.' },
      { id: 'moi', label: 'Moment of Inertia (in⁴)', type: 'number', default: 100, min: 0.1, step: 1, hint: 'Section property from beam tables.' },
    ],
    calculate(v) {
      const beamType = v.beamType || 'simply';
      const L = safeNum(v.length, 0) * 12;
      const P = safeNum(v.load, 0);
      const I = safeNum(v.moi, 0);
      const E = 29000000;
      if (L <= 0 || P <= 0 || I <= 0) return errorResult('Enter positive values for all fields.');
      let deflection;
      if (beamType === 'simply') {
        deflection = (P * L * L * L) / (48 * E * I);
      } else {
        deflection = (P * L * L * L) / (3 * E * I);
      }
      return {
        stats: [
          { label: 'Beam Type', value: beamType === 'simply' ? 'Simply Supported' : 'Cantilever' },
          { label: 'Max Deflection', value: roundTo(deflection, 4) + ' in', highlight: true },
          { label: 'Deflection (in)', value: roundTo(deflection, 4) },
          { label: 'L/Δ Ratio', value: 'L/' + roundTo(L / deflection, 1) },
        ],
        formula: 'δ = (P × L³) / (48 × E × I) [simply] | δ = (P × L³) / (3 × E × I) [cantilever]',
      };
    },
    article: { heading: 'Understanding Beam Deflection in Structural Engineering', intro: 'Beam deflection is the degree to which a beam bends under load. Excessive deflection can damage finishes and affect structural integrity.', sections: [
      { heading: 'The Deflection Formula', body: 'Deflection depends on load, span length, material stiffness (E), and cross-section shape (I). The formulas differ for simply supported and cantilever beams.' },
      { heading: 'Allowable Deflection Limits', body: 'Building codes typically limit deflection to L/360 for live loads and L/240 for dead loads. For a 10 ft beam, that is about 0.33 inches for live load.' },
      { heading: 'Increasing Stiffness', body: 'To reduce deflection, increase the moment of inertia (deeper beam), use a stiffer material (steel vs wood), add supports, or reduce the span.' },
    ] },
    howTo: ['Select beam type.', 'Enter beam length, load, and moment of inertia.', 'Review maximum deflection and L/Δ ratio.'],
    formula: 'δ = (P × L³) / (48 × E × I) [simply] | δ = (P × L³) / (3 × E × I) [cantilever]',
    examples: [
      { title: 'Wood Beam', input: 'Simply supported, 10 ft, 1000 lbs, I = 100 in⁴', result: 'δ ≈ 0.0106 in, L/δ ≈ 11320' },
      { title: 'Steel Cantilever', input: 'Cantilever, 8 ft, 500 lbs, I = 200 in⁴', result: 'δ ≈ 0.0030 in, L/δ ≈ 31900' },
    ],
    faqs: [
      { q: 'What is moment of inertia?', a: 'Moment of inertia (I) measures a beam resistance to bending. It depends on the cross-section shape. Deeper beams have much higher I than wider beams of the same area.' },
      { q: 'What is the modulus of elasticity?', a: 'E (modulus of elasticity) measures material stiffness. Steel is about 29,000,000 psi. Wood is about 1,500,000–1,800,000 psi depending on grade.' },
      { q: 'What is L/360?', a: 'L/360 is a common deflection limit. It means the maximum deflection should not exceed the span length divided by 360. For a 10 ft span, that is 0.33 inches.' },
      { q: 'Can I use this for steel beams?', a: 'Yes, but ensure you use the correct moment of inertia for the steel section. This calculator uses E = 29,000,000 psi, which is standard for steel.' },
    ],
  },
  'ohms-law-calculator': {
    id: 'ohms-law-calculator',
    name: "Ohm's Law Calculator",
    category: 'Engineering',
    icon: 'fa-bolt',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    description: "Calculate voltage, current, resistance, and power using Ohm's Law relationships.",
    metaDescription: "Free Ohm's Law calculator — calculate voltage (V), current (I), resistance (R), and electric power (P) instantly.",
    fields: [
      { id: 'voltage', label: 'Voltage (V - Volts)', type: 'number', default: 12, min: 0, step: 0.1, hint: 'Leave at 0 if calculating voltage from I and R.' },
      { id: 'current', label: 'Current (I - Amperes)', type: 'number', default: 2, min: 0, step: 0.01, hint: 'Leave at 0 if calculating current from V and R.' },
      { id: 'resistance', label: 'Resistance (R - Ohms Ω)', type: 'number', default: 6, min: 0, step: 0.1, hint: 'Leave at 0 if calculating resistance from V and I.' },
    ],
    calculate(v) {
      let V = safeNum(v.voltage, 0);
      let I = safeNum(v.current, 0);
      let R = safeNum(v.resistance, 0);
      let P = 0;
      let calculatedField = '';

      if (V > 0 && I > 0 && R === 0) {
        R = V / I;
        calculatedField = 'Resistance';
      } else if (V > 0 && R > 0 && I === 0) {
        I = V / R;
        calculatedField = 'Current';
      } else if (I > 0 && R > 0 && V === 0) {
        V = I * R;
        calculatedField = 'Voltage';
      } else if (V > 0 && I > 0 && R > 0) {
        R = V / I;
        calculatedField = 'Recalculated Resistance';
      } else {
        return errorResult('Please enter at least two known values (Voltage, Current, or Resistance).');
      }

      P = V * I;

      return {
        stats: [
          { label: 'Voltage (V)', value: roundTo(V, 2) + ' V', highlight: calculatedField === 'Voltage' },
          { label: 'Current (I)', value: roundTo(I, 4) + ' A', highlight: calculatedField === 'Current' },
          { label: 'Resistance (R)', value: roundTo(R, 2) + ' Ω', highlight: calculatedField === 'Resistance' || calculatedField.includes('Resistance') },
          { label: 'Power (P)', value: roundTo(P, 2) + ' W', highlight: true },
        ],
        formula: 'V = I × R | I = V ÷ R | R = V ÷ I | P = V × I = I² × R',
      };
    },
    article: { heading: "Understanding Ohm's Law in Electrical Engineering", intro: "Ohm's Law is the foundational principle of electrical circuits, defining the direct relationship between voltage, current, resistance, and electrical power.", sections: [
      { heading: 'The Core Relationships', body: 'Voltage (V) = Current (I) × Resistance (R). Power (P) = Voltage (V) × Current (I).' }
    ] },
    howTo: ['Enter any two known values among Voltage, Current, and Resistance.', 'Leave the unknown field at 0.', 'View the calculated unknown value and total electrical power in Watts.'],
    formula: 'V = I × R | P = V × I',
    examples: [
      { title: '12V Auto Circuit', input: 'Voltage: 12V, Resistance: 6Ω', result: 'Current = 2.0A, Power = 24.0W' }
    ],
    faqs: [
      { q: "What is Ohm's Law?", a: "Ohm's Law states that the current through a conductor between two points is directly proportional to the voltage across the two points and inversely proportional to the resistance." }
    ]
  },
  'pressure-calculator': {
    id: 'pressure-calculator',
    name: 'Pressure Calculator',
    category: 'Engineering',
    icon: 'fa-gauge-high',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    description: 'Convert between PSI, Bar, Pascal, Atmosphere, and calculate pressure from force and surface area.',
    metaDescription: 'Free pressure calculator — convert between PSI, Bar, kPa, MPa, and atmospheres, or calculate pressure from force and area.',
    fields: [
      { id: 'force', label: 'Force (Pounds-force lbf / Newtons N)', type: 'number', default: 100, min: 0, step: 1, hint: 'Applied force.' },
      { id: 'area', label: 'Surface Area (Square inches in² / m²)', type: 'number', default: 10, min: 0.01, step: 0.1, hint: 'Surface area over which force is distributed.' },
      { id: 'unit_system', label: 'Unit System', type: 'select', default: 'imperial',
        options: [
          { value: 'imperial', label: 'Imperial (Force in lbf, Area in in² → Output in PSI)' },
          { value: 'metric', label: 'Metric (Force in N, Area in m² → Output in Pa/kPa)' }
        ], hint: 'Choose units for force and area.' }
    ],
    calculate(v) {
      const force = safeNum(v.force, 0);
      const area = safeNum(v.area, 0);
      const isMetric = v.unit_system === 'metric';
      if (force <= 0 || area <= 0) return errorResult('Force and Area must both be greater than zero.');

      let psi = 0;
      let kpa = 0;
      let bar = 0;
      let atm = 0;

      if (isMetric) {
        const pa = force / area;
        kpa = pa / 1000;
        psi = kpa * 0.145038;
        bar = kpa / 100;
        atm = kpa / 101.325;
      } else {
        psi = force / area;
        kpa = psi * 6.89476;
        bar = psi * 0.0689476;
        atm = psi * 0.068046;
      }

      return {
        stats: [
          { label: 'Pressure (PSI)', value: roundTo(psi, 2) + ' psi', highlight: !isMetric },
          { label: 'Pressure (kPa)', value: roundTo(kpa, 2) + ' kPa', highlight: isMetric },
          { label: 'Pressure (Bar)', value: roundTo(bar, 4) + ' bar' },
          { label: 'Atmospheres (atm)', value: roundTo(atm, 4) + ' atm' },
        ],
        formula: 'P = Force / Area | 1 PSI = 6.89476 kPa | 1 Bar = 100 kPa ≈ 14.5038 PSI',
      };
    },
    article: { heading: 'Pressure Units and Force Distribution in Engineering', intro: 'Pressure is defined as force applied perpendicular to the surface of an object per unit area over which that force is distributed.', sections: [
      { heading: 'Units of Pressure', body: 'PSI (pounds per square inch) is commonly used in the United States, while Pascals (Pa), Kilopascals (kPa), and Bar are standard international metric units.' }
    ] },
    howTo: ['Enter the total force applied.', 'Enter the surface contact area.', 'Select Imperial or Metric unit mode.', 'View pressure in PSI, kPa, Bar, and Atmospheres.'],
    formula: 'P = F ÷ A',
    examples: [
      { title: 'Hydraulic Piston', input: 'Force: 500 lbf, Area: 5 in²', result: 'Pressure = 100 PSI (689.5 kPa)' }
    ],
    faqs: [
      { q: 'What is 1 atmosphere of pressure in PSI?', a: 'One standard atmosphere (atm) at sea level is approximately 14.696 PSI or 101.325 kPa.' }
    ]
  },
  'concrete-calculator': {
    id: 'concrete-calculator',
    name: 'Concrete Calculator',
    category: 'Construction',
    icon: 'fa-truck-ramp-box',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    description: 'Calculate concrete volume in cubic yards, cubic feet, and 60lb/80lb bags needed for slabs, footings, and columns.',
    metaDescription: 'Free concrete calculator — estimate concrete volume in cubic yards, cubic feet, and bags needed for slabs, footings, and columns.',
    fields: [
      { id: 'shape', label: 'Shape', type: 'select', default: 'slab',
        options: [
          { value: 'slab', label: 'Slab / Pad (rectangular)' },
          { value: 'footing', label: 'Footing / Wall (rectangular)' },
          { value: 'column', label: 'Column / Cylinder (round)' },
        ], hint: 'Select the concrete pour shape.' },
      { id: 'length', label: 'Length (ft)', type: 'number', default: 10, min: 0, step: 0.5, hint: 'Length in feet.' },
      { id: 'width', label: 'Width (ft)', type: 'number', default: 10, min: 0, step: 0.5, hint: 'Width in feet.' },
      { id: 'diameter', label: 'Diameter (ft)', type: 'number', default: 1, min: 0, step: 0.25, hint: 'Diameter for round columns.' },
      { id: 'depth', label: 'Depth / Thickness (in)', type: 'number', default: 4, min: 0.5, step: 0.5, hint: 'Thickness in inches (4in is standard for residential slabs).' },
      { id: 'quantity', label: 'Quantity', type: 'number', default: 1, min: 1, step: 1, hint: 'Number of identical pours.' },
      { id: 'waste', label: 'Waste Margin (%)', type: 'number', default: 10, min: 0, max: 25, step: 1, hint: 'Recommended: 10% for uneven subgrade and spillage.' }
    ],
    calculate(v) {
      const shape = v.shape || 'slab';
      const L = safeNum(v.length, 0);
      const W = safeNum(v.width, 0);
      const D = safeNum(v.diameter, 0);
      const depthIn = safeNum(v.depth, 0);
      const qty = Math.max(1, Math.round(safeNum(v.quantity, 1)));
      const waste = safeNum(v.waste, 10);

      let volumeCF = 0;
      if (shape === 'column') {
        const r = D / 2;
        volumeCF = Math.PI * r * r * (depthIn / 12);
      } else {
        if (L <= 0 || W <= 0) return errorResult('Enter valid length and width.');
        volumeCF = L * W * (depthIn / 12);
      }
      if (volumeCF <= 0 || depthIn <= 0) return errorResult('Please enter positive dimensions.');

      const totalCF = roundTo(volumeCF * qty * (1 + waste / 100), 2);
      const totalCY = roundTo(totalCF / 27, 2);
      const totalM3 = roundTo(totalCF * 0.0283168, 2);
      const bags60 = Math.ceil(totalCF / 0.45);
      const bags80 = Math.ceil(totalCF / 0.60);

      return {
        stats: [
          { label: 'Concrete Needed (Cubic Yards)', value: totalCY + ' yd³', highlight: true },
          { label: 'Concrete Needed (Cubic Feet)', value: totalCF + ' ft³' },
          { label: 'Concrete Needed (Cubic Meters)', value: totalM3 + ' m³' },
          { label: '80lb Pre-mix Bags', value: bags80 + ' bags' },
          { label: '60lb Pre-mix Bags', value: bags60 + ' bags' },
          { label: 'Total Weight', value: Math.round(totalCF * 145).toLocaleString('en-US') + ' lbs' },
        ],
        formula: 'Volume (yd³) = (Length × Width × (Depth ÷ 12)) ÷ 27 × (1 + Waste%)',
      };
    },
    article: { heading: 'How to Calculate Concrete Volume Accurately', intro: 'Ordering concrete accurately prevents expensive short-load fees or messy excess waste.', sections: [
      { heading: 'Cubic Yards Calculation', body: 'Concrete is measured in cubic yards (27 cubic feet). Multiply length by width by depth in feet, then divide by 27.' }
    ] },
    howTo: ['Select slab, footing, or column shape.', 'Enter dimensions in feet and thickness in inches.', 'Review cubic yards and bag count required.'],
    formula: 'yd³ = (ft × ft × (in / 12)) / 27',
    examples: [
      { title: '10x10 Patio Slab (4in deep)', input: '10ft × 10ft × 4in, 10% waste', result: '1.36 Cubic Yards (62 bags of 80lb)' }
    ],
    faqs: [
      { q: 'How thick should a concrete patio be?', a: 'Standard residential patios and sidewalks are typically 4 inches thick.' }
    ]
  },
  'paint-calculator': {
    id: 'paint-calculator',
    name: 'Paint Calculator',
    category: 'Construction',
    icon: 'fa-paint-roller',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    description: 'Calculate paint gallons and liters needed for interior or exterior walls, accounting for doors, windows, and coats.',
    metaDescription: 'Free paint calculator — estimate gallons and liters of paint needed for rooms, walls, doors, and ceilings.',
    fields: [
      { id: 'room_length', label: 'Room Length (ft)', type: 'number', default: 12, min: 1, step: 0.5, hint: 'Length of the room in feet.' },
      { id: 'room_width', label: 'Room Width (ft)', type: 'number', default: 12, min: 1, step: 0.5, hint: 'Width of the room in feet.' },
      { id: 'ceiling_height', label: 'Ceiling Height (ft)', type: 'number', default: 8, min: 1, step: 0.5, hint: 'Standard ceiling height is 8 to 9 feet.' },
      { id: 'doors', label: 'Number of Doors', type: 'number', default: 1, min: 0, step: 1, hint: 'Subtracted as ~21 sq ft each.' },
      { id: 'windows', label: 'Number of Windows', type: 'number', default: 2, min: 0, step: 1, hint: 'Subtracted as ~15 sq ft each.' },
      { id: 'coats', label: 'Number of Coats', type: 'number', default: 2, min: 1, max: 4, step: 1, hint: 'Most interior projects require 2 coats.' },
      { id: 'paint_ceiling', label: 'Include Ceiling?', type: 'select', default: 'no',
        options: [
          { value: 'no', label: 'No — Walls Only' },
          { value: 'yes', label: 'Yes — Include Ceiling Area' }
        ], hint: 'Include ceiling square footage.' }
    ],
    calculate(v) {
      const L = safeNum(v.room_length, 0);
      const W = safeNum(v.room_width, 0);
      const H = safeNum(v.ceiling_height, 0);
      const doors = safeNum(v.doors, 0);
      const windows = safeNum(v.windows, 0);
      const coats = safeNum(v.coats, 2);
      const incCeiling = v.paint_ceiling === 'yes';

      if (L <= 0 || W <= 0 || H <= 0) return errorResult('Enter positive room dimensions.');

      const wallArea = 2 * (L + W) * H;
      const deductions = (doors * 21) + (windows * 15);
      let netArea = Math.max(0, wallArea - deductions);
      if (incCeiling) netArea += (L * W);

      const totalPaintArea = netArea * coats;
      const gallonsNeeded = roundTo(totalPaintArea / 350, 2);
      const gallonsToBuy = Math.ceil(gallonsNeeded);
      const litersNeeded = roundTo(gallonsNeeded * 3.78541, 2);

      return {
        stats: [
          { label: 'Paint Needed (Gallons)', value: gallonsNeeded + ' gal (' + gallonsToBuy + ' to buy)', highlight: true },
          { label: 'Paint Needed (Liters)', value: litersNeeded + ' L' },
          { label: 'Total Wall Area', value: roundTo(netArea, 0) + ' sq ft' },
          { label: 'Total Coverage with Coats', value: roundTo(totalPaintArea, 0) + ' sq ft' },
        ],
        formula: 'Gallons = ((2 × (L + W) × H − (Doors × 21 + Windows × 15)) × Coats) ÷ 350 sq ft/gal',
      };
    },
    article: { heading: 'How to Estimate Paint Coverage for Rooms', intro: 'A gallon of quality interior paint covers approximately 350 to 400 square feet per coat.', sections: [
      { heading: 'Accounting for Openings', body: 'Standard doors subtract approximately 21 sq ft, while average windows subtract about 15 sq ft.' }
    ] },
    howTo: ['Enter room length, width, and ceiling height.', 'Add number of doors and windows.', 'Choose 1 or 2 coats.', 'View required paint in gallons and liters.'],
    formula: 'Gallons = Net Area × Coats / 350',
    examples: [
      { title: '12x12 Bedroom (8ft ceiling, 2 coats)', input: '12x12x8, 1 door, 2 windows, 2 coats', result: '1.91 Gallons (Buy 2 Gallons)' }
    ],
    faqs: [
      { q: 'How many square feet does one gallon of paint cover?', a: 'One gallon of paint typically covers 350 to 400 square feet on smooth, primed walls.' }
    ]
  },
  'tile-calculator': {
    id: 'tile-calculator',
    name: 'Tile Calculator',
    category: 'Construction',
    icon: 'fa-border-all',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    description: 'Calculate floor or wall tile counts, square footage, boxes needed, and waste factor for home renovations.',
    metaDescription: 'Free tile calculator — estimate square footage, total tiles, and boxes needed with waste factor for floors and walls.',
    fields: [
      { id: 'area_length', label: 'Area Length (ft)', type: 'number', default: 10, min: 0.5, step: 0.5, hint: 'Length of the floor or wall area in feet.' },
      { id: 'area_width', label: 'Area Width (ft)', type: 'number', default: 10, min: 0.5, step: 0.5, hint: 'Width of the floor or wall area in feet.' },
      { id: 'tile_size', label: 'Tile Size (inches)', type: 'select', default: '12x12',
        options: [
          { value: '4x4', label: '4" × 4" (Backsplash/Mosaic)' },
          { value: '6x6', label: '6" × 6" (Wall/Floor)' },
          { value: '12x12', label: '12" × 12" (Standard Floor 1 sq ft)' },
          { value: '12x24', label: '12" × 24" (Modern Rectangular 2 sq ft)' },
          { value: '24x24', label: '24" × 24" (Large Format 4 sq ft)' }
        ], hint: 'Standard nominal tile dimensions.' },
      { id: 'tiles_per_box', label: 'Tiles Per Box', type: 'number', default: 10, min: 1, step: 1, hint: 'Check the manufacturer packaging for box count.' },
      { id: 'waste_pct', label: 'Waste Margin (%)', type: 'number', default: 10, min: 0, max: 25, step: 1, hint: '10% standard, 15% for diagonal layout or intricate cuts.' }
    ],
    calculate(v) {
      const L = safeNum(v.area_length, 0);
      const W = safeNum(v.area_width, 0);
      const size = v.tile_size || '12x12';
      const perBox = Math.max(1, Math.round(safeNum(v.tiles_per_box, 10)));
      const waste = safeNum(v.waste_pct, 10);

      if (L <= 0 || W <= 0) return errorResult('Enter positive area dimensions.');

      const totalSqFt = L * W;
      const sizeMap = {
        '4x4': 16 / 144,
        '6x6': 36 / 144,
        '12x12': 1.0,
        '12x24': 2.0,
        '24x24': 4.0
      };
      const tileSqFt = sizeMap[size] || 1.0;

      const rawTiles = totalSqFt / tileSqFt;
      const totalTiles = Math.ceil(rawTiles * (1 + waste / 100));
      const totalBoxes = Math.ceil(totalTiles / perBox);
      const sqFtWithWaste = roundTo(totalSqFt * (1 + waste / 100), 2);

      return {
        stats: [
          { label: 'Tiles Needed (with waste)', value: totalTiles + ' tiles', highlight: true },
          { label: 'Boxes to Purchase', value: totalBoxes + ' boxes' },
          { label: 'Raw Area', value: roundTo(totalSqFt, 2) + ' sq ft' },
          { label: 'Area with ' + waste + '% Waste', value: sqFtWithWaste + ' sq ft' },
        ],
        formula: 'Tiles = (Area sq ft ÷ Tile sq ft) × (1 + Waste%)',
      };
    },
    article: { heading: 'How to Measure and Calculate Tile for Floors and Walls', intro: 'Ordering the correct amount of tile ensures consistent dye lots and prevents mid-project delays.', sections: [
      { heading: 'The 10% Waste Rule', body: 'Tile projects always produce cut remnants and breakage. Adding 10% ensures you have enough to finish cleanly.' }
    ] },
    howTo: ['Enter length and width of the room.', 'Select your tile size.', 'Enter tiles per box.', 'View total tiles and boxes to buy.'],
    formula: 'Boxes = Math.ceil(Total Tiles / Tiles Per Box)',
    examples: [
      { title: '10x10 Bathroom (12x12 tiles)', input: '10ft × 10ft, 12x12 tiles, 10% waste, 10/box', result: '110 Tiles (11 Boxes)' }
    ],
    faqs: [
      { q: 'Why do I need a 10% waste factor for tile?', a: 'Tiles must be cut around edges, corners, and plumbing fixtures, creating unusable scraps.' }
    ]
  },

  'auto-loan-calculator': {
    presets: [
          {
                "label": "New Vehicle (60 Mo @ 6.5%)",
                "values": {
                      "vehicle_price": 38000,
                      "down_payment": 5000,
                      "trade_in_value": 0,
                      "trade_in_owed": 0,
                      "interest_rate": 6.5,
                      "loan_term_months": 60,
                      "sales_tax_rate": 6,
                      "dealer_fees": 500
                }
          },
          {
                "label": "Used Vehicle (36 Mo @ 8.0%)",
                "values": {
                      "vehicle_price": 22000,
                      "down_payment": 3000,
                      "trade_in_value": 0,
                      "trade_in_owed": 0,
                      "interest_rate": 8,
                      "loan_term_months": 36,
                      "sales_tax_rate": 6,
                      "dealer_fees": 350
                }
          },
          {
                "label": "Trade-in Equity (48 Mo @ 5.5%)",
                "values": {
                      "vehicle_price": 35000,
                      "down_payment": 2000,
                      "trade_in_value": 10000,
                      "trade_in_owed": 4000,
                      "interest_rate": 5.5,
                      "loan_term_months": 48,
                      "sales_tax_rate": 6,
                      "dealer_fees": 400
                }
          }
    ],
    name: 'Auto Loan Calculator',
    category: 'Finance',
    icon: 'fa-car',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate monthly car payments, interest paid, trade-in value, sales tax, and full loan amortization.',
    metaDescription: 'Free auto loan calculator — calculate monthly car payments, interest, dealer fees, sales tax, and amortization schedule with trade-in equity.',
    fields: [
      { id: 'vehicle_price', label: 'Vehicle Price ($)', type: 'number', default: 35000, min: 500, step: 500, hint: 'The negotiated purchase price of the vehicle before taxes and fees.' },
      { id: 'down_payment', label: 'Down Payment ($)', type: 'number', default: 5000, min: 0, step: 500, hint: 'Cash paid upfront towards the purchase.' },
      { id: 'trade_in_value', label: 'Trade-in Value ($)', type: 'number', default: 0, min: 0, step: 500, hint: 'The estimated trade-in value of your current car.' },
      { id: 'trade_in_owed', label: 'Amount Owed on Trade-in ($)', type: 'number', default: 0, min: 0, step: 500, hint: 'Remaining loan balance on your trade-in vehicle (if any).' },
      { id: 'interest_rate', label: 'Interest Rate APR (%)', type: 'number', default: 6.5, min: 0, max: 40, step: 0.1, hint: 'Annual interest rate for the auto loan.' },
      { id: 'loan_term_months', label: 'Loan Term (months)', type: 'select', default: 60, options: [24, 36, 48, 60, 72, 84].map(m => ({ value: m, label: `${m} months (${(m/12).toFixed(1).replace('.0','')} years)` })), hint: 'Repayment period. Shorter terms save on total interest.' },
      { id: 'sales_tax_rate', label: 'Sales Tax Rate (%)', type: 'number', default: 6.0, min: 0, max: 25, step: 0.25, hint: 'State and local vehicle sales tax rate.' },
      { id: 'dealer_fees', label: 'Doc & Registration Fees ($)', type: 'number', default: 500, min: 0, step: 50, hint: 'Title, registration, and dealership documentation fees.' },
    ],
    calculate(v) {
      const price = safeNum(v.vehicle_price, 0);
      const down = safeNum(v.down_payment, 0);
      const tradeValue = safeNum(v.trade_in_value, 0);
      const tradeOwed = safeNum(v.trade_in_owed, 0);
      const annualRate = safeNum(v.interest_rate, 0);
      const months = Math.max(1, Math.round(safeNum(v.loan_term_months, 60)));
      const taxRate = safeNum(v.sales_tax_rate, 0);
      const fees = safeNum(v.dealer_fees, 0);

      if (price <= 0) {
        return errorResult('Vehicle price must be greater than zero.');
      }

      const netTradeIn = tradeValue - tradeOwed;
      const tradeTaxCredit = Math.max(0, tradeValue);
      const taxableAmount = Math.max(0, price - tradeTaxCredit);
      const salesTax = roundTo(taxableAmount * (taxRate / 100), 2);

      const netDownAndTrade = down + netTradeIn;
      const principal = roundTo(price + salesTax + fees - netDownAndTrade, 2);

      if (principal <= 0) {
        return {
          stats: [
            { label: 'Monthly Payment', value: '$0.00', highlight: true },
            { label: 'Loan Amount (Principal)', value: '$0.00' },
            { label: 'Sales Tax', value: fmt(salesTax) },
            { label: 'Total Purchase Price', value: fmt(price + salesTax + fees) },
            { label: 'Down Payment & Trade Equity', value: fmt(netDownAndTrade) },
          ],
          insight: {
            tone: 'positive',
            icon: 'fa-circle-check',
            headline: 'Paid in Full — No Financing Needed',
            detail: 'Your down payment and trade-in equity cover the entire vehicle purchase price, taxes, and fees.'
          }
        };
      }

      const r = annualRate / 100 / 12;
      const monthlyPayment = r === 0
        ? roundTo(principal / months, 2)
        : roundTo(principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1), 2);

      const totalPaid = roundTo(monthlyPayment * months, 2);
      const totalInterest = Math.max(0, roundTo(totalPaid - principal, 2));
      const totalVehicleCost = roundTo(down + (tradeValue > tradeOwed ? tradeValue - tradeOwed : 0) + totalPaid, 2);

      const schedule = buildAmortization(principal, r, months, monthlyPayment);

      return {
        stats: [
          { label: 'Monthly Payment', value: fmt(monthlyPayment), highlight: true },
          { label: 'Loan Amount (Financed)', value: fmt(principal) },
          { label: 'Total Interest Paid', value: fmt(totalInterest), warn: totalInterest > principal * 0.3 },
          { label: 'Sales Tax', value: fmt(salesTax) },
          { label: 'Total Amount Paid (Loan)', value: fmt(totalPaid) },
          { label: 'Total All-in Vehicle Cost', value: fmt(totalVehicleCost) },
        ],
        chart: {
          type: 'doughnut',
          labels: ['Principal (Vehicle)', 'Interest Paid', 'Sales Tax & Fees'],
          data: [Math.max(0, price - down - Math.max(0, netTradeIn)), totalInterest, salesTax + fees],
          colors: ['#6366F1', '#EF4444', '#10B981']
        },
        table: schedule,
        insight: {
          tone: months > 60 ? 'warning' : 'neutral',
          icon: 'fa-car-side',
          headline: `Loan Term: ${months} months (${(months/12).toFixed(1).replace('.0','')} yrs) at ${annualRate}% APR`,
          detail: months > 60
            ? 'Longer loan terms (over 60 months) lower monthly payments but significantly increase lifetime interest and the risk of negative equity (owing more than the car is worth).'
            : 'A loan term of 60 months or under keeps total financing costs low while building positive equity faster.'
        }
      };
    },
    article: {
      heading: 'How to Calculate Your Auto Loan Payment and Total Costs',
      intro: 'When buying a car, the sticker price is only part of the equation. Interest rates, loan terms, trade-in equity, sales taxes, and dealer documentation fees all impact your true monthly payment and lifetime cost.',
      sections: [
        { heading: 'The Impact of Loan Terms on Lifetime Interest', body: 'While a 72- or 84-month auto loan reduces your monthly bill, it dramatically increases the total interest you pay. In many cases, borrowers remain "underwater" (owing more than the vehicle is worth) for the first 3 to 4 years of a 72+ month loan.' },
        { heading: 'How Trade-in Value and Sales Tax Work', body: 'In most US states and international jurisdictions, your trade-in value reduces the taxable purchase price of the new vehicle. For instance, trading in a $10,000 car on a $35,000 purchase means you only pay sales tax on $25,000, saving hundreds of dollars in taxes.' },
      ]
    },
    howTo: [
      'Enter the vehicle sticker price and your cash down payment.',
      'Add trade-in value and any outstanding loan balance on your current vehicle.',
      'Select your loan term (e.g. 48, 60, or 72 months) and loan APR.',
      'Review your monthly payment, lifetime interest, and month-by-month amortization schedule.'
    ],
    examples: [
      { title: 'Standard 60-Month Auto Loan', input: '$35,000 Price, $5,000 Down, 6.5% APR, 60 Months', result: '$622/mo | Total Interest: ~$5,340' },
      { title: '72-Month Term vs 48-Month Comparison', input: '$35,000 Price, $5,000 Down, 6.5% APR', result: '48 Months: $743/mo ($3,660 interest) vs 72 Months: $536/mo ($6,560 interest)' }
    ],
    formula: 'M = P × [r(1+r)^n] / [(1+r)^n − 1] | Financed = Price + Tax + Fees − Down − Net Trade-in',
    faqs: [
      { q: 'What is a good auto loan interest rate?', a: 'Auto loan interest rates vary based on credit score, new vs used status, and loan term. Prime borrowers with credit scores over 720 typically secure APRs between 5% and 7% on new vehicles.' },
      { q: 'Should I choose a 48, 60, or 72-month auto loan?', a: 'Financial experts generally recommend a maximum term of 60 months for new cars and 48 months for used cars to prevent paying excessive interest and falling into negative equity.' },
      { q: 'How does a trade-in affect vehicle sales tax?', a: 'In most states, the trade-in allowance is subtracted from the purchase price before sales tax is calculated, reducing the total tax you owe.' },
      { q: 'What fees are included in the auto loan?', a: 'Common fees include dealer documentation fees, state title and registration fees, and local sales tax.' }
    ]
  },

  'salary-calculator': {
    presets: [
          {
                "label": "US Median ($65k Single)",
                "values": {
                      "gross_income": 65000,
                      "pay_frequency": "annual",
                      "filing_status": "single",
                      "state_tax_rate": 4.5,
                      "pretax_401k": 3000,
                      "pretax_health": 150
                }
          },
          {
                "label": "Tech / Senior ($130k Married)",
                "values": {
                      "gross_income": 130000,
                      "pay_frequency": "annual",
                      "filing_status": "married",
                      "state_tax_rate": 5.5,
                      "pretax_401k": 12000,
                      "pretax_health": 350
                }
          },
          {
                "label": "Hourly Full-Time ($28/hr)",
                "values": {
                      "gross_income": 28,
                      "pay_frequency": "hourly",
                      "hours_per_week": 40,
                      "filing_status": "single",
                      "state_tax_rate": 4,
                      "pretax_401k": 0,
                      "pretax_health": 100
                }
          }
    ],
    name: 'Salary & Paycheck Calculator',
    category: 'Finance',
    icon: 'fa-money-bill-transfer',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate your net take-home pay, federal & state taxes, FICA deductions, and hourly wage breakdown.',
    metaDescription: 'Free paycheck & salary calculator — calculate net take-home pay, federal and state taxes, FICA (Social Security & Medicare), and deductions.',
    fields: [
      { id: 'gross_income', label: 'Gross Income / Salary ($)', type: 'number', default: 75000, min: 100, step: 1000, hint: 'Your gross earnings before taxes and deductions.' },
      { id: 'pay_frequency', label: 'Pay Frequency', type: 'select', default: 'annual', options: [
        { value: 'annual', label: 'Annual Salary' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'biweekly', label: 'Biweekly (every 2 weeks)' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'hourly', label: 'Hourly' }
      ], hint: 'How often you receive your salary or wage.' },
      { id: 'hours_per_week', label: 'Hours Per Week', type: 'number', default: 40, min: 1, max: 168, step: 1, condition: v => v.pay_frequency === 'hourly', hint: 'Expected working hours per week (standard is 40).' },
      { id: 'filing_status', label: 'Filing Status', type: 'select', default: 'single', options: [
        { value: 'single', label: 'Single' },
        { value: 'married', label: 'Married Filing Jointly' },
        { value: 'head', label: 'Head of Household' }
      ], hint: 'Your tax filing status for federal tax bracket calculation.' },
      { id: 'state_tax_rate', label: 'Estimated State Tax Rate (%)', type: 'number', default: 5.0, min: 0, max: 15, step: 0.1, hint: 'State income tax rate (e.g. 0% in TX/FL/WA, ~5% average, up to 13% in CA).' },
      { id: 'pretax_401k', label: '401(k) / Retirement Deduction ($/yr)', type: 'number', default: 4000, min: 0, step: 500, hint: 'Annual pre-tax retirement contribution.' },
      { id: 'pretax_health', label: 'Health Insurance Pre-tax ($/mo)', type: 'number', default: 200, min: 0, step: 25, hint: 'Monthly pre-tax health and dental insurance premium.' },
    ],
    calculate(v) {
      let annualGross = safeNum(v.gross_income, 0);
      const freq = v.pay_frequency || 'annual';

      if (freq === 'monthly') annualGross *= 12;
      else if (freq === 'biweekly') annualGross *= 26;
      else if (freq === 'weekly') annualGross *= 52;
      else if (freq === 'hourly') {
        const hrs = Math.max(1, safeNum(v.hours_per_week, 40));
        annualGross = annualGross * hrs * 52;
      }

      if (annualGross <= 0) return errorResult('Gross income must be greater than zero.');

      const status = v.filing_status || 'single';
      const stateRate = safeNum(v.state_tax_rate, 5) / 100;
      const pretax401k = Math.min(annualGross * 0.9, safeNum(v.pretax_401k, 0));
      const pretaxHealthAnnual = safeNum(v.pretax_health, 0) * 12;
      const totalPretax = roundTo(pretax401k + pretaxHealthAnnual, 2);

      const socSecCap = 168600;
      const socSecTaxable = Math.min(annualGross, socSecCap);
      const socSecTax = roundTo(socSecTaxable * 0.062, 2);

      const medThreshold = status === 'married' ? 250000 : 200000;
      let medTax = annualGross * 0.0145;
      if (annualGross > medThreshold) {
        medTax += (annualGross - medThreshold) * 0.009;
      }
      medTax = roundTo(medTax, 2);
      const totalFica = roundTo(socSecTax + medTax, 2);

      const stdDeduction = status === 'married' ? 29200 : status === 'head' ? 21900 : 14600;
      const taxableFedIncome = Math.max(0, annualGross - totalPretax - stdDeduction);

      let fedTax = 0;
      const brackets = status === 'married'
        ? [
            { cap: 23200, rate: 0.10 },
            { cap: 94300, rate: 0.12 },
            { cap: 201050, rate: 0.22 },
            { cap: 383900, rate: 0.24 },
            { cap: 487450, rate: 0.32 },
            { cap: 731200, rate: 0.35 },
            { cap: Infinity, rate: 0.37 },
          ]
        : [
            { cap: 11600, rate: 0.10 },
            { cap: 47150, rate: 0.12 },
            { cap: 100525, rate: 0.22 },
            { cap: 191950, rate: 0.24 },
            { cap: 243725, rate: 0.32 },
            { cap: 609350, rate: 0.35 },
            { cap: Infinity, rate: 0.37 },
          ];

      let prevCap = 0;
      for (const b of brackets) {
        if (taxableFedIncome > prevCap) {
          const taxableChunk = Math.min(taxableFedIncome, b.cap) - prevCap;
          fedTax += taxableChunk * b.rate;
          prevCap = b.cap;
        } else {
          break;
        }
      }
      fedTax = roundTo(fedTax, 2);

      const stateTaxable = Math.max(0, annualGross - totalPretax);
      const stateTax = roundTo(stateTaxable * stateRate, 2);

      const totalTax = roundTo(fedTax + totalFica + stateTax, 2);
      const netTakeHomeAnnual = roundTo(annualGross - totalTax - totalPretax, 2);
      const netMonthly = roundTo(netTakeHomeAnnual / 12, 2);
      const netBiweekly = roundTo(netTakeHomeAnnual / 26, 2);
      const netWeekly = roundTo(netTakeHomeAnnual / 52, 2);
      const netHourly = roundTo(netTakeHomeAnnual / 2080, 2);
      const effectiveTaxRate = roundTo((totalTax / annualGross) * 100, 1);

      return {
        stats: [
          { label: 'Take-Home Pay (Monthly)', value: fmt(netMonthly), highlight: true },
          { label: 'Take-Home Pay (Biweekly)', value: fmt(netBiweekly) },
          { label: 'Take-Home Pay (Annual)', value: fmt(netTakeHomeAnnual) },
          { label: 'Effective Total Tax Rate', value: `${effectiveTaxRate}%`, warn: effectiveTaxRate > 30 },
          { label: 'Federal Income Tax', value: fmt(fedTax) },
          { label: 'FICA (Social Security & Medicare)', value: fmt(totalFica) },
          { label: 'Estimated State Tax', value: fmt(stateTax) },
          { label: 'Total Pre-tax Deductions', value: fmt(totalPretax) },
        ],
        chart: {
          type: 'doughnut',
          labels: ['Net Take-Home Pay', 'Federal Tax', 'FICA Tax', 'State Tax', 'Pre-tax Deductions'],
          data: [netTakeHomeAnnual, fedTax, totalFica, stateTax, totalPretax],
          colors: ['#10B981', '#6366F1', '#3B82F6', '#F59E0B', '#8B5CF6']
        },
        insight: {
          tone: 'positive',
          icon: 'fa-wallet',
          headline: `Net Take-Home Pay: ${pct(netTakeHomeAnnual / annualGross)} of Gross Salary`,
          detail: `You keep approximately ${fmt(netBiweekly)} every two weeks (${fmt(netHourly)}/hr equivalent) after all estimated federal, FICA, state taxes, and pre-tax deductions.`
        }
      };
    },
    article: {
      heading: 'How to Calculate Your Net Paycheck and Understand Tax Withholding',
      intro: 'Your gross salary represents total earnings before federal income tax, state income tax, Social Security, Medicare, and voluntary pre-tax deductions (like 401k and healthcare).',
      sections: [
        { heading: 'FICA Taxes Explained', body: 'FICA consists of Social Security (6.2% on earnings up to the annual wage cap) and Medicare (1.45% on all earnings, plus an additional 0.9% for high earners).' },
        { heading: 'Pre-Tax Deductions Save You Money', body: 'Contributing to traditional 401(k) accounts, HSAs, and pre-tax health insurance reduces your taxable income, lowering the amount of federal and state taxes withheld from each paycheck.' }
      ]
    },
    howTo: [
      'Enter your gross income and select your pay frequency (annual, monthly, biweekly, or hourly).',
      'Select your tax filing status (Single, Married, or Head of Household).',
      'Set your state tax rate or leave at the 5% national average.',
      'Add optional pre-tax retirement or health insurance deductions.',
      'Review your net take-home pay and complete tax breakdown.'
    ],
    examples: [
      { title: '$75,000 Single Filer', input: 'Salary: $75k, Filing: Single, 5% State Tax, $4k 401k', result: 'Net Pay: ~$4,650/mo | $2,146 biweekly | 22.4% Effective Tax' },
      { title: '$120,000 Married Filer', input: 'Salary: $120k, Filing: Married, 5% State Tax', result: 'Net Pay: ~$7,490/mo | $3,457 biweekly | 21.8% Effective Tax' }
    ],
    formula: 'Net Pay = Gross Income − Federal Tax − FICA Tax − State Tax − Pre-tax Deductions',
    faqs: [
      { q: 'What is the difference between gross pay and net pay?', a: 'Gross pay is the total amount earned before any deductions or taxes. Net pay (take-home pay) is the remaining money deposited into your bank account after all taxes and deductions.' },
      { q: 'How does filing status affect paycheck withholding?', a: 'Filing status determines your standard deduction and income tax brackets. Married couples filing jointly have wider tax brackets, typically lowering tax withholding compared to single filers.' },
      { q: 'How much are FICA taxes?', a: 'FICA taxes equal 7.65% for employees (6.2% Social Security + 1.45% Medicare). Employers match an identical 7.65%.' }
    ]
  },

  'tdee-calculator': {
    presets: [
          {
                "label": "Fat Loss Cut (-500 kcal)",
                "values": {
                      "unit": "imperial",
                      "gender": "male",
                      "age": 30,
                      "weight": 185,
                      "height": 70,
                      "activity_level": "moderate",
                      "goal": "cut_standard"
                }
          },
          {
                "label": "Lean Bulk (+300 kcal)",
                "values": {
                      "unit": "imperial",
                      "gender": "male",
                      "age": 25,
                      "weight": 165,
                      "height": 69,
                      "activity_level": "very_active",
                      "goal": "bulk_lean"
                }
          },
          {
                "label": "Maintenance & Tone",
                "values": {
                      "unit": "imperial",
                      "gender": "female",
                      "age": 28,
                      "weight": 135,
                      "height": 65,
                      "activity_level": "light",
                      "goal": "maintain"
                }
          }
    ],
    name: 'TDEE & Daily Calorie Calculator',
    category: 'Health',
    icon: 'fa-fire-flame-curved',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    description: 'Calculate your Total Daily Energy Expenditure (TDEE), Basal Metabolic Rate (BMR), and daily macro calorie targets.',
    metaDescription: 'Free TDEE calculator — calculate your Total Daily Energy Expenditure, BMR, daily calorie targets for weight loss or muscle gain, and macro splits.',
    fields: [
      { id: 'unit', label: 'Unit System', type: 'select', default: 'metric', options: [
        { value: 'metric', label: 'Metric (kg / cm)' },
        { value: 'imperial', label: 'Imperial (lbs / inches)' }
      ], hint: 'Choose metric or imperial units.' },
      { id: 'gender', label: 'Gender', type: 'select', default: 'male', options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' }
      ], hint: 'Biological sex influences baseline metabolic formulas.' },
      { id: 'age', label: 'Age', type: 'number', default: 28, min: 14, max: 110, step: 1, hint: 'Age in years.' },
      { id: 'weight', label: 'Weight', type: 'number', default: 75, min: 20, max: 500, step: 0.5, hint: 'Your current body weight.' },
      { id: 'height', label: 'Height', type: 'number', default: 178, min: 60, max: 260, step: 1, hint: 'Your height.' },
      { id: 'activity_level', label: 'Activity Level', type: 'select', default: 'moderate', options: [
        { value: 'sedentary', label: 'Sedentary (desk job, little or no exercise)' },
        { value: 'light', label: 'Light Exercise (1-2 days/week)' },
        { value: 'moderate', label: 'Moderate Exercise (3-5 days/week)' },
        { value: 'heavy', label: 'Heavy Exercise (6-7 days/week)' },
        { value: 'athlete', label: 'Athlete / Physical Job (2x per day)' }
      ], hint: 'Your weekly physical activity and exercise routine.' },
      { id: 'goal', label: 'Fitness Goal', type: 'select', default: 'maintain', options: [
        { value: 'cut_fast', label: 'Fast Weight Loss (-2 lbs/week [-1000 kcal])' },
        { value: 'cut_standard', label: 'Moderate Weight Loss (-1 lb/week [-500 kcal])' },
        { value: 'cut_mild', label: 'Mild Weight Loss (-0.5 lb/week [-250 kcal])' },
        { value: 'maintain', label: 'Maintain Current Weight' },
        { value: 'bulk_mild', label: 'Lean Muscle Gain (+0.5 lb/week [+250 kcal])' },
        { value: 'bulk_standard', label: 'Standard Muscle Gain (+1 lb/week [+500 kcal])' }
      ], hint: 'Calorie adjustment based on your target body composition goal.' }
    ],
    fieldLabels(v) {
      return {
        weight: v.unit === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)',
        height: v.unit === 'imperial' ? 'Height (inches)' : 'Height (cm)',
      };
    },
    calculate(v) {
      let weightKg = safeNum(v.weight, 0);
      let heightCm = safeNum(v.height, 0);

      if (v.unit === 'imperial') {
        weightKg *= 0.453592;
        heightCm *= 2.54;
      }

      if (weightKg <= 0 || heightCm <= 0) return errorResult('Please enter valid height and weight values.');

      const age = Math.max(14, safeNum(v.age, 25));
      const gender = v.gender || 'male';

      let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
      bmr += gender === 'male' ? 5 : -161;
      bmr = Math.round(bmr);

      const mults = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        heavy: 1.725,
        athlete: 1.9,
      };
      const actMult = mults[v.activity_level] || 1.55;
      const tdee = Math.round(bmr * actMult);

      const goalOffsets = {
        cut_fast: -1000,
        cut_standard: -500,
        cut_mild: -250,
        maintain: 0,
        bulk_mild: 250,
        bulk_standard: 500,
      };
      const targetCalories = Math.max(1000, tdee + (goalOffsets[v.goal] || 0));

      const proteinGrams = Math.round((targetCalories * 0.30) / 4);
      const carbsGrams = Math.round((targetCalories * 0.40) / 4);
      const fatGrams = Math.round((targetCalories * 0.30) / 9);

      return {
        stats: [
          { label: 'Target Daily Calories', value: `${fmtN(targetCalories)} kcal/day`, highlight: true },
          { label: 'Maintenance Calories (TDEE)', value: `${fmtN(tdee)} kcal/day` },
          { label: 'Basal Metabolic Rate (BMR)', value: `${fmtN(bmr)} kcal/day` },
          { label: 'Daily Protein Target', value: `${proteinGrams}g (30%)` },
          { label: 'Daily Carbohydrates Target', value: `${carbsGrams}g (40%)` },
          { label: 'Daily Fats Target', value: `${fatGrams}g (30%)` },
        ],
        chart: {
          type: 'doughnut',
          labels: [`Protein (${proteinGrams}g)`, `Carbohydrates (${carbsGrams}g)`, `Fats (${fatGrams}g)`],
          data: [proteinGrams * 4, carbsGrams * 4, fatGrams * 9],
          colors: ['#3B82F6', '#10B981', '#F59E0B']
        },
        insight: {
          tone: 'positive',
          icon: 'fa-utensils',
          headline: `Daily Target: ${fmtN(targetCalories)} kcal`,
          detail: `To meet your fitness goal, consume approximately ${fmtN(targetCalories)} calories per day split across ${proteinGrams}g protein, ${carbsGrams}g carbs, and ${fatGrams}g healthy fats.`
        }
      };
    },
    article: {
      heading: 'Understanding TDEE, BMR, and Macro Calorie Targets',
      intro: 'Total Daily Energy Expenditure (TDEE) is the total number of calories your body burns in a 24-hour period, encompassing your resting metabolic rate, physical activity, and food digestion.',
      sections: [
        { heading: 'BMR vs TDEE', body: 'Basal Metabolic Rate (BMR) represents the energy expended simply to keep your vital organs functioning at complete rest. TDEE multiplies BMR by your activity level to establish your true maintenance calories.' },
        { heading: 'How to Adjust Calories for Weight Loss or Muscle Gain', body: 'Consuming 500 calories below your TDEE creates a deficit leading to approximately 1 pound of weight loss per week (3,500 kcal deficit = 1 lb fat). Conversely, a 250-500 calorie surplus supports muscle hypertrophy with minimal fat gain.' }
      ]
    },
    howTo: [
      'Select Metric (kg/cm) or Imperial (lbs/in) units.',
      'Enter your age, gender, weight, and height.',
      'Select your weekly activity level and primary fitness goal.',
      'Read your BMR, TDEE, target daily calories, and suggested macronutrient split.'
    ],
    examples: [
      { title: 'Moderate Active Male (Weight Loss)', input: 'Age: 28, Male, 75kg, 178cm, Moderate Activity, -500 kcal Goal', result: 'TDEE: ~2,580 kcal | Target: 2,080 kcal/day (156g Protein, 208g Carbs, 69g Fat)' },
      { title: 'Sedentary Female (Maintenance)', input: 'Age: 32, Female, 65kg, 165cm, Sedentary, Maintain Goal', result: 'TDEE: ~1,650 kcal | BMR: ~1,375 kcal' }
    ],
    formula: 'BMR (Mifflin-St Jeor) = (10 × kg) + (6.25 × cm) − (5 × age) + (5 or −161) | TDEE = BMR × Activity',
    faqs: [
      { q: 'What is TDEE?', a: 'TDEE stands for Total Daily Energy Expenditure — the total number of calories you burn each day through basal metabolism, daily movement, digestion, and exercise.' },
      { q: 'How accurate is the Mifflin-St Jeor formula?', a: 'The Mifflin-St Jeor formula is widely recognized in clinical dietetics as one of the most reliable equations for estimating BMR in healthy individuals within 5-10% of metabolic chamber tests.' },
      { q: 'How many calories should I cut to lose 1 pound per week?', a: 'A caloric deficit of 500 calories per day equals 3,500 calories per week, which corresponds to approximately 1 pound of fat loss per week.' }
    ]
  },

  'unit-converter': {
    name: 'Universal Unit Converter',
    category: 'Math',
    icon: 'fa-arrow-right-arrow-left',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    description: 'Convert between units of length, weight, temperature, volume, speed, digital data, area, and pressure instantly.',
    metaDescription: 'Free online unit converter — instantly convert units of length, weight, temperature, volume, speed, data, area, and pressure with multi-unit comparison tables.',
    fields: [
      { id: 'dimension', label: 'Conversion Type', type: 'select', default: 'length', options: [
        { value: 'length', label: 'Length & Distance' },
        { value: 'weight', label: 'Weight & Mass' },
        { value: 'temperature', label: 'Temperature' },
        { value: 'volume', label: 'Volume & Capacity' },
        { value: 'speed', label: 'Speed & Velocity' },
        { value: 'data', label: 'Digital Data & Storage' },
        { value: 'area', label: 'Area' },
        { value: 'pressure', label: 'Pressure' },
        { value: 'time', label: 'Time' },
      ], hint: 'Choose the measurement category to convert.' },
      { id: 'amount', label: 'Value to Convert', type: 'number', default: 10, min: -999999999, step: 0.1, hint: 'The numerical quantity you want to convert.' },
      { id: 'unit_length_from', label: 'From Unit', type: 'select', hint: 'The starting length unit to convert from.', default: 'meters', condition: v => (v.dimension || 'length') === 'length', options: [
        { value: 'meters', label: 'Meters (m)' },
        { value: 'kilometers', label: 'Kilometers (km)' },
        { value: 'centimeters', label: 'Centimeters (cm)' },
        { value: 'millimeters', label: 'Millimeters (mm)' },
        { value: 'miles', label: 'Miles (mi)' },
        { value: 'yards', label: 'Yards (yd)' },
        { value: 'feet', label: 'Feet (ft)' },
        { value: 'inches', label: 'Inches (in)' },
        { value: 'nautical_miles', label: 'Nautical Miles (NM)' }
      ] },
      { id: 'unit_length_to', label: 'To Unit', type: 'select', hint: 'The target length unit to convert into.', default: 'feet', condition: v => (v.dimension || 'length') === 'length', options: [
        { value: 'meters', label: 'Meters (m)' },
        { value: 'kilometers', label: 'Kilometers (km)' },
        { value: 'centimeters', label: 'Centimeters (cm)' },
        { value: 'millimeters', label: 'Millimeters (mm)' },
        { value: 'miles', label: 'Miles (mi)' },
        { value: 'yards', label: 'Yards (yd)' },
        { value: 'feet', label: 'Feet (ft)' },
        { value: 'inches', label: 'Inches (in)' },
        { value: 'nautical_miles', label: 'Nautical Miles (NM)' }
      ] },

      { id: 'unit_weight_from', label: 'From Unit', type: 'select', hint: 'The starting weight unit to convert from.', default: 'kilograms', condition: v => v.dimension === 'weight', options: [
        { value: 'kilograms', label: 'Kilograms (kg)' },
        { value: 'grams', label: 'Grams (g)' },
        { value: 'milligrams', label: 'Milligrams (mg)' },
        { value: 'metric_tons', label: 'Metric Tons (t)' },
        { value: 'pounds', label: 'Pounds (lb)' },
        { value: 'ounces', label: 'Ounces (oz)' },
        { value: 'stones', label: 'Stones (st)' }
      ] },
      { id: 'unit_weight_to', label: 'To Unit', type: 'select', hint: 'The target weight unit to convert into.', default: 'pounds', condition: v => v.dimension === 'weight', options: [
        { value: 'kilograms', label: 'Kilograms (kg)' },
        { value: 'grams', label: 'Grams (g)' },
        { value: 'milligrams', label: 'Milligrams (mg)' },
        { value: 'metric_tons', label: 'Metric Tons (t)' },
        { value: 'pounds', label: 'Pounds (lb)' },
        { value: 'ounces', label: 'Ounces (oz)' },
        { value: 'stones', label: 'Stones (st)' }
      ] },

      { id: 'unit_temp_from', label: 'From Unit', type: 'select', hint: 'The starting temperature scale to convert from.', default: 'celsius', condition: v => v.dimension === 'temperature', options: [
        { value: 'celsius', label: 'Celsius (°C)' },
        { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
        { value: 'kelvin', label: 'Kelvin (K)' }
      ] },
      { id: 'unit_temp_to', label: 'To Unit', type: 'select', hint: 'The target temperature scale to convert into.', default: 'fahrenheit', condition: v => v.dimension === 'temperature', options: [
        { value: 'celsius', label: 'Celsius (°C)' },
        { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
        { value: 'kelvin', label: 'Kelvin (K)' }
      ] },

      { id: 'unit_vol_from', label: 'From Unit', type: 'select', hint: 'The starting volume unit to convert from.', default: 'liters', condition: v => v.dimension === 'volume', options: [
        { value: 'liters', label: 'Liters (L)' },
        { value: 'milliliters', label: 'Milliliters (mL)' },
        { value: 'cubic_meters', label: 'Cubic Meters (m³)' },
        { value: 'gallons_us', label: 'US Gallons (gal)' },
        { value: 'quarts_us', label: 'US Quarts (qt)' },
        { value: 'pints_us', label: 'US Pints (pt)' },
        { value: 'cups_us', label: 'US Cups' },
        { value: 'fl_oz_us', label: 'US Fluid Ounces (fl oz)' },
        { value: 'tablespoons', label: 'Tablespoons (tbsp)' },
        { value: 'teaspoons', label: 'Teaspoons (tsp)' }
      ] },
      { id: 'unit_vol_to', label: 'To Unit', type: 'select', hint: 'The target volume unit to convert into.', default: 'gallons_us', condition: v => v.dimension === 'volume', options: [
        { value: 'liters', label: 'Liters (L)' },
        { value: 'milliliters', label: 'Milliliters (mL)' },
        { value: 'cubic_meters', label: 'Cubic Meters (m³)' },
        { value: 'gallons_us', label: 'US Gallons (gal)' },
        { value: 'quarts_us', label: 'US Quarts (qt)' },
        { value: 'pints_us', label: 'US Pints (pt)' },
        { value: 'cups_us', label: 'US Cups' },
        { value: 'fl_oz_us', label: 'US Fluid Ounces (fl oz)' },
        { value: 'tablespoons', label: 'Tablespoons (tbsp)' },
        { value: 'teaspoons', label: 'Teaspoons (tsp)' }
      ] },

      { id: 'unit_speed_from', label: 'From Unit', type: 'select', hint: 'The starting velocity unit to convert from.', default: 'kmh', condition: v => v.dimension === 'speed', options: [
        { value: 'kmh', label: 'Kilometers per Hour (km/h)' },
        { value: 'mph', label: 'Miles per Hour (mph)' },
        { value: 'ms', label: 'Meters per Second (m/s)' },
        { value: 'knots', label: 'Knots (kn)' },
        { value: 'fts', label: 'Feet per Second (ft/s)' }
      ] },
      { id: 'unit_speed_to', label: 'To Unit', type: 'select', hint: 'The target velocity unit to convert into.', default: 'mph', condition: v => v.dimension === 'speed', options: [
        { value: 'kmh', label: 'Kilometers per Hour (km/h)' },
        { value: 'mph', label: 'Miles per Hour (mph)' },
        { value: 'ms', label: 'Meters per Second (m/s)' },
        { value: 'knots', label: 'Knots (kn)' },
        { value: 'fts', label: 'Feet per Second (ft/s)' }
      ] },

      { id: 'unit_data_from', label: 'From Unit', type: 'select', hint: 'The starting digital storage unit to convert from.', default: 'gigabytes', condition: v => v.dimension === 'data', options: [
        { value: 'bytes', label: 'Bytes (B)' },
        { value: 'kilobytes', label: 'Kilobytes (KB)' },
        { value: 'megabytes', label: 'Megabytes (MB)' },
        { value: 'gigabytes', label: 'Gigabytes (GB)' },
        { value: 'terabytes', label: 'Terabytes (TB)' },
        { value: 'petabytes', label: 'Petabytes (PB)' }
      ] },
      { id: 'unit_data_to', label: 'To Unit', type: 'select', hint: 'The target digital storage unit to convert into.', default: 'megabytes', condition: v => v.dimension === 'data', options: [
        { value: 'bytes', label: 'Bytes (B)' },
        { value: 'kilobytes', label: 'Kilobytes (KB)' },
        { value: 'megabytes', label: 'Megabytes (MB)' },
        { value: 'gigabytes', label: 'Gigabytes (GB)' },
        { value: 'terabytes', label: 'Terabytes (TB)' },
        { value: 'petabytes', label: 'Petabytes (PB)' }
      ] },

      { id: 'unit_area_from', label: 'From Unit', type: 'select', hint: 'The starting area unit to convert from.', default: 'sq_meters', condition: v => v.dimension === 'area', options: [
        { value: 'sq_meters', label: 'Square Meters (m²)' },
        { value: 'sq_kilometers', label: 'Square Kilometers (km²)' },
        { value: 'sq_feet', label: 'Square Feet (sq ft)' },
        { value: 'sq_yards', label: 'Square Yards (sq yd)' },
        { value: 'sq_miles', label: 'Square Miles (sq mi)' },
        { value: 'acres', label: 'Acres (ac)' },
        { value: 'hectares', label: 'Hectares (ha)' }
      ] },
      { id: 'unit_area_to', label: 'To Unit', type: 'select', hint: 'The target area unit to convert into.', default: 'sq_feet', condition: v => v.dimension === 'area', options: [
        { value: 'sq_meters', label: 'Square Meters (m²)' },
        { value: 'sq_kilometers', label: 'Square Kilometers (km²)' },
        { value: 'sq_feet', label: 'Square Feet (sq ft)' },
        { value: 'sq_yards', label: 'Square Yards (sq yd)' },
        { value: 'sq_miles', label: 'Square Miles (sq mi)' },
        { value: 'acres', label: 'Acres (ac)' },
        { value: 'hectares', label: 'Hectares (ha)' }
      ] },

      { id: 'unit_pressure_from', label: 'From Unit', type: 'select', hint: 'The starting pressure unit to convert from.', default: 'psi', condition: v => v.dimension === 'pressure', options: [
        { value: 'pascals', label: 'Pascals (Pa)' },
        { value: 'kilopascals', label: 'Kilopascals (kPa)' },
        { value: 'bar', label: 'Bar (bar)' },
        { value: 'psi', label: 'Pounds per Sq Inch (psi)' },
        { value: 'atm', label: 'Standard Atmospheres (atm)' },
        { value: 'mmhg', label: 'Millimeters of Mercury (mmHg / Torr)' }
      ] },
      { id: 'unit_pressure_to', label: 'To Unit', type: 'select', hint: 'The target pressure unit to convert into.', default: 'bar', condition: v => v.dimension === 'pressure', options: [
        { value: 'pascals', label: 'Pascals (Pa)' },
        { value: 'kilopascals', label: 'Kilopascals (kPa)' },
        { value: 'bar', label: 'Bar (bar)' },
        { value: 'psi', label: 'Pounds per Sq Inch (psi)' },
        { value: 'atm', label: 'Standard Atmospheres (atm)' },
        { value: 'mmhg', label: 'Millimeters of Mercury (mmHg / Torr)' }
      ] },

      { id: 'unit_time_from', label: 'From Unit', type: 'select', hint: 'The starting time unit to convert from.', default: 'hours', condition: v => v.dimension === 'time', options: [
        { value: 'seconds', label: 'Seconds (s)' },
        { value: 'minutes', label: 'Minutes (min)' },
        { value: 'hours', label: 'Hours (h)' },
        { value: 'days', label: 'Days (d)' },
        { value: 'weeks', label: 'Weeks (wk)' },
        { value: 'months', label: 'Months (30.44 days)' },
        { value: 'years', label: 'Years (365.25 days)' }
      ] },
      { id: 'unit_time_to', label: 'To Unit', type: 'select', hint: 'The target time unit to convert into.', default: 'minutes', condition: v => v.dimension === 'time', options: [
        { value: 'seconds', label: 'Seconds (s)' },
        { value: 'minutes', label: 'Minutes (min)' },
        { value: 'hours', label: 'Hours (h)' },
        { value: 'days', label: 'Days (d)' },
        { value: 'weeks', label: 'Weeks (wk)' },
        { value: 'months', label: 'Months (30.44 days)' },
        { value: 'years', label: 'Years (365.25 days)' }
      ] }
    ],
    calculate(v) {
      const dim = v.dimension || 'length';
      const amt = safeNum(v.amount, 0);

      // Conversion factors to Base Unit
      const lengthBase = {
        meters: 1, kilometers: 1000, centimeters: 0.01, millimeters: 0.001,
        miles: 1609.344, yards: 0.9144, feet: 0.3048, inches: 0.0254, nautical_miles: 1852
      };
      const weightBase = {
        kilograms: 1, grams: 0.001, milligrams: 0.000001, metric_tons: 1000,
        pounds: 0.45359237, ounces: 0.028349523125, stones: 6.35029318
      };
      const volumeBase = {
        liters: 1, milliliters: 0.001, cubic_meters: 1000,
        gallons_us: 3.785411784, quarts_us: 0.946352946, pints_us: 0.473176473,
        cups_us: 0.2365882365, fl_oz_us: 0.0295735295625, tablespoons: 0.01478676478125, teaspoons: 0.00492892159375
      };
      const speedBase = {
        ms: 1, kmh: 1 / 3.6, mph: 0.44704, knots: 0.514444, fts: 0.3048
      };
      const dataBase = {
        bytes: 1, kilobytes: 1024, megabytes: 1024 * 1024, gigabytes: 1024 * 1024 * 1024,
        terabytes: 1024 * 1024 * 1024 * 1024, petabytes: 1024 * 1024 * 1024 * 1024 * 1024
      };
      const areaBase = {
        sq_meters: 1, sq_kilometers: 1000000, sq_feet: 0.09290304,
        sq_yards: 0.83612736, sq_miles: 2589988.110336, acres: 4046.8564224, hectares: 10000
      };
      const pressureBase = {
        pascals: 1, kilopascals: 1000, bar: 100000, psi: 6894.757293168,
        atm: 101325, mmhg: 133.322387415
      };
      const timeBase = {
        seconds: 1, minutes: 60, hours: 3600, days: 86400,
        weeks: 604800, months: 2629800, years: 31557600
      };

      let resultValue = 0;
      let fromKey = 'meters';
      let toKey = 'feet';
      let tableRows = [];

      if (dim === 'temperature') {
        fromKey = v.unit_temp_from || 'celsius';
        toKey = v.unit_temp_to || 'fahrenheit';

        // Convert to Celsius base
        let inCelsius = amt;
        if (fromKey === 'fahrenheit') inCelsius = (amt - 32) * (5 / 9);
        else if (fromKey === 'kelvin') inCelsius = amt - 273.15;

        // Convert from Celsius to Target
        if (toKey === 'celsius') resultValue = inCelsius;
        else if (toKey === 'fahrenheit') resultValue = inCelsius * (9 / 5) + 32;
        else if (toKey === 'kelvin') resultValue = inCelsius + 273.15;

        tableRows = [
          { Unit: 'Celsius (°C)', Value: roundTo(inCelsius, 4) + ' °C' },
          { Unit: 'Fahrenheit (°F)', Value: roundTo(inCelsius * (9 / 5) + 32, 4) + ' °F' },
          { Unit: 'Kelvin (K)', Value: roundTo(inCelsius + 273.15, 4) + ' K' },
        ];
      } else {
        const factorMap = {
          length: { factors: lengthBase, from: v.unit_length_from || 'meters', to: v.unit_length_to || 'feet' },
          weight: { factors: weightBase, from: v.unit_weight_from || 'kilograms', to: v.unit_weight_to || 'pounds' },
          volume: { factors: volumeBase, from: v.unit_vol_from || 'liters', to: v.unit_vol_to || 'gallons_us' },
          speed: { factors: speedBase, from: v.unit_speed_from || 'kmh', to: v.unit_speed_to || 'mph' },
          data: { factors: dataBase, from: v.unit_data_from || 'gigabytes', to: v.unit_data_to || 'megabytes' },
          area: { factors: areaBase, from: v.unit_area_from || 'sq_meters', to: v.unit_area_to || 'sq_feet' },
          pressure: { factors: pressureBase, from: v.unit_pressure_from || 'psi', to: v.unit_pressure_to || 'bar' },
          time: { factors: timeBase, from: v.unit_time_from || 'hours', to: v.unit_time_to || 'minutes' },
        }[dim] || { factors: lengthBase, from: 'meters', to: 'feet' };

        fromKey = factorMap.from;
        toKey = factorMap.to;
        const fromFactor = factorMap.factors[fromKey] || 1;
        const toFactor = factorMap.factors[toKey] || 1;

        const inBase = amt * fromFactor;
        resultValue = inBase / toFactor;

        tableRows = Object.keys(factorMap.factors).map(k => {
          const val = inBase / factorMap.factors[k];
          const displayVal = Math.abs(val) < 0.00001 && val !== 0 ? val.toExponential(4) : Number(roundTo(val, 6)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
          return { Unit: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), Value: displayVal };
        });
      }

      const formatDisplay = (n) => {
        const num = safeNum(n, 0);
        if (Math.abs(num) < 0.00001 && num !== 0) return num.toExponential(4);
        return Number(roundTo(num, 6)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
      };

      return {
        stats: [
          { label: `Converted Value (${toKey.replace(/_/g, ' ')})`, value: formatDisplay(resultValue), highlight: true },
          { label: 'Initial Amount', value: `${formatDisplay(amt)} ${fromKey.replace(/_/g, ' ')}` },
          { label: 'Conversion Factor', value: `1 ${fromKey.replace(/_/g, ' ')} = ${formatDisplay(resultValue / (amt || 1))} ${toKey.replace(/_/g, ' ')}` },
        ],
        table: tableRows,
        insight: {
          tone: 'positive',
          icon: 'fa-arrow-right-arrow-left',
          headline: `${amt} ${fromKey.replace(/_/g, ' ')} = ${formatDisplay(resultValue)} ${toKey.replace(/_/g, ' ')}`,
          detail: 'See the full multi-unit conversion table below for equivalent values across all standard measurement systems.'
        }
      };
    },
    article: {
      heading: 'How to Convert Measurement Units Accurately',
      intro: 'Unit conversion translates quantities expressed in one measurement scale (such as metric) into equivalent values in another (such as imperial or US customary).',
      sections: [
        { heading: 'Metric vs Imperial Systems', body: 'The International System of Units (SI / Metric) is based on decimal multiples of ten (meters, kilograms, liters). Imperial and US customary units rely on historical fractions (inches, feet, pounds, gallons).' },
        { heading: 'Temperature Conversion Nuances', body: 'Unlike linear conversions, temperature conversions require offset adjustments because 0°C is 32°F (freezing point of water) and 0 K is absolute zero (-273.15°C).' }
      ]
    },
    howTo: [
      'Select the measurement dimension (Length, Weight, Temp, Volume, Speed, Data, Area, Pressure, or Time).',
      'Enter the numerical value to convert.',
      'Pick the "From" and "To" units.',
      'View the converted result and reference table.'
    ],
    examples: [
      { title: 'Length Conversion', input: '10 Meters to Feet', result: '32.8084 Feet' },
      { title: 'Weight Conversion', input: '70 Kilograms to Pounds', result: '154.3236 Pounds' },
      { title: 'Temperature Conversion', input: '100° Celsius to Fahrenheit', result: '212° Fahrenheit' }
    ],
    formula: 'Result = Value × (From Unit Base Factor ÷ To Unit Base Factor)',
    faqs: [
      { q: 'How many inches are in a meter?', a: 'There are exactly 39.3701 inches in 1 meter (1 inch = 2.54 cm).' },
      { q: 'How do you convert Celsius to Fahrenheit?', a: 'Multiply the Celsius temperature by 9/5 (or 1.8) and add 32: °F = (°C × 1.8) + 32.' },
      { q: 'How many pounds in a kilogram?', a: 'There are approximately 2.20462 pounds in 1 kilogram.' }
    ]
  },



  // ── Business: Profit Margin Calculator ──────────────────────────────────
  'profit-margin-calculator': {
    name: 'Profit Margin Calculator',
    category: 'Business',
    icon: 'fa-chart-line',
    iconClass: 'icon-business',
    tagClass: 'tag-business',
    description: 'Calculate gross profit, gross margin percentage, markup, net profit, and operating margin with full cost breakdown.',
    metaTitle: 'Profit Margin Calculator | Gross Margin, Markup & Net Profit — GetCalcu',
    metaDescription: 'Free online Profit Margin Calculator. Calculate gross margin %, markup %, net profit, and revenue pricing targets with cost breakdown charts.',
    keywords: [
      'profit margin calculator',
      'gross margin calculator',
      'markup calculator',
      'net profit calculator',
      'cost markup margin formula'
    ],
    presets: [
      { label: 'E-Commerce Retail (45% Margin)', values: { calc_mode: 'margin_from_price', cost: 55, revenue: 100, operating_expenses: 15 } },
      { label: 'SaaS / Digital (80% Margin)', values: { calc_mode: 'margin_from_price', cost: 20, revenue: 100, operating_expenses: 40 } },
      { label: 'Restaurant / Food (28% Margin)', values: { calc_mode: 'margin_from_price', cost: 18, revenue: 25, operating_expenses: 4 } }
    ],
    fields: [
      { id: 'calc_mode', label: 'Calculation Mode', type: 'select', default: 'margin_from_price', hint: 'Choose whether to calculate your profit margin from cost and price, or determine the required selling price for a target margin.', options: [
        { value: 'margin_from_price', label: 'Calculate Margin from Cost & Sale Price' },
        { value: 'price_from_margin', label: 'Calculate Selling Price from Cost & Target Margin' }
      ] },
      { id: 'cost', label: 'Cost of Goods Sold (COGS) ($)', type: 'number', default: 60, min: 0.01, step: 1, hint: 'Direct cost to manufacture or acquire one unit.' },
      { id: 'revenue', label: 'Selling Price / Revenue ($)', type: 'number', default: 100, min: 0.01, step: 1, condition: v => v.calc_mode === 'margin_from_price', hint: 'The price charged to the customer.' },
      { id: 'target_margin', label: 'Target Gross Margin (%)', type: 'number', default: 40, min: 0.01, max: 99.9, step: 0.5, condition: v => v.calc_mode === 'price_from_margin', hint: 'Desired profit margin percentage.' },
      { id: 'operating_expenses', label: 'Operating Overhead per Unit ($)', type: 'number', default: 15, min: 0, step: 1, hint: 'Indirect costs (marketing, shipping, software, rent).' }
    ],
    calculate(v) {
      const cost = safeNum(v.cost, 0);
      const opex = safeNum(v.operating_expenses, 0);
      let revenue = 0;
      let margin = 0;

      if (cost <= 0) return errorResult('Cost of goods sold must be greater than $0.');

      if (v.calc_mode === 'price_from_margin') {
        const targetMargin = safeNum(v.target_margin, 40) / 100;
        if (targetMargin >= 1) return errorResult('Target margin must be less than 100%.');
        revenue = roundTo(cost / (1 - targetMargin), 2);
        margin = targetMargin * 100;
      } else {
        revenue = safeNum(v.revenue, 0);
        if (revenue <= 0) return errorResult('Selling price must be greater than $0.');
        margin = roundTo(((revenue - cost) / revenue) * 100, 2);
      }

      const grossProfit = roundTo(revenue - cost, 2);
      const markup = roundTo(((revenue - cost) / cost) * 100, 2);
      const netProfit = roundTo(grossProfit - opex, 2);
      const netMargin = roundTo((netProfit / revenue) * 100, 2);

      const stats = [
        { label: 'Gross Profit', value: fmt(grossProfit), highlight: true },
        { label: 'Gross Margin', value: pct(margin / 100), highlight: true },
        { label: 'Markup Percentage', value: pct(markup / 100) },
        { label: 'Selling Price', value: fmt(revenue) },
        { label: 'Net Profit (After Overhead)', value: fmt(netProfit), warn: netProfit < 0, highlight: true },
        { label: 'Net Margin', value: pct(netMargin / 100), warn: netMargin < 0 }
      ];

      const chart = {
        type: 'doughnut',
        labels: ['COGS (Direct Cost)', 'Operating Expenses', 'Net Profit'],
        data: [cost, opex, Math.max(0, netProfit)],
        colors: ['#EF4444', '#F59E0B', '#10B981']
      };

      const table = [
        { Metric: 'Selling Price (Revenue)', Value: fmt(revenue), Percentage: '100.00%' },
        { Metric: 'Cost of Goods Sold (COGS)', Value: fmt(cost), Percentage: pct(cost / revenue) },
        { Metric: 'Gross Profit', Value: fmt(grossProfit), Percentage: pct(grossProfit / revenue) },
        { Metric: 'Operating Expenses', Value: fmt(opex), Percentage: pct(opex / revenue) },
        { Metric: 'Net Profit', Value: fmt(netProfit), Percentage: pct(netProfit / revenue) }
      ];

      return {
        stats,
        chart,
        table,
        insight: {
          tone: netProfit > 0 ? 'positive' : 'warning',
          icon: 'fa-chart-pie',
          headline: `Gross Margin is ${pct(margin / 100)} with a ${pct(markup / 100)} Markup.`,
          detail: `For every ${fmt(revenue)} in sales, you keep ${fmt(grossProfit)} in gross profit and ${fmt(netProfit)} in net profit after overhead.`
        }
      };
    },
    article: {
      heading: 'Understanding Margin vs Markup in Business Pricing',
      intro: 'Profit margin and markup are two related ways of measuring the profitability of a product or service, but they describe different ratios.',
      sections: [
        { heading: 'Margin vs Markup', body: 'Gross Margin is the percentage of selling price that is profit: (Price - Cost) / Price. Markup is the percentage added to the cost to get the price: (Price - Cost) / Cost. A 50% markup equals a 33.3% margin.' },
        { heading: 'Gross vs Net Profit', body: 'Gross profit only accounts for direct product costs (COGS). Net profit subtracts all operating overhead including marketing, salaries, rent, and software fees.' }
      ]
    },
    howTo: [
      'Enter your unit Cost of Goods Sold (COGS).',
      'Enter your Selling Price (or pick "Calculate Selling Price" with your target margin).',
      'Add operating overhead to see your bottom-line Net Profit.',
      'Review the gross margin, markup percentage, and profit breakdown.'
    ],
    examples: [
      { title: 'Standard Retail Markup', input: 'Cost: $50, Price: $100', result: 'Gross Profit: $50 (50% Margin, 100% Markup)' },
      { title: 'Target 40% Margin Pricing', input: 'Cost: $60, Target Margin: 40%', result: 'Selling Price: $100 (Markup: 66.67%)' }
    ],
    formula: 'Gross Margin = ((Revenue - Cost) ÷ Revenue) × 100 | Markup = ((Revenue - Cost) ÷ Cost) × 100 | Net Profit = Gross Profit - Operating Expenses',
    faqs: [
      { q: 'What is a good profit margin?', a: 'A healthy gross margin varies by industry: e-commerce averages 35-50%, SaaS and software average 70-85%, while restaurants and grocery stores often operate at 10-25%.' },
      { q: 'Why is markup always higher than margin?', a: 'Because markup is calculated against the smaller cost base, while margin is calculated against the larger total revenue base.' }
    ]
  },

  // ── Business: Break-Even Calculator ─────────────────────────────────────
  'break-even-calculator': {
    name: 'Break-Even Calculator',
    category: 'Business',
    icon: 'fa-scale-balanced',
    iconClass: 'icon-business',
    tagClass: 'tag-business',
    description: 'Determine the exact number of units and total sales revenue needed to cover all fixed and variable business costs.',
    metaTitle: 'Break-Even Calculator | Units, Revenue & Contribution Margin — GetCalcu',
    metaDescription: 'Free Break-Even Analysis Calculator. Calculate break-even point in units and sales revenue, contribution margin ratio, and target profit volume.',
    keywords: [
      'break even calculator',
      'break even point formula',
      'contribution margin calculator',
      'business break even analysis',
      'fixed vs variable cost calculator'
    ],
    presets: [
      { label: 'Physical Product ($5k Fixed)', values: { fixed_costs: 5000, sale_price: 50, variable_cost: 20, target_profit: 3000 } },
      { label: 'SaaS Subscription ($20k Fixed)', values: { fixed_costs: 20000, sale_price: 49, variable_cost: 5, target_profit: 10000 } },
      { label: 'Consulting / Agency ($12k Fixed)', values: { fixed_costs: 12000, sale_price: 150, variable_cost: 30, target_profit: 8000 } }
    ],
    fields: [
      { id: 'fixed_costs', label: 'Total Fixed Costs ($ / month)', type: 'number', default: 8000, min: 0, step: 100, hint: 'Non-variable expenses: rent, salaries, insurance, software licenses.' },
      { id: 'sale_price', label: 'Selling Price per Unit ($)', type: 'number', default: 60, min: 0.01, step: 1, hint: 'Average price charged per unit or subscription.' },
      { id: 'variable_cost', label: 'Variable Cost per Unit ($)', type: 'number', default: 20, min: 0, step: 1, hint: 'Direct per-unit costs: materials, labor, shipping, merchant fees.' },
      { id: 'target_profit', label: 'Target Monthly Profit ($) (optional)', type: 'number', default: 4000, min: 0, step: 100, hint: 'Desired profit above break-even.' }
    ],
    calculate(v) {
      const fixed = safeNum(v.fixed_costs, 0);
      const price = safeNum(v.sale_price, 0);
      const varCost = safeNum(v.variable_cost, 0);
      const targetProfit = safeNum(v.target_profit, 0);

      if (price <= 0) return errorResult('Selling price must be greater than $0.');
      if (price <= varCost) return errorResult('Selling price must exceed variable cost to achieve profitability.');

      const cmUnit = roundTo(price - varCost, 2);
      const cmRatio = roundTo((cmUnit / price) * 100, 2);
      const breakEvenUnits = Math.ceil(fixed / cmUnit);
      const breakEvenRevenue = roundTo(breakEvenUnits * price, 2);

      const targetUnits = Math.ceil((fixed + targetProfit) / cmUnit);
      const targetRevenue = roundTo(targetUnits * price, 2);

      const stats = [
        { label: 'Break-Even Units', value: fmtN(breakEvenUnits) + ' units', highlight: true },
        { label: 'Break-Even Sales Revenue', value: fmt(breakEvenRevenue), highlight: true },
        { label: 'Contribution Margin / Unit', value: fmt(cmUnit) },
        { label: 'Contribution Margin Ratio', value: pct(cmRatio / 100) },
        { label: 'Units to Target Profit', value: fmtN(targetUnits) + ' units' },
        { label: 'Revenue to Target Profit', value: fmt(targetRevenue) }
      ];

      // Volume milestones for sensitivity table
      const mults = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const table = mults.map(m => {
        const u = Math.round(breakEvenUnits * m);
        const rev = roundTo(u * price, 2);
        const totCost = roundTo(fixed + (u * varCost), 2);
        const net = roundTo(rev - totCost, 2);
        return {
          Volume: (m * 100) + '% (' + fmtN(u) + ' units)',
          Revenue: fmt(rev),
          TotalCost: fmt(totCost),
          NetProfitLoss: fmt(net)
        };
      });

      const chartLabels = mults.map(m => (m * 100) + '%');
      const revData = mults.map(m => roundTo(Math.round(breakEvenUnits * m) * price, 2));
      const costData = mults.map(m => roundTo(fixed + (Math.round(breakEvenUnits * m) * varCost), 2));

      const chart = {
        type: 'line',
        labels: chartLabels,
        datasets: [
          { label: 'Total Revenue', data: revData, color: '#10B981' },
          { label: 'Total Costs', data: costData, color: '#EF4444' }
        ]
      };

      return {
        stats,
        chart,
        table,
        insight: {
          tone: 'positive',
          icon: 'fa-scale-balanced',
          headline: `You need to sell ${fmtN(breakEvenUnits)} units (${fmt(breakEvenRevenue)}) to break even.`,
          detail: `Each unit sold contributes ${fmt(cmUnit)} (${pct(cmRatio / 100)}) toward fixed expenses. To hit your target profit of ${fmt(targetProfit)}, sell ${fmtN(targetUnits)} units.`
        }
      };
    },
    article: {
      heading: 'How to Perform a Break-Even Analysis',
      intro: 'A break-even analysis identifies the exact volume of unit sales needed so total revenues equal total costs, resulting in zero net profit or loss.',
      sections: [
        { heading: 'Fixed vs Variable Costs', body: 'Fixed costs remain constant regardless of sales volume (rent, salaries, subscriptions). Variable costs scale directly with unit volume (raw materials, production, shipping, merchant processing).' },
        { heading: 'Contribution Margin', body: 'Contribution margin is Selling Price minus Variable Cost. This is the dollar amount from every sale that directly funds fixed overhead and generates net profit.' }
      ]
    },
    howTo: [
      'Enter total monthly fixed overhead costs.',
      'Enter the selling price and variable cost per unit.',
      'Optionally set a target monthly profit goal.',
      'View break-even volume, revenue, and sensitivity tables.'
    ],
    examples: [
      { title: 'Retail Boutique', input: 'Fixed: $6,000, Price: $50, Variable: $20', result: 'Break-even: 200 units ($10,000 revenue)' },
      { title: 'SaaS App', input: 'Fixed: $15,000, Price: $30/mo, Variable: $3/mo', result: 'Break-even: 556 subscribers ($16,680/mo revenue)' }
    ],
    formula: 'Break-Even Units = Fixed Costs ÷ (Price - Variable Cost) | Break-Even Revenue = Break-Even Units × Price',
    faqs: [
      { q: 'What happens if fixed costs increase?', a: 'When fixed costs rise, your break-even point increases, meaning you must sell more units or raise prices to avoid operating at a loss.' },
      { q: 'How can I lower my break-even point?', a: 'You can lower your break-even point by increasing unit selling price, negotiating lower variable material costs, or reducing fixed overhead.' }
    ]
  },

  // ── Business: Customer Lifetime Value Calculator ────────────────────────
  'customer-lifetime-value-calculator': {
    name: 'Customer Lifetime Value (LTV / CAC) Calculator',
    category: 'Business',
    icon: 'fa-users-gear',
    iconClass: 'icon-business',
    tagClass: 'tag-business',
    description: 'Calculate Customer Lifetime Value (LTV), LTV to CAC ratio, payback period, and unit economics health for growth.',
    metaTitle: 'Customer Lifetime Value Calculator | LTV:CAC Ratio & Payback — GetCalcu',
    metaDescription: 'Free Customer Lifetime Value (LTV) Calculator. Analyze LTV to CAC ratio, customer acquisition payback timeline, and growth unit economics.',
    keywords: [
      'customer lifetime value calculator',
      'ltv cac calculator',
      'cac payback period calculator',
      'saas ltv formula',
      'unit economics calculator'
    ],
    presets: [
      { label: 'B2B SaaS ($200/mo, 3 Yr Lifespan)', values: { avg_order_value: 200, purchase_frequency: 12, customer_lifespan: 3, gross_margin: 80, cac: 1500 } },
      { label: 'E-Commerce DTC ($75 AOV, 2x/yr)', values: { avg_order_value: 75, purchase_frequency: 2.5, customer_lifespan: 2, gross_margin: 50, cac: 45 } },
      { label: 'Subscription Box ($40/mo, 14 Mo)', values: { avg_order_value: 40, purchase_frequency: 12, customer_lifespan: 1.2, gross_margin: 60, cac: 65 } }
    ],
    fields: [
      { id: 'avg_order_value', label: 'Average Order / Transaction Value ($)', type: 'number', default: 120, min: 0.01, step: 5, hint: 'Average dollar amount spent per purchase or monthly subscription.' },
      { id: 'purchase_frequency', label: 'Purchase Frequency (orders per year)', type: 'number', default: 4, min: 0.1, step: 0.5, hint: 'How many times a customer buys in one year (use 12 for monthly subscriptions).' },
      { id: 'customer_lifespan', label: 'Average Customer Lifespan (years)', type: 'number', default: 3, min: 0.1, step: 0.5, hint: 'How many years the average customer stays active.' },
      { id: 'gross_margin', label: 'Gross Margin (%)', type: 'number', default: 70, min: 1, max: 100, step: 1, hint: 'Gross profit percentage after product fulfillment costs.' },
      { id: 'cac', label: 'Customer Acquisition Cost (CAC) ($)', type: 'number', default: 250, min: 0.01, step: 10, hint: 'Total sales and marketing cost to acquire one paying customer.' }
    ],
    calculate(v) {
      const aov = safeNum(v.avg_order_value, 0);
      const freq = safeNum(v.purchase_frequency, 1);
      const lifespan = safeNum(v.customer_lifespan, 1);
      const marginPct = safeNum(v.gross_margin, 70) / 100;
      const cac = safeNum(v.cac, 0);

      if (aov <= 0 || freq <= 0 || lifespan <= 0) return errorResult('Order value, frequency, and lifespan must be greater than zero.');

      const annualRevenue = roundTo(aov * freq, 2);
      const lifetimeRevenue = roundTo(annualRevenue * lifespan, 2);
      const ltv = roundTo(lifetimeRevenue * marginPct, 2);
      const ltvCacRatio = cac > 0 ? roundTo(ltv / cac, 2) : 0;
      const annualProfit = roundTo(annualRevenue * marginPct, 2);
      const monthlyProfit = annualProfit / 12;
      const paybackMonths = monthlyProfit > 0 ? roundTo(cac / monthlyProfit, 1) : 0;
      const netLifetimeProfit = roundTo(ltv - cac, 2);

      let healthLabel = 'Healthy (3x - 5x)';
      let healthTone = 'positive';
      if (ltvCacRatio < 1) { healthLabel = 'Critical / Losing Money (<1.0x)'; healthTone = 'warning'; }
      else if (ltvCacRatio < 3) { healthLabel = 'Low Margin / Vulnerable (1.0x - 2.9x)'; healthTone = 'warning'; }
      else if (ltvCacRatio > 5) { healthLabel = 'High Return / Underinvesting in Growth (>5.0x)'; healthTone = 'positive'; }

      const stats = [
        { label: 'Customer Lifetime Value (LTV)', value: fmt(ltv), highlight: true },
        { label: 'LTV to CAC Ratio', value: ltvCacRatio + 'x', highlight: true },
        { label: 'CAC Payback Period', value: paybackMonths + ' months' },
        { label: 'Net Profit per Customer (LTV - CAC)', value: fmt(netLifetimeProfit) },
        { label: 'Annual Revenue per Customer', value: fmt(annualRevenue) },
        { label: 'Gross Lifetime Revenue', value: fmt(lifetimeRevenue) }
      ];

      const bars = [
        { label: 'LTV vs Acquisition Cost (CAC)', value: ltv, target: Math.max(ltv, cac * 3), color: '#10B981', caption: 'LTV: ' + fmt(ltv) + ' | CAC: ' + fmt(cac) }
      ];

      return {
        stats,
        bars,
        insight: {
          tone: healthTone,
          icon: 'fa-users',
          headline: `LTV:CAC Ratio is ${ltvCacRatio}x (${healthLabel}).`,
          detail: `Each customer generates ${fmt(ltv)} in lifetime gross profit against a ${fmt(cac)} acquisition cost, paying back acquisition in ${paybackMonths} months.`
        }
      };
    },
    article: {
      heading: 'Understanding LTV:CAC and SaaS Unit Economics',
      intro: 'Customer Lifetime Value (LTV) measures the net profit a single customer contributes over their entire relationship with your company.',
      sections: [
        { heading: 'The 3:1 Rule for LTV:CAC', body: 'A 3:1 ratio (LTV = 3x CAC) is widely considered the golden benchmark. Below 1:1, you lose money on every customer. Above 5:1, you may be underinvesting in marketing and leaving market share on the table.' },
        { heading: 'CAC Payback Period', body: 'The payback period tells you how many months of customer revenue are required to recoup the upfront sales and marketing acquisition cost.' }
      ]
    },
    howTo: [
      'Enter your Average Order Value (AOV) and annual purchase frequency.',
      'Set expected customer retention lifespan in years.',
      'Add gross margin percentage and Customer Acquisition Cost (CAC).',
      'Analyze your LTV:CAC ratio and payback timeline.'
    ],
    examples: [
      { title: 'B2B Software SaaS', input: '$150/mo, 80% Margin, 3 Yr Lifespan, $1,200 CAC', result: 'LTV: $4,320 | Ratio: 3.6x | Payback: 10.0 mo' }
    ],
    formula: 'LTV = (AOV × Frequency × Lifespan) × Gross Margin % | LTV:CAC = LTV ÷ CAC | Payback = CAC ÷ Monthly Gross Profit',
    faqs: [
      { q: 'What is a good CAC payback period?', a: 'For B2B SaaS, under 12 months is considered excellent. For B2C and e-commerce, payback should ideally occur within the first purchase or within 6 months.' }
    ]
  },

  // ── Education: GPA Calculator ───────────────────────────────────────────
  'gpa-calculator': {
    name: 'College & High School GPA Calculator',
    category: 'Education',
    icon: 'fa-graduation-cap',
    iconClass: 'icon-education',
    tagClass: 'tag-education',
    description: 'Calculate semester and cumulative grade point averages (GPA) on 4.0 and weighted 5.0 scales with target GPA forecasting.',
    metaTitle: 'GPA Calculator | College 4.0 & Weighted High School Scale — GetCalcu',
    metaDescription: 'Free online GPA Calculator. Calculate semester and cumulative GPA on 4.0 and 5.0 weighted scales. Project target graduation GPA effortlessly.',
    keywords: [
      'gpa calculator',
      'college gpa calculator 4.0',
      'weighted gpa calculator',
      'high school gpa scale',
      'cumulative gpa calculator'
    ],
    presets: [
      { label: "Dean's List Semester (3.9 GPA)", values: { c1_grade: 'A', c1_credits: 4, c2_grade: 'A', c2_credits: 3, c3_grade: 'A-', c3_credits: 3, c4_grade: 'B+', c4_credits: 3, c5_grade: 'A', c5_credits: 3 } },
      { label: 'Standard College Term (3.2 GPA)', values: { c1_grade: 'B+', c1_credits: 4, c2_grade: 'B', c2_credits: 3, c3_grade: 'A-', c3_credits: 3, c4_grade: 'B-', c4_credits: 3, c5_grade: 'C+', c5_credits: 3 } },
      { label: 'Honors / AP Weighted (4.4 GPA)', values: { c1_grade: 'A', c1_credits: 4, c1_scale: 'ap', c2_grade: 'A', c2_credits: 3, c2_scale: 'ap', c3_grade: 'A-', c3_credits: 3, c3_scale: 'honors', c4_grade: 'B+', c4_credits: 3, c4_scale: 'regular' } }
    ],
    fields: [
      { id: 'c1_grade', label: 'Course 1 Grade', type: 'select', default: 'A', options: [
        { value: 'A+', label: 'A+ (4.0 / 97-100%)' }, { value: 'A', label: 'A (4.0 / 93-96%)' }, { value: 'A-', label: 'A- (3.7 / 90-92%)' },
        { value: 'B+', label: 'B+ (3.3 / 87-89%)' }, { value: 'B', label: 'B (3.0 / 83-86%)' }, { value: 'B-', label: 'B- (2.7 / 80-82%)' },
        { value: 'C+', label: 'C+ (2.3 / 77-79%)' }, { value: 'C', label: 'C (2.0 / 73-76%)' }, { value: 'C-', label: 'C- (1.7 / 70-72%)' },
        { value: 'D', label: 'D (1.0 / 65-69%)' }, { value: 'F', label: 'F (0.0 / <65%)' }
      ] },
      { id: 'c1_credits', label: 'Course 1 Credits', type: 'number', default: 4, min: 0.5, max: 10, step: 0.5 },
      { id: 'c1_scale', label: 'Course 1 Level', type: 'select', default: 'regular', options: [{ value: 'regular', label: 'Regular (4.0 Scale)' }, { value: 'honors', label: 'Honors (+0.5 pt)' }, { value: 'ap', label: 'AP / IB (+1.0 pt)' }] },

      { id: 'c2_grade', label: 'Course 2 Grade', type: 'select', default: 'A-', options: [
        { value: 'A+', label: 'A+' }, { value: 'A', label: 'A' }, { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' }, { value: 'B', label: 'B' }, { value: 'B-', label: 'B-' },
        { value: 'C+', label: 'C+' }, { value: 'C', label: 'C' }, { value: 'C-', label: 'C-' },
        { value: 'D', label: 'D' }, { value: 'F', label: 'F' }
      ] },
      { id: 'c2_credits', label: 'Course 2 Credits', type: 'number', default: 3, min: 0.5, max: 10, step: 0.5 },

      { id: 'c3_grade', label: 'Course 3 Grade', type: 'select', default: 'B+', options: [
        { value: 'A+', label: 'A+' }, { value: 'A', label: 'A' }, { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' }, { value: 'B', label: 'B' }, { value: 'B-', label: 'B-' },
        { value: 'C+', label: 'C+' }, { value: 'C', label: 'C' }, { value: 'C-', label: 'C-' },
        { value: 'D', label: 'D' }, { value: 'F', label: 'F' }
      ] },
      { id: 'c3_credits', label: 'Course 3 Credits', type: 'number', default: 3, min: 0.5, max: 10, step: 0.5 },

      { id: 'c4_grade', label: 'Course 4 Grade', type: 'select', default: 'A', options: [
        { value: 'A+', label: 'A+' }, { value: 'A', label: 'A' }, { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' }, { value: 'B', label: 'B' }, { value: 'B-', label: 'B-' },
        { value: 'C+', label: 'C+' }, { value: 'C', label: 'C' }, { value: 'C-', label: 'C-' },
        { value: 'D', label: 'D' }, { value: 'F', label: 'F' }
      ] },
      { id: 'c4_credits', label: 'Course 4 Credits', type: 'number', default: 3, min: 0.5, max: 10, step: 0.5 },

      { id: 'c5_grade', label: 'Course 5 Grade', type: 'select', default: 'B', options: [
        { value: 'A+', label: 'A+' }, { value: 'A', label: 'A' }, { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' }, { value: 'B', label: 'B' }, { value: 'B-', label: 'B-' },
        { value: 'C+', label: 'C+' }, { value: 'C', label: 'C' }, { value: 'C-', label: 'C-' },
        { value: 'D', label: 'D' }, { value: 'F', label: 'F' }
      ] },
      { id: 'c5_credits', label: 'Course 5 Credits', type: 'number', default: 3, min: 0, max: 10, step: 0.5 },

      { id: 'prior_gpa', label: 'Prior Cumulative GPA (optional)', type: 'number', default: 3.4, min: 0, max: 5.0, step: 0.01, hint: 'Leave at 0 if this is your first semester.' },
      { id: 'prior_credits', label: 'Prior Completed Credits (optional)', type: 'number', default: 30, min: 0, step: 1 }
    ],
    calculate(v) {
      const gradeMap = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D': 1.0, 'F': 0.0
      };

      const weightBonus = { regular: 0, honors: 0.5, ap: 1.0 };

      let totalCredits = 0;
      let totalQualityPoints = 0;
      let totalWeightedPoints = 0;
      const rows = [];

      for (let i = 1; i <= 5; i++) {
        const gradeKey = v['c' + i + '_grade'] || 'A';
        const cr = safeNum(v['c' + i + '_credits'], 0);
        const scale = v['c' + i + '_scale'] || 'regular';
        if (cr > 0) {
          const basePts = gradeMap[gradeKey] !== undefined ? gradeMap[gradeKey] : 4.0;
          const weightedPts = basePts + (weightBonus[scale] || 0);
          totalCredits += cr;
          totalQualityPoints += basePts * cr;
          totalWeightedPoints += weightedPts * cr;
          rows.push({
            Course: 'Course ' + i,
            Grade: gradeKey,
            Credits: cr,
            UnweightedPoints: basePts.toFixed(1),
            WeightedPoints: weightedPts.toFixed(1)
          });
        }
      }

      if (totalCredits === 0) return errorResult('Please enter at least one course with credit hours.');

      const semesterGpa = roundTo(totalQualityPoints / totalCredits, 2);
      const weightedGpa = roundTo(totalWeightedPoints / totalCredits, 2);

      const priorGpa = safeNum(v.prior_gpa, 0);
      const priorCr = safeNum(v.prior_credits, 0);
      let cumulativeGpa = semesterGpa;

      if (priorCr > 0 && priorGpa > 0) {
        const totalCumPoints = (priorGpa * priorCr) + totalQualityPoints;
        const totalCumCredits = priorCr + totalCredits;
        cumulativeGpa = roundTo(totalCumPoints / totalCumCredits, 2);
      }

      const stats = [
        { label: 'Semester GPA (4.0 Scale)', value: semesterGpa.toFixed(2), highlight: true },
        { label: 'Weighted GPA (5.0 Scale)', value: weightedGpa.toFixed(2), highlight: true },
        { label: 'Cumulative Projected GPA', value: cumulativeGpa.toFixed(2), highlight: true },
        { label: 'Semester Credits', value: totalCredits + ' hrs' },
        { label: 'Total Completed Credits', value: (priorCr + totalCredits) + ' hrs' }
      ];

      return {
        stats,
        table: rows,
        insight: {
          tone: semesterGpa >= 3.5 ? 'positive' : semesterGpa >= 2.5 ? 'neutral' : 'warning',
          icon: 'fa-graduation-cap',
          headline: `Your Semester GPA is ${semesterGpa.toFixed(2)} across ${totalCredits} credit hours.`,
          detail: priorCr > 0 ? `Including your prior ${priorCr} credits at ${priorGpa.toFixed(2)}, your new cumulative GPA moves to ${cumulativeGpa.toFixed(2)}.` : 'Maintain high performance to qualify for academic honors and scholarships.'
        }
      };
    },
    article: {
      heading: 'How Grade Point Average (GPA) Is Calculated',
      intro: 'GPA represents your average academic performance by weighting your letter grade points by each course credit value.',
      sections: [
        { heading: 'Unweighted vs Weighted Scales', body: 'Standard college GPA uses an unweighted 4.0 scale (A=4.0, B=3.0, C=2.0, D=1.0, F=0.0). High schools often apply weighted scales giving an extra 0.5 points for Honors and 1.0 points for Advanced Placement (AP) or International Baccalaureate (IB).' }
      ]
    },
    howTo: [
      'Select your letter grade and credit hours for each course.',
      'Select Honors or AP weighting if applicable.',
      'Optionally enter your prior GPA and completed credits for a cumulative projection.',
      'Review your calculated semester and cumulative GPA.'
    ],
    examples: [
      { title: '15-Credit College Semester', input: '3 A\'s (9 cr) + 2 B\'s (6 cr)', result: 'GPA: 3.60' }
    ],
    formula: 'GPA = Total Quality Points ÷ Total Credit Hours (where Quality Points = Grade Points × Credits)',
    faqs: [
      { q: 'What is a 4.0 GPA equivalent in percentage?', a: 'Generally, an unweighted 4.0 GPA corresponds to an average grade percentage of 93-100% (A or A+).' }
    ]
  },

  // ── Education: Final Grade Calculator ───────────────────────────────────
  'final-grade-calculator': {
    name: 'Final Grade Calculator',
    category: 'Education',
    icon: 'fa-clipboard-check',
    iconClass: 'icon-education',
    tagClass: 'tag-education',
    description: 'Calculate the exact score needed on your final exam to earn your desired target course grade.',
    metaTitle: 'Final Grade Calculator | Required Exam Score — GetCalcu',
    metaDescription: 'Free Final Grade Calculator. Find out what grade you need on your final exam to pass or achieve your target course grade.',
    keywords: [
      'final grade calculator',
      'what grade do i need on my final exam',
      'final exam score calculator',
      'college grade calculator',
      'passing grade calculator'
    ],
    presets: [
      { label: 'Standard Final (20% Weight for A)', values: { current_grade: 88, target_grade: 90, final_weight: 20 } },
      { label: 'High-Stakes Final (40% Weight for B)', values: { current_grade: 75, target_grade: 80, final_weight: 40 } },
      { label: 'Pass the Class (30% Weight for C)', values: { current_grade: 65, target_grade: 70, final_weight: 30 } }
    ],
    fields: [
      { id: 'current_grade', label: 'Current Class Grade (%)', type: 'number', default: 86, min: 0, max: 120, step: 0.5, hint: 'Your existing grade percentage prior to the final exam.' },
      { id: 'target_grade', label: 'Desired Course Grade (%)', type: 'number', default: 90, min: 0, max: 100, step: 0.5, hint: 'Target minimum overall course score (e.g. 90% for an A, 80% for a B).' },
      { id: 'final_weight', label: 'Final Exam Weight (%)', type: 'number', default: 25, min: 1, max: 100, step: 1, hint: 'How much the final exam counts toward your total grade.' }
    ],
    calculate(v) {
      const current = safeNum(v.current_grade, 0);
      const target = safeNum(v.target_grade, 90);
      const weight = safeNum(v.final_weight, 25) / 100;

      if (weight <= 0 || weight > 1) return errorResult('Final exam weight must be between 1% and 100%.');

      // Required = (Target - Current * (1 - Weight)) / Weight
      const required = roundTo((target - current * (1 - weight)) / weight, 2);

      let status = 'Achievable';
      let tone = 'positive';
      if (required > 100) { status = 'Requires Extra Credit (>100%)'; tone = 'warning'; }
      else if (required > 90) { status = 'Challenging (90%+ Exam)'; tone = 'neutral'; }
      else if (required <= 0) { status = 'Guaranteed (0% Needed)'; tone = 'positive'; }

      const stats = [
        { label: 'Required Final Exam Score', value: required <= 0 ? '0.00% (Already Achieved)' : required.toFixed(2) + '%', highlight: true, warn: required > 100 },
        { label: 'Goal Difficulty', value: status, highlight: true },
        { label: 'Current Grade', value: current.toFixed(2) + '%' },
        { label: 'Target Overall Grade', value: target.toFixed(2) + '%' },
        { label: 'Final Weight', value: (weight * 100).toFixed(0) + '%' }
      ];

      // Benchmark targets table
      const letterGoals = [
        { grade: 'A (90%)', target: 90 },
        { grade: 'B (80%)', target: 80 },
        { grade: 'C (70%)', target: 70 },
        { grade: 'D (60%)', target: 60 }
      ];

      const table = letterGoals.map(g => {
        const req = roundTo((g.target - current * (1 - weight)) / weight, 1);
        return {
          Goal: g.grade,
          RequiredOnFinal: req <= 0 ? 'Guaranteed (0%)' : req > 100 ? req + '% (Extra Credit)' : req + '%'
        };
      });

      return {
        stats,
        table,
        insight: {
          tone,
          icon: 'fa-clipboard-check',
          headline: required <= 0
            ? `You already have your target grade of ${target}% secured!`
            : required > 100
            ? `You need ${required.toFixed(1)}% on the final to reach ${target}%. Consider asking for extra credit.`
            : `Score at least ${required.toFixed(1)}% on your final exam to secure an overall grade of ${target}%.`,
          detail: `Your current ${current}% grade makes up ${((1 - weight) * 100).toFixed(0)}% of your class average.`
        }
      };
    },
    article: {
      heading: 'How to Calculate Your Required Final Exam Grade',
      intro: 'Knowing what you need on your final exam allows you to prioritize study time strategically across your courses.',
      sections: [
        { heading: 'Weighted Grading Formula', body: 'Final Exam Required = (Target Grade - (Current Grade × (1 - Final Weight))) ÷ Final Weight.' }
      ]
    },
    howTo: [
      'Enter your current class grade percentage.',
      'Enter the target letter grade or percentage you want to achieve.',
      'Enter the weight percentage of the final exam.',
      'See the exact test score required and check grade cutoff benchmarks.'
    ],
    examples: [
      { title: '85% Current, Aiming for 90% A (20% Final)', input: 'Current: 85%, Target: 90%, Weight: 20%', result: 'Required on Final: 110% (Needs Extra Credit)' }
    ],
    formula: 'Final Exam Score = (Target - (Current × (1 - Weight))) ÷ Weight',
    faqs: [
      { q: 'What if I need over 100% on the final?', a: 'If the required score exceeds 100%, achieving that grade is mathematically impossible without extra credit points or a grading curve from your instructor.' }
    ]
  },

  // ── Education: Student Loan Calculator ──────────────────────────────────
  'student-loan-calculator': {
    name: 'Student Loan Calculator',
    category: 'Education',
    icon: 'fa-book-bookmark',
    iconClass: 'icon-education',
    tagClass: 'tag-education',
    description: 'Calculate monthly student loan payments, compare standard vs accelerated payoff timelines, and see interest saved with extra monthly deposits.',
    metaTitle: 'Student Loan Calculator | Monthly Payments & Payoff Payback — GetCalcu',
    metaDescription: 'Free online Student Loan Calculator. Estimate monthly payments, total lifetime interest, and interest saved by paying extra toward principal.',
    keywords: [
      'student loan calculator',
      'college loan repayment calculator',
      'student debt payoff calculator',
      'student loan interest savings',
      'federal student loan payment'
    ],
    presets: [
      { label: 'Federal Undergrad ($35k @ 5.5%)', values: { loan_balance: 35000, interest_rate: 5.5, loan_term: 10, extra_payment: 0 } },
      { label: 'Graduate School ($75k @ 7.0%)', values: { loan_balance: 75000, interest_rate: 7.0, loan_term: 10, extra_payment: 100 } },
      { label: 'Accelerated Payoff ($45k + $250/mo)', values: { loan_balance: 45000, interest_rate: 6.0, loan_term: 10, extra_payment: 250 } }
    ],
    fields: [
      { id: 'loan_balance', label: 'Total Student Loan Balance ($)', type: 'number', default: 35000, min: 100, step: 500, hint: 'Total outstanding balance across all student loans.' },
      { id: 'interest_rate', label: 'Annual Interest Rate (%)', type: 'number', default: 5.8, min: 0.01, max: 25, step: 0.05, hint: 'Average interest rate (Federal Direct loans are commonly 5-7%).' },
      { id: 'loan_term', label: 'Repayment Term (Years)', type: 'select', default: 10, hint: 'Standard federal repayment is 10 years. Extended plans can be 15-25 years.', options: [
        { value: 5, label: '5 Years' }, { value: 10, label: '10 Years (Standard)' }, { value: 15, label: '15 Years' }, { value: 20, label: '20 Years' }, { value: 25, label: '25 Years' }
      ] },
      { id: 'extra_payment', label: 'Extra Monthly Payment ($)', type: 'number', default: 50, min: 0, step: 25, hint: 'Additional amount paid directly toward principal each month.' }
    ],
    calculate(v) {
      const P = safeNum(v.loan_balance, 0);
      const rate = safeNum(v.interest_rate, 0);
      const r = rate / 100 / 12;
      const termYears = safeNum(v.loan_term, 10);
      const n = termYears * 12;
      const extra = safeNum(v.extra_payment, 0);

      if (P <= 0) return errorResult('Loan balance must be greater than $0.');

      const standardMonthly = r === 0 ? P / n : (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      const stdPayment = roundTo(standardMonthly, 2);
      const stdTotalInterest = roundTo(stdPayment * n - P, 2);

      // Simulation with extra payment
      let bal = P;
      let m = 0;
      let accInterest = 0;
      const schedule = [];

      while (bal > 0.01 && m < 600) {
        m++;
        const interestCharge = roundTo(bal * r, 2);
        let principalPaid = roundTo((stdPayment + extra) - interestCharge, 2);
        if (principalPaid > bal) principalPaid = bal;
        bal = roundTo(bal - principalPaid, 2);
        accInterest += interestCharge;
        if (m <= 120) {
          schedule.push({
            month: m,
            payment: roundTo(principalPaid + interestCharge, 2),
            principal: principalPaid,
            interest: interestCharge,
            balance: bal
          });
        }
      }

      const totalInterestWithExtra = roundTo(accInterest, 2);
      const interestSaved = roundTo(Math.max(0, stdTotalInterest - totalInterestWithExtra), 2);
      const monthsSaved = Math.max(0, n - m);
      const yearsSaved = (monthsSaved / 12).toFixed(1);

      const stats = [
        { label: 'Standard Monthly Payment', value: fmt(stdPayment), highlight: true },
        { label: 'Total Payment (incl. Extra)', value: fmt(stdPayment + extra), highlight: true },
        { label: 'Total Interest Paid', value: fmt(totalInterestWithExtra), warn: true },
        { label: 'Interest Saved by Extra Payments', value: fmt(interestSaved), highlight: true },
        { label: 'Time Saved Off Loan', value: monthsSaved > 0 ? yearsSaved + ' years (' + monthsSaved + ' mos)' : '0 months' },
        { label: 'Total Amount Repaid', value: fmt(roundTo(P + totalInterestWithExtra, 2)) }
      ];

      const chart = {
        principal: P,
        totalInterest: totalInterestWithExtra
      };

      return {
        stats,
        chart,
        table: schedule,
        insight: {
          tone: extra > 0 ? 'positive' : 'neutral',
          icon: 'fa-piggy-bank',
          headline: extra > 0
            ? `Paying an extra ${fmt(extra)}/mo saves ${fmt(interestSaved)} and ${yearsSaved} years of debt.`
            : `Your standard monthly payment is ${fmt(stdPayment)} over ${termYears} years.`,
          detail: `Total lifetime interest on ${fmt(P)} at ${rate}% is ${fmt(totalInterestWithExtra)}.`
        }
      };
    },
    article: {
      heading: 'Student Loan Repayment Strategies and Acceleration',
      intro: 'Student loans amortize monthly based on your interest rate and loan balance. Even small extra monthly payments go 100% to principal, drastically cutting lifetime interest.',
      sections: [
        { heading: 'The Power of Extra Principal Payments', body: 'Because student loan interest accrues daily on the remaining principal balance, paying an extra $50 to $100 per month reduces the balance faster and shortens your repayment timeline by years.' }
      ]
    },
    howTo: [
      'Enter your total student loan balance and interest rate.',
      'Select your repayment term (standard is 10 years).',
      'Add an extra monthly payment to see interest and time savings.',
      'Review your amortization schedule and accelerated payoff date.'
    ],
    examples: [
      { title: 'Standard 10-Year $35k Loan', input: '$35,000 at 5.5%, 10-year term', result: 'Payment: $380/mo | Total Interest: ~$10,600' }
    ],
    formula: 'Monthly Payment = P × [r(1+r)^n] ÷ [(1+r)^n - 1]',
    faqs: [
      { q: 'How does paying extra reduce my loan term?', a: 'Any extra payment above your required monthly minimum is applied directly to reducing your principal balance, lowering future interest accumulation.' }
    ]
  },

  'emergency-fund-calculator': {
    id: 'emergency-fund-calculator',
    name: 'Emergency Fund Calculator',
    category: 'Finance',
    icon: 'fa-shield-halved',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate how much you need in an emergency fund based on your essential expenses, target runway, and savings timeline.',
    metaTitle: 'Emergency Fund Calculator — How Much Savings Do You Need? | GetCalcu',
    metaDescription: 'Free emergency fund calculator. Calculate your 3, 6, or 9-month emergency savings target based on essential expenses and track your funding runway.',
    keywords: ['emergency fund calculator', 'how much emergency fund', 'safety net savings', 'emergency savings target', '3 month emergency fund', '6 month emergency fund'],
    fields: [
      { id: 'housing_rent', label: 'Monthly Housing / Rent / Mortgage ($)', type: 'number', default: 1500, hint: 'Rent, mortgage P&I, property taxes, home insurance' },
      { id: 'food_groceries', label: 'Monthly Groceries & Essentials ($)', type: 'number', default: 600, hint: 'Groceries, household supplies (excluding dining out)' },
      { id: 'utilities_bills', label: 'Utilities, Phone & Internet ($)', type: 'number', default: 300, hint: 'Electric, gas, water, cell phone, internet' },
      { id: 'transportation', label: 'Transportation & Gas ($)', type: 'number', default: 400, hint: 'Auto loan, fuel, insurance, transit passes' },
      { id: 'healthcare_insurance', label: 'Healthcare & Insurance Premiums ($)', type: 'number', default: 250, hint: 'Health, dental, vision, life insurance out-of-pocket' },
      { id: 'debt_minimums', label: 'Minimum Required Debt Payments ($)', type: 'number', default: 250, hint: 'Credit card minimums, student loans, personal loans' },
      { id: 'current_savings', label: 'Current Emergency Savings Balance ($)', type: 'number', default: 4000, hint: 'Cash in checking or high-yield savings accounts' },
      { id: 'monthly_contribution', label: 'Monthly Amount You Can Save ($)', type: 'number', default: 500, hint: 'Planned monthly contribution toward your emergency fund' },
      { id: 'target_runway', label: 'Target Runway (Months of Expenses)', type: 'select', default: '6', options: [
        { value: '3', label: '3 Months (Dual-income, stable jobs)' },
        { value: '6', label: '6 Months (Recommended standard safety net)' },
        { value: '9', label: '9 Months (Single-earner or volatile industry)' },
        { value: '12', label: '12 Months (Freelancer, self-employed, commission)' },
      ]},
      { id: 'hysa_rate', label: 'High-Yield Savings Annual APY (%)', type: 'number', default: 4.5, hint: 'Annual percentage yield earned while funds are parked' },
    ],
    presets: [
      { label: 'Starter 3-Month Fund', values: { housing_rent: 1200, food_groceries: 450, utilities_bills: 200, transportation: 250, healthcare_insurance: 150, debt_minimums: 150, current_savings: 1500, monthly_contribution: 400, target_runway: '3', hysa_rate: 4.5 } },
      { label: 'Family 6-Month Safety', values: { housing_rent: 2000, food_groceries: 800, utilities_bills: 350, transportation: 500, healthcare_insurance: 350, debt_minimums: 300, current_savings: 6000, monthly_contribution: 650, target_runway: '6', hysa_rate: 4.5 } },
      { label: 'Freelancer 12-Month Cushion', values: { housing_rent: 1800, food_groceries: 600, utilities_bills: 250, transportation: 300, healthcare_insurance: 400, debt_minimums: 200, current_savings: 8000, monthly_contribution: 800, target_runway: '12', hysa_rate: 4.5 } },
    ],
    calculate(v) {
      const housing = safeNum(v.housing_rent, 1500);
      const food = safeNum(v.food_groceries, 600);
      const utilities = safeNum(v.utilities_bills, 300);
      const transport = safeNum(v.transportation, 400);
      const healthcare = safeNum(v.healthcare_insurance, 250);
      const debt = safeNum(v.debt_minimums, 250);
      const savings = safeNum(v.current_savings, 4000);
      const contrib = safeNum(v.monthly_contribution, 500);
      const runwayMonths = safeNum(v.target_runway, 6);
      const apy = safeNum(v.hysa_rate, 4.5) / 100;

      const monthlyExpenses = roundTo(housing + food + utilities + transport + healthcare + debt, 2);
      const targetFund = roundTo(monthlyExpenses * runwayMonths, 2);
      const currentRunway = monthlyExpenses > 0 ? roundTo(savings / monthlyExpenses, 1) : 0;
      const fundedPct = targetFund > 0 ? roundTo(Math.min(100, (savings / targetFund) * 100), 1) : 100;
      const shortfall = roundTo(Math.max(0, targetFund - savings), 2);
      const surplus = roundTo(Math.max(0, savings - targetFund), 2);
      const monthsNeeded = (shortfall > 0 && contrib > 0) ? Math.ceil(shortfall / contrib) : 0;
      const annualHYSAInterest = roundTo(targetFund * apy, 2);

      let status = 'Needs Attention';
      if (savings >= targetFund) {
        status = 'Fully Funded ✓';
      } else if (savings >= targetFund * 0.5) {
        status = 'Halfway Funded';
      }

      // Milestones schedule
      const schedule = [];
      let balance = savings;
      const monthlyRate = apy / 12;
      for (let m = 1; m <= Math.min(60, Math.max(12, monthsNeeded)); m++) {
        const interest = roundTo(balance * monthlyRate, 2);
        balance = roundTo(balance + contrib + interest, 2);
        schedule.push({
          month: `Month ${m}`,
          payment: contrib,
          interest: interest,
          principal: contrib,
          balance: balance,
        });
        if (balance >= targetFund && m >= monthsNeeded) break;
      }

      return {
        stats: [
          { label: 'Target Emergency Fund', value: fmt(targetFund), highlight: true },
          { label: 'Monthly Essential Expenses', value: fmt(monthlyExpenses) },
          { label: 'Current Savings Balance', value: fmt(savings) },
          { label: 'Funded Progress', value: `${fundedPct}%`, warn: fundedPct < 100 },
          { label: 'Current Runway', value: `${currentRunway} months` },
          { label: shortfall > 0 ? 'Funding Shortfall' : 'Funding Surplus', value: fmt(shortfall > 0 ? shortfall : surplus), warn: shortfall > 0 },
          { label: 'Months to Reach Goal', value: monthsNeeded > 0 ? `${monthsNeeded} months` : 'Target Achieved' },
          { label: 'Annual Interest in HYSA', value: fmt(annualHYSAInterest) },
        ],
        chart: {
          principal: savings,
          totalInterest: shortfall,
        },
        table: schedule,
        insight: {
          tone: shortfall === 0 ? 'positive' : 'neutral',
          icon: shortfall === 0 ? 'fa-circle-check' : 'fa-shield-halved',
          headline: shortfall === 0
            ? `Congratulations! Your emergency fund covers ${currentRunway} months of essential expenses.`
            : `You need ${fmt(shortfall)} more to reach your ${runwayMonths}-month safety net target.`,
          detail: shortfall > 0 && contrib > 0
            ? `At ${fmt(contrib)}/month, you will reach your full ${fmt(targetFund)} target in approximately ${monthsNeeded} months (saving in a ${pct(apy)} HYSA adds ${fmt(annualHYSAInterest)}/yr in passive interest).`
            : `Once fully funded at ${fmt(targetFund)}, park the money in a High-Yield Savings Account to earn ${fmt(annualHYSAInterest)} in annual interest while remaining completely liquid.`
        }
      };
    },
    article: {
      heading: 'How Much Should You Have in an Emergency Fund?',
      intro: 'An emergency fund is liquid cash set aside to cover unexpected life events—such as sudden job loss, urgent medical emergencies, home repairs, or major auto breakdowns—without resorting to high-interest credit cards or pulling from long-term retirement investments.',
      sections: [
        { heading: 'The 3 to 6 Month Rule of Thumb', body: 'Financial advisors generally recommend keeping 3 to 6 months worth of essential living expenses in a dedicated, FDIC-insured High-Yield Savings Account (HYSA). If you have stable dual household incomes, 3 months may suffice. If you are a freelancer, single-income earner, or work in a cyclical industry, 6 to 12 months provides crucial peace of mind.' },
        { heading: 'What Counts as an "Essential Expense"?', body: 'Only include non-negotiable survival expenses: rent or mortgage, basic groceries, utilities, transportation, health insurance, and minimum debt payments. Exclude discretionary dining out, entertainment, vacations, and luxury subscriptions.' }
      ]
    },
    howTo: [
      'Tally your monthly essential obligations (rent/mortgage, utilities, food, transport, insurance, minimum debt).',
      'Select your target safety runway (standard recommendation is 3 to 6 months; freelancers should aim for 9 to 12 months).',
      'Input your current cash savings and how much you can comfortably contribute each month.',
      'Review your target emergency fund goal, current months of runway, and the timeline to become fully funded.'
    ],
    examples: [
      { title: 'Standard 6-Month Fund', input: '$3,300/mo expenses, 6 months runway, $4,000 saved', result: 'Target: $19,800 | Shortfall: $15,800 | 32 months at $500/mo' }
    ],
    formula: 'Target Fund = Total Monthly Essential Expenses × Desired Runway Months',
    faqs: [
      { q: 'Where should I keep my emergency fund?', a: 'Keep your emergency fund in a dedicated High-Yield Savings Account (HYSA) or Money Market Account (MMA) that is FDIC-insured. Avoid investing emergency reserves in volatile stocks or locking them into long-term CDs with early withdrawal penalties.' },
      { q: 'Should I pay off debt before building an emergency fund?', a: 'Most financial planners recommend building a "starter emergency fund" of $1,000 to 1 month of expenses first, then aggressively paying down high-interest credit cards, and finally expanding the fund to 3-6 months.' }
    ]
  },

  '401k-calculator': {
    id: '401k-calculator',
    name: '401(k) Retirement Growth Calculator',
    category: 'Finance',
    icon: 'fa-landmark',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Project your 401(k) retirement balance, company match growth, and tax-advantaged compound interest.',
    metaTitle: '401(k) Calculator — Employer Match & Retirement Growth | GetCalcu',
    metaDescription: 'Calculate your 401(k) balance at retirement. Account for employee contributions, employer company match, annual salary growth, and compound interest.',
    keywords: ['401k calculator', '401k retirement calculator', 'company match calculator', '401k growth', 'retirement savings projection'],
    fields: [
      { id: 'current_age', label: 'Current Age', type: 'number', default: 30, hint: 'Your current age in years' },
      { id: 'retire_age', label: 'Planned Retirement Age', type: 'number', default: 65, hint: 'Target age when you plan to stop working' },
      { id: 'annual_salary', label: 'Current Gross Annual Salary ($)', type: 'number', default: 75000, hint: 'Pre-tax gross salary' },
      { id: 'current_balance', label: 'Current 401(k) Balance ($)', type: 'number', default: 25000, hint: 'Total existing balance across all 401(k) accounts' },
      { id: 'employee_contrib_pct', label: 'Employee Contribution (% of Salary)', type: 'number', default: 8, hint: 'Percentage of salary deducted into your 401(k)' },
      { id: 'employer_match_pct', label: 'Employer Match Rate (%)', type: 'number', default: 50, hint: 'e.g., 50% match (company puts in $0.50 for every $1.00 you contribute)' },
      { id: 'employer_match_limit_pct', label: 'Employer Match Limit (% of Salary)', type: 'number', default: 6, hint: 'e.g., up to 6% of your salary' },
      { id: 'annual_salary_growth', label: 'Expected Annual Salary Growth (%)', type: 'number', default: 2.5, hint: 'Average annual merit or cost-of-living raise' },
      { id: 'annual_return', label: 'Expected Annual Investment Return (%)', type: 'number', default: 7.5, hint: 'Historical S&P 500 average is ~7-10% before inflation' },
    ],
    presets: [
      { label: 'Average Contributor', values: { current_age: 30, retire_age: 65, annual_salary: 75000, current_balance: 25000, employee_contrib_pct: 8, employer_match_pct: 50, employer_match_limit_pct: 6, annual_salary_growth: 2.5, annual_return: 7.5 } },
      { label: 'Aggressive Saver (Max Match)', values: { current_age: 26, retire_age: 65, annual_salary: 65000, current_balance: 12000, employee_contrib_pct: 12, employer_match_pct: 100, employer_match_limit_pct: 5, annual_salary_growth: 3.0, annual_return: 8.0 } },
      { label: 'Mid-Career Booster', values: { current_age: 42, retire_age: 65, annual_salary: 110000, current_balance: 140000, employee_contrib_pct: 10, employer_match_pct: 50, employer_match_limit_pct: 6, annual_salary_growth: 2.0, annual_return: 7.0 } },
    ],
    calculate(v) {
      const currentAge = safeNum(v.current_age, 30);
      const retireAge = safeNum(v.retire_age, 65);
      let salary = safeNum(v.annual_salary, 75000);
      let balance = safeNum(v.current_balance, 25000);
      const empPct = safeNum(v.employee_contrib_pct, 8) / 100;
      const matchPct = safeNum(v.employer_match_pct, 50) / 100;
      const matchLimitPct = safeNum(v.employer_match_limit_pct, 6) / 100;
      const salaryGrowth = safeNum(v.annual_salary_growth, 2.5) / 100;
      const returnRate = safeNum(v.annual_return, 7.5) / 100;

      if (retireAge <= currentAge) {
        return errorResult('Planned retirement age must be greater than current age.');
      }

      const yearsToRetire = retireAge - currentAge;
      let totalEmpContribs = 0;
      let totalMatchContribs = 0;
      const schedule = [];

      for (let y = 1; y <= yearsToRetire; y++) {
        // Annual employee contribution (capped at $23,500 statutory 2026 baseline limit)
        const empContrib = Math.min(salary * empPct, 23500);
        // Company match: matches employee contribution up to employer_match_limit_pct of salary
        const eligibleSalary = salary * Math.min(empPct, matchLimitPct);
        const matchContrib = eligibleSalary * matchPct;

        const totalYearContrib = empContrib + matchContrib;
        const interest = roundTo((balance + totalYearContrib / 2) * returnRate, 2);
        balance = roundTo(balance + totalYearContrib + interest, 2);

        totalEmpContribs = roundTo(totalEmpContribs + empContrib, 2);
        totalMatchContribs = roundTo(totalMatchContribs + matchContrib, 2);

        schedule.push({
          month: `Age ${currentAge + y}`,
          payment: roundTo(totalYearContrib, 2),
          principal: roundTo(empContrib, 2),
          interest: roundTo(matchContrib, 2),
          balance: balance,
        });

        salary = roundTo(salary * (1 + salaryGrowth), 2);
      }

      const totalContribs = roundTo(safeNum(v.current_balance, 25000) + totalEmpContribs + totalMatchContribs, 2);
      const totalGrowth = roundTo(balance - totalContribs, 2);
      const monthly4PctIncome = roundTo((balance * 0.04) / 12, 2);
      const annual4PctIncome = roundTo(balance * 0.04, 2);

      return {
        stats: [
          { label: 'Projected 401(k) Balance', value: fmt(balance), highlight: true },
          { label: 'Total Employee Contributions', value: fmt(totalEmpContribs) },
          { label: 'Total Employer Match ("Free Money")', value: fmt(totalMatchContribs), highlight: true },
          { label: 'Investment Compound Growth', value: fmt(totalGrowth) },
          { label: 'Monthly Retirement Income (4% Rule)', value: fmt(monthly4PctIncome) },
          { label: 'Annual Retirement Income (4% Rule)', value: fmt(annual4PctIncome) },
          { label: 'Total Years of Compounding', value: `${yearsToRetire} years` },
          { label: 'Final Salary at Retirement', value: fmt(salary) },
        ],
        chart: {
          principal: totalEmpContribs,
          totalInterest: totalMatchContribs + totalGrowth,
        },
        table: schedule,
        insight: {
          tone: 'positive',
          icon: 'fa-piggy-bank',
          headline: `Your 401(k) is projected to reach ${fmt(balance)} by age ${retireAge}.`,
          detail: `Your employer contributes ${fmt(totalMatchContribs)} in company matching funds—representing instant, risk-free returns. Under the 4% safe withdrawal rule, this nest egg generates ${fmt(monthly4PctIncome)}/month in retirement income.`
        }
      };
    },
    article: {
      heading: 'Maximizing Your 401(k) Retirement Plan & Employer Match',
      intro: 'A 401(k) is an employer-sponsored, tax-advantaged defined-contribution retirement account. Understanding how compounding growth and company matching work is the single most powerful step you can take toward financial independence.',
      sections: [
        { heading: 'Never Leave the Employer Match on the Table', body: 'If your employer offers a 50% match up to 6% of your salary, contributing at least 6% gives you an instant, guaranteed 50% return on your money. Always contribute enough to capture the full match before funding other accounts.' },
        { heading: 'Pre-Tax Compounding Power', body: 'Because traditional 401(k) contributions are deducted pre-tax, your taxable income decreases today while your full dollar amount compounds tax-deferred over decades.' }
      ]
    },
    howTo: [
      'Enter your current age and planned retirement age.',
      'Enter your current salary and existing 401(k) balance.',
      'Input your contribution percentage and your company match terms (e.g. 50% match up to 6%).',
      'Review your projected total nest egg, captured company match, and monthly retirement income.'
    ],
    examples: [
      { title: '30-Year-Old Starting with $25k', input: '$75,000 salary, 8% contrib, 50% match to 6%, 7.5% return', result: 'Projected Balance: ~$1.9 Million at Age 65' }
    ],
    formula: 'Future Balance = PV(1+r)^n + ∑ [Annual Contribs × (1+r)^(n-t)]',
    faqs: [
      { q: 'What is the 401(k) contribution limit?', a: 'For 2026, the IRS employee elective deferral limit is $23,500 ($31,000 for workers aged 50 and older utilizing catch-up contributions).' },
      { q: 'What is the difference between Traditional and Roth 401(k)?', a: 'Traditional 401(k) contributions are made with pre-tax dollars, lowering your taxable income today and taxing withdrawals in retirement. Roth 401(k) contributions are made with post-tax dollars, allowing completely tax-free withdrawals in retirement.' }
    ]
  },
  'debt-snowball-calculator': {
    presets: [
      {
        label: 'Standard Consumer Debt ($15k)',
        values: {
          extra_payment: 200,
          strategy: 'snowball',
          debt1_name: 'Credit Card',
          debt1_balance: 2500,
          debt1_rate: 24.99,
          debt1_min: 75,
          debt2_name: 'Auto Loan',
          debt2_balance: 8000,
          debt2_rate: 6.5,
          debt2_min: 200,
          debt3_name: 'Personal Loan',
          debt3_balance: 4500,
          debt3_rate: 12.0,
          debt3_min: 125
        }
      },
      {
        label: 'High-Interest Revolving Mix ($22k)',
        values: {
          extra_payment: 350,
          strategy: 'avalanche',
          debt1_name: 'Store Card',
          debt1_balance: 1800,
          debt1_rate: 29.99,
          debt1_min: 60,
          debt2_name: 'Major Credit Card',
          debt2_balance: 7500,
          debt2_rate: 22.49,
          debt2_min: 220,
          debt3_name: 'Consolidated Loan',
          debt3_balance: 12700,
          debt3_rate: 9.99,
          debt3_min: 310
        }
      },
      {
        label: 'Aggressive Debt Elimination ($10k)',
        values: {
          extra_payment: 500,
          strategy: 'snowball',
          debt1_name: 'Medical Note',
          debt1_balance: 1200,
          debt1_rate: 0.0,
          debt1_min: 50,
          debt2_name: 'Credit Card',
          debt2_balance: 3800,
          debt2_rate: 21.99,
          debt2_min: 110,
          debt3_name: 'Student Line',
          debt3_balance: 5000,
          debt3_rate: 7.25,
          debt3_min: 140
        }
      }
    ],
    name: 'Debt Payoff & Snowball Calculator',
    description: 'Model Debt Snowball and Debt Avalanche repayment schedules, quantify interest savings, and project your exact debt-free horizon.',
    metaTitle: 'Debt Payoff Calculator — Snowball vs. Avalanche Strategies | GetCalcu',
    metaDescription: 'Free debt payoff calculator. Compare Debt Snowball vs. Debt Avalanche strategies, determine optimal repayment order, and calculate total interest saved.',
    category: 'Finance',
    icon: 'fa-snowflake',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    fields: [
      { id: 'extra_payment', label: 'Additional Monthly Contribution ($)', type: 'number', default: 200, min: 0, step: 25, hint: 'Extra cash allocated toward principal reduction each month beyond required minimums.' },
      { id: 'strategy', label: 'Repayment Strategy', type: 'select', default: 'snowball', options: [
        { value: 'snowball', label: 'Debt Snowball (Lowest Balance First — Behavioral Momentum)' },
        { value: 'avalanche', label: 'Debt Avalanche (Highest APR First — Mathematical Optimization)' }
      ], hint: 'Choose between behavioral momentum (Snowball) or maximum financing interest savings (Avalanche).' },
      { id: 'debt1_name', label: 'Debt 1 Account Name', type: 'text', default: 'Credit Card', hint: 'Creditor or loan designation.' },
      { id: 'debt1_balance', label: 'Debt 1 Balance ($)', type: 'number', default: 2500, min: 0, step: 50, hint: 'Current unpaid principal balance.' },
      { id: 'debt1_rate', label: 'Debt 1 Interest Rate (APR %)', type: 'number', default: 24.99, min: 0, max: 99, step: 0.1, hint: 'Annual percentage rate assessed on revolving balances.' },
      { id: 'debt1_min', label: 'Debt 1 Minimum Monthly Payment ($)', type: 'number', default: 75, min: 1, step: 5, hint: 'Required scheduled minimum installment.' },

      { id: 'debt2_name', label: 'Debt 2 Account Name', type: 'text', default: 'Car Loan', hint: 'Creditor or loan designation.' },
      { id: 'debt2_balance', label: 'Debt 2 Balance ($)', type: 'number', default: 8000, min: 0, step: 100, hint: 'Current unpaid principal balance.' },
      { id: 'debt2_rate', label: 'Debt 2 Interest Rate (APR %)', type: 'number', default: 6.5, min: 0, max: 99, step: 0.1, hint: 'Annual percentage rate assessed on revolving balances.' },
      { id: 'debt2_min', label: 'Debt 2 Minimum Monthly Payment ($)', type: 'number', default: 200, min: 1, step: 5, hint: 'Required scheduled minimum installment.' },

      { id: 'debt3_name', label: 'Debt 3 Account Name', type: 'text', default: 'Personal Loan', hint: 'Creditor or loan designation.' },
      { id: 'debt3_balance', label: 'Debt 3 Balance ($)', type: 'number', default: 4500, min: 0, step: 50, hint: 'Current unpaid principal balance.' },
      { id: 'debt3_rate', label: 'Debt 3 Interest Rate (APR %)', type: 'number', default: 12.0, min: 0, max: 99, step: 0.1, hint: 'Annual percentage rate assessed on revolving balances.' },
      { id: 'debt3_min', label: 'Debt 3 Minimum Monthly Payment ($)', type: 'number', default: 125, min: 1, step: 5, hint: 'Required scheduled minimum installment.' }
    ],
    calculate(v) {
      const extra = Math.max(0, safeNum(v.extra_payment, 0));
      const strategy = safeStr(v.strategy) || 'snowball';

      const rawDebts = [
        { id: 1, name: safeStr(v.debt1_name) || 'Debt 1', balance: safeNum(v.debt1_balance, 0), apr: safeNum(v.debt1_rate, 0), min: safeNum(v.debt1_min, 0) },
        { id: 2, name: safeStr(v.debt2_name) || 'Debt 2', balance: safeNum(v.debt2_balance, 0), apr: safeNum(v.debt2_rate, 0), min: safeNum(v.debt2_min, 0) },
        { id: 3, name: safeStr(v.debt3_name) || 'Debt 3', balance: safeNum(v.debt3_balance, 0), apr: safeNum(v.debt3_rate, 0), min: safeNum(v.debt3_min, 0) },
      ].filter(d => d.balance > 0);

      if (rawDebts.length === 0) {
        return errorResult('Please enter at least one debt with an outstanding balance greater than $0.');
      }

      for (const d of rawDebts) {
        if (d.min <= 0) {
          return errorResult(`Please specify a required minimum monthly payment greater than $0 for ${d.name}.`);
        }
        const monthlyInterest = (d.balance * (d.apr / 100)) / 12;
        if (d.min <= monthlyInterest && extra === 0) {
          return errorResult(`The scheduled minimum payment for ${d.name} (${fmt(d.min)}) does not cover monthly accrued interest (${fmt(monthlyInterest)}). Increase the payment or allocate additional funds.`);
        }
      }

      const totalInitialDebt = rawDebts.reduce((sum, d) => sum + d.balance, 0);
      const totalInitialMin = rawDebts.reduce((sum, d) => sum + d.min, 0);

      // 1. Simulate Baseline (Minimum payments only without rollover)
      let baselineDebts = rawDebts.map(d => ({ ...d }));
      let baselineTotalInterest = 0;
      let baselineMonths = 0;
      const MAX_MONTHS = 360;

      while (baselineMonths < MAX_MONTHS && baselineDebts.some(d => d.balance > 0.01)) {
        baselineMonths++;
        for (const d of baselineDebts) {
          if (d.balance <= 0.01) continue;
          const monthlyRate = (d.apr / 100) / 12;
          const interest = d.balance * monthlyRate;
          baselineTotalInterest += interest;
          const pay = Math.min(d.balance + interest, d.min);
          d.balance = Math.max(0, d.balance + interest - pay);
        }
      }

      // 2. Simulate Active Strategy (Snowball or Avalanche with rollover)
      let activeDebts = rawDebts.map(d => ({
        ...d,
        startBalance: d.balance,
        paidOffMonth: null,
        interestPaid: 0
      }));

      if (strategy === 'snowball') {
        activeDebts.sort((a, b) => a.balance - b.balance);
      } else {
        activeDebts.sort((a, b) => b.apr - a.apr);
      }

      let activeMonths = 0;
      let activeTotalInterest = 0;
      const monthlyPayoffBudget = totalInitialMin + extra;

      while (activeMonths < MAX_MONTHS && activeDebts.some(d => d.balance > 0.01)) {
        activeMonths++;
        let availableExtra = extra;

        for (const d of activeDebts) {
          if (d.balance <= 0.01) {
            availableExtra += d.min;
            continue;
          }
          const monthlyRate = (d.apr / 100) / 12;
          const interest = d.balance * monthlyRate;
          d.interestPaid += interest;
          activeTotalInterest += interest;
          d.balance += interest;

          const minPay = Math.min(d.balance, d.min);
          d.balance -= minPay;
          if (d.balance < 0.01 && !d.paidOffMonth) {
            d.paidOffMonth = activeMonths;
            d.balance = 0;
            availableExtra += (d.min - minPay);
          }
        }

        for (const d of activeDebts) {
          if (d.balance <= 0.01) continue;
          const lumpPay = Math.min(d.balance, availableExtra);
          d.balance -= lumpPay;
          availableExtra -= lumpPay;

          if (d.balance < 0.01 && !d.paidOffMonth) {
            d.paidOffMonth = activeMonths;
            d.balance = 0;
          }
          if (availableExtra <= 0.001) break;
        }
      }

      for (const d of activeDebts) {
        if (!d.paidOffMonth) d.paidOffMonth = activeMonths;
      }

      const monthsSaved = Math.max(0, baselineMonths - activeMonths);
      const interestSaved = Math.max(0, roundTo(baselineTotalInterest - activeTotalInterest, 2));
      const firstPaidDebt = activeDebts[0];

      const schedule = activeDebts.map((d, idx) => ({
        month: `Target ${idx + 1}: ${d.name}`,
        payment: roundTo(d.startBalance, 2),
        principal: roundTo(d.interestPaid, 2),
        interest: `${d.apr}%`,
        balance: `Month ${d.paidOffMonth}`
      }));

      const yearsSaved = (monthsSaved / 12).toFixed(1);
      const activeYears = (activeMonths / 12).toFixed(1);

      return {
        stats: [
          { label: 'Time Until Debt-Free', value: `${activeMonths} Months (${activeYears} yrs)`, highlight: true },
          { label: 'Total Interest Saved', value: fmt(interestSaved), highlight: true },
          { label: 'Months Cut Off Debt', value: `${monthsSaved} Months (${yearsSaved} yrs)` },
          { label: 'First Debt to Knock Out', value: `${firstPaidDebt.name} (Month ${firstPaidDebt.paidOffMonth})`, highlight: true },
          { label: 'Total Monthly Debt Budget', value: fmt(monthlyPayoffBudget) },
          { label: 'Total Debt Balance Paid', value: fmt(totalInitialDebt) },
          { label: 'Total Interest Paid', value: fmt(activeTotalInterest) },
          { label: 'Payoff Strategy Chosen', value: strategy === 'snowball' ? 'Snowball (Lowest Balance First)' : 'Avalanche (Highest APR First)' }
        ],
        chart: {
          principal: totalInitialDebt,
          totalInterest: activeTotalInterest
        },
        table: schedule,
        insight: {
          tone: 'positive',
          icon: 'fa-award',
          headline: `Debt-free status projected in ${activeMonths} months with ${fmt(interestSaved)} in interest savings.`,
          detail: `By rolling satisfied installments forward into subsequent obligations, you eliminate ${fmt(totalInitialDebt)} in principal and avoid ${fmt(interestSaved)} in financing charges. Focus accelerated contributions on ${firstPaidDebt.name} to establish initial payoff momentum.`
        }
      };
    },
    article: {
      heading: 'Accelerated Debt Repayment: Snowball vs. Avalanche Frameworks',
      intro: 'Consumer debt reduction requires balancing mathematical optimization against psychological persistence. Choosing between the Debt Snowball and Debt Avalanche methods dictates your total interest expenditure and repayment velocity.',
      sections: [
        {
          heading: 'The Debt Snowball: Behavioral Momentum',
          body: 'The Debt Snowball methodology ranks obligations in ascending order of outstanding principal balance. By maintaining minimum payments across all accounts and channeling surplus capital toward the smallest balance, borrowers experience rapid behavioral milestones. Empirical research from Northwestern University and Harvard Business School confirms that early account elimination increases sustained adherence to multi-year debt elimination plans.'
        },
        {
          heading: 'The Debt Avalanche: Mathematical Optimization',
          body: 'The Debt Avalanche methodology prioritizes obligations strictly by annual percentage rate (APR). Capital is concentrated against the highest-rate liabilities (such as revolving credit lines carrying 20% to 29% APR) prior to lower-rate installment loans. This approach mathematically minimizes aggregate interest accrual over the lifetime of the portfolio.'
        },
        {
          heading: 'Strategic Decision Framework',
          body: 'Borrowers experiencing fatigue or requiring immediate positive feedback benefit most from the Snowball framework. Conversely, analytical borrowers seeking minimal lifetime financing costs should implement the Avalanche framework.'
        }
      ]
    },
    howTo: [
      'Enter the supplemental monthly cash available for accelerated debt reduction.',
      'Select your preferred methodology (Debt Snowball or Debt Avalanche).',
      'Input outstanding balances, annual percentage rates (APR), and required minimum payments for each liability.',
      'Review your consolidated payoff timeline, repayment sequencing, and aggregate interest savings.'
    ],
    examples: [
      {
        title: '$15,000 Multi-Account Portfolio ($200 Supplemental)',
        input: '$2,500 credit card (24.99%), $4,500 personal note (12%), $8,000 vehicle loan (6.5%), +$200/mo',
        result: 'Full payoff achieved in 28 months; eliminates $2,400+ in financing charges'
      }
    ],
    formula: 'M_{interest} = B \times \left(\frac{APR}{12}\right); \quad C_{target} = C_{extra} + \sum M_{retired}',
    faqs: [
      {
        q: 'Which repayment methodology minimizes total interest cost?',
        a: 'The Debt Avalanche methodology strictly minimizes total financing costs by targeting the highest annual percentage rate (APR) first, preventing expensive revolving compound charges.'
      },
      {
        q: 'How does payment rollover accelerate amortization?',
        a: 'When an account is satisfied, its minimum required payment is not absorbed into discretionary spending. Instead, the full cash flow is redirected toward the subsequent target balance, creating an expanding repayment allocation over time.'
      },
      {
        q: 'Should an emergency reserve be established prior to accelerated debt reduction?',
        a: 'Yes. Maintaining a liquid starter emergency reserve ($1,000 to $2,000) prevents unexpected operating expenses from forcing renewed reliance on high-interest revolving credit during debt payoff.'
      }
    ]
  },

  'refinance-calculator': {
    presets: [
      {
        label: 'Rate Reduction (1.50% Drop)',
        values: {
          current_balance: 320000,
          current_rate: 6.75,
          current_years_remaining: 26,
          new_rate: 5.25,
          new_term_years: 30,
          closing_costs: 4500,
          years_in_home: 7
        }
      },
      {
        label: 'Term Reduction (30-Yr to 15-Yr)',
        values: {
          current_balance: 275000,
          current_rate: 6.50,
          current_years_remaining: 24,
          new_rate: 4.85,
          new_term_years: 15,
          closing_costs: 3800,
          years_in_home: 10
        }
      },
      {
        label: 'Short-Horizon Evaluation (3 Years Stay)',
        values: {
          current_balance: 400000,
          current_rate: 7.125,
          current_years_remaining: 28,
          new_rate: 6.25,
          new_term_years: 30,
          closing_costs: 5500,
          years_in_home: 3
        }
      }
    ],
    name: 'Mortgage Refinance Break-Even Calculator',
    description: 'Evaluate mortgage refinancing viability by calculating payment reductions, upfront closing cost break-even horizons, and net cash savings.',
    metaTitle: 'Mortgage Refinance Calculator — Break-Even Horizon & Net Savings | GetCalcu',
    metaDescription: 'Free mortgage refinance calculator. Calculate monthly payment reduction, exact break-even timeline in months, and cumulative net savings after closing costs.',
    category: 'Finance',
    icon: 'fa-house-chimney-window',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    fields: [
      { id: 'current_balance', label: 'Current Mortgage Balance ($)', type: 'number', default: 320000, min: 1000, step: 5000, hint: 'The remaining unpaid principal balance on your existing mortgage note.' },
      { id: 'current_rate', label: 'Current Interest Rate (%)', type: 'number', default: 6.75, min: 0.1, max: 20, step: 0.125, hint: 'The annual note rate currently charged on your existing mortgage.' },
      { id: 'current_years_remaining', label: 'Remaining Amortization Term (Years)', type: 'number', default: 26, min: 1, max: 40, step: 1, hint: 'Number of remaining years until your existing mortgage is fully retired.' },
      { id: 'new_rate', label: 'Proposed Interest Rate (%)', type: 'number', default: 5.25, min: 0.1, max: 20, step: 0.125, hint: 'The lower interest rate offered by the refinancing lender.' },
      { id: 'new_term_years', label: 'New Loan Term (Years)', type: 'number', default: 30, min: 5, max: 40, step: 5, hint: 'Standard amortization term for the replacement loan (e.g. 15, 20, or 30 years).' },
      { id: 'closing_costs', label: 'Estimated Refinance Closing Costs ($)', type: 'number', default: 4500, min: 0, step: 250, hint: 'Total origination, appraisal, title, escrow, and recording fees required at settlement.' },
      { id: 'years_in_home', label: 'Anticipated Occupancy Horizon (Years)', type: 'number', default: 7, min: 1, max: 40, step: 1, hint: 'Expected duration you plan to retain and occupy the mortgaged property.' }
    ],
    calculate(v) {
      const balance = safeNum(v.current_balance, 0);
      const currentRate = safeNum(v.current_rate, 0);
      const currentYears = safeNum(v.current_years_remaining, 0);
      const newRate = safeNum(v.new_rate, 0);
      const newTermYears = safeNum(v.new_term_years, 0);
      const closingCosts = Math.max(0, safeNum(v.closing_costs, 0));
      const yearsInHome = Math.max(1, safeNum(v.years_in_home, 5));

      if (balance <= 0) return errorResult('Please specify an outstanding principal balance greater than $0.');
      if (currentYears <= 0) return errorResult('Please enter remaining years on your current loan term.');
      if (newTermYears <= 0) return errorResult('Please select a valid term for the proposed loan.');

      const calcMonthlyPI = (P, annualRate, years) => {
        const r = (annualRate / 100) / 12;
        const n = years * 12;
        if (r <= 0) return P / n;
        return (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      };

      const currentPI = calcMonthlyPI(balance, currentRate, currentYears);
      const newPI = calcMonthlyPI(balance, newRate, newTermYears);
      const monthlySavings = currentPI - newPI;

      const totalMonthsInHome = yearsInHome * 12;
      const breakEvenMonths = monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : null;
      const netSavingsInHome = monthlySavings > 0
        ? roundTo((monthlySavings * totalMonthsInHome) - closingCosts, 2)
        : roundTo(-closingCosts, 2);

      const oldRemainingTotalPayments = currentPI * (currentYears * 12);
      const oldRemainingInterest = Math.max(0, oldRemainingTotalPayments - balance);

      const newTotalPayments = newPI * (newTermYears * 12);
      const newTotalInterest = Math.max(0, newTotalPayments - balance);
      const lifetimeInterestDiff = roundTo(oldRemainingInterest - (newTotalInterest + closingCosts), 2);

      const isWorthIt = monthlySavings > 0 && breakEvenMonths !== null && breakEvenMonths <= totalMonthsInHome;

      const schedule = [];
      const yearsToProject = Math.min(yearsInHome + 3, 15);
      for (let y = 1; y <= yearsToProject; y++) {
        const months = y * 12;
        const cumulativeGrossSavings = roundTo(monthlySavings * months, 2);
        const netPosition = roundTo(cumulativeGrossSavings - closingCosts, 2);
        schedule.push({
          month: `Year ${y} (${months} mo)`,
          payment: roundTo(currentPI * months, 2),
          principal: roundTo(newPI * months, 2),
          interest: fmt(cumulativeGrossSavings),
          balance: fmt(netPosition)
        });
      }

      let insightHeadline = '';
      let insightDetail = '';
      let insightTone = 'positive';

      if (monthlySavings <= 0) {
        insightTone = 'warning';
        insightHeadline = 'Proposed terms result in higher monthly financing obligations.';
        insightDetail = `With a note rate of ${newRate}% over ${newTermYears} years, your required principal and interest payment increases by ${fmt(Math.abs(monthlySavings))}/month relative to your current schedule.`;
      } else if (!isWorthIt) {
        insightTone = 'warning';
        insightHeadline = `Unfavorable horizon: Occupancy of ${yearsInHome} years precedes full fee recovery.`;
        insightDetail = `While monthly payments decrease by ${fmt(monthlySavings)}, recouping ${fmt(closingCosts)} in settlement fees requires ${breakEvenMonths} months. Vacating in ${totalMonthsInHome} months incurs a net loss of ${fmt(Math.abs(netSavingsInHome))}.`;
      } else {
        insightHeadline = `Refinancing is financially advantageous: Break-even attained in ${breakEvenMonths} months.`;
        insightDetail = `Monthly payment decreases by ${fmt(monthlySavings)}. Over your ${yearsInHome}-year occupancy horizon, you recover ${fmt(closingCosts)} in closing fees and generate ${fmt(netSavingsInHome)} in net cumulative cash savings.`;
      }

      return {
        stats: [
          { label: 'Monthly Payment Savings', value: monthlySavings > 0 ? `+${fmt(monthlySavings)} / mo` : `-${fmt(Math.abs(monthlySavings))} / mo`, highlight: true },
          { label: 'Break-Even Point', value: breakEvenMonths ? `${breakEvenMonths} Months (${(breakEvenMonths / 12).toFixed(1)} yrs)` : 'Never', highlight: true },
          { label: `Net Profit Over ${yearsInHome} Years`, value: fmt(netSavingsInHome), highlight: true },
          { label: 'Refinance Verdict', value: isWorthIt ? 'YES — Worth Refinancing' : 'NO — Costs Outweigh Savings' },
          { label: 'Current Monthly Payment (P&I)', value: fmt(roundTo(currentPI, 2)) },
          { label: 'New Monthly Payment (P&I)', value: fmt(roundTo(newPI, 2)) },
          { label: 'Upfront Closing Costs', value: fmt(closingCosts) },
          { label: 'Total Lifetime Interest Saved', value: fmt(lifetimeInterestDiff) }
        ],
        chart: {
          principal: balance,
          totalInterest: newTotalInterest
        },
        table: schedule,
        insight: {
          tone: insightTone,
          icon: isWorthIt ? 'fa-circle-check' : 'fa-triangle-exclamation',
          headline: insightHeadline,
          detail: insightDetail
        }
      };
    },
    article: {
      heading: 'Mortgage Refinance Break-Even Analysis & Capital Recovery',
      intro: 'Refinancing replaces an existing residential lien with a new debt instrument under modified rate and term covenants. Evaluating transaction viability requires quantifying the break-even horizon against projected homeownership tenure.',
      sections: [
        {
          heading: 'Quantifying the Break-Even Horizon',
          body: 'The break-even point defines the exact operational duration required for cumulative monthly payment reductions to offset non-refundable closing expenditures. For example, incurring $4,500 in settlement fees to achieve a $300 monthly savings generates a 15-month break-even horizon. Relocating prior to month 15 produces a negative net present value.'
        },
        {
          heading: 'Amortization Horizon Reset Considerations',
          body: 'Refinancing a seasoned 30-year note into a new 30-year instrument resets the amortization curve, extending total financing duration and back-loading principal retirement. Borrowers should consider 15-year or 20-year term options to avoid increasing lifetime financing obligations.'
        },
        {
          heading: 'Evaluating Zero-Closing-Cost Loan Structures',
          body: 'Zero-closing-cost transactions do not eliminate lender overhead. Transaction costs are either absorbed via a higher note coupon (lender credit) or capitalized into the principal balance, increasing long-term carrying costs.'
        }
      ]
    },
    howTo: [
      'Enter current principal balance and existing note coupon rate.',
      'Specify remaining amortization duration on current obligation.',
      'Input proposed replacement note rate and loan term.',
      'Specify total closing fees and anticipated occupancy horizon in years.',
      'Evaluate monthly payment reduction, break-even timeline, and projected net savings.'
    ],
    examples: [
      {
        title: '$320,000 Note Rate Reduction (6.75% to 5.25%)',
        input: '$320,000 balance, 26 yrs remaining, 5.25% 30-yr new rate, $4,500 closing fees, 7 yrs stay',
        result: 'Reduces payment by $312/mo; breaks even at month 15; generates $21,700+ net savings'
      }
    ],
    formula: 'T_{break\\text{-}even} = \\left\\lceil \\frac{\\text{Closing Costs}}{M_{current} - M_{new}} \\right\\rceil',
    faqs: [
      {
        q: 'What rate reduction benchmark typically justifies refinancing?',
        a: 'Generally, a rate reduction of 0.75% to 1.00% offers sufficient debt service reduction to recover transaction costs within 24 to 36 months, provided the homeowner retains the asset past the break-even date.'
      },
      {
        q: 'What fees constitute closing expenditures in a mortgage refinance?',
        a: 'Standard closing expenditures include loan origination fees, appraisal fees, lender title insurance, settlement/attorney fees, recording taxes, and prepaid escrow reserves.'
      },
      {
        q: 'How does refinancing impact credit scoring models?',
        a: 'Lender pre-approval generates a temporary hard credit inquiry (typically 5 to 10 points). Following regular payment seasoning on the new note, credit scoring models rebound rapidly.'
      }
    ]
  },

  'self-employment-tax-calculator': {
    presets: [
      {
        label: 'Solo Professional ($85k)',
        values: {
          gross_income: 85000,
          business_expenses: 12000,
          filing_status: 'single',
          state_tax_rate: 4.5,
          other_w2_income: 0
        }
      },
      {
        label: 'Consultant / Agency ($160k)',
        values: {
          gross_income: 160000,
          business_expenses: 24000,
          filing_status: 'married_joint',
          state_tax_rate: 5.0,
          other_w2_income: 0
        }
      },
      {
        label: 'Side-Hustle ($30k with W-2)',
        values: {
          gross_income: 30000,
          business_expenses: 4500,
          filing_status: 'single',
          state_tax_rate: 4.0,
          other_w2_income: 75000
        }
      }
    ],
    name: '1099 Self-Employment Tax Calculator',
    description: 'Calculate federal self-employment tax (SECA), effective tax brackets, and quarterly estimated IRS 1040-ES payments for independent contractors and sole proprietors.',
    metaTitle: '1099 Tax Calculator — Self-Employment Tax & Estimated Quarterly Payments | GetCalcu',
    metaDescription: 'Free 1099 self-employment tax calculator. Calculate 15.3% SECA tax, progressive federal and state income taxes, Schedule SE deductions, and quarterly 1040-ES payments.',
    category: 'Finance',
    icon: 'fa-receipt',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    fields: [
      { id: 'gross_income', label: 'Annual 1099 Gross Revenue ($)', type: 'number', default: 85000, min: 0, step: 1000, hint: 'Total gross revenue or client receipts prior to business expenses and tax deductions.' },
      { id: 'business_expenses', label: 'Ordinary & Necessary Business Deductions ($)', type: 'number', default: 12000, min: 0, step: 500, hint: 'Allowable Schedule C business write-offs (mileage, software, hardware, professional services).' },
      { id: 'filing_status', label: 'Tax Filing Status', type: 'select', default: 'single', options: [
        { value: 'single', label: 'Single Filer' },
        { value: 'married_joint', label: 'Married Filing Jointly' },
        { value: 'head_household', label: 'Head of Household' }
      ], hint: 'IRS tax filing status determining progressive bracket thresholds and standard deductions.' },
      { id: 'state_tax_rate', label: 'Applicable State Income Tax Rate (%)', type: 'number', default: 4.5, min: 0, max: 15, step: 0.5, hint: 'State income tax rate (0% for states without individual income tax including TX, FL, WA, TN).' },
      { id: 'other_w2_income', label: 'Concurrent W-2 Compensation ($)', type: 'number', default: 0, min: 0, step: 1000, hint: 'W-2 wage earnings subject to mandatory FICA withholding (adjusts Social Security wage cap).' }
    ],
    calculate(v) {
      const gross = Math.max(0, safeNum(v.gross_income, 0));
      const expenses = Math.max(0, safeNum(v.business_expenses, 0));
      const filingStatus = safeStr(v.filing_status) || 'single';
      const stateRate = Math.max(0, safeNum(v.state_tax_rate, 0));
      const w2Income = Math.max(0, safeNum(v.other_w2_income, 0));

      if (gross <= 0 && w2Income <= 0) {
        return errorResult('Please specify gross freelance revenue or employment compensation.');
      }

      // 1. Net Schedule C Business Profit
      const netProfit = Math.max(0, gross - expenses);

      // 2. Schedule SE Net Earnings (IRS 92.35% statutory rule)
      const seEarnings = netProfit * 0.9235;

      // 3. Social Security Tax (12.4% up to 2026 cap of $176,100)
      const SS_CAP_2026 = 176100;
      const ssCapRemaining = Math.max(0, SS_CAP_2026 - w2Income);
      const ssTaxableIncome = Math.min(seEarnings, ssCapRemaining);
      const ssTax = roundTo(ssTaxableIncome * 0.124, 2);

      // 4. Medicare Tax (2.9% uncapped)
      const medicareTax = roundTo(seEarnings * 0.029, 2);

      // 5. Additional Medicare Tax (0.9% above statutory thresholds)
      const addlThreshold = filingStatus === 'married_joint' ? 250000 : 200000;
      const totalCombinedEarned = netProfit + w2Income;
      let addlMedicareTax = 0;
      if (totalCombinedEarned > addlThreshold) {
        const seSubjectToAddl = Math.min(netProfit, totalCombinedEarned - addlThreshold);
        addlMedicareTax = roundTo(seSubjectToAddl * 0.009, 2);
      }

      const totalSETax = roundTo(ssTax + medicareTax + addlMedicareTax, 2);

      // 6. Above-the-line deduction for 50% of self-employment tax
      const seDeduction = roundTo(totalSETax * 0.5, 2);

      // 7. Standard Deductions (IRS 2026 baseline)
      const standardDeductions = {
        single: 15000,
        married_joint: 30000,
        head_household: 22500
      };
      const standardDeduction = standardDeductions[filingStatus] || 15000;

      // 8. Federal Taxable Income
      const adjustedGrossIncome = Math.max(0, (netProfit + w2Income) - seDeduction);
      const federalTaxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

      // 9. Progressive Federal Income Tax Calculation (2026 baseline brackets)
      const calcFederalTax = (taxable, status) => {
        if (taxable <= 0) return 0;
        let brackets;
        if (status === 'married_joint') {
          brackets = [
            { limit: 23850, rate: 0.10 },
            { limit: 96950, rate: 0.12 },
            { limit: 206700, rate: 0.22 },
            { limit: 394600, rate: 0.24 },
            { limit: 501050, rate: 0.32 },
            { limit: 751600, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
          ];
        } else if (status === 'head_household') {
          brackets = [
            { limit: 17000, rate: 0.10 },
            { limit: 64850, rate: 0.12 },
            { limit: 103350, rate: 0.22 },
            { limit: 197300, rate: 0.24 },
            { limit: 250500, rate: 0.32 },
            { limit: 626350, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
          ];
        } else {
          brackets = [
            { limit: 11925, rate: 0.10 },
            { limit: 48475, rate: 0.12 },
            { limit: 103350, rate: 0.22 },
            { limit: 197300, rate: 0.24 },
            { limit: 250525, rate: 0.32 },
            { limit: 626350, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
          ];
        }

        let tax = 0;
        let prev = 0;
        for (const b of brackets) {
          if (taxable > prev) {
            const chunk = Math.min(taxable - prev, b.limit - prev);
            tax += chunk * b.rate;
            prev = b.limit;
          } else {
            break;
          }
        }
        return tax;
      };

      const federalTaxTotal = calcFederalTax(federalTaxableIncome, filingStatus);

      // Attribute tax to 1099 proportion
      const totalEarned = netProfit + w2Income;
      const seShareOfIncome = totalEarned > 0 ? (netProfit / totalEarned) : 1;
      const federalTaxFor1099 = roundTo(federalTaxTotal * seShareOfIncome, 2);

      // 10. State Income Tax
      const stateTax = roundTo(federalTaxableIncome * seShareOfIncome * (stateRate / 100), 2);

      // 11. Grand Total Tax & Allocation Metrics
      const totalAnnualTax = roundTo(totalSETax + federalTaxFor1099 + stateTax, 2);
      const quarterlyPayment = roundTo(totalAnnualTax / 4, 2);
      const recommendedSavePercent = gross > 0 ? roundTo((totalAnnualTax / gross) * 100, 1) : 0;
      const takeHomeCash = roundTo(gross - expenses - totalAnnualTax, 2);

      const schedule = [
        { month: 'Social Security Tax (12.4%)', payment: fmt(ssTaxableIncome), principal: '12.4%', interest: 'SECA', balance: fmt(ssTax) },
        { month: 'Medicare Tax (2.9%)', payment: fmt(seEarnings), principal: '2.9%', interest: 'SECA', balance: fmt(medicareTax) },
        { month: 'Estimated Federal Income Tax', payment: fmt(federalTaxableIncome), principal: 'Progressive', interest: 'IRS 1040', balance: fmt(federalTaxFor1099) },
        { month: `State Income Tax (${stateRate}%)`, payment: fmt(federalTaxableIncome), principal: `${stateRate}%`, interest: 'State DOR', balance: fmt(stateTax) },
        { month: 'Total Estimated Annual Tax', payment: fmt(gross), principal: `${recommendedSavePercent}%`, interest: 'Consolidated', balance: fmt(totalAnnualTax) }
      ];

      return {
        stats: [
          { label: 'Save From Every Check', value: `Save ${recommendedSavePercent}% of Gross`, highlight: true },
          { label: 'Quarterly Estimated Payment', value: fmt(quarterlyPayment), highlight: true },
          { label: 'Total Estimated Annual Tax', value: fmt(totalAnnualTax), highlight: true },
          { label: 'Self-Employment Tax (SECA)', value: fmt(totalSETax) },
          { label: 'Federal Income Tax', value: fmt(federalTaxFor1099) },
          { label: 'State Income Tax', value: fmt(stateTax) },
          { label: 'Net Take-Home Cash in Pocket', value: fmt(takeHomeCash) },
          { label: 'Deductible Business Expenses', value: fmt(expenses) }
        ],
        chart: {
          principal: takeHomeCash,
          totalInterest: totalAnnualTax
        },
        table: schedule,
        insight: {
          tone: 'info',
          icon: 'fa-file-invoice-dollar',
          headline: `Allocate ${recommendedSavePercent}% (${fmt(quarterlyPayment)} quarterly) for tax liability.`,
          detail: `Self-employed professionals remit both employer and employee portions of Social Security and Medicare (15.3% SECA). Reserving ${recommendedSavePercent}% of each invoice into an earmarked liquid account ensures full compliance across IRS quarterly deadlines.`
        }
      };
    },
    article: {
      heading: 'Self-Employment Tax (SECA) & Estimated Tax Compliance',
      intro: 'Unlike W-2 wage earners with automatic payroll withholding, independent contractors and single-member business owners are subject to quarterly estimated tax requirements under Internal Revenue Code Section 1401.',
      sections: [
        {
          heading: 'Structure of the Self-Employment (SECA) Tax',
          body: 'The Self-Employment Contributions Act imposes a 15.3% tax on net self-employment earnings, comprising 12.4% for Old-Age, Survivors, and Disability Insurance (Social Security) up to the statutory wage threshold and 2.9% for Hospital Insurance (Medicare). Net business earnings are adjusted by 92.35% pursuant to Schedule SE prior to tax computation.'
        },
        {
          heading: 'Above-the-Line FICA Deduction',
          body: 'Taxpayers receive an above-the-line adjustment to income equal to 50% of total calculated self-employment tax. This deduction reduces Adjusted Gross Income (AGI) prior to standard or itemized deduction calculations.'
        },
        {
          heading: 'IRS Form 1040-ES Quarterly Deadlines',
          body: 'Taxpayers anticipating tax liabilities exceeding $1,000 must remit estimated quarterly payments across four statutory deadlines: April 15, June 15, September 15, and January 15. Underpayment penalties can be prevented via statutory Safe Harbor provisions (paying 90% of current year tax or 100% of prior year tax, 110% for high earners).'
        }
      ]
    },
    howTo: [
      'Enter projected annual gross 1099 revenue and client billings.',
      'Specify qualified deductible operating expenses to determine Schedule C net profit.',
      'Select applicable IRS tax filing status and individual state income tax rate.',
      'Input concurrent W-2 compensation to calibrate Social Security statutory wage base limits.',
      'Review total tax allocation percentages and exact quarterly installment obligations.'
    ],
    examples: [
      {
        title: 'Independent Consultant ($85,000 Revenue, $12,000 Deductions)',
        input: '$85,000 gross revenue, $12,000 expenses, Single filer, 4.5% state rate',
        result: 'Allocate ~27.8% of invoice revenue; quarterly installments of ~$5,065 to IRS and state'
      }
    ],
    formula: 'T_{SECA} = (R_{gross} - E_{exp}) \times 0.9235 \times 0.153; \quad P_{quarterly} = \frac{T_{total}}{4}',
    faqs: [
      {
        q: 'Why does self-employment tax apply at a 15.3% rate?',
        a: 'W-2 employees share FICA liabilities equally with employers (7.65% each). Self-employed individuals represent both enterprise and employee, requiring remittance of both halves under SECA statutory guidelines.'
      },
      {
        q: 'What criteria govern IRS Safe Harbor underpayment rules?',
        a: 'To avoid underpayment penalties, taxpayers must remit at least 90% of current year liabilities or 100% of prior year tax (110% if prior year Adjusted Gross Income exceeded $150,000).'
      },
      {
        q: 'How do ordinary business expenses decrease tax liabilities?',
        a: 'Self-employment and income taxes apply solely to net profit (gross revenue minus allowable ordinary business expenses). Each legitimate deduction directly reduces the taxable base.'
      }
    ]
  },

  // ── 15-Year vs 30-Year Mortgage Decision Engine ────────────────────────
  '15-year-mortgage-calculator': {
    name: '15-Year vs 30-Year Mortgage Calculator',
    category: 'Finance',
    icon: 'fa-scale-balanced',
    iconClass: 'icon-home',
    tagClass: 'tag-finance',
    description: 'Comprehensive financial comparison of a 15-year vs. 30-year fixed mortgage. Compare monthly cashflow, total interest saved, equity buildup speed, and stock market opportunity cost to make the right home financing decision.',
    metaTitle: '15-Year vs 30-Year Mortgage Calculator | Payment & Opportunity Cost — GetCalcu',
    metaDescription: 'Free 15-Year vs 30-Year Mortgage Calculator. Compare monthly payments, interest savings, and the opportunity cost of investing the difference in index funds.',
    keywords: [
      '15 year mortgage calculator',
      '15 vs 30 year mortgage calculator',
      '15 year fixed mortgage payment',
      'how much interest saved on 15 year mortgage',
      '15 year mortgage payoff schedule',
      '15 vs 30 year mortgage investing the difference'
    ],
    presets: [
      { label: '$400k Home (20% Down, Standard)', values: { home_price: 400000, down_payment: 80000, rate_15: 5.85, rate_30: 6.75, property_tax: 4800, insurance: 1200, investment_return: 7.0, years_staying: 15 } },
      { label: '$300k Starter Home (10% Down)', values: { home_price: 300000, down_payment: 30000, rate_15: 5.75, rate_30: 6.60, property_tax: 3600, insurance: 1000, investment_return: 7.0, years_staying: 15 } },
      { label: '$650k Jumbo (20% Down, 10-Yr Plan)', values: { home_price: 650000, down_payment: 130000, rate_15: 6.00, rate_30: 6.90, property_tax: 7800, insurance: 1800, investment_return: 8.0, years_staying: 10 } }
    ],
    fields: [
      // ── Basic Inputs ──
      { id: 'basic_section', type: 'section', label: 'Basic Loan Inputs', icon: 'fa-sliders' },
      { id: 'home_price', label: 'Home Purchase Price ($)', type: 'number', default: 400000, min: 10000, step: 5000, hint: 'Total agreed purchase price for the property.' },
      { id: 'down_payment', label: 'Down Payment ($)', type: 'number', default: 80000, min: 0, step: 5000, hint: 'Cash paid upfront. 20% down avoids private mortgage insurance (PMI).' },
      { id: 'rate_15', label: '15-Year Interest Rate (%)', type: 'number', default: 5.85, min: 0.1, max: 20, step: 0.05, hint: 'Current interest rate for a 15-year fixed loan (typically 0.5% to 1.0% lower than 30-year).' },
      { id: 'rate_30', label: '30-Year Interest Rate (%)', type: 'number', default: 6.75, min: 0.1, max: 20, step: 0.05, hint: 'Current interest rate for a 30-year fixed loan.' },
      { id: 'property_tax', label: 'Annual Property Tax ($)', type: 'number', default: 4800, min: 0, step: 100, hint: 'Yearly property tax assessed by local government (divided into 12 monthly payments).' },
      { id: 'insurance', label: 'Annual Homeowners Insurance ($)', type: 'number', default: 1200, min: 0, step: 100, hint: 'Yearly hazard insurance premium (divided into 12 monthly payments).' },

      // ── Advanced Options ──
      { id: 'advanced_section', type: 'section', label: 'Advanced Opportunity Cost & Wealth Projections', icon: 'fa-gear', collapsible: true },
      { id: 'investment_return', label: 'Expected Investment Return (%)', type: 'number', default: 7.0, min: 0, max: 15, step: 0.1, hint: 'Expected annual return if you chose the 30-year loan and invested the monthly payment difference in an S&P 500 index fund (historical average: 7-10%).' },
      { id: 'home_appreciation', label: 'Expected Annual Home Appreciation (%)', type: 'number', default: 3.5, min: -2, max: 15, step: 0.1, hint: 'Average yearly increase in property market value.' },
      { id: 'years_staying', label: 'Comparison Timeline (Years)', type: 'select', default: 15, options: [{ value: 5, label: '5 Years' }, { value: 10, label: '10 Years' }, { value: 15, label: '15 Years (Full 15-Yr Payoff)' }, { value: 30, label: '30 Years (Full 30-Yr Payoff)' }], hint: 'How many years you plan to keep this mortgage before moving or paying off.' }
    ],
    calculate(v) {
      const price = safeNum(v.home_price, 400000);
      const down = safeNum(v.down_payment, 80000);
      const loan = price - down;
      if (loan <= 0) return errorResult('Down payment must be less than home purchase price.');

      const r15 = safeNum(v.rate_15, 5.85) / 100 / 12;
      const r30 = safeNum(v.rate_30, 6.75) / 100 / 12;
      const n15 = 15 * 12;
      const n30 = 30 * 12;
      const taxMonthly = safeNum(v.property_tax, 4800) / 12;
      const insMonthly = safeNum(v.insurance, 1200) / 12;
      const escrowMonthly = taxMonthly + insMonthly;

      const pi15 = r15 === 0 ? loan / n15 : loan * (r15 * Math.pow(1 + r15, n15)) / (Math.pow(1 + r15, n15) - 1);
      const pi30 = r30 === 0 ? loan / n30 : loan * (r30 * Math.pow(1 + r30, n30)) / (Math.pow(1 + r30, n30) - 1);

      const totalMonthly15 = roundTo(pi15 + escrowMonthly, 2);
      const totalMonthly30 = roundTo(pi30 + escrowMonthly, 2);
      const monthlyDiff = roundTo(totalMonthly15 - totalMonthly30, 2); // extra cash required for 15-yr

      const totalInterest15 = roundTo(pi15 * n15 - loan, 2);
      const totalInterest30 = roundTo(pi30 * n30 - loan, 2);
      const interestSaved = roundTo(totalInterest30 - totalInterest15, 2);

      // Multi-year comparison & opportunity cost simulation
      const compareYears = safeNum(v.years_staying, 15);
      const rInvestMonthly = (safeNum(v.investment_return, 7.0) / 100) / 12;
      const appreciation = safeNum(v.home_appreciation, 3.5) / 100;

      // Future home value at comparison year
      const futureHomeValue = price * Math.pow(1 + appreciation, compareYears);

      // Calculate remaining balance at compareYears for both loans
      let bal15 = loan;
      let bal30 = loan;
      for (let m = 1; m <= compareYears * 12; m++) {
        if (m <= n15 && bal15 > 0) {
          const int15 = bal15 * r15;
          const prin15 = Math.min(bal15, pi15 - int15);
          bal15 = Math.max(0, bal15 - prin15);
        }
        if (m <= n30 && bal30 > 0) {
          const int30 = bal30 * r30;
          const prin30 = Math.min(bal30, pi30 - int30);
          bal30 = Math.max(0, bal30 - prin30);
        }
      }

      const equity15 = futureHomeValue - bal15;
      const equity30 = futureHomeValue - bal30;

      // If choosing 30-year, invest monthlyDiff into stock market at rInvestMonthly
      let investmentPortfolio30 = 0;
      for (let m = 1; m <= compareYears * 12; m++) {
        investmentPortfolio30 = (investmentPortfolio30 + monthlyDiff) * (1 + rInvestMonthly);
      }
      investmentPortfolio30 = roundTo(investmentPortfolio30, 2);

      const totalWealth15 = roundTo(equity15, 2);
      const totalWealth30 = roundTo(equity30 + investmentPortfolio30, 2);
      const wealthDifference = roundTo(totalWealth30 - totalWealth15, 2);

      const wealthWinner = wealthDifference > 0 ? '30-Year Loan + Investing' : '15-Year Loan';

      return {
        stats: [
          { label: 'Total Interest Saved (15-Yr)', value: fmt(interestSaved), highlight: true },
          { label: '15-Year Monthly Payment', value: fmt(totalMonthly15) },
          { label: '30-Year Monthly Payment', value: fmt(totalMonthly30) },
          { label: 'Monthly Payment Difference', value: '+ ' + fmt(monthlyDiff) + ' / mo', warn: true },
          { label: 'Invested Difference at ' + compareYears + ' Yrs', value: fmt(investmentPortfolio30) },
          { label: 'Net Wealth with 15-Yr Loan', value: fmt(totalWealth15) },
          { label: 'Net Wealth with 30-Yr + Investing', value: fmt(totalWealth30), highlight: wealthDifference > 0 },
          { label: 'Principal Loan Balance', value: fmt(loan) }
        ],
        chart: {
          labels: ['15-Year Mortgage Path', '30-Year + Invest Difference'],
          datasets: [
            { label: 'Home Equity', data: [roundTo(equity15, 2), roundTo(equity30, 2)], backgroundColor: '#6366F1' },
            { label: 'Investment Portfolio', data: [0, investmentPortfolio30], backgroundColor: '#10B981' }
          ]
        },
        insight: {
          title: wealthDifference > 0 ? 'Investing the Difference Wins Wealth' : 'Guaranteed Debt Payoff Wins',
          text: 'The 15-year mortgage saves ' + fmt(interestSaved) + ' in guaranteed interest. However, if you take the 30-year mortgage and invest the ' + fmt(monthlyDiff) + '/month difference at ' + v.investment_return + '% annual return, your investment portfolio could grow to ' + fmt(investmentPortfolio30) + ' in ' + compareYears + ' years — giving you ' + fmt(Math.abs(wealthDifference)) + ' ' + (wealthDifference > 0 ? 'more' : 'less') + ' total net worth.'
        }
      };
    },
    article: {
      heading: '15-Year vs. 30-Year Mortgage: The Comprehensive Decision Guide',
      intro: 'Deciding between a 15-year and 30-year mortgage is not just about monthly payments — it is a foundational strategic choice between guaranteed debt elimination and stock market wealth building.',
      sections: [
        {
          heading: 'Guaranteed Return vs. Market Opportunity Cost',
          content: 'Paying off a 15-year mortgage at 5.85% is equivalent to earning a guaranteed, risk-free 5.85% return on your money. Choosing a 30-year loan and investing the monthly cashflow difference in diversified index funds (averaging 7% to 10% historically) has higher expected long-term wealth, but comes with market volatility.'
        },
        {
          heading: 'Cash Flow Flexibility: The Sleep-at-Night Factor',
          content: 'A 30-year mortgage provides a lower mandatory monthly payment. If you face unexpected job loss or medical expenses, your required commitment is lower. If you have extra cash in good months, you can always prepay principal at your own pace.'
        }
      ]
    },
    howTo: [
      { name: 'Enter Purchase Price & Down Payment', text: 'Input the property purchase price and cash down payment.' },
      { name: 'Review Rates & Investment Return', text: 'Check current 15-year and 30-year interest rates and your expected index fund return in Advanced Options.' },
      { name: 'Compare Wealth & Cash Flow', text: 'Review total interest saved, monthly payment differences, and the multi-year investment opportunity cost.' }
    ],
    faqs: [
      { question: 'Is a 15-year mortgage always better than a 30-year mortgage?', answer: 'No. While a 15-year mortgage saves massive interest, the higher mandatory payment restricts cash flow. If investing the monthly difference in tax-advantaged retirement accounts (401k/IRA), a 30-year mortgage can actually yield a higher overall net worth.' },
      { question: 'Can I pay off a 30-year mortgage in 15 years?', answer: 'Yes! Standard mortgages in the US have no prepayment penalties. You can take a 30-year loan for safety and make extra principal payments each month to retire the loan in 15 years.' }
    ]
  },

  // ── FHA Loan Decision Engine ───────────────────────────────────────────
  'fha-loan-calculator': {
    name: 'FHA Loan Calculator with Upfront & Monthly MIP',
    category: 'Finance',
    icon: 'fa-shield-heart',
    iconClass: 'icon-home',
    tagClass: 'tag-finance',
    description: 'Calculate your complete monthly FHA mortgage payment including 3.5% down payment, 1.75% Upfront MIP, annual monthly mortgage insurance, property taxes, and homeowners insurance.',
    metaTitle: 'FHA Loan Calculator with MIP & 3.5% Down Payment — GetCalcu',
    metaDescription: 'Free FHA Loan Calculator. Calculate exact monthly payments with 3.5% down, 1.75% upfront MIP, monthly mortgage insurance, taxes, and interest with side-by-side conventional comparison.',
    keywords: [
      'fha loan calculator with mip',
      'fha mortgage payment calculator 3.5 down',
      'fha monthly mip calculation',
      'fha loan down payment calculator',
      'fha loan upfront mortgage insurance',
      'fha vs conventional loan calculator'
    ],
    presets: [
      { label: '$300k Home (3.5% Down, Standard FHA)', values: { home_price: 300000, down_payment: 10500, interest_rate: 6.5, loan_term: 30, annual_mip_rate: 0.55, property_tax: 3600, insurance: 1100, conv_rate: 6.85, conv_pmi_rate: 0.85 } },
      { label: '$220k Starter Home (3.5% Down)', values: { home_price: 220000, down_payment: 7700, interest_rate: 6.25, loan_term: 30, annual_mip_rate: 0.55, property_tax: 2600, insurance: 900, conv_rate: 6.60, conv_pmi_rate: 0.85 } },
      { label: '$450k Move-Up (5% Down)', values: { home_price: 450000, down_payment: 22500, interest_rate: 6.75, loan_term: 30, annual_mip_rate: 0.50, property_tax: 5400, insurance: 1400, conv_rate: 7.00, conv_pmi_rate: 0.75 } }
    ],
    fields: [
      // ── Basic Inputs ──
      { id: 'basic_section', type: 'section', label: 'FHA Purchase Details', icon: 'fa-sliders' },
      { id: 'home_price', label: 'Home Purchase Price ($)', type: 'number', default: 300000, min: 10000, step: 5000, hint: 'Total negotiated property purchase price.' },
      { id: 'down_payment', label: 'Down Payment ($)', type: 'number', default: 10500, min: 0, step: 500, hint: 'Minimum FHA down payment is 3.5% ($10,500 on a $300k home) with a 580+ credit score.' },
      { id: 'interest_rate', label: 'Annual FHA Interest Rate (%)', type: 'number', default: 6.5, min: 0.1, max: 20, step: 0.05, hint: 'Your quoted FHA fixed interest rate (FHA rates are often 0.25% lower than conventional).' },
      { id: 'loan_term', label: 'Loan Term (Years)', type: 'select', default: 30, options: [{ value: 30, label: '30 Years' }, { value: 15, label: '15 Years' }], hint: 'Most FHA borrowers select a 30-year fixed loan.' },
      { id: 'property_tax', label: 'Annual Property Tax ($)', type: 'number', default: 3600, min: 0, step: 100, hint: 'Local annual property tax divided into 12 monthly payments.' },
      { id: 'insurance', label: 'Annual Homeowners Insurance ($)', type: 'number', default: 1100, min: 0, step: 100, hint: 'Yearly hazard insurance premium.' },

      // ── Advanced Options & Conventional Comparison ──
      { id: 'advanced_section', type: 'section', label: 'MIP Settings & Conventional 3% Down Comparison', icon: 'fa-gear', collapsible: true },
      { id: 'annual_mip_rate', label: 'FHA Annual MIP Rate (%)', type: 'number', default: 0.55, min: 0.15, max: 1.5, step: 0.05, hint: 'Standard HUD annual MIP is 0.55% for 30-year loans with 3.5% down.' },
      { id: 'conv_rate', label: 'Conventional Loan Interest Rate (%)', type: 'number', default: 6.85, min: 0.1, max: 20, step: 0.05, hint: 'Market interest rate for a conventional loan with 3% down.' },
      { id: 'conv_pmi_rate', label: 'Conventional Annual PMI Rate (%)', type: 'number', default: 0.85, min: 0.2, max: 2.0, step: 0.05, hint: 'Conventional Private Mortgage Insurance rate based on credit score (typically 0.5% to 1.2%).' },
      { id: 'home_appreciation', label: 'Expected Home Appreciation (%)', type: 'number', default: 3.5, min: 0, max: 12, step: 0.1, hint: 'Annual home value growth, used to calculate when conventional PMI drops at 20% equity.' }
    ],
    calculate(v) {
      const price = safeNum(v.home_price, 300000);
      const down = safeNum(v.down_payment, 10500);
      const baseLoan = price - down;
      if (baseLoan <= 0) return errorResult('Down payment must be less than home purchase price.');

      // FHA Upfront MIP is 1.75% of base loan, financed into total loan
      const upfrontMIP = roundTo(baseLoan * 0.0175, 2);
      const totalFinancedLoan = baseLoan + upfrontMIP;

      const rate = safeNum(v.interest_rate, 6.5);
      const r = rate / 100 / 12;
      const n = safeNum(v.loan_term, 30) * 12;

      const piMonthly = r === 0 ? totalFinancedLoan / n : totalFinancedLoan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      
      const mipAnnualRate = safeNum(v.annual_mip_rate, 0.55) / 100;
      const monthlyMIP = roundTo((baseLoan * mipAnnualRate) / 12, 2);
      const monthlyTax = safeNum(v.property_tax, 3600) / 12;
      const monthlyIns = safeNum(v.insurance, 1100) / 12;

      const totalFhaMonthly = roundTo(piMonthly + monthlyMIP + monthlyTax + monthlyIns, 2);

      // Conventional Comparison (3% down, no upfront fee, cancelable PMI at 80% LTV)
      const convRate = safeNum(v.conv_rate, 6.85) / 100 / 12;
      const convPI = convRate === 0 ? baseLoan / n : baseLoan * (convRate * Math.pow(1 + convRate, n)) / (Math.pow(1 + convRate, n) - 1);
      const convMonthlyPMI = roundTo((baseLoan * (safeNum(v.conv_pmi_rate, 0.85) / 100)) / 12, 2);
      const totalConvMonthlyInitial = roundTo(convPI + convMonthlyPMI + monthlyTax + monthlyIns, 2);
      const totalConvMonthlyAfterPMI = roundTo(convPI + monthlyTax + monthlyIns, 2);

      // Estimate month conventional PMI cancels based on 3.5% appreciation + principal reduction
      const appreciationMonthly = Math.pow(1 + (safeNum(v.home_appreciation, 3.5) / 100), 1/12) - 1;
      let convBal = baseLoan;
      let currHomeVal = price;
      let pmiDropMonth = n;
      for (let m = 1; m <= n; m++) {
        const intP = convBal * convRate;
        const prinP = Math.min(convBal, convPI - intP);
        convBal -= prinP;
        currHomeVal *= (1 + appreciationMonthly);
        if (convBal / currHomeVal <= 0.80 && pmiDropMonth === n) {
          pmiDropMonth = m;
          break;
        }
      }
      const pmiDropYears = roundTo(pmiDropMonth / 12, 1);

      // 5-Year Cost Comparison
      const fha5YrCost = roundTo((totalFhaMonthly * 60) + down, 2);
      const conv5YrCost = roundTo((totalConvMonthlyInitial * Math.min(60, pmiDropMonth)) + (totalConvMonthlyAfterPMI * Math.max(0, 60 - pmiDropMonth)) + down, 2);

      return {
        stats: [
          { label: 'Total Monthly FHA Payment', value: fmt(totalFhaMonthly), highlight: true },
          { label: 'Principal & Interest', value: fmt(piMonthly) },
          { label: 'Monthly Mortgage Insurance (MIP)', value: fmt(monthlyMIP), warn: true },
          { label: 'Upfront MIP Financed (1.75%)', value: fmt(upfrontMIP) },
          { label: 'Total Financed Loan Amount', value: fmt(totalFinancedLoan) },
          { label: 'Initial Conventional Payment', value: fmt(totalConvMonthlyInitial) },
          { label: 'Conventional PMI Drop Horizon', value: '~' + pmiDropYears + ' Years (' + pmiDropMonth + ' mo)' },
          { label: 'Conventional Payment After PMI', value: fmt(totalConvMonthlyAfterPMI), highlight: true }
        ],
        chart: {
          labels: ['FHA Monthly Payment', 'Conventional (Initial)', 'Conventional (After PMI Drops)'],
          datasets: [{
            label: 'Monthly Housing Payment ($)',
            data: [totalFhaMonthly, totalConvMonthlyInitial, totalConvMonthlyAfterPMI],
            backgroundColor: ['#6366F1', '#EC4899', '#10B981']
          }]
        },
        insight: {
          title: totalFhaMonthly < totalConvMonthlyInitial ? 'FHA Has Lower Initial Payment' : 'Conventional Saves Long-Term',
          text: 'FHA starts at ' + fmt(totalFhaMonthly) + '/month, compared to ' + fmt(totalConvMonthlyInitial) + ' for a conventional loan. However, conventional PMI cancels after ~' + pmiDropYears + ' years, dropping your payment to ' + fmt(totalConvMonthlyAfterPMI) + ', whereas FHA monthly MIP stays for the entire 30 years.'
        }
      };
    },
    article: {
      heading: 'FHA vs. Conventional Mortgage: Complete 2026 Comparison',
      intro: 'FHA loans backed by the Federal Housing Administration allow borrowers with credit scores as low as 580 to purchase a home with only 3.5% down, but come with unique insurance rules.',
      sections: [
        {
          heading: 'The True Cost of FHA Mortgage Insurance (MIP)',
          content: 'FHA loans carry two mandatory fees: a 1.75% upfront fee financed directly into your loan balance, plus an annual 0.55% monthly premium. On a $300,000 purchase, upfront MIP adds $5,066 to your balance and $133/month to your payment.'
        },
        {
          heading: 'When to Choose Conventional Over FHA',
          content: 'If your credit score is 700 or higher, a Conventional 97 (3% down) loan often wins because conventional PMI cancels automatically once your equity hits 20%, saving thousands in your 30s and 40s.'
        }
      ]
    },
    howTo: [
      { name: 'Enter Home Price & Down Payment', text: 'Input your target purchase price and cash down payment.' },
      { name: 'Review Financed MIP & Monthly Insurance', text: 'The calculator automatically computes the 1.75% upfront fee and 0.55% annual MIP.' },
      { name: 'Compare FHA vs Conventional Drop Date', text: 'See how many years it takes for conventional PMI to cancel vs keeping FHA MIP.' }
    ],
    faqs: [
      { question: 'Why does FHA monthly MIP not cancel at 20% equity?', answer: 'Under HUD regulations for loans with less than 10% down, FHA MIP remains for the entire 30-year term. To remove it, homeowners must refinance into a conventional mortgage once they build 20% equity.' },
      { question: 'What credit score do I need for 3.5% down?', answer: 'A minimum FICO score of 580 qualifies for 3.5% down. Scores between 500 and 579 require a 10% down payment.' }
    ]
  },

  // ── Auto Refinance Decision Engine ─────────────────────────────────────
  'auto-refinance-calculator': {
    name: 'Auto Loan Refinance Calculator',
    category: 'Finance',
    icon: 'fa-car-side',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate how much you can save each month and over the life of your car loan by refinancing to a lower interest rate or shorter loan term, with break-even analysis.',
    metaTitle: 'Auto Loan Refinance Calculator | Monthly & Lifetime Savings — GetCalcu',
    metaDescription: 'Free Auto Loan Refinance Calculator. See exact monthly payment savings, total lifetime interest saved, and transfer fee break-even timeline.',
    keywords: [
      'auto loan refinance calculator',
      'car loan refinance savings calculator',
      'should i refinance my car calculator',
      'lower car payment refinance calculator',
      'auto refinancing break even'
    ],
    presets: [
      { label: 'Drop Rate by 4% ($25k Balance, 48 Mo Left)', values: { current_balance: 25000, current_rate: 9.5, months_remaining: 48, new_rate: 5.5, new_term_months: 48, refi_fees: 100, vehicle_val: 27000 } },
      { label: 'Lower Monthly Payment ($18k Balance, 36 to 48 Mo)', values: { current_balance: 18000, current_rate: 8.0, months_remaining: 36, new_rate: 5.9, new_term_months: 48, refi_fees: 100, vehicle_val: 20000 } },
      { label: 'Shorten Term & Save Big ($30k Balance, 60 to 36 Mo)', values: { current_balance: 30000, current_rate: 10.0, months_remaining: 60, new_rate: 5.0, new_term_months: 36, refi_fees: 150, vehicle_val: 32000 } }
    ],
    fields: [
      // ── Basic Inputs ──
      { id: 'basic_section', type: 'section', label: 'Current & New Loan Details', icon: 'fa-sliders' },
      { id: 'current_balance', label: 'Remaining Car Loan Balance ($)', type: 'number', default: 25000, min: 1000, step: 500, hint: 'The exact payoff balance on your current auto loan.' },
      { id: 'current_rate', label: 'Current Interest Rate (%)', type: 'number', default: 9.5, min: 0.1, max: 35, step: 0.1, hint: 'The annual interest rate (APR) you are currently paying.' },
      { id: 'months_remaining', label: 'Months Left on Current Loan', type: 'number', default: 48, min: 6, max: 96, step: 1, hint: 'How many monthly payments remain on your current note.' },
      { id: 'new_rate', label: 'New Quoted Interest Rate (%)', type: 'number', default: 5.5, min: 0.1, max: 35, step: 0.1, hint: 'The lower interest rate offered by the new lender or credit union.' },
      { id: 'new_term_months', label: 'New Loan Term (Months)', type: 'select', default: 48, options: [24, 36, 48, 60, 72].map(m => ({ value: m, label: m + ' months (' + (m/12) + ' yrs)' })), hint: 'The length of the new refinance loan.' },

      // ── Advanced Options ──
      { id: 'advanced_section', type: 'section', label: 'Refinance Fees & Vehicle Equity Check', icon: 'fa-gear', collapsible: true },
      { id: 'refi_fees', label: 'Refinance & Title Transfer Fees ($)', type: 'number', default: 100, min: 0, step: 25, hint: 'State title transfer and lender documentation fees (typically $50 to $150).' },
      { id: 'vehicle_val', label: 'Estimated Vehicle Market Value ($)', type: 'number', default: 27000, min: 1000, step: 500, hint: 'Used to check your Loan-to-Value (LTV) ratio. Most lenders require LTV under 125%.' }
    ],
    calculate(v) {
      const balance = safeNum(v.current_balance, 25000);
      if (balance <= 0) return errorResult('Loan balance must be greater than $0.');

      const rOld = safeNum(v.current_rate, 9.5) / 100 / 12;
      const nOld = safeNum(v.months_remaining, 48);
      const oldPayment = rOld === 0 ? balance / nOld : balance * (rOld * Math.pow(1 + rOld, nOld)) / (Math.pow(1 + rOld, nOld) - 1);
      const totalOldInterest = roundTo(oldPayment * nOld - balance, 2);

      const rNew = safeNum(v.new_rate, 5.5) / 100 / 12;
      const nNew = safeNum(v.new_term_months, 48);
      const refiFees = safeNum(v.refi_fees, 100);
      const newPrincipal = balance + refiFees;

      const newPayment = rNew === 0 ? newPrincipal / nNew : newPrincipal * (rNew * Math.pow(1 + rNew, nNew)) / (Math.pow(1 + rNew, nNew) - 1);
      const totalNewInterest = roundTo(newPayment * nNew - newPrincipal, 2);

      const monthlySavings = roundTo(oldPayment - newPayment, 2);
      const lifetimeInterestSavings = roundTo(totalOldInterest - totalNewInterest - refiFees, 2);

      // Break-even months: fee / monthlySavings
      const breakEvenMonths = monthlySavings > 0 ? Math.max(1, Math.ceil(refiFees / monthlySavings)) : null;

      // LTV ratio
      const vehVal = safeNum(v.vehicle_val, balance * 1.1);
      const ltvPct = roundTo((balance / vehVal) * 100, 1);

      return {
        stats: [
          { label: 'Monthly Payment Savings', value: (monthlySavings >= 0 ? '+ ' : '- ') + fmt(Math.abs(monthlySavings)) + ' / mo', highlight: monthlySavings > 0 },
          { label: 'Net Lifetime Savings', value: fmt(lifetimeInterestSavings), highlight: lifetimeInterestSavings > 0 },
          { label: 'Break-Even Horizon', value: breakEvenMonths ? breakEvenMonths + ' Months' : 'N/A' },
          { label: 'New Monthly Payment', value: fmt(newPayment) },
          { label: 'Current Monthly Payment', value: fmt(oldPayment) },
          { label: 'Loan-to-Value (LTV)', value: ltvPct + '% ' + (ltvPct <= 100 ? '(Positive Equity)' : '(Underwater)') },
          { label: 'Total Current Remaining Cost', value: fmt(balance + totalOldInterest) },
          { label: 'Total Refinanced Cost', value: fmt(newPrincipal + totalNewInterest) }
        ],
        chart: {
          labels: ['Current Auto Loan', 'Refinanced Auto Loan'],
          datasets: [
            { label: 'Loan Principal', data: [balance, newPrincipal], backgroundColor: '#6366F1' },
            { label: 'Total Interest Paid', data: [totalOldInterest, totalNewInterest], backgroundColor: '#F59E0B' }
          ]
        },
        insight: {
          title: lifetimeInterestSavings > 0 ? 'Refinance Strongly Recommended' : 'Check Loan Length',
          text: lifetimeInterestSavings > 0
            ? 'Refinancing reduces your payment by ' + fmt(monthlySavings) + '/mo, covers your ' + fmt(refiFees) + ' fees in ' + (breakEvenMonths || 1) + ' months, and saves a net ' + fmt(lifetimeInterestSavings) + ' overall.'
            : 'Extending your loan term lowers monthly payments, but increases total finance charges by ' + fmt(Math.abs(lifetimeInterestSavings)) + '.'
        }
      };
    },
    article: {
      heading: 'How to Refinance a Car Loan: Timing & Break-Even Rules',
      intro: 'Refinancing replaces your existing auto loan with a lower interest rate from a credit union or bank, immediately lowering monthly payments.',
      sections: [
        {
          heading: 'When Does Car Loan Refinancing Make Sense?',
          content: 'Refinancing makes the most sense if your credit score has increased by 30+ points since buying the car, or if dealer financing initially locked you into a high APR (8% to 15%).'
        },
        {
          heading: 'Understanding Loan-to-Value (LTV) Requirements',
          content: 'Lenders check your vehicle value against your payoff amount. If your car is worth $25,000 and you owe $20,000, your LTV is 80%, qualifying you for prime rates.'
        }
      ]
    },
    howTo: [
      { name: 'Check 10-Day Payoff Balance', text: 'Obtain your exact payoff balance and current APR from your current lender.' },
      { name: 'Input New Interest Rate & Term', text: 'Enter quoted rates from a credit union or online lender.' },
      { name: 'Verify Break-Even Horizon', text: 'Confirm that monthly payment savings exceed transfer fees in under 6 months.' }
    ],
    faqs: [
      { question: 'How much does it cost to refinance a car loan?', answer: 'Auto refinancing fees are very low — typically just $50 to $150 for state title re-registration and lien transfer.' },
      { question: 'Can I refinance a car with negative equity?', answer: 'Some lenders allow refinancing up to 125% LTV, but you will get the best interest rates if your vehicle value exceeds the loan balance.' }
    ]
  },

  // ── Freelance & Consultant Pricing Decision Engine ────────────────────
  'freelance-hourly-rate-calculator': {
    name: 'Freelance & Consultant Hourly Rate Calculator',
    category: 'Business',
    icon: 'fa-laptop-code',
    iconClass: 'icon-business',
    tagClass: 'tag-business',
    description: 'Calculate the exact hourly, daily, and project billing rates you must charge clients to achieve your target take-home salary after accounting for 1099 taxes, health insurance, retirement, and business expenses.',
    metaTitle: 'Freelance Hourly Rate Calculator | Convert Salary to 1099 Rate — GetCalcu',
    metaDescription: 'Free Freelance Hourly Rate Calculator. Convert your desired annual salary into accurate client billing rates accounting for 1099 taxes, health insurance, retirement, and time off.',
    keywords: [
      'freelance hourly rate calculator',
      'how to calculate freelance hourly rate from salary',
      'consulting rate calculator taxes expenses',
      'billable hours rate calculator',
      '1099 freelance pricing formula',
      'convert salary to hourly contractor rate'
    ],
    presets: [
      { label: '$100k Target Salary (25 Billable Hrs/Wk)', values: { target_take_home: 100000, annual_expenses: 12000, billable_hours_per_week: 25, weeks_off: 4, fed_tax_rate: 22, state_tax_rate: 5, health_insurance_monthly: 450, retirement_annual: 10000, uncollectible_buffer: 5 } },
      { label: '$70k Starter Freelancer (20 Billable Hrs/Wk)', values: { target_take_home: 70000, annual_expenses: 6000, billable_hours_per_week: 20, weeks_off: 3, fed_tax_rate: 18, state_tax_rate: 4, health_insurance_monthly: 350, retirement_annual: 5000, uncollectible_buffer: 5 } },
      { label: '$160k Senior Consultant (30 Billable Hrs/Wk)', values: { target_take_home: 160000, annual_expenses: 24000, billable_hours_per_week: 30, weeks_off: 5, fed_tax_rate: 24, state_tax_rate: 6, health_insurance_monthly: 600, retirement_annual: 20000, uncollectible_buffer: 5 } }
    ],
    fields: [
      // ── Basic Inputs ──
      { id: 'basic_section', type: 'section', label: 'Salary & Capacity Targets', icon: 'fa-sliders' },
      { id: 'target_take_home', label: 'Desired Net Take-Home Salary ($)', type: 'number', default: 100000, min: 10000, step: 5000, hint: 'The actual annual money you want in your personal checking account for living expenses.' },
      { id: 'billable_hours_per_week', label: 'Billable Client Hours Per Week', type: 'number', default: 25, min: 5, max: 50, step: 1, hint: 'Realistic client work hours (typically 20-28 hrs/wk, as admin, sales, and proposals take the rest).' },
      { id: 'weeks_off', label: 'Vacation, Sick & Holiday Weeks Off', type: 'number', default: 4, min: 0, max: 20, step: 1, hint: 'Freelancers do not get paid time off. Budget 4 to 6 weeks for vacations and sick days.' },
      { id: 'annual_expenses', label: 'Annual Business Overhead ($)', type: 'number', default: 12000, min: 0, step: 1000, hint: 'Software licenses, computer hardware, accounting, marketing, co-working.' },

      // ── Advanced Options: Taxes, Health & Retirement ──
      { id: 'advanced_section', type: 'section', label: 'Taxes, Benefits & Safety Buffers', icon: 'fa-gear', collapsible: true },
      { id: 'fed_tax_rate', label: 'Estimated Federal Income Tax Rate (%)', type: 'number', default: 22, min: 0, max: 45, step: 1, hint: 'Effective federal income tax bracket.' },
      { id: 'state_tax_rate', label: 'State / Local Income Tax Rate (%)', type: 'number', default: 5, min: 0, max: 15, step: 0.5, hint: 'State income tax (0% in TX, FL, WA, etc.; 5-10% in CA, NY, etc.).' },
      { id: 'health_insurance_monthly', label: 'Monthly Health Insurance ($)', type: 'number', default: 450, min: 0, step: 50, hint: 'Self-employed health, dental, and vision insurance premiums.' },
      { id: 'retirement_annual', label: 'Target Annual Retirement Savings ($)', type: 'number', default: 10000, min: 0, step: 1000, hint: 'Annual contributions to a Solo 401(k), SEP IRA, or Roth IRA.' },
      { id: 'uncollectible_buffer', label: 'Slow Season & Unpaid Invoice Buffer (%)', type: 'number', default: 5, min: 0, max: 20, step: 1, hint: 'Safety margin for delayed client payments or pipeline gaps.' }
    ],
    calculate(v) {
      const netSalary = safeNum(v.target_take_home, 100000);
      const overhead = safeNum(v.annual_expenses, 12000);
      const healthAnnual = safeNum(v.health_insurance_monthly, 450) * 12;
      const retirementAnnual = safeNum(v.retirement_annual, 10000);
      const bufferPct = safeNum(v.uncollectible_buffer, 5) / 100;

      // Self-Employment Tax SECA (15.3% on 92.35% of profit = ~14.13%)
      const secaRate = 0.1413;
      const fedRate = safeNum(v.fed_tax_rate, 22) / 100;
      const stateRate = safeNum(v.state_tax_rate, 5) / 100;
      const totalEffectiveTaxRate = Math.min(0.55, secaRate + fedRate + stateRate);

      // Pre-tax personal needs = (Net Salary + Retirement) / (1 - Tax Rate)
      const preTaxPersonal = (netSalary + retirementAnnual) / (1 - totalEffectiveTaxRate);
      const grossRevenueNeeded = roundTo((preTaxPersonal + overhead + healthAnnual) / (1 - bufferPct), 2);
      const totalTaxes = roundTo(preTaxPersonal * totalEffectiveTaxRate, 2);

      const weeksOff = safeNum(v.weeks_off, 4);
      const workingWeeks = Math.max(1, 52 - weeksOff);
      const billableHoursPerWeek = safeNum(v.billable_hours_per_week, 25);
      const totalBillableHours = workingWeeks * billableHoursPerWeek;

      // Rate Ladder
      const targetHourlyRate = roundTo(grossRevenueNeeded / totalBillableHours, 2);
      const floorHourlyRate = roundTo((netSalary / (1 - totalEffectiveTaxRate) + overhead) / totalBillableHours, 2);
      const premiumHourlyRate = roundTo(targetHourlyRate * 1.25, 2);

      const standardDayRate = roundTo(targetHourlyRate * 8, 2);
      const standardMonthlyRetainer = roundTo(grossRevenueNeeded / 12, 2);

      return {
        stats: [
          { label: 'Target Hourly Rate', value: '$' + targetHourlyRate + ' / hr', highlight: true },
          { label: 'Standard Day Rate (8 hrs)', value: fmt(standardDayRate) },
          { label: 'Monthly Retainer Target', value: fmt(standardMonthlyRetainer) },
          { label: 'Minimum Survival Floor Rate', value: '$' + floorHourlyRate + ' / hr', warn: true },
          { label: 'Premium Value-Based Rate', value: '$' + premiumHourlyRate + ' / hr', highlight: true },
          { label: 'Gross Annual Revenue Needed', value: fmt(grossRevenueNeeded) },
          { label: 'Total Tax Reserve Needed', value: fmt(totalTaxes), warn: true },
          { label: 'Annual Billable Hours', value: totalBillableHours + ' hrs (' + workingWeeks + ' wks)' }
        ],
        chart: {
          labels: ['Net Salary in Pocket', 'Taxes Reserved', 'Benefits & Retirement', 'Business Overhead'],
          datasets: [{
            data: [netSalary, totalTaxes, (healthAnnual + retirementAnnual), overhead],
            backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#6366F1']
          }]
        },
        insight: {
          title: 'Your 3-Tier Pricing Blueprint',
          text: 'To take home ' + fmt(netSalary) + ' clean after taxes (' + fmt(totalTaxes) + '), retirement (' + fmt(retirementAnnual) + '), and health insurance, quote $' + targetHourlyRate + '/hr (or ' + fmt(standardDayRate) + '/day). Never accept project work below your survival floor of $' + floorHourlyRate + '/hr.'
        }
      };
    },
    article: {
      heading: 'The 1099 Freelance Pricing Guide: How to Bill What You Are Worth',
      intro: 'Freelancing without accounting for self-employment tax, unpaid vacations, and non-billable time is the #1 reason solo contractors burn out.',
      sections: [
        {
          heading: 'Why Salary ÷ 2,000 Guarantees Undercharging',
          content: 'A corporate employee getting $100k works 2,000 hours with employer-paid taxes, healthcare, and 401(k) matches. A freelancer only has 1,000 to 1,300 true billable hours after accounting for client proposals and marketing.'
        },
        {
          heading: 'Setting Up Your Quarterly Tax Escrow',
          content: 'Always transfer 28% to 35% of every incoming client payment into a separate high-yield business savings account so you can easily pay IRS Form 1040-ES quarterly vouchers on time.'
        }
      ]
    },
    howTo: [
      { name: 'Enter Desired Take-Home Pay', text: 'Input what you want to pocket annually for your lifestyle and savings.' },
      { name: 'Set Realistic Billable Hours', text: 'Budget 20 to 28 hours per week for client work.' },
      { name: 'Use the 3-Tier Rate Ladder', text: 'Quote your Target or Premium rate on all client project proposals.' }
    ],
    faqs: [
      { question: 'What is the standard rule of thumb for freelance pricing?', answer: 'Take the equivalent corporate W-2 salary and divide by 1,000 (rather than 2,000). A $100k full-time job translates to a $100/hour freelance baseline.' },
      { question: 'Should I quote hourly or flat project rates?', answer: 'Always calculate your internal quote using hourly rates, but present flat project packages to clients to capture value without trading time for money.' }
    ]
  },

  // ── Body Fat & Composition Goal Engine ─────────────────────────────────
  'body-fat-percentage-calculator': {
    name: 'Body Fat Percentage Calculator (US Navy Method)',
    category: 'Health',
    icon: 'fa-tape',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    description: 'Estimate your body fat percentage, lean body mass, fat mass, and target timeline to reach your ideal body composition using standard tape measurements and the validated US Navy fitness formula.',
    metaTitle: 'Body Fat Percentage Calculator | US Navy Tape Measure Formula — GetCalcu',
    metaDescription: 'Free US Navy Body Fat Calculator. Calculate body fat percentage, lean mass, fat mass, and goal fat loss timelines instantly using at-home tape measurements.',
    keywords: [
      'navy body fat calculator',
      'body fat percentage calculator tape measure',
      'us navy body fat formula calculator',
      'how to calculate body fat percentage at home',
      'lean body mass calculator',
      'body fat loss timeline calculator'
    ],
    presets: [
      { label: 'Male Fitness (5ft 10in, 32in Waist)', values: { gender: 'male', unit: 'imperial', height: 70, neck: 15, waist: 32, hip: 38, weight: 175, activity: 'moderate', target_bf: 12 } },
      { label: 'Female Fit (5ft 5in, 27in Waist)', values: { gender: 'female', unit: 'imperial', height: 65, neck: 13, waist: 27, hip: 36, weight: 135, activity: 'moderate', target_bf: 20 } },
      { label: 'Male Fat Loss Goal (6ft 0in, 38in Waist)', values: { gender: 'male', unit: 'imperial', height: 72, neck: 16, waist: 38, hip: 42, weight: 215, activity: 'light', target_bf: 15 } }
    ],
    fields: [
      // ── Basic Inputs ──
      { id: 'basic_section', type: 'section', label: 'Body Measurements', icon: 'fa-sliders' },
      { id: 'gender', label: 'Gender', type: 'select', default: 'male', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }], hint: 'Biological sex dictates anatomical body fat distribution formulas.' },
      { id: 'unit', label: 'Measurement Units', type: 'select', default: 'imperial', options: [{ value: 'imperial', label: 'Inches / Pounds' }, { value: 'metric', label: 'Centimeters / Kilograms' }], hint: 'Choose your preferred measurement system.' },
      { id: 'height', label: 'Height (inches or cm)', type: 'number', default: 70, min: 36, max: 250, step: 0.5, hint: 'Total standing height.' },
      { id: 'neck', label: 'Neck Circumference (inches or cm)', type: 'number', default: 15, min: 5, max: 100, step: 0.25, hint: "Measure around the neck just below the larynx (Adam's apple)." },
      { id: 'waist', label: 'Waist Circumference (inches or cm)', type: 'number', default: 32, min: 10, max: 200, step: 0.25, hint: 'Men: measure at the navel. Women: measure at narrowest natural waist.' },
      { id: 'hip', label: 'Hip Circumference (women only)', type: 'number', default: 36, min: 10, max: 200, step: 0.25, condition: v => v.gender === 'female', hint: 'Measure around the widest point of the hips and buttocks.' },
      { id: 'weight', label: 'Body Weight (lbs or kg)', type: 'number', default: 175, min: 40, max: 500, step: 0.5, hint: 'Current morning body weight.' },

      // ── Advanced Options: Goal Planning & Caloric Targets ──
      { id: 'advanced_section', type: 'section', label: 'Target Fat Loss & Calorie Projections', icon: 'fa-gear', collapsible: true },
      { id: 'activity', label: 'Daily Activity Level', type: 'select', default: 'moderate', options: [
        { value: 'sedentary', label: 'Sedentary (Desk job, little exercise)' },
        { value: 'light', label: 'Lightly Active (Exercise 1-3 days/wk)' },
        { value: 'moderate', label: 'Moderately Active (Exercise 3-5 days/wk)' },
        { value: 'very', label: 'Very Active (Intense exercise 6-7 days/wk)' }
      ], hint: 'Used to calculate maintenance energy expenditure (TDEE).' },
      { id: 'target_bf', label: 'Target Goal Body Fat (%)', type: 'number', default: 12, min: 5, max: 40, step: 1, hint: 'Your target body fat percentage goal (e.g., 10-14% for men, 18-22% for women).' },
      { id: 'weekly_loss_rate', label: 'Target Fat Loss Speed', type: 'select', default: '1.0', options: [
        { value: '0.5', label: 'Conservative (0.5 lb / 0.25 kg per week)' },
        { value: '1.0', label: 'Standard (1.0 lb / 0.5 kg per week)' },
        { value: '1.5', label: 'Aggressive (1.5 lb / 0.7 kg per week)' }
      ], hint: 'A steady 1.0 lb/week deficit preserves maximum lean muscle mass.' }
    ],
    calculate(v) {
      const isMetric = v.unit === 'metric';
      let h = safeNum(v.height, isMetric ? 178 : 70);
      let neck = safeNum(v.neck, isMetric ? 38 : 15);
      let waist = safeNum(v.waist, isMetric ? 81 : 32);
      let hip = safeNum(v.hip, isMetric ? 91 : 36);
      const wt = safeNum(v.weight, isMetric ? 80 : 175);

      if (!isMetric) {
        h = h * 2.54;
        neck = neck * 2.54;
        waist = waist * 2.54;
        hip = hip * 2.54;
      }

      let bf = 0;
      if (v.gender === 'female') {
        const factor = waist + hip - neck;
        if (factor <= 0) return errorResult('Waist + Hip must be greater than neck circumference.');
        bf = 495 / (1.29579 - 0.35004 * Math.log10(factor) + 0.22100 * Math.log10(h)) - 450;
      } else {
        const factor = waist - neck;
        if (factor <= 0) return errorResult('Waist circumference must be greater than neck.');
        bf = 495 / (1.0324 - 0.19077 * Math.log10(factor) + 0.15456 * Math.log10(h)) - 450;
      }

      bf = Math.max(2, Math.min(65, roundTo(bf, 1)));
      const fatMass = roundTo(wt * (bf / 100), 1);
      const leanMass = roundTo(wt - fatMass, 1);
      const unitLabel = isMetric ? 'kg' : 'lbs';

      let category = 'Average';
      if (v.gender === 'male') {
        if (bf < 6) category = 'Essential Fat';
        else if (bf < 14) category = 'Athletes / Lean';
        else if (bf < 18) category = 'Fitness';
        else if (bf < 25) category = 'Average';
        else category = 'Above Average / Obese';
      } else {
        if (bf < 14) category = 'Essential Fat';
        else if (bf < 21) category = 'Athletes / Lean';
        else if (bf < 25) category = 'Fitness';
        else if (bf < 32) category = 'Average';
        else category = 'Above Average / Obese';
      }

      // Katch-McArdle BMR based on Lean Body Mass
      const leanMassKg = isMetric ? leanMass : leanMass * 0.453592;
      const bmr = roundTo(370 + (21.6 * leanMassKg), 0);

      const actMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
      const tdee = roundTo(bmr * (actMultipliers[v.activity] || 1.55), 0);

      // Target Goal Projections
      const targetBfPct = safeNum(v.target_bf, v.gender === 'male' ? 12 : 20) / 100;
      // Target weight assuming lean mass is preserved: Lean Mass / (1 - Target BF)
      const targetWeight = roundTo(leanMass / (1 - targetBfPct), 1);
      const fatToLose = roundTo(Math.max(0, wt - targetWeight), 1);

      const weeklyRate = safeNum(v.weekly_loss_rate, 1.0);
      const weeksToGoal = fatToLose > 0 ? Math.ceil(fatToLose / weeklyRate) : 0;
      const dailyCalorieDeficit = roundTo((weeklyRate * 3500) / 7, 0);
      const cuttingCalories = Math.max(1200, tdee - dailyCalorieDeficit);

      return {
        stats: [
          { label: 'Body Fat Percentage', value: bf + '%', highlight: true },
          { label: 'Fitness Classification', value: category },
          { label: 'Lean Body Mass', value: leanMass + ' ' + unitLabel, highlight: true },
          { label: 'Fat Mass', value: fatMass + ' ' + unitLabel },
          { label: 'Maintenance Calories (TDEE)', value: tdee + ' kcal / day' },
          { label: 'Target Goal Weight (at ' + v.target_bf + '% BF)', value: targetWeight + ' ' + unitLabel },
          { label: 'Fat to Lose to Reach Goal', value: fatToLose + ' ' + unitLabel, warn: fatToLose > 0 },
          { label: 'Estimated Timeline to Goal', value: weeksToGoal > 0 ? weeksToGoal + ' Weeks (' + cuttingCalories + ' kcal/day)' : 'Goal Reached!' }
        ],
        chart: {
          labels: ['Lean Muscle & Bone', 'Body Fat Mass'],
          datasets: [{
            data: [leanMass, fatMass],
            backgroundColor: ['#10B981', '#EC4899']
          }]
        },
        insight: {
          title: 'Your Body Composition Plan',
          text: 'You are carrying ' + leanMass + ' ' + unitLabel + ' of lean tissue and ' + fatMass + ' ' + unitLabel + ' of fat (' + category + '). To reach your goal of ' + v.target_bf + '% body fat while preserving lean muscle, aim for ' + cuttingCalories + ' kcal/day (a ' + dailyCalorieDeficit + ' kcal deficit) to reach your goal weight of ' + targetWeight + ' ' + unitLabel + ' in approximately ' + weeksToGoal + ' weeks.'
        }
      };
    },
    article: {
      heading: 'How the US Navy Body Fat Formula Works & How to Set Goals',
      intro: 'The US Navy body fat calculation is one of the most accurate circumference-based body composition methods, validated by clinical exercise physiology studies.',
      sections: [
        {
          heading: 'Why Lean Mass is the Key to Metabolism',
          content: 'Basal Metabolic Rate (BMR) is determined almost entirely by your lean body mass (muscle, bone, organs). Preserving lean muscle with sufficient dietary protein (0.8-1.0g per lb of body weight) ensures your metabolism stays high while losing body fat.'
        },
        {
          heading: 'Setting a Safe, Sustainable Calorie Deficit',
          content: 'A moderate 500-calorie daily deficit produces exactly 1.0 lb of pure fat loss per week without triggering muscle loss, hormonal fatigue, or metabolic adaptation.'
        }
      ]
    },
    howTo: [
      { name: 'Measure Neck and Natural Waist', text: 'Input measurements taken first thing in the morning before eating.' },
      { name: 'Set Your Goal Body Fat %', text: 'Open Advanced Options and enter your target body fat percentage.' },
      { name: 'Follow Your Daily Calorie Roadmap', text: 'Review your personalized maintenance TDEE, fat loss target weight, and daily cutting calories.' }
    ],
    faqs: [
      { question: 'How accurate is the US Navy formula compared to DEXA?', answer: 'When measured accurately, the US Navy formula typically correlates within 3% to 4% of clinical DEXA and hydrostatic underwater weighing.' },
      { question: 'What is a realistic body fat percentage for natural athletes?', answer: 'For men, 10% to 15% is athletic and sustainable year-round. For women, 18% to 24% provides a lean, defined physique while supporting healthy endocrine and reproductive function.' }
    ]
  },

};

if (typeof window !== 'undefined') {
  window.TOOLS = TOOLS;
}
function roundTo(n, decimals) { if (!isFinite(n)) return 0; const factor = Math.pow(10, decimals); return Math.round((n + Number.EPSILON) * factor) / factor; }
function safeNum(val, fallback) { if (val === null || val === undefined) return fallback; const num = Number(val); return isFinite(num) ? num : fallback; }
function safeStr(val) { if (val === null || val === undefined) return ""; return String(val).trim(); }
function fmt(n) { const num = safeNum(n, 0); return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n) { const num = safeNum(n, 0); return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function pct(n) { const num = safeNum(n, 0); return (num * 100).toFixed(2) + "%"; }
function errorResult(message) { return { error: true, stats: [{ label: "Error", value: message, warn: true }] }; }
function bmiCategory(bmi) { if (!isFinite(bmi)) return { label: "—", color: "#64748B" }; if (bmi < 18.5) return { label: "Underweight", color: "#3B82F6" }; if (bmi < 25) return { label: "Normal Weight", color: "#10B981" }; if (bmi < 30) return { label: "Overweight", color: "#F59E0B" }; return { label: "Obese", color: "#EF4444" }; }
function buildAmortization(principal, r, n, payment) {
  const rows = [];
  let balance = safeNum(principal, 0);
  for (let i = 1; i <= n; i++) {
    const interest = roundTo(balance * r, 2);
    let principalPaid = roundTo(payment - interest, 2);
    if (principalPaid > balance) principalPaid = balance;
    balance = roundTo(balance - principalPaid, 2);
    rows.push({ month: i, payment: (i === n && balance > 0) ? roundTo(principalPaid + balance, 2) : payment, principal: principalPaid, interest, balance: Math.max(0, balance) });
    if (balance <= 0 && i < n) break;
  }
  if (rows.length > 0) {
    rows[rows.length - 1].balance = 0;
    rows[rows.length - 1].payment = roundTo(rows[rows.length - 1].principal + rows[rows.length - 1].interest, 2);
  }
  return rows;
}
function fmtCurrency(n) { return fmt(n); }