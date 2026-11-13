import { API_URL } from '../config/api';

const API_URL = '' + API_URL + '/api';

// Consulta al servidor la lista de pedidos listos para entrega y devuelve los datos obtenidos o un arreglo vacío si ocurre un error
export const getPedidosEntrega = async () => {
    try {
        const response = await fetch(`${API_URL}/delivery`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Error al obtener los pedidos de entrega:', error);
        return [];
    }
};