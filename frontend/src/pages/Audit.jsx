import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinancialSummary, getCashFlow } from '../services/auditService';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga
import { API_URL } from '../config/api';

const Audit = () => {
    const navigate = useNavigate();
    
    // --- LÓGICA DE ROLES CORREGIDA (Leyendo localStorage igual que el Dashboard) ---
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const rolUsuario = (user.rol || user.ROL || '').toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';

    const [financialsOriginal, setFinancialsOriginal] = useState([]);
    const [cashFlowOriginal, setCashFlowOriginal] = useState([]);
    
    // Estados para los datos filtrados
    const [financials, setFinancials] = useState([]);
    const [cashFlow, setCashFlow] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
    const [gerenteSucursalNombre, setGerenteSucursalNombre] = useState('');

    useEffect(() => {
        const cargarDatosAuditoria = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const [finData, flowData] = await Promise.all([
                    getFinancialSummary(),
                    getCashFlow(),
                    tiempoMinimo
                ]);

                setFinancialsOriginal(finData || []);
                setCashFlowOriginal(flowData || []);

                if (!esAdmin) {
                    try {
                        const res = await fetch(`${API_URL}/api/usuarios`);
                        const data = await res.json();
                        if (data.success) {
                            const usuarioBuscado = (user.usuario || user.username || user.nombre || '').toString().toLowerCase();
                            const currentUser = data.data.find(u => {
                                const dbUser = (u.USERNAME || u.username || u.USUARIO || u.nombre_usuario || '').toString().toLowerCase();
                                return dbUser === usuarioBuscado;
                            });
                            
                            if (currentUser) {
                                const nombreSuc = currentUser.SUCURSAL || currentUser.sucursal || currentUser.NOMBRE_UBICACION || '';
                                setGerenteSucursalNombre(nombreSuc);
                                setSucursalSeleccionada(nombreSuc);
                            }
                        }
                    } catch (error) {
                        console.error("Error al obtener sucursal del gerente:", error);
                    }
                }
            } catch (error) {
                console.error("Error al cargar datos de auditoría:", error);
            } finally {
                setLoading(false);
            }
        };

        cargarDatosAuditoria();
    }, [esAdmin]);

    // Efecto para aplicar el filtro
    useEffect(() => {
        if (!esAdmin && gerenteSucursalNombre) {
            const filteredFinancials = financialsOriginal.filter(
                (item) => item.NOMBRE_UBICACION === gerenteSucursalNombre
            );
            setFinancials(filteredFinancials);

            const filteredCashFlow = cashFlowOriginal.filter(
                (mov) => mov.SUCURSAL === gerenteSucursalNombre
            );
            setCashFlow(filteredCashFlow);
        } else if (esAdmin) {
            if (sucursalSeleccionada === '') {
                setFinancials(financialsOriginal);
                setCashFlow(cashFlowOriginal);
            } else {
                const filteredFinancials = financialsOriginal.filter(
                    (item) => item.NOMBRE_UBICACION === sucursalSeleccionada
                );
                setFinancials(filteredFinancials);

                const filteredCashFlow = cashFlowOriginal.filter(
                    (mov) => mov.SUCURSAL === sucursalSeleccionada
                );
                setCashFlow(filteredCashFlow);
            }
        }
    }, [sucursalSeleccionada, financialsOriginal, cashFlowOriginal, esAdmin, gerenteSucursalNombre]);

    const sucursalesUnicas = [...new Set(financialsOriginal.map(item => item.NOMBRE_UBICACION))];

    // Cálculos dinámicos blindados contra nulos
    const totalCaja = financials.reduce((sum, item) => sum + Number(item.SALDO_CAJA || 0), 0);
    const totalPlanilla = financials.reduce((sum, item) => sum + Number(item.GASTO_PLANILLA || 0), 0);
    const totalActivos = financials.reduce((sum, item) => sum + Number(item.VALOR_ACTIVOS_FIJOS || 0), 0);

    const tituloSucursalActiva = esAdmin ? sucursalSeleccionada : gerenteSucursalNombre;

    if (loading) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="audit-container">
            <div className="audit-header">
                <button onClick={() => navigate('/dashboard')} className="btn-regresar">
                    ← Regresar al Dashboard
                </button>
                <div className="audit-title-container">
                    <h2>
                        Auditoría Gerencial Financiera {!esAdmin && `- ${gerenteSucursalNombre}`}
                    </h2>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            <>
                {esAdmin && (
                    <div className="audit-filter-card">
                        <div className="filter-title">Filtrar Auditoría:</div>
                        <div className="filter-group">
                            <label>Sucursal:</label>
                            <select 
                                value={sucursalSeleccionada} 
                                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                                className="select-sucursal"
                            >
                                <option value="">--- Todas las Sucursales (Consolidado) ---</option>
                                {sucursalesUnicas.map((sucursal, index) => (
                                    <option key={index} value={sucursal}>{sucursal}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="totales-grid">
                    <div className="card-total caja">
                        <div className="card-total-label">Total Efectivo en Caja{tituloSucursalActiva ? '' : 's'}</div>
                        <div className="card-total-value">Q {totalCaja.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                    <div className="card-total planilla">
                        <div className="card-total-label">Obligaciones de Planilla</div>
                        <div className="card-total-value">Q {totalPlanilla.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                    <div className="card-total activos">
                        <div className="card-total-label">Valor de Activos Fijos</div>
                        <div className="card-total-value">Q {totalActivos.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                </div>

                <div className="audit-card-section">
                    <h3 className="audit-section-title">
                        {tituloSucursalActiva ? `Saldos Actuales: ${tituloSucursalActiva}` : 'Saldos Actuales por Sucursal'}
                    </h3>
                    {financials.length === 0 ? (
                        <p className="audit-vacio-texto">No hay información financiera disponible para esta selección.</p>
                    ) : (
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Sucursal</th>
                                    <th className="align-right">Saldo en Caja (Q)</th>
                                    <th className="align-right">Gasto Planilla (Q)</th>
                                    <th className="align-right">Activos Fijos (Q)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financials.map((item, index) => (
                                    <tr key={item.ID_SUCURSAL || index}>
                                        <td className="td-sucursal">{item.NOMBRE_UBICACION || 'N/D'}</td>
                                        <td className="align-right td-caja">Q {Number(item.SALDO_CAJA || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className="align-right td-planilla">Q {Number(item.GASTO_PLANILLA || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className="align-right td-activos">Q {Number(item.VALOR_ACTIVOS_FIJOS || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="audit-card-section sin-margen-inferior">
                    <h3 className="audit-section-title">
                        Libro Mayor: Historial de Flujo de Efectivo {tituloSucursalActiva && `(${tituloSucursalActiva})`}
                    </h3>
                    {cashFlow.length === 0 ? (
                        <p className="audit-vacio-texto">No hay movimientos registrados en {tituloSucursalActiva ? 'esta sucursal' : 'las cajas'}.</p>
                    ) : (
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Sucursal</th>
                                    <th>Concepto</th>
                                    <th>Tipo</th>
                                    <th className="align-right">Monto (Q)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cashFlow.map((mov, index) => {
                                    const esIngreso = mov.TIPO_MOVIMIENTO === 'INGRESO';
                                    const montoSeguro = Number(mov.MONTO || 0);
                                    return (
                                        <tr key={mov.ID_MOVIMIENTO || index}>
                                            <td className="td-fecha">{mov.FECHA_HORA || 'N/D'}</td>
                                            <td className="td-concepto" style={{ fontWeight: 'bold' }}>{mov.SUCURSAL || 'N/D'}</td>
                                            <td>{mov.CONCEPTO || 'N/D'}</td>
                                            <td>
                                                <span className={`badge-movimiento ${esIngreso ? 'ingreso' : 'egreso'}`}>
                                                    {mov.TIPO_MOVIMIENTO || 'N/D'}
                                                </span>
                                            </td>
                                            <td className={`align-right ${esIngreso ? 'monto-ingreso' : 'monto-egreso'}`} style={{ fontWeight: 'bold' }}>
                                                {esIngreso ? '+' : '-'} Q {montoSeguro.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </>
        </div>
    );
};

export default Audit;