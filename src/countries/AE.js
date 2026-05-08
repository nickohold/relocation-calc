// United Arab Emirates tax engine — no personal income tax. Mandatory ILOE (Involuntary
// Loss of Employment) insurance: AED 5/mo for salary ≤ AED 16k, AED 10/mo above.
// At our income range (>AED 16k/mo), all employees pay AED 120/yr.
// Sources:
//   - https://www.tax.gov.ae/
//   - https://u.ae/en/information-and-services/finance-and-investment/taxation
//   - https://www.iloe.ae/

import { FX_USD_PER_UNIT } from '../fx.js';

export const AE_ILOE_ANNUAL = 120;  // AED 10/month for salary > AED 16k

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eePensionPct; void eeOtherPct;
  // ILOE applies only above AED 192k/yr (AED 16k/mo); below that it's AED 60/yr.
  const ilo = grossLocal > 192000 ? AE_ILOE_ANNUAL : 60;
  const socialSec = grossLocal > 0 ? ilo : 0;
  const netLocal = grossLocal - socialSec;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.AED;
  return {
    countryCode: 'AE', currency: 'AED',
    grossLocal,
    incomeTax: 0, socialSec, localTax: 0,
    eePensionLocal: 0, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: 0,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: 0, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? socialSec / grossLocal : 0,
    breakdown: [
      { label: 'No income tax', amount: 0, kind: 'tax' },
      { label: 'ILOE (unemployment ins.)', amount: socialSec, kind: 'social' },
    ],
  };
};
