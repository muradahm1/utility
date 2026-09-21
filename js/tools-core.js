// ── GetCalcu Lean Interactive Client Tools Engine ──
// Generated automatically by scripts/build-tools-core.js
// Contains operational calculation logic & input schemas without duplicate static prose.

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

const TOOLS = {};

TOOLS['mortgage-calculator'] = Object.assign({"name":"Mortgage Calculator","category":"Finance","icon":"fa-house","iconClass":"icon-home","tagClass":"tag-finance","formula":"M = P × [r(1 + r)^n] / [(1 + r)^n − 1]","presets":[{"label":"30-Yr Fixed (20% Down)","values":{"home_price":400000,"down_payment":80000,"interest_rate":6.8,"loan_term":30,"property_tax":4800,"insurance":1200}},{"label":"15-Yr Fixed (Save Interest)","values":{"home_price":400000,"down_payment":80000,"interest_rate":6,"loan_term":15,"property_tax":4800,"insurance":1200}},{"label":"FHA Starter (3.5% Down)","values":{"home_price":320000,"down_payment":11200,"interest_rate":6.5,"loan_term":30,"property_tax":3800,"insurance":1100}}],"fields":[{"id":"home_price","label":"Home Price ($)","type":"number","default":400000,"min":1000,"step":1000,"hint":"The total purchase price of the home you are buying."},{"id":"down_payment","label":"Down Payment ($)","type":"number","default":80000,"min":0,"step":1000,"hint":"Cash paid upfront. A larger down payment lowers your loan amount and can help you avoid PMI (typically need 20% to skip it)."},{"id":"interest_rate","label":"Annual Interest Rate (%)","type":"number","default":7,"min":0.01,"step":0.05,"max":50,"hint":"The yearly interest rate (APR) on your mortgage. US 30-year fixed rates have often ranged 6-8%."},{"id":"loan_term","label":"Loan Term (years)","type":"select","default":30,"options":[{"value":10,"label":"10 years"},{"value":15,"label":"15 years"},{"value":20,"label":"20 years"},{"value":25,"label":"25 years"},{"value":30,"label":"30 years"}],"hint":"How long you take to repay the loan. Shorter terms mean higher monthly payments but far less total interest."},{"id":"property_tax","label":"Annual Property Tax ($)","type":"number","default":4800,"min":0,"step":100,"hint":"Yearly property tax set by your local government, spread across your monthly payments."},{"id":"insurance","label":"Annual Insurance ($)","type":"number","default":1200,"min":0,"step":100,"hint":"Yearly homeowners insurance premium, spread across your monthly payments."}],"related":["loan-calculator","rent-vs-buy-calculator","house-affordability-calculator","amortization-calculator"]}, { calculate: calculate(v) {
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
    } });
TOOLS['bmi-calculator'] = Object.assign({"name":"BMI Calculator","category":"Health","icon":"fa-heart","iconClass":"icon-health","tagClass":"tag-health","formula":"BMI = Weight (kg) / [Height (m)]² | Imperial: BMI = 703 × Weight (lb) / [Height (in)]²","presets":[],"fields":[{"id":"unit","label":"Unit System","type":"select","default":"metric","options":[{"value":"metric","label":"Metric (kg / cm)"},{"value":"imperial","label":"Imperial (lb / in)"}],"hint":"Choose Metric (kilograms / centimeters) or Imperial (pounds / inches)."},{"id":"weight","label":"Weight","type":"number","default":70,"min":1,"step":0.1,"hint":"Your body weight, entered in the unit system selected above."},{"id":"height","label":"Height","type":"number","default":175,"min":1,"step":0.1,"hint":"Your height, entered in the unit system selected above."},{"id":"age","label":"Age","type":"number","default":30,"min":1,"max":120,"step":1,"hint":"Your age. BMI categories are the same for adults of all ages, but age gives context to your result."}],"related":["calorie-calculator","tdee-calculator","percentage-calculator"]}, { calculate: calculate(v) {
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
    } });
TOOLS['percentage-calculator'] = Object.assign({"name":"Percentage Calculator","category":"Math","icon":"fa-percent","iconClass":"icon-math","tagClass":"tag-math","formula":"Proportion: (X / Y) × 100 | Portion: (X / 100) × Y | % Change: ((New − Old) / |Old|) × 100","presets":[],"fields":[{"id":"mode","type":"select","default":"what-percent","options":[{"value":"what-percent","label":"X is what % of Y?"},{"value":"percent-of","label":"What is X% of Y?"},{"value":"change","label":"% Change (from X to Y)"}],"hint":"Pick the type of percentage calculation you want to perform."},{"id":"val_a","label":"Value A","type":"number","default":50,"min":-99999999,"step":1,"hint":"The first value. Its meaning changes based on the mode chosen above."},{"id":"val_b","label":"Value B","type":"number","default":200,"min":-99999999,"step":1,"hint":"The second value. Its meaning changes based on the mode chosen above."}],"related":["tip-calculator","inflation-calculator","compound-interest-calculator"]}, { calculate: calculate(v) {
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
    } });
