import {
    mockCities,
    mockCountries,
    mockDepartments,
    mockEmployees,
    mockJobTitles,
    mockPayrollPayments,
    mockStates,
} from '../data/mockData.js';

const normalizeRows = (rows) => (Array.isArray(rows) ? rows : []);

export const createMockProvider = () => ({
    mode: 'mock',
    async health() {
        return {
            ok: true,
            provider: 'mock',
            message: 'Bridge en modo mock',
        };
    },
    async exportDepartments() {
        return normalizeRows(mockDepartments);
    },
    async exportJobTitles() {
        return normalizeRows(mockJobTitles);
    },
    async exportEmployees() {
        return normalizeRows(mockEmployees);
    },
    async exportCountries() {
        return normalizeRows(mockCountries);
    },
    async exportStates() {
        return normalizeRows(mockStates);
    },
    async exportCities() {
        return normalizeRows(mockCities);
    },
    async exportPayrollPayments() {
        return normalizeRows(mockPayrollPayments);
    },
});
