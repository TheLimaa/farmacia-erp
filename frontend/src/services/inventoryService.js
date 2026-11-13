import { API_URL } from '../config/api';

const API_URL = '' + API_URL + '/api';

// Consulta al servidor el inventario y disponibilidad de stock de un medicamento específico mediante su identificador
export const checkProductStock = async (idMedicamento) => {
    try {
        const response = await fetch(`${API_URL}/inventory/stock/${idMedicamento}`);
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('Error al consultar el stock:', error);
        return [];
    }
};