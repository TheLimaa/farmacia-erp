const API_URL = 'http://localhost:3000/api';

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