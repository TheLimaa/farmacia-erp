import { useState, useEffect } from 'react';
import { getTraslados } from '../services/logisticService';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga


const Logistic = () => {
    const [traslados, setTraslados] = useState([]);
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido

    useEffect(() => {
        const cargarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Ejecutamos la petición del servicio y el temporizador en paralelo
                const [data] = await Promise.all([
                    getTraslados(),
                    tiempoMinimo
                ]);

                setTraslados(data || []);
            } catch (error) {
                console.error("Error al cargar traslados:", error);
                setTraslados([]);
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, []);

    // Si está cargando, retornamos la plantilla reutilizable
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>Logística - Movimiento de Medicamentos</h2>
            <p>Control de traslados entre centros comerciales y stands de gasolineras</p>
            <table border="1" cellPadding="10" style={{ width: '100%', marginTop: '20px', textAlign: 'left' }}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {traslados.map(t => (
                        <tr key={t.ID_TRASLADO}>
                            <td>{t.ID_TRASLADO}</td>
                            <td>{t.ORIGEN}</td>
                            <td>{t.DESTINO}</td>
                            <td style={{ color: 'cyan' }}>{t.ESTADO_TRASLADO}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Logistic;