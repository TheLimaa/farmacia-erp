import { API_URL } from '../config/api';

const API_URL = '' + API_URL + '/api';

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