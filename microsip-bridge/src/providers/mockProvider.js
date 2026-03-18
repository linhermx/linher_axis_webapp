import {
    mockDepartments,
    mockEmployees,
    mockJobTitles,
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
});
