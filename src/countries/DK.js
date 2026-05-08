// Denmark tax engine — single, Copenhagen, 2026.
// Sources:
//   - https://www.skat.dk/
//   - https://www.borger.dk/

import { FX_USD_PER_UNIT } from '../fx.js';

export const DK_AM_BIDRAG = 0.08;
export const DK_PERSONFRADRAG = 54100;
export const DK_BUNDSKAT = 0.1201;
export const DK_MELLEMSKAT = 0.075;
export const DK_TOPSKAT = 0.075;
export const DK_TOPTOPSKAT = 0.05;
export const DK_KOMMUNESKAT_CPH = 0.238;
export const DK_SKATTELOFT = 0.5207;
export const DK_RATEPENSION_CAP = 68700;
export const DK_ATP_EMPLOYEE_ANNUAL = 1188;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  const am = grossLocal * DK_AM_BIDRAG;
  const atp = DK_ATP_EMPLOYEE_ANNUAL;

  const eePension = Math.min(grossLocal * (eePensionPct / 100), DK_RATEPENSION_CAP);
  const afterAM = grossLocal - am - atp - eePension;
  const taxBase = Math.max(0, afterAM - DK_PERSONFRADRAG);

  const bundskat = taxBase * DK_BUNDSKAT;
  const mellemskat = Math.max(0, Math.min(taxBase, 777900) - 641200) * DK_MELLEMSKAT;
  const topskat = Math.max(0, Math.min(taxBase, 2592700) - 777900) * DK_TOPSKAT;
  const toptopskat = Math.max(0, taxBase - 2592700) * DK_TOPTOPSKAT;
  const kommune = taxBase * DK_KOMMUNESKAT_CPH;

  // Skatteloft (ceiling): bundskat + kommune + topskat capped at 52.07% of base
  const sumStateLocalTop = bundskat + kommune + topskat;
  const ceiling = taxBase * DK_SKATTELOFT;
  const adjusted = sumStateLocalTop > ceiling ? ceiling : sumStateLocalTop;
  const incomeTax = adjusted + mellemskat + toptopskat;
  const socialSec = am + atp;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.DKK;
  return {
    countryCode: 'DK', currency: 'DKK',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'State + Kommune (capped)', amount: incomeTax, kind: 'tax' },
      { label: 'AM-bidrag + ATP', amount: socialSec, kind: 'social' },
      { label: 'Ratepension', amount: eePension, kind: 'pension' },
    ],
  };
};
