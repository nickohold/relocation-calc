// Progressive bracket utilities — shared across all country tax engines.

// Apply progressive tax brackets where each bracket has a `max` and a `rate`.
// Returns total tax owed.
export const calcBrackets = (income, brackets) => {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, b.max) - prev) * b.rate;
    prev = b.max;
  }
  return tax;
};

// Width-based brackets: each entry has `width` and `rate`.
// Used by the Israeli monthly income-tax table.
export const calcWidthBrackets = (income, widthBrackets) => {
  let tax = 0;
  let remaining = income;
  for (const b of widthBrackets) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.width);
    tax += slice * b.rate;
    remaining -= slice;
  }
  return tax;
};

// Returns the marginal rate at a given income level.
export const calcMarginalAt = (income, brackets) => {
  for (const b of brackets) {
    if (income <= b.max) return b.rate;
  }
  return brackets[brackets.length - 1]?.rate ?? 0;
};
