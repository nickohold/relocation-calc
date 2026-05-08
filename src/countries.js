// Country registry + LOCATIONS aggregator. Imported by calc.js.

import * as US from './countries/US.js';
import * as IL from './countries/IL.js';
import * as UK from './countries/UK.js';
import * as IE from './countries/IE.js';
import * as DE from './countries/DE.js';
import * as FR from './countries/FR.js';
import * as NL from './countries/NL.js';
import * as CH from './countries/CH.js';
import * as CA from './countries/CA.js';
import * as AU from './countries/AU.js';
import * as SG from './countries/SG.js';
import * as JP from './countries/JP.js';
import * as ES from './countries/ES.js';
import * as IT from './countries/IT.js';
import * as PT from './countries/PT.js';
import * as SE from './countries/SE.js';
import * as DK from './countries/DK.js';
import * as NO from './countries/NO.js';
import * as AE from './countries/AE.js';
import * as PL from './countries/PL.js';

export const COUNTRIES = {
  US: { name: 'United States',  currency: 'USD', compute: US.compute },
  IL: { name: 'Israel',          currency: 'ILS', compute: IL.compute },
  UK: { name: 'United Kingdom',  currency: 'GBP', compute: UK.compute },
  IE: { name: 'Ireland',         currency: 'EUR', compute: IE.compute },
  DE: { name: 'Germany',         currency: 'EUR', compute: DE.compute },
  FR: { name: 'France',          currency: 'EUR', compute: FR.compute },
  NL: { name: 'Netherlands',     currency: 'EUR', compute: NL.compute },
  CH: { name: 'Switzerland',     currency: 'CHF', compute: CH.compute },
  CA: { name: 'Canada',          currency: 'CAD', compute: CA.compute },
  AU: { name: 'Australia',       currency: 'AUD', compute: AU.compute },
  SG: { name: 'Singapore',       currency: 'SGD', compute: SG.compute },
  JP: { name: 'Japan',           currency: 'JPY', compute: JP.compute },
  ES: { name: 'Spain',           currency: 'EUR', compute: ES.compute },
  IT: { name: 'Italy',           currency: 'EUR', compute: IT.compute },
  PT: { name: 'Portugal',        currency: 'EUR', compute: PT.compute },
  SE: { name: 'Sweden',          currency: 'SEK', compute: SE.compute },
  DK: { name: 'Denmark',         currency: 'DKK', compute: DK.compute },
  NO: { name: 'Norway',          currency: 'NOK', compute: NO.compute },
  AE: { name: 'United Arab Emirates', currency: 'AED', compute: AE.compute },
  PL: { name: 'Poland',          currency: 'PLN', compute: PL.compute },
};

