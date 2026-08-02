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
    fields: [
      { id: 'budget_placeholder', label: 'Budget', type: 'number', default: 0, min: 0 },
    ],
    calculate() {
      return {
        stats: [
          { label: 'Total Income', value: '$0.00', highlight: true },
          { label: 'Total Expenses', value: '$0.00' },
          { label: 'Remaining Balance', value: '$0.00' },
          { label: 'Savings Rate', value: '0%' },
        ],
      };
    },
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

      // ── Future value of desired income (inflation-adjusted)
      const fvDesiredIncome = desiredIncomeToday * Math.pow(1 + inflationRate, yearsToRetire);

      // ── 4% Rule: target nest egg (25x annual desired income)
      const targetNestEgg   = roundTo(fvDesiredIncome * 25, 2);

      // ── Monthly and annual retirement income (4% rule)
      const monthlyRetireIncome = roundTo(totalNestEgg * 0.04 / 12, 2);
      const annualRetireIncome  = roundTo(totalNestEgg * 0.04, 2);

      // ── Inflation-adjusted monthly income (today's dollars)
      // PV = FV / (1 + inflation)^years
      const inflationAdjMonthly = roundTo(
        monthlyRetireIncome / Math.pow(1 + inflationRate, yearsToRetire), 2
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
          { label: 'Projected Nest Egg',             value: fmt(totalNestEgg),          highlight: true },
          { label: 'Target Nest Egg (4% Rule)',       value: fmt(targetNestEgg)                         },
          { label: 'Status',                          value: status,                     warn: totalNestEgg < targetNestEgg },
          { label: 'Monthly Retirement Income',       value: fmt(monthlyRetireIncome)                   },
          { label: 'Annual Retirement Income',        value: fmt(annualRetireIncome)                    },
          { label: 'Total Contributions',             value: fmt(totalContribs)                         },
          { label: 'Investment Growth',               value: fmt(totalGrowth)                           },
          { label: 'Inflation-Adj. Monthly Income',   value: fmt(inflationAdjMonthly)                   },
          { label: 'Income Replacement Rate',         value: pct(achievedReplaceRate / 100)             },
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
        const fvReal = roundTo(fvPost / Math.pow(1 + pi, tUse), 2);
        const rowsS = []; let run = P0;
        for (let y = 1; y <= tUse; y++) {
          const sB = run; const dep = M * k;
          const nE = fv(P0, M, rNom/k, k*y); const pE = fv(P0, M, rNet/k, k*y);
          const rE = roundTo(pE / Math.pow(1 + pi, y), 2);
          rowsS.push({ year: 'Year ' + y, startBalance: fmt(sB), deposits: fmt(dep), nominalEnd: fmt(nE), postTaxEnd: fmt(pE), realEndTodayDollars: fmt(rE) });
          run = nE;
        }
        return { stats: [
          { label: 'Real Return (Post-Tax, Post-Inflation)', value: pct(rReal/100), highlight: true },
          { label: 'Advertised APY', value: pct(rNom) },
          { label: 'Post-Tax Nominal Return', value: pct(rNet/100) },
          { label: 'Inflation Drag', value: pct(roundTo(rNet - rReal, 4)/100), warn: true },
          { label: "Real Future Value (Today's $)", value: fmt(fvReal) },
          { label: 'Post-Tax Future Value (Nominal $)', value: fmt(fvPost) },
          { label: 'Nominal Future Value (Pre-Tax $)', value: fmt(fvNom) },
        ], chart: { type: 'bar', labels: ['Advertised APY', 'Post-Tax', 'Real Return'], datasets: [ { label: 'Yield %', data: [rate, rNetD, rRealD], color: '#6366F1' } ], yLabel: 'Annual Yield (%)', title: 'APY vs Real Purchasing-Power Yield' },
        table: { mode: 'schedule', title: 'Year-by-Year Real Value Projection', columns: [
          { key: 'year', label: 'Year', format: 'text' }, { key: 'startBalance', label: 'Start Balance', format: 'currency' },
          { key: 'deposits', label: 'Deposits', format: 'currency' }, { key: 'nominalEnd', label: 'Nominal End', format: 'currency' },
          { key: 'postTaxEnd', label: 'Post-Tax End', format: 'currency' }, { key: 'realEndTodayDollars', label: "Real (Today's $)", format: 'currency', emphasis: true } ], rows: rowsS },
        insight: { tone: 'warning', icon: 'fa-percent',
          headline: 'Your bank advertises ' + pct(rNom) + ' APY, but your real return is only ' + pct(rRealD/100) + '.',
          detail: 'After ' + pct(tau) + ' tax and ' + pct(pi) + ' inflation, your purchasing-power yield collapses to ' + pct(rRealD/100) + '. Over ' + tUse + ' years, ' + fmt(P0) + ' plus ' + fmt(M) + '/month grows to ' + fmt(fvReal) + " in today's dollars." } };
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
    ],
    fields: [
      // Basic Inputs
      { id: 'home_price', label: 'Home Purchase Price ($)', type: 'number', default: 400000, min: 10000, step: 5000, hint: 'The total purchase price of the home you are considering buying.' },
      { id: 'down_payment_type', label: 'Down Payment Type', type: 'select', default: 'percent',
        options: [
          { value: 'percent', label: 'Percentage (%)' },
          { value: 'dollar', label: 'Dollar Amount ($)' },
        ], hint: 'Choose whether to enter your down payment as a percentage of the home price or as a specific dollar amount.' },
      { id: 'down_payment', label: 'Down Payment', type: 'number', default: 20, min: 0, max: 100, step: 0.5, hint: 'The cash you pay upfront. 20% is standard to avoid PMI. The calculator converts this to a dollar amount based on the home price.' },
      { id: 'mortgage_rate', label: 'Mortgage Interest Rate (%)', type: 'number', default: 7.0, min: 0.01, max: 20, step: 0.05, hint: 'The annual interest rate (APR) on your mortgage. Current 30-year fixed rates typically range 6-8%.' },
      { id: 'loan_term', label: 'Loan Term (years)', type: 'select', default: 30,
        options: [10,15,20,25,30].map(v => ({ value: v, label: `${v} years` })), hint: 'How long you will take to repay the mortgage. Shorter terms build equity faster but have higher monthly payments.' },
      { id: 'property_tax', label: 'Annual Property Tax ($)', type: 'number', default: 4800, min: 0, step: 100, hint: 'Yearly property tax based on your local government rate. Typically 1-2% of home value annually.' },
      { id: 'home_insurance', label: 'Annual Home Insurance ($)', type: 'number', default: 1200, min: 0, step: 100, hint: 'Yearly homeowners insurance premium. Covers damage, liability, and personal property.' },
      { id: 'annual_maintenance', label: 'Annual Maintenance ($)', type: 'number', default: 4000, min: 0, step: 100, hint: 'Estimated yearly maintenance and repairs. A common rule is 1-2% of home value annually.' },
      { id: 'current_rent', label: 'Current Monthly Rent ($)', type: 'number', default: 2000, min: 0, step: 50, hint: 'What you currently pay (or would pay) for rent each month.' },
      { id: 'rent_increase', label: 'Expected Annual Rent Increase (%)', type: 'number', default: 3.0, min: 0, max: 15, step: 0.1, hint: 'The average yearly percentage increase in rent. Historical average is about 2-4% annually.' },
      { id: 'home_appreciation', label: 'Expected Home Appreciation (%)', type: 'number', default: 3.0, min: -5, max: 15, step: 0.1, hint: 'Expected annual increase in home value. Historical US average is about 3-5% per year.' },
      { id: 'investment_return', label: 'Expected Investment Return (%)', type: 'number', default: 7.0, min: 0, max: 20, step: 0.1, hint: 'The annual return you could earn by investing your down payment and closing costs instead of buying. S&P 500 long-term average: 7-10%.' },
      { id: 'analysis_period', label: 'Analysis Period (years)', type: 'number', default: 10, min: 1, max: 50, step: 1, hint: 'How many years to compare renting vs buying. Longer periods generally favor buying due to equity buildup.' },

      // Advanced Options (collapsible)
      { id: 'closing_costs', label: 'Closing Costs ($)', type: 'number', default: 12000, min: 0, step: 500, hint: 'One-time costs when buying: loan origination, appraisal, title insurance, attorney fees. Typically 2-5% of home price.' },
      { id: 'selling_costs', label: 'Selling Costs (%)', type: 'number', default: 6.0, min: 0, max: 15, step: 0.1, hint: 'Costs when selling: realtor commission (typically 5-6%), closing fees, capital gains tax if applicable.' },
      { id: 'hoa_fees', label: 'Monthly HOA Fees ($)', type: 'number', default: 0, min: 0, step: 25, hint: 'Monthly homeowners association fees for common area maintenance (condos, townhomes, some neighborhoods).' },
      { id: 'pmi', label: 'Monthly PMI ($)', type: 'number', default: 0, min: 0, step: 10, hint: 'Private Mortgage Insurance when down payment is less than 20%. Typically 0.5-1% of loan amount annually, divided by 12.' },
      { id: 'mortgage_origination', label: 'Mortgage Origination Fee (%)', type: 'number', default: 1.0, min: 0, max: 5, step: 0.1, hint: 'Lender fee for processing the mortgage, typically 0.5-1.5% of loan amount.' },
      { id: 'inflation_rate', label: 'Annual Inflation Rate (%)', type: 'number', default: 3.0, min: 0, max: 10, step: 0.1, hint: 'Expected annual inflation rate. Affects future costs and the real value of money over time.' },
      { id: 'property_tax_growth', label: 'Property Tax Growth (%)', type: 'number', default: 2.0, min: 0, max: 10, step: 0.1, hint: 'Annual increase in property taxes. Often matches or exceeds inflation.' },
      { id: 'insurance_growth', label: 'Insurance Growth (%)', type: 'number', default: 3.0, min: 0, max: 10, step: 0.1, hint: 'Annual increase in home insurance premiums.' },
      { id: 'maintenance_growth', label: 'Maintenance Growth (%)', type: 'number', default: 2.5, min: 0, max: 10, step: 0.1, hint: 'Annual increase in maintenance costs as the home ages.' },
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
      // ── Extract and validate inputs
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

      const mortgageRate = safeNum(v.mortgage_rate, 7) / 100;
      const loanTerm = Math.round(safeNum(v.loan_term, 30));
      const loanAmount = homePrice - downPayment;
      const monthlyRate = mortgageRate / 12;
      const numPayments = loanTerm * 12;

      // Property tax and insurance with growth
      const annualPropertyTax = safeNum(v.property_tax, 0);
      const annualHomeInsurance = safeNum(v.home_insurance, 0);
      const annualMaintenance = safeNum(v.annual_maintenance, 0);
      const propertyTaxGrowth = safeNum(v.property_tax_growth, 2) / 100;
      const insuranceGrowth = safeNum(v.insurance_growth, 3) / 100;
      const maintenanceGrowth = safeNum(v.maintenance_growth, 2.5) / 100;

      // Rent parameters
      const currentRent = safeNum(v.current_rent, 0);
      const rentIncrease = safeNum(v.rent_increase, 3) / 100;
      const rentersInsurance = safeNum(v.renters_insurance, 200);

      // Investment parameters
      const homeAppreciation = safeNum(v.home_appreciation, 3) / 100;
      const investmentReturn = safeNum(v.investment_return, 7) / 100;
      const investmentTaxRate = safeNum(v.investment_tax_rate, 15) / 100;
      const marginalTaxRate = safeNum(v.marginal_tax_rate, 24) / 100;
      const inflationRate = safeNum(v.inflation_rate, 3) / 100;

      // Costs
      const closingCosts = safeNum(v.closing_costs, 0);
      const sellingCostsPct = safeNum(v.selling_costs, 6) / 100;
      const monthlyHOA = safeNum(v.hoa_fees, 0);
      const monthlyPMI = safeNum(v.pmi, 0);
      const mortgageOrigination = safeNum(v.mortgage_origination, 1) / 100;
      const movingCosts = safeNum(v.moving_costs, 0);

      const analysisPeriod = Math.round(safeNum(v.analysis_period, 10));

      // ── Calculate monthly mortgage payment (P&I)
      let monthlyPI;
      if (monthlyRate === 0) {
        monthlyPI = loanAmount / numPayments;
      } else {
        monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      }
      monthlyPI = roundTo(monthlyPI, 2);

      // ── Year-by-year calculations
      const buyData = [];
      const rentData = [];
      let breakEvenYear = null;
      let minDifference = Infinity;

      let remainingBalance = loanAmount;
      let totalInterestPaid = 0;
      let totalPrincipalPaid = 0;
      let totalPropertyTaxPaid = 0;
      let totalInsurancePaid = 0;
      let totalMaintenancePaid = 0;
      let totalHOAPaid = 0;
      let totalPMIPaid = 0;
      let totalSellingCosts = 0;

      let investmentBalance = downPayment + closingCosts + movingCosts;
      let totalInvestmentGains = 0;

      let currentRentMonthly = currentRent;
      let totalRentPaid = 0;
      let totalRentersInsurancePaid = 0;

      for (let year = 1; year <= analysisPeriod; year++) {
        // ── BUYING CALCULATIONS ──
        let yearInterest = 0;
        let yearPrincipal = 0;
        let yearPropertyTax = annualPropertyTax * Math.pow(1 + propertyTaxGrowth, year - 1);
        let yearInsurance = annualHomeInsurance * Math.pow(1 + insuranceGrowth, year - 1);
        let yearMaintenance = annualMaintenance * Math.pow(1 + maintenanceGrowth, year - 1);
        let yearHOA = monthlyHOA * 12;
        let yearPMI = monthlyPMI * 12;

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

        // Home value and equity
        const homeValue = homePrice * Math.pow(1 + homeAppreciation, year);
        const equity = homeValue - remainingBalance;

        // Selling costs (if selling at this year)
        const sellingCosts = homeValue * sellingCostsPct;
        const netProceeds = equity - sellingCosts;

        // Total buying costs this year
        const totalBuyingCost = yearPrincipal + yearInterest + yearPropertyTax + yearInsurance + yearMaintenance + yearHOA + yearPMI;

        // ── RENTING CALCULATIONS ──
        const yearRent = currentRentMonthly * 12;
        totalRentPaid += yearRent;
        totalRentersInsurancePaid += rentersInsurance;
        const totalRentingCost = yearRent + rentersInsurance;

        // Increase rent for next year
        currentRentMonthly *= (1 + rentIncrease);

        // ── INVESTMENT OPPORTUNITY COST ──
        // What the down payment + closing costs + moving costs would be worth if invested
        const opportunityCost = investmentBalance * Math.pow(1 + investmentReturn, year) - investmentBalance;
        totalInvestmentGains = investmentBalance * Math.pow(1 + investmentReturn, year) - investmentBalance;

        // ── NET WORTH CALCULATIONS ──
        const buyingNetWorth = equity - totalBuyingCost - closingCosts - movingCosts - sellingCosts;
        const rentingNetWorth = totalInvestmentGains - totalRentingCost;

        const difference = buyingNetWorth - rentingNetWorth;

        // Track break-even year
        if (breakEvenYear === null && difference > 0) {
          breakEvenYear = year;
        }
        if (Math.abs(difference) < Math.abs(minDifference)) {
          minDifference = difference;
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
          homeValue: 0,
          equity: 0,
          netProceeds: 0,
          investmentValue: roundTo(totalInvestmentGains, 2),
          netWorth: roundTo(rentingNetWorth, 2),
          difference: roundTo(-difference, 2),
        });
      }

      // ── FINAL TOTALS ──
      const finalBuy = buyData[buyData.length - 1];
      const finalRent = rentData[rentData.length - 1];
      const finalSellingCosts = roundTo(finalBuy.homeValue * sellingCostsPct, 2);

      const buyingNetCost = roundTo(finalBuy.mortgagePaid + finalBuy.taxes + finalBuy.insurance + finalBuy.maintenance + finalBuy.hoa + finalBuy.pmi - finalBuy.equity, 2);
      const rentingNetCost = roundTo(finalRent.rentPaid + finalRent.insurance, 2);

      // ── GENERATE RECOMMENDATION ──
      const savings = Math.abs(rentingNetCost - buyingNetCost);
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
        breakEvenYear: breakEvenYear || 'Not within analysis period',
      };

      // ── BUILD OUTPUT STATS ──
      const stats = [
        { label: 'Buying Net Cost', value: fmt(buyingNetCost), warn: winner === 'rent' },
        { label: 'Renting Net Cost', value: fmt(rentingNetCost), warn: winner === 'buy' },
        { label: 'Difference', value: fmt(savingsAmount), highlight: true },
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
        { label: 'Investment Growth', value: fmt(finalRent.investmentValue) },
        { label: 'Opportunity Cost', value: fmt(roundTo(totalInvestmentGains, 2)) },
        { label: 'Estimated Net Worth', value: fmt(roundTo(finalBuy.netWorth + finalBuy.equity, 2)), highlight: true },
      ];

      // ── BUILD CHARTS ──
      const chartLabels = buyData.map(d => `Year ${d.year}`);
      const netWorthBuyData = buyData.map(d => d.netWorth + d.equity);
      const netWorthRentData = rentData.map(d => d.netWorth);
      const buyCostData = buyData.map(d => d.mortgagePaid + d.taxes + d.insurance + d.maintenance + d.hoa + d.pmi);
      const rentCostData = rentData.map(d => d.rentPaid + d.insurance);
      const equityData = buyData.map(d => d.equity);
      const investmentData = rentData.map(d => d.investmentValue);

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

      const costChart = {
        type: 'line',
        labels: chartLabels,
        datasets: [
          { label: 'Buying Cumulative Cost', data: buyCostData, color: '#EF4444' },
          { label: 'Renting Cumulative Cost', data: rentCostData, color: '#F59E0B' },
        ],
        yLabel: 'Cumulative Cost ($)',
        title: 'Cost Over Time',
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
          netWorth: roundTo((b.netWorth + b.equity) - r.netWorth, 2),
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
        insightHeadline = `Buying saves approximately ${fmt(savingsAmount)} over ${analysisPeriod} years.`;
        insightDetail = `Home appreciation exceeds ownership costs, and principal payments build equity. ${breakEvenYear ? `Break-even occurs in Year ${breakEvenYear}.` : ''} ${confidence === 'High' ? 'This is a strong financial decision if you plan to stay at least 5-7 years.' : 'Consider your time horizon and local market conditions.'}`;
      } else {
        insightHeadline = `Renting saves approximately ${fmt(savingsAmount)} over ${analysisPeriod} years.`;
        insightDetail = `The opportunity cost of your down payment and closing costs exceeds the equity you would build. ${confidence === 'High' ? 'This is financially prudent if you value flexibility or plan to move within 5 years.' : 'Consider your career stability, local market conditions, and desire for flexibility.'}`;
      }

      const insight = {
        tone: insightTone,
        icon: insightIcon,
        headline: insightHeadline,
        detail: insightDetail,
      };

      return {
        stats,
        chart,
        costChart,
        table,
        insight,
        recommendation,
      };
    },

    // ── How-To Guide
    howTo: [
      'Enter the home purchase price and choose your down payment type (percentage or dollar amount).',
      'Set your mortgage rate, loan term, and annual property tax, insurance, and maintenance costs.',
      'Input your current rent and expected annual rent increase.',
      'Set your expected home appreciation rate and investment return rate.',
      'Choose your analysis period (how many years to compare).',
      'Click "Advanced Options" to customize closing costs, HOA fees, PMI, inflation, and more.',
      'Review the recommendation, stat cards, charts, and year-by-year comparison table.',
      'Adjust assumptions to see how changes affect the break-even point and net worth.',
    ],

    // ── Real-World Examples
    examples: [
      {
        title: 'Typical 20% Down Purchase',
        input: '$400,000 home, 20% down, 7% rate, 30yr, $2,000 rent, 3% appreciation, 7% investment return, 10 years',
        result: 'Buying wins by ~$45,000. Break-even at Year 4. High confidence if staying 7+ years.',
      },
      {
        title: 'Low Down Payment Scenario',
        input: '$400,000 home, 5% down, PMI required, 7% rate, 30yr, $2,000 rent, 10 years',
        result: 'PMI and higher loan costs delay break-even to Year 6-7. Still favorable long-term with appreciation.',
      },
      {
        title: 'High Rent Growth Market',
        input: '$400,000 home, 20% down, $2,500 rent, 5% annual rent increases, 10 years',
        result: 'Buying wins by ~$78,000. Rapid rent growth makes buying advantageous by Year 3.',
      },
      {
        title: 'Short Time Horizon',
        input: '$400,000 home, 20% down, plan to move in 3 years, $2,000 rent, 10 years',
        result: 'Renting likely wins. Transaction costs (closing + selling) erase equity gains in under 5 years.',
      },
    ],
    formula: 'Monthly P&I = P × [r(1+r)^n] / [(1+r)^n − 1] | Equity = Home Value − Remaining Balance | Net Proceeds = Equity − Selling Costs | Opportunity Cost = Invested Capital × (1 + Return)^t | Net Worth (Buy) = Equity − Cumulative Costs | Net Worth (Rent) = Investment Gains − Cumulative Rent',

    // ── SEO Article Content
    article: {
      heading: 'The Complete Guide to the Rent vs. Buy Decision',
      intro: 'The rent vs. buy question is one of the most significant financial decisions most people will make. It involves far more than comparing a monthly rent check to a mortgage payment — it requires understanding equity buildup, opportunity cost, tax implications, transaction costs, and how time in the market changes the math. The GetCalcu Rent vs. Buy Calculator models all of these factors to give you a clear, data-driven answer tailored to your situation.',
      sections: [
        { heading: 'Why the Rent vs. Buy Decision Is So Complex', body: 'Most people compare rent to their monthly mortgage payment, but that is just the starting point. Buying involves upfront closing costs (typically 2-5% of the home price), ongoing property taxes, homeowners insurance, maintenance (1-2% of home value annually), and potentially HOA fees and PMI. When you sell, realtor commissions and closing fees eat 6-10% of the sale price. Renting has none of these costs, but you also build no equity and are exposed to annual rent increases. The calculator models all of these cash flows year by year.' },
        { heading: 'How Opportunity Cost Changes the Math', body: 'When you buy, you tie up a large down payment (often 20% of the home price) plus closing costs. That capital could otherwise be invested. If you invest $80,000 plus $12,000 in closing costs at a 7% annual return, it grows to over $200,000 in 10 years. The calculator compares that investment growth against the equity you build in the home, revealing which strategy creates more wealth.' },
        { heading: 'The Break-Even Point and Why Time Horizon Matters', body: 'Buying has high fixed costs — closing costs, selling costs, and the first few years of mortgage interest are front-loaded. It typically takes 3-7 years for equity buildup and appreciation to overcome these upfront costs. If you plan to move within 3-5 years, renting is often cheaper. If you plan to stay 7+ years, buying usually wins. The calculator shows your exact break-even year based on your assumptions.' },
        { heading: 'How Home Appreciation and Rent Inflation Affect the Decision', body: 'In hot markets where home values rise 5-7% annually, buying builds wealth faster through appreciation. In markets with high rent growth (5%+ annually), buying provides payment stability while renters face escalating costs. Conversely, in stagnant or declining markets, appreciation may not offset ownership costs, and low rent growth favors renting. The calculator lets you model both scenarios.' },
      ],
    },

    // ── Schema-Ready FAQs
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
  },
};
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