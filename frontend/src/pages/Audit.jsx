import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinancialSummary, getCashFlow } from '../services/auditService';

const Audit = () => {
    const navigate = useNavigate();
    const [financials, setFinancials] = useState([]);
    const [cashFlow, setCashFlow] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getFinancialSummary(), getCashFlow()]).then(([finData, flowData]) => {
            setFinancials(finData);
            setCashFlow(flowData);
            setLoading(false);
        });
    }, []);

    const totalCaja = financials.reduce((sum, item) => sum + (item.SALDO_CAJA || 0), 0);
    const totalPlanilla = financials.reduce((sum, item) => sum + (item.GASTO_PLANILLA || 0), 0);
    const totalActivos = financials.reduce((sum, item) => sum + (item.VALOR_ACTIVOS_FIJOS || 0), 0);

    return (
        <div style={{ padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>
                    ← Regresar al Dashboard
                </button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: '500' }}>Auditoría Gerencial Financiera</h2>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>Cargando datos financieros...</div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '20px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
                        <div style={{ flex: 1, background: '#1c1c1e', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #34d399' }}>
                            <div style={{ color: '#888', fontSize: '13px' }}>Total Efectivo en Cajas</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Q {totalCaja.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div style={{ flex: 1, background: '#1c1c1e', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                            <div style={{ color: '#888', fontSize: '13px' }}>Obligaciones de Planilla</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Q {totalPlanilla.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div style={{ flex: 1, background: '#1c1c1e', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
                            <div style={{ color: '#888', fontSize: '13px' }}>Valor de Activos Fijos</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Q {totalActivos.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                        </div>
                    </div>

                    <div style={{ background: '#1c1c1e', padding: '25px', borderRadius: '8px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#aaa' }}>Saldos Actuales por Sucursal</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                    <th style={{ padding: '12px' }}>Sucursal</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Saldo en Caja (Q)</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Gasto Planilla (Q)</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Activos Fijos (Q)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financials.map((item) => (
                                    <tr key={item.ID_SUCURSAL} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                        <td style={{ padding: '15px 12px', color: '#ffaa00', fontWeight: 'bold' }}>{item.NOMBRE_UBICACION}</td>
                                        <td style={{ padding: '15px 12px', textAlign: 'right', color: '#34d399' }}>Q {item.SALDO_CAJA.toLocaleString()}</td>
                                        <td style={{ padding: '15px 12px', textAlign: 'right', color: '#ef4444' }}>Q {item.GASTO_PLANILLA.toLocaleString()}</td>
                                        <td style={{ padding: '15px 12px', textAlign: 'right', color: '#38bdf8' }}>Q {item.VALOR_ACTIVOS_FIJOS.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ background: '#1c1c1e', padding: '25px', borderRadius: '8px', maxWidth: '1200px', margin: '0 auto' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#aaa' }}>Libro Mayor: Historial de Flujo de Efectivo</h3>
                        {cashFlow.length === 0 ? (
                            <p style={{ color: '#666' }}>No hay movimientos registrados en las cajas.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                        <th style={{ padding: '12px' }}>Fecha y Hora</th>
                                        <th style={{ padding: '12px' }}>Sucursal</th>
                                        <th style={{ padding: '12px' }}>Concepto</th>
                                        <th style={{ padding: '12px' }}>Tipo</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Monto (Q)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashFlow.map((mov) => (
                                        <tr key={mov.ID_MOVIMIENTO} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                            <td style={{ padding: '15px 12px', color: '#aaa' }}>{mov.FECHA_HORA}</td>
                                            <td style={{ padding: '15px 12px', fontWeight: 'bold' }}>{mov.SUCURSAL}</td>
                                            <td style={{ padding: '15px 12px' }}>{mov.CONCEPTO}</td>
                                            <td style={{ padding: '15px 12px' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', background: mov.TIPO_MOVIMIENTO === 'INGRESO' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: mov.TIPO_MOVIMIENTO === 'INGRESO' ? '#34d399' : '#ef4444' }}>
                                                    {mov.TIPO_MOVIMIENTO}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold', color: mov.TIPO_MOVIMIENTO === 'INGRESO' ? '#34d399' : '#ef4444' }}>
                                                {mov.TIPO_MOVIMIENTO === 'INGRESO' ? '+' : '-'} Q {mov.MONTO.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Audit;