import axios from 'axios';
import { API_URL } from '../config/api';

const LOGISTIC_API = API_URL + '/api/logistic';

// Pide al servidor la lista completa de traslados logísticos y devuelve los datos obtenidos
export const getTraslados = async () => {
    try {
        const response = await axios.get(`${LOGISTIC_API}/traslados`);
        return response.data.data;
    } catch (error) {
        console.error("Error al obtener traslados:", error);
        return [];
    }
};