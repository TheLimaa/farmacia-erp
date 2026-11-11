import axios from 'axios';
import { API_URL } from '../config/api';

// La ruta específica para este servicio se concatena aquí mismo:
const AUDIT_API = API_URL + '/api/audit';

export const getFinancialSummary = async () => {
    try {
        const response = await axios.get(`${AUDIT_API}/financial-summary`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching financial summary:', error);
        return [];
    }
};

export const getCashFlow = async () => {
    try {
        const response = await axios.get(`${AUDIT_API}/cash-flow`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching cash flow:', error);
        return [];
    }
};