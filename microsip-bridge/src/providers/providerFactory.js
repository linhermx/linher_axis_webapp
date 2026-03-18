import { createMockProvider } from './mockProvider.js';
import { createDllProvider } from './dllProvider.js';

const normalizeMode = (value) => String(value || '').trim().toLowerCase();

export const createProvider = (mode) => {
    const normalizedMode = normalizeMode(mode);
    if (!normalizedMode || normalizedMode === 'mock') {
        return createMockProvider();
    }

    if (normalizedMode === 'dll') {
        return createDllProvider();
    }

    throw new Error(`MICROSIP_DATA_MODE no soportado: "${mode}"`);
};
