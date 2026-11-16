export const MIN_WEIGHT = 20;
export const MAX_WEIGHT = 500;

export function weightJourney(start,target,current) {
  const change=Math.round((current-start)*100)/100;
  const direction=Math.sign(target-start);
  const reached=direction===0?Math.abs(current-target)<.005:direction*(current-target)>=-.005;
  const progress=direction===0?(reached?100:0):Math.max(0,Math.min(100,(current-start)/(target-start)*100));
  return {change,reached,progress,remaining:reached?0:Math.abs(current-target)};
}

// Keep decimal input strict: Number() alone also accepts exponents and hex.
export function parseWeight(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
  const weight = Number(text.replace(',', '.'));
  return weight >= MIN_WEIGHT && weight <= MAX_WEIGHT ? weight : null;
}

export function weightError(value, required = false) {
  if (String(value ?? '').trim() === '') return required ? 'Wpisz wagę.' : '';
  return parseWeight(value) === null
    ? 'Wpisz wagę od 20 do 500 kg, z maksymalnie dwoma miejscami po przecinku. Możesz użyć przecinka lub kropki.'
    : '';
}

export function formatWeight(value) {
  return Number(value).toLocaleString('pl-PL', {maximumFractionDigits: 2});
}

export function stepWeight(weight, direction) {
  const hundredths = Math.round(weight * 100) + direction;
  return Math.min(MAX_WEIGHT * 100, Math.max(MIN_WEIGHT * 100, hundredths)) / 100;
}

// A nearby 10 kg window makes the ruler useful on a phone. Typing a value
// recentres it; the +/- buttons retain the full 0.01 kg precision.
export function weightRange(weight) {
  const min = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT - 10, Math.round(weight) - 5));
  return {min, max: min + 10};
}
