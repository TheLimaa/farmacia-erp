import axios from 'axios';
import { API_URL } from '../config/api';

const AUDIT_API = API_URL + '/api/audit';

// Pide al servidor el resumen financiero consolidado y devuelve los datos obtenidos
export const getFinancialSummary = async () => {
    try {
        const response = await axios.get(`${AUDIT_API}/financial-summary`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching financial summary:', error);
        return [];
    }
};

// Solicita al servidor el historial del flujo de efectivo y retorna los registros obtenidos
export const getCashFlow = async () => {
    try {
        const response = await axios.get(`${AUDIT_API}/cash-flow`);
        return response.data.data;
    } catch (error) {
        console.error('Error fetching cash flow:', error);
        return [];
    }
};