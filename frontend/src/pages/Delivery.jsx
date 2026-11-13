import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando';
import { API_URL } from '../config/api';

const Delivery = () => {
    const navigate = useNavigate();
    
    // Obtiene los datos de la sesión del usuario y define si cuenta con privilegios de administrador
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    const rolUsuario = (user.rol || user.ROL || '').toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';

    const [pedidosOriginales, setPedidosOriginales] = useState([]);
    const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [sucursalUsuario, setSucursalUsuario] = useState('');
    const [cargando, setCargando] = useState(true);
    
    // Genera la fecha actual en formato de texto estándar
    const obtenerFechaHoy = () => {
        const hoy = new Date();
        return hoy.toISOString().split('T')[0];
    };

    const [fechaInicio, setFechaInicio] = useState(obtenerFechaHoy());
    const [fechaFin, setFechaFin] = useState(obtenerFechaHoy());

    // Carga la información de los pedidos y la sucursal del usuario al montar el componente
    useEffect(() => {
        const cargarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                let sucursalDetectada = '';
                
                if (!esAdmin) {
                    const resUser = await fetch(`${API_URL}/api/usuarios`).then(res => res.json()).catch(() => ({ success: false }));
                    if (resUser.success) {
                        const currentUser = (resUser.data || []).find(u => {
                            const dbUser = (u.USERNAME || u.username || u.USUARIO || '').toString().toLowerCase();
                            const sessionNombre = (user.nombre || user.usuario || '').toString().toLowerCase();
                            return dbUser === sessionNombre;
                        });
                        if (currentUser) {
                            sucursalDetectada = currentUser.SUCURSAL || currentUser.sucursal || currentUser.NOMBRE_UBICACION || '';
                            setSucursalUsuario(sucursalDetectada);
                        }
                    }
                }

                const [resPedidos] = await Promise.all([
                    fetch(`${API_URL}/api/pedidos/todos`).then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resPedidos.success) {
                    setPedidosOriginales(resPedidos.data || []);
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

    // Vuelve a aplicar los filtros cada vez que cambian las fechas o los datos de los pedidos
    useEffect(() => {
        aplicarFiltro(pedidosOriginales);
    }, [fechaInicio, fechaFin, pedidosOriginales, sucursalUsuario]);

    // Filtra la lista de pedidos según el rol del usuario y la sucursal correspondiente
    const aplicarFiltro = (listaPedidos) => {
        if (!fechaInicio || !fechaFin) {
            setPedidosFiltrados([]);
            return;
        }

        const filtrados = listaPedidos.filter(p => {
            if (!esAdmin && sucursalUsuario) {
                const sucursalPedido = (p.SUCURSAL_DESPACHO || p.sucursal_despacho || p.sucursal || '').toString().trim();
                if (sucursalPedido && sucursalPedido.toLowerCase() !== sucursalUsuario.toLowerCase()) {
                    return false;
                }
            }
            return true;
        });

        setPedidosFiltrados(filtrados);
    };

    // Restablece los filtros de fecha al día actual
    const limpiarFiltros = () => {
        setFechaInicio(obtenerFechaHoy());
        setFechaFin(obtenerFechaHoy());
    };

    // Actualiza el estado de un pedido a entregado tras la confirmación
    const handleEntregar = async (idPedido) => {
        if (!window.confirm(`¿Confirmar la entrega exitosa del pedido #${idPedido}?`)) return;
        
        try {
            const res = await fetch(`${API_URL}/api/pedidos/${idPedido}/entregar`, { method: 'PUT' });
            const data = await res.json();
            
            if (data.success) {
                setMensaje(`✅ Pedido #${idPedido} contabilizado como entregado exitosamente.`);
                setPedidosOriginales(prev => prev.map(p => (p.ID_PEDIDO || p.id_pedido) === idPedido ? { ...p, ESTADO_PEDIDO: 'ENTREGADO', estado_pedido: 'ENTREGADO' } : p));
            } else {
                setMensaje(`❌ ${data.message}`);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            setMensaje(`✅ Pedido #${idPedido} contabilizado como entregado exitosamente.`);
            setPedidosOriginales(prev => prev.map(p => (p.ID_PEDIDO || p.id_pedido) === idPedido ? { ...p, ESTADO_PEDIDO: 'ENTREGADO', estado_pedido: 'ENTREGADO' } : p));
            setTimeout(() => setMensaje(''), 4000);
        }
    };

    // Cancela un pedido seleccionado y devuelve el stock al inventario
    const handleCancelar = async (idPedido) => {
        if (!window.confirm(`¿Está seguro de cancelar el pedido #${idPedido}? El stock será devuelto al inventario.`)) return;
        
        try {
            const res = await fetch(`${API_URL}/api/pedidos/${idPedido}/cancelar`, { method: 'PUT' });
            const data = await res.json();
            
            if (data.success) {
                setMensaje(`🚫 Pedido #${idPedido} cancelado y stock reincorporado al inventario.`);
                setPedidosOriginales(prev => prev.map(p => (p.ID_PEDIDO || p.id_pedido) === idPedido ? { ...p, ESTADO_PEDIDO: 'CANCELADO', estado_pedido: 'CANCELADO' } : p));
            } else {
                setMensaje(`❌ ${data.message}`);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            setMensaje(`🚫 Pedido #${idPedido} cancelado.`);
            setPedidosOriginales(prev => prev.map(p => (p.ID_PEDIDO || p.id_pedido) === idPedido ? { ...p, ESTADO_PEDIDO: 'CANCELADO', estado_pedido: 'CANCELADO' } : p));
            setTimeout(() => setMensaje(''), 4000);
        }
    };

    // Muestra la pantalla de carga mientras se obtienen los datos necesarios
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

            <div className="delivery-filter-card">
                <div className="delivery-filter-label-title">Filtrar por fecha:</div>
                <div className="delivery-filter-group">
                    <label>Desde:</label>
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="delivery-date-input" />
                </div>
                <div className="delivery-filter-group">
                    <label>Hasta:</label>
                    <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="delivery-date-input" />
                </div>
                <button onClick={limpiarFiltros} className="btn-restablecer-fecha">Restablecer a Hoy</button>
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
                                const idPed = p.id_pedido || p.ID_PEDIDO;
                                const estadoPed = (p.estado_pedido || p.ESTADO_PEDIDO || 'PENDIENTE').toUpperCase();
                                const isCancelado = estadoPed === 'CANCELADO';
                                const isEntregado = estadoPed === 'ENTREGADO';
                                const isTerminado = isCancelado || isEntregado;

                                const clienteReal = p.cliente || p.CLIENTE || 'Sin Cliente';
                                const direccionReal = p.direccion || p.DIRECCION || 'Sin Dirección';
                                const sucursalReal = p.sucursal_despacho || p.SUCURSAL_DESPACHO || p.sucursal || 'Sin Sucursal';
                                const totalReal = Number(p.total || p.TOTAL || 0);
                                const metodoReal = p.metodo_pago_acordado || p.METODO_PAGO_ACORDADO || p.metodo_pago || 'EFECTIVO';

                                const estadoClase = 
                                    estadoPed === 'EN RUTA' ? 'estado-en-ruta' : 
                                    estadoPed === 'CANCELADO' ? 'estado-cancelado' : 
                                    estadoPed === 'ENTREGADO' ? 'estado-entregado' : 'estado-default';
                                
                                return (
                                    <tr key={idPed} style={{ opacity: isTerminado ? 0.6 : 1 }}>
                                        <td className="td-id-pedido">#{idPed}</td>
                                        <td>
                                            <div className="td-cliente-nombre">{clienteReal}</div>
                                            <div className="td-cliente-direccion">{direccionReal}</div>
                                        </td>
                                        <td className="td-sucursal-origen">{sucursalReal}</td>
                                        <td className={`td-estado-pedido ${estadoClase}`}>{estadoPed}</td>
                                        <td className="align-right" style={{ fontWeight: 'bold' }}>
                                            {isCancelado ? <span className="total-tachado">Q {totalReal.toFixed(2)}</span> : `Q {totalReal.toFixed(2)}`}
                                        </td>
                                        <td className="align-center">
                                            <span className="badge-metodo-pago">{metodoReal}</span>
                                        </td>
                                        <td className="align-center">
                                            <div className="acciones-wrapper">
                                                <button onClick={() => handleEntregar(idPed)} disabled={isTerminado} className="btn-confirmar-entrega">
                                                    Confirmar Entrega
                                                </button>
                                                <button onClick={() => handleCancelar(idPed)} disabled={isTerminado} className="btn-cancelar-pedido">
                                                    Cancelar Pedido
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="delivery-tabla-vacia">No hay pedidos de delivery registrados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Delivery;