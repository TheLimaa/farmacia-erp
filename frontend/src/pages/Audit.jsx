import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinancialSummary, getCashFlow } from '../services/auditService';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga

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
            // Creamos una promesa para el tiempo mínimo de carga (2 segundos = 2000ms)
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Ejecutamos las peticiones de servicios y el temporizador en paralelo
                const [finData, flowData] = await Promise.all([
                    getFinancialSummary(),
                    getCashFlow(),
                    tiempoMinimo
                ]);

                setFinancialsOriginal(finData);
                setCashFlowOriginal(flowData);

                if (!esAdmin) {
                    // Si es gerente, buscamos automáticamente su sucursal vinculada
                    try {
                        const res = await fetch('http://localhost:3000/api/usuarios');
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
                                setSucursalSeleccionada(nombreSuc); // Forzar selección del gerente a su tienda
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

    // Efecto para aplicar el filtro cada vez que cambia la sucursal seleccionada o los datos originales
    useEffect(() => {
        if (!esAdmin && gerenteSucursalNombre) {
            // Restricción estricta para Gerentes: Forzar siempre su sucursal
            const filteredFinancials = financialsOriginal.filter(
                (item) => item.NOMBRE_UBICACION === gerenteSucursalNombre
            );
            setFinancials(filteredFinancials);

            const filteredCashFlow = cashFlowOriginal.filter(
                (mov) => mov.SUCURSAL === gerenteSucursalNombre
            );
            setCashFlow(filteredCashFlow);
        } else if (esAdmin) {
            // Lógica para Administradores
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

    // Extraer lista de sucursales únicas para el dropdown (Solo Admin)
    const sucursalesUnicas = [...new Set(financialsOriginal.map(item => item.NOMBRE_UBICACION))];

    // Cálculos dinámicos basados en la información filtrada
    const totalCaja = financials.reduce((sum, item) => sum + (item.SALDO_CAJA || 0), 0);
    const totalPlanilla = financials.reduce((sum, item) => sum + (item.GASTO_PLANILLA || 0), 0);
    const totalActivos = financials.reduce((sum, item) => sum + (item.VALOR_ACTIVOS_FIJOS || 0), 0);

    const tituloSucursalActiva = esAdmin ? sucursalSeleccionada : gerenteSucursalNombre;

    // Si está cargando, retornamos la plantilla reutilizable con el mensaje adecuado
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
                {/* SECCIÓN DEL FILTRO: SOLO SE MUESTRA SI ES ADMINISTRADOR */}
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

                {/* TARJETAS DE TOTALES */}
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

                {/* TABLA DE SALDOS */}
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
                                {financials.map((item) => (
                                    <tr key={item.ID_SUCURSAL}>
                                        <td className="td-sucursal">{item.NOMBRE_UBICACION}</td>
                                        <td className="align-right td-caja">Q {item.SALDO_CAJA.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className="align-right td-planilla">Q {item.GASTO_PLANILLA.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className="align-right td-activos">Q {item.VALOR_ACTIVOS_FIJOS.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* TABLA DE FLUJO DE EFECTIVO */}
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
                                {cashFlow.map((mov) => {
                                    const esIngreso = mov.TIPO_MOVIMIENTO === 'INGRESO';
                                    return (
                                        <tr key={mov.ID_MOVIMIENTO}>
                                            <td className="td-fecha">{mov.FECHA_HORA}</td>
                                            <td className="td-concepto" style={{ fontWeight: 'bold' }}>{mov.SUCURSAL}</td>
                                            <td>{mov.CONCEPTO}</td>
                                            <td>
                                                <span className={`badge-movimiento ${esIngreso ? 'ingreso' : 'egreso'}`}>
                                                    {mov.TIPO_MOVIMIENTO}
                                                </span>
                                            </td>
                                            <td className={`align-right ${esIngreso ? 'monto-ingreso' : 'monto-egreso'}`} style={{ fontWeight: 'bold' }}>
                                                {esIngreso ? '+' : '-'} Q {mov.MONTO.toLocaleString('en-US', {minimumFractionDigits: 2})}
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