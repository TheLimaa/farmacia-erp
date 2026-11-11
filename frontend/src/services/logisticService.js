import axios from 'axios';
import { API_URL } from '../config/api';

// Si necesitas un prefijo para logística, usa otro nombre, por ejemplo:
const LOGISTIC_API = API_URL + '/api/logistic'; // (o como tengas tu ruta)

export const getTraslados = async () => {
    try {
        const response = await axios.get(`${LOGISTIC_API}/traslados`); // o la ruta que uses
        return response.data.data;
    } catch (error) {
        console.error("Error al obtener traslados:", error);
        return [];
    }
};