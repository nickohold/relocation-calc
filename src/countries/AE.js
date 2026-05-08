// United Arab Emirates tax engine — no personal income tax, no employee social security for non-GCC.
// Sources:
//   - https://www.tax.gov.ae/
//   - https://u.ae/en/information-and-services/finance-and-investment/taxation

import { FX_USD_PER_UNIT } from '../fx.js';

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eePensionPct; void eeOtherPct;
  const netLocal = grossLocal;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.AED;
  return {
    countryCode: 'AE', currency: 'AED',
    grossLocal,
    incomeTax: 0, socialSec: 0, localTax: 0,
    eePensionLocal: 0, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: 0,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: 0, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: 0,
    breakdown: [{ label: 'No income tax', amount: 0, kind: 'tax' }],
  };
};
