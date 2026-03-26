export const normalizeText = (value) => String(value || '').trim();

export const normalizeKey = (value) => normalizeText(value).toLowerCase();

export const normalizeToken = (value) => (
  normalizeText(value)
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
);

export const toTitleCase = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return '';

  return normalized
    .toLocaleLowerCase('es-MX')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase('es-MX')}${word.slice(1)}`)
    .join(' ');
};

export const toHumanName = (value, fallback = 'Sin nombre') => {
  const transformed = toTitleCase(value);
  return transformed || fallback;
};

export const buildFullName = (firstName, lastName, fallback = 'Sin nombre') => {
  const fullName = [toTitleCase(firstName), toTitleCase(lastName)]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || fallback;
};

export const getInitials = (value, { maxTokens = 2, fallback = 'NA' } = {}) => {
  const tokens = normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxTokens);

  if (tokens.length === 0) return fallback;
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return tokens.map((token) => token[0] || '').join('').toUpperCase();
};
