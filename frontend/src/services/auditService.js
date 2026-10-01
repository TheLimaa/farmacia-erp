const API_URL = 'http://localhost:3000/api';

export const getFinancialSummary = async () => {
    try {
        const response = await fetch(`${API_URL}/audit/financial-summary`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error al obtener el resumen financiero:', error);
        return [];
    }
};