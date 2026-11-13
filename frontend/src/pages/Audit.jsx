import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinancialSummary, getCashFlow } from '../services/auditService';
import Cargando from '../components/Cargando';
import { API_URL } from '../config/api';

const Audit = () => {
    const navigate = useNavigate();
    
    // Saca al usuario del almacenamiento y verifica si cuenta con permisos de administrador
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const rolUsuario = (user.rol || user.ROL || '').toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';

    const [financialsOriginal, setFinancialsOriginal] = useState([]);
    const [cashFlowOriginal, setCashFlowOriginal] = useState([]);
    
    const [financials, setFinancials] = useState([]);
    const [cashFlow, setCashFlow] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
    const [gerenteSucursalNombre, setGerenteSucursalNombre] = useState('');

    useEffect(() => {
        // Carga los datos financieros y de flujo de efectivo en paralelo con un tiempo mínimo de espera
        const cargarDatosAuditoria = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const [finData, flowData] = await Promise.all([
                    getFinancialSummary(),
                    getCashFlow(),
                    tiempoMinimo
                ]);

                // Normaliza los datos financieros por si vienen en mayúsculas o minúsculas
                const finNormalizados = (finData || []).map(item => ({
                    id_sucursal: item.id_sucursal || item.ID_SUCURSAL,
                    nombre_ubicacion: item.nombre_ubicacion || item.NOMBRE_UBICACION || item.sucursal || 'Principal',
                    saldo_caja: Number(item.saldo_caja || item.SALDO_CAJA || 0),
                    gasto_planilla: Number(item.gasto_planilla || item.GASTO_PLANILLA || 0),
                    valor_activos_fijos: Number(item.valor_activos_fijos || item.VALOR_ACTIVOS_FIJOS || 0)
                }));

                // Normaliza los movimientos del flujo de caja
                const flowNormalizados = (flowData || []).map(mov => ({
                    id_movimiento: mov.id_movimiento || mov.ID_MOVIMIENTO,
                    fecha_hora: mov.fecha_hora || mov.FECHA_HORA || mov.fecha || 'N/D',
                    sucursal: mov.sucursal || mov.SUCURSAL || 'Principal',
                    concepto: mov.concepto || mov.CONCEPTO || 'Movimiento de Caja',
                    tipo_movimiento: (mov.tipo_movimiento || mov.TIPO_MOVIMIENTO || 'INGRESO').toUpperCase(),
                    monto: Number(mov.monto || mov.MONTO || 0)
                }));

                setFinancialsOriginal(finNormalizados);
                setCashFlowOriginal(flowNormalizados);

                if (!esAdmin) {
                    try {
                        const res = await fetch(`${API_URL}/api/usuarios`);
                        const data = await res.json();
                        if (data.success) {
                            const usuarioBuscado = (user.usuario || user.username || user.nombre || '').toString().toLowerCase();
                            const currentUser = (data.data || []).find(u => {
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

    useEffect(() => {
        // Filtra los datos financieros y de flujo según la sucursal o el rol del usuario
        if (!esAdmin && gerenteSucursalNombre) {
            const filteredFinancials = financialsOriginal.filter(
                (item) => item.nombre_ubicacion.toLowerCase() === gerenteSucursalNombre.toLowerCase()
            );
            setFinancials(filteredFinancials);

            const filteredCashFlow = cashFlowOriginal.filter(
                (mov) => mov.sucursal.toLowerCase() === gerenteSucursalNombre.toLowerCase()
            );
            setCashFlow(filteredCashFlow);
        } else if (esAdmin) {
            if (sucursalSeleccionada === '') {
                setFinancials(financialsOriginal);
                setCashFlow(cashFlowOriginal);
            } else {
                const filteredFinancials = financialsOriginal.filter(
                    (item) => item.nombre_ubicacion.toLowerCase() === sucursalSeleccionada.toLowerCase()
                );
                setFinancials(filteredFinancials);

                const filteredCashFlow = cashFlowOriginal.filter(
                    (mov) => mov.sucursal.toLowerCase() === sucursalSeleccionada.toLowerCase()
                );
                setCashFlow(filteredCashFlow);
            }
        }
    }, [sucursalSeleccionada, financialsOriginal, cashFlowOriginal, esAdmin, gerenteSucursalNombre]);

    // Extrae una lista única de sucursales para llenar el selector de filtros
    const sucursalesUnicas = [...new Set(financialsOriginal.map(item => item.nombre_ubicacion))];

    // Suma los montos totales de caja, planilla y activos de los registros visibles
    const totalCaja = financials.reduce((sum, item) => sum + item.saldo_caja, 0);
    const totalPlanilla = financials.reduce((sum, item) => sum + item.gasto_planilla, 0);
    const totalActivos = financials.reduce((sum, item) => sum + item.valor_activos_fijos, 0);

    const tituloSucursalActiva = esAdmin ? sucursalSeleccionada : gerenteSucursalNombre;

    // Muestra la pantalla de carga mientras se obtienen los datos de la auditoría
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

            {esAdmin && (
                <div className="audit-filter-card">
                    <div className="filter-title">Filtrar Auditoría:</div>
                    <div className="filter-group">
                        <label>Sucursal:</label>
                        <select value={sucursalSeleccionada} onChange={(e) => setSucursalSeleccionada(e.target.value)} className="select-sucursal">
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
                    <div className="card-total-label">Total Efectivo en Caja</div>
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
                                <tr key={item.id_sucursal || index}>
                                    <td className="td-sucursal">{item.nombre_ubicacion}</td>
                                    <td className="align-right td-caja">Q {item.saldo_caja.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="align-right td-planilla">Q {item.gasto_planilla.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="align-right td-activos">Q {item.valor_activos_fijos.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
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
                    <p className="audit-vacio-texto">No hay movimientos registrados.</p>
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
                                const esIngreso = mov.tipo_movimiento === 'INGRESO';
                                return (
                                    <tr key={mov.id_movimiento || index}>
                                        <td className="td-fecha">{mov.fecha_hora}</td>
                                        <td className="td-concepto" style={{ fontWeight: 'bold' }}>{mov.sucursal}</td>
                                        <td>{mov.concepto}</td>
                                        <td>
                                            <span className={`badge-movimiento ${esIngreso ? 'ingreso' : 'egreso'}`}>
                                                {mov.tipo_movimiento}
                                            </span>
                                        </td>
                                        <td className={`align-right ${esIngreso ? 'monto-ingreso' : 'monto-egreso'}`} style={{ fontWeight: 'bold' }}>
                                            {esIngreso ? '+' : '-'} Q {mov.monto.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Audit;