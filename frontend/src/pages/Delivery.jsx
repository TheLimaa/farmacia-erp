import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Delivery = () => {
    const navigate = useNavigate();
    const [pedidos, setPedidos] = useState([]);
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        cargarPedidos();
    }, []);

    const cargarPedidos = async () => {
        try {
            // Reemplazar con el endpoint real de tu backend
            const res = await fetch('http://localhost:3000/api/pedidos/pendientes');
            const data = await res.json();
            if(data.success) {
                setPedidos(data.data);
            } else {
                // Mock visual mientras conectas la base de datos
                setPedidos([
                   
                ]);
            }
        } catch (error) {
            console.error('Error fetching pedidos:', error);
            // Mock Fallback
            setPedidos([
                { ID_PEDIDO: 1045, CLIENTE: 'María Rodríguez', SUCURSAL_DESPACHO: 'Farmacia Miraflores', DIRECCION: 'Zona 11, Majadas', METODO_PAGO_ACORDADO: 'POS', TOTAL: 125.50, ESTADO_PEDIDO: 'EN RUTA' },
                { ID_PEDIDO: 1046, CLIENTE: 'Juan Pérez', SUCURSAL_DESPACHO: 'Stand Gasolinera Puma Próceres', DIRECCION: 'Zona 10, Edificio Sixtino', METODO_PAGO_ACORDADO: 'EFECTIVO', TOTAL: 45.00, ESTADO_PEDIDO: 'EN PREPARACIÓN' }
            ]);
        }
    };

    const handleEntregar = async (idPedido) => {
        if(!window.confirm(`¿Confirmar la entrega exitosa del pedido #${idPedido}?`)) return;
        
        try {
            const res = await fetch(`http://localhost:3000/api/pedidos/${idPedido}/entregar`, { method: 'PUT' });
            const data = await res.json();
            
            setMensaje(`Pedido #${idPedido} contabilizado como entregado exitosamente.`);
            setPedidos(pedidos.filter(p => p.ID_PEDIDO !== idPedido));
            setTimeout(() => setMensaje(''), 4000);
            
        } catch (error) {
            // Simulación en caso de que el backend aún no tenga la ruta
            setMensaje(`Pedido #${idPedido} contabilizado como entregado exitosamente (Modo Local).`);
            setPedidos(pedidos.filter(p => p.ID_PEDIDO !== idPedido));
            setTimeout(() => setMensaje(''), 4000);
        }
    };

    return (
        <div style={{ padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    ← Regresar al Dashboard
                </button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: '500' }}>Logística Delivery - Monitor de Entregas</h2>
                    <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Control de envíos de última milla a clientes.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {mensaje && <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', padding: '12px', background: '#252528', border: '1px solid #a78bfa', color: '#a78bfa', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>{mensaje}</div>}

            <div style={{ background: '#1c1c1e', padding: '25px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1200px', margin: '0 auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                            <th style={{ padding: '12px' }}>ID Pedido</th>
                            <th style={{ padding: '12px' }}>Cliente y Dirección</th>
                            <th style={{ padding: '12px' }}>Sucursal Origen</th>
                            <th style={{ padding: '12px' }}>Estado</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Total a Cobrar</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Método</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedidos.length > 0 ? (
                            pedidos.map(p => (
                                <tr key={p.ID_PEDIDO} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                    <td style={{ padding: '15px 12px', color: '#00ffcc', fontWeight: 'bold' }}>#{p.ID_PEDIDO}</td>
                                    <td style={{ padding: '15px 12px' }}>
                                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{p.CLIENTE}</div>
                                        <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>{p.DIRECCION}</div>
                                    </td>
                                    <td style={{ padding: '15px 12px', color: '#ffaa00' }}>{p.SUCURSAL_DESPACHO}</td>
                                    <td style={{ padding: '15px 12px', color: p.ESTADO_PEDIDO === 'EN RUTA' ? '#a78bfa' : '#38bdf8', fontWeight: 'bold' }}>{p.ESTADO_PEDIDO}</td>
                                    <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold' }}>Q {p.TOTAL?.toFixed(2)}</td>
                                    <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                                        <span style={{ background: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#ddd' }}>{p.METODO_PAGO_ACORDADO}</span>
                                    </td>
                                    <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                                        <button onClick={() => handleEntregar(p.ID_PEDIDO)} style={{ background: '#00cc66', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            Confirmar Entrega
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#555' }}>No hay pedidos pendientes de entrega en ruta.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Delivery;