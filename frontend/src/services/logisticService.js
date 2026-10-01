const API_URL = 'http://localhost:3000/api';

export const getTraslados = async () => {
    try {
        const res = await fetch(`${API_URL}/logistic`);
        const data = await res.json();
        return data.success ? data.data : [];
    } catch (e) {
        return [];
    }
};