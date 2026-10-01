const API_URL = 'http://localhost:3000/api';

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