// Multi-country LOCATIONS registry. Each `defaultRent` is monthly in LOCAL currency.
export const LOCATIONS = {
  // ── United States ──
  'US-NYC':    { country: 'US', stateOrRegion: 'NY', subRegion: 'NYC', name: 'New York City (Manhattan)', defaultRent: 4500, colIndex: 100.0 },
  'US-NJ-HOB': { country: 'US', stateOrRegion: 'NJ', subRegion: null, name: 'Hoboken / Jersey City', defaultRent: 3900, colIndex: 95.0 },
  'US-NJ-WNY': { country: 'US', stateOrRegion: 'NJ', subRegion: null, name: 'West New York / Guttenberg', defaultRent: 2900, colIndex: 90.0 },
  'US-ATX':    { country: 'US', stateOrRegion: 'TX', subRegion: null, name: 'Austin, TX', defaultRent: 2600, colIndex: 68.0 },
  'US-HOU':    { country: 'US', stateOrRegion: 'TX', subRegion: null, name: 'Houston, TX', defaultRent: 2200, colIndex: 63.9 },
  'US-SF':     { country: 'US', stateOrRegion: 'CA', subRegion: null, name: 'San Francisco', defaultRent: 3500, colIndex: 95.2 },
  'US-SD':     { country: 'US', stateOrRegion: 'CA', subRegion: null, name: 'San Diego', defaultRent: 3332, colIndex: 80.0 },
  'US-MIA':    { country: 'US', stateOrRegion: 'FL', subRegion: null, name: 'Miami', defaultRent: 2800, colIndex: 82.8 },
  'US-BOS':    { country: 'US', stateOrRegion: 'MA', subRegion: null, name: 'Boston', defaultRent: 3477, colIndex: 92.0 },
  'US-SEA':    { country: 'US', stateOrRegion: 'WA', subRegion: null, name: 'Seattle', defaultRent: 2500, colIndex: 85.0 },
  'US-CHI':    { country: 'US', stateOrRegion: 'IL', subRegion: null, name: 'Chicago', defaultRent: 2471, colIndex: 78.0 },
  'US-DEN':    { country: 'US', stateOrRegion: 'CO', subRegion: null, name: 'Denver', defaultRent: 2079, colIndex: 73.0 },
  'US-DC':     { country: 'US', stateOrRegion: 'DC', subRegion: null, name: 'Washington DC', defaultRent: 2735, colIndex: 88.0 },
  'US-ATL':    { country: 'US', stateOrRegion: 'GA', subRegion: null, name: 'Atlanta', defaultRent: 1968, colIndex: 71.0 },
  'US-PHX':    { country: 'US', stateOrRegion: 'AZ', subRegion: null, name: 'Phoenix', defaultRent: 1787, colIndex: 70.0 },

  // ── Israel ──
  'IL-TLV':    { country: 'IL', stateOrRegion: null, name: 'Tel Aviv', defaultRent: 8000, colIndex: 100.1 },
  'IL-JER':    { country: 'IL', stateOrRegion: null, name: 'Jerusalem', defaultRent: 6000, colIndex: 89.3 },
  'IL-HFA':    { country: 'IL', stateOrRegion: null, name: 'Haifa', defaultRent: 3500, colIndex: 86.4 },

  // ── United Kingdom ──
  'UK-LON':    { country: 'UK', stateOrRegion: null, name: 'London', defaultRent: 2200, colIndex: 87.9 },
  'UK-MAN':    { country: 'UK', stateOrRegion: null, name: 'Manchester', defaultRent: 1300, colIndex: 66.5 },
  'UK-EDI':    { country: 'UK', stateOrRegion: null, name: 'Edinburgh', defaultRent: 1400, colIndex: 71.1 },

  // ── Ireland ──
  'IE-DUB':    { country: 'IE', stateOrRegion: null, name: 'Dublin', defaultRent: 2100, colIndex: 74.4 },
  'IE-COR':    { country: 'IE', stateOrRegion: null, name: 'Cork', defaultRent: 1700, colIndex: 71.3 },

  // ── Germany ──
  'DE-BER':    { country: 'DE', stateOrRegion: null, name: 'Berlin', defaultRent: 1500, colIndex: 70.4 },
  'DE-MUC':    { country: 'DE', stateOrRegion: null, name: 'Munich', defaultRent: 1800, colIndex: 75.6 },
  'DE-FRA':    { country: 'DE', stateOrRegion: null, name: 'Frankfurt', defaultRent: 1400, colIndex: 72.7 },

  // ── France ──
  'FR-PAR':    { country: 'FR', stateOrRegion: null, name: 'Paris', defaultRent: 1800, colIndex: 78.1 },
  'FR-LYO':    { country: 'FR', stateOrRegion: null, name: 'Lyon', defaultRent: 900, colIndex: 72.3 },

  // ── Netherlands ──
  'NL-AMS':    { country: 'NL', stateOrRegion: null, name: 'Amsterdam', defaultRent: 2050, colIndex: 81.2 },
  'NL-RTM':    { country: 'NL', stateOrRegion: null, name: 'Rotterdam', defaultRent: 1500, colIndex: 74.3 },

  // ── Switzerland ──
  'CH-ZRH':    { country: 'CH', stateOrRegion: 'ZH', name: 'Zurich', defaultRent: 2900, colIndex: 121.6 },
  'CH-GVA':    { country: 'CH', stateOrRegion: 'GE', name: 'Geneva', defaultRent: 1900, colIndex: 116.6 },

  // ── Canada ──
  'CA-TOR':    { country: 'CA', stateOrRegion: 'ON', name: 'Toronto', defaultRent: 2500, colIndex: 65.4 },
  'CA-VAN':    { country: 'CA', stateOrRegion: 'BC', name: 'Vancouver', defaultRent: 2700, colIndex: 67.4 },
  'CA-MTL':    { country: 'CA', stateOrRegion: 'QC', name: 'Montreal', defaultRent: 1900, colIndex: 60.0 },

  // ── Australia ──
  'AU-SYD':    { country: 'AU', stateOrRegion: null, name: 'Sydney', defaultRent: 3000, colIndex: 79.0 },
  'AU-MEL':    { country: 'AU', stateOrRegion: null, name: 'Melbourne', defaultRent: 2300, colIndex: 76.6 },

  // ── Singapore ──
  'SG-SIN':    { country: 'SG', stateOrRegion: null, name: 'Singapore', defaultRent: 4000, colIndex: 87.9 },

  // ── Japan ──
  'JP-TYO':    { country: 'JP', stateOrRegion: null, name: 'Tokyo', defaultRent: 220000, colIndex: 54.1 },
  'JP-OSA':    { country: 'JP', stateOrRegion: null, name: 'Osaka', defaultRent: 150000, colIndex: 42.8 },

  // ── Spain ──
  'ES-MAD':    { country: 'ES', stateOrRegion: 'MAD', name: 'Madrid', defaultRent: 1150, colIndex: 58.6 },
  'ES-BCN':    { country: 'ES', stateOrRegion: 'CAT', name: 'Barcelona', defaultRent: 1550, colIndex: 59.0 },

  // ── Italy ──
  'IT-MIL':    { country: 'IT', stateOrRegion: 'LOM', name: 'Milan', defaultRent: 1400, colIndex: 74.4 },
  'IT-ROM':    { country: 'IT', stateOrRegion: 'LAZ', name: 'Rome', defaultRent: 1200, colIndex: 60.2 },

  // ── Portugal ──
  'PT-LIS':    { country: 'PT', stateOrRegion: null, name: 'Lisbon', defaultRent: 1250, colIndex: 54.0 },
  'PT-POR':    { country: 'PT', stateOrRegion: null, name: 'Porto', defaultRent: 1000, colIndex: 49.5 },

  // ── Scandinavia ──
  'SE-STO':    { country: 'SE', stateOrRegion: null, name: 'Stockholm', defaultRent: 16000, colIndex: 79.6 },
  'DK-CPH':    { country: 'DK', stateOrRegion: null, name: 'Copenhagen', defaultRent: 14000, colIndex: 84.2 },
  'NO-OSL':    { country: 'NO', stateOrRegion: null, name: 'Oslo', defaultRent: 20000, colIndex: 96.5 },

  // ── UAE ──
  'AE-DXB':    { country: 'AE', stateOrRegion: null, name: 'Dubai', defaultRent: 8600, colIndex: 61.3 },
  'AE-AUH':    { country: 'AE', stateOrRegion: null, name: 'Abu Dhabi', defaultRent: 7344, colIndex: 51.4 },

  // ── Poland ──
  'PL-WAW':    { country: 'PL', stateOrRegion: null, name: 'Warsaw', defaultRent: 4446, colIndex: 52.4 },
  'PL-KRK':    { country: 'PL', stateOrRegion: null, name: 'Kraków', defaultRent: 3526, colIndex: 49.7 },
};

// Attach `locations: string[]` to each country in COUNTRIES.
for (const code of Object.keys(COUNTRIES)) {
  COUNTRIES[code].locations = Object.entries(LOCATIONS)
    .filter(([, loc]) => loc.country === code)
    .map(([key]) => key);
}
