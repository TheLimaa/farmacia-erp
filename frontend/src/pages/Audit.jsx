import { useState, useEffect } from 'react';
import { getFinancialSummary } from '../services/auditService';

const Audit = () => {
    const [financials, setFinancials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getFinancialSummary().then(data => {
            setFinancials(data);
            setLoading(false);
        });
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Auditoría Gerencial - Control Financiero e Inversión</h2>
            <p>Monitoreo en tiempo real de sucursales (Malls y Gasolineras)</p>

            {loading ? (
                <p>Cargando datos de auditoría...</p>
            ) : (
                <table border="1" cellPadding="10" style={{ width: '100%', textAlign: 'left', marginTop: '20px' }}>
                    <thead>
                        <tr>
                            <th>Sucursal</th>
                            <th>Tipo</th>
                            <th>Saldo en Caja</th>
                            <th>Gasto Planilla</th>
                            <th>Activos Fijos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {financials.map((item) => (
                            <tr key={item.ID_SUCURSAL}>
                                <td>{item.NOMBRE_UBICACION}</td>
                                <td>{item.TIPO_UBICACION}</td>
                                <td>Q {item.SALDO_CAJA.toLocaleString()}</td>
                                <td>Q {item.GASTO_PLANILLA.toLocaleString()}</td>
                                <td>Q {item.VALOR_ACTIVOS_FIJOS.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Audit;