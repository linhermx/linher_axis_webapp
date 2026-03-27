import { normalizeText } from './identity';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const resolveAssetUrl = (value) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return '';
  }

  if (/^https?:\/\//i.test(normalizedValue) || normalizedValue.startsWith('data:')) {
    return normalizedValue;
  }

  const cleanPath = normalizedValue.replace(/^\/+/, '');
  return `${API_ROOT_URL}/${cleanPath}`;
};
