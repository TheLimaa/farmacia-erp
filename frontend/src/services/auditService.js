import axios from 'axios';

const API_URL = 'http://localhost:3000/api/audit';

export const getFinancialSummary = async () => {
    try {
        const response = await axios.get(`${API_URL}/financial-summary`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching financial summary:', error);
        return [];
    }
};

export const getCashFlow = async () => {
    try {
        const response = await axios.get(`${API_URL}/cash-flow`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching cash flow:', error);
        return [];
    }
};