TOOLS['loan-calculator'] = Object.assign({"name":"Loan Calculator","category":"Finance","icon":"fa-sack-dollar","iconClass":"icon-finance","tagClass":"tag-finance","formula":{"text":"M = P × [r(1 + r)^n] / [(1 + r)^n − 1] | Total Interest = (M × n) − P | Total Cost = M × n","variables":[{"symbol":"M","description":"Monthly fixed installment payment"},{"symbol":"P","description":"Loan principal (initial borrowed amount)"},{"symbol":"r","description":"Monthly interest rate (Annual APR ÷ 12 ÷ 100)"},{"symbol":"n","description":"Total number of monthly payments (Loan term in years × 12)"},{"symbol":"Total Cost","description":"Sum of all monthly payments over the entire loan life"}]},"presets":[],"fields":[{"id":"loan_amount","label":"Loan Amount ($)","type":"number","default":30000,"min":1,"step":100,"hint":"The total amount you are borrowing (the principal)."},{"id":"interest_rate","label":"Annual Interest Rate (%)","type":"number","default":6.5,"min":0.01,"step":0.05,"max":50,"hint":"The yearly interest rate (APR) charged on the loan."},{"id":"loan_term","label":"Loan Term (years)","type":"select","default":5,"options":[{"value":1,"label":"1 year"},{"value":2,"label":"2 years"},{"value":3,"label":"3 years"},{"value":4,"label":"4 years"},{"value":5,"label":"5 years"},{"value":6,"label":"6 years"},{"value":7,"label":"7 years"},{"value":10,"label":"10 years"}],"hint":"How many years you will take to repay the loan in full."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['date-calculator'] = Object.assign({"name":"Date Calculator","category":"Math","icon":"fa-calendar","iconClass":"icon-math","tagClass":"tag-math","formula":"Days Between = |End Date − Start Date| | Result Date = Start Date + Days + Months + Years (calendar arithmetic)","presets":[],"fields":[{"id":"mode","type":"select","default":"between","options":[{"value":"between","label":"Days between dates"},{"value":"add","label":"Add/subtract from date"}],"hint":"Choose whether to count days between two dates or add/subtract time from a date."},{"id":"start_date","label":"Start Date","type":"date","hint":"The starting date for your calculation."},{"id":"end_date","label":"End Date","type":"date","hint":"The ending date, used when counting days between two dates."},{"id":"add_days","label":"Days","type":"number","default":0,"min":-99999,"max":99999,"step":1,"hint":"Days to add (positive) or subtract (negative)."},{"id":"add_months","label":"Months","type":"number","default":0,"min":-99999,"max":99999,"step":1,"hint":"Months to add (positive) or subtract (negative)."},{"id":"add_years","label":"Years","type":"number","default":0,"min":-99999,"max":99999,"step":1,"hint":"Years to add (positive) or subtract (negative)."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['loan-interest-calculator'] = Object.assign({"name":"Loan Interest Calculator","category":"Finance","icon":"fa-percent","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Payment = P × [r(1+r)^n] / [(1+r)^n − 1] | Total Interest = (Payment × n) − P | r = APR ÷ payments per year, n = total payments","presets":[],"fields":[{"id":"loan_amount","label":"Loan Amount ($)","type":"number","default":25000,"min":1,"step":100,"hint":"The total amount you are borrowing (the principal)."},{"id":"interest_rate","label":"Annual Interest Rate (%)","type":"number","default":5,"min":0.01,"step":0.05,"max":50,"hint":"The yearly interest rate (APR) charged on the loan."},{"id":"loan_term","label":"Loan Term (years)","type":"number","default":5,"min":1,"max":50,"step":1,"hint":"How many years you will take to repay the loan."},{"id":"payment_freq","label":"Payment Frequency","type":"select","default":"monthly","options":[{"value":"monthly","label":"Monthly (12/yr)"},{"value":"biweekly","label":"Bi-Weekly (26/yr)"},{"value":"weekly","label":"Weekly (52/yr)"},{"value":"quarterly","label":"Quarterly (4/yr)"}],"hint":"How often you make payments. More frequent payments slightly reduce total interest paid."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['compound-interest-calculator'] = Object.assign({"name":"Compound Interest Calculator","category":"Finance","icon":"fa-chart-line","iconClass":"icon-finance","tagClass":"tag-finance","formula":{"text":"FV = P × (1 + r / n)^(n × t) + PMT × [((1 + r / n)^(n × t) − 1) / (r / n)]","variables":[{"symbol":"FV","description":"Future Value (total accumulated balance including contributions and compound interest)"},{"symbol":"P","description":"Initial Principal balance deposited at inception"},{"symbol":"r","description":"Nominal annual interest rate expressed in decimal form (e.g., 8% = 0.08)"},{"symbol":"n","description":"Compounding frequency per year (1 for annual, 4 for quarterly, 12 for monthly, 365 for daily)"},{"symbol":"t","description":"Investment duration in years"},{"symbol":"PMT","description":"Periodic recurring contribution amount adjusted to match compounding frequency"}]},"presets":[{"label":"Index Fund ($500/mo @ 8%)","values":{"initial_deposit":10000,"monthly_contribution":500,"annual_rate":8,"investment_term":20,"compound_frequency":12}},{"label":"Aggressive ($1,000/mo @ 10%)","values":{"initial_deposit":25000,"monthly_contribution":1000,"annual_rate":10,"investment_term":25,"compound_frequency":12}},{"label":"Conservative HYSA (4.5%)","values":{"initial_deposit":5000,"monthly_contribution":250,"annual_rate":4.5,"investment_term":10,"compound_frequency":12}}],"fields":[{"id":"principal","label":"Starting Balance ($)","type":"number","default":10000,"min":0,"step":100,"hint":"Your initial lump-sum deposit or current investment balance."},{"id":"annual_rate","label":"Annual Interest Rate (%)","type":"number","default":8,"min":0.01,"step":0.1,"hint":"Expected average yearly growth rate. A diversified stock portfolio has historically returned about 7-10% long-term."},{"id":"compounding_freq","label":"Compounding Frequency","type":"select","default":"monthly","options":[{"value":"annually","label":"Annually (1/yr)"},{"value":"semi-annually","label":"Semi-annually (2/yr)"},{"value":"quarterly","label":"Quarterly (4/yr)"},{"value":"monthly","label":"Monthly (12/yr)"},{"value":"daily","label":"Daily (365/yr)"}],"hint":"How often interest is added to your balance. More frequent compounding grows your money slightly faster. <a href=\"#faqs\">See how compounding frequency affects growth ↓</a>"},{"id":"monthly_contribution","label":"Monthly Contribution ($)","type":"number","default":500,"min":0,"step":50,"hint":"Amount you add each month on top of your starting balance."},{"id":"time_years","label":"Time Horizon (years)","type":"number","default":30,"min":1,"max":100,"step":1,"hint":"How long your money stays invested. Longer horizons dramatically boost compound growth."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['investment-calculator'] = Object.assign({"name":"Investment Calculator","category":"Finance","icon":"fa-chart-line","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Future Value = Principal × (1 + r/n)^(nt) + Monthly Contribution × [((1 + r/12)^(12t) - 1) / (r/12)] | Total Return % = (Total Return / Total Contributions) × 100","presets":[],"fields":[{"id":"initial_investment","label":"Initial Investment ($)","type":"number","default":10000,"min":0,"step":1000,"hint":"Your starting lump-sum amount invested today."},{"id":"monthly_contribution","label":"Monthly Contribution ($)","type":"number","default":500,"min":0,"step":50,"hint":"How much you add to your investment each month."},{"id":"annual_return","label":"Expected Annual Return (%)","type":"number","default":8,"min":0.01,"step":0.1,"max":100,"hint":"Expected average yearly return. S&P 500 long-term average: about 7-10%. <a href=\"#faqs\">See safe return rates ↓</a>"},{"id":"investment_period","label":"Investment Period (years)","type":"number","default":20,"min":1,"max":100,"step":1,"hint":"How many years you plan to keep your money invested."},{"id":"compound_freq","label":"Compounding Frequency","type":"select","default":"monthly","options":[{"value":"annually","label":"Annually (1/yr)"},{"value":"semi-annually","label":"Semi-annually (2/yr)"},{"value":"quarterly","label":"Quarterly (4/yr)"},{"value":"monthly","label":"Monthly (12/yr)"},{"value":"daily","label":"Daily (365/yr)"}],"hint":"How often returns are reinvested. <a href=\"#faqs\">See how compounding frequency affects growth ↓</a>"},{"id":"goal_amount","label":"Savings Goal ($) (optional)","type":"number","default":1000000,"min":0,"step":10000,"hint":"A target balance you want to reach (e.g. $1M). Optional — used to estimate how long it will take."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['budget-planner'] = Object.assign({"name":"Budget Planner & Expense Tracker","category":"Finance","icon":"fa-wallet","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Budget Status = Total Income – Total Expenses | Savings Rate = (Remaining / Income) × 100 | 50/30/20 Rule: Needs ≤ 50%, Wants ≤ 30%, Savings ≥ 20%","presets":[],"fields":[],"related":[]}, { calculate: calculate() { return {}; }, customRenderer: (container) => { if (window.renderBudgetPlannerModule) window.renderBudgetPlannerModule(container); } });
TOOLS['retirement-calculator'] = Object.assign({"name":"Retirement Calculator","category":"Finance","icon":"fa-umbrella","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Real Return = (1 + Nominal Return) / (1 + Inflation Rate) - 1 | FV = PV x (1 + r)^n | FV = PMT x [((1 + r_monthly)^n - 1) / r_monthly] | 4% Rule: Annual Withdrawal = Nest Egg x 0.04 | Target Nest Egg = Desired Annual Income x 25","presets":[],"fields":[{"id":"current_age","label":"Your Current Age","type":"number","default":25,"min":18,"max":70,"step":1,"hint":"Your age today. The calculator uses this to find how many years you have until retirement."},{"id":"current_savings","label":"Current Retirement Savings ($)","type":"number","default":0,"min":0,"step":1000,"hint":"Total across all retirement accounts: 401k, IRA, Roth IRA, and brokerage investments."},{"id":"annual_income","label":"Annual Income ($)","type":"number","default":55000,"min":10000,"step":5000,"hint":"Your current yearly pre-tax income. Used to estimate your retirement income target."},{"id":"monthly_contribution","label":"Monthly Contribution ($)","type":"number","default":500,"min":0,"step":50,"hint":"What you save each month toward retirement (401k, IRA, brokerage). Even small amounts compound over decades."},{"id":"annual_return","label":"Expected Annual Return (%)","type":"number","default":7,"min":0.1,"step":0.1,"max":30,"hint":"Expected average yearly investment growth. S&P 500 long-term average: about 7-8% after inflation. <a href=\"#faqs\">See realistic return rates ↓</a>"},{"id":"inflation_rate","label":"Expected Inflation Rate (%)","type":"number","default":3,"min":0,"step":0.1,"max":20,"hint":"The annual rate at which prices rise, eroding purchasing power. US historical average: 2.5-3%. <a href=\"#faqs\">See how inflation affects savings ↓</a>"},{"id":"retirement_age","label":"Desired Retirement Age","type":"number","default":65,"min":30,"max":80,"step":1,"hint":"The age you plan to stop working and start drawing on your nest egg."},{"id":"life_expectancy","label":"Life Expectancy (years)","type":"number","default":95,"min":50,"max":120,"step":1,"hint":"How long you expect to live in retirement. Plan for 90-95 to be safe."},{"id":"income_replacement","label":"Desired Retirement Income (% of current)","type":"number","default":80,"min":10,"max":100,"step":5,"hint":"Share of pre-retirement income you will need in retirement. Advisors suggest 70-80%."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['savings-calculator'] = Object.assign({"name":"Savings & Strategy Calculator","category":"Finance","icon":"fa-piggy-bank","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Biweekly vs Monthly: FV = P0(1+r/k)^(kt) + PMT * [((1+r/k)^(kt)-1)/(r/k)] with k=26 (biweekly) vs k=12 (monthly) | Post-Tax Real Yield: r_net = r_nominal*(1-tau) and r_real = (1+r_net)/(1+pi)-1 | Goal Months: smallest n with P0(1+r_m)^n + PMT_m*(((1+r_m)^n-1)/r_m) >= G | Emergency Coverage: Months = P0/E, G3=3E, G6=6E","presets":[{"label":"Biweekly Acceleration ($250)","values":{"mode":"biweekly-monthly","initial_deposit":5000,"recurring_deposit":250,"deposit_frequency":"biweekly","interest_rate":4.5,"duration_years":5}},{"label":"Goal Timeline ($50k Target)","values":{"mode":"goal-timeline","initial_deposit":10000,"recurring_deposit":500,"deposit_frequency":"monthly","interest_rate":4.5,"target_goal":50000}},{"label":"6-Month Emergency Runway","values":{"mode":"emergency-fund","initial_deposit":12000,"essential_expenses":3500}}],"fields":[{"id":"mode","label":"Savings Strategy Mode","type":"select","default":"biweekly-monthly","options":[{"value":"biweekly-monthly","label":"Biweekly vs Monthly Growth Comparison"},{"value":"goal-timeline","label":"Target Goal & Exact Date Timeline"},{"value":"hysa-real-yield","label":"HYSA Net Return (Tax & Inflation Adjusted)"},{"value":"emergency-fund","label":"Emergency Fund Expenses Calculator"}],"hint":"Choose a savings strategy to model. Each mode surfaces only the inputs it needs."},{"id":"initial_deposit","label":"Initial Deposit / Current Savings ($)","type":"number","default":5000,"min":0,"step":100,"hint":"Your starting balance or current savings today. Use 0 if you are starting from scratch."},{"id":"recurring_deposit","label":"Monthly-Equivalent Deposit ($)","type":"number","default":250,"min":0,"step":25,"hint":"The amount you deposit per paycheck cycle. In Biweekly vs Monthly mode this is the monthly-equivalent payment."},{"id":"deposit_frequency","label":"Deposit Frequency","type":"select","default":"biweekly","options":[{"value":"biweekly","label":"Biweekly (26/yr)"},{"value":"monthly","label":"Monthly (12/yr)"},{"value":"weekly","label":"Weekly (52/yr)"}],"hint":"How often you contribute. Used for compounding cadence in Growth and Goal modes."},{"id":"target_goal","label":"Target Goal Amount ($)","type":"number","default":25000,"min":0,"step":500,"hint":"The total balance you want to reach. The calculator projects the exact month and year you cross this line."},{"id":"essential_expenses","label":"Essential Monthly Expenses ($)","type":"number","default":3500,"min":0,"step":100,"hint":"Non-negotiable monthly costs: rent/mortgage, utilities, food, insurance, and minimum debt payments."},{"id":"interest_rate","label":"Annual Interest Rate / HYSA APY (%)","type":"number","default":4.5,"min":0,"max":30,"step":0.1,"hint":"Stated annual yield. For a High-Yield Savings Account use the advertised APY (commonly 3-5%)."},{"id":"tax_rate","label":"Marginal Income Tax Rate (%)","type":"number","default":22,"min":0,"max":50,"step":1,"hint":"Your marginal federal + state income tax bracket applied to interest earned."},{"id":"inflation_rate","label":"Expected Inflation Rate (%)","type":"number","default":2.5,"min":0,"max":15,"step":0.1,"hint":"Expected annual price increase that erodes purchasing power. US long-run average is about 2.5-3%."},{"id":"duration_years","label":"Savings Duration (Years)","type":"number","default":5,"min":1,"max":50,"step":1,"hint":"The planning horizon over which growth, compounding, and real-yield erosion are measured."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['credit-card-payoff-calculator'] = Object.assign({"name":"Credit Card Payoff & Strategy Calculator","category":"Finance","icon":"fa-credit-card","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Daily periodic rate: i_daily = APR / 365 | Monthly factor (daily compounding): i_month = (1 + i_daily)^30 - 1 | Monthly interest: I = Balance x i_month | Fixed payoff payment: PMT = (B x i_month) / (1 - (1 + i_month)^-n) | Transfer fee: Fee = B x (transferFee% / 100) | Net transfer savings = Interest(stay) - Fee - Interest(post-promo) | Minimum payment: max($25 floor, Balance x minPct%)","presets":[{"label":"Fixed Payoff ($300/mo)","values":{"mode":"min-payment","balance":6000,"apr":22.5,"min_pct":2.5,"monthly_payment":300}},{"label":"24-Month Debt-Free Goal","values":{"mode":"target-date","balance":8000,"apr":21,"target_months":24}},{"label":"0% Balance Transfer (18 Mo)","values":{"mode":"balance-transfer","balance":7500,"apr":24,"transfer_fee":3,"promo_months":18,"monthly_payment":450}}],"fields":[{"id":"mode","label":"Strategy Mode","type":"select","default":"min-payment","options":[{"value":"min-payment","label":"Minimum Payment Trap & Fixed Monthly Payoff"},{"value":"target-date","label":"Exact Target Debt-Free Date Goal"},{"value":"balance-transfer","label":"0% APR Balance Transfer Savings"},{"value":"avalanche-snowball","label":"Avalanche vs Snowball Multi-Card Strategy"}],"hint":"Choose what to analyze. Each mode exposes a different cost of carrying credit card debt."},{"id":"balance","label":"Total Credit Card Balance ($)","type":"number","default":7500,"min":0,"step":100,"hint":"The total outstanding balance across the card(s) you want to pay off."},{"id":"apr","label":"Annual Interest Rate / APR (%)","type":"number","default":21.5,"min":0,"max":40,"step":0.1,"hint":"The stated Annual Percentage Rate. Credit card APRs commonly range from 18% to 29% and accrue interest daily."},{"id":"min_pct","label":"Minimum Payment Percentage (%)","type":"number","default":2.5,"min":1,"max":10,"step":0.5,"hint":"The percent of the balance your lender sets as the minimum each month (typically 2%-3%). Lenders also apply a $25 floor."},{"id":"monthly_payment","label":"Planned Monthly Payment ($)","type":"number","default":250,"min":0,"step":25,"hint":"The amount you commit to paying each month. Must exceed the monthly interest charge to actually reduce the balance."},{"id":"target_months","label":"Target Debt-Free Timeframe (Months)","type":"number","default":24,"min":1,"max":120,"step":1,"hint":"The number of months within which you want to be 100% debt-free. The calculator solves for the exact monthly payment required."},{"id":"transfer_fee","label":"Balance Transfer Fee (%)","type":"number","default":3,"min":0,"max":10,"step":0.5,"hint":"The upfront one-time fee the new card charges to move your balance (typically 3%-5%). Charged immediately on top of your balance."},{"id":"promo_months","label":"Promotional 0% APR Duration (Months)","type":"number","default":18,"min":3,"max":36,"step":1,"hint":"The intro 0% interest window (commonly 12-21 months). Any balance left after this reverts to the regular APR."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['rent-vs-buy-calculator'] = Object.assign({"name":"Rent vs. Buy Calculator","category":"Finance","icon":"fa-house-chimney","iconClass":"icon-finance","tagClass":"tag-finance","formula":{"text":"Net Worth (Buy) = Home Value − Mortgage Balance − Selling Costs | Net Worth (Rent) = Invested Down Payment & Cash Flow Savings × (1 + r)^t − Cumulative Rent","variables":[{"symbol":"Home Value","description":"Initial purchase price compounded by annual appreciation rate over t years"},{"symbol":"Mortgage Balance","description":"Remaining amortized loan principal balance at year t"},{"symbol":"Selling Costs","description":"Realtor commissions and transfer costs deducted upon home disposition (5-7%)"},{"symbol":"Invested Capital","description":"Down payment, closing costs, and monthly cash flow differentials invested at portfolio rate r"},{"symbol":"Cumulative Rent","description":"Sum of all monthly rent payments compounded by annual rent inflation"}]},"presets":[],"fields":[{"id":"basic_section","type":"section","label":"Basic Inputs","icon":"fa-sliders"},{"id":"home_price","label":"Home Purchase Price ($)","type":"range","default":450000,"min":50000,"max":5000000,"step":5000,"hint":"The total purchase price of the home you are considering buying."},{"id":"down_payment_type","label":"Down Payment Mode","type":"select","default":"percent","options":[{"value":"percent","label":"Percentage (%)"},{"value":"dollar","label":"Dollar Amount ($)"}],"hint":"Switch between entering your down payment as a percentage or a specific dollar amount."},{"id":"down_payment","label":"Down Payment","type":"range","default":20,"min":0,"max":100,"step":0.5,"hint":"The cash you pay upfront. 20% is standard to avoid PMI. The calculator converts this to a dollar amount based on the home price."},{"id":"mortgage_rate","label":"Mortgage Interest Rate (%)","type":"range","default":6.25,"min":0,"max":20,"step":0.05,"hint":"The annual interest rate (APR) on your mortgage. Current 30-year fixed rates typically range 6-8%."},{"id":"loan_term","label":"Loan Term","type":"select","default":30,"options":[{"value":15,"label":"15 Years"},{"value":20,"label":"20 Years"},{"value":30,"label":"30 Years"}],"hint":"How long you will take to repay the mortgage. Shorter terms build equity faster but have higher monthly payments."},{"id":"current_rent","label":"Current Monthly Rent ($)","type":"range","default":2200,"min":0,"max":20000,"step":50,"hint":"What you currently pay (or would pay) for rent each month."},{"id":"years_staying","label":"Expected Years Staying in the Home","type":"range","default":8,"min":1,"max":40,"step":1,"hint":"This is one of the most influential variables. Buying has high upfront costs that take several years to recover. The longer you stay, the more equity you build and the more buying tends to win. If you plan to move within 3-5 years, renting is often cheaper."},{"id":"rent_increase","label":"Expected Annual Rent Increase (%)","type":"range","default":3,"min":0,"max":15,"step":0.1,"hint":"The average yearly percentage increase in rent. Historical average is about 2-4% annually."},{"id":"home_appreciation","label":"Expected Home Appreciation (%)","type":"range","default":3.5,"min":-5,"max":15,"step":0.1,"hint":"Expected annual increase in home value. Historical US average is about 3-5% per year."},{"id":"investment_return","label":"Expected Investment Return (%)","type":"range","default":7,"min":0,"max":20,"step":0.1,"hint":"The annual return you could earn by investing your down payment and closing costs instead of buying. S&P 500 long-term average: 7-10%."},{"id":"advanced_section","type":"section","label":"Advanced Options","icon":"fa-gear","collapsible":true},{"id":"property_tax","label":"Annual Property Tax ($)","type":"number","default":5400,"min":0,"step":100,"hint":"Yearly property tax based on your local government rate. Typically 1-2% of home value annually."},{"id":"property_tax_growth","label":"Property Tax Growth (%)","type":"number","default":2,"min":0,"max":10,"step":0.1,"hint":"Annual increase in property taxes. Often matches or exceeds inflation."},{"id":"home_insurance","label":"Annual Home Insurance ($)","type":"number","default":1400,"min":0,"step":100,"hint":"Yearly homeowners insurance premium. Covers damage, liability, and personal property."},{"id":"insurance_growth","label":"Insurance Growth (%)","type":"number","default":3,"min":0,"max":10,"step":0.1,"hint":"Annual increase in home insurance premiums."},{"id":"hoa_fees","label":"Monthly HOA Fees ($)","type":"number","default":0,"min":0,"step":25,"hint":"Monthly homeowners association fees for common area maintenance (condos, townhomes, some neighborhoods)."},{"id":"pmi","label":"Monthly PMI ($)","type":"number","default":0,"min":0,"step":10,"hint":"Private Mortgage Insurance when down payment is less than 20%. Typically 0.5-1% of loan amount annually, divided by 12."},{"id":"annual_maintenance","label":"Annual Maintenance ($)","type":"number","default":4500,"min":0,"step":100,"hint":"Estimated yearly maintenance and repairs. A common rule is 1-2% of home value annually."},{"id":"maintenance_growth","label":"Maintenance Growth (%)","type":"number","default":2.5,"min":0,"max":10,"step":0.1,"hint":"Annual increase in maintenance costs as the home ages."},{"id":"closing_costs","label":"Closing Costs ($)","type":"number","default":13500,"min":0,"step":500,"hint":"One-time costs when buying: loan origination, appraisal, title insurance, attorney fees. Typically 2-5% of home price."},{"id":"selling_costs","label":"Selling Costs (%)","type":"number","default":6,"min":0,"max":15,"step":0.1,"hint":"Costs when selling: realtor commission (typically 5-6%), closing fees, capital gains tax if applicable."},{"id":"mortgage_origination","label":"Mortgage Origination Fee (%)","type":"number","default":1,"min":0,"max":5,"step":0.1,"hint":"Lender fee for processing the mortgage, typically 0.5-1.5% of loan amount."},{"id":"inflation_rate","label":"Annual Inflation Rate (%)","type":"number","default":3,"min":0,"max":10,"step":0.1,"hint":"Expected annual inflation rate. Affects future costs and the real value of money over time."},{"id":"discount_rate","label":"Discount Rate (%)","type":"number","default":3,"min":0,"max":15,"step":0.1,"hint":"The rate used to discount future cash flows to present value. Often set near the inflation rate for a real-terms comparison."},{"id":"realtor_commission","label":"Realtor Commission (%)","type":"number","default":5,"min":0,"max":10,"step":0.1,"hint":"The portion of the sale price paid to real estate agents when selling. Typically 5-6%."},{"id":"misc_ownership","label":"Miscellaneous Ownership Costs ($/yr)","type":"number","default":500,"min":0,"step":100,"hint":"Other annual ownership costs: pest control, landscaping, appliance repairs, etc."},{"id":"investment_tax_rate","label":"Investment Tax Rate (%)","type":"number","default":15,"min":0,"max":50,"step":1,"hint":"Tax rate on investment gains (capital gains tax). Long-term gains are typically 15% for most investors."},{"id":"marginal_tax_rate","label":"Marginal Tax Rate (%)","type":"number","default":24,"min":0,"max":50,"step":1,"hint":"Your federal + state marginal tax bracket. Affects the tax deductibility of mortgage interest."},{"id":"renters_insurance","label":"Annual Renters Insurance ($)","type":"number","default":200,"min":0,"step":50,"hint":"Yearly renters insurance to cover personal belongings and liability while renting."},{"id":"moving_costs","label":"Expected Moving Costs ($)","type":"number","default":2000,"min":0,"step":500,"hint":"One-time moving expenses if you buy. Includes movers, truck rental, packing supplies."}],"related":["house-affordability-calculator","mortgage-calculator","amortization-calculator","budget-planner","retirement-calculator","savings-calculator","investment-calculator","compound-interest-calculator","inflation-calculator"]}, { calculate: calculate(v) {
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

      const table = makeTableSpec({
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
      });

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
    } });
TOOLS['house-affordability-calculator'] = Object.assign({"name":"House Affordability Calculator","category":"Finance","icon":"fa-house","iconClass":"icon-finance","tagClass":"tag-finance","formula":{"text":"Max Housing Payment = min(Gross Monthly Income × Front-End %, (Gross Monthly Income × Back-End %) − Monthly Debt) | Max Loan = PV(Rate / 12, Term × 12, Available for P&I) | Affordable Price = Max Loan + Down Payment","variables":[{"symbol":"Front-End %","description":"Maximum allowable percentage of gross income for housing costs (e.g., 28% for conventional)"},{"symbol":"Back-End %","description":"Maximum allowable percentage of gross income for all debt service (e.g., 36% for conventional)"},{"symbol":"Available for P&I","description":"Max housing payment minus monthly property taxes, insurance, and HOA fees"},{"symbol":"Max Loan","description":"Present value of the amortized loan supported by Available for P&I"},{"symbol":"Affordable Price","description":"Total purchase price (Max Loan amount + Cash Down Payment)"}]},"presets":[],"fields":[{"id":"annual_income","label":"Annual Gross Household Income ($)","type":"number","default":105000,"min":0,"step":1000,"hint":"Total yearly household income before taxes."},{"id":"monthly_debt","label":"Monthly Debt Payments ($)","type":"number","default":500,"min":0,"step":50,"hint":"Car loans, student loans, credit cards, etc."},{"id":"down_payment","label":"Cash Saved for Down Payment ($)","type":"number","default":60000,"min":0,"step":1000,"hint":"Cash available for down payment."},{"id":"loan_term","label":"Loan Term (Years)","type":"select","default":30,"options":[{"value":15,"label":"15 years"},{"value":20,"label":"20 years"},{"value":30,"label":"30 years"}],"hint":"How long to repay the mortgage."},{"id":"mortgage_rate","label":"Estimated Mortgage Rate (%)","type":"number","default":6.75,"min":0.01,"max":20,"step":0.05,"hint":"Expected annual interest rate (APR)."},{"id":"property_tax_rate","label":"Annual Property Tax Rate (%)","type":"number","default":1.2,"min":0,"max":5,"step":0.1,"hint":"Effective annual property tax rate (typically 0.5-2%)."},{"id":"home_insurance","label":"Annual Home Insurance ($)","type":"number","default":1500,"min":0,"step":100,"hint":"Yearly homeowners insurance premium."},{"id":"hoa_fees","label":"Monthly HOA / Co-op Fee ($)","type":"number","default":0,"min":0,"step":25,"hint":"Monthly HOA or co-op fees."},{"id":"lender_rule","label":"Lender Rule Preference","type":"select","default":"conventional","options":[{"value":"conventional","label":"Conventional 28/36 Rule"},{"value":"fha","label":"FHA Loan 31/43 Rule"},{"value":"va","label":"VA Loan 41% DTI"},{"value":"aggressive","label":"Aggressive 36/45 Rule"}],"hint":"Choose the lender guideline to use."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['inflation-calculator'] = Object.assign({"name":"Inflation Calculator","category":"Finance","icon":"fa-arrow-trend-up","iconClass":"icon-finance","tagClass":"tag-finance","formula":"FV = PV × (1 + i)^n | Real Value = PV / (1 + i)^n | Purchasing Power Loss = FV − PV | Cumulative Inflation = (1 + i)^n − 1","presets":[],"fields":[{"id":"mode","label":"Calculation Mode","type":"select","default":"future-cost","options":[{"value":"future-cost","label":"Future Cost / Eroded Value"},{"value":"target-power","label":"Target Purchasing Power Needed"}],"hint":"Choose whether to see how much a current amount will be worth in the future, or how much you need in the future to match today's buying power."},{"id":"initial_amount","label":"Initial Amount ($)","type":"range","default":1000,"min":100,"max":1000000,"step":100,"hint":"The amount of money you want to analyze. Drag the slider or type a value."},{"id":"inflation_rate","label":"Annual Inflation Rate (%)","type":"range","default":3.5,"min":0.1,"max":20,"step":0.1,"hint":"The expected yearly inflation rate. The US long-run average is about 2.5-3.5%."},{"id":"years","label":"Time Horizon (Years)","type":"range","default":10,"min":1,"max":50,"step":1,"hint":"How many years into the future you want to project. Longer horizons show more dramatic erosion."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['net-worth-calculator'] = Object.assign({"name":"Net Worth Calculator","category":"Finance","icon":"fa-scale-balanced","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Net Worth = Total Assets − Total Liabilities | Debt-to-Asset Ratio = (Total Liabilities ÷ Total Assets) × 100 | Asset-to-Liability Ratio = Total Assets ÷ Total Liabilities | Liquid-to-Debt Ratio = (Cash + Investments) ÷ Total Liabilities × 100","presets":[],"fields":[{"id":"sec_assets","type":"section","label":"Assets — What You Own","icon":"fa-arrow-trend-up"},{"id":"cash_savings","label":"Cash & Savings ($)","type":"number","default":15000,"min":0,"step":100,"hint":"Checking accounts, savings accounts, cash on hand, and emergency funds."},{"id":"investments","label":"Investments ($)","type":"number","default":45000,"min":0,"step":100,"hint":"Stocks, bonds, mutual funds, ETFs, and brokerage accounts (not retirement)."},{"id":"retirement","label":"Retirement Accounts ($)","type":"number","default":60000,"min":0,"step":100,"hint":"401(k), IRA, Roth IRA, 403(b), and pension values."},{"id":"home_value","label":"Home Value ($)","type":"number","default":350000,"min":0,"step":1000,"hint":"Current market value of your primary residence or real estate."},{"id":"vehicles","label":"Vehicles ($)","type":"number","default":20000,"min":0,"step":500,"hint":"Current resale value of cars, motorcycles, boats, or RVs."},{"id":"other_assets","label":"Other Assets ($)","type":"number","default":10000,"min":0,"step":100,"hint":"Business equity, collectibles, jewelry, and other valuables."},{"id":"sec_liabilities","type":"section","label":"Liabilities — What You Owe","icon":"fa-arrow-trend-down"},{"id":"credit_cards","label":"Credit Card Debt ($)","type":"number","default":5000,"min":0,"step":100,"hint":"Total outstanding balance across all credit cards."},{"id":"personal_loans","label":"Personal Loans ($)","type":"number","default":8000,"min":0,"step":100,"hint":"Personal, student, or auto loans you are repaying."},{"id":"mortgage","label":"Mortgage Balance ($)","type":"number","default":250000,"min":0,"step":1000,"hint":"Remaining principal on your home mortgage."},{"id":"other_debt","label":"Other Debt ($)","type":"number","default":2000,"min":0,"step":100,"hint":"Medical bills, tax debt, and any other outstanding obligations."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['fire-calculator'] = Object.assign({"name":"FIRE Calculator","category":"Finance","icon":"fa-fire","iconClass":"icon-finance","tagClass":"tag-finance","formula":{"text":"FIRE Number = Annual Retirement Expenses ÷ Safe Withdrawal Rate | Savings Rate = (Income − Expenses) ÷ Income × 100 | Inflation-Adjusted FIRE = FIRE Number × (1 + Inflation)^Years","variables":[{"symbol":"FIRE Number","description":"Total portfolio capital required to sustain living expenses indefinitely"},{"symbol":"Safe Withdrawal Rate","description":"Annual percentage withdrawn from portfolio (typically 3.5%–4.0%)"},{"symbol":"Savings Rate","description":"Percentage of net income invested toward wealth accumulation"},{"symbol":"Annual Retirement Expenses","description":"Projected annual living expenditures adjusted for lifestyle mode"},{"symbol":"Inflation-Adjusted FIRE","description":"Future nominal dollar value required to maintain equivalent purchasing power"}]},"presets":[],"fields":[{"id":"annual_income","label":"Annual After-Tax Income ($)","type":"range","default":80000,"min":10000,"max":500000,"step":1000,"hint":"Your total yearly income after taxes. Used to calculate your savings rate."},{"id":"annual_expenses","label":"Annual Expenses ($)","type":"range","default":40000,"min":5000,"max":300000,"step":500,"hint":"Your total yearly spending. The difference between income and expenses is your annual savings."},{"id":"current_portfolio","label":"Current Investment Portfolio ($)","type":"range","default":100000,"min":0,"max":10000000,"step":1000,"hint":"Your current total invested assets across all accounts (401k, IRA, brokerage, etc.)."},{"id":"monthly_contribution","label":"Monthly Investment Contribution ($)","type":"range","default":2000,"min":0,"max":25000,"step":100,"hint":"How much you add to your investments each month."},{"id":"annual_return","label":"Expected Annual Investment Return (%)","type":"range","default":7,"min":1,"max":15,"step":0.1,"hint":"Expected average yearly return. S&P 500 long-term average: about 7-10%. <a href=\"#faqs\">See realistic return rates ↓</a>"},{"id":"inflation_rate","label":"Inflation Rate (%)","type":"range","default":2.5,"min":0,"max":10,"step":0.1,"hint":"Expected annual inflation rate. US historical average: 2.5-3%. <a href=\"#faqs\">See how inflation affects FIRE ↓</a>"},{"id":"withdrawal_rate","label":"Safe Withdrawal Rate (%)","type":"range","default":4,"min":2,"max":6,"step":0.1,"hint":"The percentage of your portfolio you withdraw annually in retirement. The 4% rule is the standard benchmark. <a href=\"#faqs\">See the 4% rule explained ↓</a>"},{"id":"retirement_spending","label":"Retirement Spending Adjustment","type":"select","default":"same","options":[{"value":"same","label":"Same Spending"},{"value":"increase","label":"Increase Spending (+20%)"},{"value":"reduce","label":"Reduce Spending (-20%)"}],"hint":"Adjust your retirement expenses relative to your current spending. Many retirees spend less, but some plan for more travel and leisure."},{"id":"fire_mode","label":"Calculation Mode","type":"select","default":"standard","options":[{"value":"standard","label":"Standard FIRE"},{"value":"lean","label":"Lean FIRE"},{"value":"fat","label":"Fat FIRE"},{"value":"coast","label":"Coast FIRE"},{"value":"barista","label":"Barista FIRE"}],"hint":"Choose your FIRE strategy. Each mode adjusts assumptions to match different retirement lifestyles. <a href=\"#faqs\">See FIRE types explained ↓</a>"}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['amortization-calculator'] = Object.assign({"name":"Amortization Calculator","category":"Finance","icon":"fa-chart-simple","iconClass":"icon-finance","tagClass":"tag-finance","formula":"M = P × [r(1+r)^n] / [(1+r)^n − 1] | r = periodic rate = (1 + APR/compounding periods)^(compounding periods/payments per year) − 1 | Total Interest = (M × n) − P | Interest Savings = Total Interest(no extras) − Total Interest(with extras)","presets":[],"fields":[{"id":"sec_loan","type":"section","label":"Loan Details","icon":"fa-file-invoice"},{"id":"loan_amount","label":"Loan Amount ($)","type":"range","default":300000,"min":1000,"max":5000000,"step":1000,"hint":"The total amount you are borrowing (the principal)."},{"id":"interest_rate","label":"Annual Interest Rate (%)","type":"range","default":6.5,"min":0,"max":25,"step":0.05,"hint":"The yearly interest rate (APR) on your loan."},{"id":"loan_term","label":"Loan Term","type":"select","default":30,"options":[{"value":5,"label":"5 Years"},{"value":10,"label":"10 Years"},{"value":15,"label":"15 Years"},{"value":20,"label":"20 Years"},{"value":25,"label":"25 Years"},{"value":30,"label":"30 Years"},{"value":40,"label":"40 Years"}],"hint":"How long you have to repay the loan in full."},{"id":"payment_freq","label":"Payment Frequency","type":"select","default":"monthly","options":[{"value":"monthly","label":"Monthly (12/yr)"},{"value":"biweekly","label":"Bi-Weekly (26/yr)"},{"value":"weekly","label":"Weekly (52/yr)"}],"hint":"How often you make payments. More frequent payments reduce total interest."},{"id":"compounding_freq","label":"Compounding Frequency","type":"select","default":"monthly","options":[{"value":"monthly","label":"Monthly (12/yr)"},{"value":"quarterly","label":"Quarterly (4/yr)"},{"value":"semi-annual","label":"Semi-Annual (2/yr)"},{"value":"annually","label":"Annual (1/yr)"}],"hint":"How often interest is compounded. Monthly is standard for most loans."},{"id":"loan_start_date","label":"Loan Start Date","type":"date","hint":"When the loan begins. Used to generate the payment schedule with dates."},{"id":"sec_extra","type":"section","label":"Extra Payments","icon":"fa-bolt"},{"id":"extra_monthly","label":"Extra Monthly Payment ($)","type":"range","default":0,"min":0,"max":10000,"step":50,"hint":"Additional amount paid each month to reduce principal faster."},{"id":"extra_one_time","label":"One-Time Extra Payment ($)","type":"number","default":0,"min":0,"step":100,"hint":"A single lump-sum extra payment made at a specific date."},{"id":"extra_one_time_date","label":"One-Time Payment Date","type":"date","hint":"When the one-time extra payment is made."},{"id":"extra_annual","label":"Annual Extra Payment ($)","type":"number","default":0,"min":0,"step":100,"hint":"An extra payment made once every year (e.g. from a bonus or tax refund)."},{"id":"sec_tax_ins","type":"section","label":"Taxes & Insurance","icon":"fa-shield"},{"id":"include_tax_insurance","label":"Include Taxes & Insurance","type":"select","default":"no","options":[{"value":"no","label":"No — Show Principal & Interest Only"},{"value":"yes","label":"Yes — Include Full Monthly Housing Payment"}],"hint":"Toggle to include property taxes, insurance, HOA, and PMI in your monthly payment."},{"id":"annual_property_tax","label":"Annual Property Tax ($)","type":"number","default":4800,"min":0,"step":100,"hint":"Yearly property tax, spread across monthly payments."},{"id":"annual_home_insurance","label":"Annual Home Insurance ($)","type":"number","default":1200,"min":0,"step":100,"hint":"Yearly homeowners insurance premium."},{"id":"hoa_fees","label":"Monthly HOA Fees ($)","type":"number","default":0,"min":0,"step":25,"hint":"Monthly homeowners association fees."},{"id":"pmi","label":"Monthly PMI ($)","type":"number","default":0,"min":0,"step":10,"hint":"Private Mortgage Insurance (required when down payment is less than 20%)."},{"id":"sec_compare","type":"section","label":"Comparison Mode","icon":"fa-not-equal"},{"id":"comparison_mode","label":"Comparison Mode","type":"select","default":"single","options":[{"value":"single","label":"Single Scenario"},{"value":"compare","label":"Compare Two Scenarios"}],"hint":"Compare two loan scenarios side by side to see the difference in payments and interest."},{"id":"compare_loan_amount","label":"Scenario B: Loan Amount ($)","type":"number","default":300000,"min":1000,"step":1000,"hint":"Loan amount for the second scenario."},{"id":"compare_interest_rate","label":"Scenario B: Interest Rate (%)","type":"number","default":5.9,"min":0,"step":0.05,"hint":"Annual interest rate for the second scenario."},{"id":"compare_loan_term","label":"Scenario B: Loan Term","type":"select","default":15,"options":[{"value":5,"label":"5 Years"},{"value":10,"label":"10 Years"},{"value":15,"label":"15 Years"},{"value":20,"label":"20 Years"},{"value":25,"label":"25 Years"},{"value":30,"label":"30 Years"},{"value":40,"label":"40 Years"}],"hint":"Loan term for the second scenario."},{"id":"compare_extra_monthly","label":"Scenario B: Extra Monthly ($)","type":"number","default":0,"min":0,"step":50,"hint":"Extra monthly payment for the second scenario."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['tip-calculator'] = Object.assign({"name":"Tip Calculator","category":"Math","icon":"fa-receipt","iconClass":"icon-math","tagClass":"tag-math","formula":"Tip = Bill × (Tip% / 100) | Tax = Bill × (Tax% / 100) | Total = Bill + Tax + Tip | Per Person = Total / Number of People","presets":[],"fields":[{"id":"bill_amount","label":"Bill Amount ($)","type":"number","default":50,"min":0,"step":0.01,"hint":"The total amount of the bill before tip."},{"id":"tip_percent","label":"Tip Percentage (%)","type":"number","default":18,"min":0,"max":100,"step":0.5,"hint":"The tip percentage you want to leave. Standard is 15-20%."},{"id":"tax_percent","label":"Tax Percentage (%)","type":"number","default":0,"min":0,"max":100,"step":0.5,"hint":"Sales tax percentage (optional)."},{"id":"num_people","label":"Number of People","type":"number","default":1,"min":1,"step":1,"hint":"How many people are splitting the bill."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['true-home-buying-system'] = Object.assign({"name":"True Home Buying System","category":"Finance","icon":"fa-house-circle-check","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Total Cash to Close = Down Payment + Closing Costs + Escrow Reserves | True Monthly Cost = Monthly P&I + Property Tax + Hazard Insurance + HOA + (1% × Home Value ÷ 12) | Mortgage P&I (US): M = P × [r(1+r)^n] / [(1+r)^n − 1] | Mortgage P&I (CA Semi-Annual): r_eff = (1 + r/2)^(1/6) − 1","presets":[{"label":"US Standard (20% Down)","values":{"country":"US","state_province":"TX","home_price":450000,"down_payment_pct":20,"closing_costs_pct":3,"prepaids_reserve_pct":1,"interest_rate":6.8,"loan_term":30,"property_tax_rate":1.68,"home_insurance":1800,"hoa_fees":0,"enable_maintenance":"yes","maintenance_pct":1,"current_rent":2200,"rent_increase_pct":3,"home_appreciation_pct":3.5,"investment_return_pct":7.5,"ownership_years":10,"selling_cost_pct":6}},{"label":"US FHA Starter (3.5% Down)","values":{"country":"US","state_province":"FL","home_price":350000,"down_payment_pct":3.5,"closing_costs_pct":3.5,"prepaids_reserve_pct":1.2,"interest_rate":6.5,"loan_term":30,"property_tax_rate":0.91,"home_insurance":2200,"hoa_fees":50,"enable_maintenance":"yes","maintenance_pct":1,"current_rent":1950,"rent_increase_pct":3.5,"home_appreciation_pct":4,"investment_return_pct":7.5,"ownership_years":7,"selling_cost_pct":6}},{"label":"Canada Urban Home (CMHC 10% Down)","values":{"country":"CA","state_province":"ON","home_price":650000,"down_payment_pct":10,"closing_costs_pct":2.5,"prepaids_reserve_pct":1,"interest_rate":5.2,"loan_term":25,"property_tax_rate":1.05,"home_insurance":1400,"hoa_fees":0,"enable_maintenance":"yes","maintenance_pct":1,"current_rent":2600,"rent_increase_pct":3,"home_appreciation_pct":3.5,"investment_return_pct":7.5,"ownership_years":10,"selling_cost_pct":5}},{"label":"Condo / Townhome with HOA","values":{"country":"US","state_province":"CA","home_price":550000,"down_payment_pct":15,"closing_costs_pct":2.8,"prepaids_reserve_pct":1,"interest_rate":6.75,"loan_term":30,"property_tax_rate":0.75,"home_insurance":1200,"hoa_fees":350,"enable_maintenance":"yes","maintenance_pct":0.75,"current_rent":2500,"rent_increase_pct":3,"home_appreciation_pct":4,"investment_return_pct":7.5,"ownership_years":8,"selling_cost_pct":6}}],"fields":[{"id":"jurisdiction_section","type":"section","label":"Jurisdiction & Location Rules","icon":"fa-globe"},{"id":"country","label":"Country / Regulatory System","type":"select","default":"US","options":[{"value":"US","label":"United States (CFPB / Monthly Compounding / PMI / FHA)"},{"value":"CA","label":"Canada (Bank Act / Semi-Annual Compounding / CMHC Insurance)"}],"hint":"Applies official statutory mortgage compounding rules, default insurance tiers, and tax benchmarks."},{"id":"state_province","label":"State / Province / Territory","type":"select","default":"TX","options":[{"value":"AL","label":"Alabama (US) — Avg Tax 0.40%"},{"value":"AK","label":"Alaska (US) — Avg Tax 1.04%"},{"value":"AZ","label":"Arizona (US) — Avg Tax 0.53%"},{"value":"AR","label":"Arkansas (US) — Avg Tax 0.54%"},{"value":"CA","label":"California (US) — Avg Tax 0.75%"},{"value":"CO","label":"Colorado (US) — Avg Tax 0.52%"},{"value":"CT","label":"Connecticut (US) — Avg Tax 1.79%"},{"value":"DE","label":"Delaware (US) — Avg Tax 0.61%"},{"value":"FL","label":"Florida (US) — Avg Tax 0.91%"},{"value":"GA","label":"Georgia (US) — Avg Tax 0.81%"},{"value":"HI","label":"Hawaii (US) — Avg Tax 0.32%"},{"value":"ID","label":"Idaho (US) — Avg Tax 0.54%"},{"value":"IL","label":"Illinois (US) — Avg Tax 2.08%"},{"value":"IN","label":"Indiana (US) — Avg Tax 0.77%"},{"value":"IA","label":"Iowa (US) — Avg Tax 1.43%"},{"value":"KS","label":"Kansas (US) — Avg Tax 1.34%"},{"value":"KY","label":"Kentucky (US) — Avg Tax 0.80%"},{"value":"LA","label":"Louisiana (US) — Avg Tax 0.56%"},{"value":"ME","label":"Maine (US) — Avg Tax 1.20%"},{"value":"MD","label":"Maryland (US) — Avg Tax 1.05%"},{"value":"MA","label":"Massachusetts (US) — Avg Tax 1.14%"},{"value":"MI","label":"Michigan (US) — Avg Tax 1.38%"},{"value":"MN","label":"Minnesota (US) — Avg Tax 1.02%"},{"value":"MS","label":"Mississippi (US) — Avg Tax 0.67%"},{"value":"MO","label":"Missouri (US) — Avg Tax 0.93%"},{"value":"MT","label":"Montana (US) — Avg Tax 0.73%"},{"value":"NE","label":"Nebraska (US) — Avg Tax 1.54%"},{"value":"NV","label":"Nevada (US) — Avg Tax 0.59%"},{"value":"NH","label":"New Hampshire (US) — Avg Tax 1.93%"},{"value":"NJ","label":"New Jersey (US) — Avg Tax 2.23%"},{"value":"NM","label":"New Mexico (US) — Avg Tax 0.67%"},{"value":"NY","label":"New York (US) — Avg Tax 1.40%"},{"value":"NC","label":"North Carolina (US) — Avg Tax 0.70%"},{"value":"ND","label":"North Dakota (US) — Avg Tax 0.95%"},{"value":"OH","label":"Ohio (US) — Avg Tax 1.53%"},{"value":"OK","label":"Oklahoma (US) — Avg Tax 0.85%"},{"value":"OR","label":"Oregon (US) — Avg Tax 0.93%"},{"value":"PA","label":"Pennsylvania (US) — Avg Tax 1.49%"},{"value":"RI","label":"Rhode Island (US) — Avg Tax 1.40%"},{"value":"SC","label":"South Carolina (US) — Avg Tax 0.56%"},{"value":"SD","label":"South Dakota (US) — Avg Tax 1.14%"},{"value":"TN","label":"Tennessee (US) — Avg Tax 0.64%"},{"value":"TX","label":"Texas (US) — Avg Tax 1.68%"},{"value":"UT","label":"Utah (US) — Avg Tax 0.57%"},{"value":"VT","label":"Vermont (US) — Avg Tax 1.83%"},{"value":"VA","label":"Virginia (US) — Avg Tax 0.87%"},{"value":"WA","label":"Washington (US) — Avg Tax 0.88%"},{"value":"WV","label":"West Virginia (US) — Avg Tax 0.55%"},{"value":"WI","label":"Wisconsin (US) — Avg Tax 1.61%"},{"value":"WY","label":"Wyoming (US) — Avg Tax 0.56%"},{"value":"DC","label":"District of Columbia (US) — Avg Tax 0.62%"},{"value":"ON","label":"Ontario (CA) — Avg Tax 1.05%"},{"value":"BC","label":"British Columbia (CA) — Avg Tax 0.45%"},{"value":"AB","label":"Alberta (CA) — Avg Tax 0.85%"},{"value":"QC","label":"Quebec (CA) — Avg Tax 1.15%"},{"value":"MB","label":"Manitoba (CA) — Avg Tax 1.30%"},{"value":"SK","label":"Saskatchewan (CA) — Avg Tax 1.25%"},{"value":"NS","label":"Nova Scotia (CA) — Avg Tax 1.35%"},{"value":"NB","label":"New Brunswick (CA) — Avg Tax 1.50%"},{"value":"NL","label":"Newfoundland & Labrador (CA) — Avg Tax 1.10%"},{"value":"PE","label":"Prince Edward Island (CA) — Avg Tax 1.40%"},{"value":"YT","label":"Yukon (CA) — Avg Tax 0.90%"},{"value":"NT","label":"Northwest Territories (CA) — Avg Tax 0.95%"},{"value":"NU","label":"Nunavut (CA) — Avg Tax 0.90%"}],"hint":"Select your state or province to load official statistical property tax benchmarks."},{"id":"upfront_section","type":"section","label":"1. Upfront Liquidity Interface","icon":"fa-money-bill-wave"},{"id":"home_price","label":"Home Purchase Price ($)","type":"range","default":450000,"min":50000,"max":5000000,"step":5000,"hint":"The agreed total purchase price of the property."},{"id":"down_payment_pct","label":"Down Payment (%)","type":"range","default":20,"min":0,"max":100,"step":0.5,"hint":"Percentage paid upfront in cash. Minimum 3.5% (US FHA) / 5% (Canada CMHC); 20% eliminates mortgage default insurance."},{"id":"closing_costs_pct","label":"Closing Costs (%)","type":"range","default":3,"min":0,"max":10,"step":0.1,"hint":"Transactional fees charged by lenders, title/settlement companies, appraisals, and government recording (typically 2% to 5%)."},{"id":"prepaids_reserve_pct","label":"Escrow / Prepaids Reserve (%)","type":"range","default":1,"min":0,"max":5,"step":0.1,"hint":"Upfront liquid deposit required by lenders to fund initial property tax and hazard insurance escrow accounts."},{"id":"monthly_section","type":"section","label":"2. Loaded Monthly Budget Engine (PITIA Framework)","icon":"fa-calculator"},{"id":"interest_rate","label":"Mortgage Annual Interest Rate (%)","type":"range","default":6.8,"min":0.1,"max":20,"step":0.05,"hint":"Annual mortgage rate (APR). Canadian mortgages automatically calculate semi-annual compounding per the Bank Act."},{"id":"loan_term","label":"Loan Amortization Term","type":"select","default":30,"options":[{"value":15,"label":"15 Years (Faster Equity, Higher Payment)"},{"value":20,"label":"20 Years"},{"value":25,"label":"25 Years (Standard Canada Max for Insured)"},{"value":30,"label":"30 Years (Standard US Benchmark)"}],"hint":"Repayment period. Insured Canadian mortgages are generally capped at 25 years."},{"id":"property_tax_rate","label":"Property Tax Rate (% of Value/yr)","type":"range","default":1.2,"min":0,"max":5,"step":0.05,"hint":"Annual local property tax rate. Automatically adjusts based on selected jurisdiction or can be set manually."},{"id":"home_insurance","label":"Homeowners Insurance Annual Premium ($)","type":"number","default":1500,"min":0,"max":50000,"step":100,"hint":"Yearly hazard and structural homeowners insurance premium."},{"id":"hoa_fees","label":"Monthly HOA / Condo Dues ($)","type":"number","default":0,"min":0,"max":5000,"step":25,"hint":"Mandatory monthly dues for condominiums, townhomes, or master-planned communities."},{"id":"enable_maintenance","label":"Enable Maintenance Reserve Account","type":"select","default":"yes","options":[{"value":"yes","label":"Enabled (Recommended 1% Annual Rule)"},{"value":"no","label":"Disabled (0% Reserve)"}],"hint":"Automatically allocates 1% of total home price annually (divided by 12) for long-term structural repairs, roofing, and mechanical updates."},{"id":"maintenance_pct","label":"Maintenance Reserve (% of Home Value/yr)","type":"number","default":1,"min":0,"max":5,"step":0.1,"hint":"Recommended rule of thumb is 1% to 2% of home purchase price annually in liquid reserves."},{"id":"breakeven_section","type":"section","label":"3. 5-Year vs 10-Year Break-Even Matrix (Rent vs Buy)","icon":"fa-chart-line"},{"id":"current_rent","label":"Current / Alternative Monthly Rent ($)","type":"number","default":2200,"min":0,"max":30000,"step":50,"hint":"Monthly rent for an equivalent property in your market."},{"id":"rent_increase_pct","label":"Estimated Annual Rent Increase (%)","type":"range","default":3,"min":0,"max":15,"step":0.1,"hint":"Historical rent growth averages 2% to 4% annually."},{"id":"home_appreciation_pct","label":"Estimated Annual Property Appreciation (%)","type":"range","default":3.5,"min":-5,"max":15,"step":0.1,"hint":"Long-term historical national average home appreciation is approximately 3% to 4% annually."},{"id":"investment_return_pct","label":"S&P 500 / Alternative Investment Return (%)","type":"range","default":7.5,"min":0,"max":20,"step":0.1,"hint":"Expected long-term annual return if down payment & closing cash were invested in low-cost index funds."},{"id":"ownership_years","label":"Planned Ownership Horizon (Years)","type":"range","default":10,"min":1,"max":30,"step":1,"hint":"How long you realistically plan to stay before selling or refinancing."},{"id":"selling_cost_pct","label":"Selling Transaction Costs (%)","type":"number","default":6,"min":0,"max":15,"step":0.1,"hint":"Realtor commissions, transfer taxes, and closing legal fees paid upon selling (typically 5% to 6%)."}],"related":["mortgage-calculator","rent-vs-buy-calculator","house-affordability-calculator","15-year-mortgage-calculator","fha-loan-calculator","amortization-calculator","refinance-calculator","budget-planner"]}, { calculate: calculate(v) {
      const isCA = v.country === 'CA';
      const sym = isCA ? 'C$' : '$';
      const homePrice = safeNum(v.home_price, 450000);
      if (homePrice <= 0) return errorResult('Please enter a valid home purchase price greater than $0.');

      const downPct = safeNum(v.down_payment_pct, 20);
      const closingPct = safeNum(v.closing_costs_pct, 3.0);
      const prepaidsPct = safeNum(v.prepaids_reserve_pct, 1.0);

      const downPaymentDollar = roundTo(homePrice * (downPct / 100), 2);
      const closingCostsDollar = roundTo(homePrice * (closingPct / 100), 2);
      const prepaidsDollar = roundTo(homePrice * (prepaidsPct / 100), 2);
      const totalLiquidCashRequired = roundTo(downPaymentDollar + closingCostsDollar + prepaidsDollar, 2);

      const baseLoanAmount = Math.max(0, homePrice - downPaymentDollar);
      let mortgageInsuranceRate = 0;
      let isInsuredLoan = false;
      let cmhcPremiumDollar = 0;
      let monthlyPMIDollar = 0;

      if (isCA) {
        // Canadian CMHC Default Insurance Rules (Official Schedule)
        if (downPct < 20 && baseLoanAmount > 0) {
          isInsuredLoan = true;
          if (downPct >= 15) mortgageInsuranceRate = 0.028;
          else if (downPct >= 10) mortgageInsuranceRate = 0.031;
          else mortgageInsuranceRate = 0.040;
          cmhcPremiumDollar = roundTo(baseLoanAmount * mortgageInsuranceRate, 2);
        }
      } else {
        // US Conventional PMI / FHA benchmark
        if (downPct < 20 && baseLoanAmount > 0) {
          isInsuredLoan = true;
          // Typical US annual PMI: ~0.65% of loan amount
          monthlyPMIDollar = roundTo((baseLoanAmount * 0.0065) / 12, 2);
        }
      }

      // Total loan financed
      const financedLoanAmount = isCA && isInsuredLoan ? (baseLoanAmount + cmhcPremiumDollar) : baseLoanAmount;
      const annualInterestRate = safeNum(v.interest_rate, 6.8);
      const loanTermYears = Math.min(30, Math.max(5, Math.round(safeNum(v.loan_term, 30))));
      const totalMonths = loanTermYears * 12;

      // Compounding calculations: Canada is semi-annual per Bank Act; US is monthly
      let monthlyRate = 0;
      if (annualInterestRate > 0) {
        if (isCA) {
          monthlyRate = Math.pow(1 + (annualInterestRate / 200), 1 / 6) - 1;
        } else {
          monthlyRate = (annualInterestRate / 100) / 12;
        }
      }

      let monthlyPI = 0;
      if (financedLoanAmount > 0 && totalMonths > 0) {
        if (monthlyRate === 0) {
          monthlyPI = financedLoanAmount / totalMonths;
        } else {
          monthlyPI = financedLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        }
      }
      monthlyPI = roundTo(monthlyPI, 2);

      // Property tax calculation
      const propTaxRate = safeNum(v.property_tax_rate, 1.2);
      const annualPropertyTax = roundTo(homePrice * (propTaxRate / 100), 2);
      const monthlyPropertyTax = roundTo(annualPropertyTax / 12, 2);

      // Insurance & HOA
      const annualInsurance = safeNum(v.home_insurance, 1500);
      const monthlyInsurance = roundTo(annualInsurance / 12, 2);
      const monthlyHOA = safeNum(v.hoa_fees, 0);

      // Maintenance Reserve calculation
      const enableMaintenance = v.enable_maintenance !== 'no';
      const maintPct = enableMaintenance ? safeNum(v.maintenance_pct, 1.0) : 0;
      const annualMaintenance = roundTo(homePrice * (maintPct / 100), 2);
      const monthlyMaintenance = roundTo(annualMaintenance / 12, 2);

      // Loaded PITIA + M Monthly Cost
      const trueMonthlyCost = roundTo(monthlyPI + monthlyPropertyTax + monthlyInsurance + monthlyHOA + monthlyMaintenance + monthlyPMIDollar, 2);

      // Rent vs Buy Parameters
      const currentRent = safeNum(v.current_rent, 2200);
      const rentIncreaseRate = safeNum(v.rent_increase_pct, 3.0) / 100;
      const appreciationRate = safeNum(v.home_appreciation_pct, 3.5) / 100;
      const investmentReturnRate = safeNum(v.investment_return_pct, 7.5) / 100;
      const horizonYears = Math.min(30, Math.max(1, Math.round(safeNum(v.ownership_years, 10))));
      const sellingCostRate = safeNum(v.selling_cost_pct, 6.0) / 100;

      // Multi-Year Simulation Matrix (Year 1 to 30)
      let balance = financedLoanAmount;
      let cumPrincipal = 0;
      let cumInterest = 0;
      let cumOwnershipCashPaid = totalLiquidCashRequired;
      let cumRentPaid = 0;
      let rentMonthly = currentRent;
      let investmentPortfolio = totalLiquidCashRequired; // Renter invests down payment + closing costs
      let breakEvenYear = null;

      const schedule = [];
      const maxSimYears = Math.max(10, horizonYears);

      for (let yr = 1; yr <= maxSimYears; yr++) {
        let yrInterest = 0;
        let yrPrincipal = 0;

        for (let m = 0; m < 12 && balance > 0; m++) {
          const interestPortion = balance * monthlyRate;
          let principalPortion = monthlyPI - interestPortion;
          if (principalPortion > balance) principalPortion = balance;
          yrInterest += interestPortion;
          yrPrincipal += principalPortion;
          balance -= principalPortion;
        }
        balance = Math.max(0, balance);
        cumInterest += yrInterest;
        cumPrincipal += yrPrincipal;

        const yrTaxes = annualPropertyTax * Math.pow(1.02, yr - 1);
        const yrIns = annualInsurance * Math.pow(1.03, yr - 1);
        const yrHOA = monthlyHOA * 12;
        const yrMaint = annualMaintenance * Math.pow(1.02, yr - 1);
        const yrPMI = (yr <= 8 && monthlyPMIDollar > 0) ? (monthlyPMIDollar * 12) : 0;
        const yrOwnOutflow = (yrPrincipal + yrInterest) + yrTaxes + yrIns + yrHOA + yrMaint + yrPMI;
        cumOwnershipCashPaid += yrOwnOutflow;

        // Property appreciation
        const homeMarketValue = homePrice * Math.pow(1 + appreciationRate, yr);
        const accumulatedEquity = Math.max(0, homeMarketValue - balance);
        const sellingCosts = homeMarketValue * sellingCostRate;
        const netProceedsAfterSale = accumulatedEquity - sellingCosts;

        // Renting side
        const yrRent = rentMonthly * 12;
        cumRentPaid += yrRent;
        rentMonthly *= (1 + rentIncreaseRate);

        // Alternative S&P 500 investment portfolio
        // Compounded upfront capital + monthly cash flow differential
        investmentPortfolio = (investmentPortfolio * (1 + investmentReturnRate));
        const ownMonthlyAvg = yrOwnOutflow / 12;
        const rentMonthlyAvg = yrRent / 12;
        const monthlyDiff = ownMonthlyAvg - rentMonthlyAvg;
        if (monthlyDiff > 0) {
          // Owning is more expensive monthly -> Renter invests monthly savings
          investmentPortfolio += (monthlyDiff * 12 * (1 + (investmentReturnRate / 2)));
        }

        // Net Wealth Analysis
        const buyerNetWealth = netProceedsAfterSale;
        const renterNetWealth = investmentPortfolio;
        const netWealthAdvantage = roundTo(buyerNetWealth - renterNetWealth, 2);

        if (breakEvenYear === null && netWealthAdvantage > 0) {
          breakEvenYear = yr;
        }

        schedule.push({
          year: yr,
          yearLabel: `Year ${yr}`,
          homeValue: roundTo(homeMarketValue, 2),
          loanBalance: roundTo(balance, 2),
          equity: roundTo(accumulatedEquity, 2),
          netProceeds: roundTo(netProceedsAfterSale, 2),
          cumOwnershipCost: roundTo(cumOwnershipCashPaid, 2),
          cumRentPaid: roundTo(cumRentPaid, 2),
          indexFundValue: roundTo(investmentPortfolio, 2),
          netAdvantage: netWealthAdvantage
        });
      }

      const y5 = schedule[4] || schedule[schedule.length - 1];
      const y10 = schedule[9] || schedule[schedule.length - 1];
      const yHorizon = schedule[horizonYears - 1] || schedule[schedule.length - 1];

      // Format matrix table for 5-Yr vs 10-Yr vs Horizon
      const matrixRows = [
        {
          metric: 'Home Market Value',
          y5: sym + y5.homeValue.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          y10: sym + y10.homeValue.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          yHorizon: sym + yHorizon.homeValue.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          note: `Compounding at ${v.home_appreciation_pct || 3.5}%/yr`
        },
        {
          metric: 'Remaining Mortgage Balance',
          y5: sym + y5.loanBalance.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          y10: sym + y10.loanBalance.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          yHorizon: sym + yHorizon.loanBalance.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          note: 'Principal amortized through monthly payments'
        },
        {
          metric: 'Accumulated Home Equity',
          y5: sym + y5.equity.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          y10: sym + y10.equity.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          yHorizon: sym + yHorizon.equity.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          note: 'Market Value minus Mortgage Balance'
        },
        {
          metric: 'Net Sale Proceeds (After Fees)',
          y5: sym + y5.netProceeds.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          y10: sym + y10.netProceeds.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          yHorizon: sym + yHorizon.netProceeds.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          note: `Equity minus ${v.selling_cost_pct || 6.0}% broker & closing costs`
        },
        {
          metric: 'Alternative S&P 500 Index Fund',
          y5: sym + y5.indexFundValue.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          y10: sym + y10.indexFundValue.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          yHorizon: sym + yHorizon.indexFundValue.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          note: `Down payment & cash savings invested at ${v.investment_return_pct || 7.5}%/yr`
        },
        {
          metric: 'Net Financial Difference (Buy vs Rent)',
          y5: (y5.netAdvantage >= 0 ? '+' : '-') + sym + Math.abs(y5.netAdvantage).toLocaleString('en-US', { maximumFractionDigits: 0 }),
          y10: (y10.netAdvantage >= 0 ? '+' : '-') + sym + Math.abs(y10.netAdvantage).toLocaleString('en-US', { maximumFractionDigits: 0 }),
          yHorizon: (yHorizon.netAdvantage >= 0 ? '+' : '-') + sym + Math.abs(yHorizon.netAdvantage).toLocaleString('en-US', { maximumFractionDigits: 0 }),
          note: 'Net Home Proceeds minus Alternative Index Fund Portfolio'
        }
      ];

      const matrixTable = makeTableSpec({
        mode: 'comparison',
        title: '5-Year vs 10-Year vs Horizon Break-Even Decision Matrix',
        columns: [
          { key: 'metric', label: 'Financial Metric', emphasis: true },
          { key: 'y5', label: '5-Year Horizon', emphasis: true },
          { key: 'y10', label: '10-Year Horizon', emphasis: true },
          { key: 'yHorizon', label: `Year ${horizonYears} (Your Plan)`, emphasis: true },
          { key: 'note', label: 'Underlying Financial Driver' }
        ],
        rows: matrixRows
      });

      // Chart 1: True Monthly Cost Breakdown (Doughnut)
      const chartLabels = ['Principal & Interest', 'Property Taxes', 'Homeowners Insurance', 'Maintenance Reserve'];
      const chartData = [monthlyPI, monthlyPropertyTax, monthlyInsurance, monthlyMaintenance];
      const chartColors = ['#6366F1', '#F59E0B', '#3B82F6', '#10B981'];

      if (monthlyHOA > 0) {
        chartLabels.push('HOA / Condo Dues');
        chartData.push(monthlyHOA);
        chartColors.push('#8B5CF6');
      }
      if (monthlyPMIDollar > 0) {
        chartLabels.push('Mortgage Insurance (PMI)');
        chartData.push(monthlyPMIDollar);
        chartColors.push('#EF4444');
      }

      const chart = {
        type: 'doughnut',
        labels: chartLabels,
        datasets: [{
          label: 'Monthly Allocation',
          data: chartData,
          backgroundColor: chartColors
        }],
        title: 'Loaded Monthly Ownership Cost Breakdown (PITIA Framework)'
      };

      // Chart 2: 5-Yr & 10-Yr Wealth Comparison: Home Equity vs S&P 500 Index Fund (Line)
      const simLabels = schedule.slice(0, 15).map(s => `Year ${s.year}`);
      const equityLine = schedule.slice(0, 15).map(s => s.equity);
      const indexLine = schedule.slice(0, 15).map(s => s.indexFundValue);
      const chart2 = {
        type: 'line',
        labels: simLabels,
        datasets: [
          { label: 'Real Estate Net Equity', data: equityLine, color: '#10B981', borderColor: '#10B981' },
          { label: 'S&P 500 Alternative Portfolio', data: indexLine, color: '#6366F1', borderColor: '#6366F1' }
        ],
        yLabel: 'Wealth ($)',
        title: 'Wealth Horizon: Home Equity Growth vs. Index Fund Portfolio'
      };

      // Chart 3: Amortization & Home Value (Area/Line)
      const homeValLine = schedule.slice(0, 15).map(s => s.homeValue);
      const loanBalLine = schedule.slice(0, 15).map(s => s.loanBalance);
      const chart3 = {
        type: 'line',
        labels: simLabels,
        datasets: [
          { label: 'Estimated Home Value', data: homeValLine, color: '#10B981', borderColor: '#10B981' },
          { label: 'Remaining Mortgage Balance', data: loanBalLine, color: '#EF4444', borderColor: '#EF4444' }
        ],
        yLabel: 'Value ($)',
        title: 'Mortgage Amortization & Equity Buildup Over Time'
      };

      // Summary KPIs
      const summary = {
        kpis: [
          { label: 'Liquid Cash to Close', value: sym + totalLiquidCashRequired.toLocaleString('en-US', { maximumFractionDigits: 0 }), highlight: true, color: '#6366F1' },
          { label: 'True Monthly Cost', value: sym + trueMonthlyCost.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '/mo', highlight: true, color: '#10B981' },
          { label: 'Pure Mortgage P&I', value: sym + monthlyPI.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '/mo' },
          { label: '5-Yr Net Equity', value: sym + y5.equity.toLocaleString('en-US', { maximumFractionDigits: 0 }) },
          { label: '10-Yr Net Equity', value: sym + y10.equity.toLocaleString('en-US', { maximumFractionDigits: 0 }) },
          { label: 'Break-Even Horizon', value: breakEvenYear ? `Year ${breakEvenYear}` : '> 10 Years', highlight: true }
        ]
      };

      const stats = [
        { label: 'Total Liquid Cash Required to Close', value: sym + totalLiquidCashRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), highlight: true },
        { label: 'Down Payment Required', value: sym + downPaymentDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: 'Estimated Closing Costs', value: sym + closingCostsDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: 'Escrow & Prepaids Reserve', value: sym + prepaidsDollar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: 'True Monthly Cost of Ownership', value: sym + trueMonthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), highlight: true },
        { label: 'Mortgage Principal & Interest (P&I)', value: sym + monthlyPI.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: 'Property Taxes (Monthly)', value: sym + monthlyPropertyTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: 'Home Insurance (Monthly)', value: sym + monthlyInsurance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: 'Monthly Maintenance Reserve', value: sym + monthlyMaintenance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: '5-Year Equity vs Index Fund', value: sym + y5.equity.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' vs ' + sym + y5.indexFundValue.toLocaleString('en-US', { maximumFractionDigits: 0 }) },
        { label: '10-Year Equity vs Index Fund', value: sym + y10.equity.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' vs ' + sym + y10.indexFundValue.toLocaleString('en-US', { maximumFractionDigits: 0 }), highlight: true }
      ];

      return {
        summary,
        stats,
        table: matrixTable,
        chart,
        chart2,
        chart3,
        insight: {
          tone: (breakEvenYear && breakEvenYear <= 6) ? 'positive' : 'neutral',
          icon: 'fa-house-circle-check',
          headline: `Total cash required to close is ${sym}${totalLiquidCashRequired.toLocaleString('en-US')}, with a loaded monthly cost of ${sym}${trueMonthlyCost.toLocaleString('en-US')}/mo.`,
          detail: `Your monthly mortgage P&I of ${sym}${monthlyPI.toLocaleString('en-US')} makes up only ${roundTo((monthlyPI / trueMonthlyCost) * 100, 1)}% of your true housing outlay. Taxes, insurance, and maintenance add ${sym}${(trueMonthlyCost - monthlyPI).toLocaleString('en-US')}/mo. ${breakEvenYear ? `Based on your assumptions, buying achieves a structural net wealth advantage over renting in Year ${breakEvenYear}.` : 'At current rent and return assumptions, renting remains competitive over the initial horizon.'}`
        }
      };
    } });
TOOLS['freelance-true-rate-system'] = Object.assign({"name":"Freelance True Rate System","category":"Business","icon":"fa-briefcase","iconClass":"icon-business","tagClass":"tag-business","formula":"Gross Revenue Target = [(Desired Net Income / (1 - Effective Income Tax - SECA Tax)) + Annual Overhead] / (1 - Platform Fee Rate) | True Hourly Rate = Gross Revenue Target / (Weeks Worked × Hours/Week × Billable Utilization Rate)","presets":[{"label":"Solo Consultant (Direct Clients)","values":{"desired_net_income":90000,"weeks_worked":48,"hours_per_week":40,"utilization_rate_pct":70,"self_employment_tax_pct":15.3,"income_tax_pct":22,"monthly_expenses":450,"platform_fee_model":"processor","custom_platform_fee_pct":3}},{"label":"Marketplace Freelancer (Upwork 10%)","values":{"desired_net_income":75000,"weeks_worked":48,"hours_per_week":40,"utilization_rate_pct":65,"self_employment_tax_pct":15.3,"income_tax_pct":20,"monthly_expenses":350,"platform_fee_model":"upwork","custom_platform_fee_pct":10}},{"label":"Creative Pro (Fiverr 20%)","values":{"desired_net_income":60000,"weeks_worked":46,"hours_per_week":35,"utilization_rate_pct":75,"self_employment_tax_pct":15.3,"income_tax_pct":18,"monthly_expenses":300,"platform_fee_model":"fiverr","custom_platform_fee_pct":20}},{"label":"High-Overhead Agency Solo","values":{"desired_net_income":120000,"weeks_worked":48,"hours_per_week":45,"utilization_rate_pct":60,"self_employment_tax_pct":15.3,"income_tax_pct":25,"monthly_expenses":1200,"platform_fee_model":"processor","custom_platform_fee_pct":3}}],"fields":[{"id":"income_section","type":"section","label":"1. Reverse Income Engine","icon":"fa-money-bill-trend-up"},{"id":"desired_net_income","label":"Desired Annual Net Take-Home Income ($)","type":"range","default":85000,"min":10000,"max":500000,"step":1000,"hint":"The target net cash you want in your personal pocket after all taxes, fees, and business operating overhead."},{"id":"utilization_section","type":"section","label":"2. Billable Hour Utilization Tracker","icon":"fa-business-time"},{"id":"weeks_worked","label":"Desired Weeks Worked Per Year","type":"range","default":48,"min":20,"max":52,"step":1,"hint":"Standard is 48 weeks (allowing 4 weeks of unpaid vacation, sick leave, and holidays)."},{"id":"hours_per_week","label":"Target Workweek Hours","type":"range","default":40,"min":10,"max":80,"step":1,"hint":"Total working hours committed per week across all billable and non-billable duties."},{"id":"utilization_rate_pct","label":"Billable Utilization Rate (%)","type":"range","default":70,"min":20,"max":100,"step":1,"hint":"Percentage of working hours spent on paying client deliverables vs non-billable business management (typical: 60%–75%)."},{"id":"tax_overhead_section","type":"section","label":"3. Tax & Operational Expense Deductions","icon":"fa-receipt"},{"id":"self_employment_tax_pct","label":"Self-Employment Tax Reserve (%)","type":"range","default":15.3,"min":0,"max":30,"step":0.1,"hint":"Covers federal FICA self-employment taxes (15.3% in US for Social Security + Medicare, or CPP in Canada)."},{"id":"income_tax_pct","label":"Estimated Federal / State Income Tax (%)","type":"range","default":22,"min":0,"max":50,"step":0.5,"hint":"Estimated effective income tax bracket (federal + state/provincial)."},{"id":"monthly_expenses","label":"Monthly Business Overhead ($)","type":"number","default":400,"min":0,"max":20000,"step":25,"hint":"Software subscriptions, equipment replacement reserves, private health insurance, phone, internet, accounting, and legal."},{"id":"fee_friction_section","type":"section","label":"4. Platform Fee Friction Filter","icon":"fa-filter-circle-dollar"},{"id":"platform_fee_model","label":"Platform Fee Model","type":"select","default":"none","options":[{"value":"none","label":"None / Direct Wire & Invoicing (0%)"},{"value":"processor","label":"Payment Processing Gateway — Stripe / PayPal (3%)"},{"value":"upwork","label":"Upwork Marketplace (10%)"},{"value":"fiverr","label":"Fiverr Marketplace (20%)"},{"value":"custom","label":"Custom Platform Fee %"}],"hint":"Select the fee structure subtracted by your client acquisition platform or billing gateway."},{"id":"custom_platform_fee_pct","label":"Custom Platform Fee (%)","type":"number","default":5,"min":0,"max":50,"step":0.1,"hint":"Custom marketplace commission or client management fee percentage."}],"related":["freelance-hourly-rate-calculator","self-employment-tax-calculator","salary-calculator","break-even-calculator","profit-margin-calculator","budget-planner"]}, { calculate: calculate(v) {
      const desiredNetIncome = safeNum(v.desired_net_income, 85000);
      if (desiredNetIncome <= 0) return errorResult('Please enter a desired annual net income greater than $0.');

      const weeksWorked = Math.max(1, Math.min(52, safeNum(v.weeks_worked, 48)));
      const hoursPerWeek = Math.max(1, Math.min(100, safeNum(v.hours_per_week, 40)));
      const utilizationRatePct = Math.max(10, Math.min(100, safeNum(v.utilization_rate_pct, 70)));

      const totalAnnualHours = roundTo(weeksWorked * hoursPerWeek, 0);
      const billableHours = roundTo(totalAnnualHours * (utilizationRatePct / 100), 1);
      const nonBillableHours = Math.max(0, roundTo(totalAnnualHours - billableHours, 1));

      // Tax Reserve computation
      const seTaxPct = safeNum(v.self_employment_tax_pct, 15.3);
      const incTaxPct = safeNum(v.income_tax_pct, 22.0);
      const totalTaxReserveRate = Math.min(0.80, (seTaxPct + incTaxPct) / 100);

      // Desired Net = PreTaxProfit * (1 - totalTaxReserveRate)
      const preTaxProfitNeeded = desiredNetIncome / (1 - totalTaxReserveRate);
      const annualTaxReserveFund = roundTo(preTaxProfitNeeded - desiredNetIncome, 2);

      // Business Overhead computation
      const monthlyExpenses = safeNum(v.monthly_expenses, 400);
      const annualExpenses = roundTo(monthlyExpenses * 12, 2);

      // Net business revenue required after platform friction
      const netBusinessRevenue = preTaxProfitNeeded + annualExpenses;

      // Platform fee friction
      let platformFeePct = 0;
      if (v.platform_fee_model === 'processor') platformFeePct = 3.0;
      else if (v.platform_fee_model === 'upwork') platformFeePct = 10.0;
      else if (v.platform_fee_model === 'fiverr') platformFeePct = 20.0;
      else if (v.platform_fee_model === 'custom') platformFeePct = safeNum(v.custom_platform_fee_pct, 5.0);

      const platformFeeRate = Math.min(0.50, platformFeePct / 100);
      const grossAnnualBillingTarget = roundTo(netBusinessRevenue / (1 - platformFeeRate), 2);
      const annualPlatformFees = roundTo(grossAnnualBillingTarget - netBusinessRevenue, 2);

      // Rate targets
      const requiredHourlyRate = billableHours > 0 ? roundTo(grossAnnualBillingTarget / billableHours, 2) : 0;
      const grossDayRate = roundTo(requiredHourlyRate * 8, 2);
      const grossWeeklyBillingTarget = roundTo(grossAnnualBillingTarget / weeksWorked, 2);
      const grossMonthlyBillingTarget = roundTo(grossAnnualBillingTarget / 12, 2);

      // Rate Breakdown & Real Take-Home Degradation
      const afterFeeHourlyRate = roundTo(requiredHourlyRate * (1 - platformFeeRate), 2);
      const afterExpenseHourlyRate = roundTo((netBusinessRevenue - annualExpenses) / billableHours, 2);
      const afterTaxBillableRate = roundTo(desiredNetIncome / billableHours, 2);
      const trueEffectiveTakeHomeAllHours = totalAnnualHours > 0 ? roundTo(desiredNetIncome / totalAnnualHours, 2) : 0;

      // Chart 1: Revenue Waterfall (Bar/Stacked Bar)
      const chart = {
        type: 'bar',
        labels: ['Gross Invoiced', 'Platform Fees', 'Business Expenses', 'Tax Reserve', 'Net Take-Home'],
        datasets: [{
          label: 'Annual Allocation ($)',
          data: [
            grossAnnualBillingTarget,
            -annualPlatformFees,
            -annualExpenses,
            -annualTaxReserveFund,
            desiredNetIncome
          ],
          backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#10B981']
        }],
        yLabel: 'Amount ($)',
        title: 'Annual Revenue Waterfall (Gross Invoicing to Pocketed Take-Home)'
      };

      // Chart 2: Working Time Allocation (Doughnut)
      const chart2 = {
        type: 'doughnut',
        labels: ['Billable Client Deliverables', 'Unpaid Admin & Bookkeeping', 'Sales, Pitching & Marketing', 'Unpaid Time Off (Vacation/Sick)'],
        datasets: [{
          label: 'Annual Hours',
          data: [
            billableHours,
            roundTo(nonBillableHours * 0.55, 0),
            roundTo(nonBillableHours * 0.45, 0),
            roundTo((52 - weeksWorked) * hoursPerWeek, 0)
          ],
          backgroundColor: ['#10B981', '#6366F1', '#F59E0B', '#94A3B8']
        }],
        title: 'Annual Working Time Allocation (Billable vs Non-Billable Overhead)'
      };

      // Chart 3: Hourly Rate Degradation (Bar)
      const chart3 = {
        type: 'bar',
        labels: ['Quoted Client Rate', 'After Platform Fees', 'After Operating Expenses', 'Take-Home (Billable Hr)', 'True Take-Home (All Worked Hrs)'],
        datasets: [{
          label: 'Rate ($/hr)',
          data: [
            requiredHourlyRate,
            afterFeeHourlyRate,
            afterExpenseHourlyRate,
            afterTaxBillableRate,
            trueEffectiveTakeHomeAllHours
          ],
          backgroundColor: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#14B8A6']
        }],
        yLabel: 'Rate ($/hr)',
        title: 'The Freelancer Rate Decay: What You Quote vs. What You Actually Pocket'
      };

      // Table 1: Complete Financial Waterfall Table
      const waterfallRows = [
        { item: 'Gross Annual Invoiced Billing Target', amount: '$' + grossAnnualBillingTarget.toLocaleString('en-US', { minimumFractionDigits: 2 }), pctGross: '100.0%', description: 'Top-line client invoicing needed' },
        { item: 'Platform & Gateway Processing Fees', amount: '-$' + annualPlatformFees.toLocaleString('en-US', { minimumFractionDigits: 2 }), pctGross: '-' + roundTo((annualPlatformFees / grossAnnualBillingTarget) * 100, 1) + '%', description: `${platformFeePct}% marketplace or payment gateway fee` },
        { item: 'Operating Business Overhead', amount: '-$' + annualExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 }), pctGross: '-' + roundTo((annualExpenses / grossAnnualBillingTarget) * 100, 1) + '%', description: 'Software, hardware, insurance, phone, internet' },
        { item: 'Estimated Tax Reserve Fund', amount: '-$' + annualTaxReserveFund.toLocaleString('en-US', { minimumFractionDigits: 2 }), pctGross: '-' + roundTo((annualTaxReserveFund / grossAnnualBillingTarget) * 100, 1) + '%', description: `${roundTo(totalTaxReserveRate * 100, 1)}% Self-Employment & Income tax` },
        { item: 'Net Take-Home Income (In Pocket)', amount: '$' + desiredNetIncome.toLocaleString('en-US', { minimumFractionDigits: 2 }), pctGross: roundTo((desiredNetIncome / grossAnnualBillingTarget) * 100, 1) + '%', description: 'Your net annual living cash' }
      ];

      const waterfallTable = makeTableSpec({
        mode: 'financial',
        title: 'Annual Financial Waterfall & Margin Deduction Breakdown',
        columns: [
          { key: 'item', label: 'Financial Category', emphasis: true },
          { key: 'amount', label: 'Annual Cash Flow', emphasis: true },
          { key: 'pctGross', label: '% of Gross Billing' },
          { key: 'description', label: 'Operational Context' }
        ],
        rows: waterfallRows
      });

      const summary = {
        kpis: [
          { label: 'Required Client Hourly Rate', value: '$' + requiredHourlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 }) + '/hr', highlight: true, color: '#6366F1' },
          { label: 'Gross Day Rate (8h)', value: '$' + grossDayRate.toLocaleString('en-US', { minimumFractionDigits: 0 }) + '/day', highlight: true, color: '#10B981' },
          { label: 'True Take-Home (All Hrs)', value: '$' + trueEffectiveTakeHomeAllHours.toLocaleString('en-US', { minimumFractionDigits: 2 }) + '/hr', highlight: true },
          { label: 'Annual Gross Billing', value: '$' + grossAnnualBillingTarget.toLocaleString('en-US', { maximumFractionDigits: 0 }) },
          { label: 'Annual Billable Hours', value: billableHours.toLocaleString('en-US') + ' hrs' },
          { label: 'Total Friction Deductions', value: '$' + roundTo(annualPlatformFees + annualExpenses + annualTaxReserveFund, 0).toLocaleString('en-US') }
        ]
      };

      const stats = [
        { label: 'Required Client Hourly Rate', value: '$' + requiredHourlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 }), highlight: true },
        { label: 'Gross Day Rate (8h Billable)', value: '$' + grossDayRate.toLocaleString('en-US', { minimumFractionDigits: 2 }) },
        { label: 'Weekly Gross Billing Target', value: '$' + grossWeeklyBillingTarget.toLocaleString('en-US', { minimumFractionDigits: 2 }) },
        { label: 'Monthly Gross Billing Target', value: '$' + grossMonthlyBillingTarget.toLocaleString('en-US', { minimumFractionDigits: 2 }) },
        { label: 'Annual Gross Billing Target', value: '$' + grossAnnualBillingTarget.toLocaleString('en-US', { minimumFractionDigits: 2 }), highlight: true },
        { label: 'True Effective Hourly Take-Home (Total Hrs)', value: '$' + trueEffectiveTakeHomeAllHours.toLocaleString('en-US', { minimumFractionDigits: 2 }) + '/hr', highlight: true },
        { label: 'Annual Billable Hours', value: billableHours.toLocaleString('en-US') + ' hrs' },
        { label: 'Annual Non-Billable Overhead Hours', value: nonBillableHours.toLocaleString('en-US') + ' hrs' },
        { label: 'Annual Estimated Tax Reserve', value: '$' + annualTaxReserveFund.toLocaleString('en-US', { minimumFractionDigits: 2 }), warn: true },
        { label: 'Annual Business Expenses', value: '$' + annualExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 }) },
        { label: 'Annual Platform & Gateway Fees', value: '$' + annualPlatformFees.toLocaleString('en-US', { minimumFractionDigits: 2 }) }
      ];

      return {
        summary,
        stats,
        table: waterfallTable,
        chart,
        chart2,
        chart3,
        insight: {
          tone: 'positive',
          icon: 'fa-briefcase',
          headline: `To take home $${desiredNetIncome.toLocaleString('en-US')} net, you must charge clients $${requiredHourlyRate.toFixed(2)}/hr (or $${grossDayRate.toLocaleString('en-US')}/day).`,
          detail: `Out of your 40-hour workweek, only ${utilizationRatePct}% (${roundTo(hoursPerWeek * (utilizationRatePct / 100), 1)} hours) generates billable revenue. Across taxes, operating overhead, and platform fees, ${roundTo(((grossAnnualBillingTarget - desiredNetIncome) / grossAnnualBillingTarget) * 100, 1)}% of your gross billing is absorbed by structural business costs.`
        }
      };
    } });
TOOLS['beam-deflection-calculator'] = Object.assign({"name":"Beam Deflection Calculator","category":"Engineering","icon":"fa-ruler-combined","iconClass":"icon-engineering","tagClass":"tag-engineering","formula":"δ = (P × L³) / (48 × E × I) [simply] | δ = (P × L³) / (3 × E × I) [cantilever]","presets":[],"fields":[{"id":"beamType","label":"Beam Type","type":"select","default":"simply","options":[{"value":"simply","label":"Simply Supported (center load)"},{"value":"cantilever","label":"Cantilever (end load)"}],"hint":"Select the beam support condition."},{"id":"length","label":"Beam Length (ft)","type":"number","default":10,"min":1,"step":0.5,"hint":"Span length in feet."},{"id":"load","label":"Load (lbs)","type":"number","default":1000,"min":0,"step":100,"hint":"Total load in pounds."},{"id":"moi","label":"Moment of Inertia (in⁴)","type":"number","default":100,"min":0.1,"step":1,"hint":"Section property from beam tables."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['ohms-law-calculator'] = Object.assign({"name":"Ohm's Law Calculator","category":"Engineering","icon":"fa-bolt","iconClass":"icon-engineering","tagClass":"tag-engineering","formula":"V = I × R | P = V × I","presets":[],"fields":[{"id":"voltage","label":"Voltage (V - Volts)","type":"number","default":12,"min":0,"step":0.1,"hint":"Leave at 0 if calculating voltage from I and R."},{"id":"current","label":"Current (I - Amperes)","type":"number","default":2,"min":0,"step":0.01,"hint":"Leave at 0 if calculating current from V and R."},{"id":"resistance","label":"Resistance (R - Ohms Ω)","type":"number","default":6,"min":0,"step":0.1,"hint":"Leave at 0 if calculating resistance from V and I."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['pressure-calculator'] = Object.assign({"name":"Pressure Calculator","category":"Engineering","icon":"fa-gauge-high","iconClass":"icon-engineering","tagClass":"tag-engineering","formula":"P = F ÷ A","presets":[],"fields":[{"id":"force","label":"Force (Pounds-force lbf / Newtons N)","type":"number","default":100,"min":0,"step":1,"hint":"Applied force."},{"id":"area","label":"Surface Area (Square inches in² / m²)","type":"number","default":10,"min":0.01,"step":0.1,"hint":"Surface area over which force is distributed."},{"id":"unit_system","label":"Unit System","type":"select","default":"imperial","options":[{"value":"imperial","label":"Imperial (Force in lbf, Area in in² → Output in PSI)"},{"value":"metric","label":"Metric (Force in N, Area in m² → Output in Pa/kPa)"}],"hint":"Choose units for force and area."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['concrete-calculator'] = Object.assign({"name":"Concrete Calculator","category":"Construction","icon":"fa-truck-ramp-box","iconClass":"icon-construction","tagClass":"tag-construction","formula":"yd³ = (ft × ft × (in / 12)) / 27","presets":[],"fields":[{"id":"shape","label":"Shape","type":"select","default":"slab","options":[{"value":"slab","label":"Slab / Pad (rectangular)"},{"value":"footing","label":"Footing / Wall (rectangular)"},{"value":"column","label":"Column / Cylinder (round)"}],"hint":"Select the concrete pour shape."},{"id":"length","label":"Length (ft)","type":"number","default":10,"min":0,"step":0.5,"hint":"Length in feet."},{"id":"width","label":"Width (ft)","type":"number","default":10,"min":0,"step":0.5,"hint":"Width in feet."},{"id":"diameter","label":"Diameter (ft)","type":"number","default":1,"min":0,"step":0.25,"hint":"Diameter for round columns."},{"id":"depth","label":"Depth / Thickness (in)","type":"number","default":4,"min":0.5,"step":0.5,"hint":"Thickness in inches (4in is standard for residential slabs)."},{"id":"quantity","label":"Quantity","type":"number","default":1,"min":1,"step":1,"hint":"Number of identical pours."},{"id":"waste","label":"Waste Margin (%)","type":"number","default":10,"min":0,"max":25,"step":1,"hint":"Recommended: 10% for uneven subgrade and spillage."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['paint-calculator'] = Object.assign({"name":"Paint Calculator","category":"Construction","icon":"fa-paint-roller","iconClass":"icon-construction","tagClass":"tag-construction","formula":"Gallons = Net Area × Coats / 350","presets":[],"fields":[{"id":"room_length","label":"Room Length (ft)","type":"number","default":12,"min":1,"step":0.5,"hint":"Length of the room in feet."},{"id":"room_width","label":"Room Width (ft)","type":"number","default":12,"min":1,"step":0.5,"hint":"Width of the room in feet."},{"id":"ceiling_height","label":"Ceiling Height (ft)","type":"number","default":8,"min":1,"step":0.5,"hint":"Standard ceiling height is 8 to 9 feet."},{"id":"doors","label":"Number of Doors","type":"number","default":1,"min":0,"step":1,"hint":"Subtracted as ~21 sq ft each."},{"id":"windows","label":"Number of Windows","type":"number","default":2,"min":0,"step":1,"hint":"Subtracted as ~15 sq ft each."},{"id":"coats","label":"Number of Coats","type":"number","default":2,"min":1,"max":4,"step":1,"hint":"Most interior projects require 2 coats."},{"id":"paint_ceiling","label":"Include Ceiling?","type":"select","default":"no","options":[{"value":"no","label":"No — Walls Only"},{"value":"yes","label":"Yes — Include Ceiling Area"}],"hint":"Include ceiling square footage."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['tile-calculator'] = Object.assign({"name":"Tile Calculator","category":"Construction","icon":"fa-table-cells-large","iconClass":"icon-construction","tagClass":"tag-construction","formula":"Boxes = Math.ceil(Total Tiles / Tiles Per Box)","presets":[],"fields":[{"id":"area_length","label":"Area Length (ft)","type":"number","default":10,"min":0.5,"step":0.5,"hint":"Length of the floor or wall area in feet."},{"id":"area_width","label":"Area Width (ft)","type":"number","default":10,"min":0.5,"step":0.5,"hint":"Width of the floor or wall area in feet."},{"id":"tile_size","label":"Tile Size (inches)","type":"select","default":"12x12","options":[{"value":"4x4","label":"4\" × 4\" (Backsplash/Mosaic)"},{"value":"6x6","label":"6\" × 6\" (Wall/Floor)"},{"value":"12x12","label":"12\" × 12\" (Standard Floor 1 sq ft)"},{"value":"12x24","label":"12\" × 24\" (Modern Rectangular 2 sq ft)"},{"value":"24x24","label":"24\" × 24\" (Large Format 4 sq ft)"}],"hint":"Standard nominal tile dimensions."},{"id":"tiles_per_box","label":"Tiles Per Box","type":"number","default":10,"min":1,"step":1,"hint":"Check the manufacturer packaging for box count."},{"id":"waste_pct","label":"Waste Margin (%)","type":"number","default":10,"min":0,"max":25,"step":1,"hint":"10% standard, 15% for diagonal layout or intricate cuts."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['auto-loan-calculator'] = Object.assign({"name":"Auto Loan Calculator","category":"Finance","icon":"fa-route","iconClass":"icon-finance","tagClass":"tag-finance","formula":"M = P × [r(1+r)^n] / [(1+r)^n − 1] | Financed = Price + Tax + Fees − Down − Net Trade-in","presets":[{"label":"New Vehicle (60 Mo @ 6.5%)","values":{"vehicle_price":38000,"down_payment":5000,"trade_in_value":0,"trade_in_owed":0,"interest_rate":6.5,"loan_term_months":60,"sales_tax_rate":6,"dealer_fees":500}},{"label":"Used Vehicle (36 Mo @ 8.0%)","values":{"vehicle_price":22000,"down_payment":3000,"trade_in_value":0,"trade_in_owed":0,"interest_rate":8,"loan_term_months":36,"sales_tax_rate":6,"dealer_fees":350}},{"label":"Trade-in Equity (48 Mo @ 5.5%)","values":{"vehicle_price":35000,"down_payment":2000,"trade_in_value":10000,"trade_in_owed":4000,"interest_rate":5.5,"loan_term_months":48,"sales_tax_rate":6,"dealer_fees":400}}],"fields":[{"id":"vehicle_price","label":"Vehicle Price ($)","type":"number","default":35000,"min":500,"step":500,"hint":"The negotiated purchase price of the vehicle before taxes and fees."},{"id":"down_payment","label":"Down Payment ($)","type":"number","default":5000,"min":0,"step":500,"hint":"Cash paid upfront towards the purchase."},{"id":"trade_in_value","label":"Trade-in Value ($)","type":"number","default":0,"min":0,"step":500,"hint":"The estimated trade-in value of your current car."},{"id":"trade_in_owed","label":"Amount Owed on Trade-in ($)","type":"number","default":0,"min":0,"step":500,"hint":"Remaining loan balance on your trade-in vehicle (if any)."},{"id":"interest_rate","label":"Interest Rate APR (%)","type":"number","default":6.5,"min":0,"max":40,"step":0.1,"hint":"Annual interest rate for the auto loan."},{"id":"loan_term_months","label":"Loan Term (months)","type":"select","default":60,"options":[{"value":24,"label":"24 months (2 years)"},{"value":36,"label":"36 months (3 years)"},{"value":48,"label":"48 months (4 years)"},{"value":60,"label":"60 months (5 years)"},{"value":72,"label":"72 months (6 years)"},{"value":84,"label":"84 months (7 years)"}],"hint":"Repayment period. Shorter terms save on total interest."},{"id":"sales_tax_rate","label":"Sales Tax Rate (%)","type":"number","default":6,"min":0,"max":25,"step":0.25,"hint":"State and local vehicle sales tax rate."},{"id":"dealer_fees","label":"Doc & Registration Fees ($)","type":"number","default":500,"min":0,"step":50,"hint":"Title, registration, and dealership documentation fees."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['salary-calculator'] = Object.assign({"name":"Salary & Paycheck Calculator","category":"Finance","icon":"fa-wallet","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Net Pay = Gross Income − Federal Tax − FICA Tax − State Tax − Pre-tax Deductions","presets":[{"label":"US Median ($65k Single)","values":{"gross_income":65000,"pay_frequency":"annual","filing_status":"single","state_tax_rate":4.5,"pretax_401k":3000,"pretax_health":150}},{"label":"Tech / Senior ($130k Married)","values":{"gross_income":130000,"pay_frequency":"annual","filing_status":"married","state_tax_rate":5.5,"pretax_401k":12000,"pretax_health":350}},{"label":"Hourly Full-Time ($28/hr)","values":{"gross_income":28,"pay_frequency":"hourly","hours_per_week":40,"filing_status":"single","state_tax_rate":4,"pretax_401k":0,"pretax_health":100}}],"fields":[{"id":"gross_income","label":"Gross Income / Salary ($)","type":"number","default":75000,"min":100,"step":1000,"hint":"Your gross earnings before taxes and deductions."},{"id":"pay_frequency","label":"Pay Frequency","type":"select","default":"annual","options":[{"value":"annual","label":"Annual Salary"},{"value":"monthly","label":"Monthly"},{"value":"biweekly","label":"Biweekly (every 2 weeks)"},{"value":"weekly","label":"Weekly"},{"value":"hourly","label":"Hourly"}],"hint":"How often you receive your salary or wage."},{"id":"hours_per_week","label":"Hours Per Week","type":"number","default":40,"min":1,"max":168,"step":1,"hint":"Expected working hours per week (standard is 40)."},{"id":"filing_status","label":"Filing Status","type":"select","default":"single","options":[{"value":"single","label":"Single"},{"value":"married","label":"Married Filing Jointly"},{"value":"head","label":"Head of Household"}],"hint":"Your tax filing status for federal tax bracket calculation."},{"id":"state_tax_rate","label":"Estimated State Tax Rate (%)","type":"number","default":5,"min":0,"max":15,"step":0.1,"hint":"State income tax rate (e.g. 0% in TX/FL/WA, ~5% average, up to 13% in CA)."},{"id":"pretax_401k","label":"401(k) / Retirement Deduction ($/yr)","type":"number","default":4000,"min":0,"step":500,"hint":"Annual pre-tax retirement contribution."},{"id":"pretax_health","label":"Health Insurance Pre-tax ($/mo)","type":"number","default":200,"min":0,"step":25,"hint":"Monthly pre-tax health and dental insurance premium."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['tdee-calculator'] = Object.assign({"name":"TDEE & Daily Calorie Calculator","category":"Health","icon":"fa-fire","iconClass":"icon-health","tagClass":"tag-health","formula":"BMR (Mifflin-St Jeor) = (10 × kg) + (6.25 × cm) − (5 × age) + (5 or −161) | TDEE = BMR × Activity","presets":[{"label":"Fat Loss Cut (-500 kcal)","values":{"unit":"imperial","gender":"male","age":30,"weight":185,"height":70,"activity_level":"moderate","goal":"cut_standard"}},{"label":"Lean Bulk (+300 kcal)","values":{"unit":"imperial","gender":"male","age":25,"weight":165,"height":69,"activity_level":"very_active","goal":"bulk_lean"}},{"label":"Maintenance & Tone","values":{"unit":"imperial","gender":"female","age":28,"weight":135,"height":65,"activity_level":"light","goal":"maintain"}}],"fields":[{"id":"unit","label":"Unit System","type":"select","default":"metric","options":[{"value":"metric","label":"Metric (kg / cm)"},{"value":"imperial","label":"Imperial (lbs / inches)"}],"hint":"Choose metric or imperial units."},{"id":"gender","label":"Gender","type":"select","default":"male","options":[{"value":"male","label":"Male"},{"value":"female","label":"Female"}],"hint":"Biological sex influences baseline metabolic formulas."},{"id":"age","label":"Age","type":"number","default":28,"min":14,"max":110,"step":1,"hint":"Age in years."},{"id":"weight","label":"Weight","type":"number","default":75,"min":20,"max":500,"step":0.5,"hint":"Your current body weight."},{"id":"height","label":"Height","type":"number","default":178,"min":60,"max":260,"step":1,"hint":"Your height."},{"id":"activity_level","label":"Activity Level","type":"select","default":"moderate","options":[{"value":"sedentary","label":"Sedentary (desk job, little or no exercise)"},{"value":"light","label":"Light Exercise (1-2 days/week)"},{"value":"moderate","label":"Moderate Exercise (3-5 days/week)"},{"value":"heavy","label":"Heavy Exercise (6-7 days/week)"},{"value":"athlete","label":"Athlete / Physical Job (2x per day)"}],"hint":"Your weekly physical activity and exercise routine."},{"id":"goal","label":"Fitness Goal","type":"select","default":"maintain","options":[{"value":"cut_fast","label":"Fast Weight Loss (-2 lbs/week [-1000 kcal])"},{"value":"cut_standard","label":"Moderate Weight Loss (-1 lb/week [-500 kcal])"},{"value":"cut_mild","label":"Mild Weight Loss (-0.5 lb/week [-250 kcal])"},{"value":"maintain","label":"Maintain Current Weight"},{"value":"bulk_mild","label":"Lean Muscle Gain (+0.5 lb/week [+250 kcal])"},{"value":"bulk_standard","label":"Standard Muscle Gain (+1 lb/week [+500 kcal])"}],"hint":"Calorie adjustment based on your target body composition goal."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['unit-converter'] = Object.assign({"name":"Universal Unit Converter","category":"Math","icon":"fa-scale-balanced","iconClass":"icon-math","tagClass":"tag-math","formula":"Result = Value × (From Unit Base Factor ÷ To Unit Base Factor)","presets":[],"fields":[{"id":"dimension","label":"Conversion Type","type":"select","default":"length","options":[{"value":"length","label":"Length & Distance"},{"value":"weight","label":"Weight & Mass"},{"value":"temperature","label":"Temperature"},{"value":"volume","label":"Volume & Capacity"},{"value":"speed","label":"Speed & Velocity"},{"value":"data","label":"Digital Data & Storage"},{"value":"area","label":"Area"},{"value":"pressure","label":"Pressure"},{"value":"time","label":"Time"}],"hint":"Choose the measurement category to convert."},{"id":"amount","label":"Value to Convert","type":"number","default":10,"min":-999999999,"step":0.1,"hint":"The numerical quantity you want to convert."},{"id":"unit_length_from","label":"From Unit","type":"select","hint":"The starting length unit to convert from.","default":"meters","options":[{"value":"meters","label":"Meters (m)"},{"value":"kilometers","label":"Kilometers (km)"},{"value":"centimeters","label":"Centimeters (cm)"},{"value":"millimeters","label":"Millimeters (mm)"},{"value":"miles","label":"Miles (mi)"},{"value":"yards","label":"Yards (yd)"},{"value":"feet","label":"Feet (ft)"},{"value":"inches","label":"Inches (in)"},{"value":"nautical_miles","label":"Nautical Miles (NM)"}]},{"id":"unit_length_to","label":"To Unit","type":"select","hint":"The target length unit to convert into.","default":"feet","options":[{"value":"meters","label":"Meters (m)"},{"value":"kilometers","label":"Kilometers (km)"},{"value":"centimeters","label":"Centimeters (cm)"},{"value":"millimeters","label":"Millimeters (mm)"},{"value":"miles","label":"Miles (mi)"},{"value":"yards","label":"Yards (yd)"},{"value":"feet","label":"Feet (ft)"},{"value":"inches","label":"Inches (in)"},{"value":"nautical_miles","label":"Nautical Miles (NM)"}]},{"id":"unit_weight_from","label":"From Unit","type":"select","hint":"The starting weight unit to convert from.","default":"kilograms","options":[{"value":"kilograms","label":"Kilograms (kg)"},{"value":"grams","label":"Grams (g)"},{"value":"milligrams","label":"Milligrams (mg)"},{"value":"metric_tons","label":"Metric Tons (t)"},{"value":"pounds","label":"Pounds (lb)"},{"value":"ounces","label":"Ounces (oz)"},{"value":"stones","label":"Stones (st)"}]},{"id":"unit_weight_to","label":"To Unit","type":"select","hint":"The target weight unit to convert into.","default":"pounds","options":[{"value":"kilograms","label":"Kilograms (kg)"},{"value":"grams","label":"Grams (g)"},{"value":"milligrams","label":"Milligrams (mg)"},{"value":"metric_tons","label":"Metric Tons (t)"},{"value":"pounds","label":"Pounds (lb)"},{"value":"ounces","label":"Ounces (oz)"},{"value":"stones","label":"Stones (st)"}]},{"id":"unit_temp_from","label":"From Unit","type":"select","hint":"The starting temperature scale to convert from.","default":"celsius","options":[{"value":"celsius","label":"Celsius (°C)"},{"value":"fahrenheit","label":"Fahrenheit (°F)"},{"value":"kelvin","label":"Kelvin (K)"}]},{"id":"unit_temp_to","label":"To Unit","type":"select","hint":"The target temperature scale to convert into.","default":"fahrenheit","options":[{"value":"celsius","label":"Celsius (°C)"},{"value":"fahrenheit","label":"Fahrenheit (°F)"},{"value":"kelvin","label":"Kelvin (K)"}]},{"id":"unit_vol_from","label":"From Unit","type":"select","hint":"The starting volume unit to convert from.","default":"liters","options":[{"value":"liters","label":"Liters (L)"},{"value":"milliliters","label":"Milliliters (mL)"},{"value":"cubic_meters","label":"Cubic Meters (m³)"},{"value":"gallons_us","label":"US Gallons (gal)"},{"value":"quarts_us","label":"US Quarts (qt)"},{"value":"pints_us","label":"US Pints (pt)"},{"value":"cups_us","label":"US Cups"},{"value":"fl_oz_us","label":"US Fluid Ounces (fl oz)"},{"value":"tablespoons","label":"Tablespoons (tbsp)"},{"value":"teaspoons","label":"Teaspoons (tsp)"}]},{"id":"unit_vol_to","label":"To Unit","type":"select","hint":"The target volume unit to convert into.","default":"gallons_us","options":[{"value":"liters","label":"Liters (L)"},{"value":"milliliters","label":"Milliliters (mL)"},{"value":"cubic_meters","label":"Cubic Meters (m³)"},{"value":"gallons_us","label":"US Gallons (gal)"},{"value":"quarts_us","label":"US Quarts (qt)"},{"value":"pints_us","label":"US Pints (pt)"},{"value":"cups_us","label":"US Cups"},{"value":"fl_oz_us","label":"US Fluid Ounces (fl oz)"},{"value":"tablespoons","label":"Tablespoons (tbsp)"},{"value":"teaspoons","label":"Teaspoons (tsp)"}]},{"id":"unit_speed_from","label":"From Unit","type":"select","hint":"The starting velocity unit to convert from.","default":"kmh","options":[{"value":"kmh","label":"Kilometers per Hour (km/h)"},{"value":"mph","label":"Miles per Hour (mph)"},{"value":"ms","label":"Meters per Second (m/s)"},{"value":"knots","label":"Knots (kn)"},{"value":"fts","label":"Feet per Second (ft/s)"}]},{"id":"unit_speed_to","label":"To Unit","type":"select","hint":"The target velocity unit to convert into.","default":"mph","options":[{"value":"kmh","label":"Kilometers per Hour (km/h)"},{"value":"mph","label":"Miles per Hour (mph)"},{"value":"ms","label":"Meters per Second (m/s)"},{"value":"knots","label":"Knots (kn)"},{"value":"fts","label":"Feet per Second (ft/s)"}]},{"id":"unit_data_from","label":"From Unit","type":"select","hint":"The starting digital storage unit to convert from.","default":"gigabytes","options":[{"value":"bytes","label":"Bytes (B)"},{"value":"kilobytes","label":"Kilobytes (KB)"},{"value":"megabytes","label":"Megabytes (MB)"},{"value":"gigabytes","label":"Gigabytes (GB)"},{"value":"terabytes","label":"Terabytes (TB)"},{"value":"petabytes","label":"Petabytes (PB)"}]},{"id":"unit_data_to","label":"To Unit","type":"select","hint":"The target digital storage unit to convert into.","default":"megabytes","options":[{"value":"bytes","label":"Bytes (B)"},{"value":"kilobytes","label":"Kilobytes (KB)"},{"value":"megabytes","label":"Megabytes (MB)"},{"value":"gigabytes","label":"Gigabytes (GB)"},{"value":"terabytes","label":"Terabytes (TB)"},{"value":"petabytes","label":"Petabytes (PB)"}]},{"id":"unit_area_from","label":"From Unit","type":"select","hint":"The starting area unit to convert from.","default":"sq_meters","options":[{"value":"sq_meters","label":"Square Meters (m²)"},{"value":"sq_kilometers","label":"Square Kilometers (km²)"},{"value":"sq_feet","label":"Square Feet (sq ft)"},{"value":"sq_yards","label":"Square Yards (sq yd)"},{"value":"sq_miles","label":"Square Miles (sq mi)"},{"value":"acres","label":"Acres (ac)"},{"value":"hectares","label":"Hectares (ha)"}]},{"id":"unit_area_to","label":"To Unit","type":"select","hint":"The target area unit to convert into.","default":"sq_feet","options":[{"value":"sq_meters","label":"Square Meters (m²)"},{"value":"sq_kilometers","label":"Square Kilometers (km²)"},{"value":"sq_feet","label":"Square Feet (sq ft)"},{"value":"sq_yards","label":"Square Yards (sq yd)"},{"value":"sq_miles","label":"Square Miles (sq mi)"},{"value":"acres","label":"Acres (ac)"},{"value":"hectares","label":"Hectares (ha)"}]},{"id":"unit_pressure_from","label":"From Unit","type":"select","hint":"The starting pressure unit to convert from.","default":"psi","options":[{"value":"pascals","label":"Pascals (Pa)"},{"value":"kilopascals","label":"Kilopascals (kPa)"},{"value":"bar","label":"Bar (bar)"},{"value":"psi","label":"Pounds per Sq Inch (psi)"},{"value":"atm","label":"Standard Atmospheres (atm)"},{"value":"mmhg","label":"Millimeters of Mercury (mmHg / Torr)"}]},{"id":"unit_pressure_to","label":"To Unit","type":"select","hint":"The target pressure unit to convert into.","default":"bar","options":[{"value":"pascals","label":"Pascals (Pa)"},{"value":"kilopascals","label":"Kilopascals (kPa)"},{"value":"bar","label":"Bar (bar)"},{"value":"psi","label":"Pounds per Sq Inch (psi)"},{"value":"atm","label":"Standard Atmospheres (atm)"},{"value":"mmhg","label":"Millimeters of Mercury (mmHg / Torr)"}]},{"id":"unit_time_from","label":"From Unit","type":"select","hint":"The starting time unit to convert from.","default":"hours","options":[{"value":"seconds","label":"Seconds (s)"},{"value":"minutes","label":"Minutes (min)"},{"value":"hours","label":"Hours (h)"},{"value":"days","label":"Days (d)"},{"value":"weeks","label":"Weeks (wk)"},{"value":"months","label":"Months (30.44 days)"},{"value":"years","label":"Years (365.25 days)"}]},{"id":"unit_time_to","label":"To Unit","type":"select","hint":"The target time unit to convert into.","default":"minutes","options":[{"value":"seconds","label":"Seconds (s)"},{"value":"minutes","label":"Minutes (min)"},{"value":"hours","label":"Hours (h)"},{"value":"days","label":"Days (d)"},{"value":"weeks","label":"Weeks (wk)"},{"value":"months","label":"Months (30.44 days)"},{"value":"years","label":"Years (365.25 days)"}]}],"related":[]}, { calculate: calculate(v) {
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

      const table = makeTableSpec({
        mode: 'conversions',
        title: `Multi-Unit Conversion Equivalents for ${formatDisplay(amt)} ${fromKey.replace(/_/g, ' ')}`,
        columns: [
          { key: 'unit', label: 'Unit', emphasis: true },
          { key: 'value', label: 'Converted Value', emphasis: true }
        ],
        rows: tableRows.map(r => ({
          unit: r.Unit,
          value: r.Value
        }))
      });

      return {
        stats: [
          { label: `Converted Value (${toKey.replace(/_/g, ' ')})`, value: formatDisplay(resultValue), highlight: true },
          { label: 'Initial Amount', value: `${formatDisplay(amt)} ${fromKey.replace(/_/g, ' ')}` },
          { label: 'Conversion Factor', value: `1 ${fromKey.replace(/_/g, ' ')} = ${formatDisplay(resultValue / (amt || 1))} ${toKey.replace(/_/g, ' ')}` },
        ],
        table,
        insight: {
          tone: 'positive',
          icon: 'fa-scale-balanced',
          headline: `${amt} ${fromKey.replace(/_/g, ' ')} = ${formatDisplay(resultValue)} ${toKey.replace(/_/g, ' ')}`,
          detail: 'See the full multi-unit conversion table below for equivalent values across all standard measurement systems.'
        }
      };
    } });
TOOLS['profit-margin-calculator'] = Object.assign({"name":"Profit Margin Calculator","category":"Business","icon":"fa-chart-line","iconClass":"icon-business","tagClass":"tag-business","formula":"Gross Margin = ((Revenue - Cost) ÷ Revenue) × 100 | Markup = ((Revenue - Cost) ÷ Cost) × 100 | Net Profit = Gross Profit - Operating Expenses","presets":[{"label":"E-Commerce Retail (45% Margin)","values":{"calc_mode":"margin_from_price","cost":55,"revenue":100,"operating_expenses":15}},{"label":"SaaS / Digital (80% Margin)","values":{"calc_mode":"margin_from_price","cost":20,"revenue":100,"operating_expenses":40}},{"label":"Restaurant / Food (28% Margin)","values":{"calc_mode":"margin_from_price","cost":18,"revenue":25,"operating_expenses":4}}],"fields":[{"id":"calc_mode","label":"Calculation Mode","type":"select","default":"margin_from_price","hint":"Choose whether to calculate your profit margin from cost and price, or determine the required selling price for a target margin.","options":[{"value":"margin_from_price","label":"Calculate Margin from Cost & Sale Price"},{"value":"price_from_margin","label":"Calculate Selling Price from Cost & Target Margin"}]},{"id":"cost","label":"Cost of Goods Sold (COGS) ($)","type":"number","default":60,"min":0.01,"step":1,"hint":"Direct cost to manufacture or acquire one unit."},{"id":"revenue","label":"Selling Price / Revenue ($)","type":"number","default":100,"min":0.01,"step":1,"hint":"The price charged to the customer."},{"id":"target_margin","label":"Target Gross Margin (%)","type":"number","default":40,"min":0.01,"max":99.9,"step":0.5,"hint":"Desired profit margin percentage."},{"id":"operating_expenses","label":"Operating Overhead per Unit ($)","type":"number","default":15,"min":0,"step":1,"hint":"Indirect costs (marketing, shipping, software, rent)."}],"related":[]}, { calculate: calculate(v) {
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

      const table = makeTableSpec({
        mode: 'breakdown',
        title: 'Profit Margin & Operating Cost Breakdown',
        columns: [
          { key: 'metric', label: 'Financial Metric', emphasis: true },
          { key: 'value', label: 'Amount', format: 'currency' },
          { key: 'percentage', label: 'Share of Revenue', emphasis: true }
        ],
        rows: [
          { metric: 'Selling Price (Gross Revenue)', value: revenue, percentage: '100.00%' },
          { metric: 'Cost of Goods Sold (COGS)', value: cost, percentage: pct(cost / revenue) },
          { metric: 'Gross Profit', value: grossProfit, percentage: pct(grossProfit / revenue) },
          { metric: 'Operating Overhead (OpEx)', value: opex, percentage: pct(opex / revenue) },
          { metric: 'Net Bottom-Line Profit', value: netProfit, percentage: pct(netProfit / revenue) }
        ]
      });

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
    } });
TOOLS['break-even-calculator'] = Object.assign({"name":"Break-Even Calculator","category":"Business","icon":"fa-scale-balanced","iconClass":"icon-business","tagClass":"tag-business","formula":"Break-Even Units = Fixed Costs ÷ (Price - Variable Cost) | Break-Even Revenue = Break-Even Units × Price","presets":[{"label":"Physical Product ($5k Fixed)","values":{"fixed_costs":5000,"sale_price":50,"variable_cost":20,"target_profit":3000}},{"label":"SaaS Subscription ($20k Fixed)","values":{"fixed_costs":20000,"sale_price":49,"variable_cost":5,"target_profit":10000}},{"label":"Consulting / Agency ($12k Fixed)","values":{"fixed_costs":12000,"sale_price":150,"variable_cost":30,"target_profit":8000}}],"fields":[{"id":"fixed_costs","label":"Total Fixed Costs ($ / month)","type":"number","default":8000,"min":0,"step":100,"hint":"Non-variable expenses: rent, salaries, insurance, software licenses."},{"id":"sale_price","label":"Selling Price per Unit ($)","type":"number","default":60,"min":0.01,"step":1,"hint":"Average price charged per unit or subscription."},{"id":"variable_cost","label":"Variable Cost per Unit ($)","type":"number","default":20,"min":0,"step":1,"hint":"Direct per-unit costs: materials, labor, shipping, merchant fees."},{"id":"target_profit","label":"Target Monthly Profit ($) (optional)","type":"number","default":4000,"min":0,"step":100,"hint":"Desired profit above break-even."}],"related":[]}, { calculate: calculate(v) {
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
      const table = makeTableSpec({
        mode: 'sensitivity',
        title: 'Break-Even & Production Volume Sensitivity Analysis',
        columns: [
          { key: 'volume', label: 'Volume Capacity' },
          { key: 'units', label: 'Units Sold' },
          { key: 'revenue', label: 'Gross Revenue', format: 'currency' },
          { key: 'totalCost', label: 'Total Production Costs', format: 'currency' },
          { key: 'profit', label: 'Net Profit / Loss', format: 'currency', emphasis: true }
        ],
        rows: mults.map(m => {
          const u = Math.round(breakEvenUnits * m);
          const rev = roundTo(u * price, 2);
          const totCost = roundTo(fixed + (u * varCost), 2);
          const net = roundTo(rev - totCost, 2);
          return {
            volume: `${(m * 100).toFixed(0)}% of Break-Even`,
            units: `${fmtN(u)} units`,
            revenue: rev,
            totalCost: totCost,
            profit: net
          };
        })
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
    } });
TOOLS['customer-lifetime-value-calculator'] = Object.assign({"name":"Customer Lifetime Value (LTV / CAC) Calculator","category":"Business","icon":"fa-chart-line","iconClass":"icon-business","tagClass":"tag-business","formula":"LTV = (AOV × Frequency × Lifespan) × Gross Margin % | LTV:CAC = LTV ÷ CAC | Payback = CAC ÷ Monthly Gross Profit","presets":[{"label":"B2B SaaS ($200/mo, 3 Yr Lifespan)","values":{"avg_order_value":200,"purchase_frequency":12,"customer_lifespan":3,"gross_margin":80,"cac":1500}},{"label":"E-Commerce DTC ($75 AOV, 2x/yr)","values":{"avg_order_value":75,"purchase_frequency":2.5,"customer_lifespan":2,"gross_margin":50,"cac":45}},{"label":"Subscription Box ($40/mo, 14 Mo)","values":{"avg_order_value":40,"purchase_frequency":12,"customer_lifespan":1.2,"gross_margin":60,"cac":65}}],"fields":[{"id":"avg_order_value","label":"Average Order / Transaction Value ($)","type":"number","default":120,"min":0.01,"step":5,"hint":"Average dollar amount spent per purchase or monthly subscription."},{"id":"purchase_frequency","label":"Purchase Frequency (orders per year)","type":"number","default":4,"min":0.1,"step":0.5,"hint":"How many times a customer buys in one year (use 12 for monthly subscriptions)."},{"id":"customer_lifespan","label":"Average Customer Lifespan (years)","type":"number","default":3,"min":0.1,"step":0.5,"hint":"How many years the average customer stays active."},{"id":"gross_margin","label":"Gross Margin (%)","type":"number","default":70,"min":1,"max":100,"step":1,"hint":"Gross profit percentage after product fulfillment costs."},{"id":"cac","label":"Customer Acquisition Cost (CAC) ($)","type":"number","default":250,"min":0.01,"step":10,"hint":"Total sales and marketing cost to acquire one paying customer."}],"related":[]}, { calculate: calculate(v) {
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
    } });
TOOLS['gpa-calculator'] = Object.assign({"name":"College & High School GPA Calculator","category":"Education","icon":"fa-graduation-cap","iconClass":"icon-education","tagClass":"tag-education","formula":"GPA = Total Quality Points ÷ Total Credit Hours (where Quality Points = Grade Points × Credits)","presets":[{"label":"Dean's List Semester (3.9 GPA)","values":{"c1_grade":"A","c1_credits":4,"c2_grade":"A","c2_credits":3,"c3_grade":"A-","c3_credits":3,"c4_grade":"B+","c4_credits":3,"c5_grade":"A","c5_credits":3}},{"label":"Standard College Term (3.2 GPA)","values":{"c1_grade":"B+","c1_credits":4,"c2_grade":"B","c2_credits":3,"c3_grade":"A-","c3_credits":3,"c4_grade":"B-","c4_credits":3,"c5_grade":"C+","c5_credits":3}},{"label":"Honors / AP Weighted (4.4 GPA)","values":{"c1_grade":"A","c1_credits":4,"c1_scale":"ap","c2_grade":"A","c2_credits":3,"c2_scale":"ap","c3_grade":"A-","c3_credits":3,"c3_scale":"honors","c4_grade":"B+","c4_credits":3,"c4_scale":"regular"}}],"fields":[{"id":"c1_grade","label":"Course 1 Grade","type":"select","default":"A","options":[{"value":"A+","label":"A+ (4.0 / 97-100%)"},{"value":"A","label":"A (4.0 / 93-96%)"},{"value":"A-","label":"A- (3.7 / 90-92%)"},{"value":"B+","label":"B+ (3.3 / 87-89%)"},{"value":"B","label":"B (3.0 / 83-86%)"},{"value":"B-","label":"B- (2.7 / 80-82%)"},{"value":"C+","label":"C+ (2.3 / 77-79%)"},{"value":"C","label":"C (2.0 / 73-76%)"},{"value":"C-","label":"C- (1.7 / 70-72%)"},{"value":"D","label":"D (1.0 / 65-69%)"},{"value":"F","label":"F (0.0 / <65%)"}]},{"id":"c1_credits","label":"Course 1 Credits","type":"number","default":4,"min":0.5,"max":10,"step":0.5},{"id":"c1_scale","label":"Course 1 Level","type":"select","default":"regular","options":[{"value":"regular","label":"Regular (4.0 Scale)"},{"value":"honors","label":"Honors (+0.5 pt)"},{"value":"ap","label":"AP / IB (+1.0 pt)"}]},{"id":"c2_grade","label":"Course 2 Grade","type":"select","default":"A-","options":[{"value":"A+","label":"A+"},{"value":"A","label":"A"},{"value":"A-","label":"A-"},{"value":"B+","label":"B+"},{"value":"B","label":"B"},{"value":"B-","label":"B-"},{"value":"C+","label":"C+"},{"value":"C","label":"C"},{"value":"C-","label":"C-"},{"value":"D","label":"D"},{"value":"F","label":"F"}]},{"id":"c2_credits","label":"Course 2 Credits","type":"number","default":3,"min":0.5,"max":10,"step":0.5},{"id":"c3_grade","label":"Course 3 Grade","type":"select","default":"B+","options":[{"value":"A+","label":"A+"},{"value":"A","label":"A"},{"value":"A-","label":"A-"},{"value":"B+","label":"B+"},{"value":"B","label":"B"},{"value":"B-","label":"B-"},{"value":"C+","label":"C+"},{"value":"C","label":"C"},{"value":"C-","label":"C-"},{"value":"D","label":"D"},{"value":"F","label":"F"}]},{"id":"c3_credits","label":"Course 3 Credits","type":"number","default":3,"min":0.5,"max":10,"step":0.5},{"id":"c4_grade","label":"Course 4 Grade","type":"select","default":"A","options":[{"value":"A+","label":"A+"},{"value":"A","label":"A"},{"value":"A-","label":"A-"},{"value":"B+","label":"B+"},{"value":"B","label":"B"},{"value":"B-","label":"B-"},{"value":"C+","label":"C+"},{"value":"C","label":"C"},{"value":"C-","label":"C-"},{"value":"D","label":"D"},{"value":"F","label":"F"}]},{"id":"c4_credits","label":"Course 4 Credits","type":"number","default":3,"min":0.5,"max":10,"step":0.5},{"id":"c5_grade","label":"Course 5 Grade","type":"select","default":"B","options":[{"value":"A+","label":"A+"},{"value":"A","label":"A"},{"value":"A-","label":"A-"},{"value":"B+","label":"B+"},{"value":"B","label":"B"},{"value":"B-","label":"B-"},{"value":"C+","label":"C+"},{"value":"C","label":"C"},{"value":"C-","label":"C-"},{"value":"D","label":"D"},{"value":"F","label":"F"}]},{"id":"c5_credits","label":"Course 5 Credits","type":"number","default":3,"min":0,"max":10,"step":0.5},{"id":"prior_gpa","label":"Prior Cumulative GPA (optional)","type":"number","default":3.4,"min":0,"max":5,"step":0.01,"hint":"Leave at 0 if this is your first semester."},{"id":"prior_credits","label":"Prior Completed Credits (optional)","type":"number","default":30,"min":0,"step":1}],"related":[]}, { calculate: calculate(v) {
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
            course: 'Course ' + i,
            grade: gradeKey,
            credits: cr,
            unweighted: basePts.toFixed(1),
            weighted: weightedPts.toFixed(1)
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

      const table = makeTableSpec({
        mode: 'breakdown',
        title: 'Semester Course & Grade Point Breakdown',
        columns: [
          { key: 'course', label: 'Course', emphasis: true },
          { key: 'grade', label: 'Letter Grade' },
          { key: 'credits', label: 'Credits' },
          { key: 'unweighted', label: 'Unweighted Grade Points' },
          { key: 'weighted', label: 'Weighted Grade Points', emphasis: true }
        ],
        rows,
        footer: {
          course: 'Semester Totals',
          grade: '—',
          credits: totalCredits,
          unweighted: `Unweighted GPA: ${semesterGpa.toFixed(2)}`,
          weighted: `Weighted GPA: ${weightedGpa.toFixed(2)}`
        }
      });

      return {
        stats,
        table,
        insight: {
          tone: semesterGpa >= 3.5 ? 'positive' : semesterGpa >= 2.5 ? 'neutral' : 'warning',
          icon: 'fa-graduation-cap',
          headline: `Your Semester GPA is ${semesterGpa.toFixed(2)} across ${totalCredits} credit hours.`,
          detail: priorCr > 0 ? `Including your prior ${priorCr} credits at ${priorGpa.toFixed(2)}, your new cumulative GPA moves to ${cumulativeGpa.toFixed(2)}.` : 'Maintain high performance to qualify for academic honors and scholarships.'
        }
      };
    } });
TOOLS['final-grade-calculator'] = Object.assign({"name":"Final Grade Calculator","category":"Education","icon":"fa-graduation-cap","iconClass":"icon-education","tagClass":"tag-education","formula":"Final Exam Score = (Target - (Current × (1 - Weight))) ÷ Weight","presets":[{"label":"Standard Final (20% Weight for A)","values":{"current_grade":88,"target_grade":90,"final_weight":20}},{"label":"High-Stakes Final (40% Weight for B)","values":{"current_grade":75,"target_grade":80,"final_weight":40}},{"label":"Pass the Class (30% Weight for C)","values":{"current_grade":65,"target_grade":70,"final_weight":30}}],"fields":[{"id":"current_grade","label":"Current Class Grade (%)","type":"number","default":86,"min":0,"max":120,"step":0.5,"hint":"Your existing grade percentage prior to the final exam."},{"id":"target_grade","label":"Desired Course Grade (%)","type":"number","default":90,"min":0,"max":100,"step":0.5,"hint":"Target minimum overall course score (e.g. 90% for an A, 80% for a B)."},{"id":"final_weight","label":"Final Exam Weight (%)","type":"number","default":25,"min":1,"max":100,"step":1,"hint":"How much the final exam counts toward your total grade."}],"related":[]}, { calculate: calculate(v) {
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

      const table = makeTableSpec({
        mode: 'targets',
        title: 'Grade Threshold Targets & Required Final Scores',
        columns: [
          { key: 'goal', label: 'Desired Final Letter Grade', emphasis: true },
          { key: 'minAvg', label: 'Minimum Overall Avg' },
          { key: 'required', label: 'Required Score on Final Exam', emphasis: true }
        ],
        rows: letterGoals.map(g => {
          const req = roundTo((g.target - current * (1 - weight)) / weight, 1);
          return {
            goal: g.grade,
            minAvg: `${g.target}%`,
            required: req <= 0 ? 'Guaranteed (0%)' : req > 100 ? `${req}% (Extra Credit Needed)` : `${req}%`
          };
        })
      });

      return {
        stats,
        table,
        insight: {
          tone,
          icon: 'fa-graduation-cap',
          headline: required <= 0
            ? `You already have your target grade of ${target}% secured!`
            : required > 100
            ? `You need ${required.toFixed(1)}% on the final to reach ${target}%. Consider asking for extra credit.`
            : `Score at least ${required.toFixed(1)}% on your final exam to secure an overall grade of ${target}%.`,
          detail: `Your current ${current}% grade makes up ${((1 - weight) * 100).toFixed(0)}% of your class average.`
        }
      };
    } });
TOOLS['student-loan-calculator'] = Object.assign({"name":"Student Loan Calculator","category":"Education","icon":"fa-bookmark","iconClass":"icon-education","tagClass":"tag-education","formula":"Monthly Payment = P × [r(1+r)^n] ÷ [(1+r)^n - 1]","presets":[{"label":"Federal Undergrad ($35k @ 5.5%)","values":{"loan_balance":35000,"interest_rate":5.5,"loan_term":10,"extra_payment":0}},{"label":"Graduate School ($75k @ 7.0%)","values":{"loan_balance":75000,"interest_rate":7,"loan_term":10,"extra_payment":100}},{"label":"Accelerated Payoff ($45k + $250/mo)","values":{"loan_balance":45000,"interest_rate":6,"loan_term":10,"extra_payment":250}}],"fields":[{"id":"loan_balance","label":"Total Student Loan Balance ($)","type":"number","default":35000,"min":100,"step":500,"hint":"Total outstanding balance across all student loans."},{"id":"interest_rate","label":"Annual Interest Rate (%)","type":"number","default":5.8,"min":0.01,"max":25,"step":0.05,"hint":"Average interest rate (Federal Direct loans are commonly 5-7%)."},{"id":"loan_term","label":"Repayment Term (Years)","type":"select","default":10,"hint":"Standard federal repayment is 10 years. Extended plans can be 15-25 years.","options":[{"value":5,"label":"5 Years"},{"value":10,"label":"10 Years (Standard)"},{"value":15,"label":"15 Years"},{"value":20,"label":"20 Years"},{"value":25,"label":"25 Years"}]},{"id":"extra_payment","label":"Extra Monthly Payment ($)","type":"number","default":50,"min":0,"step":25,"hint":"Additional amount paid directly toward principal each month."}],"related":[]}, { calculate: calculate(v) {
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
        type: 'doughnut',
        labels: ['Original Principal', 'Total Interest Paid'],
        datasets: [{
          data: [P, totalInterestWithExtra],
          colors: ['#6366F1', '#F59E0B'],
          backgroundColor: ['#6366F1', '#F59E0B']
        }]
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
    } });
TOOLS['emergency-fund-calculator'] = Object.assign({"name":"Emergency Fund Calculator","category":"Finance","icon":"fa-shield-halved","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Target Fund = Total Monthly Essential Expenses × Desired Runway Months","presets":[{"label":"Starter 3-Month Fund","values":{"housing_rent":1200,"food_groceries":450,"utilities_bills":200,"transportation":250,"healthcare_insurance":150,"debt_minimums":150,"current_savings":1500,"monthly_contribution":400,"target_runway":"3","hysa_rate":4.5}},{"label":"Family 6-Month Safety","values":{"housing_rent":2000,"food_groceries":800,"utilities_bills":350,"transportation":500,"healthcare_insurance":350,"debt_minimums":300,"current_savings":6000,"monthly_contribution":650,"target_runway":"6","hysa_rate":4.5}},{"label":"Freelancer 12-Month Cushion","values":{"housing_rent":1800,"food_groceries":600,"utilities_bills":250,"transportation":300,"healthcare_insurance":400,"debt_minimums":200,"current_savings":8000,"monthly_contribution":800,"target_runway":"12","hysa_rate":4.5}}],"fields":[{"id":"housing_rent","label":"Monthly Housing / Rent / Mortgage ($)","type":"number","default":1500,"hint":"Rent, mortgage P&I, property taxes, home insurance"},{"id":"food_groceries","label":"Monthly Groceries & Essentials ($)","type":"number","default":600,"hint":"Groceries, household supplies (excluding dining out)"},{"id":"utilities_bills","label":"Utilities, Phone & Internet ($)","type":"number","default":300,"hint":"Electric, gas, water, cell phone, internet"},{"id":"transportation","label":"Transportation & Gas ($)","type":"number","default":400,"hint":"Auto loan, fuel, insurance, transit passes"},{"id":"healthcare_insurance","label":"Healthcare & Insurance Premiums ($)","type":"number","default":250,"hint":"Health, dental, vision, life insurance out-of-pocket"},{"id":"debt_minimums","label":"Minimum Required Debt Payments ($)","type":"number","default":250,"hint":"Credit card minimums, student loans, personal loans"},{"id":"current_savings","label":"Current Emergency Savings Balance ($)","type":"number","default":4000,"hint":"Cash in checking or high-yield savings accounts"},{"id":"monthly_contribution","label":"Monthly Amount You Can Save ($)","type":"number","default":500,"hint":"Planned monthly contribution toward your emergency fund"},{"id":"target_runway","label":"Target Runway (Months of Expenses)","type":"select","default":"6","options":[{"value":"3","label":"3 Months (Dual-income, stable jobs)"},{"value":"6","label":"6 Months (Recommended standard safety net)"},{"value":"9","label":"9 Months (Single-earner or volatile industry)"},{"value":"12","label":"12 Months (Freelancer, self-employed, commission)"}]},{"id":"hysa_rate","label":"High-Yield Savings Annual APY (%)","type":"number","default":4.5,"hint":"Annual percentage yield earned while funds are parked"}],"related":[]}, { calculate: calculate(v) {
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
      const table = makeTableSpec({
        mode: 'schedule',
        title: 'Emergency Savings Growth & Runway Timeline',
        columns: [
          { key: 'month', label: 'Month / Milestone' },
          { key: 'deposit', label: 'Monthly Deposit', format: 'currency' },
          { key: 'interest', label: 'Interest Earned', format: 'currency' },
          { key: 'balance', label: 'Total Fund Balance', format: 'currency', emphasis: true },
          { key: 'runway', label: 'Runway Covered', emphasis: true }
        ],
        rows: []
      });
      let balance = savings;
      const monthlyRate = apy / 12;
      for (let m = 1; m <= Math.min(60, Math.max(12, monthsNeeded)); m++) {
        const interest = roundTo(balance * monthlyRate, 2);
        balance = roundTo(balance + contrib + interest, 2);
        const monthsCovered = monthlyExpenses > 0 ? (balance / monthlyExpenses).toFixed(1) : '—';
        table.rows.push({
          month: `Month ${m}`,
          deposit: contrib,
          interest: interest,
          balance: balance,
          runway: `${monthsCovered} mo of expenses`
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
          type: 'doughnut',
          labels: ['Current Savings', 'Funding Shortfall'],
          datasets: [{
            data: [savings, Math.max(0, shortfall)],
            colors: ['#10B981', '#F59E0B'],
            backgroundColor: ['#10B981', '#F59E0B']
          }]
        },
        table,
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
    } });
TOOLS['401k-calculator'] = Object.assign({"name":"401(k) Retirement Growth Calculator","category":"Finance","icon":"fa-piggy-bank","iconClass":"icon-finance","tagClass":"tag-finance","formula":"Future Balance = PV(1+r)^n + ∑ [Annual Contribs × (1+r)^(n-t)]","presets":[{"label":"Average Contributor","values":{"current_age":30,"retire_age":65,"annual_salary":75000,"current_balance":25000,"employee_contrib_pct":8,"employer_match_pct":50,"employer_match_limit_pct":6,"annual_salary_growth":2.5,"annual_return":7.5}},{"label":"Aggressive Saver (Max Match)","values":{"current_age":26,"retire_age":65,"annual_salary":65000,"current_balance":12000,"employee_contrib_pct":12,"employer_match_pct":100,"employer_match_limit_pct":5,"annual_salary_growth":3,"annual_return":8}},{"label":"Mid-Career Booster","values":{"current_age":42,"retire_age":65,"annual_salary":110000,"current_balance":140000,"employee_contrib_pct":10,"employer_match_pct":50,"employer_match_limit_pct":6,"annual_salary_growth":2,"annual_return":7}}],"fields":[{"id":"current_age","label":"Current Age","type":"number","default":30,"hint":"Your current age in years"},{"id":"retire_age","label":"Planned Retirement Age","type":"number","default":65,"hint":"Target age when you plan to stop working"},{"id":"annual_salary","label":"Current Gross Annual Salary ($)","type":"number","default":75000,"hint":"Pre-tax gross salary"},{"id":"current_balance","label":"Current 401(k) Balance ($)","type":"number","default":25000,"hint":"Total existing balance across all 401(k) accounts"},{"id":"employee_contrib_pct","label":"Employee Contribution (% of Salary)","type":"number","default":8,"hint":"Percentage of salary deducted into your 401(k)"},{"id":"employer_match_pct","label":"Employer Match Rate (%)","type":"number","default":50,"hint":"e.g., 50% match (company puts in $0.50 for every $1.00 you contribute)"},{"id":"employer_match_limit_pct","label":"Employer Match Limit (% of Salary)","type":"number","default":6,"hint":"e.g., up to 6% of your salary"},{"id":"annual_salary_growth","label":"Expected Annual Salary Growth (%)","type":"number","default":2.5,"hint":"Average annual merit or cost-of-living raise"},{"id":"annual_return","label":"Expected Annual Investment Return (%)","type":"number","default":7.5,"hint":"Historical S&P 500 average is ~7-10% before inflation"}],"related":[]}, { calculate: calculate(v) {
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
      const table = makeTableSpec({
        mode: 'growth',
        title: '401(k) Annual Growth & Employer Match Accumulation Schedule',
        columns: [
          { key: 'age', label: 'Age' },
          { key: 'employeeContrib', label: 'Employee Contribution', format: 'currency' },
          { key: 'employerMatch', label: 'Employer Match', format: 'currency' },
          { key: 'growth', label: 'Investment Growth', format: 'currency' },
          { key: 'balance', label: 'End of Year Balance', format: 'currency', emphasis: true }
        ],
        rows: []
      });

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

        table.rows.push({
          age: `Age ${currentAge + y}`,
          employeeContrib: roundTo(empContrib, 2),
          employerMatch: roundTo(matchContrib, 2),
          growth: interest,
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
          type: 'doughnut',
          labels: ['Your Contributions', 'Employer Match', 'Compound Investment Growth'],
          datasets: [{
            data: [totalEmpContribs, totalMatchContribs, Math.max(0, totalGrowth)],
            colors: ['#6366F1', '#10B981', '#F59E0B'],
            backgroundColor: ['#6366F1', '#10B981', '#F59E0B']
          }]
        },
        table,
        insight: {
          tone: 'positive',
          icon: 'fa-piggy-bank',
          headline: `Your 401(k) is projected to reach ${fmt(balance)} by age ${retireAge}.`,
          detail: `Your employer contributes ${fmt(totalMatchContribs)} in company matching funds—representing instant, risk-free returns. Under the 4% safe withdrawal rule, this nest egg generates ${fmt(monthly4PctIncome)}/month in retirement income.`
        }
      };
    } });
TOOLS['debt-snowball-calculator'] = Object.assign({"name":"Debt Payoff & Snowball Calculator","category":"Finance","icon":"fa-arrow-trend-down","iconClass":"icon-finance","tagClass":"tag-finance","formula":"M_{interest} = B \times left(\frac{APR}{12}\right); quad C_{target} = C_{extra} + sum M_{retired}","presets":[{"label":"Standard Consumer Debt ($15k)","values":{"extra_payment":200,"strategy":"snowball","debt1_name":"Credit Card","debt1_balance":2500,"debt1_rate":24.99,"debt1_min":75,"debt2_name":"Auto Loan","debt2_balance":8000,"debt2_rate":6.5,"debt2_min":200,"debt3_name":"Personal Loan","debt3_balance":4500,"debt3_rate":12,"debt3_min":125}},{"label":"High-Interest Revolving Mix ($22k)","values":{"extra_payment":350,"strategy":"avalanche","debt1_name":"Store Card","debt1_balance":1800,"debt1_rate":29.99,"debt1_min":60,"debt2_name":"Major Credit Card","debt2_balance":7500,"debt2_rate":22.49,"debt2_min":220,"debt3_name":"Consolidated Loan","debt3_balance":12700,"debt3_rate":9.99,"debt3_min":310}},{"label":"Aggressive Debt Elimination ($10k)","values":{"extra_payment":500,"strategy":"snowball","debt1_name":"Medical Note","debt1_balance":1200,"debt1_rate":0,"debt1_min":50,"debt2_name":"Credit Card","debt2_balance":3800,"debt2_rate":21.99,"debt2_min":110,"debt3_name":"Student Line","debt3_balance":5000,"debt3_rate":7.25,"debt3_min":140}}],"fields":[{"id":"extra_payment","label":"Additional Monthly Contribution ($)","type":"number","default":200,"min":0,"step":25,"hint":"Extra cash allocated toward principal reduction each month beyond required minimums."},{"id":"strategy","label":"Repayment Strategy","type":"select","default":"snowball","options":[{"value":"snowball","label":"Debt Snowball (Lowest Balance First — Behavioral Momentum)"},{"value":"avalanche","label":"Debt Avalanche (Highest APR First — Mathematical Optimization)"}],"hint":"Choose between behavioral momentum (Snowball) or maximum financing interest savings (Avalanche)."},{"id":"debt1_name","label":"Debt 1 Account Name","type":"text","default":"Credit Card","hint":"Creditor or loan designation."},{"id":"debt1_balance","label":"Debt 1 Balance ($)","type":"number","default":2500,"min":0,"step":50,"hint":"Current unpaid principal balance."},{"id":"debt1_rate","label":"Debt 1 Interest Rate (APR %)","type":"number","default":24.99,"min":0,"max":99,"step":0.1,"hint":"Annual percentage rate assessed on revolving balances."},{"id":"debt1_min","label":"Debt 1 Minimum Monthly Payment ($)","type":"number","default":75,"min":1,"step":5,"hint":"Required scheduled minimum installment."},{"id":"debt2_name","label":"Debt 2 Account Name","type":"text","default":"Car Loan","hint":"Creditor or loan designation."},{"id":"debt2_balance","label":"Debt 2 Balance ($)","type":"number","default":8000,"min":0,"step":100,"hint":"Current unpaid principal balance."},{"id":"debt2_rate","label":"Debt 2 Interest Rate (APR %)","type":"number","default":6.5,"min":0,"max":99,"step":0.1,"hint":"Annual percentage rate assessed on revolving balances."},{"id":"debt2_min","label":"Debt 2 Minimum Monthly Payment ($)","type":"number","default":200,"min":1,"step":5,"hint":"Required scheduled minimum installment."},{"id":"debt3_name","label":"Debt 3 Account Name","type":"text","default":"Personal Loan","hint":"Creditor or loan designation."},{"id":"debt3_balance","label":"Debt 3 Balance ($)","type":"number","default":4500,"min":0,"step":50,"hint":"Current unpaid principal balance."},{"id":"debt3_rate","label":"Debt 3 Interest Rate (APR %)","type":"number","default":12,"min":0,"max":99,"step":0.1,"hint":"Annual percentage rate assessed on revolving balances."},{"id":"debt3_min","label":"Debt 3 Minimum Monthly Payment ($)","type":"number","default":125,"min":1,"step":5,"hint":"Required scheduled minimum installment."}],"related":[]}, { calculate: calculate(v) {
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

      const table = makeTableSpec({
        mode: 'schedule',
        title: `${strategy === 'snowball' ? 'Debt Snowball' : 'Debt Avalanche'} Payoff Sequencing & Timelines`,
        columns: [
          { key: 'target', label: 'Priority / Debt Account', emphasis: true },
          { key: 'startBalance', label: 'Starting Balance', format: 'currency' },
          { key: 'apr', label: 'Interest Rate' },
          { key: 'interestPaid', label: 'Total Interest Paid', format: 'currency' },
          { key: 'payoffTimeline', label: 'Projected Payoff', emphasis: true }
        ],
        rows: activeDebts.map((d, idx) => ({
          target: `Target #${idx + 1}: ${d.name}`,
          startBalance: roundTo(d.startBalance, 2),
          apr: `${d.apr}% APR`,
          interestPaid: roundTo(d.interestPaid, 2),
          payoffTimeline: `Month ${d.paidOffMonth} (${(d.paidOffMonth / 12).toFixed(1)} yrs)`
        })),
        footer: {
          target: 'Total Debt Portfolio',
          startBalance: totalInitialDebt,
          apr: 'Weighted Avg',
          interestPaid: activeTotalInterest,
          payoffTimeline: `Debt-Free in Month ${activeMonths}`
        }
      });

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
          type: 'bar',
          labels: ['Total Principal Repaid', 'Strategy Total Interest', 'Baseline Min Pay Interest'],
          datasets: [{
            label: 'Total Cost ($)',
            data: [totalInitialDebt, activeTotalInterest, baselineTotalInterest],
            colors: ['#6366F1', '#10B981', '#EF4444'],
            backgroundColor: ['#6366F1', '#10B981', '#EF4444']
          }]
        },
        table,
        insight: {
          tone: 'positive',
          icon: 'fa-award',
          headline: `Debt-free status projected in ${activeMonths} months with ${fmt(interestSaved)} in interest savings.`,
          detail: `By rolling satisfied installments forward into subsequent obligations, you eliminate ${fmt(totalInitialDebt)} in principal and avoid ${fmt(interestSaved)} in financing charges. Focus accelerated contributions on ${firstPaidDebt.name} to establish initial payoff momentum.`
        }
      };
    } });
TOOLS['refinance-calculator'] = Object.assign({"name":"Mortgage Refinance Break-Even Calculator","category":"Finance","icon":"fa-house-chimney","iconClass":"icon-finance","tagClass":"tag-finance","formula":"T_{break\\text{-}even} = \\left\\lceil \\frac{\\text{Closing Costs}}{M_{current} - M_{new}} \\right\\rceil","presets":[{"label":"Rate Reduction (1.50% Drop)","values":{"current_balance":320000,"current_rate":6.75,"current_years_remaining":26,"new_rate":5.25,"new_term_years":30,"closing_costs":4500,"years_in_home":7}},{"label":"Term Reduction (30-Yr to 15-Yr)","values":{"current_balance":275000,"current_rate":6.5,"current_years_remaining":24,"new_rate":4.85,"new_term_years":15,"closing_costs":3800,"years_in_home":10}},{"label":"Short-Horizon Evaluation (3 Years Stay)","values":{"current_balance":400000,"current_rate":7.125,"current_years_remaining":28,"new_rate":6.25,"new_term_years":30,"closing_costs":5500,"years_in_home":3}}],"fields":[{"id":"current_balance","label":"Current Mortgage Balance ($)","type":"number","default":320000,"min":1000,"step":5000,"hint":"The remaining unpaid principal balance on your existing mortgage note."},{"id":"current_rate","label":"Current Interest Rate (%)","type":"number","default":6.75,"min":0.1,"max":20,"step":0.125,"hint":"The annual note rate currently charged on your existing mortgage."},{"id":"current_years_remaining","label":"Remaining Amortization Term (Years)","type":"number","default":26,"min":1,"max":40,"step":1,"hint":"Number of remaining years until your existing mortgage is fully retired."},{"id":"new_rate","label":"Proposed Interest Rate (%)","type":"number","default":5.25,"min":0.1,"max":20,"step":0.125,"hint":"The lower interest rate offered by the refinancing lender."},{"id":"new_term_years","label":"New Loan Term (Years)","type":"number","default":30,"min":5,"max":40,"step":5,"hint":"Standard amortization term for the replacement loan (e.g. 15, 20, or 30 years)."},{"id":"closing_costs","label":"Estimated Refinance Closing Costs ($)","type":"number","default":4500,"min":0,"step":250,"hint":"Total origination, appraisal, title, escrow, and recording fees required at settlement."},{"id":"years_in_home","label":"Anticipated Occupancy Horizon (Years)","type":"number","default":7,"min":1,"max":40,"step":1,"hint":"Expected duration you plan to retain and occupy the mortgaged property."}],"related":[]}, { calculate: calculate(v) {
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

      const table = makeTableSpec({
        mode: 'comparison',
        title: 'Year-by-Year Cumulative Refinance Savings & Cost Recovery',
        columns: [
          { key: 'period', label: 'Timeline' },
          { key: 'currentOutflow', label: 'Current Loan Outflow', format: 'currency' },
          { key: 'newOutflow', label: 'Refinanced Outflow', format: 'currency' },
          { key: 'grossSavings', label: 'Cumulative Gross Savings', format: 'currency' },
          { key: 'netSavings', label: 'Net Savings (After Fees)', format: 'currency', emphasis: true }
        ],
        rows: []
      });
      const yearsToProject = Math.min(yearsInHome + 3, 15);
      for (let y = 1; y <= yearsToProject; y++) {
        const months = y * 12;
        const cumulativeGrossSavings = roundTo(monthlySavings * months, 2);
        const netPosition = roundTo(cumulativeGrossSavings - closingCosts, 2);
        table.rows.push({
          period: `Year ${y} (${months} mo)`,
          currentOutflow: roundTo(currentPI * months, 2),
          newOutflow: roundTo(newPI * months, 2),
          grossSavings: cumulativeGrossSavings,
          netSavings: netPosition
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
        table,
        insight: {
          tone: insightTone,
          icon: isWorthIt ? 'fa-circle-check' : 'fa-triangle-exclamation',
          headline: insightHeadline,
          detail: insightDetail
        }
      };
    } });
TOOLS['self-employment-tax-calculator'] = Object.assign({"name":"1099 Self-Employment Tax Calculator","category":"Finance","icon":"fa-receipt","iconClass":"icon-finance","tagClass":"tag-finance","formula":"T_{SECA} = (R_{gross} - E_{exp}) \times 0.9235 \times 0.153; quad P_{quarterly} = \frac{T_{total}}{4}","presets":[{"label":"Solo Professional ($85k)","values":{"gross_income":85000,"business_expenses":12000,"filing_status":"single","state_tax_rate":4.5,"other_w2_income":0}},{"label":"Consultant / Agency ($160k)","values":{"gross_income":160000,"business_expenses":24000,"filing_status":"married_joint","state_tax_rate":5,"other_w2_income":0}},{"label":"Side-Hustle ($30k with W-2)","values":{"gross_income":30000,"business_expenses":4500,"filing_status":"single","state_tax_rate":4,"other_w2_income":75000}}],"fields":[{"id":"gross_income","label":"Annual 1099 Gross Revenue ($)","type":"number","default":85000,"min":0,"step":1000,"hint":"Total gross revenue or client receipts prior to business expenses and tax deductions."},{"id":"business_expenses","label":"Ordinary & Necessary Business Deductions ($)","type":"number","default":12000,"min":0,"step":500,"hint":"Allowable Schedule C business write-offs (mileage, software, hardware, professional services)."},{"id":"filing_status","label":"Tax Filing Status","type":"select","default":"single","options":[{"value":"single","label":"Single Filer"},{"value":"married_joint","label":"Married Filing Jointly"},{"value":"head_household","label":"Head of Household"}],"hint":"IRS tax filing status determining progressive bracket thresholds and standard deductions."},{"id":"state_tax_rate","label":"Applicable State Income Tax Rate (%)","type":"number","default":4.5,"min":0,"max":15,"step":0.5,"hint":"State income tax rate (0% for states without individual income tax including TX, FL, WA, TN)."},{"id":"other_w2_income","label":"Concurrent W-2 Compensation ($)","type":"number","default":0,"min":0,"step":1000,"hint":"W-2 wage earnings subject to mandatory FICA withholding (adjusts Social Security wage cap)."}],"related":[]}, { calculate: calculate(v) {
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

      const table = makeTableSpec({
        mode: 'breakdown',
        title: 'Tax Breakdown & Quarterly Withholding Schedule',
        columns: [
          { key: 'component', label: 'Tax Component', emphasis: true },
          { key: 'taxableBase', label: 'Taxable Base', format: 'currency' },
          { key: 'rate', label: 'Statutory Rate' },
          { key: 'authority', label: 'Tax Authority' },
          { key: 'amount', label: 'Estimated Tax', format: 'currency', emphasis: true }
        ],
        rows: [
          { component: 'Social Security (SECA)', taxableBase: ssTaxableIncome, rate: '12.4%', authority: 'IRS Schedule SE', amount: ssTax },
          { component: 'Medicare (SECA)', taxableBase: seEarnings, rate: '2.9%', authority: 'IRS Schedule SE', amount: medicareTax },
          { component: 'Estimated Federal Income Tax', taxableBase: federalTaxableIncome, rate: 'Progressive (10-37%)', authority: 'IRS Form 1040-ES', amount: federalTaxFor1099 },
          { component: `State Income Tax (${stateRate}%)`, taxableBase: federalTaxableIncome, rate: `${stateRate}%`, authority: 'State Dept of Revenue', amount: stateTax }
        ],
        footer: {
          component: 'Total Annual Tax Obligation',
          taxableBase: gross,
          rate: `${recommendedSavePercent}% effective`,
          authority: 'Consolidated',
          amount: totalAnnualTax
        }
      });

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
          type: 'doughnut',
          labels: ['Net Take-Home Cash', 'Self-Employment Tax (SECA)', 'Federal Income Tax', 'State Income Tax'],
          datasets: [{
            data: [takeHomeCash, totalSETax, federalTaxFor1099, stateTax],
            colors: ['#10B981', '#EF4444', '#F59E0B', '#6366F1'],
            backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#6366F1']
          }]
        },
        table,
        insight: {
          tone: 'info',
          icon: 'fa-file-invoice-dollar',
          headline: `Allocate ${recommendedSavePercent}% (${fmt(quarterlyPayment)} quarterly) for tax liability.`,
          detail: `Self-employed professionals remit both employer and employee portions of Social Security and Medicare (15.3% SECA). Reserving ${recommendedSavePercent}% of each invoice into an earmarked liquid account ensures full compliance across IRS quarterly deadlines.`
        }
      };
    } });
TOOLS['15-year-mortgage-calculator'] = Object.assign({"name":"15-Year vs. 30-Year Mortgage Calculator","category":"Finance","icon":"fa-house-chimney","iconClass":"icon-finance","tagClass":"tag-finance","presets":[{"label":"$400k Home (20% Down, Current Rates)","values":{"home_price":400000,"down_payment":80000,"rate_15":5.85,"rate_30":6.75,"property_tax":4800,"insurance":1200,"sp500_return":8,"compare_years":15}},{"label":"$250k Starter Home (10% Down)","values":{"home_price":250000,"down_payment":25000,"rate_15":5.75,"rate_30":6.6,"property_tax":3000,"insurance":900,"sp500_return":8,"compare_years":15}},{"label":"$600k Luxury Home (20% Down)","values":{"home_price":600000,"down_payment":120000,"rate_15":5.95,"rate_30":6.85,"property_tax":7200,"insurance":1800,"sp500_return":8,"compare_years":15}}],"fields":[{"id":"basic_section","type":"section","label":"Basic Inputs","icon":"fa-sliders"},{"id":"home_price","label":"Home Purchase Price ($)","type":"number","default":400000,"min":10000,"step":5000,"hint":"Total negotiated purchase price of the property."},{"id":"down_payment","label":"Down Payment ($)","type":"number","default":80000,"min":0,"step":5000,"hint":"Upfront cash down payment (20% down avoids private mortgage insurance)."},{"id":"rate_15","label":"15-Year Fixed Interest Rate (%)","type":"number","default":5.85,"min":0.1,"max":20,"step":0.05,"hint":"Current market rate for a 15-year fixed loan (historically 0.5% to 1.0% lower than 30-year)."},{"id":"rate_30","label":"30-Year Fixed Interest Rate (%)","type":"number","default":6.75,"min":0.1,"max":20,"step":0.05,"hint":"Current market rate for a 30-year fixed loan."},{"id":"property_tax","label":"Annual Property Tax ($)","type":"number","default":4800,"min":0,"step":100,"hint":"Local annual property tax divided into 12 escrow payments."},{"id":"insurance","label":"Annual Homeowners Insurance ($)","type":"number","default":1200,"min":0,"step":100,"hint":"Yearly hazard/homeowners insurance premium."},{"id":"advanced_section","type":"section","label":"Opportunity Cost & Wealth Projections","icon":"fa-gear","collapsible":true},{"id":"sp500_return","label":"Expected S&P 500 Investment Return (%)","type":"number","default":8,"min":0,"max":18,"step":0.5,"hint":"Historical annualized nominal stock market index return (long-term average is ~8-10%)."},{"id":"compare_years","label":"Comparison Time Horizon (Years)","type":"select","default":15,"options":[{"value":5,"label":"5 Years"},{"value":10,"label":"10 Years"},{"value":15,"label":"15 Years (15-Yr Payoff)"},{"value":30,"label":"30 Years (Full Term)"}],"hint":"Analyze your net wealth at the 15-year mark when the 15-year loan is fully paid off."},{"id":"home_appreciation","label":"Annual Home Appreciation (%)","type":"number","default":3.5,"min":0,"max":12,"step":0.1,"hint":"Expected annual increase in property value (national historical average is ~3-4%)."}],"related":[]}, { calculate: calculate(v) {
      const price = safeNum(v.home_price, 400000);
      const down = safeNum(v.down_payment, 80000);
      const loan = price - down;
      if (loan <= 0) return errorResult('Down payment must be less than home purchase price.');

      const r15 = safeNum(v.rate_15, 5.85) / 100 / 12;
      const n15 = 15 * 12;
      const pi15 = r15 === 0 ? loan / n15 : loan * (r15 * Math.pow(1 + r15, n15)) / (Math.pow(1 + r15, n15) - 1);
      const totalInterest15 = roundTo(pi15 * n15 - loan, 2);

      const r30 = safeNum(v.rate_30, 6.75) / 100 / 12;
      const n30 = 30 * 12;
      const pi30 = r30 === 0 ? loan / n30 : loan * (r30 * Math.pow(1 + r30, n30)) / (Math.pow(1 + r30, n30) - 1);
      const totalInterest30 = roundTo(pi30 * n30 - loan, 2);

      const monthlyTax = safeNum(v.property_tax, 4800) / 12;
      const monthlyIns = safeNum(v.insurance, 1200) / 12;
      const totalMonthly15 = roundTo(pi15 + monthlyTax + monthlyIns, 2);
      const totalMonthly30 = roundTo(pi30 + monthlyTax + monthlyIns, 2);

      const monthlyDiff = roundTo(pi15 - pi30, 2);
      const interestSaved = roundTo(totalInterest30 - totalInterest15, 2);

      // Wealth projection: Compare at specified horizon
      const compareYears = safeNum(v.compare_years, 15);
      const appRate = safeNum(v.home_appreciation, 3.5) / 100;
      const futureHomeValue = roundTo(price * Math.pow(1 + appRate, compareYears), 2);

      const rInvestMonthly = safeNum(v.sp500_return, 8.0) / 100 / 12;
      
      // Amortize 15-year and 30-year to compareYears
      let bal15 = loan;
      let bal30 = loan;
      for (let m = 1; m <= compareYears * 12; m++) {
        if (bal15 > 0) {
          const int15 = bal15 * r15;
          const prin15 = Math.min(bal15, pi15 - int15);
          bal15 = Math.max(0, bal15 - prin15);
        }
        if (bal30 > 0) {
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
          type: 'bar',
          labels: ['15-Year Payoff Path', '30-Year + Invest Difference'],
          datasets: [
            { label: 'Home Equity', data: [roundTo(equity15, 2), roundTo(equity30, 2)], color: '#6366F1', backgroundColor: '#6366F1', stack: 'wealth' },
            { label: 'Investment Portfolio', data: [0, investmentPortfolio30], color: '#10B981', backgroundColor: '#10B981', stack: 'wealth' }
          ]
        },
        insight: {
          tone: wealthDifference > 0 ? 'positive' : 'neutral',
          icon: 'fa-circle-check',
          headline: wealthDifference > 0 ? 'Investing the Monthly Difference Yields Greater Net Worth' : 'Guaranteed Debt Payoff Wins',
          detail: 'The 15-year mortgage saves ' + fmt(interestSaved) + ' in guaranteed interest. However, choosing the 30-year mortgage and consistently investing the ' + fmt(monthlyDiff) + '/month difference at ' + v.sp500_return + '% annual return can build an investment portfolio of ' + fmt(investmentPortfolio30) + ' in ' + compareYears + ' years — producing ' + fmt(Math.abs(wealthDifference)) + ' ' + (wealthDifference > 0 ? 'more' : 'less') + ' overall wealth.'
        }
      };
    } });
TOOLS['fha-loan-calculator'] = Object.assign({"name":"FHA Loan Calculator with Upfront & Monthly MIP","category":"Finance","icon":"fa-shield-halved","iconClass":"icon-finance","tagClass":"tag-finance","presets":[{"label":"$300k Home (3.5% Down, Standard FHA)","values":{"home_price":300000,"down_payment":10500,"interest_rate":6.5,"loan_term":30,"annual_mip_rate":0.55,"property_tax":3600,"insurance":1100,"conv_rate":6.85,"conv_pmi_rate":0.85,"home_appreciation":3.5}},{"label":"$220k Starter Home (3.5% Down)","values":{"home_price":220000,"down_payment":7700,"interest_rate":6.25,"loan_term":30,"annual_mip_rate":0.55,"property_tax":2600,"insurance":900,"conv_rate":6.6,"conv_pmi_rate":0.85,"home_appreciation":3.5}},{"label":"$450k Move-Up (5% Down)","values":{"home_price":450000,"down_payment":22500,"interest_rate":6.75,"loan_term":30,"annual_mip_rate":0.5,"property_tax":5400,"insurance":1400,"conv_rate":7,"conv_pmi_rate":0.75,"home_appreciation":3.5}}],"fields":[{"id":"basic_section","type":"section","label":"FHA Purchase Details","icon":"fa-sliders"},{"id":"home_price","label":"Home Purchase Price ($)","type":"number","default":300000,"min":10000,"step":5000,"hint":"Total negotiated property purchase price."},{"id":"down_payment","label":"Down Payment ($)","type":"number","default":10500,"min":0,"step":500,"hint":"Minimum FHA down payment is 3.5% ($10,500 on a $300k home) with a 580+ credit score."},{"id":"interest_rate","label":"Annual FHA Interest Rate (%)","type":"number","default":6.5,"min":0.1,"max":20,"step":0.05,"hint":"Your quoted FHA fixed interest rate (FHA rates are often 0.25% lower than conventional)."},{"id":"loan_term","label":"Loan Term (Years)","type":"select","default":30,"options":[{"value":30,"label":"30 Years"},{"value":15,"label":"15 Years"}],"hint":"Most FHA borrowers select a 30-year fixed loan."},{"id":"property_tax","label":"Annual Property Tax ($)","type":"number","default":3600,"min":0,"step":100,"hint":"Local annual property tax divided into 12 monthly payments."},{"id":"insurance","label":"Annual Homeowners Insurance ($)","type":"number","default":1100,"min":0,"step":100,"hint":"Yearly hazard insurance premium."},{"id":"advanced_section","type":"section","label":"MIP Settings & Conventional 3% Down Comparison","icon":"fa-gear","collapsible":true},{"id":"annual_mip_rate","label":"FHA Annual MIP Rate (%)","type":"number","default":0.55,"min":0.15,"max":1.5,"step":0.05,"hint":"Standard HUD annual MIP is 0.55% for 30-year loans with 3.5% down."},{"id":"conv_rate","label":"Conventional Loan Interest Rate (%)","type":"number","default":6.85,"min":0.1,"max":20,"step":0.05,"hint":"Market interest rate for a conventional loan with 3% down."},{"id":"conv_pmi_rate","label":"Conventional Annual PMI Rate (%)","type":"number","default":0.85,"min":0.2,"max":2,"step":0.05,"hint":"Conventional Private Mortgage Insurance rate based on credit score (typically 0.5% to 1.2%)."},{"id":"home_appreciation","label":"Expected Home Appreciation (%)","type":"number","default":3.5,"min":0,"max":12,"step":0.1,"hint":"Annual home value growth, used to calculate when conventional PMI drops at 20% equity."}],"related":[]}, { calculate: calculate(v) {
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
          type: 'bar',
          labels: ['FHA Monthly (PITI+MIP)', 'Conventional 3% (Initial)', 'Conventional (After PMI Drops)'],
          datasets: [{
            label: 'Monthly Housing Payment ($)',
            data: [totalFhaMonthly, totalConvMonthlyInitial, totalConvMonthlyAfterPMI],
            colors: ['#6366F1', '#EC4899', '#10B981'],
            backgroundColor: ['#6366F1', '#EC4899', '#10B981']
          }]
        },
        insight: {
          tone: totalFhaMonthly < totalConvMonthlyInitial ? 'positive' : 'neutral',
          icon: 'fa-circle-check',
          headline: totalFhaMonthly < totalConvMonthlyInitial ? 'FHA Provides Lower Initial Cash Flow' : 'Conventional Loan Saves Long-Term',
          detail: 'FHA starts at ' + fmt(totalFhaMonthly) + '/month, compared to ' + fmt(totalConvMonthlyInitial) + ' for a conventional loan. However, conventional PMI cancels after ~' + pmiDropYears + ' years, dropping your payment to ' + fmt(totalConvMonthlyAfterPMI) + ', whereas FHA monthly MIP stays for the entire loan life unless you refinance.'
        }
      };
    } });
TOOLS['auto-refinance-calculator'] = Object.assign({"name":"Auto Loan Refinance & Break-Even Calculator","category":"Finance","icon":"fa-rotate-left","iconClass":"icon-finance","tagClass":"tag-finance","presets":[{"label":"$25k Balance (9.5% to 5.5%, 48 Mos)","values":{"current_balance":25000,"current_rate":9.5,"months_remaining":48,"new_rate":5.5,"new_term_months":48,"refi_fees":150,"vehicle_val":28000}},{"label":"$15k Balance (12% to 6%, 36 Mos)","values":{"current_balance":15000,"current_rate":12,"months_remaining":36,"new_rate":6,"new_term_months":36,"refi_fees":100,"vehicle_val":17000}},{"label":"$35k SUV (8.0% to 5.0%, 60 Mos)","values":{"current_balance":35000,"current_rate":8,"months_remaining":60,"new_rate":5,"new_term_months":60,"refi_fees":200,"vehicle_val":36000}}],"fields":[{"id":"basic_section","type":"section","label":"Current & New Loan Details","icon":"fa-sliders"},{"id":"current_balance","label":"Current Auto Loan Payoff Balance ($)","type":"number","default":25000,"min":1000,"step":500,"hint":"The exact 10-day payoff amount from your current lender."},{"id":"current_rate","label":"Current Interest Rate (%)","type":"number","default":9.5,"min":0.1,"max":35,"step":0.1,"hint":"Your existing auto loan APR."},{"id":"months_remaining","label":"Months Remaining on Current Loan","type":"number","default":48,"min":1,"max":96,"step":1,"hint":"Number of monthly payments left on your current auto note."},{"id":"new_rate","label":"New Refinance Interest Rate (%)","type":"number","default":5.5,"min":0.1,"max":25,"step":0.1,"hint":"The lower APR quoted by a bank, credit union, or online lender."},{"id":"new_term_months","label":"New Loan Term (Months)","type":"select","default":48,"options":[{"value":24,"label":"24 Months"},{"value":36,"label":"36 Months"},{"value":48,"label":"48 Months"},{"value":60,"label":"60 Months"},{"value":72,"label":"72 Months"}],"hint":"Keep the term matching or shorter than remaining months to maximize interest savings."},{"id":"advanced_section","type":"section","label":"Refinancing Fees & Vehicle Equity","icon":"fa-gear","collapsible":true},{"id":"refi_fees","label":"Refinancing Transfer Fees ($)","type":"number","default":150,"min":0,"max":1000,"step":25,"hint":"State title transfer and lien recording fees (typically $50 to $200)."},{"id":"vehicle_val","label":"Estimated Vehicle Market Value ($)","type":"number","default":28000,"min":1000,"step":500,"hint":"Current Kelley Blue Book or Edmunds private party / trade-in market value."}],"related":[]}, { calculate: calculate(v) {
      const balance = safeNum(v.current_balance, 25000);
      if (balance <= 0) return errorResult('Loan balance must be greater than zero.');

      const rOld = safeNum(v.current_rate, 9.5) / 100 / 12;
      const nOld = safeNum(v.months_remaining, 48);
      const oldPayment = rOld === 0 ? balance / nOld : balance * (rOld * Math.pow(1 + rOld, nOld)) / (Math.pow(1 + rOld, nOld) - 1);
      const totalOldInterest = roundTo(oldPayment * nOld - balance, 2);

      const rNew = safeNum(v.new_rate, 5.5) / 100 / 12;
      const nNew = safeNum(v.new_term_months, 48);
      const refiFees = safeNum(v.refi_fees, 150);
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
          type: 'bar',
          labels: ['Current Auto Loan', 'Refinanced Auto Loan'],
          datasets: [
            { label: 'Loan Principal', data: [balance, newPrincipal], color: '#6366F1', backgroundColor: '#6366F1', stack: 'cost' },
            { label: 'Total Interest Paid', data: [totalOldInterest, totalNewInterest], color: '#F59E0B', backgroundColor: '#F59E0B', stack: 'cost' }
          ]
        },
        insight: {
          tone: lifetimeInterestSavings > 0 ? 'positive' : 'warning',
          icon: lifetimeInterestSavings > 0 ? 'fa-circle-check' : 'fa-triangle-exclamation',
          headline: lifetimeInterestSavings > 0 ? 'Refinancing Saves Substantial Money' : 'Caution: Term Extension Increases Cost',
          detail: lifetimeInterestSavings > 0
            ? 'Refinancing reduces your payment by ' + fmt(monthlySavings) + '/mo, covers your ' + fmt(refiFees) + ' fees in ' + (breakEvenMonths || 1) + ' months, and saves a net ' + fmt(lifetimeInterestSavings) + ' overall.'
            : 'Extending your loan term lowers monthly payments, but increases total finance charges by ' + fmt(Math.abs(lifetimeInterestSavings)) + '.'
        }
      };
    } });
TOOLS['freelance-hourly-rate-calculator'] = Object.assign({"name":"Freelance & Consultant Hourly Rate Calculator","category":"Business","icon":"fa-briefcase","iconClass":"icon-business","tagClass":"tag-business","formula":"Gross Revenue Target = [(Target Net Salary + Retirement) / (1 - Effective Tax Rate) + Overhead + Health] / (1 - Buffer) | Target Hourly Rate = Gross Revenue Target / (Working Weeks × Billable Hours/Week)","presets":[{"label":"$100k Take-Home (25 Billable Hrs/Wk, Solo)","values":{"target_take_home":100000,"billable_hours_per_week":25,"weeks_off":4,"annual_expenses":12000,"fed_tax_rate":22,"state_tax_rate":5,"health_insurance_monthly":450,"retirement_annual":10000,"uncollectible_buffer":5}},{"label":"$75k Starter Freelancer (20 Billable Hrs/Wk)","values":{"target_take_home":75000,"billable_hours_per_week":20,"weeks_off":3,"annual_expenses":6000,"fed_tax_rate":18,"state_tax_rate":4,"health_insurance_monthly":350,"retirement_annual":6000,"uncollectible_buffer":5}},{"label":"$160k Senior Consultant (28 Billable Hrs/Wk)","values":{"target_take_home":160000,"billable_hours_per_week":28,"weeks_off":5,"annual_expenses":24000,"fed_tax_rate":26,"state_tax_rate":6,"health_insurance_monthly":600,"retirement_annual":20000,"uncollectible_buffer":8}}],"fields":[{"id":"basic_section","type":"section","label":"Salary & Capacity Targets","icon":"fa-sliders"},{"id":"target_take_home","label":"Desired Net Take-Home Salary ($)","type":"number","default":100000,"min":10000,"step":5000,"hint":"The actual annual money you want in your personal checking account for living expenses."},{"id":"billable_hours_per_week","label":"Billable Client Hours Per Week","type":"number","default":25,"min":5,"max":50,"step":1,"hint":"Realistic client work hours (typically 20-28 hrs/wk, as admin, sales, and proposals take the rest)."},{"id":"weeks_off","label":"Vacation, Sick & Holiday Weeks Off","type":"number","default":4,"min":0,"max":20,"step":1,"hint":"Freelancers do not get paid time off. Budget 4 to 6 weeks for vacations and sick days."},{"id":"annual_expenses","label":"Annual Business Overhead ($)","type":"number","default":12000,"min":0,"step":1000,"hint":"Software licenses, computer hardware, accounting, marketing, co-working."},{"id":"advanced_section","type":"section","label":"Taxes, Benefits & Safety Buffers","icon":"fa-gear","collapsible":true},{"id":"fed_tax_rate","label":"Estimated Federal Income Tax Rate (%)","type":"number","default":22,"min":0,"max":45,"step":1,"hint":"Effective federal income tax bracket."},{"id":"state_tax_rate","label":"State / Local Income Tax Rate (%)","type":"number","default":5,"min":0,"max":15,"step":0.5,"hint":"State income tax (0% in TX, FL, WA, etc.; 5-10% in CA, NY, etc.)."},{"id":"health_insurance_monthly","label":"Monthly Health Insurance ($)","type":"number","default":450,"min":0,"step":50,"hint":"Self-employed health, dental, and vision insurance premiums."},{"id":"retirement_annual","label":"Target Annual Retirement Savings ($)","type":"number","default":10000,"min":0,"step":1000,"hint":"Annual contributions to a Solo 401(k), SEP IRA, or Roth IRA."},{"id":"uncollectible_buffer","label":"Slow Season & Unpaid Invoice Buffer (%)","type":"number","default":5,"min":0,"max":20,"step":1,"hint":"Safety margin for delayed client payments or pipeline gaps."}],"related":[]}, { calculate: calculate(v) {
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

      if (totalBillableHours <= 0) return errorResult('Total annual billable hours must be greater than zero.');

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
          labels: ['Net Take-Home', 'Taxes (SECA + Inc)', 'Benefits & Retirement', 'Business Overhead'],
          datasets: [{
            data: [netSalary, totalTaxes, (healthAnnual + retirementAnnual), overhead],
            backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#6366F1']
          }]
        },
        insight: {
          tone: 'positive',
          icon: 'fa-circle-check',
          headline: 'Your 3-Tier Pricing Blueprint',
          detail: 'To take home ' + fmt(netSalary) + ' clean after taxes (' + fmt(totalTaxes) + '), retirement (' + fmt(retirementAnnual) + '), and health insurance, quote $' + targetHourlyRate + '/hr (or ' + fmt(standardDayRate) + '/day). Never accept project work below your survival floor of $' + floorHourlyRate + '/hr.'
        }
      };
    } });
TOOLS['body-fat-percentage-calculator'] = Object.assign({"name":"Body Fat Percentage Calculator (US Navy Method)","category":"Health","icon":"fa-ruler-combined","iconClass":"icon-health","tagClass":"tag-health","presets":[{"label":"Male Fitness (5ft 10in, 32in Waist)","values":{"gender":"male","unit":"imperial","height":70,"neck":15,"waist":32,"hip":38,"weight":175,"activity":"moderate","target_bf":12,"weekly_loss_rate":1}},{"label":"Female Fit (5ft 5in, 27in Waist)","values":{"gender":"female","unit":"imperial","height":65,"neck":13,"waist":27,"hip":36,"weight":135,"activity":"moderate","target_bf":20,"weekly_loss_rate":1}},{"label":"Male Fat Loss Goal (6ft 0in, 38in Waist)","values":{"gender":"male","unit":"imperial","height":72,"neck":16,"waist":38,"hip":42,"weight":215,"activity":"light","target_bf":15,"weekly_loss_rate":1}}],"fields":[{"id":"basic_section","type":"section","label":"Body Measurements","icon":"fa-sliders"},{"id":"gender","label":"Gender","type":"select","default":"male","options":[{"value":"male","label":"Male"},{"value":"female","label":"Female"}],"hint":"Biological sex dictates anatomical body fat distribution formulas."},{"id":"unit","label":"Measurement Units","type":"select","default":"imperial","options":[{"value":"imperial","label":"Inches / Pounds"},{"value":"metric","label":"Centimeters / Kilograms"}],"hint":"Choose your preferred measurement system."},{"id":"height","label":"Height (inches or cm)","type":"number","default":70,"min":36,"max":250,"step":0.5,"hint":"Total standing height."},{"id":"neck","label":"Neck Circumference (inches or cm)","type":"number","default":15,"min":5,"max":100,"step":0.25,"hint":"Measure around the neck just below the larynx (Adam's apple)."},{"id":"waist","label":"Waist Circumference (inches or cm)","type":"number","default":32,"min":10,"max":200,"step":0.25,"hint":"Men: measure at the navel. Women: measure at narrowest natural waist."},{"id":"hip","label":"Hip Circumference (women only)","type":"number","default":36,"min":10,"max":200,"step":0.25,"hint":"Measure around the widest point of the hips and buttocks."},{"id":"weight","label":"Body Weight (lbs or kg)","type":"number","default":175,"min":40,"max":500,"step":0.5,"hint":"Current morning body weight."},{"id":"advanced_section","type":"section","label":"Target Fat Loss & Calorie Projections","icon":"fa-gear","collapsible":true},{"id":"target_bf","label":"Target Goal Body Fat (%)","type":"number","default":12,"min":4,"max":50,"step":0.5,"hint":"Men: 10-14% (lean/athletic). Women: 18-22% (lean/fit)."},{"id":"weekly_loss_rate","label":"Target Weekly Fat Loss Rate (lbs or kg/wk)","type":"select","default":1,"options":[{"value":0.5,"label":"0.5 / wk (Conservative, 250 kcal deficit)"},{"value":1,"label":"1.0 / wk (Standard, 500 kcal deficit)"},{"value":1.5,"label":"1.5 / wk (Aggressive, 750 kcal deficit)"}],"hint":"1.0 lb/week fat loss preserves lean muscle and energy levels."},{"id":"activity","label":"Daily Activity Level","type":"select","default":"moderate","options":[{"value":"sedentary","label":"Sedentary (desk job, little exercise)"},{"value":"light","label":"Lightly Active (exercise 1-3 days/wk)"},{"value":"moderate","label":"Moderately Active (exercise 3-5 days/wk)"},{"value":"very","label":"Very Active (hard exercise 6-7 days/wk)"}],"hint":"Used to calculate maintenance TDEE and cutting calorie roadmap."}],"related":[]}, { calculate: calculate(v) {
      const isMetric = v.unit === 'metric';
      let h = safeNum(v.height, isMetric ? 178 : 70);
      let neck = safeNum(v.neck, isMetric ? 38 : 15);
      let waist = safeNum(v.waist, isMetric ? 81 : 32);
      let hip = safeNum(v.hip, isMetric ? 91 : 36);
      let wt = safeNum(v.weight, isMetric ? 80 : 175);

      if (h <= 0 || neck <= 0 || waist <= 0 || wt <= 0) {
        return errorResult('Please enter positive numbers for height, neck, waist, and weight.');
      }

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

      // Target Goal Projections with guard against division by zero
      const targetBfRaw = safeNum(v.target_bf, v.gender === 'male' ? 12 : 20);
      const targetBfPct = Math.min(0.60, Math.max(0.04, targetBfRaw / 100));
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
          { label: 'Target Goal Weight (at ' + targetBfRaw + '% BF)', value: targetWeight + ' ' + unitLabel },
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
          tone: 'positive',
          icon: 'fa-circle-check',
          headline: 'Your Personalized Body Composition Roadmap',
          detail: 'You are carrying ' + leanMass + ' ' + unitLabel + ' of lean tissue and ' + fatMass + ' ' + unitLabel + ' of fat (' + category + '). To reach your goal of ' + targetBfRaw + '% body fat while preserving lean muscle, aim for ' + cuttingCalories + ' kcal/day (a ' + dailyCalorieDeficit + ' kcal deficit) to reach your target weight of ' + targetWeight + ' ' + unitLabel + ' in approximately ' + weeksToGoal + ' weeks.'
        }
      };
    } });
if (typeof window !== 'undefined') { window.TOOLS = TOOLS; }
if (typeof module !== 'undefined' && module.exports) { module.exports = TOOLS; }
