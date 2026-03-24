const DEPARTMENT_TONES = ['indigo', 'teal', 'emerald', 'amber', 'violet', 'rose', 'sky'];

const DEPARTMENT_TONE_BY_KEY = {
  administracion: 'indigo',
  ventas: 'emerald',
  produccion: 'amber',
  operaciones: 'teal',
  'post venta': 'sky',
  sistemas: 'violet',
  'recursos humanos': 'rose',
};

const normalizeToken = (value) => (
  String(value || '')
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
);

export const getDepartmentTone = (departmentName) => {
  const key = normalizeToken(departmentName);
  if (!key || key === 'sin departamento' || key === 'todos los departamentos' || key === 'sin dato') {
    return 'slate';
  }

  if (DEPARTMENT_TONE_BY_KEY[key]) {
    return DEPARTMENT_TONE_BY_KEY[key];
  }

  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(index);
    hash |= 0;
  }

  return DEPARTMENT_TONES[Math.abs(hash) % DEPARTMENT_TONES.length];
};

