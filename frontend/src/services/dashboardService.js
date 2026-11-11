import { API_URL } from '../config/api';

const API_URL = '' + API_URL + '/api';

export const getMetrics = async () => {
    try {
        const response = await fetch(`${API_URL}/dashboard/metrics`);
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('Error al obtener métricas:', error);
        return null;
    }
};