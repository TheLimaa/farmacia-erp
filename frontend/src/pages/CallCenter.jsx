import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const CallCenter = () => {
    const navigate = useNavigate();
    const [idMedicamento, setIdMedicamento] = useState('');
    const [resultados, setResultados] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [showHelp, setShowHelp] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const refHelp = useRef(null);

    // Estado para la orden (Incluye lógica CF)
    const [vistaOrden, setVistaOrden] = useState(false);
    const [sucursalElegida, setSucursalElegida] = useState(null);
    const [productoElegido, setProductoElegido] = useState(null);
    const [orden, setOrden] = useState({ 
        nit: '', 
        cliente: '', 
        telefono: '', 
        direccion: '', 
        metodo_pago: 'EFECTIVO', 
        cantidad: 1,
        esCF: false 
    });

    useEffect(() => {
        const fetchCatalogo = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/inventario/medicamentos');
                const data = await res.json();
                if (data.success) setCatalogo(data.data);
            } catch (err) { console.error(err); }
        };
        fetchCatalogo();

        const handleClickOutside = (e) => {
            if (refHelp.current && !refHelp.current.contains(e.target)) setShowHelp(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const medicamentosFiltrados = catalogo.filter(m => 
        m.ID_MEDICAMENTO?.toString().includes(idMedicamento) || 
        m.NOMBRE_COMERCIAL?.toLowerCase().includes(idMedicamento.toLowerCase())
    );

    // Búsqueda de stock mejorada con manejo de errores
    const consultarStock = async (e) => {
        if (e) e.preventDefault();
        if (!idMedicamento) return;
        
        setMensaje('Buscando inventario en la red...');

        let idBusqueda = idMedicamento;
        const prod = catalogo.find(m => 
            m.ID_MEDICAMENTO?.toString() === idMedicamento || 
            m.NOMBRE_COMERCIAL?.toLowerCase() === idMedicamento.toLowerCase()
        );
        
        if (prod) {
            idBusqueda = prod.ID_MEDICAMENTO.toString();
            setProductoElegido(prod);
        } else {
            setProductoElegido({ ID_MEDICAMENTO: idMedicamento, NOMBRE_COMERCIAL: 'Material Seleccionado' });
        }

        try {
            const res = await fetch(`http://localhost:3000/api/inventario/stock/${idBusqueda}`);
            const data = await res.json();
            
            if (data.success && data.data && data.data.length > 0) {
                setResultados(data.data);
                setVistaOrden(false);
                setMensaje(''); 
            } else {
                setResultados([]);
                setMensaje('❌ No hay stock disponible para este material en ninguna sucursal.');
            }
        } catch (err) { 
            console.error(err);
            setResultados([]);
            setMensaje('❌ Error de conexión. Revisa que el servidor backend esté corriendo.');
        }
    };

    const iniciarOrden = (sucursal) => {
        setSucursalElegida(sucursal);
        setVistaOrden(true);
        setMensaje('');
    };

    const buscarBP = async () => {
        if (!orden.nit || orden.esCF) return;
        try {
            const res = await fetch(`http://localhost:3000/api/pedidos/cliente/${orden.nit}`);
            const data = await res.json();
            if (data.success && data.data) {
                setOrden(prev => ({ 
                    ...prev, 
                    cliente: data.data.NOMBRE_COMPLETO || data.data.nombre_completo, 
                    telefono: data.data.TELEFONO_CONTACTO || data.data.telefono_contacto 
                }));
            }
        } catch (error) { console.error('Error buscando BP', error); }
    };

    const registrarPedido = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3000/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_sucursal: sucursalElegida.ID_SUCURSAL,
                    id_producto: productoElegido.ID_MEDICAMENTO,
                    nit: orden.esCF ? '' : orden.nit,
                    cliente: orden.cliente,
                    telefono: orden.telefono,
                    direccion: orden.direccion,
                    metodo_pago: orden.metodo_pago,
                    cantidad: orden.cantidad
                })
            });
            const data = await res.json();
            
            if (data.success) {
                setMensaje('✅ ' + (data.message || 'Pedido registrado y enviado a Delivery exitosamente.'));
                setVistaOrden(false);
                setResultados([]);
                setIdMedicamento('');
                setOrden({ nit: '', cliente: '', telefono: '', direccion: '', metodo_pago: 'EFECTIVO', cantidad: 1, esCF: false });
            } else {
                setMensaje('❌ Error: ' + data.message);
            }
            setTimeout(() => setMensaje(''), 5000);
        } catch (err) { 
            console.error(err);
            setMensaje('❌ Error al procesar el pedido. Revisa el servidor.');
        }
    };

    return (
        <div style={{ padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1000px', margin: '0 auto 30px auto' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    ← Regresar al Dashboard
                </button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: '500' }}>Atención Call Center - Toma de Pedidos</h2>
                    <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Verificación de stock por proximidad y facturación.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {mensaje && <div style={{ maxWidth: '1000px', margin: '0 auto 20px auto', padding: '12px', background: '#252528', border: mensaje.includes('❌') ? '1px solid #ef4444' : '1px solid #34d399', color: mensaje.includes('❌') ? '#ef4444' : '#34d399', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>{mensaje}</div>}

            {!vistaOrden && (
                <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1000px', margin: '0 auto 30px auto' }}>
                    <h3 style={{ textAlign: 'center', color: '#555', margin: '0 0 25px 0', fontSize: '16px', fontWeight: 'bold' }}>Búsqueda de Material solicitado por el cliente</h3>
                    
                    <form onSubmit={consultarStock} style={{ display: 'flex', justifyContent: 'center' }}>
                        <div ref={refHelp} style={{ display: 'flex', width: '100%', maxWidth: '600px', position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="Ingrese ID o Nombre del Medicamento..." 
                                value={idMedicamento}
                                onFocus={() => setShowHelp(true)}
                                onChange={e => { setIdMedicamento(e.target.value); setShowHelp(true); }}
                                style={{ flex: 1, background: '#333', color: '#fff', border: '1px solid #444', padding: '12px 15px', borderRadius: '4px 0 0 4px', outline: 'none' }}
                            />
                            {showHelp && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                                    {medicamentosFiltrados.map(m => (
                                        <div key={m.ID_MEDICAMENTO} onClick={() => { setIdMedicamento(m.ID_MEDICAMENTO.toString()); setShowHelp(false); }}
                                             style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333' }}
                                             onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <strong style={{ color: '#00ffcc' }}>{m.ID_MEDICAMENTO}</strong> - {m.NOMBRE_COMERCIAL}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button type="submit" style={{ background: '#0055ff', color: '#fff', border: 'none', padding: '13px 25px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '0 4px 4px 0' }}>
                                Buscar Cobertura
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!vistaOrden && resultados.length > 0 && (
                <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1000px', margin: '0 auto' }}>
                    <h3 style={{ color: '#555', marginBottom: '20px', fontSize: '16px' }}>Sucursales con Stock para {productoElegido?.NOMBRE_COMERCIAL}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                <th style={{ padding: '10px' }}>Sucursal</th>
                                <th style={{ padding: '10px' }}>Tipo</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Precio Unit.</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Stock Disp.</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>ETA Entrega</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resultados.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                    <td style={{ padding: '12px 10px', color: '#ffaa00', fontWeight: 'bold' }}>{r.NOMBRE_UBICACION}</td>
                                    <td style={{ padding: '12px 10px', color: '#aaa' }}>{r.TIPO_UBICACION || 'Centro Comercial'}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>Q {r.PRECIO_UNITARIO}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', color: r.TOTAL_DISPONIBLE > 10 ? '#00ffcc' : '#ffaa00' }}>{r.TOTAL_DISPONIBLE}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', color: '#38bdf8' }}>35 - 45 mins</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                        <button onClick={() => iniciarOrden(r)} style={{ background: '#34d399', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            Despachar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {vistaOrden && (
                <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ color: '#aaa', margin: 0 }}>Completar Orden de Cliente</h3>
                        <button onClick={() => setVistaOrden(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}>✖ Cancelar</button>
                    </div>
                    
                    <div style={{ background: '#252528', padding: '15px', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #34d399', fontSize: '13px' }}>
                        <strong>Despachando:</strong> {productoElegido?.NOMBRE_COMERCIAL} <br/>
                        <strong>Origen:</strong> {sucursalElegida?.NOMBRE_UBICACION} <br/>
                        <strong style={{ color: '#38bdf8' }}>Total a cobrar: Q {(sucursalElegida?.PRECIO_UNITARIO * orden.cantidad + 25).toFixed(2)} </strong> 
                        <span style={{ color: '#aaa', fontSize: '11px' }}>(Incluye Q25 de envío)</span>
                    </div>

                    <form onSubmit={registrarPedido} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {/* Checkbox de Consumidor Final (CF) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#333', padding: '10px', borderRadius: '4px', border: '1px solid #444' }}>
                            <input 
                                type="checkbox" 
                                id="checkCF"
                                checked={orden.esCF} 
                                onChange={e => setOrden({...orden, esCF: e.target.checked, nit: e.target.checked ? '' : orden.nit})} 
                                style={{ transform: 'scale(1.2)' }}
                            />
                            <label htmlFor="checkCF" style={{ fontSize: '14px', color: '#00ffcc', cursor: 'pointer', fontWeight: 'bold' }}>Facturar a Consumidor Final (CF) - No requiere NIT</label>
                        </div>

                        {/* Buscador BP / NIT */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                placeholder="NIT o Código BP (Ej. 123456-7)" 
                                value={orden.nit} 
                                onChange={e => setOrden({...orden, nit: e.target.value})} 
                                onBlur={buscarBP}
                                disabled={orden.esCF}
                                required={!orden.esCF}
                                style={{ flex: 1, padding: '10px', background: orden.esCF ? '#222' : '#333', color: orden.esCF ? '#666' : '#fff', border: '1px solid #444', borderRadius: '4px' }}
                            />
                            <button type="button" onClick={buscarBP} disabled={orden.esCF} style={{ background: orden.esCF ? '#333' : '#38bdf8', color: orden.esCF ? '#666' : '#000', border: 'none', padding: '0 20px', borderRadius: '4px', fontWeight: 'bold', cursor: orden.esCF ? 'not-allowed' : 'pointer' }}>
                                Buscar Cliente BP
                            </button>
                        </div>

                        <input type="text" placeholder="Nombre Completo del Cliente" value={orden.cliente} onChange={e => setOrden({...orden, cliente: e.target.value})} required style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}/>
                        <input type="tel" placeholder="Teléfono de Contacto" value={orden.telefono} onChange={e => setOrden({...orden, telefono: e.target.value})} required style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}/>
                        <textarea placeholder="Dirección exacta de entrega..." value={orden.direccion} onChange={e => setOrden({...orden, direccion: e.target.value})} required style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', minHeight: '60px' }}/>
                        
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Cantidad de Cajas</label>
                                <input type="number" min="1" max={sucursalElegida?.TOTAL_DISPONIBLE} value={orden.cantidad} onChange={e => setOrden({...orden, cantidad: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}/>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Forma de Pago</label>
                                <select value={orden.metodo_pago} onChange={e => setOrden({...orden, metodo_pago: e.target.value})} style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}>
                                    <option value="EFECTIVO">Efectivo contra entrega</option>
                                    <option value="POS">Tarjeta (POS Inalámbrico)</option>
                                    <option value="LINK">Link de Pago (SMS)</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" style={{ padding: '12px', background: '#0055ff', color: '#fff', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', marginTop: '10px' }}>Registrar Orden y Asignar Repartidor</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CallCenter;