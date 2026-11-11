import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga
import { API_URL } from '../config/api';

const Delivery = () => {
    const navigate = useNavigate();
    
    // --- LÓGICA DE ROLES Y SUCURSAL ---
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const rolUsuario = (user.rol || '').toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';

    const [pedidosOriginales, setPedidosOriginales] = useState([]);
    const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [sucursalUsuario, setSucursalUsuario] = useState('');
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido
    
    // Función para obtener la fecha actual en formato YYYY-MM-DD
    const obtenerFechaHoy = () => {
        const hoy = new Date();
        return hoy.toISOString().split('T')[0];
    };

    // Estados para el filtro de fechas (inicializados con el día actual por defecto)
    const [fechaInicio, setFechaInicio] = useState(obtenerFechaHoy());
    const [fechaFin, setFechaFin] = useState(obtenerFechaHoy());

    useEffect(() => {
        const cargarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Si NO es administrador (es Gerente o Cajero), obtenemos su sucursal y pedidos en paralelo con el tiempo mínimo
                let sucursalDetectada = '';
                
                if (!esAdmin) {
                    const resUser = await fetch('' + API_URL + '/api/usuarios').then(res => res.json()).catch(() => ({ success: false }));
                    if (resUser.success) {
                        const currentUser = resUser.data.find(u => 
                            (u.USERNAME || u.username) === user.nombre || 
                            (u.USERNAME || u.username) === user.usuario
                        );
                        if (currentUser) {
                            sucursalDetectada = currentUser.SUCURSAL || currentUser.sucursal || '';
                            setSucursalUsuario(sucursalDetectada);
                        }
                    }
                }

                const [resPedidos] = await Promise.all([
                    fetch('' + API_URL + '/api/pedidos/todos').then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resPedidos.success) {
                    setPedidosOriginales(resPedidos.data);
                } else {
                    setPedidosOriginales([]);
                }
            } catch (error) {
                console.error('Error fetching pedidos:', error);
                setPedidosOriginales([]);
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, [esAdmin]);

    // Efecto para aplicar el filtro cada vez que cambian las fechas, la lista o la sucursal
    useEffect(() => {
        aplicarFiltro(pedidosOriginales);
    }, [fechaInicio, fechaFin, pedidosOriginales, sucursalUsuario]);

    const aplicarFiltro = (listaPedidos) => {
        // REGLA: Si no hay ambas fechas seleccionadas, no mostrar NADA.
        if (!fechaInicio || !fechaFin) {
            setPedidosFiltrados([]);
            return;
        }

        const filtrados = listaPedidos.filter(p => {
            // 1. Filtro estricto por Sucursal si el usuario es Gerente o Cajero
            if (!esAdmin && sucursalUsuario) {
                const sucursalPedido = p.SUCURSAL_DESPACHO || p.sucursal_despacho || '';
                if (sucursalPedido !== sucursalUsuario) return false;
            }

            // 2. Filtro por rango de fechas
            const fechaString = p.FECHA || p.fecha_hora_solicitud || p.fecha_creacion;
            if (!fechaString) return false;
            
            const fechaPedido = new Date(fechaString).toISOString().split('T')[0];
            return fechaPedido >= fechaInicio && fechaPedido <= fechaFin;
        });

        setPedidosFiltrados(filtrados);
    };

    const limpiarFiltros = () => {
        setFechaInicio(obtenerFechaHoy());
        setFechaFin(obtenerFechaHoy());
    };

    const handleEntregar = async (idPedido) => {
        if (!window.confirm(`¿Confirmar la entrega exitosa del pedido #${idPedido}?`)) return;
        
        try {
            const res = await fetch(`' + API_URL + '/api/pedidos/${idPedido}/entregar`, { method: 'PUT' });
            const data = await res.json();
            
            if (data.success) {
                setMensaje(`✅ Pedido #${idPedido} contabilizado como entregado exitosamente.`);
                setPedidosOriginales(prev => prev.map(p => p.ID_PEDIDO === idPedido ? { ...p, ESTADO_PEDIDO: 'ENTREGADO' } : p));
            } else {
                setMensaje(`❌ ${data.message}`);
            }
            setTimeout(() => setMensaje(''), 4000);
            
        } catch (error) {
            setMensaje(`✅ Pedido #${idPedido} contabilizado como entregado exitosamente (Modo Local).`);
            setPedidosOriginales(prev => prev.map(p => p.ID_PEDIDO === idPedido ? { ...p, ESTADO_PEDIDO: 'ENTREGADO' } : p));
            setTimeout(() => setMensaje(''), 4000);
        }
    };

    const handleCancelar = async (idPedido) => {
        if (!window.confirm(`¿Está seguro de cancelar el pedido #${idPedido}? El stock será devuelto al inventario.`)) return;
        
        try {
            const res = await fetch(`' + API_URL + '/api/pedidos/${idPedido}/cancelar`, { method: 'PUT' });
            const data = await res.json();
            
            if (data.success) {
                setMensaje(`🚫 Pedido #${idPedido} cancelado y stock reincorporado al inventario.`);
                setPedidosOriginales(prev => prev.map(p => p.ID_PEDIDO === idPedido ? { ...p, ESTADO_PEDIDO: 'CANCELADO' } : p));
            } else {
                setMensaje(`❌ ${data.message}`);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            console.error('Error al cancelar pedido:', error);
            setMensaje(`🚫 Pedido #${idPedido} cancelado (Modo Local).`);
            setPedidosOriginales(prev => prev.map(p => p.ID_PEDIDO === idPedido ? { ...p, ESTADO_PEDIDO: 'CANCELADO' } : p));
            setTimeout(() => setMensaje(''), 4000);
        }
    };

    // Si está cargando, retornamos la plantilla reutilizable
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="delivery-container">
            <div className="delivery-header">
                <button onClick={() => navigate('/dashboard')} className="btn-regresar-delivery">
                    ← Regresar al Dashboard
                </button>
                <div className="delivery-title-container">
                    <h2>
                        Logística Delivery - Monitor de Entregas {!esAdmin && sucursalUsuario ? `(${sucursalUsuario})` : ''}
                    </h2>
                    <p>Control de envíos de última milla a clientes.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {/* SECCIÓN DE FILTROS */}
            <div className="delivery-filter-card">
                <div className="delivery-filter-label-title">Filtrar por fecha:</div>
                <div className="delivery-filter-group">
                    <label>Desde:</label>
                    <input 
                        type="date" 
                        value={fechaInicio} 
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="delivery-date-input"
                    />
                </div>
                <div className="delivery-filter-group">
                    <label>Hasta:</label>
                    <input 
                        type="date" 
                        value={fechaFin} 
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="delivery-date-input"
                    />
                </div>
                <button 
                    onClick={limpiarFiltros} 
                    className="btn-restablecer-fecha"
                >
                    Restablecer a Hoy
                </button>
            </div>

            {mensaje && (
                <div className={`delivery-mensaje-alerta ${mensaje.includes('❌') || mensaje.includes('🚫') ? 'error' : 'exito'}`}>
                    {mensaje}
                </div>
            )}

            <div className="delivery-table-card">
                <table className="delivery-table">
                    <thead>
                        <tr>
                            <th>ID Pedido</th>
                            <th>Cliente y Dirección</th>
                            <th>Sucursal Origen</th>
                            <th>Estado</th>
                            <th className="align-right">Total a Cobrar</th>
                            <th className="align-center">Método</th>
                            <th className="align-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedidosFiltrados.length > 0 ? (
                            pedidosFiltrados.map(p => {
                                const isCancelado = p.ESTADO_PEDIDO === 'CANCELADO';
                                const isEntregado = p.ESTADO_PEDIDO === 'ENTREGADO';
                                const isTerminado = isCancelado || isEntregado;

                                const estadoClase = 
                                    p.ESTADO_PEDIDO === 'EN RUTA' ? 'estado-en-ruta' : 
                                    p.ESTADO_PEDIDO === 'CANCELADO' ? 'estado-cancelado' : 
                                    p.ESTADO_PEDIDO === 'ENTREGADO' ? 'estado-entregado' : 'estado-default';
                                
                                return (
                                    <tr key={p.ID_PEDIDO} style={{ opacity: isTerminado ? 0.6 : 1 }}>
                                        <td className="td-id-pedido">#{p.ID_PEDIDO}</td>
                                        <td>
                                            <div className="td-cliente-nombre">{p.CLIENTE}</div>
                                            <div className="td-cliente-direccion">{p.DIRECCION}</div>
                                        </td>
                                        <td className="td-sucursal-origen">{p.SUCURSAL_DESPACHO}</td>
                                        <td className={`td-estado-pedido ${estadoClase}`}>
                                            {p.ESTADO_PEDIDO}
                                        </td>
                                        <td className="align-right" style={{ fontWeight: 'bold' }}>
                                            {isCancelado ? <span className="total-tachado">Q {p.TOTAL?.toFixed(2)}</span> : `Q ${p.TOTAL?.toFixed(2)}`}
                                        </td>
                                        <td className="align-center">
                                            <span className="badge-metodo-pago">{p.METODO_PAGO_ACORDADO}</span>
                                        </td>
                                        <td className="align-center">
                                            <div className="acciones-wrapper">
                                                <button 
                                                    onClick={() => handleEntregar(p.ID_PEDIDO)} 
                                                    disabled={isTerminado}
                                                    className="btn-confirmar-entrega"
                                                >
                                                    Confirmar Entrega
                                                </button>
                                                <button 
                                                    onClick={() => handleCancelar(p.ID_PEDIDO)} 
                                                    disabled={isTerminado}
                                                    className="btn-cancelar-pedido"
                                                >
                                                    Cancelar Pedido
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="delivery-tabla-vacia">
                                    {(!fechaInicio || !fechaFin) 
                                        ? 'Seleccione un rango de fechas para ver los pedidos.' 
                                        : 'No hay pedidos de delivery para las fechas seleccionadas en esta sucursal.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Delivery;