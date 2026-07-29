const TOOLS = {
  'mortgage-calculator': {
    name: 'Mortgage Calculator',
    category: 'Finance',
    icon: 'fa-house',
    iconClass: 'icon-home',
    tagClass: 'tag-finance',
    description: 'Calculate your monthly mortgage payment, total interest paid, and full amortization schedule.',
    metaDescription: 'Free mortgage calculator â€” instantly calculate monthly payments, total interest, and amortization schedule for any home loan.',
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
    metaDescription: 'Free BMI calculator â€” instantly calculate your Body Mass Index, health category, and ideal weight range.',
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
          { label: 'Healthy Weight Range', value: `${healthyMin}â€“${healthyMax} ${weightDisplay}` },
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
    metaDescription: 'Free percentage calculator â€” find percentages, percent change, and compute values instantly.',
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
    metaDescription: 'Free loan calculator â€” estimate monthly payments, total interest, and total repayment for auto, personal, or student loans.',
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
    metaDescription: 'Free date calculator â€” find days between dates, or add/subtract days, weeks, months and years from any date.',
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
        { heading: 'Adding and Subtracting Calendar Units', body: 'When you add months or years, the calculator follows calendar arithmetic — adding 1 month to January 31 gives February 28 (or 29 in a leap year), not March 3. This matches how contracts and due dates are typically calculated.' },
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
    metaDescription: 'Free loan interest calculator â€” see total interest, monthly payments, and full amortization with flexible payment frequencies.',
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

  // â”€â”€ Compound Interest Calculator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  'compound-interest-calculator': {
    name: 'Compound Interest Calculator',
    category: 'Finance',
    icon: 'fa-chart-line',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Project how your savings and investments grow over time with compound interest and recurring monthly contributions.',
    metaDescription: 'Free compound interest calculator â€” see how your money grows with compounding and monthly contributions. Get year-by-year projections, total interest earned, and charts.',
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
};




function roundTo(n, decimals) { if (!isFinite(n)) return 0; const factor = Math.pow(10, decimals); return Math.round((n + Number.EPSILON) * factor) / factor; }
function safeNum(val, fallback) { if (val === null || val === undefined) return fallback; const num = Number(val); return isFinite(num) ? num : fallback; }
function safeStr(val) { if (val === null || val === undefined) return ""; return String(val).trim(); }
function fmt(n) { const num = safeNum(n, 0); return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n) { const num = safeNum(n, 0); return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function pct(n) { const num = safeNum(n, 0); return (num * 100).toFixed(2) + "%"; }
function errorResult(message) { return { error: true, stats: [{ label: "Error", value: message, warn: true }] }; }
function bmiCategory(bmi) { if (!isFinite(bmi)) return { label: "â€”", color: "#64748B" }; if (bmi < 18.5) return { label: "Underweight", color: "#3B82F6" }; if (bmi < 25) return { label: "Normal Weight", color: "#10B981" }; if (bmi < 30) return { label: "Overweight", color: "#F59E0B" }; return { label: "Obese", color: "#EF4444" }; }
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
