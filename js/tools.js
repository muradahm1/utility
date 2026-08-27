const TOOLS = {
  "mortgage-calculator": {
    name: "Mortgage Calculator",
    category: "Finance",
    icon: "fa-house",
    iconClass: "icon-home",
    tagClass: "tag-finance",
    description: "Calculate your monthly mortgage payment, total interest paid, and full amortization schedule.",
    metaDescription: "Calculate your exact monthly mortgage payment including principal, interest, taxes, and insurance (PITI). See full amortization schedules and interest savings tips.",
    fields: [
      {
        id: "home_price",
        label: "Home Price ($)",
        type: "number",
        default: 400000,
        min: 1000,
        step: 1000,
        hint: "The total purchase price of the home you are buying."
      },
      {
        id: "down_payment",
        label: "Down Payment ($)",
        type: "number",
        default: 80000,
        min: 0,
        step: 1000,
        hint: "Cash paid upfront. A larger down payment lowers your loan amount and can help you avoid PMI (typically need 20% to skip it)."
      },
      {
        id: "interest_rate",
        label: "Annual Interest Rate (%)",
        type: "number",
        default: 7,
        min: 0.01,
        step: 0.05,
        max: 50,
        hint: "The yearly interest rate (APR) on your mortgage. US 30-year fixed rates have often ranged 6-8%."
      },
      {
        id: "loan_term",
        label: "Loan Term (years)",
        type: "select",
        default: 30,
        options: [
          {
            value: 10,
            label: "10 years"
          },
          {
            value: 15,
            label: "15 years"
          },
          {
            value: 20,
            label: "20 years"
          },
          {
            value: 25,
            label: "25 years"
          },
          {
            value: 30,
            label: "30 years"
          }
        ],
        hint: "How long you take to repay the loan. Shorter terms mean higher monthly payments but far less total interest."
      },
      {
        id: "property_tax",
        label: "Annual Property Tax ($)",
        type: "number",
        default: 4800,
        min: 0,
        step: 100,
        hint: "Yearly property tax set by your local government, spread across your monthly payments."
      },
      {
        id: "insurance",
        label: "Annual Insurance ($)",
        type: "number",
        default: 1200,
        min: 0,
        step: 100,
        hint: "Yearly homeowners insurance premium, spread across your monthly payments."
      }
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
      heading: "Everything You Need to Know About Your Monthly Mortgage Payment",
      intro: "When you take out a home loan, your monthly mortgage payment is almost always larger than just the loan repayment itself. Most lenders bundle your principal, interest, property taxes, and homeowners insurance into a single monthly bill known as PITI. Understanding how each piece works helps you budget accurately, avoid surprise costs, and potentially save tens of thousands of dollars in interest over the life of your loan.",
      sections: [
        {
          heading: "What Is PITI (Principal, Interest, Taxes, Insurance)?",
          body: "PITI represents the four standard pieces of a monthly mortgage bill. Principal is the portion that actually pays down your original loan balance. Interest is the fee the lender charges you to borrow the money. Property Taxes are assessed by your local county or city government to fund schools, roads, and emergency services. Homeowners Insurance protects your home against fire, storms, and hazards. Lenders collect the tax and insurance portions each month and hold them in an escrow account to pay the bills on your behalf when they are due."
        },
        {
          heading: "How Loan Terms Change What You Pay: 15-Year vs. 30-Year",
          body: "A 30-year fixed-rate mortgage is the most common choice because it spreads payments over 360 months, keeping your required monthly payment lower and more manageable. A 15-year fixed mortgage requires higher monthly payments because you pay off the balance in half the time, but it comes with two massive benefits: lenders usually offer lower interest rates, and you pay a fraction of the total lifetime interest. For example, borrowing $320,000 at 6.5% costs around $408,000 in interest over 30 years, compared to just $180,000 over 15 years."
        },
        {
          heading: "Private Mortgage Insurance (PMI) and How to Avoid It",
          body: "If your down payment is less than 20% of the purchase price on a conventional loan, lenders usually require Private Mortgage Insurance (PMI). PMI protects the lender if you stop making payments. It typically costs between 0.3% and 1.5% of the original loan balance each year, divided into your monthly payment. Once you pay down your loan to 80% of your home original appraised value, you can request to cancel PMI. By law, lenders must automatically drop PMI once your balance reaches 78%."
        },
        {
          heading: "How Property Taxes and Insurance Impact Your Budget",
          body: "Property taxes vary widely depending on where you live, usually ranging from 0.5% to over 2.5% of your assessed home value per year. Homeowners insurance also depends on your location, property age, and weather risks. Because both taxes and insurance premiums can rise each year, your monthly escrow payment may adjust upward over time, even if you have a fixed-rate mortgage."
        },
        {
          heading: "The Power of Making Extra Principal Payments",
          body: "Because mortgage interest is calculated based on your remaining loan balance, every extra dollar you put toward the principal immediately reduces the interest charged in all future months. Paying an extra $100 or $200 each month, or making one extra full payment per year, can shave 4 to 7 years off a 30-year loan and save you tens of thousands of dollars in interest without refinancing."
        },
        {
          heading: "Fixed-Rate vs. Adjustable-Rate Mortgages (ARMs)",
          body: "A fixed-rate mortgage locks in the same interest rate and principal payment for the entire loan life (15, 20, or 30 years), giving you complete stability. An adjustable-rate mortgage (ARM), like a 5/1 or 7/1 ARM, offers a fixed lower interest rate for an initial introductory period, after which the rate adjusts periodically based on market benchmark rates. ARMs can be useful if you know you will sell or refinance before the rate resets, but they carry the risk of higher payments if rates rise."
        },
        {
          heading: "Understanding Closing Costs and Discount Points",
          body: "Buying a home comes with one-time closing costs that typically total 2% to 5% of the loan amount. These include appraisal fees, title insurance, attorney fees, and lender origination fees. You may also choose to buy \"discount points\" upfront. One point equals 1% of the loan amount and permanently lowers your mortgage rate by about 0.25%, saving interest if you plan to keep the loan for many years."
        },
        {
          heading: "How Lenders Evaluate Your Application",
          body: "Lenders evaluate your credit score, employment stability, down payment, and Debt-to-Income (DTI) ratio. Most lenders look for a credit score of at least 620 for conventional loans (or 580 for FHA loans) and prefer that your total monthly debt payments (including your new mortgage) stay under 36% to 43% of your gross monthly income."
        }
      ]
    },
    howTo: [
      "Enter the full purchase price of the home you plan to buy.",
      "Enter your down payment in dollars. Putting down 20% eliminates the need for monthly PMI.",
      "Input the annual interest rate (APR) quoted by lenders.",
      "Select your loan term in years (standard options are 15, 20, or 30 years).",
      "Add estimated annual property taxes and homeowners insurance to see your true PITI monthly payment.",
      "Review your total monthly payment, interest paid over the life of the loan, and your month-by-month amortization schedule."
    ],
    examples: [
      {
        title: "Starter Home (30-Year Fixed)",
        input: "Price: $350,000 | Down Payment: $70,000 (20%) | Rate: 6.5% | Taxes: $4,200/yr | Insurance: $1,200/yr",
        result: "Monthly PITI: ~$2,220 (Principal & Interest: $1,770 | Tax & Ins: $450)"
      },
      {
        title: "15-Year Term Fast Payoff",
        input: "Price: $350,000 | Down Payment: $70,000 (20%) | Rate: 5.8% | Term: 15 Years",
        result: "Monthly PITI: ~$2,785 | Lifetime Interest Saved: ~$185,000 vs. 30-Year"
      },
      {
        title: "Low Down Payment (5% Down)",
        input: "Price: $400,000 | Down Payment: $20,000 (5%) | Rate: 6.75% | Term: 30 Years",
        result: "Monthly PITI: ~$2,965 (Includes estimated PMI & escrow)"
      },
      {
        title: "High-Value Home (20% Down)",
        input: "Price: $750,000 | Down Payment: $150,000 (20%) | Rate: 6.25% | Term: 30 Years",
        result: "Monthly PITI: ~$4,495 (Principal & Interest: $3,695 | Tax & Ins: $800)"
      }
    ],
    formula: "Monthly Payment (P&I) = P × [r(1+r)^n] / [(1+r)^n − 1] + (Annual Tax / 12) + (Annual Insurance / 12), where P is loan principal, r is monthly rate (APR / 12), and n is total months (years × 12).",
    faqs: [
      {
        q: "What is included in a monthly mortgage payment?",
        a: "A standard mortgage payment includes four main parts (PITI): Principal (paying off the loan balance), Interest (the lender fee), Property Taxes (local government fees), and Homeowners Insurance. If you put down less than 20%, it may also include Private Mortgage Insurance (PMI)."
      },
      {
        q: "How is mortgage interest calculated?",
        a: "Mortgage interest is calculated monthly based on your remaining loan balance. Each month, your balance is multiplied by your annual interest rate divided by 12. Early in the loan, when the balance is highest, most of your payment goes to interest. As the balance drops, more of each payment goes to principal."
      },
      {
        q: "What is an amortization schedule?",
        a: "An amortization schedule is a complete table showing every payment over the entire loan term. It details how much of each payment goes to principal versus interest and shows your remaining loan balance after every single month."
      },
      {
        q: "What is the difference between APR and interest rate?",
        a: "The interest rate is the base cost to borrow the loan balance each year. The APR (Annual Percentage Rate) includes both the interest rate plus other lender fees, points, and closing costs spread over the loan term. APR represents the true total annual cost of the loan."
      },
      {
        q: "How much down payment do I really need to buy a house?",
        a: "While 20% down eliminates PMI, you can buy a home with much less. Conventional loans often allow down payments as low as 3% to 5%, FHA loans require 3.5%, and VA or USDA loans offer 0% down for eligible borrowers."
      },
      {
        q: "Can I pay off my mortgage early without penalty?",
        a: "Most standard residential mortgages today do not have prepayment penalties, meaning you can make extra principal payments or pay off the loan in full whenever you want. Always verify your loan disclosure document to confirm."
      },
      {
        q: "How do bi-weekly mortgage payments work?",
        a: "With a bi-weekly plan, you pay half your monthly mortgage payment every two weeks. Because there are 52 weeks in a year, you make 26 half-payments, which equals 13 full payments each year. That extra payment goes directly to principal, shortening a 30-year mortgage by roughly 4 to 6 years."
      },
      {
        q: "What is an escrow account for a mortgage?",
        a: "An escrow account is a special holding account managed by your mortgage servicer. Each month, a portion of your payment is set aside in escrow to pay your annual property taxes and homeowners insurance premiums when the bills come due."
      },
      {
        q: "Why did my monthly mortgage payment increase on a fixed-rate loan?",
        a: "Even with a fixed interest rate, your overall monthly payment can rise if your local property taxes increase or your homeowners insurance premium goes up, which raises your monthly escrow requirement."
      },
      {
        q: "Is a 15-year or 30-year mortgage better for me?",
        a: "A 30-year mortgage is ideal if you want lower required monthly payments and maximum monthly budgeting flexibility. A 15-year mortgage is better if your income easily supports higher monthly payments and your priority is getting debt-free fast and minimizing interest."
      },
      {
        q: "What credit score is needed to qualify for a good mortgage rate?",
        a: "Conventional loans usually require a minimum score of 620, but the best rates and lowest PMI costs typically go to borrowers with credit scores of 740 and above. FHA loans accept scores down to 580 (or 500 with 10% down)."
      },
      {
        q: "What are discount points and should I buy them?",
        a: "Discount points are prepaid interest where you pay 1% of the loan amount upfront to lower your interest rate by roughly 0.25%. They make financial sense if you plan to stay in the home longer than the break-even period (usually 4 to 7 years)."
      },
      {
        q: "How does my down payment affect my monthly payment?",
        a: "A larger down payment reduces your loan principal, which lowers your required monthly payment, cuts your lifetime interest costs, and can eliminate monthly PMI once you reach 20% down."
      },
      {
        q: "What is Debt-to-Income (DTI) ratio in mortgage lending?",
        a: "DTI is the percentage of your gross monthly income that goes toward paying monthly debts (including your future mortgage payment, car loans, student loans, and credit card minimums). Most lenders prefer a total DTI of 36% to 43% or lower."
      },
      {
        q: "Can I refinance my mortgage if interest rates drop later?",
        a: "Yes. When market interest rates drop, you can replace your existing loan with a new one at a lower rate to reduce your monthly payment or shorten your loan term. You will need to weigh the closing costs of refinancing against your monthly savings."
      }
    ],
    metaTitle: "Mortgage Calculator | Monthly Payment, PITI & Amortization — GetCalcu",
    keywords: [
      "mortgage calculator",
      "monthly mortgage payment",
      "piti calculator",
      "home loan calculator",
      "amortization schedule mortgage",
      "mortgage interest calculator",
      "15 vs 30 year mortgage",
      "how much is mortgage payment",
      "down payment mortgage calculator",
      "mortgage payoff calculator",
      "property tax and insurance calculator",
      "house payment estimator"
    ],
    related: [
      "house-affordability-calculator",
      "rent-vs-buy-calculator",
      "amortization-calculator",
      "loan-calculator",
      "compound-interest-calculator",
      "budget-planner"
    ]
  },
  "bmi-calculator": {
    name: "BMI Calculator",
    category: "Health",
    icon: "fa-heart",
    iconClass: "icon-health",
    tagClass: "tag-health",
    description: "Calculate your Body Mass Index (BMI) and find out your healthy weight range.",
    metaDescription: "Free BMI calculator — instantly calculate your Body Mass Index, health category, and ideal weight range.",
    fields: [
      {
        id: "unit",
        label: "Unit System",
        type: "select",
        default: "metric",
        options: [
          {
            value: "metric",
            label: "Metric (kg / cm)"
          },
          {
            value: "imperial",
            label: "Imperial (lb / in)"
          }
        ],
        hint: "Choose Metric (kilograms / centimeters) or Imperial (pounds / inches)."
      },
      {
        id: "weight",
        label: "Weight",
        type: "number",
        default: 70,
        min: 1,
        step: 0.1,
        hint: "Your body weight, entered in the unit system selected above."
      },
      {
        id: "height",
        label: "Height",
        type: "number",
        default: 175,
        min: 1,
        step: 0.1,
        hint: "Your height, entered in the unit system selected above."
      },
      {
        id: "age",
        label: "Age",
        type: "number",
        default: 30,
        min: 1,
        max: 120,
        step: 1,
        hint: "Your age. BMI categories are the same for adults of all ages, but age gives context to your result."
      }
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
      heading: "How to Calculate Your BMI and Understand Your Weight Category",
      intro: "Body Mass Index (BMI) is a widely used screening tool that estimates body fat from your height and weight. The GetCalcu BMI Calculator instantly computes your BMI, classifies it, and shows your healthy weight range — in metric or imperial units.",
      sections: [
        {
          heading: "What the BMI Categories Mean",
          body: "A BMI below 18.5 is Underweight, 18.5–24.9 is Normal Weight, 25–29.9 is Overweight, and 30 or above is Obese. These ranges are the same for adult men and women of all ages, though BMI does not directly measure body fat or muscle mass."
        },
        {
          heading: "Limitations of BMI",
          body: "BMI does not distinguish between muscle and fat, so very muscular athletes may score \"Overweight\" despite low body fat. It is a useful starting point, not a complete health picture — combine it with waist measurement and body fat percentage for a fuller assessment."
        }
      ]
    },
    howTo: [
      "Choose your unit system — Metric (kg and cm) or Imperial (lb and in).",
      "Enter your weight and height in the selected units.",
      "Optionally add your age for extra context (categories are the same for all adults).",
      "Read your BMI value and color-coded category on the gauge.",
      "Use the healthy weight range to set a realistic target."
    ],
    examples: [
      {
        title: "Average Adult (Metric)",
        input: "Weight: 70 kg, Height: 175 cm",
        result: "BMI: 22.9 — Normal Weight"
      },
      {
        title: "Imperial Units",
        input: "Weight: 180 lb, Height: 70 in",
        result: "BMI: 25.8 — Overweight"
      }
    ],
    formula: "BMI = Weight (kg) / Height (m)² | Imperial: BMI = 703 × Weight (lb) / Height (in)² | Healthy Range: 18.5–24.9",
    faqs: [
      {
        q: "How is BMI calculated?",
        a: "BMI is calculated as weight in kilograms divided by height in meters squared (kg/m²). In imperial units, the formula is 703 × weight in pounds ÷ height in inches squared. Our calculator handles both unit systems automatically."
      },
      {
        q: "What is a healthy BMI range?",
        a: "A healthy BMI for adults is between 18.5 and 24.9 (Normal Weight). A BMI of 25–29.9 is classified as Overweight, and 30 or above as Obese. Below 18.5 is considered Underweight. These thresholds are set by the World Health Organization."
      },
      {
        q: "Is BMI accurate for athletes and muscular people?",
        a: "BMI does not distinguish muscle from fat, so heavily muscled athletes may register as \"Overweight\" or \"Obese\" despite having low body fat. For athletic builds, body fat percentage and waist-to-hip ratio are more accurate indicators of health than BMI alone."
      },
      {
        q: "What BMI is considered obese?",
        a: "A BMI of 30 or higher is classified as obese. Class I obesity is 30–34.9, Class II is 35–39.9, and Class III (severe) is 40 or above. Obesity is associated with increased risk of heart disease, type 2 diabetes, and other conditions."
      },
      {
        q: "Does BMI differ for men and women?",
        a: "No — the BMI categories and formula are the same for adult men and women. However, women naturally carry more body fat at the same BMI, and older adults tend to have more body fat at the same BMI than younger adults."
      }
    ]
  },
  "percentage-calculator": {
    name: "Percentage Calculator",
    category: "Math",
    icon: "fa-percent",
    iconClass: "icon-math",
    tagClass: "tag-math",
    description: "Quickly find what percent one number is of another, calculate percentage increase or decrease, and more.",
    metaDescription: "Free percentage calculator — find percentages, percent change, and compute values instantly.",
    fields: [
      {
        id: "mode",
        type: "select",
        default: "what-percent",
        options: [
          {
            value: "what-percent",
            label: "X is what % of Y?"
          },
          {
            value: "percent-of",
            label: "What is X% of Y?"
          },
          {
            value: "change",
            label: "% Change (from X to Y)"
          }
        ],
        hint: "Pick the type of percentage calculation you want to perform."
      },
      {
        id: "val_a",
        label: "Value A",
        type: "number",
        default: 50,
        min: -99999999,
        step: 1,
        hint: "The first value. Its meaning changes based on the mode chosen above."
      },
      {
        id: "val_b",
        label: "Value B",
        type: "number",
        default: 200,
        min: -99999999,
        step: 1,
        hint: "The second value. Its meaning changes based on the mode chosen above."
      }
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
      heading: "How to Calculate Percentages Quickly and Accurately",
      intro: "Percentages are everywhere — discounts, tips, taxes, grades, and statistics. The GetCalcu Percentage Calculator handles three common calculations in one tool: \"X is what % of Y?\", \"What is X% of Y?\", and percentage change between two values.",
      sections: [
        {
          heading: "The Three Percentage Modes",
          body: "\"X is what % of Y?\" divides X by Y and multiplies by 100. \"What is X% of Y?\" multiplies Y by X/100. \"% Change\" subtracts the old value from the new, divides by the old value, and multiplies by 100 — a positive result means increase, negative means decrease."
        },
        {
          heading: "Common Percentage Mistakes",
          body: "A common error is confusing percentage points with percent change. If a rate rises from 10% to 15%, that is a 5 percentage-point increase but a 50% relative increase. Always confirm which comparison you need before calculating."
        }
      ]
    },
    howTo: [
      "Select the calculation mode you need from the dropdown.",
      "Enter Value A and Value B as prompted for that mode.",
      "The result updates instantly — no need to press calculate.",
      "Switch modes to solve a different type of percentage problem.",
      "Use negative values when working with losses or decreases."
    ],
    examples: [
      {
        title: "Test Score to Percentage",
        input: "Mode: X is what % of Y? | A: 85, B: 100",
        result: "85%"
      },
      {
        title: "Discount on a Price",
        input: "Mode: What is X% of Y? | A: 20, B: 250",
        result: "$50 off — pay $200"
      },
      {
        title: "Salary Increase",
        input: "Mode: % Change | A: 50000, B: 55000",
        result: "+10% increase"
      }
    ],
    formula: "X is what % of Y = (X / Y) × 100 | X% of Y = (X / 100) × Y | % Change = ((New − Old) / Old) × 100",
    faqs: [
      {
        q: "How do I calculate what percent one number is of another?",
        a: "To find what percent X is of Y, divide X by Y and multiply by 100: (X ÷ Y) × 100. For example, 25 is what percent of 200? (25 ÷ 200) × 100 = 12.5%. Our calculator does this in the \"X is what % of Y?\" mode."
      },
      {
        q: "How do I calculate a percentage of a number?",
        a: "To calculate X% of Y, multiply Y by X divided by 100: Y × (X ÷ 100). For example, 20% of 250 = 250 × 0.20 = 50. Use the \"What is X% of Y?\" mode for this calculation."
      },
      {
        q: "How do I calculate percentage increase or decrease?",
        a: "Percentage change is calculated as ((New Value − Old Value) ÷ Old Value) × 100. A positive result is an increase and a negative result is a decrease. For example, a change from 50 to 65 = ((65−50) ÷ 50) × 100 = 30% increase."
      },
      {
        q: "How do I calculate a discount percentage?",
        a: "To find a discount, calculate the percentage of the original price, then subtract it. For a 25% discount on an $80 item: 25% of $80 = $20, so the sale price is $80 − $20 = $60. Use \"What is X% of Y?\" mode to find the discount amount."
      },
      {
        q: "What is the difference between percentage points and percent change?",
        a: "Percentage points measure the absolute difference between two percentages, while percent change measures the relative difference. If an interest rate rises from 5% to 7%, that is a 2 percentage-point increase but a 40% relative increase ((7−5) ÷ 5 × 100)."
      }
    ]
  },
  "loan-calculator": {
    name: "Loan Calculator",
    category: "Finance",
    icon: "fa-sack-dollar",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate monthly loan payments, total interest, and total cost for any personal or auto loan.",
    metaDescription: "Free loan calculator to calculate monthly payments, total interest paid, and payoff schedules for personal loans, auto loans, business loans, or student debt.",
    fields: [
      {
        id: "loan_amount",
        label: "Loan Amount ($)",
        type: "number",
        default: 30000,
        min: 1,
        step: 100,
        hint: "The total amount you are borrowing (the principal)."
      },
      {
        id: "interest_rate",
        label: "Annual Interest Rate (%)",
        type: "number",
        default: 6.5,
        min: 0.01,
        step: 0.05,
        max: 50,
        hint: "The yearly interest rate (APR) charged on the loan."
      },
      {
        id: "loan_term",
        label: "Loan Term (years)",
        type: "select",
        default: 5,
        options: [
          {
            value: 1,
            label: "1 year"
          },
          {
            value: 2,
            label: "2 years"
          },
          {
            value: 3,
            label: "3 years"
          },
          {
            value: 4,
            label: "4 years"
          },
          {
            value: 5,
            label: "5 years"
          },
          {
            value: 6,
            label: "6 years"
          },
          {
            value: 7,
            label: "7 years"
          },
          {
            value: 10,
            label: "10 years"
          }
        ],
        hint: "How many years you will take to repay the loan in full."
      }
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
      heading: "How Loan Payments and Total Interest Work",
      intro: "Whether you are taking out a personal loan, financing a vehicle, or borrowing for home renovations, understanding how installment loans work is essential. The GetCalcu Loan Calculator shows you your exact monthly payment, the total amount of interest you will pay over the loan life, and how quickly you can become debt-free by adjusting terms or making extra payments.",
      sections: [
        {
          heading: "How Installment Loans Amortize Over Time",
          body: "Most consumer loans (including auto loans, personal loans, and student loans) are amortized installment loans. This means you make equal monthly payments throughout the term. In the early months, a larger share of each payment covers interest because the outstanding principal balance is high. As you pay down the balance, interest charges decrease, and more of each monthly payment goes directly to reducing principal."
        },
        {
          heading: "Loan Term vs. Total Borrowing Cost",
          body: "Choosing a longer loan term lowers your required monthly payment, making the loan feel more affordable in your monthly budget. However, stretching out payments means interest accrues over more months, drastically increasing your total borrowing cost. A shorter loan term has higher monthly payments but saves substantial money on interest and gets you out of debt years sooner."
        },
        {
          heading: "Secured Loans vs. Unsecured Loans",
          body: "A secured loan is backed by collateral, such as your vehicle for an auto loan or your house for a mortgage. Because the lender can repossess the asset if you default, secured loans carry lower interest rates. An unsecured loan (such as a personal loan or credit card) requires no collateral and relies solely on your creditworthiness, which results in higher interest rates."
        },
        {
          heading: "Understanding APR vs. Nominal Interest Rate",
          body: "The nominal interest rate is the base percentage rate charged on the loan balance. The APR (Annual Percentage Rate) includes the interest rate plus any mandatory upfront fees, such as origination fees, administrative fees, or documentation charges. Always compare loans using the APR to see the true total cost of borrowing."
        },
        {
          heading: "How Origination Fees Affect Your Payout",
          body: "Many personal loan lenders charge an origination fee (typically 1% to 8% of the loan amount), which is deducted directly from your loan proceeds before you receive the funds. If you need exactly $10,000 for a project and the lender charges a 5% origination fee, you will only receive $9,500 in cash while still owing interest on the full $10,000."
        },
        {
          heading: "How Extra Payments Save Money on Interest",
          body: "Because interest on amortized loans is calculated on the remaining principal balance, paying even a small extra amount toward principal each month shortens the repayment period and reduces total interest charges. Making bi-weekly payments or rounding up your payment amount creates meaningful interest savings over time."
        },
        {
          heading: "Fixed-Rate vs. Variable-Rate Loans",
          body: "Fixed-rate loans guarantee that your interest rate and monthly payment remain identical throughout the entire loan term, providing predictability. Variable-rate loans have rates that fluctuate with benchmark market interest rates. Variable loans may start with a lower introductory rate, but payments can increase if interest rates climb."
        },
        {
          heading: "Key Factors That Determine Your Loan Interest Rate",
          body: "Lenders set interest rates based on your credit score, debt-to-income ratio, annual income, employment history, and loan term. Borrowers with excellent credit scores (720+) receive the lowest interest rates, while lower credit scores lead to higher rates or require a co-signer to qualify."
        }
      ]
    },
    howTo: [
      "Enter the total amount of money you want to borrow (loan principal).",
      "Input the annual interest rate (APR) offered by your lender.",
      "Enter the loan term in years or months.",
      "Select your payment frequency (monthly is standard).",
      "Review your monthly payment amount, total interest paid, and total cost of the loan.",
      "Experiment with shorter loan terms to see how much interest you can save."
    ],
    examples: [
      {
        title: "New Car Auto Loan",
        input: "Loan: $28,000 | APR: 5.5% | Term: 5 Years (60 Months)",
        result: "Monthly Payment: ~$535 | Total Interest: ~$4,095"
      },
      {
        title: "Personal Debt Consolidation Loan",
        input: "Loan: $15,000 | APR: 11.0% | Term: 3 Years (36 Months)",
        result: "Monthly Payment: ~$491 | Total Interest: ~$2,680"
      },
      {
        title: "Home Improvement Loan",
        input: "Loan: $35,000 | APR: 8.25% | Term: 7 Years (84 Months)",
        result: "Monthly Payment: ~$550 | Total Interest: ~$11,180"
      },
      {
        title: "Short-Term Emergency Loan",
        input: "Loan: $5,000 | APR: 12.5% | Term: 2 Years (24 Months)",
        result: "Monthly Payment: ~$237 | Total Interest: ~$678"
      }
    ],
    formula: "Payment = P × [r(1+r)^n] / [(1+r)^n − 1], where P = Principal amount borrowed, r = Periodic interest rate (Annual Rate / 12), and n = Total number of payment periods.",
    faqs: [
      {
        q: "How is a monthly loan payment calculated?",
        a: "Loan payments are calculated using standard amortization formulas that combine your loan amount, interest rate, and total number of months. The formula ensures that fixed monthly payments will pay off both the loan principal and accrued interest down to exactly zero by the end of the term."
      },
      {
        q: "What happens if I make extra payments on my loan?",
        a: "Extra payments reduce your outstanding principal balance directly. Because future interest is calculated on a smaller balance, extra payments lower the total interest you pay and help you pay off the loan months or years ahead of schedule."
      },
      {
        q: "Are there penalties for paying off a loan early?",
        a: "Most consumer loans and auto loans do not charge prepayment penalties. However, some specialty or personal lenders charge a small fee if the loan is paid off within the first 1 to 2 years. Always check your loan agreement terms."
      },
      {
        q: "What is the difference between simple interest and amortized interest?",
        a: "Simple interest is calculated only on the original principal amount. Amortized interest is calculated on the remaining declining balance each month, where each payment splits between interest and principal reduction."
      },
      {
        q: "What is an origination fee on a personal loan?",
        a: "An origination fee is an upfront processing fee charged by the lender (often 1% to 8% of the loan). It is typically subtracted from the cash disbursed to your bank account upon funding."
      },
      {
        q: "How does my credit score affect my loan interest rate?",
        a: "Lenders use credit scores to evaluate risk. Borrowers with excellent credit (720+) receive the lowest APRs, while borrowers with fair or poor credit are charged higher interest rates to offset default risk."
      },
      {
        q: "What is the difference between a secured and unsecured loan?",
        a: "A secured loan is backed by collateral (like a vehicle or house) that the lender can seize if you default, giving it lower interest rates. An unsecured loan has no collateral requirement and carries higher rates."
      },
      {
        q: "Is it better to choose a longer or shorter loan term?",
        a: "A shorter loan term has higher monthly payments but minimizes total interest costs. A longer loan term lowers your required monthly payment but significantly increases the total interest you pay over the life of the loan."
      },
      {
        q: "What is APR and why is it higher than the interest rate?",
        a: "APR includes the interest rate plus any mandatory lender fees and closing costs expressed as an annual percentage. It shows the true comprehensive cost of taking out the loan."
      },
      {
        q: "Can I consolidate multiple debts with a single personal loan?",
        a: "Yes. Debt consolidation loans combine multiple high-interest credit card balances or bills into one single monthly payment, often with a lower interest rate and a fixed payoff timeline."
      },
      {
        q: "What is a co-signer and when do I need one?",
        a: "A co-signer is someone who legally agrees to take responsibility for repaying the loan if you fail to do so. Having a co-signer with good credit can help you qualify for loans or secure a lower rate if your credit history is limited."
      },
      {
        q: "How does loan payment frequency affect total interest paid?",
        a: "Switching to bi-weekly payments means making 26 half-payments per year (equivalent to 13 monthly payments), which pays down the principal faster and saves substantial interest compared to standard monthly payments."
      },
      {
        q: "Can a lender change my interest rate after the loan is approved?",
        a: "If you have a fixed-rate loan, your rate cannot change during the term. If you have a variable-rate loan, your interest rate and monthly payment will adjust according to market benchmark rates specified in your contract."
      },
      {
        q: "How do lenders determine if I can afford a loan?",
        a: "Lenders look at your Debt-to-Income (DTI) ratio, monthly income, employment history, and credit history to ensure your new loan payment will fit comfortably within your overall monthly budget."
      },
      {
        q: "What should I do if I struggle to make my loan payment?",
        a: "Contact your loan servicer immediately. Many lenders offer temporary hardship assistance, forbearance programs, or loan term extensions to help you avoid defaulting or damaging your credit score."
      }
    ],
    metaTitle: "Loan Calculator | Monthly Payment, Total Interest & Amortization — GetCalcu",
    keywords: [
      "loan calculator",
      "personal loan calculator",
      "auto loan calculator",
      "monthly loan payment",
      "loan interest calculator",
      "loan payment schedule",
      "simple loan calculator",
      "installment loan calculator",
      "car payment calculator",
      "loan payoff calculator",
      "total interest on loan"
    ],
    related: [
      "loan-interest-calculator",
      "mortgage-calculator",
      "amortization-calculator",
      "credit-card-payoff-calculator",
      "compound-interest-calculator",
      "budget-planner"
    ]
  },
  "date-calculator": {
    name: "Date Calculator",
    category: "Math",
    icon: "fa-calendar",
    iconClass: "icon-math",
    tagClass: "tag-math",
    description: "Calculate the number of days between two dates, or add/subtract days, weeks, months, or years from a date.",
    metaDescription: "Free date calculator — find days between dates, or add/subtract days, weeks, months and years from any date.",
    fields: [
      {
        id: "mode",
        type: "select",
        default: "between",
        options: [
          {
            value: "between",
            label: "Days between dates"
          },
          {
            value: "add",
            label: "Add/subtract from date"
          }
        ],
        hint: "Choose whether to count days between two dates or add/subtract time from a date."
      },
      {
        id: "start_date",
        label: "Start Date",
        type: "date",
        default: () => new Date().toISOString().split('T')[0],
        hint: "The starting date for your calculation."
      },
      {
        id: "end_date",
        label: "End Date",
        type: "date",
        default: () => {
        const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0];
      },
        hint: "The ending date, used when counting days between two dates."
      },
      {
        id: "add_days",
        label: "Days",
        type: "number",
        default: 0,
        min: -99999,
        max: 99999,
        step: 1,
        hint: "Days to add (positive) or subtract (negative).",
        condition: v => v.mode === 'add'
      },
      {
        id: "add_months",
        label: "Months",
        type: "number",
        default: 0,
        min: -99999,
        max: 99999,
        step: 1,
        hint: "Months to add (positive) or subtract (negative).",
        condition: v => v.mode === 'add'
      },
      {
        id: "add_years",
        label: "Years",
        type: "number",
        default: 0,
        min: -99999,
        max: 99999,
        step: 1,
        hint: "Years to add (positive) or subtract (negative).",
        condition: v => v.mode === 'add'
      }
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
      heading: "How to Calculate Days Between Dates and Add or Subtract Time",
      intro: "From project deadlines to pregnancy due dates and contract terms, calculating time spans accurately matters. The GetCalcu Date Calculator counts the days between two dates or adds and subtracts days, months, and years from any starting date — accounting for real calendar rules.",
      sections: [
        {
          heading: "Counting Days Between Two Dates",
          body: "The calculator finds the absolute difference between the start and end dates, counting full days. It correctly handles months of different lengths and leap years, so February 28 to March 1 is always 1 day (or 2 in a non-leap year bridge)."
        },
        {
          heading: "Adding and Subtracting Calendar Units",
          body: "When adding months or years, the calculator follows calendar arithmetic — adding 1 month to January 31 gives February 28 (or 29 in a leap year), not March 3. This matches how contracts and due dates are typically calculated."
        }
      ]
    },
    howTo: [
      "Choose a mode: \"Days between dates\" or \"Add/subtract from date\".",
      "For days between: pick a start date and an end date.",
      "For add/subtract: enter a start date, then the days, months, and years to add or subtract (use negative numbers to subtract).",
      "Read the result — total days, weeks, months, and the resulting date.",
      "Adjust the inputs to explore different scenarios."
    ],
    examples: [
      {
        title: "Project Duration",
        input: "Mode: Days between | Start: 2025-01-15, End: 2025-04-20",
        result: "95 days (~13.6 weeks)"
      },
      {
        title: "90-Day Deadline",
        input: "Mode: Add | Start: 2025-03-01, Add 90 days",
        result: "Due date: 2025-05-30"
      }
    ],
    formula: "Days Between = |End Date − Start Date| | Result Date = Start Date + Days + Months + Years (calendar arithmetic)",
    faqs: [
      {
        q: "How do I calculate the number of days between two dates?",
        a: "To calculate days between two dates, subtract the earlier date from the later date. The result is the number of full days between them. Our calculator does this instantly and also converts the span into weeks and months for context."
      },
      {
        q: "How many days are in a month on average?",
        a: "Averaged over a 4-year leap cycle, a month is 30.4375 days (365.25 ÷ 12). For quick estimates, 30 days per month is common, but exact day counts depend on the specific months involved. Our calculator uses exact calendar dates for precision."
      },
      {
        q: "Does the date calculator account for leap years?",
        a: "Yes. The calculator uses real calendar arithmetic, so it correctly includes February 29 in leap years. For example, the days between February 28, 2024 and March 1, 2024 is 2 days because 2024 is a leap year."
      },
      {
        q: "How do I add months to a date that does not exist?",
        a: "When adding months lands on a date that does not exist (like January 31 + 1 month = February 31), calendar arithmetic rolls back to the last valid day of the target month — February 28 or 29. Our calculator follows this standard convention."
      },
      {
        q: "How do I count business days instead of calendar days?",
        a: "This calculator counts all calendar days. To count only business days (Monday–Friday), exclude weekends manually, or subtract 2 days for every full 7-day week in the span. A dedicated business-day calculator that excludes holidays is best for precise working-day counts."
      }
    ]
  },
  "loan-interest-calculator": {
    name: "Loan Interest Calculator",
    category: "Finance",
    icon: "fa-percent",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate total interest paid on any loan with detailed amortization by payment frequency.",
    metaDescription: "Calculate the total interest cost on any loan. Compare simple vs compound interest, explore payment frequencies, and see how extra payments save money.",
    fields: [
      {
        id: "loan_amount",
        label: "Loan Amount ($)",
        type: "number",
        default: 25000,
        min: 1,
        step: 100,
        hint: "The total amount you are borrowing (the principal)."
      },
      {
        id: "interest_rate",
        label: "Annual Interest Rate (%)",
        type: "number",
        default: 5,
        min: 0.01,
        step: 0.05,
        max: 50,
        hint: "The yearly interest rate (APR) charged on the loan."
      },
      {
        id: "loan_term",
        label: "Loan Term (years)",
        type: "number",
        default: 5,
        min: 1,
        max: 50,
        step: 1,
        hint: "How many years you will take to repay the loan."
      },
      {
        id: "payment_freq",
        label: "Payment Frequency",
        type: "select",
        default: "monthly",
        options: [
          {
            value: "monthly",
            label: "Monthly (12/yr)"
          },
          {
            value: "biweekly",
            label: "Bi-Weekly (26/yr)"
          },
          {
            value: "weekly",
            label: "Weekly (52/yr)"
          },
          {
            value: "quarterly",
            label: "Quarterly (4/yr)"
          }
        ],
        hint: "How often you make payments. More frequent payments slightly reduce total interest paid."
      }
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
      heading: "How Loan Interest Is Calculated and How to Minimize It",
      intro: "Interest is the cost of borrowing money. While a loan interest rate may seem like a simple percentage, how and when that interest is calculated—whether simple interest, compound interest, or amortized periodic interest—has a dramatic impact on the real dollar amount you pay. The GetCalcu Loan Interest Calculator reveals the true cost of borrowing and helps you find ways to cut interest expenses.",
      sections: [
        {
          heading: "How Periodic Interest Accrues on Loans",
          body: "On standard installment loans, interest accrues continuously based on your remaining principal balance. Each billing cycle, the lender calculates the monthly interest rate (Annual Percentage Rate divided by 12) and multiplies it by your balance. When your loan balance is high in the beginning, the monthly interest charge is largest. As you make payments and reduce the principal, the monthly interest charge shrinks."
        },
        {
          heading: "Simple Interest vs. Compound Interest on Loans",
          body: "Simple interest is calculated solely on the original principal amount borrowed throughout the entire term. Compound interest is calculated on the principal plus any previously accumulated unpaid interest. Most amortized loans function like simple interest on a declining balance as long as you pay on time, but missed or deferred payments cause interest to capitalize, compounding your total debt."
        },
        {
          heading: "The True Cost of Borrowing: Comparing APR vs. Base Rate",
          body: "The nominal interest rate only reflects the basic borrowing fee. The Annual Percentage Rate (APR) incorporates upfront origination fees, administration fees, and closing charges. Comparing loan offers using APR gives you the accurate, apples-to-apples comparison of which loan actually costs less in interest and total fees."
        },
        {
          heading: "How Loan Term Length Multiplies Interest Charges",
          body: "A common borrowing mistake is focusing only on the monthly payment rather than the total interest paid. Extending a $20,000 loan from 3 years to 6 years at 8% APR drops the monthly payment from $627 to $351, but more than doubles the total interest paid from $2,560 to $5,280. Balancing payment affordability with term length is key to minimizing interest."
        },
        {
          heading: "How Early Principal Payments Slash Lifetime Interest",
          body: "When you make an extra payment designated toward principal, 100% of that money reduces your balance. Because future interest is calculated on that smaller remaining balance, every extra dollar pays a double dividend: it eliminates interest on that dollar for the rest of the loan term and accelerates your debt-free date."
        },
        {
          heading: "Understanding Interest Capitalization and Grace Periods",
          body: "On certain student loans and forbearance arrangements, interest may accumulate while payments are paused. If this unpaid accrued interest is added to the principal balance (known as capitalization), you end up paying interest on interest in subsequent months, increasing your debt balance."
        },
        {
          heading: "Impact of Payment Frequency on Accrued Interest",
          body: "Making bi-weekly payments instead of monthly payments results in 26 half-payments per year (equivalent to 13 full payments). This slight frequency change reduces the average principal balance faster throughout the year, saving significant interest on long-term loans like mortgages and auto financing."
        },
        {
          heading: "Strategies to Negotiate or Lower Your Interest Rate",
          body: "To secure the lowest interest rates, check your credit report for errors, pay down revolving credit card balances to improve credit utilization, set up automated payments (many lenders offer a 0.25% autopay discount), and get rate quotes from multiple lenders within a 14-day shopping window."
        }
      ]
    },
    howTo: [
      "Enter the total principal amount of your loan.",
      "Input the annual interest rate (APR) in percentage.",
      "Specify the loan term in months or years.",
      "Select your payment schedule (monthly, bi-weekly, or weekly).",
      "Review the total interest paid, total loan cost, and interest-to-principal ratio.",
      "Adjust interest rates or add extra payments to see your direct interest savings."
    ],
    examples: [
      {
        title: "3-Year Personal Loan Interest",
        input: "Principal: $10,000 | Rate: 9.5% | Term: 36 Months",
        result: "Total Interest Paid: ~$1,535 | Total Paid: ~$11,535"
      },
      {
        title: "5-Year Auto Loan Interest",
        input: "Principal: $25,000 | Rate: 6.0% | Term: 60 Months",
        result: "Total Interest Paid: ~$4,000 | Total Paid: ~$29,000"
      },
      {
        title: "High-Interest Debt Comparison",
        input: "Principal: $8,000 | Rate: 18.0% | Term: 48 Months",
        result: "Total Interest Paid: ~$3,300 (41% added on top of principal)"
      },
      {
        title: "Low-Rate Student Loan",
        input: "Principal: $30,000 | Rate: 4.5% | Term: 120 Months (10 Yrs)",
        result: "Total Interest Paid: ~$7,315 | Monthly: ~$311"
      }
    ],
    formula: "Total Interest = (Monthly Payment × Total Months) − Loan Principal. Monthly Payment = P × [r(1+r)^n] / [(1+r)^n − 1].",
    faqs: [
      {
        q: "How is total interest on a loan calculated?",
        a: "Total interest is calculated by multiplying your fixed periodic payment by the total number of payments, and then subtracting the original loan principal borrowed. The difference is the total interest paid to the lender."
      },
      {
        q: "Why is interest higher at the beginning of a loan?",
        a: "Interest is charged on the outstanding loan balance. At the start of the loan, the balance is at its highest, meaning monthly interest charges take up the largest portion of your payment. As the principal drops, monthly interest decreases."
      },
      {
        q: "What is the formula for simple interest?",
        a: "The simple interest formula is I = P × r × t, where I is total interest, P is principal borrowed, r is the annual interest rate, and t is time in years."
      },
      {
        q: "What is the difference between nominal interest rate and APR?",
        a: "The nominal interest rate is the base interest percentage charged on your loan balance. The APR (Annual Percentage Rate) includes both the interest rate and any required lender fees, giving a complete measure of annual borrowing costs."
      },
      {
        q: "How much interest do extra payments actually save?",
        a: "Extra payments go 100% toward reducing your principal balance. For example, paying an extra $100 monthly on a $20,000 5-year loan at 8% saves over $600 in interest and pays off the loan 10 months early."
      },
      {
        q: "Does paying bi-weekly reduce interest costs?",
        a: "Yes. Bi-weekly payments split your monthly payment in half and pay every 2 weeks. This results in 26 half-payments (13 full monthly payments per year), reducing principal faster and lowering total interest."
      },
      {
        q: "What is negative amortization?",
        a: "Negative amortization occurs when your monthly payment is too small to cover even the monthly interest accrued. The unpaid interest is added to your principal balance, causing your loan balance to grow rather than shrink."
      },
      {
        q: "How does my credit score affect my interest rate?",
        a: "Credit scores reflect borrowing risk. Lenders give the lowest interest rates to applicants with credit scores of 740+, while lower scores lead to higher rates to offset the increased risk of default."
      },
      {
        q: "Can loan interest be tax deductible?",
        a: "Interest on home mortgages, home equity loans used for substantial home improvements, and certain qualified student loans may be tax deductible depending on your income and tax filing status. Personal loan interest is generally not deductible."
      },
      {
        q: "What is an autopay discount on loan interest?",
        a: "Many lenders offer a 0.25% to 0.50% interest rate reduction if you enroll in automatic monthly electronic bank deductions for your loan payments."
      },
      {
        q: "How do variable interest rates work over time?",
        a: "Variable rate loans fluctuate based on a benchmark rate (such as the SOFR or Prime Rate). If market benchmark rates rise, your interest rate and monthly payment increase; if benchmark rates drop, your interest costs fall."
      },
      {
        q: "What happens if I miss a loan payment?",
        a: "Missing a payment triggers late fees and damages your credit score if delinquent over 30 days. In addition, unpaid interest accumulates and increases future borrowing costs."
      },
      {
        q: "What is a daily simple interest loan?",
        a: "On a daily simple interest loan, interest accrues every single day based on that day exact outstanding balance. Paying even a few days earlier each month reduces the daily interest accrued and saves money."
      },
      {
        q: "Is refinancing a good way to lower loan interest?",
        a: "Refinancing replaces your current loan with a new loan at a lower interest rate. If interest rates have fallen or your credit score has improved, refinancing can significantly reduce monthly payments and total interest."
      },
      {
        q: "What is an amortization table and why should I check it?",
        a: "An amortization table details every scheduled payment, the split between principal and interest, and the remaining balance after each month. Checking it helps you see exactly when your loan balance begins dropping rapidly."
      }
    ],
    metaTitle: "Loan Interest Calculator | Calculate Total Interest & APR — GetCalcu",
    keywords: [
      "loan interest calculator",
      "total interest calculator",
      "calculate loan interest",
      "interest rate calculator",
      "simple interest loan calculator",
      "compound loan interest",
      "interest paid on loan",
      "how much interest on loan",
      "cost of borrowing calculator",
      "interest savings calculator"
    ],
    related: [
      "loan-calculator",
      "amortization-calculator",
      "mortgage-calculator",
      "compound-interest-calculator",
      "credit-card-payoff-calculator",
      "savings-calculator"
    ]
  },
  "compound-interest-calculator": {
    name: "Compound Interest Calculator",
    category: "Finance",
    icon: "fa-chart-line",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Project how your savings and investments grow over time with compound interest and recurring monthly contributions.",
    metaDescription: "Free compound interest calculator to see how your money grows over time. Model monthly deposits, various compounding frequencies, and see the power of exponential growth.",
    fields: [
      {
        id: "principal",
        label: "Starting Balance ($)",
        type: "number",
        default: 10000,
        min: 0,
        step: 100,
        hint: "Your initial lump-sum deposit or current investment balance."
      },
      {
        id: "annual_rate",
        label: "Annual Interest Rate (%)",
        type: "number",
        default: 8,
        min: 0.01,
        step: 0.1,
        hint: "Expected average yearly growth rate. A diversified stock portfolio has historically returned about 7-10% long-term."
      },
      {
        id: "compounding_freq",
        label: "Compounding Frequency",
        type: "select",
        default: "monthly",
        options: [
          {
            value: "annually",
            label: "Annually (1/yr)"
          },
          {
            value: "semi-annually",
            label: "Semi-annually (2/yr)"
          },
          {
            value: "quarterly",
            label: "Quarterly (4/yr)"
          },
          {
            value: "monthly",
            label: "Monthly (12/yr)"
          },
          {
            value: "daily",
            label: "Daily (365/yr)"
          }
        ],
        hint: "How often interest is added to your balance. More frequent compounding grows your money slightly faster. <a href=\"#faqs\">See how compounding frequency affects growth ↓</a>"
      },
      {
        id: "monthly_contribution",
        label: "Monthly Contribution ($)",
        type: "number",
        default: 500,
        min: 0,
        step: 50,
        hint: "Amount you add each month on top of your starting balance."
      },
      {
        id: "time_years",
        label: "Time Horizon (years)",
        type: "number",
        default: 30,
        min: 1,
        max: 100,
        step: 1,
        hint: "How long your money stays invested. Longer horizons dramatically boost compound growth."
      }
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
      heading: "The Power of Compound Interest: How Money Multiplies Over Time",
      intro: "Compound interest has been called the eighth wonder of the world for good reason. Unlike simple interest, which only pays returns on your original deposit, compound interest earns interest on your previous interest. Over decades, this exponential snowball effect turns modest, consistent monthly contributions into substantial wealth. The GetCalcu Compound Interest Calculator lets you model different initial balances, regular deposits, interest rates, and compounding frequencies to see your future financial growth in action.",
      sections: [
        {
          heading: "How Compound Interest Works (The Snowball Effect)",
          body: "When you deposit money into an account that earns compound interest, your balance grows in two ways: from the new money you deposit, and from the interest earned on your growing balance. In year one, a $10,000 balance at 8% annual return earns $800. In year two, you earn 8% on $10,800, generating $864. By year 20, that same initial $10,000 earns over $3,400 in a single year with zero additional deposits, having grown to more than $46,600."
        },
        {
          heading: "Compounding Frequency: Daily vs. Monthly vs. Annually",
          body: "How often interest is compounded determines how quickly your money multiplies. Common compounding schedules include annually (once a year), quarterly (4 times a year), monthly (12 times a year), and daily (365 times a year). More frequent compounding means interest is added back into the balance sooner, generating slightly higher returns over time. High-yield savings accounts and certificates of deposit (CDs) commonly compound interest daily."
        },
        {
          heading: "The Critical Factor: Time in the Market vs. Timing the Market",
          body: "Time is the single most powerful ingredient in compound interest. Because compound growth is exponential (forming a classic hockey-stick curve), the vast majority of your wealth is generated in the final third of your investing timeframe. Starting to invest at age 25 versus age 35 can more than double your ultimate nest egg at retirement, even if you contribute the exact same total dollar amount."
        },
        {
          heading: "The Rule of 72: A Quick Mental Math Shortcut",
          body: "The Rule of 72 is a practical shortcut to estimate how many years it takes for your investment to double at a given annual interest rate. Simply divide 72 by your expected annual return percentage. For example, at an 8% return, your money doubles approximately every 9 years (72 ÷ 8 = 9). At a 6% return, it doubles every 12 years."
        },
        {
          heading: "APY (Annual Percentage Yield) vs. APR (Annual Percentage Rate)",
          body: "APR represents the simple annual interest rate without taking compounding into account. APY reflects the total amount of interest you actually earn in one full year, including the effect of compounding. A bank offering a 5.00% APR compounded daily provides an effective APY of approximately 5.13%."
        },
        {
          heading: "Regular Monthly Contributions: The Wealth Accelerator",
          body: "While a one-time lump sum benefits from compounding, pairing initial principal with regular monthly contributions supercharges wealth accumulation. Investing $300 every month at an 8% average return for 30 years results in over $400,000 from just $108,000 in out-of-pocket contributions."
        },
        {
          heading: "Adjusting for Inflation and Taxes",
          body: "To understand your real future purchasing power, you must account for inflation and investment taxes. If your portfolio grows at 8% nominal return while inflation averages 3%, your real purchasing power growth is roughly 5% per year. Utilizing tax-advantaged accounts like Roth IRAs and 401(k)s protects your compound growth from annual tax drag."
        },
        {
          heading: "Compound Interest on Debt: The Reverse Snowball",
          body: "Compound interest works in reverse on unpaid debts, such as high-interest credit cards. When you carry a balance, card issuers calculate interest daily, causing unpaid charges to snowball rapidly. Paying down high-interest debt provides a guaranteed, risk-free return equal to the interest rate avoided."
        }
      ]
    },
    howTo: [
      "Enter your initial starting deposit (principal balance).",
      "Input the regular addition amount you plan to contribute (e.g. monthly or annually).",
      "Specify your expected annual interest rate or investment return percentage.",
      "Enter the total investment timeframe in years.",
      "Select how often interest compounds (daily, monthly, quarterly, or annually).",
      "Review the total future value, the breakdown of principal versus compound interest, and your year-by-year growth table."
    ],
    examples: [
      {
        title: "Long-Term Retirement Accumulation",
        input: "Initial: $10,000 | Monthly: $500 | Rate: 8.0% | Term: 30 Years",
        result: "Future Balance: ~$793,000 (Principal: $190,000 | Interest: ~$603,000)"
      },
      {
        title: "High-Yield Savings Goal",
        input: "Initial: $20,000 | Monthly: $250 | Rate: 4.5% (Daily Compounding) | Term: 5 Years",
        result: "Future Balance: ~$41,500 (Earned Interest: ~$6,500)"
      },
      {
        title: "College Savings Growth",
        input: "Initial: $5,000 | Monthly: $200 | Rate: 7.0% | Term: 18 Years",
        result: "Future Balance: ~$104,000 (Total Contributed: $48,200)"
      },
      {
        title: "One-Time Lump Sum Growth",
        input: "Initial: $50,000 | Monthly: $0 | Rate: 8.5% | Term: 20 Years",
        result: "Future Balance: ~$255,600 (More than 5x original investment)"
      }
    ],
    formula: "Future Value A = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) − 1) / (r/n)], where P = initial principal, r = annual interest rate, n = compounding frequency per year, t = number of years, and PMT = periodic deposit.",
    faqs: [
      {
        q: "What is compound interest in simple terms?",
        a: "Compound interest is interest earned on top of both your original principal deposit and the interest that has already accumulated from previous periods. It creates a snowball effect where your money grows faster each year."
      },
      {
        q: "How does compounding frequency affect my returns?",
        a: "The more frequently interest compounds (such as daily versus annually), the sooner interest is added back into your balance. This generates slightly higher earnings over time, known as a higher APY (Annual Percentage Yield)."
      },
      {
        q: "What is the difference between simple interest and compound interest?",
        a: "Simple interest is calculated only on the original starting balance. Compound interest is calculated on the total accumulated balance, meaning you earn interest on your past interest earnings."
      },
      {
        q: "What is the Rule of 72?",
        a: "The Rule of 72 is a quick way to estimate how many years it will take to double your investment. Divide 72 by your annual interest rate percentage (e.g. 72 ÷ 8% = 9 years to double)."
      },
      {
        q: "How does inflation affect compound interest?",
        a: "Inflation reduces the future purchasing power of your money. To calculate your real rate of return, subtract the annual inflation rate from your nominal investment return (e.g. 8% return − 3% inflation = 5% real return)."
      },
      {
        q: "Why is starting early so important for compound interest?",
        a: "Compound interest accelerates exponentially over time. Starting 10 years earlier allows the exponential growth curve to compound multiple times, often creating more wealth than saving twice as much money later in life."
      },
      {
        q: "What is the formula for compound interest?",
        a: "The compound interest formula for a lump sum is A = P(1 + r/n)^(nt), where A is future value, P is principal, r is annual rate, n is compounding periods per year, and t is time in years."
      },
      {
        q: "What is the difference between APR and APY?",
        a: "APR (Annual Percentage Rate) does not account for compounding within the year. APY (Annual Percentage Yield) includes the effect of intra-year compounding, representing your true annual return."
      },
      {
        q: "Can compound interest work against me?",
        a: "Yes. On credit cards and revolving debt, lenders compound interest daily against your outstanding balance, causing unpaid balances and finance charges to grow rapidly if not paid in full."
      },
      {
        q: "How do regular monthly deposits impact compound growth?",
        a: "Regular deposits continually increase your principal base, giving compound interest a larger balance to multiply each month and accelerating wealth building."
      },
      {
        q: "What types of accounts offer compound interest?",
        a: "High-yield savings accounts, money market accounts, certificates of deposit (CDs), dividend reinvestment plans (DRIPs), mutual funds, and stock index funds all benefit from compounding growth."
      },
      {
        q: "Do I have to pay taxes on compound interest?",
        a: "Interest earned in standard taxable accounts is generally taxed as ordinary income each year. In tax-advantaged accounts like Roth IRAs or 401(k)s, compound growth is tax-free or tax-deferred."
      },
      {
        q: "What is continuous compounding?",
        a: "Continuous compounding is compounding that occurs infinitely often at every micro-moment in time, represented mathematically as A = P × e^(rt). It represents the theoretical maximum limit of compounding frequency."
      },
      {
        q: "How does market volatility affect compound interest in stock investments?",
        a: "Unlike fixed savings accounts that provide a steady interest rate, stock market returns fluctuate annually. Over long periods, average annual market returns compound to produce strong wealth accumulation, though actual year-to-year returns vary."
      },
      {
        q: "How can I maximize the power of compound interest?",
        a: "Start investing as early as possible, make consistent monthly contributions, reinvest all dividends and interest distributions, minimize investment management fees, and use tax-advantaged accounts."
      }
    ],
    metaTitle: "Compound Interest Calculator | Daily, Monthly & Annual Compounding — GetCalcu",
    keywords: [
      "compound interest calculator",
      "compound interest formula",
      "daily compound interest calculator",
      "monthly compounding calculator",
      "interest on interest calculator",
      "exponential savings growth",
      "apy calculator compound interest",
      "rule of 72 calculator",
      "future value compound interest",
      "investment compounding calculator"
    ],
    related: [
      "investment-calculator",
      "savings-calculator",
      "retirement-calculator",
      "fire-calculator",
      "inflation-calculator",
      "net-worth-calculator"
    ]
  },
  "investment-calculator": {
    name: "Investment Calculator",
    category: "Finance",
    icon: "fa-chart-line",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Project your investment growth with compound returns and recurring monthly contributions. See how long to reach $100k, $500k, or $1M.",
    metaDescription: "Calculate the future growth of your investments with regular contributions, dividend reinvestment, expected return rates, and inflation adjustments.",
    fields: [
      {
        id: "initial_investment",
        label: "Initial Investment ($)",
        type: "number",
        default: 10000,
        min: 0,
        step: 1000,
        hint: "Your starting lump-sum amount invested today."
      },
      {
        id: "monthly_contribution",
        label: "Monthly Contribution ($)",
        type: "number",
        default: 500,
        min: 0,
        step: 50,
        hint: "How much you add to your investment each month."
      },
      {
        id: "annual_return",
        label: "Expected Annual Return (%)",
        type: "number",
        default: 8,
        min: 0.01,
        step: 0.1,
        max: 100,
        hint: "Expected average yearly return. S&P 500 long-term average: about 7-10%. <a href=\"#faqs\">See safe return rates ↓</a>"
      },
      {
        id: "investment_period",
        label: "Investment Period (years)",
        type: "number",
        default: 20,
        min: 1,
        max: 100,
        step: 1,
        hint: "How many years you plan to keep your money invested."
      },
      {
        id: "compound_freq",
        label: "Compounding Frequency",
        type: "select",
        default: "monthly",
        options: [
          {
            value: "annually",
            label: "Annually (1/yr)"
          },
          {
            value: "semi-annually",
            label: "Semi-annually (2/yr)"
          },
          {
            value: "quarterly",
            label: "Quarterly (4/yr)"
          },
          {
            value: "monthly",
            label: "Monthly (12/yr)"
          },
          {
            value: "daily",
            label: "Daily (365/yr)"
          }
        ],
        hint: "How often returns are reinvested. <a href=\"#faqs\">See how compounding frequency affects growth ↓</a>"
      },
      {
        id: "goal_amount",
        label: "Savings Goal ($) (optional)",
        type: "number",
        default: 1000000,
        min: 0,
        step: 10000,
        hint: "A target balance you want to reach (e.g. $1M). Optional — used to estimate how long it will take."
      }
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
      heading: "How to Project Your Investment Portfolio Growth",
      intro: "Building long-term wealth through investing is one of the most reliable ways to achieve financial independence, fund college education, or retire comfortably. The GetCalcu Investment Calculator helps you project your portfolio value over any time horizon by combining initial capital, regular recurring contributions, expected market return rates, and compounding periods.",
      sections: [
        {
          heading: "The Power of Dollar-Cost Averaging (DCA)",
          body: "Dollar-cost averaging is the practice of investing a fixed dollar amount on a regular schedule (such as monthly or with every paycheck), regardless of whether stock prices are high or low. When prices fall, your fixed dollar amount buys more shares; when prices rise, it buys fewer shares. Over time, DCA removes the emotional stress of attempting to time market peaks and valleys and establishes disciplined wealth accumulation."
        },
        {
          heading: "Historical Market Returns and Realistic Expectations",
          body: "Historically, the broad US stock market (represented by the S&P 500) has delivered an average annual return of roughly 10% before inflation (or about 7% after inflation) over long multi-decade periods. While past performance does not guarantee future results, using realistic return assumptions (such as 6% to 8% for a balanced stock/bond portfolio) prevents overestimating your future wealth."
        },
        {
          heading: "Asset Allocation: Balancing Growth and Risk",
          body: "Asset allocation refers to how you divide your portfolio among stocks, bonds, cash, and real estate. Equities (stocks) provide long-term growth potential but come with higher short-term volatility. Fixed-income assets (bonds) offer income and stability during market downturns. Younger investors with decades until retirement typically hold higher stock allocations (80% to 90%), gradually shifting toward bonds as they approach their withdrawal goals."
        },
        {
          heading: "The Drag of Investment Fees and Expense Ratios",
          body: "Investment fees can quietly erode hundreds of thousands of dollars from your portfolio over a lifetime. A mutual fund with a 1.25% expense ratio compared to a low-cost broad index fund with a 0.03% expense ratio can reduce your final portfolio value by 20% to 30% over 30 years. Keeping investment fees low is one of the few guaranteed ways to boost your net investment returns."
        },
        {
          heading: "Reinvesting Dividends (DRIP)",
          body: "Dividend reinvestment plans (DRIP) automatically use cash dividend distributions from stocks or index funds to buy additional shares of the underlying investment. Over multi-decade periods, reinvested dividends account for a substantial percentage of total stock market returns through the compound purchase of additional shares."
        },
        {
          heading: "Taxable Brokerage vs. Tax-Advantaged Accounts",
          body: "Where you hold your investments matters as much as what you buy. Tax-advantaged accounts like 401(k)s, Traditional IRAs, and Roth IRAs allow your money to grow without annual tax drag from dividends and capital gains. A standard taxable brokerage account offers maximum flexibility without early withdrawal penalties but requires paying taxes on dividends and realized gains along the way."
        },
        {
          heading: "Understanding Sequence of Returns Risk",
          body: "While average annual returns are useful for projections, the order in which returns occur matters greatly when you begin withdrawing money in retirement. A sharp market downturn in the early years of retirement (poor sequence of returns) can deplete a portfolio faster than the same downturn occurring later. Maintaining a cash cushion and bond reserve mitigates this risk."
        },
        {
          heading: "Inflation-Adjusted Returns (Nominal vs. Real Wealth)",
          body: "Nominal return is the raw percentage gain of your portfolio. Real return is your gain minus inflation. If your portfolio grows at 8% while inflation runs at 3%, your real increase in purchasing power is 5%. When setting future financial goals, modeling in real terms ensures your future savings can actually buy what you expect."
        }
      ]
    },
    howTo: [
      "Enter your starting investment balance (current portfolio size).",
      "Input the recurring contribution amount you plan to deposit regularly (monthly or annually).",
      "Specify your expected annual rate of return percentage.",
      "Enter the investment timeframe in years.",
      "Select whether to adjust figures for estimated annual inflation.",
      "Review your estimated ending portfolio value, total contributions, total investment growth, and year-by-year asset chart."
    ],
    formula: "Future Value = P(1 + r)^t + PMT × [((1 + r)^t − 1) / r], where P is starting principal, r is annual return rate, t is time in years, and PMT is total annual contribution.",
    examples: [
      {
        title: "Monthly Index Fund Investing",
        input: "Starting: $15,000 | Monthly: $600 | Expected Return: 8.0% | Term: 25 Years",
        result: "Ending Portfolio: ~$670,000 (Contributions: $195,000 | Investment Growth: ~$475,000)"
      },
      {
        title: "Conservative Balanced Portfolio",
        input: "Starting: $50,000 | Monthly: $400 | Expected Return: 6.0% | Term: 15 Years",
        result: "Ending Portfolio: ~$235,000 (Earned Growth: ~$113,000)"
      },
      {
        title: "Aggressive Growth Strategy",
        input: "Starting: $25,000 | Monthly: $1,000 | Expected Return: 9.5% | Term: 20 Years",
        result: "Ending Portfolio: ~$845,000 (Earned Growth: ~$580,000)"
      },
      {
        title: "Lump Sum 10-Year Horizon",
        input: "Starting: $100,000 | Monthly: $0 | Expected Return: 7.5% | Term: 10 Years",
        result: "Ending Portfolio: ~$206,100 (More than doubled in 10 years)"
      }
    ],
    faqs: [
      {
        q: "What is a realistic annual rate of return to assume for investments?",
        a: "For a diversified, 100% stock index fund portfolio, historical long-term returns have averaged roughly 9% to 10% annually before inflation (or 6% to 7% after inflation). For a balanced stock/bond portfolio (such as 60/40), a realistic planning range is 6% to 7% nominal return."
      },
      {
        q: "What is dollar-cost averaging (DCA)?",
        a: "Dollar-cost averaging is investing a fixed amount of money on a set schedule (such as $500 every month), regardless of market price swings. This lowers average cost per share over time and removes emotional market timing."
      },
      {
        q: "How do investment fees and expense ratios impact my returns?",
        a: "Expense ratios are fees charged annually by funds. A 1% fee sounds small, but over 30 years it can eat away up to 25% of your total potential portfolio value through lost compounding."
      },
      {
        q: "What is the difference between capital gains and dividend income?",
        a: "Capital gains are profits earned when you sell an asset for a higher price than you bought it for. Dividends are regular cash distributions paid out by profitable companies to shareholders."
      },
      {
        q: "Should I invest a lump sum all at once or spread it out?",
        a: "Historically, lump-sum investing outperforms dollar-cost averaging roughly two-thirds of the time because markets rise more often than they fall. However, spreading deposits out over 6 to 12 months can provide emotional peace of mind."
      },
      {
        q: "What is the difference between nominal and real return?",
        a: "Nominal return is the percentage gain before accounting for inflation. Real return is your actual purchasing power gain after subtracting the inflation rate."
      },
      {
        q: "How does asset allocation change as I get older?",
        a: "When you are younger, holding a higher percentage of equities (stocks) maximizes long-term compound growth. As you near retirement or withdrawal goals, shifting part of your portfolio to fixed income (bonds and cash) protects capital from short-term market crashes."
      },
      {
        q: "What is CAGR (Compound Annual Growth Rate)?",
        a: "CAGR is the annualized rate of return that an investment would have grown at if it grew at a steady constant rate each year over a specified time period."
      },
      {
        q: "What is the difference between index funds and actively managed funds?",
        a: "Index funds passively track a market benchmark (like the S&P 500) with ultra-low fees. Actively managed funds employ managers who pick individual stocks to try to beat the market, but usually charge higher fees and rarely beat benchmark index funds over long periods."
      },
      {
        q: "How do taxes impact my investment growth?",
        a: "In a taxable account, you pay taxes on dividends and capital gains each year. Using tax-advantaged accounts like Roth IRAs, Traditional IRAs, and 401(k)s allows your money to compound tax-free or tax-deferred."
      },
      {
        q: "What is rebalancing and why is it necessary?",
        a: "Rebalancing is the process of periodically realigning your portfolio asset weights (e.g. 80% stocks / 20% bonds) back to your target allocation after market movements cause one asset class to grow faster than another."
      },
      {
        q: "How long does it take for an investment to double?",
        a: "Using the Rule of 72, divide 72 by your annual rate of return. At a 7% return, an investment doubles in roughly 10.3 years; at a 10% return, it doubles in 7.2 years."
      },
      {
        q: "What is sequence of returns risk?",
        a: "Sequence of returns risk is the danger that market downturns early in your retirement withdrawal phase can permanently damage your portfolio longevity, even if long-term average returns look healthy."
      },
      {
        q: "Can I lose money in index fund investments?",
        a: "In the short term, broad stock market index funds can experience sharp drops (10% to 30% or more during recessions). Over long 15-to-20-year horizons, diversified broad-market US stock index funds have historically never produced negative returns."
      },
      {
        q: "How much of my income should I invest each month?",
        a: "A standard financial guideline is to invest 15% to 20% of your gross income for retirement and long-term goals. If you are starting later in life or aiming for early retirement (FIRE), targeting 30% to 50% may be needed."
      }
    ],
    metaTitle: "Investment Calculator | Portfolio Growth, Returns & Contributions — GetCalcu",
    keywords: [
      "investment calculator",
      "stock market returns calculator",
      "portfolio growth calculator",
      "roi calculator",
      "mutual fund growth calculator",
      "future value investment",
      "dollar cost averaging calculator",
      "cagr calculator investment",
      "wealth accumulation calculator",
      "index fund return calculator"
    ],
    related: [
      "compound-interest-calculator",
      "retirement-calculator",
      "savings-calculator",
      "fire-calculator",
      "inflation-calculator",
      "net-worth-calculator"
    ]
  },
  "budget-planner": {
    name: "Budget Planner & Expense Tracker",
    category: "Finance",
    icon: "fa-wallet",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Plan your monthly budget, track expenses by category, and get personalized spending insights with the 50/30/20 rule.",
    metaDescription: "Free monthly budget planner calculator using the 50/30/20 budgeting rule. Allocate income across needs, wants, and savings to take control of your personal finances.",
    fields: [],
    calculate() { return {}; },
    customRenderer: (container) => { if (window.renderBudgetPlannerModule) window.renderBudgetPlannerModule(container); },
    article: {
      heading: "How to Build a Realistic Monthly Budget That Actually Works",
      intro: "A budget is not about restricting your life—it is about giving every dollar a specific job so you can spend without guilt and save with intention. The GetCalcu Budget Planner uses the proven 50/30/20 framework to balance your essential living costs, discretionary spending, and long-term financial goals.",
      sections: [
        {
          heading: "The 50/30/20 Budgeting Rule Explained",
          body: "Created by Senator Elizabeth Warren in her book All Your Worth, the 50/30/20 rule divides your after-tax take-home pay into three clear categories: 50% for Needs (must-haves), 30% for Wants (lifestyle choices), and 20% for Savings and Debt Repayment (your financial future). It offers a simple, sustainable guideline that eliminates tedious line-item tracking."
        },
        {
          heading: "Defining \"Needs\" (50% of Income)",
          body: "Needs are the non-negotiable expenses you must pay to survive and keep working. These include rent or mortgage payments, basic groceries, utilities (electricity, water, heat), health insurance, essential transportation (car payment, fuel, public transit), and minimum debt payments. If your needs exceed 50% of your take-home pay, look for ways to downsize housing, refinance car loans, or shop around for insurance."
        },
        {
          heading: "Defining \"Wants\" (30% of Income)",
          body: "Wants are the discretionary choices that make life enjoyable: dining out, streaming subscriptions, vacations, shopping, hobbies, concerts, and gym memberships. Unlike needs, you could temporarily pause these expenses during a financial emergency without jeopardizing your shelter or health."
        },
        {
          heading: "Defining \"Savings & Debt\" (20% of Income)",
          body: "The final 20% of your take-home income is dedicated to building long-term wealth and eliminating financial stress. This includes building your 3-6 month emergency fund, making extra payments on high-interest credit card debt, contributing to Roth IRAs or 401(k)s, and funding future goals like home down payments."
        },
        {
          heading: "Zero-Based Budgeting (Give Every Dollar a Name)",
          body: "In a zero-based budget (popularized by YNAB and Dave Ramsey), your total income minus all expenses, savings, and debt payments equals exactly zero at the start of each month. This does not mean your bank account is empty—it means every dollar is intentionally assigned to a category before the month begins, eliminating mindless leaks."
        },
        {
          heading: "Budgeting with Irregular or Variable Income",
          body: "If you are self-employed, freelance, or earn commissions, base your core baseline budget on your lowest-earning month of the previous year. In months when you earn higher revenue, route the excess cash into a \"holding account\" or emergency buffer to supplement lean months."
        },
        {
          heading: "Using Sinking Funds to Prevent Budget Blowouts",
          body: "Irregular expenses like auto maintenance, holiday shopping, vet bills, or annual insurance premiums frequently derail budgets. Setting aside a small amount each month in dedicated sinking funds ensures you can pay these bills in cash when they arrive without touching your credit cards."
        },
        {
          heading: "Overcoming Budget Burnout and Staying Consistent",
          body: "Budgets fail when they are too rigid or unrealistic. Give yourself permission to spend guilt-free from your \"Wants\" category, automate your savings on payday, and perform a brief 10-minute weekly budget check-in rather than letting receipts pile up for months."
        }
      ]
    },
    howTo: [
      "Enter your total monthly net take-home pay (after income taxes and payroll deductions).",
      "List your essential monthly Needs (housing, groceries, utilities, transportation, insurance).",
      "List your discretionary Wants (dining out, entertainment, subscriptions, shopping).",
      "Enter your monthly Savings and extra debt payoff contributions.",
      "Review your percentage breakdown against the 50/30/20 benchmark.",
      "Adjust categories to balance your cash flow and ensure total spending does not exceed net income."
    ],
    formula: "Target Needs = Net Income × 0.50 | Target Wants = Net Income × 0.30 | Target Savings = Net Income × 0.20 | Net Cash Flow = Income − (Needs + Wants + Savings).",
    examples: [
      {
        title: "Single Professional ($4,500 Take-Home)",
        input: "Net Income: $4,500 | Needs: $2,250 (50%) | Wants: $1,350 (30%) | Savings: $900 (20%)",
        result: "Perfect 50/30/20 Balance | $10,800 saved per year"
      },
      {
        title: "High Housing Cost Metro ($6,000 Take-Home)",
        input: "Net Income: $6,000 | Needs: $3,600 (60%) | Wants: $1,200 (20%) | Savings: $1,200 (20%)",
        result: "60/20/20 Allocation (Trimmed wants to preserve 20% savings)"
      },
      {
        title: "Aggressive Debt Payoff ($5,000 Take-Home)",
        input: "Net Income: $5,000 | Needs: $2,500 (50%) | Wants: $750 (15%) | Debt/Savings: $1,750 (35%)",
        result: "Accelerated Debt Freedom Plan ($21,000/yr toward debt)"
      },
      {
        title: "Entry-Level Starter Budget ($3,000 Take-Home)",
        input: "Net Income: $3,000 | Needs: $1,650 (55%) | Wants: $750 (25%) | Savings: $600 (20%)",
        result: "Solid Starter Budget ($7,200/yr into savings)"
      }
    ],
    faqs: [
      {
        q: "What is the 50/30/20 budgeting rule?",
        a: "The 50/30/20 rule is a simple budgeting guideline where 50% of your take-home pay goes to Needs (essential bills), 30% to Wants (lifestyle and entertainment), and 20% to Savings and debt reduction."
      },
      {
        q: "Should I calculate my budget using gross or net income?",
        a: "Always budget using your net take-home pay—the actual cash deposited into your bank account after federal, state, and payroll taxes are subtracted."
      },
      {
        q: "What counts as a \"Need\" in a budget?",
        a: "Needs are essential survival and work requirements: rent/mortgage, basic groceries, utilities, essential healthcare, transportation, and minimum loan payments."
      },
      {
        q: "What counts as a \"Want\" in a budget?",
        a: "Wants are non-essential discretionary expenses: eating out, streaming services, vacations, hobbies, upgraded clothing, and entertainment."
      },
      {
        q: "What if my essential needs take up more than 50% of my income?",
        a: "In high-cost-of-living areas, needs often reach 60% or more. In that case, reduce your \"Wants\" percentage (e.g. 60% needs, 20% wants, 20% savings) to protect your savings rate."
      },
      {
        q: "What is zero-based budgeting?",
        a: "Zero-based budgeting is an approach where your income minus all expenses, savings, and debt payments equals zero. Every single dollar is assigned a designated purpose before the month begins."
      },
      {
        q: "How can I stick to a budget without feeling deprived?",
        a: "Include a dedicated \"fun money\" or \"wants\" line item in your budget that you can spend guilt-free, automate your savings on payday, and focus on cutting expenses you do not care about."
      },
      {
        q: "How often should I review and update my budget?",
        a: "Review your budget on a monthly basis to adjust for seasonal expenses, and do a quick 5-to-10-minute check-in weekly to keep spending on track."
      },
      {
        q: "What is a sinking fund?",
        a: "A sinking fund is a separate savings pool where you set aside money each month for a predictable upcoming expense (such as car insurance or holiday gifts)."
      },
      {
        q: "How do I budget with an irregular or freelance income?",
        a: "Create your baseline budget based on your lowest historical monthly income. When you have high-earning months, stash the extra earnings in a buffer fund to cover lower months."
      },
      {
        q: "Should 401(k) contributions come out of the 20% savings category?",
        a: "Yes. If your 401(k) contribution is deducted directly from your gross paycheck, you can add it back to your take-home pay to calculate your true total savings percentage."
      },
      {
        q: "What is the envelope budgeting system?",
        a: "Envelope budgeting involves placing physical or digital cash into specific category envelopes (groceries, dining, gas). Once an envelope is empty, spending in that category stops until next month."
      },
      {
        q: "How much should I save in an emergency fund before investing?",
        a: "Start with a $1,000 to $2,000 starter emergency fund, eliminate high-interest credit card debt, and then build a full 3 to 6-month living expense reserve before expanding into broader investments."
      },
      {
        q: "What is the biggest budgeting mistake to avoid?",
        a: "The biggest mistake is making a budget too strict or complicated to sustain. A simple, flexible budget you can maintain for years is far better than a perfect budget you abandon in two weeks."
      },
      {
        q: "How can I cut my monthly expenses quickly?",
        a: "Cancel unused recurring subscriptions, cook meals at home, negotiate car insurance and internet rates, and shop with a grocery list to eliminate impulsive purchases."
      }
    ],
    metaTitle: "Budget Planner Calculator | 50/30/20 Rule, Income & Expenses — GetCalcu",
    keywords: [
      "budget planner calculator",
      "50 30 20 budget calculator",
      "monthly budget calculator",
      "personal budget planner",
      "income and expense calculator",
      "household budget planner",
      "how to make a budget",
      "zero based budgeting calculator",
      "spending breakdown calculator",
      "savings rate budget calculator"
    ],
    related: [
      "savings-calculator",
      "credit-card-payoff-calculator",
      "net-worth-calculator",
      "house-affordability-calculator",
      "retirement-calculator",
      "investment-calculator"
    ]
  },
  "retirement-calculator": {
    id: "retirement-calculator",
    name: "Retirement Calculator",
    category: "Finance",
    icon: "fa-umbrella",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Determine how much money you need to retire comfortably, estimate your future nest egg balance, and calculate required monthly savings based on inflation and life expectancy.",
    metaTitle: "Retirement Calculator | Nest Egg, 4% Rule & Savings Plan — GetCalcu",
    metaDescription: "Free retirement calculator to calculate your retirement nest egg, required annual savings, safe withdrawal rate, Social Security income, and retirement age.",
    keywords: [
      "retirement calculator",
      "retirement savings calculator",
      "how much to save for retirement",
      "401k retirement calculator",
      "retirement nest egg calculator",
      "4 percent rule retirement",
      "roth ira retirement calculator",
      "social security retirement calculator",
      "retirement age planner",
      "pension retirement calculator"
    ],
    fields: [
      {
        id: "current_age",
        label: "Your Current Age",
        type: "number",
        default: 25,
        min: 18,
        max: 70,
        step: 1,
        hint: "Your age today. The calculator uses this to find how many years you have until retirement."
      },
      {
        id: "current_savings",
        label: "Current Retirement Savings ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 1000,
        hint: "Total across all retirement accounts: 401k, IRA, Roth IRA, and brokerage investments."
      },
      {
        id: "annual_income",
        label: "Annual Income ($)",
        type: "number",
        default: 55000,
        min: 10000,
        step: 5000,
        hint: "Your current yearly pre-tax income. Used to estimate your retirement income target."
      },
      {
        id: "monthly_contribution",
        label: "Monthly Contribution ($)",
        type: "number",
        default: 500,
        min: 0,
        step: 50,
        hint: "What you save each month toward retirement (401k, IRA, brokerage). Even small amounts compound over decades."
      },
      {
        id: "annual_return",
        label: "Expected Annual Return (%)",
        type: "number",
        default: 7,
        min: 0.1,
        step: 0.1,
        max: 30,
        hint: "Expected average yearly investment growth. S&P 500 long-term average: about 7-8% after inflation. <a href=\"#faqs\">See realistic return rates ↓</a>"
      },
      {
        id: "inflation_rate",
        label: "Expected Inflation Rate (%)",
        type: "number",
        default: 3,
        min: 0,
        step: 0.1,
        max: 20,
        hint: "The annual rate at which prices rise, eroding purchasing power. US historical average: 2.5-3%. <a href=\"#faqs\">See how inflation affects savings ↓</a>"
      },
      {
        id: "retirement_age",
        label: "Desired Retirement Age",
        type: "number",
        default: 65,
        min: 30,
        max: 80,
        step: 1,
        hint: "The age you plan to stop working and start drawing on your nest egg."
      },
      {
        id: "life_expectancy",
        label: "Life Expectancy (years)",
        type: "number",
        default: 95,
        min: 50,
        max: 120,
        step: 1,
        hint: "How long you expect to live in retirement. Plan for 90-95 to be safe."
      },
      {
        id: "income_replacement",
        label: "Desired Retirement Income (% of current)",
        type: "number",
        default: 80,
        min: 10,
        max: 100,
        step: 5,
        hint: "Share of pre-retirement income you will need in retirement. Advisors suggest 70-80%."
      }
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
    howTo: [
      "Enter your current age and desired retirement age.",
      "Input your current retirement savings balance across all accounts (401k, IRA, taxable).",
      "Enter the monthly amount you are currently contributing to retirement savings.",
      "Specify your estimated annual spending in retirement.",
      "Input any expected monthly Social Security or pension benefits.",
      "Review your target nest egg, projected retirement balance, and any potential savings gap."
    ],
    examples: [
      {
        title: "Early Career Saver (Age 28)",
        input: "Current Age: 28 | Retires: 65 | Savings: $30,000 | Monthly: $700 | Return: 7.5%",
        result: "Projected Nest Egg at 65: ~$2,050,000 (Easily exceeds target)"
      },
      {
        title: "Mid-Career Catch Up (Age 45)",
        input: "Current Age: 45 | Retires: 67 | Savings: $150,000 | Monthly: $1,500 | Return: 7.0%",
        result: "Projected Nest Egg at 67: ~$1,480,000 (Covers $60,000/yr with Social Security)"
      },
      {
        title: "Near Retirement (Age 58)",
        input: "Current Age: 58 | Retires: 66 | Savings: $650,000 | Monthly: $2,000 | Return: 6.0%",
        result: "Projected Nest Egg at 66: ~$1,280,000 (Generates ~$51,200/yr safely)"
      },
      {
        title: "High-Income Saver",
        input: "Current Age: 35 | Retires: 60 | Savings: $200,000 | Monthly: $3,000 | Return: 7.5%",
        result: "Projected Nest Egg at 60: ~$3,540,000 (Achieves Early Financial Freedom)"
      }
    ],
    formula: "Target Nest Egg = (Annual Retirement Expenses − Annual Guaranteed Income) ÷ Safe Withdrawal Rate (e.g. 0.04). Future Value = P(1+r)^t + PMT × [((1+r)^t − 1) / r].",
    article: {
      heading: "The Comprehensive Guide to Planning Your Retirement",
      intro: "Planning for retirement is one of the most critical long-term financial journeys you will undertake. Estimating how much money you need to retire comfortably requires balancing your current age, retirement target age, expected living expenses, investment returns, inflation, and guaranteed income sources like Social Security. The GetCalcu Retirement Calculator gives you a clear roadmap to reach your retirement milestone on your own terms.",
      sections: [
        {
          heading: "The 4% Safe Withdrawal Rule Explained",
          body: "The 4% rule originated from the landmark Trinity Study. It states that an investor with a balanced portfolio of stocks and bonds (such as 60% stocks / 40% bonds) can withdraw 4% of their portfolio value in the first year of retirement, and adjust that dollar amount for inflation every subsequent year, with a 95%+ probability that their portfolio will last at least 30 years. Under this rule, your target retirement nest egg equals your annual spending divided by 0.04 (or multiplied by 25)."
        },
        {
          heading: "Estimating Your Annual Retirement Living Expenses",
          body: "A common rule of thumb is the 70% to 80% replacement rule, which assumes you will spend 70% to 80% of your pre-retirement income in retirement because mortgage payments may be finished, daily commuting costs vanish, and payroll taxes stop. However, active retirees often spend just as much or more during early retirement years on travel, hobbies, and family."
        },
        {
          heading: "Integrating Social Security and Pension Benefits",
          body: "Social Security provides an inflation-indexed lifetime income stream. You can claim benefits as early as age 62 (at a permanent 30% reduction), wait until your Full Retirement Age (FRA, currently age 67 for those born in 1960 or later), or delay claiming until age 70 for an 8% annual boost in benefits. Every dollar of guaranteed Social Security or pension income directly lowers the amount you need to withdraw from your private investment portfolio."
        },
        {
          heading: "Tax Diversification: 401(k), Traditional IRA, and Roth Accounts",
          body: "Having money in different tax buckets provides immense flexibility in retirement. Traditional 401(k)s and IRAs give upfront tax deductions, but withdrawals are taxed as ordinary income. Roth accounts require after-tax contributions today, but all qualified withdrawals in retirement are 100% tax-free. Maintaining both allows you to control your taxable income bracket during retirement."
        },
        {
          heading: "The Impact of Inflation on Retirement Purchasing Power",
          body: "Over a 30-year retirement, even moderate 2.5% to 3% annual inflation more than doubles the cost of goods and services. A portfolio must remain invested in growth assets (equities) throughout retirement to generate returns that outpace inflation and protect your standard of living."
        },
        {
          heading: "Accounting for Healthcare and Long-Term Care Costs",
          body: "Healthcare is often one of the largest single expenses in retirement. Medicare eligibility begins at age 65, but Medicare does not cover everything (deductibles, copays, vision, dental, and long-term custodial nursing care are out-of-pocket). Funding a Health Savings Account (HSA) during your working years creates a triple-tax-advantaged medical nest egg."
        },
        {
          heading: "Required Minimum Distributions (RMDs)",
          body: "Under current US tax law (SECURE 2.0 Act), owners of Traditional 401(k)s and IRAs must begin taking mandatory annual taxable withdrawals (RMDs) starting at age 73 (increasing to age 75 in 2033). Planning ahead with Roth conversions in lower-income early retirement years can minimize unexpected tax spikes from RMDs."
        },
        {
          heading: "Catch-Up Contributions for Savers Age 50 and Older",
          body: "If you started saving later in life, IRS rules allow individuals age 50 and older to make additional \"catch-up\" contributions to 401(k)s, 403(b)s, and IRAs beyond standard annual limits, helping accelerate retirement savings in peak earning years."
        }
      ]
    },
    faqs: [
      {
        q: "How much money do I need to retire comfortably?",
        a: "A widely accepted benchmark is the 25x rule: you need roughly 25 times your expected annual retirement expenses (minus guaranteed income like Social Security). If you need $60,000 per year from your investments, you will need a portfolio of roughly $1,500,000."
      },
      {
        q: "What is the 4% safe withdrawal rule?",
        a: "The 4% rule states that you can withdraw 4% of your initial retirement portfolio in your first year of retirement, and adjust that dollar amount for inflation each year thereafter, with a very high probability that your money will last 30 years."
      },
      {
        q: "When can I start claiming Social Security benefits?",
        a: "You can claim as early as age 62, but your monthly benefit is permanently reduced by up to 30%. Waiting until your Full Retirement Age (age 67 for those born 1960 or later) gives 100% of your benefit, while delaying to age 70 increases payments by 8% per year."
      },
      {
        q: "What is the difference between a Traditional 401(k) and a Roth 401(k)?",
        a: "A Traditional 401(k) uses pre-tax contributions, lowering your taxable income today, but withdrawals in retirement are taxed as ordinary income. A Roth 401(k) uses after-tax contributions, but all future withdrawals in retirement are 100% tax-free."
      },
      {
        q: "How much should I contribute to my 401(k)?",
        a: "At a minimum, contribute enough to capture 100% of your employer matching contribution (which is free money). Financial planners generally recommend saving 15% of your gross annual income across all retirement accounts."
      },
      {
        q: "What is an IRA and who can open one?",
        a: "An Individual Retirement Account (IRA) is a personal tax-advantaged retirement account open to anyone with earned income. You can choose between a Traditional IRA (tax-deductible contributions) or a Roth IRA (tax-free withdrawals)."
      },
      {
        q: "What are Required Minimum Distributions (RMDs)?",
        a: "RMDs are mandatory annual taxable withdrawals that the IRS requires you to start taking from Traditional 401(k)s and IRAs once you reach age 73 (rising to 75 in 2033)."
      },
      {
        q: "How does inflation affect my retirement plan?",
        a: "Inflation increases the cost of living over time, eroding purchasing power. Your retirement portfolio should remain partially invested in equities (stocks) throughout retirement so returns outpace inflation."
      },
      {
        q: "What happens to my 401(k) if I change jobs?",
        a: "You can leave it in your old employer plan, roll it over into your new employer 401(k), or roll it over into a personal rollover IRA with broader investment choices and lower fees."
      },
      {
        q: "What is sequence of returns risk in retirement?",
        a: "It is the risk of experiencing a severe stock market downturn in the first few years after you begin withdrawing money in retirement, which can permanently impair portfolio longevity."
      },
      {
        q: "What is an HSA and why is it useful for retirement?",
        a: "A Health Savings Account (HSA) offers triple tax advantages: tax-deductible contributions, tax-free growth, and tax-free withdrawals for qualified medical expenses. After age 65, non-medical withdrawals are taxed just like a standard Traditional IRA."
      },
      {
        q: "Can I retire early before age 65?",
        a: "Yes, but you must plan for healthcare bridge coverage (such as ACA marketplace health plans) before Medicare starts at 65, and ensure you have penalty-free access to funds (using taxable accounts, Roth IRA contribution withdrawals, or Rule 72t SEPP payments)."
      },
      {
        q: "What are catch-up contributions?",
        a: "The IRS allows individuals age 50 and older to contribute extra money each year to 401(k)s and IRAs above the standard annual limits."
      },
      {
        q: "How should my investment asset allocation shift in retirement?",
        a: "Retirees typically shift toward a balanced allocation (e.g. 50% to 60% stocks for ongoing inflation growth and 40% to 50% bonds/cash for stability and short-term income needs)."
      },
      {
        q: "What is the biggest risk to retirement security?",
        a: "The three biggest risks are outliving your money (longevity risk), healthcare and nursing care expenses, and inflation eroding fixed purchasing power over multi-decade retirements."
      }
    ],
    related: [
      "fire-calculator",
      "investment-calculator",
      "compound-interest-calculator",
      "savings-calculator",
      "inflation-calculator",
      "net-worth-calculator"
    ]
  },
  "savings-calculator": {
    name: "Savings & Strategy Calculator",
    category: "Finance",
    icon: "fa-piggy-bank",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Compare biweekly vs monthly savings growth, calculate exact target dates, analyze High-Yield Savings Account (HYSA) returns after tax and inflation, and model emergency fund durations.",
    metaTitle: "Savings Calculator | High-Yield Savings, Interest & Goals — GetCalcu",
    metaDescription: "Free savings calculator to project your savings account growth with regular deposits, APY rates, and target timelines. Plan emergency funds and big purchases.",
    keywords: [
      "savings calculator",
      "high yield savings account calculator",
      "savings goal calculator",
      "how much interest will I earn on savings",
      "savings account interest calculator",
      "emergency fund calculator",
      "monthly savings plan",
      "apy savings calculator",
      "compound savings calculator",
      "save 10000 calculator"
    ],
    fields: [
      {
        id: "mode",
        label: "Savings Strategy Mode",
        type: "select",
        default: "biweekly-monthly",
        options: [
          {
            value: "biweekly-monthly",
            label: "Biweekly vs Monthly Growth Comparison"
          },
          {
            value: "goal-timeline",
            label: "Target Goal & Exact Date Timeline"
          },
          {
            value: "hysa-real-yield",
            label: "HYSA Net Return (Tax & Inflation Adjusted)"
          },
          {
            value: "emergency-fund",
            label: "Emergency Fund Expenses Calculator"
          }
        ],
        hint: "Choose a savings strategy to model. Each mode surfaces only the inputs it needs."
      },
      {
        id: "initial_deposit",
        label: "Initial Deposit / Current Savings ($)",
        type: "number",
        default: 5000,
        min: 0,
        step: 100,
        hint: "Your starting balance or current savings today. Use 0 if you are starting from scratch."
      },
      {
        id: "recurring_deposit",
        label: "Monthly-Equivalent Deposit ($)",
        type: "number",
        default: 250,
        min: 0,
        step: 25,
        condition: v => ['biweekly-monthly','goal-timeline','hysa-real-yield'].includes(v.mode),
        hint: "The amount you deposit per paycheck cycle. In Biweekly vs Monthly mode this is the monthly-equivalent payment."
      },
      {
        id: "deposit_frequency",
        label: "Deposit Frequency",
        type: "select",
        default: "biweekly",
        condition: v => ['biweekly-monthly','goal-timeline','hysa-real-yield'].includes(v.mode),
        options: [
          {
            value: "biweekly",
            label: "Biweekly (26/yr)"
          },
          {
            value: "monthly",
            label: "Monthly (12/yr)"
          },
          {
            value: "weekly",
            label: "Weekly (52/yr)"
          }
        ],
        hint: "How often you contribute. Used for compounding cadence in Growth and Goal modes."
      },
      {
        id: "target_goal",
        label: "Target Goal Amount ($)",
        type: "number",
        default: 25000,
        min: 0,
        step: 500,
        condition: v => ['goal-timeline','emergency-fund'].includes(v.mode),
        hint: "The total balance you want to reach. The calculator projects the exact month and year you cross this line."
      },
      {
        id: "essential_expenses",
        label: "Essential Monthly Expenses ($)",
        type: "number",
        default: 3500,
        min: 0,
        step: 100,
        condition: v => v.mode === 'emergency-fund',
        hint: "Non-negotiable monthly costs: rent/mortgage, utilities, food, insurance, and minimum debt payments."
      },
      {
        id: "interest_rate",
        label: "Annual Interest Rate / HYSA APY (%)",
        type: "number",
        default: 4.5,
        min: 0,
        max: 30,
        step: 0.1,
        hint: "Stated annual yield. For a High-Yield Savings Account use the advertised APY (commonly 3-5%)."
      },
      {
        id: "tax_rate",
        label: "Marginal Income Tax Rate (%)",
        type: "number",
        default: 22,
        min: 0,
        max: 50,
        step: 1,
        condition: v => v.mode === 'hysa-real-yield',
        hint: "Your marginal federal + state income tax bracket applied to interest earned."
      },
      {
        id: "inflation_rate",
        label: "Expected Inflation Rate (%)",
        type: "number",
        default: 2.5,
        min: 0,
        max: 15,
        step: 0.1,
        condition: v => v.mode === 'hysa-real-yield',
        hint: "Expected annual price increase that erodes purchasing power. US long-run average is about 2.5-3%."
      },
      {
        id: "duration_years",
        label: "Savings Duration (Years)",
        type: "number",
        default: 5,
        min: 1,
        max: 50,
        step: 1,
        condition: v => ['biweekly-monthly','hysa-real-yield'].includes(v.mode),
        hint: "The planning horizon over which growth, compounding, and real-yield erosion are measured."
      }
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
      "Enter your starting initial savings balance.",
      "Input the monthly deposit amount you plan to save.",
      "Specify the annual interest rate (APY) offered by your savings account.",
      "Enter the number of years or months you plan to save.",
      "Select the compounding frequency (most HYSAs compound daily).",
      "Review your total accumulated balance, total deposits made, and total interest earned."
    ],
    examples: [
      {
        title: "Emergency Fund Goal",
        input: "Starting: $2,000 | Monthly: $400 | APY: 4.5% | Time: 3 Years",
        result: "Total Saved: ~$17,500 (Deposits: $16,400 | Interest: ~$1,100)"
      },
      {
        title: "House Down Payment Fund",
        input: "Starting: $10,000 | Monthly: $1,200 | APY: 4.75% | Time: 4 Years",
        result: "Total Saved: ~$74,800 (Interest Earned: ~$7,200)"
      },
      {
        title: "Vacation Sinking Fund",
        input: "Starting: $500 | Monthly: $250 | APY: 4.25% | Time: 1 Year",
        result: "Total Saved: ~$3,580 (Ready for travel)"
      },
      {
        title: "Lump Sum High-Yield CD",
        input: "Starting: $25,000 | Monthly: $0 | APY: 5.0% | Time: 5 Years",
        result: "Total Balance: ~$32,000 (Risk-Free Interest: ~$7,000)"
      }
    ],
    formula: "Total Savings = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) − 1) / (r/n)], where P is starting balance, PMT is monthly deposit, r is annual rate (APY), n is compounding frequency, and t is time in years.",
    article: {
      heading: "How to Build and Optimize Your Savings Plan",
      intro: "Whether you are saving for a home down payment, building a 6-month emergency safety net, or planning a dream vacation, having a structured savings plan makes your goal achievable. The GetCalcu Savings Calculator shows you exactly how fast your money grows with regular deposits and current high-yield savings interest rates, helping you reach your target date with confidence.",
      sections: [
        {
          heading: "High-Yield Savings Accounts (HYSA) vs. Traditional Bank Accounts",
          body: "Traditional brick-and-mortar banks often pay negligible interest rates (frequently 0.01% to 0.05% APY), meaning $20,000 earns just a few dollars a year. Online High-Yield Savings Accounts (HYSAs) typically offer interest rates between 4.0% and 5.0% APY. On that same $20,000 balance, an HYSA generates $800 to $1,000 in passive interest every year while maintaining full FDIC insurance and daily liquidity."
        },
        {
          heading: "Building a Resilient 3-to-6 Month Emergency Fund",
          body: "An emergency fund is money set aside strictly for unexpected essential events, such as medical bills, major car repairs, home maintenance, or temporary job loss. Financial planners recommend saving 3 to 6 months of essential living expenses (rent/mortgage, groceries, utilities, insurance, and loan minimums) in a liquid, high-yield savings account."
        },
        {
          heading: "Automating Your Savings: The \"Pay Yourself First\" Strategy",
          body: "The most effective way to save consistently is automation. Rather than saving whatever money happens to be left over at the end of the month, set up an automatic bank transfer on each payday directly into your dedicated savings account. When you treat savings like a non-negotiable bill, your wealth builds effortlessly."
        },
        {
          heading: "Sinking Funds: Saving for Specific Known Expenses",
          body: "A sinking fund is a separate savings bucket for anticipated upcoming expenses that occur irregularly, such as annual car insurance premiums, holiday gifts, home repairs, or property taxes. Dividing the anticipated total cost by the number of months until the bill is due prevents budget surprises and credit card debt."
        },
        {
          heading: "Certificates of Deposit (CDs) vs. Money Market Accounts",
          body: "Certificates of Deposit (CDs) lock in a guaranteed fixed interest rate for a specific term (such as 6 months, 1 year, or 5 years) in exchange for keeping your money untouched until maturity. Money Market Accounts (MMAs) offer competitive interest rates with added check-writing or debit card access. Both are FDIC-insured up to $250,000 per depositor per institution."
        },
        {
          heading: "Understanding FDIC and NCUA Insurance Limits",
          body: "Cash held in US banks is insured by the Federal Deposit Insurance Corporation (FDIC) up to $250,000 per depositor, per insured bank, for each account ownership category. Credit unions provide equivalent federal protection through the National Credit Union Administration (NCUA). For balances above $250,000, spreading funds across multiple institutions ensures complete coverage."
        },
        {
          heading: "When to Save vs. When to Invest",
          body: "Money needed within the next 3 to 5 years (emergency funds, down payments, wedding expenses) belongs in safe, liquid savings vehicles where principal is protected from market downturns. Money earmarked for long-term horizons (10+ years, such as retirement) should be invested in diversified index funds to outpace inflation and compound wealth."
        },
        {
          heading: "Overcoming Savings Plateaus and Lifestyle Creep",
          body: "As your income increases through raises and bonuses, lifestyle inflation naturally tempts you to spend more. A high-leverage rule of thumb is to allocate at least 50% of every raise or bonus directly into savings and investments before upgrading your standard of living."
        }
      ]
    },
    faqs: [
      {
        q: "What is a High-Yield Savings Account (HYSA)?",
        a: "A High-Yield Savings Account is a federally insured savings account that pays a much higher Annual Percentage Yield (APY)—often 10 to 20 times higher than traditional national brick-and-mortar bank accounts."
      },
      {
        q: "How much should I keep in an emergency savings fund?",
        a: "Most financial advisors recommend keeping 3 to 6 months of essential living expenses (housing, utilities, food, debt payments, insurance) in an easily accessible high-yield savings account."
      },
      {
        q: "How often does interest compound on savings accounts?",
        a: "Most online high-yield savings accounts compound interest daily and credit the accrued interest to your account on the last day of each monthly billing statement."
      },
      {
        q: "Are high-yield savings accounts safe?",
        a: "Yes, as long as the financial institution is member FDIC (for banks) or NCUA (for credit unions). Deposits are insured up to $250,000 per depositor, per ownership category."
      },
      {
        q: "What is the difference between APY and interest rate on savings?",
        a: "The interest rate is the base rate without compounding. APY (Annual Percentage Yield) reflects the total amount of interest you earn in a full year with compounding included."
      },
      {
        q: "Can savings account interest rates change?",
        a: "Yes. High-yield savings accounts have variable rates that fluctuate when central bank benchmark interest rates (Federal Reserve rate) rise or fall."
      },
      {
        q: "Do I have to pay taxes on savings account interest?",
        a: "Yes. Interest earned on bank savings accounts is considered taxable income by the IRS. Your bank will send you a Form 1099-INT at tax time if you earn $10 or more in interest."
      },
      {
        q: "What is a Certificate of Deposit (CD)?",
        a: "A CD is a fixed-term savings product that locks in a guaranteed interest rate for a specific timeframe (e.g. 6 months to 5 years). In exchange for the guaranteed rate, you agree not to withdraw funds before maturity."
      },
      {
        q: "What is the \"Pay Yourself First\" savings strategy?",
        a: "Paying yourself first means automatically routing a portion of your paycheck into savings as soon as you get paid, before spending money on discretionary living expenses."
      },
      {
        q: "How can I save $10,000 in one year?",
        a: "To save $10,000 in 12 months, you need to save approximately $833.33 per month (or about $192.30 per week). Placing it in a 4.5% HYSA earns over $240 in additional interest along the way."
      },
      {
        q: "What is a sinking fund?",
        a: "A sinking fund is a designated savings fund set aside for a planned future expense, such as car maintenance, holiday gifts, or annual property taxes, paid for over time rather than all at once."
      },
      {
        q: "Should I pay off debt before building savings?",
        a: "First build a small starter emergency fund of $1,000 to $2,000 to prevent relying on credit cards for minor surprises. Then aggressively pay down high-interest debt (above 7% to 8%) before fully funding a 6-month reserve."
      },
      {
        q: "What happens if I exceed the $250,000 FDIC insurance limit?",
        a: "Any balance exceeding $250,000 at a single institution is uninsured in the event of a bank failure. You can protect larger sums by opening accounts across multiple different banks or utilizing deposit-sweep programs."
      },
      {
        q: "Can I withdraw money from an HYSA anytime?",
        a: "Yes. HYSAs offer high liquidity. While some banks limit certain electronic transfers to 6 per month, you can transfer money back to your checking account within 1 to 2 business days."
      },
      {
        q: "Is saving cash better than investing in the stock market?",
        a: "Savings accounts are better for short-term goals (under 3-5 years) where you cannot afford market losses. Investing in the stock market is better for long-term goals (5-10+ years) where compound growth outpaces inflation."
      }
    ],
    related: [
      "compound-interest-calculator",
      "investment-calculator",
      "budget-planner",
      "net-worth-calculator",
      "inflation-calculator",
      "retirement-calculator"
    ]
  },
  "credit-card-payoff-calculator": {
    name: "Credit Card Payoff & Strategy Calculator",
    category: "Finance",
    icon: "fa-credit-card",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate credit card debt payoff dates, expose minimum payment interest traps, analyze 0% APR balance transfer fees, and compare Avalanche vs Snowball payoff strategies.",
    metaTitle: "Credit Card Payoff Calculator | Debt Snowball vs Avalanche — GetCalcu",
    metaDescription: "Calculate how fast you can pay off credit card debt. Compare Debt Avalanche vs Debt Snowball methods, calculate interest savings, and see your debt-free date.",
    keywords: [
      "credit card payoff calculator",
      "debt payoff calculator",
      "credit card interest calculator",
      "debt avalanche calculator",
      "debt snowball calculator",
      "how long to pay off credit card",
      "credit card minimum payment calculator",
      "debt free date calculator",
      "balance transfer payoff calculator",
      "credit card consolidation calculator"
    ],
    fields: [
      {
        id: "mode",
        label: "Strategy Mode",
        type: "select",
        default: "min-payment",
        options: [
          {
            value: "min-payment",
            label: "Minimum Payment Trap & Fixed Monthly Payoff"
          },
          {
            value: "target-date",
            label: "Exact Target Debt-Free Date Goal"
          },
          {
            value: "balance-transfer",
            label: "0% APR Balance Transfer Savings"
          },
          {
            value: "avalanche-snowball",
            label: "Avalanche vs Snowball Multi-Card Strategy"
          }
        ],
        hint: "Choose what to analyze. Each mode exposes a different cost of carrying credit card debt."
      },
      {
        id: "balance",
        label: "Total Credit Card Balance ($)",
        type: "number",
        default: 7500,
        min: 0,
        step: 100,
        hint: "The total outstanding balance across the card(s) you want to pay off."
      },
      {
        id: "apr",
        label: "Annual Interest Rate / APR (%)",
        type: "number",
        default: 21.5,
        min: 0,
        max: 40,
        step: 0.1,
        hint: "The stated Annual Percentage Rate. Credit card APRs commonly range from 18% to 29% and accrue interest daily."
      },
      {
        id: "min_pct",
        label: "Minimum Payment Percentage (%)",
        type: "number",
        default: 2.5,
        min: 1,
        max: 10,
        step: 0.5,
        condition: v => v.mode === 'min-payment' || v.mode === 'avalanche-snowball',
        hint: "The percent of the balance your lender sets as the minimum each month (typically 2%-3%). Lenders also apply a $25 floor."
      },
      {
        id: "monthly_payment",
        label: "Planned Monthly Payment ($)",
        type: "number",
        default: 250,
        min: 0,
        step: 25,
        condition: v => v.mode === 'min-payment' || v.mode === 'balance-transfer' || v.mode === 'avalanche-snowball',
        hint: "The amount you commit to paying each month. Must exceed the monthly interest charge to actually reduce the balance."
      },
      {
        id: "target_months",
        label: "Target Debt-Free Timeframe (Months)",
        type: "number",
        default: 24,
        min: 1,
        max: 120,
        step: 1,
        condition: v => v.mode === 'target-date',
        hint: "The number of months within which you want to be 100% debt-free. The calculator solves for the exact monthly payment required."
      },
      {
        id: "transfer_fee",
        label: "Balance Transfer Fee (%)",
        type: "number",
        default: 3,
        min: 0,
        max: 10,
        step: 0.5,
        condition: v => v.mode === 'balance-transfer',
        hint: "The upfront one-time fee the new card charges to move your balance (typically 3%-5%). Charged immediately on top of your balance."
      },
      {
        id: "promo_months",
        label: "Promotional 0% APR Duration (Months)",
        type: "number",
        default: 18,
        min: 3,
        max: 36,
        step: 1,
        condition: v => v.mode === 'balance-transfer',
        hint: "The intro 0% interest window (commonly 12-21 months). Any balance left after this reverts to the regular APR."
      }
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
      "Enter your total current credit card balance.",
      "Input the annual percentage rate (APR) charged on your card.",
      "Enter the monthly payment amount you can commit toward paying off the debt.",
      "Review the total months until you become debt-free and the total interest you will pay.",
      "Increase your monthly payment by $50 or $100 to see how many years and dollars of interest you save."
    ],
    examples: [
      {
        title: "Moderate Debt ($5,000 at 22% APR)",
        input: "Balance: $5,000 | APR: 22% | Payment: $250/mo",
        result: "Debt-Free in 26 Months | Total Interest: ~$1,320 (vs. $6,800 on minimums)"
      },
      {
        title: "Heavy Debt Aggressive Payoff",
        input: "Balance: $15,000 | APR: 24.99% | Payment: $650/mo",
        result: "Debt-Free in 32 Months | Saved over $14,000 in interest"
      },
      {
        title: "Fast 1-Year Blitz ($3,000 Balance)",
        input: "Balance: $3,000 | APR: 19.99% | Payment: $280/mo",
        result: "Debt-Free in 12 Months | Total Interest Paid: Only ~$340"
      },
      {
        title: "Minimum Payment Comparison ($8,000 Balance)",
        input: "Balance: $8,000 | APR: 25% | Fixed Payment: $400/mo vs Min ($160/mo)",
        result: "Fixed Payment saves 18 years and ~$11,500 in interest"
      }
    ],
    formula: "Months to Payoff n = −ln(1 − (r × B) / PMT) / ln(1 + r), where B is balance, r is monthly rate (APR / 12), and PMT is fixed monthly payment.",
    article: {
      heading: "The Complete Strategy to Pay Off Credit Card Debt Fast",
      intro: "Credit card debt is one of the most expensive forms of consumer borrowing due to compounding double-digit interest rates (frequently 20% to 30% APR). Making only the minimum payment keeps you trapped in debt for decades. The GetCalcu Credit Card Payoff Calculator shows you your exact debt-free date, total interest charges, and how much money you save by adding extra monthly payments or switching payoff strategies.",
      sections: [
        {
          heading: "The Minimum Payment Trap: Why Balances Last for Decades",
          body: "Credit card minimum payments are typically calculated as just 1% to 2% of the principal balance plus accrued monthly interest, or a flat $25 to $35 minimum. Paying only this amount barely covers the monthly interest charge, leaving almost nothing to reduce the actual balance. On a $5,000 balance at 24% APR, making only minimum payments can take over 20 years to pay off and cost more than $8,000 in interest alone."
        },
        {
          heading: "Debt Avalanche Method: Mathematically Maximum Interest Savings",
          body: "The Debt Avalanche strategy focuses on paying off debts in order of highest interest rate first, while paying minimums on the rest. Once your highest-APR card is completely paid off, you roll its entire payment into the card with the next highest APR. This strategy minimizes total interest paid and mathematically gets you out of debt in the shortest possible time."
        },
        {
          heading: "Debt Snowball Method: Psychological Momentum and Quick Wins",
          body: "Popularized by Dave Ramsey, the Debt Snowball strategy focuses on paying off debts from smallest dollar balance to largest, regardless of interest rates. Knocking out small balances quickly provides psychological motivation, builds momentum, and rapidly frees up minimum monthly cash flow."
        },
        {
          heading: "How Daily Compound Interest Multiplies Credit Card Debt",
          body: "Credit card companies calculate interest using a Daily Periodic Rate (APR divided by 365) applied to your average daily balance. Because interest compounds daily throughout the billing cycle, carrying balances accelerates interest accumulation much faster than standard annual loans."
        },
        {
          heading: "0% APR Balance Transfer Cards: When and How to Use Them",
          body: "A 0% APR balance transfer credit card allows you to move high-interest debt to a new card that charges zero interest for a promotional period (usually 12 to 21 months). While cards typically charge an upfront 3% to 5% transfer fee, pausing interest allows 100% of your payments to directly reduce principal during the promotional window."
        },
        {
          heading: "Personal Debt Consolidation Loans as an Alternative",
          body: "If you have multiple high-interest credit cards, taking out a fixed-rate personal consolidation loan at 8% to 12% APR can cut your interest rate in half, replace multiple payments with a single predictable monthly bill, and establish a guaranteed 3 to 5-year payoff timeline."
        },
        {
          heading: "How Credit Card Payoff Improves Your Credit Score",
          body: "Credit utilization (the percentage of your total available credit lines being used) makes up 30% of your FICO credit score. Paying down card balances below 30%, and ideally below 10% utilization, produces rapid, dramatic improvements in your credit score."
        },
        {
          heading: "Preventing the Cycle: Building a Buffer While Paying Off Debt",
          body: "The most common reason people fall back into credit card debt is unexpected expenses (car repairs, medical bills). Maintaining a $1,000 to $2,000 cash emergency buffer ensures that surprise life events do not force you back onto high-interest credit cards while in repayment mode."
        }
      ]
    },
    faqs: [
      {
        q: "Why does paying only the credit card minimum take so long?",
        a: "Minimum payments are designed to cover primarily the monthly interest charges plus a tiny 1% portion of the principal balance, keeping you in debt for decades while maximizing bank interest profits."
      },
      {
        q: "What is the Debt Avalanche payoff method?",
        a: "The Debt Avalanche method prioritizes paying extra money toward the debt with the highest interest rate first while paying minimums on others. It is the mathematically fastest way to pay off debt and minimizes interest costs."
      },
      {
        q: "What is the Debt Snowball payoff method?",
        a: "The Debt Snowball method prioritizes paying off the smallest balance first regardless of interest rate. It builds quick psychological momentum and reduces the number of open accounts faster."
      },
      {
        q: "How does credit card interest compound?",
        a: "Credit card interest compounds daily using your Daily Periodic Rate (APR ÷ 365) multiplied by your average daily balance, which is then added to your balance each billing statement."
      },
      {
        q: "Is a 0% APR balance transfer card a good idea?",
        a: "Yes, if you have good credit and a disciplined plan to pay off the entire balance before the 0% promotional period ends (usually 12 to 21 months), even after paying the standard 3% to 5% transfer fee."
      },
      {
        q: "How does paying off credit card debt boost my credit score?",
        a: "Credit utilization accounts for 30% of your credit score. Lowering your balance below 30% (and ideally below 10%) of your credit limit immediately increases your credit score."
      },
      {
        q: "Can I negotiate a lower interest rate with my credit card company?",
        a: "Yes. Calling your card issuer, highlighting your on-time payment history, and asking for a hardship rate reduction or promotional APR often results in a lower interest rate."
      },
      {
        q: "Should I close my credit cards after paying them off?",
        a: "Generally no. Keeping cards open preserves your credit history length and total available credit limit, keeping your credit utilization low. Only close cards that charge expensive annual fees."
      },
      {
        q: "What is a personal debt consolidation loan?",
        a: "A debt consolidation loan is an installment loan with a fixed interest rate and fixed term used to pay off multiple credit card balances, combining them into one single monthly payment."
      },
      {
        q: "Should I use savings to pay off credit card debt?",
        a: "Keep a small emergency reserve ($1,000 to $2,000) for true emergencies, and use excess savings to pay down high-interest credit card debt, as 20%+ APR debt costs far more than any savings account earns."
      },
      {
        q: "What happens if I stop making credit card payments?",
        a: "Missed payments incur late fees, trigger penalty APRs (up to 29.99%), severely damage your credit score, and after 180 days the debt is charged off and sent to collections or legal action."
      },
      {
        q: "What is credit counseling or a Debt Management Plan (DMP)?",
        a: "Non-profit credit counseling agencies can negotiate reduced interest rates and fee waivers with your creditors through a Debt Management Plan, consolidating payments without taking out a new loan."
      },
      {
        q: "How much extra should I pay above the minimum?",
        a: "Even an extra $50 to $100 per month above the minimum payment can cut your payoff time by 10 to 15 years and save thousands of dollars in interest."
      },
      {
        q: "What is a credit card grace period?",
        a: "A grace period is the 21-to-25 day window between your billing statement date and payment due date. If you pay your previous statement balance in full every month, no interest is charged."
      },
      {
        q: "How can I stop using credit cards while paying them off?",
        a: "Remove card numbers from online shopping autofill, leave physical cards at home, and switch to a debit card or cash for daily expenses while in payoff mode."
      }
    ],
    related: [
      "budget-planner",
      "loan-calculator",
      "loan-interest-calculator",
      "savings-calculator",
      "net-worth-calculator",
      "compound-interest-calculator"
    ]
  },
  "rent-vs-buy-calculator": {
    name: "Rent vs. Buy Calculator",
    category: "Finance",
    icon: "fa-house-chimney",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Comprehensive financial comparison of renting versus buying a home. Calculate net costs, equity buildup, break-even points, opportunity costs, and net worth over time with intelligent recommendations.",
    metaTitle: "Rent vs Buy Calculator | Break-Even Analysis & Net Worth Comparison — GetCalcu",
    metaDescription: "Free Rent vs Buy Calculator with break-even analysis, net worth comparison, equity buildup, opportunity cost, and intelligent recommendations. Should you rent or buy?",
    keywords: [
      "rent vs buy calculator",
      "should I rent or buy",
      "rent vs buy break-even calculator",
      "buy vs rent calculator",
      "house buying calculator",
      "renting versus owning",
      "opportunity cost calculator",
      "rent or buy decision",
      "home buying vs renting",
      "rent vs buy 2026",
      "is it better to rent or buy",
      "home equity calculator",
      "rent vs buy net worth",
      "buying a house vs renting calculator"
    ],
    related: [
      "house-affordability-calculator",
      "mortgage-calculator",
      "amortization-calculator",
      "budget-planner",
      "retirement-calculator",
      "savings-calculator",
      "investment-calculator",
      "compound-interest-calculator",
      "inflation-calculator"
    ],
    fields: [
      {
        id: "basic_section",
        type: "section",
        label: "Basic Inputs",
        icon: "fa-sliders"
      },
      {
        id: "home_price",
        label: "Home Purchase Price ($)",
        type: "range",
        default: 450000,
        min: 50000,
        max: 5000000,
        step: 5000,
        hint: "The total purchase price of the home you are considering buying."
      },
      {
        id: "down_payment_type",
        label: "Down Payment Mode",
        type: "select",
        default: "percent",
        options: [
          {
            value: "percent",
            label: "Percentage (%)"
          },
          {
            value: "dollar",
            label: "Dollar Amount ($)"
          }
        ],
        hint: "Switch between entering your down payment as a percentage or a specific dollar amount."
      },
      {
        id: "down_payment",
        label: "Down Payment",
        type: "range",
        default: 20,
        min: 0,
        max: 100,
        step: 0.5,
        hint: "The cash you pay upfront. 20% is standard to avoid PMI. The calculator converts this to a dollar amount based on the home price."
      },
      {
        id: "mortgage_rate",
        label: "Mortgage Interest Rate (%)",
        type: "range",
        default: 6.25,
        min: 0,
        max: 20,
        step: 0.05,
        hint: "The annual interest rate (APR) on your mortgage. Current 30-year fixed rates typically range 6-8%."
      },
      {
        id: "loan_term",
        label: "Loan Term",
        type: "select",
        default: 30,
        options: [
          {
            value: 15,
            label: "15 Years"
          },
          {
            value: 20,
            label: "20 Years"
          },
          {
            value: 30,
            label: "30 Years"
          }
        ],
        hint: "How long you will take to repay the mortgage. Shorter terms build equity faster but have higher monthly payments."
      },
      {
        id: "current_rent",
        label: "Current Monthly Rent ($)",
        type: "range",
        default: 2200,
        min: 0,
        max: 20000,
        step: 50,
        hint: "What you currently pay (or would pay) for rent each month."
      },
      {
        id: "years_staying",
        label: "Expected Years Staying in the Home",
        type: "range",
        default: 8,
        min: 1,
        max: 40,
        step: 1,
        hint: "This is one of the most influential variables. Buying has high upfront costs that take several years to recover. The longer you stay, the more equity you build and the more buying tends to win. If you plan to move within 3-5 years, renting is often cheaper."
      },
      {
        id: "rent_increase",
        label: "Expected Annual Rent Increase (%)",
        type: "range",
        default: 3,
        min: 0,
        max: 15,
        step: 0.1,
        hint: "The average yearly percentage increase in rent. Historical average is about 2-4% annually."
      },
      {
        id: "home_appreciation",
        label: "Expected Home Appreciation (%)",
        type: "range",
        default: 3.5,
        min: -5,
        max: 15,
        step: 0.1,
        hint: "Expected annual increase in home value. Historical US average is about 3-5% per year."
      },
      {
        id: "investment_return",
        label: "Expected Investment Return (%)",
        type: "range",
        default: 7,
        min: 0,
        max: 20,
        step: 0.1,
        hint: "The annual return you could earn by investing your down payment and closing costs instead of buying. S&P 500 long-term average: 7-10%."
      },
      {
        id: "advanced_section",
        type: "section",
        label: "Advanced Options",
        icon: "fa-gear",
        collapsible: true
      },
      {
        id: "property_tax",
        label: "Annual Property Tax ($)",
        type: "number",
        default: 5400,
        min: 0,
        step: 100,
        hint: "Yearly property tax based on your local government rate. Typically 1-2% of home value annually."
      },
      {
        id: "property_tax_growth",
        label: "Property Tax Growth (%)",
        type: "number",
        default: 2,
        min: 0,
        max: 10,
        step: 0.1,
        hint: "Annual increase in property taxes. Often matches or exceeds inflation."
      },
      {
        id: "home_insurance",
        label: "Annual Home Insurance ($)",
        type: "number",
        default: 1400,
        min: 0,
        step: 100,
        hint: "Yearly homeowners insurance premium. Covers damage, liability, and personal property."
      },
      {
        id: "insurance_growth",
        label: "Insurance Growth (%)",
        type: "number",
        default: 3,
        min: 0,
        max: 10,
        step: 0.1,
        hint: "Annual increase in home insurance premiums."
      },
      {
        id: "hoa_fees",
        label: "Monthly HOA Fees ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 25,
        hint: "Monthly homeowners association fees for common area maintenance (condos, townhomes, some neighborhoods)."
      },
      {
        id: "pmi",
        label: "Monthly PMI ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 10,
        hint: "Private Mortgage Insurance when down payment is less than 20%. Typically 0.5-1% of loan amount annually, divided by 12."
      },
      {
        id: "annual_maintenance",
        label: "Annual Maintenance ($)",
        type: "number",
        default: 4500,
        min: 0,
        step: 100,
        hint: "Estimated yearly maintenance and repairs. A common rule is 1-2% of home value annually."
      },
      {
        id: "maintenance_growth",
        label: "Maintenance Growth (%)",
        type: "number",
        default: 2.5,
        min: 0,
        max: 10,
        step: 0.1,
        hint: "Annual increase in maintenance costs as the home ages."
      },
      {
        id: "closing_costs",
        label: "Closing Costs ($)",
        type: "number",
        default: 13500,
        min: 0,
        step: 500,
        hint: "One-time costs when buying: loan origination, appraisal, title insurance, attorney fees. Typically 2-5% of home price."
      },
      {
        id: "selling_costs",
        label: "Selling Costs (%)",
        type: "number",
        default: 6,
        min: 0,
        max: 15,
        step: 0.1,
        hint: "Costs when selling: realtor commission (typically 5-6%), closing fees, capital gains tax if applicable."
      },
      {
        id: "mortgage_origination",
        label: "Mortgage Origination Fee (%)",
        type: "number",
        default: 1,
        min: 0,
        max: 5,
        step: 0.1,
        hint: "Lender fee for processing the mortgage, typically 0.5-1.5% of loan amount."
      },
      {
        id: "inflation_rate",
        label: "Annual Inflation Rate (%)",
        type: "number",
        default: 3,
        min: 0,
        max: 10,
        step: 0.1,
        hint: "Expected annual inflation rate. Affects future costs and the real value of money over time."
      },
      {
        id: "discount_rate",
        label: "Discount Rate (%)",
        type: "number",
        default: 3,
        min: 0,
        max: 15,
        step: 0.1,
        hint: "The rate used to discount future cash flows to present value. Often set near the inflation rate for a real-terms comparison."
      },
      {
        id: "realtor_commission",
        label: "Realtor Commission (%)",
        type: "number",
        default: 5,
        min: 0,
        max: 10,
        step: 0.1,
        hint: "The portion of the sale price paid to real estate agents when selling. Typically 5-6%."
      },
      {
        id: "misc_ownership",
        label: "Miscellaneous Ownership Costs ($/yr)",
        type: "number",
        default: 500,
        min: 0,
        step: 100,
        hint: "Other annual ownership costs: pest control, landscaping, appliance repairs, etc."
      },
      {
        id: "investment_tax_rate",
        label: "Investment Tax Rate (%)",
        type: "number",
        default: 15,
        min: 0,
        max: 50,
        step: 1,
        hint: "Tax rate on investment gains (capital gains tax). Long-term gains are typically 15% for most investors."
      },
      {
        id: "marginal_tax_rate",
        label: "Marginal Tax Rate (%)",
        type: "number",
        default: 24,
        min: 0,
        max: 50,
        step: 1,
        hint: "Your federal + state marginal tax bracket. Affects the tax deductibility of mortgage interest."
      },
      {
        id: "renters_insurance",
        label: "Annual Renters Insurance ($)",
        type: "number",
        default: 200,
        min: 0,
        step: 50,
        hint: "Yearly renters insurance to cover personal belongings and liability while renting."
      },
      {
        id: "moving_costs",
        label: "Expected Moving Costs ($)",
        type: "number",
        default: 2000,
        min: 0,
        step: 500,
        hint: "One-time moving expenses if you buy. Includes movers, truck rental, packing supplies."
      }
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
    howTo: [
      "Enter the home purchase price using the slider or type a specific amount.",
      "Choose your down payment mode — percentage or dollar amount — and set the value.",
      "Set your mortgage rate, loan term, current rent, and how many years you plan to stay.",
      "Adjust expected rent increase, home appreciation, and investment return.",
      "Expand \"Advanced Options\" to customize property tax, insurance, HOA, PMI, maintenance, closing costs, and more.",
      "Review the executive dashboard, recommendation, charts, and year-by-year comparison table.",
      "Read the personalized insights to understand which assumptions matter most.",
      "Follow the suggested next-step calculators based on your result."
    ],
    examples: [
      {
        title: "Young Professional (Rent)",
        input: "$350,000 home, 10% down, 6.5% rate, $1,800 rent, 3-year horizon, 8% investment return",
        result: "Renting wins. High upfront costs and a short horizon make buying uneconomical; investing the down payment outperforms."
      },
      {
        title: "Growing Family (Buy)",
        input: "$500,000 home, 20% down, 6% rate, $2,400 rent, 15-year horizon, 3% appreciation",
        result: "Buying wins strongly. Long tenure recovers costs and builds substantial equity and appreciation."
      },
      {
        title: "High Mortgage Rate Environment",
        input: "$450,000 home, 20% down, 7.5% rate, $2,200 rent, 8-year horizon",
        result: "Higher rates delay break-even. Compare 5%, 6%, 7%, and 8% to see how the recommendation shifts."
      },
      {
        title: "Typical 20% Down Purchase",
        input: "$450,000 home, 20% down, 6.25% rate, 30yr, $2,200 rent, 3.5% appreciation, 7% investment return, 8 years",
        result: "Buying wins by ~$36,800. Break-even around Year 4-5. High confidence if staying 7+ years."
      },
      {
        title: "Low Down Payment Scenario",
        input: "$450,000 home, 5% down, PMI required, 6.5% rate, 30yr, $2,200 rent, 8 years",
        result: "PMI and higher loan costs delay break-even to Year 6-7. Still favorable long-term with appreciation."
      },
      {
        title: "High Rent Growth Market",
        input: "$450,000 home, 20% down, $2,500 rent, 5% annual rent increases, 8 years",
        result: "Buying wins by ~$78,000. Rapid rent growth makes buying advantageous by Year 3."
      },
      {
        title: "Short Time Horizon",
        input: "$450,000 home, 20% down, plan to move in 3 years, $2,200 rent, 8 years",
        result: "Renting likely wins. Transaction costs (closing + selling) erase equity gains in under 5 years."
      }
    ],
    formula: "Monthly P&I = P × [r(1+r)^n] / [(1+r)^n − 1] | Equity = Home Value − Remaining Balance | Net Proceeds = Equity − Selling Costs | Opportunity Cost = Invested Capital × (1 + Return)^t | Net Worth (Buy) = Equity − Cumulative Costs | Net Worth (Rent) = Investment Portfolio − Cumulative Rent",
    article: {
      heading: "The Complete Guide to the Rent vs. Buy Decision",
      intro: "The rent vs. buy question is one of the most significant financial decisions most people will make. It involves far more than comparing a monthly rent check to a mortgage payment — it requires understanding equity buildup, opportunity cost, tax implications, transaction costs, and how time in the market changes the math. The GetCalcu Rent vs. Buy Calculator models all of these factors to give you a clear, data-driven answer tailored to your situation.",
      sections: [
        {
          heading: "When Buying Makes Financial Sense",
          body: "Buying typically wins when you plan to stay 7+ years, home appreciation is steady, rent inflation is high, and your mortgage payment is close to your current rent. Over long horizons, fixed mortgage payments stay stable while rents compound upward, and principal payments build equity that you keep when you sell. The calculator shows your exact break-even year."
        },
        {
          heading: "When Renting Is the Better Decision",
          body: "Renting often wins for short time horizons (under 5 years), when you value flexibility to relocate, when the opportunity cost of your down payment is high, or when home prices are stagnant. Renting avoids transaction costs, maintenance, and property taxes, and frees up capital that can be invested. Our calculator compares both strategies fairly."
        },
        {
          heading: "Understanding Opportunity Cost",
          body: "When you buy, you tie up a large down payment (often 20% of the home price) plus closing costs. That capital could otherwise be invested. If you invest $90,000 plus $13,500 in closing costs at a 7% annual return, it grows substantially over 10 years. The calculator compares that investment growth against the equity you build in the home, revealing which strategy creates more wealth."
        },
        {
          heading: "The 5% Rule Explained",
          body: "The 5% rule is a quick heuristic: if the annual cost of owning (mortgage interest + property taxes + insurance + maintenance + transaction costs) is more than 5% of the home value per year, renting may be cheaper. Multiply the home price by 5% and compare to your annual rent. If rent is lower, renting wins on pure cash flow — but this rule ignores equity and appreciation, so use the full calculator for the complete picture."
        },
        {
          heading: "Building Home Equity",
          body: "Each mortgage payment splits into interest and principal. Early payments are mostly interest; later payments are mostly principal. As you pay down the loan and the home appreciates, your equity grows. When you sell, you keep the equity minus selling costs. The calculator charts your principal, appreciation, and total equity year by year."
        },
        {
          heading: "Hidden Costs of Homeownership",
          body: "Beyond the mortgage, owners pay closing costs (2-5% of price), property taxes, homeowners insurance, maintenance (1-2% of value annually), HOA fees, PMI if under 20% down, and selling costs (6-10% when you sell). These hidden costs can add tens of thousands of dollars and are why buying is not always cheaper than renting."
        },
        {
          heading: "Common Mistakes People Make",
          body: "The most common mistakes are buying too early (before you can afford it or before you plan to stay long enough), ignoring opportunity cost, underestimating maintenance, staying too short a time to recover transaction costs, and overestimating appreciation. Our calculator helps you avoid these by modeling realistic assumptions."
        },
        {
          heading: "How Home Appreciation and Rent Inflation Affect the Decision",
          body: "In hot markets where home values rise 5-7% annually, buying builds wealth faster through appreciation. In markets with high rent growth (5%+ annually), buying provides payment stability while renters face escalating costs. Conversely, in stagnant or declining markets, appreciation may not offset ownership costs, and low rent growth favors renting."
        }
      ]
    },
    faqs: [
      {
        q: "What is the 5% rule for renting vs buying?",
        a: "The 5% rule is a quick heuristic: if the annual cost of owning (mortgage interest + property taxes + insurance + maintenance + transaction costs) is more than 5% of the home value per year, renting may be cheaper. More precisely, multiply the home price by 5% and compare to your annual rent × 12. If rent is lower, renting wins on pure cash flow. However, this rule ignores equity buildup and appreciation, so use our full calculator for the complete picture."
      },
      {
        q: "Is renting throwing money away?",
        a: "No. Renting provides housing flexibility, no maintenance responsibilities, and preserves capital that can be invested. While you do not build equity, you also avoid transaction costs (closing costs, selling commissions) and maintenance expenses. In some markets and time horizons, renting creates more net worth than buying because the opportunity cost of the down payment exceeds the equity you would build. Our calculator compares both strategies fairly."
      },
      {
        q: "How much home appreciation should I assume?",
        a: "The long-term US historical average is about 3-5% annually, but this varies dramatically by market and time period. Over the next 10 years, many analysts expect 2-4% appreciation. In hot markets, 5-7% is possible; in stagnant markets, 0-2%. Use a conservative estimate (2-3%) for planning, and test higher scenarios to see sensitivity. Our calculator lets you adjust this assumption instantly."
      },
      {
        q: "How long should I stay before buying?",
        a: "The break-even point — where buying becomes cheaper than renting — typically occurs between 3 and 7 years, depending on your down payment, mortgage rate, home appreciation, rent growth, and local transaction costs. If you plan to move within 3 years, renting is usually cheaper due to high upfront buying costs. If you plan to stay 7+ years, buying typically builds more wealth. Use our calculator to find your exact break-even year."
      },
      {
        q: "How does inflation affect the rent vs. buy decision?",
        a: "Inflation raises both rents and ownership costs (property taxes, insurance, maintenance), but in different ways. Rents typically increase with inflation (or faster in hot markets), exposing renters to rising costs. Fixed-rate mortgages provide payment stability — your principal and interest stay the same for 30 years. However, property taxes and insurance rise with inflation. The net effect usually favors buying over long periods because the mortgage is fixed while rents compound upward."
      },
      {
        q: "What investment return should I assume for the opportunity cost?",
        a: "For the opportunity cost calculation, use a realistic long-term investment return. The S&P 500 has averaged about 10% before inflation (7-8% after inflation) over decades. A diversified 60/40 portfolio averages 6-7%. For conservative planning, use 6-7%; for aggressive planning, 8-10%. The key insight: if you can earn 7-8% on investments and your home appreciates 3-4%, the opportunity cost of your down payment is real and can exceed equity buildup in the early years."
      },
      {
        q: "Does buying always build wealth?",
        a: "No. Buying builds wealth when home appreciation plus equity buildup exceeds the total cost of ownership (mortgage interest, taxes, insurance, maintenance, transaction costs). In scenarios with low appreciation, high transaction costs, or short time horizons, renting and investing the down payment can create more net worth. Our calculator objectively compares both strategies to show which creates more wealth in your specific situation."
      },
      {
        q: "What is the break-even point in a rent vs buy decision?",
        a: "The break-even point is the year when the cumulative net worth of buying (home equity minus ownership costs) exceeds the cumulative net worth of renting (investment portfolio minus rent paid). Before this point, renting is financially ahead; after it, buying wins. It typically falls between years 3 and 7. Our calculator identifies your exact break-even year based on your assumptions."
      },
      {
        q: "How does the down payment affect the rent vs buy decision?",
        a: "A larger down payment reduces your loan amount, lowers monthly payments, and can eliminate PMI (at 20%+). However, it also increases the opportunity cost — more capital tied up that could be invested. A smaller down payment preserves liquidity but adds PMI and higher interest costs. The optimal down payment balances these trade-offs; our calculator lets you test different amounts."
      },
      {
        q: "What is opportunity cost in the context of buying a home?",
        a: "Opportunity cost is the potential return you give up by tying up capital in a home instead of investing it. When you put $90,000 down and pay $13,500 in closing costs, that $103,500 could instead grow in the stock market. If it earns 7% annually, it compounds significantly over a decade. The calculator compares this forgone investment growth against the equity you build in the home."
      },
      {
        q: "How do mortgage rates affect the rent vs buy decision?",
        a: "Higher mortgage rates increase monthly payments and total interest, delaying the break-even point and making renting more attractive. At 5% vs 8%, the difference on a $360,000 loan is hundreds of dollars per month and tens of thousands in total interest. In high-rate environments, renting and investing may outperform buying, especially over shorter horizons. Use our calculator to compare rate scenarios."
      },
      {
        q: "Should I include maintenance costs when comparing rent vs buy?",
        a: "Absolutely. Maintenance is a real, ongoing ownership cost that renters do not pay. A common rule is 1-2% of home value annually — on a $450,000 home, that is $4,500-$9,000 per year. Over 10 years, that is $45,000-$90,000. Underestimating maintenance is one of the most common mistakes in rent vs buy comparisons. Our calculator includes it by default."
      },
      {
        q: "What are the hidden costs of buying a home?",
        a: "Hidden costs include closing costs (2-5% of price: origination, appraisal, title, attorney), property taxes, homeowners insurance, maintenance (1-2% annually), HOA fees, PMI if under 20% down, and selling costs (6-10% when you sell: realtor commission, closing fees). These can add tens of thousands of dollars and are why buying is not always cheaper than renting."
      },
      {
        q: "How do selling costs affect the rent vs buy decision?",
        a: "Selling costs — typically 6-10% of the sale price (realtor commission plus closing fees) — are deducted from your equity when you sell. On a $500,000 home, that is $30,000-$50,000. These costs are why buying is risky for short horizons: if you sell within a few years, selling costs can erase all your equity gains. Our calculator includes selling costs in the net cost of buying."
      },
      {
        q: "Is it better to rent and invest the difference?",
        a: "Sometimes, yes. If your monthly ownership cost exceeds rent, the renter can invest the difference. Combined with investing the down payment, this can outperform home equity — especially with high investment returns, low appreciation, or short horizons. However, over long horizons with steady appreciation, home equity usually wins because you benefit from both principal paydown and appreciation. Our calculator models both paths."
      },
      {
        q: "How does the expected years staying affect the decision?",
        a: "The number of years you stay is one of the most influential variables. Buying has high upfront costs (closing, moving, origination) that take 3-7 years to recover. If you stay fewer than 5 years, renting is often cheaper. If you stay 7+ years, buying typically builds more wealth. The longer you stay, the more equity and appreciation accumulate, and the more buying wins."
      },
      {
        q: "What is PMI and how does it affect the decision?",
        a: "Private Mortgage Insurance (PMI) protects the lender when you put down less than 20%. It typically costs 0.5-1% of the loan amount annually, added to your monthly payment. On a $400,000 loan, that is $2,000-$4,000 per year. PMI increases ownership costs and delays the break-even point, making renting relatively more attractive for low-down-payment buyers."
      },
      {
        q: "How do HOA fees factor into the rent vs buy comparison?",
        a: "HOA fees cover common-area maintenance in condos, townhomes, and some neighborhoods. They can range from $100 to $1,000+ per month and typically rise over time. These are real ownership costs that renters do not pay. Our calculator includes monthly HOA fees in the total cost of buying, so you get an accurate comparison."
      },
      {
        q: "What is the difference between net cost of buying and net cost of renting?",
        a: "The net cost of buying is your total cash outflows (mortgage payments, taxes, insurance, maintenance, HOA, PMI, closing costs, selling costs) minus the equity you keep when you sell. The net cost of renting is your total rent plus renters insurance minus the value of your investment portfolio (down payment + savings invested). The option with the lower net cost is financially better."
      },
      {
        q: "How should I use this calculator to make my decision?",
        a: "Start with realistic assumptions for your situation, then test sensitivity: try different time horizons, mortgage rates, appreciation rates, and rent increases. Look at the break-even year and the financial advantage. Read the personalized insights to understand which variables matter most. Finally, use the suggested next-step calculators to plan your budget, mortgage, or savings strategy."
      }
    ]
  },
  "house-affordability-calculator": {
    name: "House Affordability Calculator",
    category: "Finance",
    icon: "fa-house",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate how much house you can afford based on your income, debt, and down payment. Get detailed DTI analysis.",
    metaDescription: "Find out how much house you can afford based on your annual income, down payment, monthly debts, and the 28/36 debt-to-income rule. Clear, realistic home buying budget.",
    keywords: [
      "house affordability calculator",
      "how much house can I afford",
      "home affordability calculator",
      "home buying budget calculator",
      "how much mortgage can I afford",
      "debt to income home affordability",
      "maximum house price calculator",
      "income needed for 400k house",
      "28 36 rule calculator",
      "first time home buyer budget"
    ],
    fields: [
      {
        id: "annual_income",
        label: "Annual Gross Household Income ($)",
        type: "number",
        default: 105000,
        min: 0,
        step: 1000,
        hint: "Total yearly household income before taxes."
      },
      {
        id: "monthly_debt",
        label: "Monthly Debt Payments ($)",
        type: "number",
        default: 500,
        min: 0,
        step: 50,
        hint: "Car loans, student loans, credit cards, etc."
      },
      {
        id: "down_payment",
        label: "Cash Saved for Down Payment ($)",
        type: "number",
        default: 60000,
        min: 0,
        step: 1000,
        hint: "Cash available for down payment."
      },
      {
        id: "loan_term",
        label: "Loan Term (Years)",
        type: "select",
        default: 30,
        options: [
          {
            value: 15,
            label: "15 years"
          },
          {
            value: 20,
            label: "20 years"
          },
          {
            value: 30,
            label: "30 years"
          }
        ],
        hint: "How long to repay the mortgage."
      },
      {
        id: "mortgage_rate",
        label: "Estimated Mortgage Rate (%)",
        type: "number",
        default: 6.75,
        min: 0.01,
        max: 20,
        step: 0.05,
        hint: "Expected annual interest rate (APR)."
      },
      {
        id: "property_tax_rate",
        label: "Annual Property Tax Rate (%)",
        type: "number",
        default: 1.2,
        min: 0,
        max: 5,
        step: 0.1,
        hint: "Effective annual property tax rate (typically 0.5-2%)."
      },
      {
        id: "home_insurance",
        label: "Annual Home Insurance ($)",
        type: "number",
        default: 1500,
        min: 0,
        step: 100,
        hint: "Yearly homeowners insurance premium."
      },
      {
        id: "hoa_fees",
        label: "Monthly HOA / Co-op Fee ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 25,
        hint: "Monthly HOA or co-op fees."
      },
      {
        id: "lender_rule",
        label: "Lender Rule Preference",
        type: "select",
        default: "conventional",
        options: [
          {
            value: "conventional",
            label: "Conventional 28/36 Rule"
          },
          {
            value: "fha",
            label: "FHA Loan 31/43 Rule"
          },
          {
            value: "va",
            label: "VA Loan 41% DTI"
          },
          {
            value: "aggressive",
            label: "Aggressive 36/45 Rule"
          }
        ],
        hint: "Choose the lender guideline to use."
      }
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
      "Enter your annual household gross income (before taxes).",
      "Input your total monthly debt payments (car loans, student loans, minimum credit card payments).",
      "Enter the cash amount you have saved for a down payment.",
      "Set the current mortgage interest rate and loan term (usually 30 years).",
      "Include estimated annual property taxes, homeowners insurance, and any HOA fees.",
      "Review your recommended purchase price, maximum loan amount, and estimated monthly payment breakdown."
    ],
    examples: [
      {
        title: "Single Earner, Moderate Debt",
        input: "Income: $85,000/yr | Debts: $400/mo | Down Payment: $40,000 | Rate: 6.5%",
        result: "Affordable Home: ~$310,000 | Monthly Payment: ~$1,980"
      },
      {
        title: "Dual Income, Debt-Free",
        input: "Income: $150,000/yr | Debts: $0/mo | Down Payment: $100,000 | Rate: 6.25%",
        result: "Affordable Home: ~$590,000 | Monthly Payment: ~$3,500"
      },
      {
        title: "High Income in High-Cost Market",
        input: "Income: $220,000/yr | Debts: $800/mo | Down Payment: $180,000 | Rate: 6.5%",
        result: "Affordable Home: ~$840,000 | Monthly Payment: ~$5,130"
      },
      {
        title: "First-Time Buyer (Low Down Payment)",
        input: "Income: $70,000/yr | Debts: $250/mo | Down Payment: $15,000 | Rate: 6.75%",
        result: "Affordable Home: ~$240,000 | Monthly Payment: ~$1,630"
      }
    ],
    formula: "Max Monthly Payment = Min[(Gross Monthly Income × 0.28), (Gross Monthly Income × 0.36 − Monthly Debts)]. Max Purchase Price = Loan Principal (derived from Max Payment & interest rate) + Down Payment.",
    article: {
      heading: "How Much House Can You Realistically Afford?",
      intro: "Figuring out how much home you can afford is about more than just finding the maximum loan a bank is willing to approve. A comfortable home purchase leaves room in your monthly budget for everyday living, emergency savings, retirement contributions, and fun. The GetCalcu House Affordability Calculator combines your income, existing monthly debts, down payment, and standard lending rules to give you a clear, realistic purchase price range.",
      sections: [
        {
          heading: "The 28/36 Debt-to-Income (DTI) Rule Explained",
          body: "The 28/36 rule is the classic benchmark used by financial advisors and mortgage underwriters to determine safe home loan limits. The \"front-end\" 28% rule states that your total housing expenses (mortgage principal, interest, taxes, and insurance) should not exceed 28% of your gross monthly income. The \"back-end\" 36% rule states that your total debt payments (housing expenses plus car loans, student loans, credit cards, and personal loans) should not exceed 36% of your gross monthly income."
        },
        {
          heading: "Gross Income vs. Take-Home Pay",
          body: "Lenders calculate affordability using your gross income (before taxes and deductions), but your actual bills are paid from your net take-home pay. If you have significant paycheck deductions for health insurance, 401(k) retirement contributions, or state taxes, a mortgage approved at the maximum lending limit can feel uncomfortably tight. Always evaluate how the monthly payment fits your actual net monthly bank deposit."
        },
        {
          heading: "How Down Payment and Cash Reserves Shape Affordability",
          body: "Every dollar in down payment directly increases the purchase price you can afford while keeping your monthly mortgage payment steady. However, never spend all your savings on the down payment. Lenders look for cash reserves (typically 2 to 6 months of living expenses), and homeowners need an emergency fund for unexpected repairs, moving expenses, and maintenance."
        },
        {
          heading: "The Impact of Interest Rates on Your Buying Power",
          body: "Mortgage interest rates directly dictate your purchasing power. A 1% increase in interest rates reduces your home buying budget by roughly 10% for the exact same monthly payment. When rates are higher, buyers often choose to put down more cash, buy down the rate with discount points, or look at slightly lower price brackets."
        },
        {
          heading: "Hidden Costs of Homeownership to Budget For",
          body: "Beyond the monthly PITI payment, homeowners must budget for regular maintenance (plan on 1% to 2% of the home value annually), utility bills (which are typically higher than in an apartment), HOA (Homeowners Association) dues if applicable, and periodic repairs like roofing, plumbing, or HVAC servicing."
        },
        {
          heading: "How Existing Debts Shrink Your Mortgage Budget",
          body: "Because lenders cap your total back-end debt ratio, every monthly debt payment reduces your potential mortgage payment dollar-for-dollar. For example, a $450 monthly car payment and $250 student loan payment can lower the maximum home loan you qualify for by $80,000 to $100,000. Paying down revolving debts before applying for a mortgage gives an immediate boost to your buying power."
        },
        {
          heading: "Conservative vs. Aggressive Affordability Targets",
          body: "A conservative budget keeps housing costs at or below 25% of take-home pay on a 15-year or 30-year loan, maximizing your ability to invest and travel. An aggressive budget pushes toward the maximum underwriter limit of 43% to 45% DTI, which may be necessary in high-cost-of-living metropolitan areas but requires strict budgeting in other areas of life."
        },
        {
          heading: "Steps to Increase Your Home Buying Budget",
          body: "If your target home price is currently out of reach, focus on three high-leverage levers: pay down existing non-mortgage debts to lower your back-end DTI, save a larger down payment to eliminate PMI and reduce the loan size, and improve your credit score above 740 to secure the lowest available interest rates."
        }
      ]
    },
    faqs: [
      {
        q: "How much of my income should go toward a mortgage?",
        a: "A general financial standard is the 28% front-end rule, meaning your monthly housing payment (principal, interest, taxes, and insurance) should not exceed 28% of your gross monthly income. Some conservative experts recommend keeping it under 25% of your take-home pay."
      },
      {
        q: "What is the 28/36 rule in real estate?",
        a: "The 28/36 rule means your total housing costs should not exceed 28% of your gross monthly income, and your total debt payments (housing + student loans, car notes, credit cards) should not exceed 36% of your gross monthly income."
      },
      {
        q: "How does my credit score affect home affordability?",
        a: "A higher credit score qualifies you for lower interest rates and lower PMI rates. Lowering your interest rate by just 0.5% saves hundreds of dollars every month, which directly increases the maximum home price you can afford for the same budget."
      },
      {
        q: "What income do I need to buy a $400,000 house?",
        a: "With a 20% down payment ($80,000) and a 6.5% interest rate on a 30-year fixed loan, you will generally need an annual household income between $95,000 and $115,000, depending on your other monthly debts, local property taxes, and insurance costs."
      },
      {
        q: "Should I include bonuses or commissions in my income?",
        a: "Lenders typically allow you to include bonuses, commissions, or overtime income only if you have a consistent 2-year history of receiving that income and it is likely to continue."
      },
      {
        q: "How much should I keep in savings after buying a home?",
        a: "You should keep at least 3 to 6 months of essential living expenses in an emergency fund after paying your down payment and closing costs. This protects you against emergency home repairs, medical bills, or job changes."
      },
      {
        q: "What are closing costs and how do they impact affordability?",
        a: "Closing costs are fees paid at the closing of a real estate transaction (lender fees, title search, appraisal, escrow funding), typically totaling 2% to 5% of the loan amount. They are paid in cash in addition to your down payment."
      },
      {
        q: "Does having car or student loan debt hurt how much I can borrow?",
        a: "Yes. Every dollar you owe on monthly debt payments reduces the monthly room available for a mortgage payment under lender debt-to-income limits. Paying off a car loan or student loan can significantly boost your borrowing limit."
      },
      {
        q: "What if I am self-employed or a 1099 contractor?",
        a: "Self-employed borrowers generally need to provide 2 years of complete personal and business tax returns. Lenders use your net taxable business income (after deductions and write-offs), rather than your gross revenue."
      },
      {
        q: "Can I get approved for more than I can afford?",
        a: "Yes. Mortgage lenders often approve borrowers for the absolute maximum debt limit allowed by lending guidelines (up to 43% or 50% DTI in some programs). That does not mean it is financially wise to spend that full amount."
      },
      {
        q: "How do property taxes affect how much house I can buy?",
        a: "Property taxes are part of your monthly payment. In high-tax areas (where taxes exceed 2% of the home value), your monthly escrow payment is higher, which reduces the loan amount and home price you can afford compared to low-tax areas."
      },
      {
        q: "Is it better to buy a cheaper house or stretch my budget?",
        a: "Buying below your maximum budget gives you financial flexibility to build savings, invest, handle unexpected maintenance, and weather economic downturns without the stress of being \"house poor.\""
      },
      {
        q: "How does an HOA fee affect my affordability?",
        a: "HOA (Homeowners Association) fees are added directly to your monthly debt obligations. A $300/month HOA fee reduces your purchasing power by approximately $40,000 to $50,000 in mortgage loan size."
      },
      {
        q: "What is the difference between pre-qualification and pre-approval?",
        a: "Pre-qualification is an informal estimate of what you might borrow based on self-reported numbers. Pre-approval is a verified lender commitment based on actual credit checks, tax returns, pay stubs, and bank statements."
      },
      {
        q: "Can I use gift funds for my down payment?",
        a: "Yes, most conventional and government loan programs allow down payment gift funds from immediate family members, provided you submit a signed gift letter verifying the money does not need to be repaid."
      }
    ],
    faqSchema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Can I afford a $500k house on $100k income?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "With $100k annual income ($8,333/month gross), the conventional 28/36 rule suggests a maximum housing payment of about $2,333/month (28% front-end). At current rates (6-7%), that supports a loan of roughly $350,000–$380,000. Adding a down payment of $120,000–$150,000 would be needed to reach a $500k purchase price. Use our house affordability calculator to test your exact down payment, debt, and rate scenario."
          }
        },
        {
          "@type": "Question",
          name: "What is the 28/36 rule in home buying?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The 28/36 rule is the conventional lending standard: your front-end DTI (housing payment ÷ gross monthly income) should not exceed 28%, and your back-end DTI (total monthly debt ÷ gross monthly income) should not exceed 36%. If your existing monthly debt is $500, the back-end ratio becomes the binding constraint because it leaves less room for the new mortgage payment."
          }
        },
        {
          "@type": "Question",
          name: "How does monthly debt affect home buying power?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Monthly debt payments (car loans, student loans, credit cards) directly reduce the housing payment you can afford under the back-end DTI. For example, with $800/month in existing debt at the 36% back-end limit on a $6,000/month income, only $1,360/month remains for housing (36% of $6,000 = $2,160 total debt capacity minus $800 existing debt). Reducing or paying off debt before applying for a mortgage can significantly increase your home buying power."
          }
        },
        {
          "@type": "Question",
          name: "What is the difference between FHA 31/43 and Conventional 28/36?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "FHA loans allow higher DTI ratios: 31% front-end and 43% back-end versus conventional 28/36. This makes FHA accessible for buyers with higher debt loads or smaller down payments (as low as 3.5%). However, FHA requires mortgage insurance premiums (MIP) for the life of the loan or at least 11 years, which adds to the monthly cost. Conventional loans typically require 20% down to avoid PMI but offer more flexibility in other areas."
          }
        },
        {
          "@type": "Question",
          name: "How much income is needed for a $400k home?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "For a $400,000 home with 20% down ($80,000), the loan amount is $320,000. At 6.75% over 30 years, the principal and interest is about $2,075/month. Adding property taxes ($400/month) and insurance ($125/month) gives a total PITI of roughly $2,600. Under the 28% front-end rule, you need gross monthly income of at least $9,286 ($111,429 annually). Under the 36% back-end rule with no other debt, the same $2,600 payment requires $7,222/month ($86,666 annually). The higher of the two is the safe benchmark."
          }
        },
        {
          "@type": "Question",
          name: "Do HOA fees count toward DTI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. HOA fees, along with property taxes, homeowners insurance, and the principal and interest payment, are all included in the front-end DTI calculation. Lenders review the total monthly housing obligation — often called PITI (Principal, Interest, Taxes, Insurance) plus HOA — to ensure it stays within the front-end ratio limit."
          }
        },
        {
          "@type": "Question",
          name: "Can I get a mortgage with a 50% DTI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Conventional loans almost never exceed 36% back-end DTI, and most automated underwriting systems cap out around 43-45%. FHA allows up to 43% in most cases, and VA allows up to 41% (with compensating factors). Some portfolio or non-QM lenders may go higher, but they charge significantly higher rates and require larger down payments. If your DTI is above 43%, focus on paying down debt before applying for a mortgage."
          }
        }
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
    metaTitle: "House Affordability Calculator | How Much House Can I Afford? — GetCalcu",
    related: [
      "mortgage-calculator",
      "rent-vs-buy-calculator",
      "amortization-calculator",
      "budget-planner",
      "savings-calculator",
      "net-worth-calculator"
    ]
  },
  "inflation-calculator": {
    id: "inflation-calculator",
    name: "Inflation Calculator",
    category: "Finance",
    icon: "fa-arrow-trend-up",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate how inflation impacts your money's purchasing power over time and find out how much you will need in the future.",
    metaTitle: "Inflation Calculator | Historical CPI, Future Value & Purchasing Power — GetCalcu",
    metaDescription: "Calculate how inflation impacts the future purchasing power of your money. Model historical CPI rates, future cost of living, and real investment returns.",
    keywords: [
      "inflation calculator",
      "purchasing power calculator",
      "future value inflation calculator",
      "cpi inflation calculator",
      "cost of living inflation calculator",
      "real value of money calculator",
      "inflation adjusted return",
      "how much will 100k be worth in 20 years",
      "historical inflation calculator",
      "inflation erosion calculator"
    ],
    fields: [
      {
        id: "mode",
        label: "Calculation Mode",
        type: "select",
        default: "future-cost",
        options: [
          {
            value: "future-cost",
            label: "Future Cost / Eroded Value"
          },
          {
            value: "target-power",
            label: "Target Purchasing Power Needed"
          }
        ],
        hint: "Choose whether to see how much a current amount will be worth in the future, or how much you need in the future to match today's buying power."
      },
      {
        id: "initial_amount",
        label: "Initial Amount ($)",
        type: "range",
        default: 1000,
        min: 100,
        max: 1000000,
        step: 100,
        hint: "The amount of money you want to analyze. Drag the slider or type a value."
      },
      {
        id: "inflation_rate",
        label: "Annual Inflation Rate (%)",
        type: "range",
        default: 3.5,
        min: 0.1,
        max: 20,
        step: 0.1,
        hint: "The expected yearly inflation rate. The US long-run average is about 2.5-3.5%."
      },
      {
        id: "years",
        label: "Time Horizon (Years)",
        type: "range",
        default: 10,
        min: 1,
        max: 50,
        step: 1,
        hint: "How many years into the future you want to project. Longer horizons show more dramatic erosion."
      }
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
      "Enter the starting dollar amount.",
      "Input the expected annual inflation rate (historical US average is ~2.5% to 3.5%).",
      "Specify the number of years into the future (or past).",
      "Review the future equivalent price needed to match today purchasing power.",
      "Review the chart showing purchasing power decline over time."
    ],
    examples: [
      {
        title: "Retirement Expenses in 20 Years",
        input: "Today Spending: $60,000/yr | Inflation: 3.0% | Time: 20 Years",
        result: "Future Cost for Same Lifestyle: ~$108,360/yr (80% increase)"
      },
      {
        title: "College Tuition Inflation Projection",
        input: "Today Tuition: $30,000/yr | Higher-Ed Inflation: 4.5% | Time: 15 Years",
        result: "Future Tuition: ~$58,050/yr (Nearly doubled)"
      },
      {
        title: "Cash Purchasing Power Loss",
        input: "Initial Cash: $100,000 | Inflation: 3.2% | Time: 10 Years",
        result: "Purchasing Power in 10 Yrs: ~$72,900 (Lost ~$27,100 of value)"
      },
      {
        title: "Low Inflation 10-Year Horizon",
        input: "Amount: $10,000 | Inflation: 2.0% | Time: 10 Years",
        result: "Future Equivalent: ~$12,190"
      }
    ],
    formula: "Future Cost = Present Value × (1 + r)^t | Future Purchasing Power = Present Value ÷ (1 + r)^t, where r is annual inflation rate and t is number of years.",
    article: {
      heading: "Understanding Inflation and Protecting Your Purchasing Power",
      intro: "Inflation is the steady increase in the general prices of goods and services over time. As prices rise, every dollar you hold buys fewer groceries, fewer gallons of gas, and less housing. The GetCalcu Inflation Calculator helps you project future price increases, calculate historical purchasing power changes, and discover how to protect your wealth from inflationary erosion.",
      sections: [
        {
          heading: "What Causes Inflation? (Demand-Pull and Cost-Push)",
          body: "Inflation typically stems from two economic forces. Demand-pull inflation happens when consumer and business demand for goods and services outpaces production capacity (\"too much money chasing too few goods\"). Cost-push inflation occurs when raw material and production costs rise (such as surges in oil prices or supply chain bottlenecks), forcing businesses to raise prices."
        },
        {
          heading: "The Consumer Price Index (CPI) Explained",
          body: "The Consumer Price Index (CPI), published monthly by the US Bureau of Labor Statistics, is the standard metric used to track inflation. It measures price changes in a representative basket of everyday goods and services, including food, housing, transportation, medical care, apparel, and education."
        },
        {
          heading: "The Rule of 72 Applied to Inflation",
          body: "You can use the Rule of 72 to calculate how quickly prices will double at a given inflation rate. Divide 72 by the annual inflation rate. At a 3% inflation rate, prices double in approximately 24 years (72 ÷ 3 = 24). At a 6% inflation rate, prices double in just 12 years."
        },
        {
          heading: "The Hidden Danger of Holding Excess Cash",
          body: "While cash in a checking account feels safe because the nominal balance never drops, inflation steadily erodes its real purchasing power. A $50,000 cash balance earning 0% interest loses over $18,000 of its purchasing power in 10 years at a modest 3% inflation rate."
        },
        {
          heading: "Nominal Returns vs. Real Returns in Investing",
          body: "Nominal return is the raw percentage gain of your investments. Real return is your gain after subtracting inflation. If your stock portfolio gains 9% in a year when inflation is 3.5%, your real wealth growth is 5.5%. Beating inflation is the primary reason long-term investors allocate money to equities and real estate."
        },
        {
          heading: "Inflation-Hedging Assets (Real Estate, Equities, TIPS)",
          body: "Historically, the most effective assets for beating inflation are equities (companies can raise product prices to protect profit margins), real estate (rents and property values increase with inflation), and Treasury Inflation-Protected Securities (TIPS), whose principal value adjusts upward with the CPI."
        },
        {
          heading: "How Inflation Affects Fixed-Rate Borrowers vs. Savers",
          body: "Inflation harms cash savers by reducing their purchasing power, but it benefits fixed-rate mortgage borrowers. When you have a 30-year fixed mortgage, your monthly payment remains unchanged for decades, meaning you repay the loan with future dollars that are worth less in real purchasing power."
        },
        {
          heading: "COLA: Cost-of-Living Adjustments in Benefits",
          body: "Social Security benefits and certain government pensions include annual Cost-of-Living Adjustments (COLA) linked to the Consumer Price Index, ensuring monthly benefit checks increase automatically to keep pace with rising living costs."
        }
      ]
    },
    faqs: [
      {
        q: "What is inflation?",
        a: "Inflation is the rate at which the general prices of goods and services increase over time, causing each unit of currency to buy fewer goods and services."
      },
      {
        q: "How is inflation measured?",
        a: "In the United States, inflation is primarily measured by the Consumer Price Index (CPI), which tracks price changes across a standard basket of consumer goods, housing, food, and energy."
      },
      {
        q: "What is a normal annual rate of inflation?",
        a: "The US Federal Reserve targets an average long-term inflation rate of 2.0% per year, though historical US inflation over the past 50 years has averaged around 3.0% to 3.5%."
      },
      {
        q: "What is purchasing power?",
        a: "Purchasing power is the amount of goods or services that one unit of money can buy. As inflation rises, purchasing power falls."
      },
      {
        q: "What is the difference between nominal and real return?",
        a: "Nominal return is the stated percentage gain on an investment. Real return is your actual gain after subtracting the rate of inflation."
      },
      {
        q: "How do I protect my savings from inflation?",
        a: "To beat inflation, invest in growth assets such as diversified stock index funds, real estate, High-Yield Savings Accounts (HYSAs), Series I Savings Bonds, and Treasury Inflation-Protected Securities (TIPS)."
      },
      {
        q: "Does inflation help borrowers with fixed-rate mortgages?",
        a: "Yes. Borrowers with fixed-rate loans pay the same fixed dollar payment every month, while their income tends to rise with inflation, repaying the loan with cheaper dollars over time."
      },
      {
        q: "What is hyperinflation?",
        a: "Hyperinflation is rapid, out-of-control inflation typically exceeding 50% per month, which quickly destroys the practical value of a local currency."
      },
      {
        q: "What are TIPS (Treasury Inflation-Protected Securities)?",
        a: "TIPS are US government bonds whose principal value increases with inflation as measured by the CPI, providing guaranteed inflation protection."
      },
      {
        q: "What is stagflation?",
        a: "Stagflation is an unusual and difficult economic condition characterized by high inflation, slow economic growth, and high unemployment."
      },
      {
        q: "How does inflation affect retirees on fixed incomes?",
        a: "Retirees living on fixed, non-indexed pensions suffer declining purchasing power over time. Having investments in equities or Social Security with annual COLA adjustments helps offset this risk."
      },
      {
        q: "What is shrinkflation?",
        a: "Shrinkflation occurs when manufacturers reduce the size or quantity of a product package while keeping the retail price unchanged, effectively increasing the cost per unit."
      },
      {
        q: "Why do central banks aim for 2% inflation rather than 0%?",
        a: "A small positive inflation rate stimulates economic spending and investment while providing a safety buffer against damaging deflation (falling prices, which can cause recessions)."
      },
      {
        q: "What is core inflation vs. headline inflation?",
        a: "Headline inflation includes all goods in the CPI basket. Core inflation excludes volatile food and energy prices to reveal the underlying long-term inflation trend."
      },
      {
        q: "How much will $100,000 be worth in 20 years at 3% inflation?",
        a: "At 3% annual inflation, $100,000 in cash will lose roughly 45% of its purchasing power over 20 years, having the equivalent buying power of about $55,360 today."
      }
    ],
    related: [
      "investment-calculator",
      "compound-interest-calculator",
      "savings-calculator",
      "retirement-calculator",
      "fire-calculator",
      "budget-planner"
    ]
  },
  "net-worth-calculator": {
    name: "Net Worth Calculator",
    category: "Finance",
    icon: "fa-scale-balanced",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate your total net worth by tracking all assets and liabilities. See your asset breakdown, debt-to-asset ratio, and get personalized wealth-building insights.",
    metaTitle: "Net Worth Calculator | Calculate Your Total Wealth & Assets — GetCalcu",
    metaDescription: "Free net worth calculator to calculate your total assets minus liabilities. Track liquid wealth, property equity, retirement balances, and overall financial health.",
    keywords: [
      "net worth calculator",
      "calculate my net worth",
      "total wealth calculator",
      "assets minus liabilities calculator",
      "personal net worth tracker",
      "liquid net worth calculator",
      "average net worth by age",
      "how to calculate net worth",
      "financial health calculator",
      "wealth tracker calculator"
    ],
    fields: [
      {
        id: "sec_assets",
        type: "section",
        label: "Assets — What You Own",
        icon: "fa-arrow-trend-up"
      },
      {
        id: "cash_savings",
        label: "Cash & Savings ($)",
        type: "number",
        default: 15000,
        min: 0,
        step: 100,
        hint: "Checking accounts, savings accounts, cash on hand, and emergency funds."
      },
      {
        id: "investments",
        label: "Investments ($)",
        type: "number",
        default: 45000,
        min: 0,
        step: 100,
        hint: "Stocks, bonds, mutual funds, ETFs, and brokerage accounts (not retirement)."
      },
      {
        id: "retirement",
        label: "Retirement Accounts ($)",
        type: "number",
        default: 60000,
        min: 0,
        step: 100,
        hint: "401(k), IRA, Roth IRA, 403(b), and pension values."
      },
      {
        id: "home_value",
        label: "Home Value ($)",
        type: "number",
        default: 350000,
        min: 0,
        step: 1000,
        hint: "Current market value of your primary residence or real estate."
      },
      {
        id: "vehicles",
        label: "Vehicles ($)",
        type: "number",
        default: 20000,
        min: 0,
        step: 500,
        hint: "Current resale value of cars, motorcycles, boats, or RVs."
      },
      {
        id: "other_assets",
        label: "Other Assets ($)",
        type: "number",
        default: 10000,
        min: 0,
        step: 100,
        hint: "Business equity, collectibles, jewelry, and other valuables."
      },
      {
        id: "sec_liabilities",
        type: "section",
        label: "Liabilities — What You Owe",
        icon: "fa-arrow-trend-down"
      },
      {
        id: "credit_cards",
        label: "Credit Card Debt ($)",
        type: "number",
        default: 5000,
        min: 0,
        step: 100,
        hint: "Total outstanding balance across all credit cards."
      },
      {
        id: "personal_loans",
        label: "Personal Loans ($)",
        type: "number",
        default: 8000,
        min: 0,
        step: 100,
        hint: "Personal, student, or auto loans you are repaying."
      },
      {
        id: "mortgage",
        label: "Mortgage Balance ($)",
        type: "number",
        default: 250000,
        min: 0,
        step: 1000,
        hint: "Remaining principal on your home mortgage."
      },
      {
        id: "other_debt",
        label: "Other Debt ($)",
        type: "number",
        default: 2000,
        min: 0,
        step: 100,
        hint: "Medical bills, tax debt, and any other outstanding obligations."
      }
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
      "List your liquid cash assets (checking accounts, high-yield savings, CDs, emergency funds).",
      "Add your investment assets (taxable brokerage, 401k, IRAs, mutual funds, crypto).",
      "Include physical asset values (home market value, vehicle fair market value).",
      "List all short-term liabilities (credit card balances, personal loans, medical debt).",
      "List long-term liabilities (mortgage balance, student loans, auto loans).",
      "Review your total net worth, liquid net worth, asset allocation, and debt-to-asset ratio."
    ],
    examples: [
      {
        title: "Young Professional Starting Out",
        input: "Assets: $25,000 (Savings & 401k) | Liabilities: $35,000 (Student Loans)",
        result: "Net Worth: -$10,000 (Normal starting trajectory; turns positive quickly)"
      },
      {
        title: "Mid-Career Homeowner",
        input: "Assets: $580,000 (Home $400k + Investments $180k) | Liabilities: $260,000 (Mortgage)",
        result: "Net Worth: $320,000 ($140k home equity + $180k investments)"
      },
      {
        title: "Debt-Free Investor",
        input: "Assets: $750,000 (Index Funds, Cash, Paid-off Home) | Liabilities: $0",
        result: "Net Worth: $750,000 (100% Asset Equity)"
      },
      {
        title: "High-Income High-Debt Scenario",
        input: "Assets: $400,000 | Liabilities: $350,000 (Mortgage + 2 Car Loans + Cards)",
        result: "Net Worth: $50,000 (Focus on debt reduction to unlock rapid growth)"
      }
    ],
    formula: "Net Worth = Total Assets (Cash + Investments + Real Estate + Vehicles) − Total Liabilities (Mortgages + Auto Loans + Student Loans + Credit Card Balances).",
    article: {
      heading: "How to Calculate and Grow Your Total Net Worth",
      intro: "Your net worth is the single most comprehensive scorecard of your overall financial health. While income measures how much cash flows into your life, net worth measures how much wealth you actually keep and grow. The GetCalcu Net Worth Calculator helps you organize everything you own (assets) and everything you owe (liabilities) to see your true financial standing.",
      sections: [
        {
          heading: "The Basic Net Worth Formula: Assets Minus Liabilities",
          body: "Your net worth is calculated with one simple equation: Total Assets − Total Liabilities = Net Worth. Assets are everything you own that has monetary value (cash, bank accounts, investments, real estate equity, vehicles). Liabilities are everything you owe to creditors (mortgages, student loans, car loans, credit card balances, personal debts)."
        },
        {
          heading: "Liquid Net Worth vs. Total Net Worth",
          body: "Total net worth includes illiquid assets like real estate equity, private business interests, and vehicles. Liquid net worth counts only assets that can be converted to cash immediately without significant loss of value (checking, savings, money market accounts, and taxable stock portfolios). Liquid net worth reflects your financial flexibility and resilience in an emergency."
        },
        {
          heading: "How Home Equity Factors Into Net Worth",
          body: "Home equity equals the current realistic market value of your property minus your remaining mortgage balance. If your home is worth $450,000 and you owe $280,000 on your mortgage, you have $170,000 in home equity asset value. When valuing real estate, use conservative estimates and account for potential 6% selling transaction costs."
        },
        {
          heading: "Valuing Vehicles and Personal Property Realistically",
          body: "Vehicles, furniture, and electronics are depreciating assets that lose value rapidly. Use realistic private-party Kelley Blue Book values for vehicles, and avoid listing everyday consumer goods or clothing unless they are high-value certified collectibles, jewelry, or art."
        },
        {
          heading: "Net Worth Benchmarks by Age",
          body: "In The Millionaire Next Door, authors Thomas Stanley and William Danko provide a classic formula for expected net worth: (Age × Annual Pre-Tax Household Income) ÷ 10. For example, a 40-year-old earning $100,000 has an expected benchmark net worth of $400,000."
        },
        {
          heading: "Why Having a Negative Net Worth Is Normal Early On",
          body: "Young adults and recent graduates often have a negative net worth due to student loans and entry-level salaries. As you pay down debt principal and invest in appreciating assets, your net worth naturally crosses into positive territory and accelerates through compounding."
        },
        {
          heading: "The Two High-Leverage Drivers of Net Worth Growth",
          body: "Growing your net worth comes down to two primary levers: widening your savings rate (increasing income while controlling lifestyle spending) and allocating your surplus savings into appreciating, productive assets (stock index funds, real estate, and retirement accounts)."
        },
        {
          heading: "How Often Should You Track Your Net Worth?",
          body: "Tracking your net worth once a quarter or twice a year is the sweet spot for most households. Daily or weekly tracking creates unnecessary anxiety over short-term stock market or housing fluctuations, while quarterly tracking reveals meaningful long-term trends."
        }
      ]
    },
    faqs: [
      {
        q: "What is net worth?",
        a: "Net worth is the total dollar value of everything you own (your assets) minus everything you owe to creditors (your liabilities)."
      },
      {
        q: "What counts as an asset when calculating net worth?",
        a: "Assets include cash, checking and savings accounts, investment portfolios, retirement accounts (401k, IRA), real estate market value, and vehicles."
      },
      {
        q: "What counts as a liability in net worth?",
        a: "Liabilities include mortgages, student loans, car loans, credit card balances, personal loans, medical debts, and any other money owed."
      },
      {
        q: "What is liquid net worth?",
        a: "Liquid net worth includes only cash and assets that can be quickly converted to cash within days without heavy penalties (such as savings and taxable brokerage accounts), excluding real estate and vehicles."
      },
      {
        q: "Should I include my primary home in my net worth?",
        a: "Yes, your home is an asset. Include its realistic current market value under assets, and your remaining mortgage balance under liabilities. The difference is your home equity."
      },
      {
        q: "Is it bad to have a negative net worth?",
        a: "A negative net worth is common for students and young adults starting out with student loans or a new mortgage. Focus on building an emergency fund, paying down debt, and investing consistently."
      },
      {
        q: "How often should I calculate my net worth?",
        a: "Calculating your net worth quarterly or twice a year provides a clear long-term perspective without stressing over daily stock market swings."
      },
      {
        q: "Does high income mean high net worth?",
        a: "Not necessarily. A person earning $300,000 who spends $300,000 has zero net worth growth, while someone earning $70,000 who consistently invests $15,000 each year can accumulate a million-dollar net worth."
      },
      {
        q: "How do I calculate expected net worth for my age?",
        a: "A classic formula from The Millionaire Next Door is: Expected Net Worth = (Your Age × Annual Gross Income) ÷ 10."
      },
      {
        q: "Should I include cars in net worth calculations?",
        a: "You can include cars at their conservative private-party resale value (such as Kelley Blue Book), but remember they depreciate annually."
      },
      {
        q: "What is the fastest way to increase net worth?",
        a: "The fastest way is to widen the gap between income and expenses: increase earnings, keep living costs controlled, pay off high-interest debt, and invest the surplus into diversified index funds."
      },
      {
        q: "How does paying off debt change net worth?",
        a: "Paying off debt with cash does not immediately change your net worth (cash assets decrease by the same amount liabilities decrease), but eliminating future interest charges significantly accelerates your future net worth growth."
      },
      {
        q: "Should personal items like jewelry or furniture be included?",
        a: "Generally, no. Everyday furniture, clothes, and electronics lose value rapidly. Only include certified valuable jewelry, fine art, or high-value collectibles."
      },
      {
        q: "How do taxes impact retirement asset values in net worth?",
        a: "Traditional 401(k) and IRA balances are listed at current gross value, though future withdrawals will be subject to income taxes."
      },
      {
        q: "What is a good debt-to-asset ratio?",
        a: "A debt-to-asset ratio below 50% is generally considered healthy, and as you approach retirement, targeting a ratio below 10% to 20% provides strong financial freedom."
      }
    ],
    related: [
      "budget-planner",
      "retirement-calculator",
      "investment-calculator",
      "savings-calculator",
      "fire-calculator",
      "credit-card-payoff-calculator"
    ]
  },
  "fire-calculator": {
    id: "fire-calculator",
    name: "FIRE Calculator",
    category: "Finance",
    icon: "fa-fire",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate your Financial Independence target, estimate when you can retire early, and visualize your journey toward financial freedom.",
    metaTitle: "FIRE Calculator – Financial Independence & Early Retirement",
    metaDescription: "Free FIRE Calculator. Calculate your FIRE number, retirement timeline, investment growth, passive income, and financial independence progress with interactive charts.",
    keywords: [
      "fire calculator",
      "financial independence calculator",
      "early retirement calculator",
      "coast fire calculator",
      "fi number calculator",
      "financial freedom calculator",
      "retirement savings calculator",
      "years until retirement calculator",
      "fire number",
      "4 percent rule calculator"
    ],
    fields: [
      {
        id: "annual_income",
        label: "Annual After-Tax Income ($)",
        type: "range",
        default: 80000,
        min: 10000,
        max: 500000,
        step: 1000,
        hint: "Your total yearly income after taxes. Used to calculate your savings rate."
      },
      {
        id: "annual_expenses",
        label: "Annual Expenses ($)",
        type: "range",
        default: 40000,
        min: 5000,
        max: 300000,
        step: 500,
        hint: "Your total yearly spending. The difference between income and expenses is your annual savings."
      },
      {
        id: "current_portfolio",
        label: "Current Investment Portfolio ($)",
        type: "range",
        default: 100000,
        min: 0,
        max: 10000000,
        step: 1000,
        hint: "Your current total invested assets across all accounts (401k, IRA, brokerage, etc.)."
      },
      {
        id: "monthly_contribution",
        label: "Monthly Investment Contribution ($)",
        type: "range",
        default: 2000,
        min: 0,
        max: 25000,
        step: 100,
        hint: "How much you add to your investments each month."
      },
      {
        id: "annual_return",
        label: "Expected Annual Investment Return (%)",
        type: "range",
        default: 7,
        min: 1,
        max: 15,
        step: 0.1,
        hint: "Expected average yearly return. S&P 500 long-term average: about 7-10%. <a href=\"#faqs\">See realistic return rates ↓</a>"
      },
      {
        id: "inflation_rate",
        label: "Inflation Rate (%)",
        type: "range",
        default: 2.5,
        min: 0,
        max: 10,
        step: 0.1,
        hint: "Expected annual inflation rate. US historical average: 2.5-3%. <a href=\"#faqs\">See how inflation affects FIRE ↓</a>"
      },
      {
        id: "withdrawal_rate",
        label: "Safe Withdrawal Rate (%)",
        type: "range",
        default: 4,
        min: 2,
        max: 6,
        step: 0.1,
        hint: "The percentage of your portfolio you withdraw annually in retirement. The 4% rule is the standard benchmark. <a href=\"#faqs\">See the 4% rule explained ↓</a>"
      },
      {
        id: "retirement_spending",
        label: "Retirement Spending Adjustment",
        type: "select",
        default: "same",
        options: [
          {
            value: "same",
            label: "Same Spending"
          },
          {
            value: "increase",
            label: "Increase Spending (+20%)"
          },
          {
            value: "reduce",
            label: "Reduce Spending (-20%)"
          }
        ],
        hint: "Adjust your retirement expenses relative to your current spending. Many retirees spend less, but some plan for more travel and leisure."
      },
      {
        id: "fire_mode",
        label: "Calculation Mode",
        type: "select",
        default: "standard",
        options: [
          {
            value: "standard",
            label: "Standard FIRE"
          },
          {
            value: "lean",
            label: "Lean FIRE"
          },
          {
            value: "fat",
            label: "Fat FIRE"
          },
          {
            value: "coast",
            label: "Coast FIRE"
          },
          {
            value: "barista",
            label: "Barista FIRE"
          }
        ],
        hint: "Choose your FIRE strategy. Each mode adjusts assumptions to match different retirement lifestyles. <a href=\"#faqs\">See FIRE types explained ↓</a>"
      }
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
    howTo: [
      "Enter your annual after-tax income and annual expenses — the calculator instantly computes your savings rate.",
      "Add your current investment portfolio value and monthly contribution amount.",
      "Set your expected annual return (7-8% is a realistic long-term average for a diversified stock portfolio) and inflation rate (2.5-3% historical average).",
      "Choose your safe withdrawal rate — the 4% rule is the standard benchmark for a 30-year retirement.",
      "Select your retirement spending adjustment and FIRE mode (Standard, Lean, Fat, Coast, or Barista) to match your lifestyle goals.",
      "Review your FIRE number, years until financial independence, passive income projections, and readiness score.",
      "Use the scenario comparison table to see how increasing contributions, boosting returns, or cutting expenses accelerates your timeline."
    ],
    examples: [
      {
        title: "Standard FIRE at 45",
        input: "Income: $80,000, Expenses: $40,000, Portfolio: $100,000, Monthly: $2,000, Return: 7%, Inflation: 2.5%, Withdrawal: 4%",
        result: "FIRE Number: $1,000,000 | Years to FIRE: ~17.5 years | Savings Rate: 50%"
      },
      {
        title: "Lean FIRE with Minimalist Lifestyle",
        input: "Income: $60,000, Expenses: $25,000, Portfolio: $50,000, Monthly: $1,500, Return: 7%, Inflation: 2.5%, Withdrawal: 4%, Lean FIRE",
        result: "FIRE Number: ~$468,750 | Years to FIRE: ~14 years | Savings Rate: 58%"
      },
      {
        title: "Coast FIRE — Let Compounding Do the Work",
        input: "Income: $100,000, Expenses: $50,000, Portfolio: $200,000, Monthly: $2,500, Return: 7%, Inflation: 2.5%, Withdrawal: 4%, Coast FIRE",
        result: "Coast Number: ~$131,000 | Current portfolio exceeds coast number — compounding alone reaches FIRE"
      },
      {
        title: "Aggressive Early Retirement at 40",
        input: "Income: $120,000, Expenses: $45,000, Portfolio: $150,000, Monthly: $4,000, Return: 8%, Inflation: 2.5%, Withdrawal: 4%",
        result: "FIRE Number: $1,125,000 | Years to FIRE: ~12 years | Savings Rate: 62.5%"
      }
    ],
    formula: "FIRE Number = Annual Retirement Expenses ÷ Safe Withdrawal Rate | Savings Rate = (Income − Expenses) ÷ Income × 100 | FV = P(1+r)^n + PMT × [((1+r)^n − 1) / r] | Inflation-Adjusted FIRE = FIRE Number × (1 + Inflation)^Years | Monthly Passive Income = Portfolio × Withdrawal Rate ÷ 12",
    article: {
      heading: "The Complete Guide to FIRE: Financial Independence, Retire Early",
      intro: "The FIRE (Financial Independence, Retire Early) movement has transformed how millions of people think about work, savings, and life. Instead of working until 65, FIRE practitioners aggressively save and invest a large portion of their income — often 50% or more — to build a portfolio large enough to fund their lifestyle indefinitely. The GetCalcu FIRE Calculator helps you determine your FIRE number, estimate how long it will take to reach financial independence, and visualize your journey with interactive charts.",
      sections: [
        {
          heading: "What is FIRE?",
          body: "FIRE stands for Financial Independence, Retire Early. It is a lifestyle movement focused on saving aggressively (typically 50-70% of income) and investing those savings in low-cost index funds or other growth assets. The goal is to build a portfolio large enough that its investment returns can cover your living expenses indefinitely — giving you the freedom to retire decades earlier than the traditional retirement age of 65."
        },
        {
          heading: "How FIRE Works",
          body: "FIRE works through three interconnected principles: saving aggressively, investing consistently, and letting compound growth do the heavy lifting. By saving 50% or more of your income, you dramatically shorten the time needed to reach financial independence. Your investments grow through compound returns — each year's gains earn gains in future years. Once your portfolio reaches roughly 25 times your annual expenses (the 4% rule), you can safely withdraw 4% per year indefinitely."
        },
        {
          heading: "Understanding the 4% Rule",
          body: "The 4% rule originated from the Trinity Study, a landmark 1998 research paper that analyzed historical stock and bond returns. It found that withdrawing 4% of your portfolio in the first year of retirement, then adjusting for inflation each year, had a high probability of lasting 30 years. This translates to a FIRE number of 25 times your annual expenses. While the 4% rule has limitations — it assumes a 30-year retirement and historical market conditions — it remains the most widely used benchmark in the FIRE community."
        },
        {
          heading: "Types of FIRE",
          body: "The FIRE movement has evolved into several distinct strategies. Standard FIRE targets your current lifestyle with a 4% withdrawal rate. Lean FIRE assumes a minimalist lifestyle with significantly lower expenses (often 25-50% less). Fat FIRE targets a more luxurious retirement with higher spending. Coast FIRE means your current portfolio will grow to your FIRE number without additional contributions — you just need to cover current expenses. Barista FIRE combines part-time work with a smaller portfolio, where part-time income covers a portion of expenses."
        },
        {
          heading: "How to Reach FIRE Faster",
          body: "Accelerating your path to FIRE requires a multi-pronged approach. Increasing your income through career advancement, side hustles, or freelancing gives you more to save. Reducing expenses through mindful spending, downsizing, or geo-arbitrage (living in lower-cost areas) boosts your savings rate. Investing in low-cost index funds with 7-10% historical returns maximizes compound growth. Tax efficiency — using 401(k)s, IRAs, HSAs, and taxable accounts strategically — keeps more of your returns. Diversification across asset classes reduces risk. Automating your savings ensures consistency. And taking advantage of employer retirement plan matches is essentially free money."
        },
        {
          heading: "Common FIRE Mistakes",
          body: "Even well-intentioned FIRE practitioners make mistakes. Ignoring inflation can leave you short in retirement — always use inflation-adjusted returns. Unrealistic return assumptions (expecting 12%+ annually) can derail your plan. Spending creep — gradually increasing expenses as income rises — undermines your savings rate. Poor diversification concentrates risk in a single asset class. Early withdrawals from retirement accounts trigger penalties and taxes. And underestimating healthcare costs — especially before Medicare eligibility — is one of the most common FIRE planning errors."
        },
        {
          heading: "FIRE Calculation Formula",
          body: "The core FIRE formula is: FIRE Number = Annual Retirement Expenses ÷ Safe Withdrawal Rate. For example, if your annual expenses are $50,000 and you use a 4% withdrawal rate, your FIRE number is $1,250,000. To project portfolio growth, use the compound interest formula: FV = P(1+r)^n + PMT × [((1+r)^n − 1) / r], where P is your current portfolio, r is the monthly return rate, n is the number of months, and PMT is your monthly contribution. The inflation-adjusted FIRE number accounts for rising costs: Inflation-Adjusted FIRE = FIRE Number × (1 + Inflation Rate)^Years."
        },
        {
          heading: "Example Calculation",
          body: "Consider a realistic scenario: You earn $80,000 after taxes, spend $40,000 annually, have $100,000 invested, and contribute $2,000 monthly. Your savings rate is 50%. Using a 4% withdrawal rate, your FIRE number is $1,000,000. With a 7% annual return, your portfolio grows to $1,000,000 in approximately 17.5 years. At that point, your portfolio generates $40,000 per year in passive income — exactly matching your expenses. Adjusting for 2.5% inflation, you would need approximately $1,540,000 in future dollars to maintain the same purchasing power."
        }
      ]
    },
    faqs: [
      {
        q: "What is a good FIRE number?",
        a: "A good FIRE number is typically 25 times your annual retirement expenses, based on the 4% rule. For example, if you plan to spend $40,000 per year in retirement, your FIRE number is $1,000,000. However, your specific FIRE number depends on your lifestyle, withdrawal rate, and expected retirement duration. Use our FIRE Calculator to find your personalized number."
      },
      {
        q: "Is the 4% rule still valid?",
        a: "The 4% rule, derived from the Trinity Study, remains a widely used benchmark but has limitations. It assumes a 30-year retirement, a 50/50 stock-bond portfolio, and historical market conditions. Some financial experts suggest a 3-3.5% withdrawal rate for longer retirements (40+ years) or conservative portfolios. The 4% rule is a useful starting point, but you should stress-test your plan with different scenarios."
      },
      {
        q: "How much should I save for FIRE?",
        a: "The amount you need to save depends on your target FIRE number and timeline. A common benchmark is saving 50% of your after-tax income, which typically allows FIRE in 15-20 years. Saving 25% takes about 30 years, while saving 70% can achieve FIRE in under 10 years. Use our FIRE Calculator to see how your savings rate affects your timeline."
      },
      {
        q: "Can I retire at 40?",
        a: "Yes, retiring at 40 is achievable with aggressive saving and investing. To retire at 40, you typically need a savings rate of 50-70% of your income and a portfolio of 25-30 times your annual expenses. For example, with $50,000 annual expenses, you would need $1.25-1.5 million. Starting early, maximizing income, and keeping expenses low are the keys to early retirement."
      },
      {
        q: "What is Coast FIRE?",
        a: "Coast FIRE is a FIRE strategy where your current portfolio is large enough that it will grow to your FIRE number by retirement age without any additional contributions. You \"coast\" on compound growth while working to cover current expenses. For example, if you need $1,000,000 at age 60 and have 30 years to grow at 7%, you only need about $131,000 today to reach that goal."
      },
      {
        q: "What is Lean FIRE?",
        a: "Lean FIRE is a FIRE strategy that targets a minimalist lifestyle with significantly lower expenses — often 25-50% less than a standard lifestyle. Lean FIRE practitioners typically aim for a FIRE number of $500,000-$750,000, which supports $20,000-$30,000 in annual spending at a 4% withdrawal rate. This approach requires frugal living but can be achieved much faster."
      },
      {
        q: "How accurate is this calculator?",
        a: "This FIRE Calculator uses standard financial formulas (compound interest, the 4% rule, inflation adjustment) and provides accurate projections based on your inputs. However, all financial projections involve uncertainty — actual market returns, inflation, and expenses will vary. Use conservative assumptions and review your plan regularly. The calculator is a planning tool, not a guarantee."
      },
      {
        q: "Should inflation be included in FIRE calculations?",
        a: "Yes, absolutely. Inflation erodes purchasing power over time — at 2.5% annual inflation, $1,000,000 today will only buy about $477,000 worth of goods in 30 years. Our FIRE Calculator shows both your nominal FIRE number and the inflation-adjusted amount you will actually need in future dollars."
      },
      {
        q: "What investment return should I assume?",
        a: "For long-term stock market investments (15+ years), historical S&P 500 returns average 7-10% annually before inflation, or 4-7% after inflation. A conservative planning assumption is 6-7% nominal or 4-5% real return. For a balanced 60/40 portfolio, use 5-7%. Always use a rate you are comfortable with and stress-test with lower returns."
      },
      {
        q: "What happens if markets decline?",
        a: "Market declines are normal and expected — the stock market has experienced 10-20% drawdowns roughly every 3-5 years. During the accumulation phase, market declines are actually beneficial because your contributions buy more shares at lower prices. The risk is highest during the withdrawal phase, which is why the 4% rule and having a cash buffer are important. Consider a bond tent or cash reserve to weather early-retirement market downturns."
      },
      {
        q: "What is Barista FIRE?",
        a: "Barista FIRE is a hybrid strategy where you retire from your full-time career but continue working part-time (like at a coffee shop, hence the name) to cover a portion of your expenses. This reduces the FIRE number you need, since part-time income covers some costs. It also provides health insurance benefits in some cases, which can be a significant advantage before Medicare eligibility."
      },
      {
        q: "How does the savings rate affect my FIRE timeline?",
        a: "Your savings rate is the single most powerful factor in your FIRE timeline. At a 10% savings rate, FIRE takes about 51 years. At 25%, it takes about 32 years. At 50%, it takes about 17 years. At 70%, it takes about 9 years. The relationship is exponential — small increases in savings rate near the high end dramatically shorten your timeline."
      },
      {
        q: "What is the difference between FIRE and traditional retirement?",
        a: "Traditional retirement typically means working until age 65-67, relying on Social Security, pensions, and retirement accounts. FIRE means achieving financial independence much earlier — often in your 30s, 40s, or 50s — by saving aggressively and living on investment income. FIRE gives you the freedom to choose how you spend your time, whether that means retiring completely, working part-time, or pursuing passion projects."
      },
      {
        q: "How do taxes affect my FIRE plan?",
        a: "Taxes can significantly impact your FIRE journey. Using tax-advantaged accounts (401(k), IRA, HSA) reduces your current tax burden and accelerates growth. In retirement, strategically withdrawing from taxable, tax-deferred, and tax-free accounts can minimize your tax bill. Consider Roth conversion ladders to access retirement funds before age 59.5 without penalties. Our calculator uses after-tax income, so your savings rate already reflects your tax situation."
      },
      {
        q: "What is the 25x rule?",
        a: "The 25x rule is a quick way to estimate your FIRE number: multiply your annual expenses by 25. This is derived from the 4% rule — if you can withdraw 4% of your portfolio annually, you need 25 times your annual expenses (1 ÷ 0.04 = 25). For example, $40,000 in annual expenses × 25 = $1,000,000 FIRE number."
      }
    ]
  },
  "amortization-calculator": {
    id: "amortization-calculator",
    name: "Amortization Calculator",
    category: "Finance",
    icon: "fa-chart-simple",
    iconClass: "icon-finance",
    tagClass: "tag-finance",
    description: "Calculate loan payments, generate a complete amortization schedule, visualize principal and interest over time, and analyze the impact of extra payments.",
    metaTitle: "Amortization Calculator – Loan Payment & Schedule | GetCalcu",
    metaDescription: "Free Amortization Calculator with interactive charts, payment schedule, extra payment analysis, and downloadable loan repayment tables. Compare scenarios and see how extra payments save interest.",
    keywords: [
      "amortization calculator",
      "loan amortization calculator",
      "mortgage amortization calculator",
      "loan payment calculator",
      "amortization schedule",
      "mortgage payment calculator",
      "principal and interest calculator",
      "extra payment calculator",
      "monthly loan payment calculator",
      "loan repayment calculator"
    ],
    fields: [
      {
        id: "sec_loan",
        type: "section",
        label: "Loan Details",
        icon: "fa-file-invoice"
      },
      {
        id: "loan_amount",
        label: "Loan Amount ($)",
        type: "range",
        default: 300000,
        min: 1000,
        max: 5000000,
        step: 1000,
        hint: "The total amount you are borrowing (the principal)."
      },
      {
        id: "interest_rate",
        label: "Annual Interest Rate (%)",
        type: "range",
        default: 6.5,
        min: 0,
        max: 25,
        step: 0.05,
        hint: "The yearly interest rate (APR) on your loan."
      },
      {
        id: "loan_term",
        label: "Loan Term",
        type: "select",
        default: 30,
        options: [
          {
            value: 5,
            label: "5 Years"
          },
          {
            value: 10,
            label: "10 Years"
          },
          {
            value: 15,
            label: "15 Years"
          },
          {
            value: 20,
            label: "20 Years"
          },
          {
            value: 25,
            label: "25 Years"
          },
          {
            value: 30,
            label: "30 Years"
          },
          {
            value: 40,
            label: "40 Years"
          }
        ],
        hint: "How long you have to repay the loan in full."
      },
      {
        id: "payment_freq",
        label: "Payment Frequency",
        type: "select",
        default: "monthly",
        options: [
          {
            value: "monthly",
            label: "Monthly (12/yr)"
          },
          {
            value: "biweekly",
            label: "Bi-Weekly (26/yr)"
          },
          {
            value: "weekly",
            label: "Weekly (52/yr)"
          }
        ],
        hint: "How often you make payments. More frequent payments reduce total interest."
      },
      {
        id: "compounding_freq",
        label: "Compounding Frequency",
        type: "select",
        default: "monthly",
        options: [
          {
            value: "monthly",
            label: "Monthly (12/yr)"
          },
          {
            value: "quarterly",
            label: "Quarterly (4/yr)"
          },
          {
            value: "semi-annual",
            label: "Semi-Annual (2/yr)"
          },
          {
            value: "annually",
            label: "Annual (1/yr)"
          }
        ],
        hint: "How often interest is compounded. Monthly is standard for most loans."
      },
      {
        id: "loan_start_date",
        label: "Loan Start Date",
        type: "date",
        default: () => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0];
      },
        hint: "When the loan begins. Used to generate the payment schedule with dates."
      },
      {
        id: "sec_extra",
        type: "section",
        label: "Extra Payments",
        icon: "fa-bolt"
      },
      {
        id: "extra_monthly",
        label: "Extra Monthly Payment ($)",
        type: "range",
        default: 0,
        min: 0,
        max: 10000,
        step: 50,
        hint: "Additional amount paid each month to reduce principal faster."
      },
      {
        id: "extra_one_time",
        label: "One-Time Extra Payment ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 100,
        hint: "A single lump-sum extra payment made at a specific date."
      },
      {
        id: "extra_one_time_date",
        label: "One-Time Payment Date",
        type: "date",
        default: () => {
        const d = new Date(); d.setMonth(d.getMonth() + 12); return d.toISOString().split('T')[0];
      },
        condition: v => safeNum(v.extra_one_time, 0) > 0,
        hint: "When the one-time extra payment is made."
      },
      {
        id: "extra_annual",
        label: "Annual Extra Payment ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 100,
        hint: "An extra payment made once every year (e.g. from a bonus or tax refund)."
      },
      {
        id: "sec_tax_ins",
        type: "section",
        label: "Taxes & Insurance",
        icon: "fa-shield"
      },
      {
        id: "include_tax_insurance",
        label: "Include Taxes & Insurance",
        type: "select",
        default: "no",
        options: [
          {
            value: "no",
            label: "No — Show Principal & Interest Only"
          },
          {
            value: "yes",
            label: "Yes — Include Full Monthly Housing Payment"
          }
        ],
        hint: "Toggle to include property taxes, insurance, HOA, and PMI in your monthly payment."
      },
      {
        id: "annual_property_tax",
        label: "Annual Property Tax ($)",
        type: "number",
        default: 4800,
        min: 0,
        step: 100,
        condition: v => v.include_tax_insurance === 'yes',
        hint: "Yearly property tax, spread across monthly payments."
      },
      {
        id: "annual_home_insurance",
        label: "Annual Home Insurance ($)",
        type: "number",
        default: 1200,
        min: 0,
        step: 100,
        condition: v => v.include_tax_insurance === 'yes',
        hint: "Yearly homeowners insurance premium."
      },
      {
        id: "hoa_fees",
        label: "Monthly HOA Fees ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 25,
        condition: v => v.include_tax_insurance === 'yes',
        hint: "Monthly homeowners association fees."
      },
      {
        id: "pmi",
        label: "Monthly PMI ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 10,
        condition: v => v.include_tax_insurance === 'yes',
        hint: "Private Mortgage Insurance (required when down payment is less than 20%)."
      },
      {
        id: "sec_compare",
        type: "section",
        label: "Comparison Mode",
        icon: "fa-not-equal"
      },
      {
        id: "comparison_mode",
        label: "Comparison Mode",
        type: "select",
        default: "single",
        options: [
          {
            value: "single",
            label: "Single Scenario"
          },
          {
            value: "compare",
            label: "Compare Two Scenarios"
          }
        ],
        hint: "Compare two loan scenarios side by side to see the difference in payments and interest."
      },
      {
        id: "compare_loan_amount",
        label: "Scenario B: Loan Amount ($)",
        type: "number",
        default: 300000,
        min: 1000,
        step: 1000,
        condition: v => v.comparison_mode === 'compare',
        hint: "Loan amount for the second scenario."
      },
      {
        id: "compare_interest_rate",
        label: "Scenario B: Interest Rate (%)",
        type: "number",
        default: 5.9,
        min: 0,
        step: 0.05,
        condition: v => v.comparison_mode === 'compare',
        hint: "Annual interest rate for the second scenario."
      },
      {
        id: "compare_loan_term",
        label: "Scenario B: Loan Term",
        type: "select",
        default: 15,
        options: [
          {
            value: 5,
            label: "5 Years"
          },
          {
            value: 10,
            label: "10 Years"
          },
          {
            value: 15,
            label: "15 Years"
          },
          {
            value: 20,
            label: "20 Years"
          },
          {
            value: 25,
            label: "25 Years"
          },
          {
            value: 30,
            label: "30 Years"
          },
          {
            value: 40,
            label: "40 Years"
          }
        ],
        condition: v => v.comparison_mode === 'compare',
        hint: "Loan term for the second scenario."
      },
      {
        id: "compare_extra_monthly",
        label: "Scenario B: Extra Monthly ($)",
        type: "number",
        default: 0,
        min: 0,
        step: 50,
        condition: v => v.comparison_mode === 'compare',
        hint: "Extra monthly payment for the second scenario."
      }
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
    howTo: [
      "Enter the loan amount you are borrowing, the annual interest rate (APR), and choose your loan term from the dropdown.",
      "Select your payment frequency — monthly, bi-weekly, or weekly. More frequent payments reduce total interest.",
      "Choose the compounding frequency (monthly is standard for most loans) and set the loan start date.",
      "Add any extra payments — monthly, one-time, or annual — to see how much interest and time you can save.",
      "Optionally toggle \"Include Taxes & Insurance\" to add property tax, insurance, HOA, and PMI for a full monthly housing payment.",
      "Enable \"Comparison Mode\" to compare two loan scenarios side by side, such as a 30-year vs 15-year term.",
      "Review the KPI dashboard, interactive charts, and the full amortization schedule. Export the schedule as CSV if needed."
    ],
    examples: [
      {
        title: "30-Year Fixed Mortgage",
        input: "Loan: $300,000, Rate: 6.5%, Term: 30 years, Monthly payments",
        result: "Monthly Payment: ~$1,896 | Total Interest: ~$382,000 | Payoff: 30 years"
      },
      {
        title: "15-Year vs 30-Year Comparison",
        input: "Scenario A: $300,000 at 6.5% for 30yr vs Scenario B: $300,000 at 5.9% for 15yr",
        result: "15yr saves ~$280,000 in interest and pays off 15 years earlier, but monthly payment is ~$1,000 higher"
      },
      {
        title: "Extra Monthly Payments Save Thousands",
        input: "Loan: $300,000, Rate: 6.5%, Term: 30 years, Extra: $200/mo",
        result: "Interest Saved: ~$78,000 | Time Saved: ~5 years | Payoff: ~25 years"
      },
      {
        title: "Bi-Weekly Payments Accelerate Payoff",
        input: "Loan: $300,000, Rate: 6.5%, Term: 30 years, Bi-Weekly payments",
        result: "Interest Saved: ~$64,000 | Time Saved: ~4 years vs monthly payments"
      }
    ],
    formula: "M = P × [r(1+r)^n] / [(1+r)^n − 1] | r = periodic rate = (1 + APR/compounding periods)^(compounding periods/payments per year) − 1 | Total Interest = (M × n) − P | Interest Savings = Total Interest(no extras) − Total Interest(with extras)",
    article: {
      heading: "How to Calculate Loan Amortization and Save Thousands in Interest",
      intro: "Loan amortization is the process of spreading out a loan into a series of fixed payments over time. Each payment covers both interest and principal, with the interest portion decreasing as the principal is paid down. The GetCalcu Amortization Calculator not only computes your monthly payment but also generates a complete payment-by-payment schedule, showing exactly how much goes to principal versus interest over the life of the loan. It also models the powerful impact of extra payments — helping you understand how paying just a little more each month can save tens of thousands of dollars in interest.",
      sections: [
        {
          heading: "What Is Loan Amortization?",
          body: "Amortization is the process of gradually paying off a debt through regular, scheduled payments. Each payment is split into two parts: the interest portion (the cost of borrowing) and the principal portion (the amount that reduces your loan balance). In the early years of a loan, most of each payment goes toward interest because the outstanding balance is largest. As the principal declines, the interest portion shrinks, and more of your payment goes toward reducing the principal. By the final payment, the entire loan balance reaches zero."
        },
        {
          heading: "How Amortization Works",
          body: "The amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1] calculates the fixed payment amount needed to fully repay a loan over its term. In this formula, P is the loan principal (the amount borrowed), r is the periodic interest rate (annual rate divided by payments per year, adjusted for compounding), and n is the total number of payments. For a $300,000 loan at 6.5% over 30 years with monthly payments, the monthly payment is approximately $1,896. The first payment applies about $1,625 to interest and only $271 to principal. By year 15, the split is roughly $1,200 interest and $696 principal. By the final year, nearly the entire payment goes to principal."
        },
        {
          heading: "Understanding the Amortization Formula",
          body: "The standard amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1] calculates the fixed payment M. Let's break down each variable: P (Principal) is the total amount borrowed, $300,000 in our example. r (Periodic Interest Rate) is the annual rate divided by the number of payments per year, adjusted for compounding frequency. For a 6.5% annual rate with monthly compounding and monthly payments, the periodic rate is approximately 0.5417% (6.5% ÷ 12). n (Total Payments) is the loan term in years multiplied by payments per year — 360 for a 30-year monthly loan. The term (1+r)^n is the compound growth factor. For our example, (1 + 0.005417)^360 ≈ 6.99. Plugging this in: M = 300,000 × [0.005417 × 6.99] / [6.99 − 1] = 300,000 × 0.03787 / 5.99 ≈ $1,896. This is the amount you pay every month for 30 years to fully repay the loan."
        },
        {
          heading: "Why Early Payments Save Money",
          body: "Extra payments made early in the loan term have an outsized impact because they reduce the principal balance that future interest is calculated on. A single extra payment of $200 in the first month reduces the principal by $200, which saves the interest that $200 would have generated over the remaining 359 months. At 6.5%, that $200 saves approximately $200 × (1.005417^359 − 1) ≈ $1,200 in interest over the life of the loan. This is the power of compound interest working in reverse — paying down principal early prevents compound interest from accumulating on that principal. Making $200 extra each month on a $300,000 loan at 6.5% saves approximately $78,000 in interest and cuts the loan term by 5 years."
        },
        {
          heading: "Mortgage vs Auto vs Personal Loans",
          body: "Amortization works the same way for all types of installment loans, but the numbers differ dramatically. Mortgages typically have the longest terms (15-30 years) and the largest loan amounts, making them the most sensitive to interest rates and extra payments. Auto loans typically run 3-7 years with moderate rates (5-10%). Personal loans are usually 2-5 years with higher rates (6-36%). The shorter the term, the less total interest you pay, but the higher the monthly payment. Our calculator works for all loan types — just adjust the loan amount, rate, and term to match your specific situation."
        },
        {
          heading: "Fixed vs Adjustable Rate Loans",
          body: "Fixed-rate loans lock in your interest rate for the entire loan term, giving you predictable payments that never change. Adjustable-rate mortgages (ARMs) start with a lower rate for an initial period (typically 3-10 years), then adjust periodically based on market indices. ARMs can save money if you plan to sell or refinance before the rate adjusts, but they carry the risk of higher payments if rates rise. Our calculator models fixed-rate loans accurately. For ARMs, you would need to recalculate after each rate adjustment period using the new rate."
        },
        {
          heading: "Common Loan Repayment Mistakes",
          body: "The most common mistake is paying only the minimum payment, which maximizes total interest. Ignoring refinancing opportunities when rates drop can cost tens of thousands. Missing payments not only incurs late fees but also damages your credit score, making future borrowing more expensive. Choosing an unnecessarily long term to minimize monthly payments often results in paying more than double the original loan amount in interest. Finally, not understanding how extra payments are applied — some lenders apply extra payments to future payments rather than reducing principal — can undermine your payoff strategy."
        },
        {
          heading: "Tips to Pay Off Loans Faster",
          body: "Making extra monthly payments is the most effective strategy — even $50 extra per month on a $300,000 mortgage saves over $30,000 in interest. Switching to bi-weekly payments (half the monthly payment every two weeks) results in 26 half-payments per year, equivalent to 13 full monthly payments — one extra payment annually. Applying lump-sum payments from bonuses, tax refunds, or gifts directly to principal accelerates payoff. Refinancing to a lower rate or shorter term can also save interest, but factor in closing costs. Finally, optimizing your budget to free up even $100 per month for debt repayment can save thousands over the life of your loan."
        },
        {
          heading: "Example Amortization Schedule",
          body: "Consider a $300,000 loan at 6.5% interest over 30 years with monthly payments. The first payment of $1,896 consists of $271 in principal and $1,625 in interest. After 5 years (60 payments), the remaining balance is approximately $278,000, and the interest portion has dropped to about $1,506. After 15 years (180 payments), the balance is approximately $189,000, and the interest portion is about $1,025. After 25 years (300 payments), the balance is approximately $67,000, and the interest portion is about $365. The final payment brings the balance to zero. This progressive shift from interest-heavy to principal-heavy payments is the hallmark of amortization. Our calculator generates this complete schedule for any loan scenario."
        },
        {
          heading: "Frequently Asked Questions",
          body: "What is an amortization schedule? It is a table showing each payment's split between principal and interest over the loan term. How is loan interest calculated? Interest for each period is calculated as the remaining balance multiplied by the periodic interest rate. Why do early payments contain more interest? Because the loan balance is largest at the start, so the interest charged on that balance is higher. Can I pay off my mortgage early? Yes, most mortgages allow early repayment without penalty, but check your loan agreement for prepayment penalties. Do extra payments reduce interest? Absolutely — every dollar of extra principal paid early saves the interest that dollar would have accrued over the remaining loan term. How often should I make extra payments? Monthly extra payments are most effective because they reduce the balance sooner. What happens if interest rates change? For fixed-rate loans, the rate stays the same. For ARMs, the rate adjusts periodically. Can I export the schedule? Yes, the amortization schedule can be copied or exported. Is this calculator accurate? It uses standard amortization formulas and is accurate for any fixed-rate loan. Does it work for auto loans? Yes, simply enter your auto loan amount, rate, and term."
        }
      ]
    },
    faqs: [
      {
        q: "What is an amortization schedule?",
        a: "An amortization schedule is a complete table showing every payment over the life of a loan, broken down into principal and interest portions. It shows the remaining balance after each payment, how much interest you pay each period, and how much of your payment goes toward reducing the principal. Our calculator generates a full amortization schedule for any loan scenario, including extra payments."
      },
      {
        q: "How is loan interest calculated?",
        a: "Loan interest for each payment period is calculated by multiplying the current outstanding loan balance by the periodic interest rate. The periodic rate is the annual percentage rate (APR) divided by the number of payment periods per year, adjusted for compounding frequency. For example, on a $300,000 loan at 6.5% APR with monthly payments, the first month's interest is $300,000 × (6.5% ÷ 12) = $1,625."
      },
      {
        q: "Why do early payments contain more interest?",
        a: "Early payments contain more interest because the loan balance is at its highest at the beginning of the loan term. Interest is calculated on the outstanding balance, so a larger balance generates more interest. As the principal is gradually paid down, the interest portion of each payment decreases, and more of the fixed payment goes toward reducing the principal."
      },
      {
        q: "Can I pay off my mortgage early?",
        a: "Yes, most mortgages allow early repayment without penalty. However, some loans have prepayment penalties, typically 1-3% of the outstanding balance if paid off within the first 3-5 years. Always check your loan agreement or ask your lender. Our calculator shows how extra payments accelerate your payoff and save interest."
      },
      {
        q: "Do extra payments reduce interest?",
        a: "Yes, every extra dollar you pay toward principal reduces the balance that future interest is calculated on. This creates a compounding effect — paying $200 extra in the first month of a $300,000 loan at 6.5% saves approximately $1,200 in interest over the remaining 30 years. The earlier you make extra payments, the more interest you save."
      },
      {
        q: "How often should I make extra payments?",
        a: "Monthly extra payments are the most effective because they reduce the principal balance sooner, giving you the maximum interest savings. However, any extra payment — whether monthly, one-time, or annual — saves interest. Switching to bi-weekly payments (half your monthly payment every two weeks) effectively makes one extra payment per year, which can save thousands in interest."
      },
      {
        q: "What happens if interest rates change?",
        a: "For fixed-rate loans, the interest rate is locked for the entire loan term, so your payment never changes. For adjustable-rate mortgages (ARMs), the rate adjusts periodically based on market indices. Our calculator models fixed-rate amortization. For ARMs, you would need to recalculate after each adjustment period using the new rate."
      },
      {
        q: "Can I export the amortization schedule?",
        a: "Yes, the amortization schedule generated by our calculator can be copied to your clipboard using the \"Copy Results\" button. You can paste it into a spreadsheet application like Excel or Google Sheets for further analysis, filtering, or printing."
      },
      {
        q: "Is this calculator accurate?",
        a: "Yes, this calculator uses the standard amortization formula M = P × [r(1+r)^n] / [(1+r)^n − 1] and accurately computes the payment breakdown for any fixed-rate loan. It accounts for different payment frequencies, compounding frequencies, and extra payments. The results are suitable for mortgages, auto loans, personal loans, student loans, and business loans."
      },
      {
        q: "Does it work for auto loans?",
        a: "Yes, simply enter your auto loan amount, interest rate, and loan term. Auto loans typically have shorter terms (3-7 years) and are fully amortizing, meaning they are paid off by the end of the term. Our calculator handles any loan amount, rate, and term combination."
      },
      {
        q: "What is the difference between simple interest and amortized interest?",
        a: "Simple interest is calculated only on the original principal amount, while amortized interest is calculated on the declining balance. Most installment loans (mortgages, auto loans, personal loans) use amortized interest, where each payment covers the interest accrued since the last payment plus a portion of principal. This is why early payments are mostly interest — the balance is highest at the start."
      },
      {
        q: "How does payment frequency affect total interest?",
        a: "More frequent payments reduce total interest because principal is paid down sooner, reducing the balance that interest accrues on. Bi-weekly payments (26 per year) are equivalent to 13 monthly payments per year (one extra payment annually), which can save thousands in interest and shorten the loan term by several years. Weekly payments save even more."
      },
      {
        q: "What is the effective interest rate?",
        a: "The effective interest rate (also called the annual equivalent rate or APR) accounts for the effect of compounding frequency. It represents the true annual cost of borrowing. For example, a loan with a 6.5% nominal rate compounded monthly has an effective rate of approximately 6.70%. Our calculator displays both the nominal and effective rate."
      },
      {
        q: "How does compounding frequency affect my loan?",
        a: "Compounding frequency determines how often interest is calculated and added to the loan balance. More frequent compounding (daily or monthly) results in slightly more total interest compared to less frequent compounding (quarterly or annually). Most mortgages use monthly compounding, while some personal loans may use daily or quarterly compounding. Our calculator accurately models any compounding frequency."
      },
      {
        q: "Can I compare two loan scenarios?",
        a: "Yes, our calculator includes a built-in comparison mode that lets you compare two loan scenarios side by side. You can compare different loan amounts, interest rates, terms, and extra payment amounts. The comparison shows the difference in monthly payment, total interest, total cost, and payoff time."
      }
    ]
  },
  "tip-calculator": {
    name: "Tip Calculator",
    category: "Math",
    icon: "fa-receipt",
    iconClass: "icon-math",
    tagClass: "tag-math",
    description: "Calculate tip amounts, split bills among friends, and find the total per person with tax included.",
    metaDescription: "Free tip calculator — instantly calculate tip amounts, split bills among friends, and find the total per person with tax included.",
    fields: [
      {
        id: "bill_amount",
        label: "Bill Amount ($)",
        type: "number",
        default: 50,
        min: 0,
        step: 0.01,
        hint: "The total amount of the bill before tip."
      },
      {
        id: "tip_percent",
        label: "Tip Percentage (%)",
        type: "number",
        default: 18,
        min: 0,
        max: 100,
        step: 0.5,
        hint: "The tip percentage you want to leave. Standard is 15-20%."
      },
      {
        id: "tax_percent",
        label: "Tax Percentage (%)",
        type: "number",
        default: 0,
        min: 0,
        max: 100,
        step: 0.5,
        hint: "Sales tax percentage (optional)."
      },
      {
        id: "num_people",
        label: "Number of People",
        type: "number",
        default: 1,
        min: 1,
        step: 1,
        hint: "How many people are splitting the bill."
      }
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
      heading: "How to Calculate Tips and Split Bills Fairly",
      intro: "Tipping is a standard part of dining and service culture in many countries. Knowing how to calculate a tip quickly and fairly ensures you reward good service appropriately and split bills accurately among friends.",
      sections: [
        {
          heading: "The Standard Tip Formula",
          body: "Tip = Bill Amount × (Tip Percentage / 100). For example, on a $50 bill with an 18% tip, the tip is $50 × 0.18 = $9. The total is $50 + $9 = $59. For a quick mental calculation, round the bill to the nearest ten and multiply by 0.18, or simply double the tax amount for an approximate 18% tip."
        },
        {
          heading: "Splitting the Bill",
          body: "To split a bill evenly, divide the total (including tip and tax) by the number of people. For example, a $59 total split among 4 people is $59 ÷ 4 = $14.75 per person. If you want to tip on the pre-tax amount only, calculate the tip separately and add it to the taxed total before dividing."
        },
        {
          heading: "Tipping Etiquette",
          body: "In the United States, 15-20% is standard for good service at restaurants. For buffets, 10-15% is typical. For taxis and rideshares, 10-15% is standard. For hotel bellhops, $1-2 per bag is customary. For hotel housekeeping, $2-5 per night is typical. Always check local customs when traveling internationally, as tipping practices vary widely."
        }
      ]
    },
    howTo: [
      "Enter the total bill amount before tip and tax.",
      "Set the tip percentage (15-20% is standard for good service).",
      "Enter the sales tax percentage if applicable.",
      "Enter the number of people splitting the bill.",
      "The calculator shows the tip amount, tax, total, and per-person amounts."
    ],
    formula: "Tip = Bill × (Tip% / 100) | Tax = Bill × (Tax% / 100) | Total = Bill + Tax + Tip | Per Person = Total / Number of People",
    examples: [
      {
        title: "Dinner for Two",
        input: "Bill: $85, Tip: 20%, Tax: 8%, People: 2",
        result: "Tip: $17.00 | Tax: $6.80 | Total: $108.80 | Per Person: $54.40"
      },
      {
        title: "Large Group",
        input: "Bill: $240, Tip: 18%, Tax: 0%, People: 6",
        result: "Tip: $43.20 | Total: $283.20 | Per Person: $47.20"
      }
    ],
    faqs: [
      {
        q: "How do I calculate a tip?",
        a: "Tip = Bill Amount × (Tip Percentage / 100). For a $50 bill with an 18% tip, the tip is $50 × 0.18 = $9."
      },
      {
        q: "How do I split a bill?",
        a: "Divide the total (bill + tax + tip) by the number of people. For example, a $59 total split among 4 people is $14.75 each."
      },
      {
        q: "What is a good tip percentage?",
        a: "In the US, 15-20% is standard for good restaurant service. 10-15% for buffets, 10-15% for taxis, and $1-2 per bag for hotel bellhops."
      },
      {
        q: "Should I tip on the pre-tax or post-tax amount?",
        a: "Traditionally, tips are calculated on the pre-tax amount. However, many people tip on the post-tax total. Our calculator lets you enter both tax and tip percentages separately for clarity."
      }
    ]
  }
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