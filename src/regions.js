// Region grouping + flag emoji per country code.
// Used by the Destination Explorer to filter the leaderboard by region.

export const COUNTRY_REGION = {
  US: 'Americas', CA: 'Americas',
  UK: 'Europe',   IE: 'Europe', DE: 'Europe', FR: 'Europe', NL: 'Europe',
  CH: 'Europe',   ES: 'Europe', IT: 'Europe', PT: 'Europe', SE: 'Europe',
  DK: 'Europe',   NO: 'Europe', PL: 'Europe',
  IL: 'MENA',     AE: 'MENA',
  SG: 'Asia',     JP: 'Asia',
  AU: 'Oceania',
};

export const COUNTRY_FLAG = {
  US: '🇺🇸', CA: '🇨🇦', UK: '🇬🇧', IE: '🇮🇪', DE: '🇩🇪', FR: '🇫🇷',
  NL: '🇳🇱', CH: '🇨🇭', ES: '🇪🇸', IT: '🇮🇹', PT: '🇵🇹', SE: '🇸🇪',
  DK: '🇩🇰', NO: '🇳🇴', PL: '🇵🇱', IL: '🇮🇱', AE: '🇦🇪', SG: '🇸🇬',
  JP: '🇯🇵', AU: '🇦🇺',
};

export const REGIONS = ['Americas', 'Europe', 'MENA', 'Asia', 'Oceania'];

export const regionForLocation = (loc) => COUNTRY_REGION[loc?.country] ?? 'Other';
export const flagForLocation = (loc) => COUNTRY_FLAG[loc?.country] ?? '🏳️';
