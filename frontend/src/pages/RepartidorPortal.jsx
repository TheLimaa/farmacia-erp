import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando';
import { API_URL } from '../config/api';

const RepartidorPortal = () => {
    const navigate = useNavigate();
    
    // Obtiene la sesión del usuario guardada en el almacenamiento local o de sesión
    const sessionUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const [repartidorInfo, setRepartidorInfo] = useState({
        nombre: sessionUser.nombre || sessionUser.usuario || 'Repartidor',
        sucursal: ''
    });

    const [pedidos, setPedidos] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [loading, setLoading] = useState(true);
    const [mostrarEntregados, setMostrarEntregados] = useState(false);
    const [notifPermiso, setNotifPermiso] = useState('default');

    // Carga inicial de datos y configura un intervalo para actualizar los pedidos en tiempo real
    useEffect(() => {
        cargarDatosYPedidos(true);
        if ('Notification' in window) {
            setNotifPermiso(Notification.permission);
        }

        const intervalId = setInterval(() => {
            cargarDatosYPedidos(false); 
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    // Convierte una clave VAPID de base64 a formato binario Uint8Array
    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    // Solicita permisos y registra las notificaciones push en el navegador
    const solicitarPermisoYSuscribir = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('Este navegador no soporta notificaciones Push en segundo plano.');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            const permission = await Notification.requestPermission();
            setNotifPermiso(permission);

            if (permission === 'granted') {
                const publicVapidKey = 'BFv8hAWs38mYSb5pLSQAKR4X43c1ZJnzhYTDOLxyg9D13YqRp4eTvqmBS_S_x02hmNj_xtzoVFRDCfmuGhNL_4c';
                const convertedKey = urlBase64ToUint8Array(publicVapidKey);

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedKey
                });

                await fetch(`${API_URL}/api/notificaciones/suscribir`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario: repartidorInfo.nombre,
                        subscription: subscription
                    })
                });

                new Notification('Farmacias Vita+', {
                    body: '¡Notificaciones Push configuradas y activas correctamente!'
                });
                setMensaje('🔔 Alertas Push activadas con éxito.');
                setTimeout(() => setMensaje(''), 4000);
            } else {
                alert('Permiso de notificaciones denegado por el usuario.');
            }
        } catch (error) {
            console.error('Error al configurar las notificaciones push:', error);
            alert('Hubo un error al registrar las notificaciones push.');
        }
    };

    // Obtiene los datos del repartidor y filtra los pedidos correspondientes a su sucursal
    const cargarDatosYPedidos = async (mostrarLoader = true) => {
        const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

        try {
            if (mostrarLoader) setLoading(true);

            const [resUser, resPedidos] = await Promise.all([
                fetch(`${API_URL}/api/usuarios`).then(res => res.json()).catch(() => ({ success: false })),
                fetch(`${API_URL}/api/pedidos/todos`).then(res => res.json()).catch(() => ({ success: false })),
                ...(mostrarLoader ? [tiempoMinimo] : [])
            ]);

            let sucursalAsignada = repartidorInfo.sucursal;

            if (resUser.success) {
                const currentUser = resUser.data.find(u => 
                    (u.USERNAME || u.username) === sessionUser.nombre || 
                    (u.USERNAME || u.username) === sessionUser.usuario
                );
                if (currentUser) {
                    sucursalAsignada = currentUser.SUCURSAL || currentUser.sucursal || '';
                    setRepartidorInfo({
                        nombre: currentUser.NOMBRE_EMPLEADO || currentUser.nombre_empleado || sessionUser.nombre,
                        sucursal: sucursalAsignada
                    });
                }
            }
            
            if (resPedidos.success) {
                const pedidosTienda = resPedidos.data.filter(p => {
                    const sucursalPedido = p.SUCURSAL_DESPACHO || p.sucursal_despacho || p.sucursal || '';
                    if (sucursalAsignada && sucursalPedido !== sucursalAsignada) return false;
                    return true;
                });
                setPedidos(pedidosTienda);
            }
        } catch (error) {
            console.error('Error al cargar datos del repartidor:', error);
        } finally {
            if (mostrarLoader) setLoading(false);
        }
    };

    // Actualiza el estado de un pedido específico en el servidor y de forma local
    const cambiarEstadoPedido = async (idPedido, nuevoEstado) => {
        try {
            await fetch(`${API_URL}/api/pedidos/${idPedido}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            
            if (nuevoEstado === 'ENTREGADO') {
                await fetch(`${API_URL}/api/pedidos/${idPedido}/entregar`, { method: 'PUT' });
            }

            setMensaje(`✅ Pedido #${idPedido} actualizado a: ${nuevoEstado}`);
            setTimeout(() => setMensaje(''), 4000);
            
            setPedidos(prev => prev.map(p => (p.ID_PEDIDO || p.id_pedido) === idPedido ? { ...p, ESTADO_PEDIDO: nuevoEstado, estado_pedido: nuevoEstado } : p));
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            setPedidos(prev => prev.map(p => (p.ID_PEDIDO || p.id_pedido) === idPedido ? { ...p, ESTADO_PEDIDO: nuevoEstado, estado_pedido: nuevoEstado } : p));
            setMensaje(`✅ Pedido #${idPedido} actualizado localmente a: ${nuevoEstado}`);
            setTimeout(() => setMensaje(''), 4000);
        }
    };

    // Cancela un pedido seleccionado tras la confirmación y devuelve el stock al inventario
    const cancelarPedido = async (idPedido) => {
        if (!window.confirm(`¿Estás seguro de que deseas cancelar el pedido #${idPedido}? Esta acción devolverá el stock al inventario de la tienda.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/pedidos/${idPedido}/cancelar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (data.success) {
                setMensaje(`❌ Pedido #${idPedido} cancelado exitosamente.`);
                setTimeout(() => setMensaje(''), 4000);
                cargarDatosYPedidos(false);
            } else {
                alert('No se pudo cancelar: ' + data.message);
            }
        } catch (error) {
            console.error('Error al cancelar pedido:', error);
            alert('Error al conectar con el servidor para cancelar el pedido.');
        }
    };

    // Genera y abre una ventana con el comprobante de venta o factura lista para imprimir
    const verImprimirFactura = async (p) => {
        const idPed = p.ID_PEDIDO || p.id_pedido;
        const totalPed = Number(p.TOTAL || p.total || 0);

        try {
            const res = await fetch(`${API_URL}/api/pedidos/${idPed}/generar-factura`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_emision: repartidorInfo.nombre
                })
            });
            
            const data = await res.json();
            
            if (!data.success) {
                alert('No se pudo generar la factura: ' + data.message);
                return;
            }

            const fact = data.data;

            let filasProductos = '';
            let subtotalProductos = 0;

            fact.productos.forEach(item => {
                const cant = item.CANTIDAD || item.cantidad || 1;
                const desc = item.DESCRIPCION || item.descripcion || 'Medicamento / Insumo';
                const subtotal = Number(item.SUBTOTAL || item.subtotal || 0);
                
                subtotalProductos += subtotal;

                filasProductos += `
                    <tr>
                        <td>${cant}</td>
                        <td>${desc}</td>
                        <td style="text-align: right;">Q ${subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });

            const totalGeneral = Number(fact.total || totalPed);
            let costoEnvio = Number(fact.costo_envio ?? fact.envio ?? p.COSTO_ENVIO ?? p.costo_envio ?? (totalGeneral - subtotalProductos));
            if (costoEnvio < 0) costoEnvio = 0;

            const fechaLegible = new Date(fact.fecha_factura || Date.now()).toLocaleString();

            const ventanaImpresion = window.open('', '_blank', 'width=480,height=780');
            ventanaImpresion.document.write(`
                <html>
                    <head>
                        <title>Factura #${fact.id_venta} - Pedido #${fact.id_pedido}</title>
                        <style>
                            body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; color: #000; background: #fff; }
                            h2, h3 { text-align: center; margin: 5px 0; }
                            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                            .flex { display: flex; justify-content: space-between; }
                            .bold { font-weight: bold; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th, td { text-align: left; font-size: 11px; padding: 5px 2px; border-bottom: 1px dotted #ccc; }
                            th { border-bottom: 1px solid #000; }
                            .totales-box { margin-top: 10px; font-size: 12px; }
                            .totales-box div { margin-bottom: 4px; }
                            .no-print { margin-top: 25px; text-align: center; }
                            .btn { background: #0f172a; color: #fff; padding: 12px 24px; border: none; cursor: pointer; font-weight: bold; border-radius: 6px; font-size: 14px; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        <h2>FARMACIAS VITA+</h2>
                        <h3>COMPROBANTE DE VENTA</h3>
                        <div class="line"></div>
                        <p><span class="bold">No. Factura:</span> FACT-${fact.id_venta}</p>
                        <p><span class="bold">Ref. Pedido:</span> #${fact.id_pedido}</p>
                        <p><span class="bold">Fecha/Hora Emisión:</span> ${fechaLegible}</p>
                        <p><span class="bold">Sucursal Origen:</span> ${fact.sucursal}</p>
                        <p><span class="bold">Atendido Por:</span> ${fact.emisor}</p>
                        <div class="line"></div>
                        <p><span class="bold">NIT Cliente:</span> ${fact.cliente_nit}</p>
                        <p><span class="bold">Cliente:</span> ${fact.cliente_nombre}</p>
                        <p><span class="bold">Dirección:</span> ${fact.direccion}</p>
                        <div class="line"></div>
                        
                        <p class="bold">PRODUCTOS / ARTÍCULOS:</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cant</th>
                                    <th>Descripción del Producto</th>
                                    <th style="text-align: right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filasProductos}
                            </tbody>
                        </table>

                        <div class="line"></div>
                        
                        <div class="totales-box">
                            <div class="flex">
                                <span>Subtotal Productos:</span>
                                <span>Q ${subtotalProductos.toFixed(2)}</span>
                            </div>
                            ${costoEnvio > 0 ? `
                            <div class="flex">
                                <span>Servicio de Envío (Delivery):</span>
                                <span>Q ${costoEnvio.toFixed(2)}</span>
                            </div>
                            ` : ''}
                            <div class="line"></div>
                            <div class="flex bold" style="font-size: 14px; margin-top: 5px;">
                                <span>TOTAL REGISTRADO:</span>
                                <span>Q ${totalGeneral.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="line"></div>
                        <p><span class="bold">Método de Pago:</span> ${fact.metodo_pago}</p>
                        <div class="line"></div>
                        <p style="text-align: center; margin-top: 15px;">¡Gracias por su compra en Farmacias Vita+!</p>

                        <div class="no-print">
                            <button class="btn" onclick="window.print()">🖨️ Imprimir Comprobante</button>
                        </div>
                    </body>
                </html>
            `);
            ventanaImpresion.document.close();
        } catch (error) {
            console.error('Error al procesar la factura:', error);
            alert('Error al conectar con la base de datos para almacenar la factura.');
        }
    };

    // Limpia la sesión del navegador y redirige al usuario a la pantalla de inicio de sesión
    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        navigate('/login');
    };

    // Filtra los pedidos para mostrar los pendientes o el historial según la pestaña seleccionada
    const pedidosFiltrados = pedidos.filter(p => {
        const estado = (p.ESTADO_PEDIDO || p.estado_pedido || '').toUpperCase();
        const esEntregado = estado === 'ENTREGADO';
        const esCancelado = estado === 'CANCELADO';
        return mostrarEntregados ? (esEntregado || esCancelado) : (!esEntregado && !esCancelado);
    });

    // Muestra la pantalla de carga mientras se obtienen los datos iniciales
    if (loading) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="repartidor-container">
            
            <div className="repartidor-topbar">
                <div>
                    <h2 className="repartidor-topbar-title">Portal de Repartidor — Farmacias Vita+</h2>
                    <span className="repartidor-topbar-subtitle">{repartidorInfo.nombre} ({repartidorInfo.sucursal || 'Sin Tienda'})</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {notifPermiso !== 'granted' && (
                        <button 
                            onClick={solicitarPermisoYSuscribir}
                            style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            🔔 Activar Alertas Push
                        </button>
                    )}
                    <button onClick={handleLogout} className="btn-cerrar-sesion-repartidor">
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="repartidor-content-wrapper">
                
                <div className="repartidor-tabs-bar">
                    <button 
                        onClick={() => setMostrarEntregados(false)}
                        className={`btn-repartidor-tab ${!mostrarEntregados ? 'activo-pendiente' : 'inactivo'}`}
                    >
                        📦 Pedidos pendientes
                    </button>
                    <button 
                        onClick={() => setMostrarEntregados(true)}
                        className={`btn-repartidor-tab ${mostrarEntregados ? 'activo-historial' : 'inactivo'}`}
                    >
                        Historial
                    </button>
                </div>

                {mensaje && (
                    <div className="repartidor-mensaje">
                        {mensaje}
                    </div>
                )}

                {pedidosFiltrados.length > 0 ? (
                    <div className="repartidor-pedidos-list">
                        {pedidosFiltrados.map(p => {
                            const idPedidoReal = p.ID_PEDIDO || p.id_pedido;
                            const estadoActual = (p.ESTADO_PEDIDO || p.estado_pedido || 'PENDIENTE').toUpperCase();
                            const esEntregado = estadoActual === 'ENTREGADO';
                            const esCancelado = estadoActual === 'CANCELADO';
                            const bloqueado = esEntregado || esCancelado;

                            let claseEstadoBadge = 'pendiente';
                            if (esEntregado) claseEstadoBadge = 'entregado';
                            else if (esCancelado) claseEstadoBadge = 'cancelado';
                            else if (estadoActual === 'EN RUTA') claseEstadoBadge = 'en-ruta';
                            
                            const clienteReal = p.CLIENTE || p.cliente || 'Sin Cliente';
                            const direccionReal = p.DIRECCION || p.direccion || 'Sin Dirección';
                            const sucursalReal = p.SUCURSAL_DESPACHO || p.sucursal_despacho || p.sucursal || 'Sin Tienda';
                            const pagoReal = p.METODO_PAGO_ACORDADO || p.metodo_pago_acordado || p.metodo_pago || 'EFECTIVO';
                            const totalReal = Number(p.TOTAL || p.total || 0);

                            return (
                                <div key={idPedidoReal} className={`repartidor-card-pedido ${bloqueado ? 'bloqueado' : ''}`}>
                                    
                                    <div className="repartidor-card-header">
                                        <span className="repartidor-pedido-id">Pedido #{idPedidoReal}</span>
                                        <span className={`badge-estado-pedido ${claseEstadoBadge}`}>
                                            {estadoActual}
                                        </span>
                                    </div>

                                    <div className="repartidor-pedido-detalles">
                                        <div><strong className="repartidor-label-info">Cliente:</strong> <span className="repartidor-valor-cliente">{clienteReal}</span></div>
                                        <div><strong className="repartidor-label-info">Dirección:</strong> <span className="repartidor-valor-direccion">{direccionReal}</span></div>
                                        <div><strong className="repartidor-label-info">Tienda Origen:</strong> <span className="repartidor-valor-tienda">{sucursalReal}</span></div>
                                        <div><strong className="repartidor-label-info">Pago:</strong> {pagoReal} — <strong className="repartidor-valor-total">Q {totalReal.toFixed(2)}</strong></div>
                                    </div>

                                    <div className="repartidor-acciones-box">
                                        <div className="repartidor-acciones-titulo">
                                            {esEntregado ? '🔒 Pedido Finalizado y Abonado a Caja' : (esCancelado ? '🚫 Pedido Cancelado (Stock Retornado)' : 'Actualizar Progreso:')}
                                        </div>
                                        <div className="repartidor-botones-estado-row">
                                            <button 
                                                onClick={() => cambiarEstadoPedido(idPedidoReal, 'CARGADO EN TIENDA')}
                                                disabled={bloqueado}
                                                className={`btn-estado-progreso btn-cargado ${estadoActual === 'CARGADO EN TIENDA' ? 'activo' : 'inactivo'}`}
                                            >
                                                📦 Cargado
                                            </button>
                                            <button 
                                                onClick={() => cambiarEstadoPedido(idPedidoReal, 'EN RUTA')}
                                                disabled={bloqueado}
                                                className={`btn-estado-progreso btn-en-ruta ${estadoActual === 'EN RUTA' ? 'activo' : 'inactivo'}`}
                                            >
                                                🛵 En Ruta
                                            </button>
                                            <button 
                                                onClick={() => cambiarEstadoPedido(idPedidoReal, 'ENTREGADO')}
                                                disabled={bloqueado}
                                                className={`btn-estado-progreso btn-entregado ${estadoActual === 'ENTREGADO' ? 'activo' : 'inactivo'}`}
                                            >
                                                ✅ Entregado
                                            </button>
                                        </div>

                                        {!bloqueado && (
                                            <button 
                                                onClick={() => cancelarPedido(idPedidoReal)}
                                                className="btn-cancelar-pedido-rep"
                                            >
                                                ❌ Cancelar Pedido y Retornar Stock
                                            </button>
                                        )}
                                    </div>

                                    {!esCancelado && (
                                        <button 
                                            onClick={() => verImprimirFactura(p)}
                                            className="btn-ver-factura"
                                        >
                                            📄 Ver / Imprimir Factura de Farmacias Vita+
                                        </button>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="repartidor-vacio">
                        {mostrarEntregados ? 'No hay pedidos en el historial (entregados o cancelados).' : 'No tienes pedidos pendientes asignados en este momento.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RepartidorPortal;