// URL base de tu backend local
const API_URL = 'http://localhost:3000/api';

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