import { API_URL } from '../config/api';

const API_URL = '' + API_URL + '/api';

// Consulta al servidor las métricas principales del tablero y devuelve los datos si la respuesta es exitosa
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