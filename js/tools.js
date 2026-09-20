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
    name: 'Mortgage Calculator',
    category: 'Finance',
    icon: 'fa-house',
    iconClass: 'icon-home',
    tagClass: 'tag-finance',
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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

    methodology: {
      standards: 'This calculator uses the standard monthly compounding amortization equation adopted by the Consumer Financial Protection Bureau (CFPB), Federal Reserve, and mortgage lending institutions worldwide.',
      summary: 'Our calculation engine computes monthly principal and interest (P&I) using standard actuarial amortization mathematics. Annual property taxes and homeowners insurance are divided evenly across 12 monthly escrow installments.',
      assumptions: [
        'Interest compounds monthly on a 360-day or 365-day fixed amortization schedule (12 monthly payments per calendar year).',
        'Interest rate remains fixed throughout the selected loan term.',
        'Property taxes and insurance premiums remain constant over time in baseline projections (actual municipal taxes may adjust annually).',
        'Private Mortgage Insurance (PMI) is not included in baseline P&I and is typically required by lenders when the down payment is below 20%.',
      ],
      sources: [
        'Consumer Financial Protection Bureau (CFPB) — Loan Estimate & Closing Disclosure Standards',
        'Federal Reserve Board — Consumer Handbook on Adjustable-Rate and Fixed Mortgages',
        'Fannie Mae & Freddie Mac Single-Family Amortization Guidelines',
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'How to Calculate Your Mortgage Payment Accurately',
      intro: 'When financing a home, your monthly housing expenditure is rarely just the principal and interest on the borrowed amount. Most lenders establish an escrow account that bundles local property taxes and homeowners insurance into a single monthly bill (commonly referred to as PITI). Understanding every component of this payment—and how loan terms and down payments alter your lifetime borrowing costs—is essential for making confident home-buying decisions.',
      sections: [
        {
          id: 'piti-breakdown',
          heading: 'Breaking Down PITI: Principal, Interest, Taxes, and Insurance',
          body: [
            'Principal: The actual capital borrowed from the lender to buy the home. Each monthly payment reduces this remaining balance according to the loan amortization schedule.',
            'Interest: The fee charged by the lender for the capital borrowed, calculated as an annualized percentage (APR) of the outstanding principal balance. Early in a long-term mortgage, interest comprises the dominant portion of your monthly payment.',
            'Property Taxes: Levied annually by local county and municipal taxing authorities to fund public schools, roads, emergency services, and civic infrastructure. Your lender divides the estimated yearly tax bill by 12 and collects it into an escrow reserve.',
            'Homeowners Insurance: Casualty and hazard coverage protecting the physical home against damage, fire, and natural disasters. Like property taxes, this premium is escrowed in 12 equal monthly installments.',
            'Private Mortgage Insurance (PMI): On conventional mortgages, lenders usually require PMI if your down payment is less than 20% (Loan-to-Value greater than 80%). PMI protects the lender in case of default and generally adds 0.5% to 1.5% of the loan balance annually until you reach 20% equity.'
          ]
        },
        {
          id: 'loan-term-comparison',
          heading: '30-Year vs. 15-Year Mortgages: The Lifetime Interest Tradeoff',
          body: [
            'A 30-year fixed-rate mortgage spreads your repayment over 360 monthly payments. This keeps your regular monthly obligation lower and more manageable, providing greater monthly cash flow flexibility. However, because the loan balance amortizes slowly, you pay significantly more total interest over 30 years—frequently exceeding the original price of the home.',
            'A 15-year fixed-rate mortgage requires higher monthly payments (typically 25% to 35% higher for the same loan amount), but because lenders take on less duration risk, 15-year rates are often 0.5% to 0.75% lower. Crucially, you pay off the principal in half the time, saving hundreds of thousands of dollars in lifetime interest and building home equity at an accelerated pace.'
          ]
        },
        {
          id: 'amortization-mechanics',
          heading: 'The Mathematical Mechanics of Amortization',
          body: [
            'Amortization describes the mathematical process of retiring debt through scheduled, equal periodic payments. Although your total monthly principal and interest payment remains constant throughout a fixed-rate loan, the internal split between principal and interest shifts continuously.',
            'In Month 1 of a $320,000 30-year loan at 7.00% APR, the monthly interest charge is $1,866.67, meaning only $262.30 goes toward reducing your loan balance. By Year 15, the monthly interest has fallen to approximately $1,340, allowing $789 to go toward principal. By Year 25, the vast majority of each payment directly builds your home equity.'
          ]
        },
        {
          id: 'down-payment-strategy',
          heading: 'Down Payment Strategy and Loan-to-Value (LTV)',
          body: [
            'Your down payment directly determines your initial Loan-to-Value (LTV) ratio. A larger down payment produces three immediate financial benefits: it reduces the required loan principal, lowers your ongoing monthly payment, and avoids private mortgage insurance (PMI) when you contribute 20% or more.',
            'Even if you do not have 20% saved upfront, putting down 5% to 10% still lowers your monthly principal balance compared to minimum down payment programs, while allowing you to refinance or request PMI cancellation once your property appreciates or you pay down the balance to 80% LTV.'
          ]
        }
      ]
    },

    howTo: [
      'Enter the purchase price of the property you intend to buy.',
      'Specify your down payment in dollars (e.g., $80,000 for a 20% down payment on a $400,000 home).',
      'Input your annual mortgage interest rate (APR) and choose your repayment term (such as 15 or 30 years).',
      'Add your estimated annual property taxes and homeowners insurance premiums to generate a complete PITI monthly payment.',
      'Review your monthly payment breakdown, total interest cost, and the full month-by-month amortization schedule below.',
    ],

    formulaTitle: 'Mortgage Amortization Formula',
    formula: 'M = P × [r(1 + r)^n] / [(1 + r)^n − 1]',
    formulaExplanation: 'To determine your fixed monthly principal and interest payment (M), the principal loan amount (P) is multiplied by a periodic interest factor derived from your monthly interest rate (r) compounded over the total number of monthly payments (n).',
    formulaVariables: [
      { name: 'M', description: 'Monthly principal and interest payment' },
      { name: 'P', description: 'Principal loan amount (Home Price − Down Payment)' },
      { name: 'r', description: 'Monthly interest rate (Annual Interest Rate ÷ 12 ÷ 100)' },
      { name: 'n', description: 'Total number of monthly payments (Loan Term in Years × 12)' },
      { name: 'Monthly PITI', description: 'M + (Annual Property Tax ÷ 12) + (Annual Insurance ÷ 12)' },
      { name: 'Total Interest', description: '(M × n) − P' },
      { name: 'Total Cost', description: 'Down Payment + (Monthly PITI × n)' },
    ],

    examples: [
      {
        title: 'Standard 30-Year Fixed Mortgage (20% Down)',
        input: 'Price: $400,000, Down: $80,000 (20%), Rate: 7.00% APR, Term: 30 Years, Tax: $4,800/yr, Ins: $1,200/yr',
        result: 'Monthly P&I: $2,128.97 | Total Monthly PITI: $2,628.97 | Total Interest: $446,429.20 | Total Cost: $1,026,429.20',
        explanation: 'Over 30 years, borrowing $320,000 generates $446,429.20 in interest alone—substantially more than the original loan amount.'
      },
      {
        title: '15-Year Accelerated Equity Mortgage (20% Down)',
        input: 'Price: $400,000, Down: $80,000 (20%), Rate: 6.25% APR, Term: 15 Years, Tax: $4,800/yr, Ins: $1,200/yr',
        result: 'Monthly P&I: $2,743.75 | Total Monthly PITI: $3,243.75 | Total Interest: $173,875.00 | Total Cost: $663,875.00',
        explanation: 'Increasing the monthly payment by $614.78 saves $272,554.20 in lifetime interest and pays off the property 15 years sooner.'
      },
      {
        title: 'Starter Home with 5% Down Payment',
        input: 'Price: $300,000, Down: $15,000 (5%), Rate: 7.00% APR, Term: 30 Years, Tax: $3,600/yr, Ins: $1,080/yr',
        result: 'Monthly P&I: $1,896.11 | Total Monthly PITI (excl. PMI): $2,286.11 | Total Interest: $397,599.60',
        explanation: 'Financing $285,000 requires factoring in an estimated $120–$190/mo in private mortgage insurance (PMI) until you reach 20% home equity.'
      }
    ],

    additionalSections: [
      {
        id: 'common-costs',
        heading: 'Common Homeownership Costs People Often Forget',
        intro: 'Your monthly mortgage statement is only one part of total homeownership expenses. When planning a purchase budget, consider these recurring and upfront costs:',
        items: [
          {
            title: 'Upfront Closing Costs',
            description: 'Lender origination fees, appraisal, credit checks, title search, and title insurance. These typically range from 2% to 5% of the total loan amount at settlement.',
            note: 'Paid at closing; not included in monthly PITI calculation.'
          },
          {
            title: 'HOA / Condo Association Fees',
            description: 'Monthly or quarterly fees covering common area maintenance, trash, exterior amenities, and building insurance reserves. Typical ranges are $150 to $600/month.',
            note: 'Paid directly to association; lenders count this toward debt-to-income ratios.'
          },
          {
            title: 'Ongoing Home Maintenance & Capital Repairs',
            description: 'General rule of thumb is budgeting 1% to 2% of the home purchase price annually for roof repairs, plumbing, HVAC maintenance, and appliance replacements.',
            note: 'Essential emergency reserve separate from mortgage escrow.'
          },
          {
            title: 'Escrow Cushion & Property Tax Reassessments',
            description: 'Municipal property taxes can rise following a reassessment after purchase. Most lenders require an initial 2-month reserve cushion in your escrow account.',
            note: 'May cause annual adjustments in your total monthly escrow payment.'
          }
        ]
      }
    ],

    faqs: [
      {
        q: 'How is a monthly mortgage payment calculated?',
        a: 'A monthly mortgage payment is calculated using the standard amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1], where P is your loan principal (home price minus down payment), r is your monthly interest rate (annual APR ÷ 12 ÷ 100), and n is the total number of scheduled monthly payments (years × 12). Monthly property taxes and insurance premiums are then added to establish your total PITI obligation.'
      },
      {
        q: 'What does PITI stand for and why is it important?',
        a: 'PITI stands for Principal, Interest, Taxes, and Insurance. While principal and interest go toward repaying your loan, taxes and insurance cover local municipal property levies and hazard insurance. Lenders calculate your debt-to-income (DTI) ratio based on your complete PITI payment rather than principal and interest alone.'
      },
      {
        q: 'How much down payment do I need to avoid paying PMI?',
        a: 'On conventional mortgages, a down payment of at least 20% of the purchase price (80% Loan-to-Value) eliminates the requirement for Private Mortgage Insurance (PMI). If you put down less than 20%, PMI is typically added to your monthly bill until your loan principal reaches 80% of the original purchase price or appraised value.'
      },
      {
        q: 'Is a 15-year or 30-year fixed mortgage better for me?',
        a: 'A 30-year fixed mortgage provides lower, more predictable monthly payments, making it easier to qualify and providing cash flow buffer for other savings goals. A 15-year mortgage requires a higher monthly commitment but significantly cuts total interest paid over the life of the loan and builds equity much faster.'
      },
      {
        q: 'What is an amortization schedule?',
        a: 'An amortization schedule is a complete table showing the breakdown of every monthly payment over the entire life of your loan. It specifies exactly how much of each payment goes toward paying down principal balance versus paying accrued interest, as well as your remaining balance after each payment.'
      },
      {
        q: 'Can I make extra payments to pay off my mortgage early?',
        a: 'Yes, on standard conventional and government loans without prepayment penalties, making extra principal payments directly reduces your remaining loan balance. Because interest is calculated on your outstanding principal, extra payments shorten your loan term and reduce total lifetime interest.'
      },
      {
        q: 'What closing costs should I anticipate when buying a home?',
        a: 'Beyond your down payment, buyers typically pay 2% to 5% of the loan amount in closing costs. These include loan origination fees, appraisal fees, title searches, title insurance, recording fees, and initial escrow reserves for taxes and insurance.'
      },
      {
        q: 'Why does my total mortgage payment change over time?',
        a: 'Even with a fixed-rate mortgage where principal and interest never change, your total monthly payment can fluctuate if your local county adjusts property tax rates or if your homeowners insurance premium changes annually upon policy renewal.'
      }
    ],
    related: ['loan-calculator', 'rent-vs-buy-calculator', 'house-affordability-calculator', 'amortization-calculator'],
  },

  'bmi-calculator': {
    name: 'BMI Calculator',
    category: 'Health',
    icon: 'fa-heart',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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
      const healthyRangeMin = v.unit === 'imperial' ? roundTo((18.5 * heightM * heightM) / 0.453592, 1) : healthyMin;
      const healthyRangeMax = v.unit === 'imperial' ? roundTo((24.9 * heightM * heightM) / 0.453592, 1) : healthyMax;

      return {
        stats: [
          { label: 'Your BMI',          value: fmtN(bmi),            highlight: true },
          { label: 'Category',          value: cat.label,            color: cat.color },
          { label: 'Healthy Weight Range', value: `${healthyRangeMin}–${healthyRangeMax} ${weightDisplay}` },
        ],
        bmiGauge: { bmi: clampedBmi, color: cat.color, label: cat.label },
      };
    },

    methodology: {
      standards: 'Thresholds conform to official clinical guidelines established by the World Health Organization (WHO), the Centers for Disease Control and Prevention (CDC), and the National Institutes of Health (NIH).',
      summary: 'Body Mass Index (BMI) is an anthropometric screening metric defined as body mass divided by the square of body height. It provides an initial population-level estimate of weight categories but is not an individualized medical diagnosis.',
      assumptions: [
        'Standard adult weight categories apply to individuals aged 20 years and older.',
        'The calculation assumes uniform body density and does not distinguish between skeletal muscle mass, bone density, and adipose tissue.',
        'Clinical assessments should incorporate complementary markers including waist circumference, body fat percentage, and metabolic health panels.',
      ],
      sources: [
        'World Health Organization (WHO) — Body Mass Index Classification Guidelines',
        'Centers for Disease Control and Prevention (CDC) — Defining Adult BMI',
        'National Heart, Lung, and Blood Institute (NIH) — Clinical Guidelines on Obesity Identification',
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'How to Calculate Your BMI and Understand Weight Categories',
      intro: 'Body Mass Index (BMI) is a standardized screening metric used by healthcare providers and public health agencies globally to assess whether an individual falls within an expected weight range for their height. While it serves as a helpful, accessible baseline, understanding what the numbers indicate—and what limitations exist—is critical for interpreting your results responsibly.',
      sections: [
        {
          id: 'bmi-categories-explained',
          heading: 'Standard Adult BMI Classifications (WHO & CDC)',
          body: [
            'Underweight (BMI below 18.5): Indicates body weight is below the expected range for height. May be associated with nutritional deficits, reduced immune function, or underlying conditions.',
            'Normal / Healthy Weight (BMI 18.5–24.9): The statistical range associated with the lowest incidence of weight-related cardiovascular and metabolic health conditions in adult populations.',
            'Overweight (BMI 25.0–29.9): Indicates weight greater than the standard reference range. Healthcare providers generally evaluate lifestyle factors and waist measurements to assess individual risk.',
            'Obesity Class I (BMI 30.0–34.9), Class II (BMI 35.0–39.9), and Class III (BMI 40.0+): Correlated with elevated risk of hypertension, type 2 diabetes, cardiovascular disease, and sleep apnea.'
          ]
        },
        {
          id: 'clinical-limitations',
          heading: 'Important Clinical Limitations of BMI',
          body: [
            'Muscle vs. Fat Composition: Because muscle tissue is denser than adipose fat tissue, athletes, weightlifters, and muscular individuals may register an "overweight" or "obese" BMI despite having low body fat and excellent cardiovascular fitness.',
            'Age and Gender Differences: Women naturally carry higher essential body fat percentages than men at identical BMI levels. Similarly, older adults often experience sarcopenia (loss of muscle mass) while body fat increases, which may mask health risks at a "normal" BMI.',
            'Ethnicity Considerations: Research endorsed by the WHO indicates that health risks associated with obesity may begin at lower BMI thresholds (such as 23.0 for overweight and 27.5 for obesity) in certain Asian populations.'
          ]
        },
        {
          id: 'healthy-weight-targets',
          heading: 'How Healthy Weight Ranges Are Determined',
          body: [
            'Your healthy weight range is calculated by applying the normal BMI boundaries (18.5 to 24.9) to your specific height squared: Healthy Min = 18.5 × Height(m)², and Healthy Max = 24.9 × Height(m)². This gives a realistic span of healthy weights rather than a single rigid number.'
          ]
        }
      ]
    },

    howTo: [
      'Choose your preferred unit system: Metric (kilograms and centimeters) or Imperial (pounds and inches).',
      'Enter your current body weight and height.',
      'Optionally specify your age to provide demographic context.',
      'Review your calculated BMI value, color-coded classification, and customized healthy weight span on the visual gauge.',
      'Consult a licensed healthcare professional before initiating significant dietary or fitness modifications.',
    ],

    formulaTitle: 'Body Mass Index Formula',
    formula: 'BMI = Weight (kg) / [Height (m)]² | Imperial: BMI = 703 × Weight (lb) / [Height (in)]²',
    formulaExplanation: 'BMI divides total body weight by height squared. For imperial measurements, a conversion factor of 703 is applied to reconcile pounds and inches to metric kilograms per square meter.',
    formulaVariables: [
      { name: 'BMI', description: 'Body Mass Index (kg/m²)' },
      { name: 'Weight (kg)', description: 'Body mass in kilograms (or pounds converted via × 0.453592)' },
      { name: 'Height (m)', description: 'Stature in meters (or inches converted via × 0.0254)' },
      { name: 'Healthy Min Weight', description: '18.5 × [Height in meters]²' },
      { name: 'Healthy Max Weight', description: '24.9 × [Height in meters]²' },
    ],

    examples: [
      {
        title: 'Metric Reference Scenario',
        input: 'Weight: 70.0 kg, Height: 175.0 cm (1.75 m), Age: 30',
        result: 'BMI: 22.9 (Normal Weight) | Healthy Weight Range: 56.7–76.3 kg',
        explanation: 'A 70 kg individual at 175 cm falls comfortably in the center of the normal BMI range.'
      },
      {
        title: 'Imperial Reference Scenario',
        input: 'Weight: 180.0 lb, Height: 70.0 in (5 ft 10 in), Age: 35',
        result: 'BMI: 25.8 (Overweight) | Healthy Weight Range: 128.9–173.5 lb',
        explanation: 'At 180 lb, this individual is slightly above the 24.9 BMI cutoff (173.5 lb), indicating a screening recommendation to evaluate lifestyle and waist circumference.'
      },
      {
        title: 'Underweight Screening Scenario',
        input: 'Weight: 45.0 kg, Height: 162.0 cm (1.62 m), Age: 25',
        result: 'BMI: 17.1 (Underweight) | Healthy Weight Range: 48.5–65.3 kg',
        explanation: 'A BMI of 17.1 is below the 18.5 threshold, suggesting the individual is under the expected healthy weight for 162 cm.'
      }
    ],

    additionalSections: [
      {
        id: 'holistic-health-markers',
        heading: 'Comprehensive Health Indicators Beyond BMI',
        intro: 'To build an accurate assessment of health, clinical professionals typically pair BMI with these complementary metrics:',
        items: [
          {
            title: 'Waist-to-Height Ratio (WHtR)',
            description: 'Keeping your waist circumference under half your height (ratio < 0.50) is strongly correlated with lower cardiovascular and metabolic risk regardless of total weight.',
            note: 'Measures central abdominal fat distribution.'
          },
          {
            title: 'Body Fat Percentage',
            description: 'Direct measurement via DEXA scans, bioelectrical impedance, or calipers separates lean muscle mass from fat tissue.',
            note: 'Typical healthy ranges: 14–24% for men, 21–31% for women.'
          },
          {
            title: 'Cardiorespiratory Fitness',
            description: 'Aerobic endurance, muscular strength, resting heart rate, and VO2 max often provide more predictive value for longevity than scale weight alone.',
            note: 'Physical activity provides health benefits across all BMI tiers.'
          },
          {
            title: 'Metabolic & Blood Lipid Panels',
            description: 'Fasting blood glucose, HbA1c, triglycerides, HDL/LDL cholesterol, and blood pressure determine metabolic health status.',
            note: 'Essential clinical data from annual medical checkups.'
          }
        ]
      }
    ],

    faqs: [
      {
        q: 'How is Body Mass Index (BMI) calculated?',
        a: 'BMI is calculated by dividing body weight in kilograms by height in meters squared (kg/m²). For imperial measurements, multiply weight in pounds by 703 and divide by height in inches squared: BMI = (Weight in lb × 703) ÷ (Height in inches)². Our calculator automates these conversions seamlessly.'
      },
      {
        q: 'What are the official adult BMI categories?',
        a: 'According to the World Health Organization (WHO) and CDC, adult BMI is classified as: Underweight (below 18.5), Normal Weight (18.5 to 24.9), Overweight (25.0 to 29.9), and Obese (30.0 or higher).'
      },
      {
        q: 'Why can BMI be misleading for athletes and bodybuilders?',
        a: 'BMI does not differentiate between skeletal muscle and body fat. Because muscle is approximately 18% denser than fat by volume, highly trained athletes with substantial muscle mass and low body fat frequently register in the "overweight" or "obese" BMI categories.'
      },
      {
        q: 'How is the healthy weight range determined for my height?',
        a: 'The healthy weight range corresponds to the minimum (18.5) and maximum (24.9) normal BMI thresholds applied to your height. For example, for someone 175 cm tall, the range is 18.5 × (1.75)² = 56.7 kg to 24.9 × (1.75)² = 76.3 kg.'
      },
      {
        q: 'Do BMI categories differ for men and women?',
        a: 'Standard clinical BMI classification tables are identical for adult men and women. However, women naturally maintain higher essential body fat levels than men with the same BMI, which is why body composition metrics provide helpful context.'
      },
      {
        q: 'Is BMI used the same way for children and teenagers?',
        a: 'No. For children and adolescents aged 2 to 19, BMI is calculated the same way but interpreted using age-and-sex-specific growth percentiles (CDC Growth Charts) rather than fixed adult category cutoffs.'
      },
      {
        q: 'What should I do if my BMI is in the overweight or underweight category?',
        a: 'Use your BMI as an informative initial screening point rather than a definitive diagnosis. Schedule an evaluation with a primary healthcare provider who can evaluate your blood pressure, metabolic markers, lifestyle, and body composition.'
      }
    ],
    related: ['calorie-calculator', 'tdee-calculator', 'percentage-calculator'],
  },

  'percentage-calculator': {
    name: 'Percentage Calculator',
    category: 'Math',
    icon: 'fa-percent',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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

    methodology: {
      standards: 'Mathematical percentage computations adhere to fundamental arithmetic definitions, standard algebraic formulation, and strict IEEE-754 floating-point rounding precision.',
      summary: 'A percentage represents a dimensionless ratio expressed as a fraction of 100 (per centum). Calculations distinguish between relative proportional parts, multiplicative percentage multipliers, and directional rate of change.',
      assumptions: [
        'Divisions by zero are explicitly caught and flagged with informative mathematical guidance.',
        'Percentage change uses the magnitude of the baseline value (|From|) as the divisor to preserve directional consistency across positive and negative transitions.',
        'Values are computed in full floating-point precision and formatted to two standard decimal places.',
      ],
      sources: [
        'National Institute of Standards and Technology (NIST) — Mathematical and Computational Precision Reference',
        'Mathematical Association of America (MAA) — Foundations of Proportion and Ratio Analysis',
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'How to Calculate Percentages Accurately Across Every Scenario',
      intro: 'Percentages are fundamental across personal finance, retail pricing, data analysis, and academic testing. While the core concept represents parts per hundred, applying percentage formulas correctly depends entirely on whether you are determining a proportional share, calculating a portion of a whole, or analyzing growth over time.',
      sections: [
        {
          id: 'three-percentage-formulas',
          heading: 'The Three Core Percentage Calculation Modes',
          body: [
            'Proportion Mode (X is what % of Y?): Used when you know the part (X) and the whole (Y) and need to express the relationship as a percentage. The formula is (X ÷ Y) × 100. Examples include test scores (85 out of 100) or equity ownership.',
            'Portion Mode (What is X% of Y?): Used when you need to calculate the actual quantitative value of a known percentage of a total. The formula is (X ÷ 100) × Y. Examples include calculating sales tax, retail discounts, or restaurant tips.',
            'Rate of Change Mode (% Change from X to Y): Used to determine the relative percentage growth or contraction between a baseline starting value (X) and a new final value (Y). The formula is ((Y − X) ÷ |X|) × 100.'
          ]
        },
        {
          id: 'percent-change-vs-percentage-points',
          heading: 'Critical Distinction: Percent Change vs. Percentage Points',
          body: [
            'One of the most frequent errors in financial and statistical analysis is confusing percentage points with percent change.',
            'Percentage Points represent the direct arithmetic difference between two percentages (e.g., an interest rate rising from 5.0% to 7.0% is an increase of 2.0 percentage points).',
            'Percent Change represents the relative proportional increase of that change: ((7.0 − 5.0) ÷ 5.0) × 100 = a 40.0% relative increase. In economic reporting and contract agreements, using the correct metric is vital.'
          ]
        },
        {
          id: 'reverse-percentages',
          heading: 'Working Backwards: Reverse Percentage Calculations',
          body: [
            'When a price includes sales tax or an item has already been discounted, you cannot simply add or subtract that percentage to return to the original price. For example, if an item with 20% tax costs $120, the pre-tax price is $120 ÷ 1.20 = $100 (not $120 − 20% = $96).'
          ]
        }
      ]
    },

    howTo: [
      'Select the appropriate calculation mode from the dropdown menu (What % is X of Y, What is X% of Y, or % Change).',
      'Input Value A and Value B into the respective fields.',
      'The calculation executes automatically with instant formula transparency.',
      'Switch modes freely to evaluate related calculations without reloading.',
    ],

    formulaTitle: 'Percentage Formulas & Derivations',
    formula: 'Proportion: (X / Y) × 100 | Portion: (X / 100) × Y | % Change: ((New − Old) / |Old|) × 100',
    formulaExplanation: 'Every percentage formula scales a baseline proportion by 100 to convert a dimensionless decimal fraction into the universally recognized percentage format.',
    formulaVariables: [
      { name: 'X is what % of Y', description: 'Part (X) divided by Whole (Y) multiplied by 100' },
      { name: 'X% of Y', description: 'Percentage rate (X / 100) multiplied by Base Amount (Y)' },
      { name: 'Percentage Change', description: 'Difference (New − Old) divided by baseline |Old| multiplied by 100' },
    ],

    examples: [
      {
        title: 'Proportion Scenario (Exam Score)',
        input: 'Mode: X is what % of Y? | Value A: 45, Value B: 180',
        result: 'Result: 25.00% | Calculation: 45 is 25.00% of 180',
        explanation: '45 divided by 180 equals exactly 0.25, which converts to 25.00%.'
      },
      {
        title: 'Portion Scenario (Retail Tip Calculation)',
        input: 'Mode: What is X% of Y? | Value A: 15 (%), Value B: 120 ($)',
        result: 'Result: 18.00 | Calculation: 15% of 120 = 18.00',
        explanation: 'A 15% tip on a $120 bill equals $18.00, resulting in a total payment of $138.00.'
      },
      {
        title: 'Rate of Change Scenario (Business Revenue Growth)',
        input: 'Mode: % Change | Value A (From): 50,000, Value B (To): 65,000',
        result: 'Result: 30.00% increase | Difference: 15,000',
        explanation: 'Revenue grew by $15,000 over a $50,000 baseline, representing a 30.00% relative expansion.'
      }
    ],

    faqs: [
      {
        q: 'How do I calculate what percentage one number is of another?',
        a: 'Divide the specific part (X) by the total whole (Y) and multiply by 100: (X ÷ Y) × 100. For example, 45 is what percent of 180? (45 ÷ 180) × 100 = 25.00%.'
      },
      {
        q: 'How do I find a percentage of a given number?',
        a: 'Convert the percentage into a decimal by dividing by 100, then multiply by the total number: (X ÷ 100) × Y. For example, 15% of 120 = 0.15 × 120 = 18.00.'
      },
      {
        q: 'How is percentage increase or decrease calculated?',
        a: 'Subtract the old starting value from the new value, divide by the absolute value of the old starting value, and multiply by 100: ((New − Old) ÷ |Old|) × 100. A positive result indicates an increase; a negative result indicates a decrease.'
      },
      {
        q: 'What is the difference between percentage points and percentage change?',
        a: 'Percentage points measure the simple arithmetic subtraction between two percentages (e.g., 10% to 15% is a 5 percentage-point increase). Percentage change measures the relative growth: ((15 − 10) ÷ 10) × 100 = a 50% relative increase.'
      },
      {
        q: 'Why can Value B not be zero in proportion mode?',
        a: 'In mathematics, division by zero is undefined. When calculating "X is what % of Y?", Y serves as the denominator representing the total whole, which cannot be zero.'
      }
    ],
    related: ['tip-calculator', 'inflation-calculator', 'compound-interest-calculator'],
  },

  'loan-calculator': {
    name: 'Loan Calculator',
    category: 'Finance',
    icon: 'fa-sack-dollar',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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

    methodology: {
      standards: 'Formulas adhere to the federal Truth in Lending Act (Regulation Z, 12 CFR Part 1026) and Consumer Financial Protection Bureau (CFPB) lending disclosure standards.',
      summary: 'Monthly loan payments are calculated using standard fixed-rate amortization mathematics, which amortizes principal over a set number of monthly installments while computing monthly interest on the remaining unpaid balance.',
      assumptions: [
        'Interest is compounded monthly on the remaining unpaid principal balance.',
        'Payments are made monthly on equal installment dates without late fees or payment deferrals.',
        'Quoted APR is converted to monthly periodic rate as r = APR ÷ 12.'
      ],
      sources: [
        'Consumer Financial Protection Bureau (CFPB) — Loan Repayment Rules & Regulations',
        'Federal Reserve Board — Regulation Z (Truth in Lending Act, 12 CFR Part 1026)',
        'Federal Trade Commission (FTC) — Understanding Vehicle Financing & Personal Loans'
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'How to Calculate Loan Payments, Total Interest, and Total Cost',
      intro: 'Whether you are financing a vehicle, consolidating credit cards with a personal loan, or evaluating student debt, understanding your exact monthly commitment and lifetime interest expense is crucial for financial health.',
      sections: [
        {
          id: 'amortization-mechanics',
          heading: 'How Loan Amortization Functions',
          body: [
            'Fixed-rate installment loans amortize each monthly payment between accrued interest and principal reduction. Because interest is charged on the declining loan balance, early payments are interest-heavy, while later payments rapidly pay down principal.',
            'By the final scheduled installment, the loan balance reaches exactly zero.'
          ]
        },
        {
          id: 'apr-vs-interest-rate',
          heading: 'Interest Rate vs. Annual Percentage Rate (APR)',
          body: [
            'The interest rate represents the nominal cost of borrowing principal. The APR includes both the interest rate and mandatory lender origination fees, document fees, or points.',
            'When evaluating competing loan quotes, always compare APR rather than nominal rate to gauge true borrowing cost.'
          ]
        },
        {
          id: 'loan-term-tradeoffs',
          heading: 'Loan Term Trade-Offs: Monthly Payment vs. Total Cost',
          body: [
            'Extending your loan term (e.g., from 3 years to 5 or 7 years) lowers your required monthly payment, improving immediate cash flow flexibility.',
            'However, longer terms cause interest to accumulate over significantly more billing cycles, dramatically increasing total lifetime borrowing cost.'
          ]
        }
      ],
    },
    howTo: [
      'Enter the loan amount you plan to borrow (the principal).',
      'Add the quoted Annual Percentage Rate (APR) from your lender.',
      'Select your desired loan term in years.',
      'Review your calculated monthly payment, total interest expense, and total repayment amount.',
      'Inspect the full amortization schedule to see the exact principal and interest split for every monthly installment.'
    ],
    examples: [
      {
        title: '5-Year Auto Loan ($30,000 at 6.5%)',
        input: 'Loan Amount: $30,000, APR: 6.5%, Term: 5 years (60 months)',
        result: 'Monthly Payment: $586.98 | Total Interest: $5,218.80 | Total Repayment: $35,218.80'
      },
      {
        title: '3-Year Personal Consolidation Loan ($15,000 at 9.0%)',
        input: 'Loan Amount: $15,000, APR: 9.0%, Term: 3 years (36 months)',
        result: 'Monthly Payment: $477.00 | Total Interest: $2,172.00 | Total Repayment: $17,172.00'
      },
      {
        title: '4-Year Used Car Loan ($20,000 at 7.0%)',
        input: 'Loan Amount: $20,000, APR: 7.0%, Term: 4 years (48 months)',
        result: 'Monthly Payment: $478.92 | Total Interest: $2,988.16 | Total Repayment: $22,988.16'
      }
    ],
    formula: {
      text: 'M = P × [r(1 + r)^n] / [(1 + r)^n − 1] | Total Interest = (M × n) − P | Total Cost = M × n',
      variables: [
        { symbol: 'M', description: 'Monthly fixed installment payment' },
        { symbol: 'P', description: 'Loan principal (initial borrowed amount)' },
        { symbol: 'r', description: 'Monthly interest rate (Annual APR ÷ 12 ÷ 100)' },
        { symbol: 'n', description: 'Total number of monthly payments (Loan term in years × 12)' },
        { symbol: 'Total Cost', description: 'Sum of all monthly payments over the entire loan life' }
      ]
    },
    faqs: [
      { q: 'How is a loan payment calculated?', a: 'Fixed loan installments are calculated using standard amortization: M = P × [r(1+r)^n] / [(1+r)^n − 1], where P is principal, r is monthly interest (APR ÷ 12), and n is total monthly payments. This ensures equal payments throughout the term that amortize principal to zero.' },
      { q: 'What is the difference between APR and interest rate?', a: 'The interest rate represents the direct fee for borrowing principal, while APR (Annual Percentage Rate) incorporates the interest rate plus lender origination fees, processing charges, and closing costs. APR is the true metric for comparing loan offers.' },
      { q: 'How does loan term affect total interest?', a: 'A longer term lowers monthly payments by spreading principal across more months, but increases total interest paid because balance declines more slowly. For example, a $30,000 loan at 6.5% costs $3,114 in interest over 3 years versus $5,216 over 5 years.' },
      { q: 'Can I pay off my loan early without penalty?', a: 'Most modern auto and personal loans permit prepayment without penalty, allowing extra principal payments to reduce total interest. However, always review your loan agreement for prepayment penalties or rule-of-78s interest calculation terms before making extra payments.' },
      { q: 'How does credit score affect loan interest rates?', a: 'Credit scores directly determine lender risk tiers. Borrowers with excellent credit (740+) typically secure APRs several percentage points lower than borrowers in fair or poor tiers, saving thousands in interest over the life of a loan.' },
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
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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

    methodology: {
      standards: 'Calculations adhere to Federal Reserve Regulation DD (Truth in Savings, 12 CFR Part 1030), FINRA investment projection guidelines, and standard continuous and discrete compounding mathematical models.',
      summary: 'Compound interest computes future investment accumulation by capitalizing interest back into the principal balance at discrete recurring compounding intervals, combined with ordinary annuity contribution mechanics.',
      assumptions: [
        'Contributions are added at the conclusion of each period (ordinary annuity model).',
        'Nominal annual interest rate is assumed uniform across the entire compounding horizon without tax drag or management fee subtractions.',
        'Daily compounding utilizes a standard 365-day calendar year convention.'
      ],
      sources: [
        'Federal Reserve Board — Regulation DD (Truth in Savings Act, 12 CFR Part 1030)',
        'Financial Industry Regulatory Authority (FINRA) — Savings & Compound Growth Mathematics',
        'U.S. Securities and Exchange Commission (SEC) — Compound Interest Calculations Guide'
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'How Compound Interest Works and How to Calculate Future Investment Growth',
      intro: 'Compound interest is the foundational mathematical engine behind long-term wealth accumulation. Unlike simple interest—which generates yields solely on initial principal—compound interest accrues on both the initial capital and all previously accumulated interest. Over multi-decade investment horizons, the exponential return curve overtakes direct contributions as the primary driver of balance growth.',
      sections: [
        {
          id: 'compounding-frequency-mechanics',
          heading: 'How Compounding Frequency Affects Effective Annual Yield (APY)',
          body: [
            'Compounding frequency specifies how many times each year accrued interest is capitalized into your principal balance. The more frequently interest is credited, the faster that new interest begins generating its own return.',
            'The exact conversion between nominal annual interest rate (APR) and effective annual percentage yield (APY) is: APY = (1 + r / n)^n - 1, where r is the nominal APR and n is compounding periods per year.',
            'For a $10,000 balance at 8.0% APR: Annual compounding yields $800.00 (8.00% APY); Monthly compounding yields $830.00 (8.30% APY); Daily compounding yields $832.78 (8.33% APY). Over 30 years, monthly compounding produces $109,357.30 compared to $100,626.57 for annual compounding—a $8,730.73 difference purely from frequency.'
          ]
        },
        {
          id: 'rule-of-72-doubling-time',
          heading: 'The Rule of 72: Estimating Doubling Timelines',
          body: [
            'The Rule of 72 provides a rapid mathematical approximation for how many years it will take an investment balance to double at a fixed annual return: Doubling Years ≈ 72 / Annual Return Rate (%).',
            'At a 6% annual return, capital doubles in approximately 12 years (72 / 6). At 8%, it doubles in approximately 9 years (72 / 8). At 10%, it doubles in approximately 7.2 years.',
            'Over a 36-year horizon: at 6%, an initial sum doubles 3 times (8x); at 8%, it doubles 4 times (16x); at 10%, it doubles 5 times (32x). This demonstrates how small differences in average annual return create exponential divergence in final net worth.'
          ]
        },
        {
          id: 'contribution-timing-and-annuities',
          heading: 'Contribution Timing: Ordinary Annuities vs. Annuities Due',
          body: [
            'Our calculator utilizes the standard ordinary annuity formula, assuming recurring monthly contributions are deposited at the end of each payment period.',
            'Depositing contributions at the beginning of each period (annuity due) generates one additional compounding period of interest for each deposit. Over a 30-year timeframe, beginning-of-period deposits generate roughly 0.6–0.8% higher total ending value.'
          ]
        },
        {
          id: 'inflation-impact-real-vs-nominal',
          heading: 'Nominal vs. Real Returns: Factoring in Inflation',
          body: [
            'Nominal future value represents the raw dollar amount in your future account, but does not reflect future purchasing power.',
            'To project real purchasing power in today\'s dollars, subtract estimated annual inflation from your nominal expected rate (e.g., 8.0% nominal return minus 2.5% inflation equals a 5.5% real return), or apply the exact Fisher equation: Real Return = (1 + Nominal Rate) / (1 + Inflation Rate) - 1.'
          ]
        }
      ],
    },
    howTo: [
      'Enter your starting principal balance (lump sum or existing portfolio balance).',
      'Input your anticipated annual interest rate or long-term investment return percentage.',
      'Select your compounding frequency (Monthly is standard for investment accounts; Daily for high-yield cash).',
      'Specify your recurring monthly contribution amount and target investment horizon in years.',
      'Review your projected future balance, total out-of-pocket contributions, and cumulative interest earned.',
      'Inspect the year-by-year schedule and growth breakdown chart to track the tipping point where interest overtakes principal deposits.'
    ],
    examples: [
      {
        title: '30-Year Wealth Accumulation (Default)',
        input: 'Principal: $10,000, Annual Rate: 8.0%, Monthly compounding, $500/mo contribution, 30 years',
        result: 'Future Balance: $854,537.02 | Total Contributions: $190,000.00 | Total Interest Earned: $664,537.02'
      },
      {
        title: '20-Year Pure Lump-Sum Growth',
        input: 'Principal: $25,000, Annual Rate: 7.0%, Monthly compounding, $0/mo contribution, 20 years',
        result: 'Future Balance: $100,968.47 | Total Contributions: $25,000.00 | Total Interest Earned: $75,968.47'
      },
      {
        title: '5-Year High-Yield Cash Savings',
        input: 'Principal: $15,000, Annual Rate: 4.5%, Daily compounding (365/yr), $200/mo contribution, 5 years',
        result: 'Future Balance: $32,240.26 | Total Contributions: $27,000.00 | Total Interest Earned: $5,240.26'
      }
    ],
    formula: {
      text: 'FV = P × (1 + r / n)^(n × t) + PMT × [((1 + r / n)^(n × t) − 1) / (r / n)]',
      variables: [
        { symbol: 'FV', description: 'Future Value (total accumulated balance including contributions and compound interest)' },
        { symbol: 'P', description: 'Initial Principal balance deposited at inception' },
        { symbol: 'r', description: 'Nominal annual interest rate expressed in decimal form (e.g., 8% = 0.08)' },
        { symbol: 'n', description: 'Compounding frequency per year (1 for annual, 4 for quarterly, 12 for monthly, 365 for daily)' },
        { symbol: 't', description: 'Investment duration in years' },
        { symbol: 'PMT', description: 'Periodic recurring contribution amount adjusted to match compounding frequency' }
      ]
    },
    faqs: [
      { q: 'How is compound interest calculated?', a: 'Compound interest is calculated with the compound annuity formula FV = P × (1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) − 1) / (r/n)], where P is initial principal, r is the annual rate, n is compounding frequency per year, t is time in years, and PMT is the periodic contribution. Our calculator computes both lump-sum growth and periodic contributions simultaneously.' },
      { q: 'What is the difference between simple and compound interest?', a: 'Simple interest is calculated solely on original principal (Interest = P × r × t), meaning annual growth remains flat. Compound interest calculates returns on both initial principal and previously accumulated interest. Over 30 years at 8%, a $10,000 deposit produces $24,000 in simple interest ($34,000 total) versus $99,357.30 in monthly compound interest ($109,357.30 total).' },
      { q: 'How does compounding frequency affect growth?', a: 'More frequent compounding capitalizes interest sooner, slightly accelerating the compounding curve. At 8% APR over 30 years, a $10,000 lump sum grows to $100,626.57 with annual compounding, $107,370.26 with quarterly compounding, $109,357.30 with monthly compounding, and $110,344.60 with daily compounding.' },
      { q: 'How much will I accumulate saving $500 a month for 30 years?', a: 'At an 8.0% average annual return compounded monthly with a $10,000 starting deposit, saving $500 per month for 30 years yields a future balance of $854,537.02. Your direct out-of-pocket contributions total $190,000 ($10,000 initial + $180,000 monthly), while total compound interest earned equals $664,537.02.' },
      { q: 'What is a realistic rate of return to assume?', a: 'For long-term index fund equity investments (15+ years), historical US stock market returns average roughly 7–10% before inflation (or 5–7% after inflation). For diversified bond portfolios, expect 4–6%. For high-yield savings accounts or money market funds, expect 3–5%. Using conservative estimates provides a safer financial margin of error.' },
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
        // Real future value (today's dollars): compound each period's balance and
        // contributions at the real post-tax rate (Fisher equation). Previously the
        // whole post-tax FV was divided by a single inflation factor, which
        // over-discounted contributions made in future years and understated the
        // real buying power (ISSUE-005).
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

  'rent-vs-buy-calculator': {
    name: 'Rent vs. Buy Calculator',
    category: 'Finance',
    icon: 'fa-house-chimney',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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

    methodology: {
      standards: 'Calculations follow discounted cash flow (DCF) comparative net worth principles and housing economics guidelines from the Consumer Financial Protection Bureau (CFPB), Federal Reserve Economic Data (FRED), and National Association of Realtors (NAR).',
      summary: 'The Rent vs. Buy model compares cumulative lifecycle housing expenditures and net worth accumulation over a multi-year horizon by contrasting home equity build-up against the compounding opportunity cost of invested capital (down payment, closing costs, and monthly cash flow differentials).',
      assumptions: [
        'Mortgage principal and interest payments remain fixed throughout the loan term.',
        'Renter invests the initial down payment, purchase closing costs, and all monthly cash flow savings into an alternative portfolio compounded annually at the specified investment return rate.',
        'Maintenance, property taxes, insurance, and rent escalate annually based on user-configured inflation growth rates.',
        'Net proceeds upon sale reflect cumulative home appreciation minus transaction selling costs and realtor commissions.'
      ],
      sources: [
        'Consumer Financial Protection Bureau (CFPB) — Buying vs. Renting Evaluation Framework',
        'Federal Reserve Bank of St. Louis (FRED) — Case-Shiller Home Price Indices & Rent Inflation Series',
        'National Association of Realtors (NAR) — Real Estate Transaction Costs & Historical Appreciation Trends'
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'The Complete Guide to the Rent vs. Buy Financial Decision',
      intro: 'The rent vs. buy question is one of the most consequential personal finance decisions. It extends far beyond comparing a monthly rent check to a mortgage statement—it requires evaluating equity buildup, opportunity cost of capital, transaction fees, property maintenance, tax effects, and how time horizon alters net worth.',
      sections: [
        {
          id: 'when-buying-makes-sense',
          heading: 'When Buying Makes Financial Sense',
          body: [
            'Buying typically produces superior financial outcomes when you plan to stay in the home for 7 or more years, local property appreciation remains stable, rent inflation is persistent, and monthly ownership outlays are comparable to area rent.',
            'Fixed-rate mortgages lock in your principal and interest payment for up to 30 years while market rents compound upward. Each payment amortizes loan principal, steadily building home equity that you recapture upon sale.'
          ]
        },
        {
          id: 'when-renting-makes-sense',
          heading: 'When Renting and Investing Outperforms',
          body: [
            'Renting frequently wins over shorter horizons (under 5 years), when career or life mobility is prized, or when home prices are high relative to rents.',
            'Renting eliminates closing costs, selling friction, property taxes, and surprise maintenance liabilities. If the capital required for a down payment and transaction fees is invested in diversified index funds, compound market returns can outpace real estate equity gains.'
          ]
        },
        {
          id: 'opportunity-cost-mechanics',
          heading: 'Understanding the Opportunity Cost of Capital',
          body: [
            'Purchasing a home locks up significant capital in a down payment (e.g., $90,000 on a $450,000 property) plus closing costs (typically $10,000–$15,000).',
            'Our engine models the opportunity cost by assuming that identical capital is invested at your expected portfolio return rate. The calculator tracks both paths month by month to identify which strategy produces higher ending net worth.'
          ]
        },
        {
          id: 'the-5-percent-rule',
          heading: 'The 5% Rule of Thumb for Housing',
          body: [
            'The 5% rule provides a rapid heuristic: if the total non-recoverable annual cost of owning (estimated as ~1% property tax + ~1% maintenance + ~3% cost of capital/interest) exceeds your annual rent, renting may be financially advantageous on cash flow.',
            'Multiply the target home value by 5% and divide by 12. If comparable rent is lower than this break-even threshold, renting allows you to invest the difference.'
          ]
        },
        {
          id: 'hidden-costs-of-ownership',
          heading: 'The Friction and Hidden Costs of Ownership',
          body: [
            'Homeowners face significant non-equity expenses: purchase closing costs (2–5%), ongoing property taxes (1–2% annually), homeowners insurance, HOA fees, routine maintenance (1–2% annually), and selling commissions (5–6% realtor fees plus transfer taxes upon disposition).',
            'Because transaction fees are paid at both purchase and sale, short tenure often results in net losses even if property values appreciate slightly.'
          ]
        },
        {
          id: 'breakeven-timeline-factors',
          heading: 'Key Factors Determining Your Break-Even Year',
          body: [
            'The break-even year is the exact point where cumulative net worth from buying crosses and surpasses renting.',
            'Higher mortgage rates and higher investment returns extend the break-even timeline further into the future, whereas higher rent inflation and higher home appreciation accelerate the break-even milestone.'
          ]
        }
      ],
    },
    howTo: [
      'Enter the target home purchase price and choose your down payment (percentage or dollar amount).',
      'Specify your mortgage interest rate, loan term, current monthly rent, and anticipated tenure in years.',
      'Set expected annual rent inflation, home appreciation, and investment return percentages.',
      'Expand "Advanced Options" to refine property taxes, insurance, HOA fees, maintenance reserves, and closing costs.',
      'Review your financial summary dashboard, break-even year, interactive net worth charts, and year-by-year comparison table.',
      'Follow personalized recommendations and explore complementary mortgage and affordability tools.'
    ],
    examples: [
      {
        title: 'Young Professional Short Tenure (Renting Wins)',
        input: 'Home: $350,000, 10% down, 6.5% rate, $1,800 rent, 3-year horizon, 8% investment return',
        result: 'Renting wins. High transaction friction (closing + selling fees) and a short horizon make buying uneconomical; investing capital yields higher net worth.'
      },
      {
        title: 'Long-Term Family Purchase (Buying Wins)',
        input: 'Home: $500,000, 20% down, 6.0% rate, $2,400 rent, 15-year horizon, 3.5% appreciation',
        result: 'Buying wins decisively. Long tenure amortizes upfront transaction costs and accumulates substantial equity and appreciation.'
      },
      {
        title: 'High Rent Growth Environment (Early Break-Even)',
        input: 'Home: $450,000, 20% down, 6.25% rate, $2,500 rent, 5.0% annual rent inflation, 8 years',
        result: 'Buying reaches break-even rapidly by Year 3 as compounding rent hikes outpace fixed mortgage costs.'
      }
    ],
    formula: {
      text: 'Net Worth (Buy) = Home Value − Mortgage Balance − Selling Costs | Net Worth (Rent) = Invested Down Payment & Cash Flow Savings × (1 + r)^t − Cumulative Rent',
      variables: [
        { symbol: 'Home Value', description: 'Initial purchase price compounded by annual appreciation rate over t years' },
        { symbol: 'Mortgage Balance', description: 'Remaining amortized loan principal balance at year t' },
        { symbol: 'Selling Costs', description: 'Realtor commissions and transfer costs deducted upon home disposition (5-7%)' },
        { symbol: 'Invested Capital', description: 'Down payment, closing costs, and monthly cash flow differentials invested at portfolio rate r' },
        { symbol: 'Cumulative Rent', description: 'Sum of all monthly rent payments compounded by annual rent inflation' }
      ]
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
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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

    methodology: {
      standards: 'Underwriting models conform to Fannie Mae (Desktop Underwriter), Freddie Mac (Loan Product Advisor), Federal Housing Administration (FHA Handbook 4000.1), and Department of Veterans Affairs (VA Lenders Handbook M26-7) debt-to-income underwriting ratios.',
      summary: 'House affordability is calculated by determining the binding maximum allowable monthly housing expenditure under dual front-end and back-end debt-to-income (DTI) constraints, subtracting taxes, insurance, and HOA dues, and solving for the maximum amortized mortgage loan capacity based on present value formulas.',
      assumptions: [
        'Gross monthly income serves as the baseline for all qualifying ratio calculations.',
        'Front-end ratio includes Principal, Interest, Property Taxes, Homeowners Insurance (PITI), and HOA fees.',
        'Back-end ratio encompasses total housing costs plus recurring monthly minimum debt obligations (auto loans, student debt, credit card minimums).',
        'Final purchase power equals calculated maximum borrowing capacity plus available cash down payment.'
      ],
      sources: [
        'Fannie Mae — Selling Guide: B3-6-02, Debt-to-Income Ratios',
        'U.S. Department of Housing and Urban Development (HUD) — FHA Single Family Housing Policy Handbook 4000.1',
        'Consumer Financial Protection Bureau (CFPB) — Qualified Mortgage Rule & DTI Standards'
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'How to Calculate How Much House You Can Afford',
      intro: 'Determining your home purchasing power requires balancing how much a lender will legally approve against what your monthly budget can comfortably sustain. Mortgage lenders evaluate affordability primarily through Debt-to-Income (DTI) ratios.',
      sections: [
        {
          id: 'front-end-vs-back-end-dti',
          heading: 'Front-End vs. Back-End DTI Ratios',
          body: [
            'Front-End DTI (Housing Ratio): The percentage of your gross monthly income dedicated exclusively to housing expenses (Principal, Interest, Property Taxes, Homeowners Insurance, and HOA dues).',
            'Back-End DTI (Total Debt Ratio): The percentage of gross monthly income required to service all recurring debt obligations combined—including housing, car payments, student loans, and credit card minimums.',
            'Lenders enforce the more restrictive of the two limits to ensure borrowers do not become house-poor.'
          ]
        },
        {
          id: 'conventional-28-36-rule',
          heading: 'The Conventional 28/36 Underwriting Standard',
          body: [
            'Conventional conforming loans backed by Fannie Mae and Freddie Mac traditionally cap front-end housing costs at 28% and total back-end debt at 36% of gross monthly income.',
            'If you carry significant consumer or auto debt, the 36% back-end ceiling will reduce your allowable housing payment even if your front-end ratio is well below 28%.'
          ]
        },
        {
          id: 'fha-va-guidelines',
          heading: 'FHA 31/43 and VA Loan Guidelines',
          body: [
            'FHA loans allow more generous underwriting thresholds—typically 31% front-end and 43% back-end—allowing buyers with higher existing debt or lower down payments (as low as 3.5%) to qualify.',
            'VA loans for qualifying military service members and veterans generally evaluate a 41% back-end DTI benchmark combined with a mandatory residual income test to verify sufficient living capital after debt service.'
          ]
        },
        {
          id: 'down-payment-interest-rate-impact',
          heading: 'How Down Payments and Interest Rates Shape Buying Power',
          body: [
            'Every dollar added to your down payment directly expands your top-line purchase price without increasing your monthly borrowing obligation.',
            'Conversely, higher interest rates consume a larger share of your qualifying monthly payment in interest, reducing maximum loan size. For example, a 1% rate increase reduces maximum loan affordability by approximately 9–11%.'
          ]
        }
      ],
    },
    howTo: [
      'Enter your annual gross household income (before taxes) and total monthly recurring debt payments.',
      'Input your total cash saved for a down payment.',
      'Specify your loan term in years and estimated mortgage interest rate.',
      'Enter expected property tax rate, homeowners insurance, and monthly HOA or condo fees.',
      'Choose your lender qualification rule (Conventional 28/36, FHA 31/43, VA 41%, or Aggressive 36/45).',
      'Review your recommended target home price, maximum loan balance, and itemized monthly PITI payment.',
      'Examine the purchase capability comparison table to view conservative, target, and aggressive borrowing limits.'
    ],
    examples: [
      {
        title: 'Conventional First-Time Homebuyer (Default)',
        input: 'Gross Income: $105,000/yr ($8,750/mo), Debt: $500/mo, Down: $60,000, Rate: 6.75%, 30yr, 28/36 Rule',
        result: 'Affordable Home Price: $354,821 | Max Loan: $294,821 | Monthly PITI: $2,450.00 | Front DTI: 28.0% | Back DTI: 33.7%'
      },
      {
        title: 'FHA Buyer with Moderate Debt',
        input: 'Gross Income: $80,000/yr ($6,667/mo), Debt: $600/mo, Down: $25,000, Rate: 6.50%, 30yr, FHA 31/43 Rule',
        result: 'Affordable Home Price: $297,419 | Max Loan: $272,419 | Monthly PITI: $2,066.67 | Front DTI: 31.0% | Back DTI: 40.0%'
      },
      {
        title: 'VA Buyer Zero-Down Purchase',
        input: 'Gross Income: $90,000/yr ($7,500/mo), Debt: $300/mo, Down: $0, Rate: 6.25%, 30yr, VA 41% Rule',
        result: 'Affordable Home Price: $419,268 | Max Loan: $419,268 | Monthly PITI: $2,775.00 | Back DTI: 41.0%'
      }
    ],
    formula: {
      text: 'Max Housing Payment = min(Gross Monthly Income × Front-End %, (Gross Monthly Income × Back-End %) − Monthly Debt) | Max Loan = PV(Rate / 12, Term × 12, Available for P&I) | Affordable Price = Max Loan + Down Payment',
      variables: [
        { symbol: 'Front-End %', description: 'Maximum allowable percentage of gross income for housing costs (e.g., 28% for conventional)' },
        { symbol: 'Back-End %', description: 'Maximum allowable percentage of gross income for all debt service (e.g., 36% for conventional)' },
        { symbol: 'Available for P&I', description: 'Max housing payment minus monthly property taxes, insurance, and HOA fees' },
        { symbol: 'Max Loan', description: 'Present value of the amortized loan supported by Available for P&I' },
        { symbol: 'Affordable Price', description: 'Total purchase price (Max Loan amount + Cash Down Payment)' }
      ]
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
    lastReviewed: 'September 2026',
    revisionDate: '2026-09-20',
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

    methodology: {
      standards: 'Methodology incorporates empirical data from the Trinity Study (Cooley, Hubbard, and Walz, 1998), William Bengen\'s Safe Withdrawal Rate framework, and standard capital decumulation actuarial principles.',
      summary: 'The FIRE model determines the capital reserve required to sustain perpetual living expenditures based on safe withdrawal rates, calculating the exact timeline to financial independence via monthly compound growth simulations.',
      assumptions: [
        'The standard 4% withdrawal rate assumes a balanced portfolio (50–75% equities, remainder fixed income) across a 30-year retirement horizon.',
        'Accumulation phase assumes recurring monthly investments compounding continuously at constant nominal rates.',
        'Inflation projections escalate nominal target expenses to reflect future purchasing power requirements.'
      ],
      sources: [
        'Trinity University — Retirement Savings: Choosing a Withdrawal Rate That Is Sustainable (1998)',
        'Journal of Financial Planning — William Bengen: Determining Withdrawal Rates Using Historical Data',
        'Center for Retirement Research at Boston College — Financial Independence & Decumulation Models'
      ],
      lastReviewed: 'September 2026',
    },

    article: {
      id: 'how-to-calculate',
      heading: 'The Complete Guide to FIRE: Financial Independence, Retire Early',
      intro: 'The FIRE (Financial Independence, Retire Early) movement centers on achieving financial freedom through intentional living, aggressive saving, and disciplined investing in income-generating assets. Rather than retiring at traditional milestones, FIRE allows individuals to fund their living expenses indefinitely through investment returns.',
      sections: [
        {
          id: 'how-fire-works',
          heading: 'How FIRE Works: The Savings Rate Engine',
          body: [
            'The core lever of financial independence is your savings rate—the percentage of after-tax income retained and invested rather than consumed.',
            'While traditional retirement plans assume a 10–15% savings rate over 40+ working years, saving 50% of income allows you to fund one year of living expenses for every year worked. At a 70% savings rate, financial independence can be achieved in under a decade.'
          ]
        },
        {
          id: 'safe-withdrawal-rate-trinity',
          heading: 'The 4% Rule and the Trinity Study',
          body: [
            'The 4% rule originated from the 1998 Trinity Study, which backtested historical US market returns across various asset allocations. It concluded that an initial 4% withdrawal from a diversified stock/bond portfolio, adjusted annually for inflation, sustained a 95%+ success rate over a 30-year horizon.',
            'Mathematically, a 4% withdrawal rate requires a portfolio equal to 25 times your annual living expenses (FIRE Number = Annual Expenses × 25). For longer retirement spans (40–50 years), many planners recommend a conservative 3.25–3.5% withdrawal rate (28.5x to 30.7x expenses).'
          ]
        },
        {
          id: 'fire-strategies-compared',
          heading: 'Understanding FIRE Variations: Lean, Fat, Coast, and Barista',
          body: [
            'Standard FIRE: Targets your existing lifestyle with a 4% withdrawal rate (typically 25x current expenses).',
            'Lean FIRE: Targets a minimalist lifestyle with expenses typically 25–40% below average (under $40,000/year), requiring a lower target portfolio.',
            'Fat FIRE: Targets an abundant retirement with higher spending (often $100,000+/year) to support extensive travel and luxury.',
            'Coast FIRE: The milestone where your existing investment portfolio will compound to your full retirement number by age 65 without requiring further contributions; you only need to earn enough to cover current living costs.',
            'Barista FIRE: A hybrid model where part-time or freelance work covers a portion of living expenses and health insurance, significantly reducing the portfolio size needed.'
          ]
        },
        {
          id: 'sequence-of-returns-risk',
          heading: 'Sequence of Returns Risk in Early Retirement',
          body: [
            'Sequence of returns risk refers to the danger of experiencing a major market downturn in the first 3 to 5 years of retirement. Selling depreciated assets to fund living expenses permanently depletes the portfolio base.',
            'Mitigation strategies include maintaining a 1- to 2-year cash buffer, utilizing a dynamic withdrawal strategy (reducing withdrawals during market corrections), or implementing a bond tent during the retirement transition.'
          ]
        }
      ],
    },
    howTo: [
      'Enter your annual after-tax income and annual living expenses to determine your current savings rate.',
      'Specify your current investment portfolio balance and recurring monthly contribution.',
      'Set your expected annual investment return rate (7–8% nominal long-term average) and inflation rate.',
      'Select your target Safe Withdrawal Rate (4% is standard; 3.5% for extended early retirement).',
      'Choose your preferred FIRE strategy mode (Standard, Lean, Fat, Coast, or Barista) and spending adjustment.',
      'Review your calculated FIRE number, years to financial independence, estimated retirement date, and readiness score.',
      'Compare your current trajectory against the optimized scenario table to discover how minor adjustments accelerate your timeline.'
    ],
    examples: [
      {
        title: 'Standard FIRE Trajectory',
        input: 'Income: $80,000, Expenses: $40,000, Portfolio: $100,000, Monthly: $2,000, Return: 7.0%, Inflation: 2.5%, Withdrawal: 4.0%',
        result: 'FIRE Number: $1,000,000 | Years to FIRE: ~17.5 years | Savings Rate: 50.0%'
      },
      {
        title: 'Lean FIRE Minimalist Plan',
        input: 'Income: $60,000, Expenses: $25,000, Portfolio: $50,000, Monthly: $1,500, Return: 7.0%, Inflation: 2.5%, Withdrawal: 4.0%, Lean FIRE',
        result: 'FIRE Number: $468,750 | Years to FIRE: ~14.0 years | Savings Rate: 58.3%'
      },
      {
        title: 'Aggressive Early Retirement',
        input: 'Income: $120,000, Expenses: $45,000, Portfolio: $150,000, Monthly: $4,000, Return: 8.0%, Inflation: 2.5%, Withdrawal: 4.0%',
        result: 'FIRE Number: $1,125,000 | Years to FIRE: ~12.0 years | Savings Rate: 62.5%'
      }
    ],
    formula: {
      text: 'FIRE Number = Annual Retirement Expenses ÷ Safe Withdrawal Rate | Savings Rate = (Income − Expenses) ÷ Income × 100 | Inflation-Adjusted FIRE = FIRE Number × (1 + Inflation)^Years',
      variables: [
        { symbol: 'FIRE Number', description: 'Total portfolio capital required to sustain living expenses indefinitely' },
        { symbol: 'Safe Withdrawal Rate', description: 'Annual percentage withdrawn from portfolio (typically 3.5%–4.0%)' },
        { symbol: 'Savings Rate', description: 'Percentage of net income invested toward wealth accumulation' },
        { symbol: 'Annual Retirement Expenses', description: 'Projected annual living expenditures adjusted for lifestyle mode' },
        { symbol: 'Inflation-Adjusted FIRE', description: 'Future nominal dollar value required to maintain equivalent purchasing power' }
      ]
    },
    faqs: [
      { q: 'What is a good FIRE number?', a: 'A standard FIRE number is 25 times your expected annual retirement expenses, derived from the 4% safe withdrawal rule. For example, spending $40,000 per year requires a $1,000,000 portfolio ($40,000 ÷ 0.04). If you want greater safety or plan to retire before age 40, using a 3.3% withdrawal rate requires 30 times annual expenses ($1,200,000).' },
      { q: 'Is the 4% rule still valid for early retirement?', a: 'The 4% rule was modeled on a 30-year horizon. For an early retirement spanning 40 to 50 years, academic research suggests aiming for a 3.25% to 3.75% withdrawal rate to account for longer market exposure and potential low-return decades. Combining a 3.5% initial rate with flexible spending in down markets provides high longevity confidence.' },
      { q: 'How much should I save each month to retire early?', a: 'Your savings rate matters more than absolute dollar amounts. Saving 50% of your take-home pay puts you on track to retire in roughly 15–17 years; saving 65% cuts the timeline to approximately 10 years. Our calculator projects your exact timeline based on your starting portfolio, return rate, and monthly contribution.' },
      { q: 'What is Coast FIRE vs Barista FIRE?', a: 'Coast FIRE means your existing portfolio is large enough that, without another dollar contributed, it will grow via compound interest to your full retirement number by age 65. You only need to work enough to cover immediate expenses. Barista FIRE means you work part-time or in low-stress employment to cover part of your living costs and health insurance, supplementing your income with smaller portfolio withdrawals.' },
      { q: 'How does inflation affect my FIRE target?', a: 'Inflation raises the nominal cost of living over time. If your annual expenses are $40,000 today, at 2.5% inflation you will need approximately $61,700 in nominal dollars in 17.5 years to maintain the same purchasing power. Our calculator displays both your real baseline FIRE number and your inflation-adjusted future target.' },
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