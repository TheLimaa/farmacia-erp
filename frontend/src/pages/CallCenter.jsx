import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CallCenter = () => {
    const navigate = useNavigate();
    const [mensaje, setMensaje] = useState('');

    // Listas para los buscadores predictivos
    const [catalogo, setCatalogo] = useState([]);
    const [sucursales, setSucursales] = useState([]);

    // Controles de visibilidad para los dropdowns
    const [dropdownSucursal, setDropdownSucursal] = useState(false);
    const [dropdownPosicion, setDropdownPosicion] = useState(null); 

    // Estado principal del pedido (Cabecera)
    const [orden, setOrden] = useState({
        nit: '',
        cliente: '',
        telefono: '',
        direccion: '',
        metodo_pago: 'EFECTIVO',
        id_sucursal: '',
        esCF: false
    });

    const [nombreSucursal, setNombreSucursal] = useState('');

    // Estado de las posiciones múltiples (El Carrito)
    const [posiciones, setPosiciones] = useState([
        { id_row: 1, pos: 10, id_producto: '', cantidad: 1, nombre: '', precio: 0 }
    ]);

    const subtotal = posiciones.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalDocumento = subtotal > 0 ? subtotal + 25 : 0; 

    // --- CARGAR LISTAS PREDICTIVAS AL INICIAR ---
    useEffect(() => {
        const cargarListas = async () => {
            try {
                const resMed = await fetch('http://localhost:3000/api/inventario/medicamentos');
                const dataMed = await resMed.json();
                if (dataMed.success) setCatalogo(dataMed.data);

                const resSuc = await fetch('http://localhost:3000/api/dashboard/summary');
                const dataSuc = await resSuc.json();
                if (dataSuc.success && dataSuc.data.sucursales) setSucursales(dataSuc.data.sucursales);
            } catch (error) {
                console.error('Error cargando listas predictivas:', error);
            }
        };
        cargarListas();
    }, []);

    // --- FUNCIONES DE BÚSQUEDA TIPO SAP ---
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

    // --- MANEJO DE LA TABLA DINÁMICA ---
    const agregarPosicion = () => {
        const ultimaPos = posiciones.length > 0 ? posiciones[posiciones.length - 1].pos : 0;
        setPosiciones([
            ...posiciones, 
            { id_row: Date.now(), pos: ultimaPos + 10, id_producto: '', cantidad: 1, nombre: '', precio: 0 }
        ]);
    };

    const eliminarPosicion = (id_row) => {
        setPosiciones(posiciones.filter(p => p.id_row !== id_row));
    };

    const actualizarFila = (index, campo, valor) => {
        const nuevasPosiciones = [...posiciones];
        nuevasPosiciones[index][campo] = valor;
        setPosiciones(nuevasPosiciones);
    };

    // --- LÓGICA DE AUTOCOMPLETADO AL PRESIONAR ENTER ---

    // Para la sucursal
    const handleKeyDownSucursal = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita que se envíe el formulario
            if (orden.id_sucursal && sucursales.length > 0) {
                const encontradas = sucursales.filter(s => 
                    s.ID_SUCURSAL.toString().includes(orden.id_sucursal) || 
                    (s.NOMBRE_UBICACION && s.NOMBRE_UBICACION.toLowerCase().includes(orden.id_sucursal.toLowerCase()))
                );
                if (encontradas.length > 0) {
                    setOrden({...orden, id_sucursal: encontradas[0].ID_SUCURSAL.toString()});
                    setNombreSucursal(encontradas[0].NOMBRE_UBICACION);
                    setDropdownSucursal(false);
                } else {
                    setNombreSucursal('⚠️ Sucursal no existe');
                }
            }
        }
    };

    // Para los productos de la tabla
    const handleKeyDownProducto = (e, index, textoBuscado) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita que se envíe el formulario
            if (textoBuscado && catalogo.length > 0) {
                const encontrados = catalogo.filter(m => 
                    m.ID_MEDICAMENTO?.toString().includes(textoBuscado) || 
                    (m.NOMBRE_COMERCIAL || m.NOMBRE_COMERCI)?.toLowerCase().includes(textoBuscado.toLowerCase()) ||
                    m.DESCRIPCION?.toLowerCase().includes(textoBuscado.toLowerCase())
                );
                
                if (encontrados.length > 0) {
                    const m = encontrados[0]; // Selecciona el primer resultado
                    const nuevas = [...posiciones];
                    nuevas[index].id_producto = m.ID_MEDICAMENTO.toString();
                    const nom = m.NOMBRE_COMERCIAL || m.NOMBRE_COMERCI;
                    const desc = m.DESCRIPCION || m.descripcion;
                    nuevas[index].nombre = desc ? `${nom} - ${desc}` : nom;
                    nuevas[index].precio = m.PRECIO_UNITARIO || m.precio_unitario || 0;
                    
                    setPosiciones(nuevas);
                    setDropdownPosicion(null);
                } else {
                    actualizarFila(index, 'nombre', '⚠️ Cod.Producto no existe');
                }
            }
        }
    };

    // --- ENVIAR AL BACKEND ---
    const registrarPedido = async (e) => {
        e.preventDefault();
        
        const posicionesValidas = posiciones.filter(p => p.id_producto && p.cantidad > 0 && !p.nombre.includes('⚠️'));
        if (posicionesValidas.length === 0) {
            setMensaje('❌ Debe ingresar al menos una posición válida.');
            return;
        }

        try {
            const res = await fetch('http://localhost:3000/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_sucursal: orden.id_sucursal,
                    nit: orden.esCF ? '' : orden.nit,
                    cliente: orden.cliente,
                    telefono: orden.telefono,
                    direccion: orden.direccion,
                    metodo_pago: orden.metodo_pago,
                    posiciones: posicionesValidas.map(p => ({
                        id_producto: p.id_producto,
                        cantidad: p.cantidad
                    }))
                })
            });
            const data = await res.json();
            
            if (data.success) {
                setMensaje('✅ ' + data.message);
                setOrden({ nit: '', cliente: '', telefono: '', direccion: '', metodo_pago: 'EFECTIVO', id_sucursal: '', esCF: false });
                setNombreSucursal('');
                setPosiciones([{ id_row: Date.now(), pos: 10, id_producto: '', cantidad: 1, nombre: '', precio: 0 }]);
            } else {
                setMensaje('❌ Error: ' + data.message);
            }
            setTimeout(() => setMensaje(''), 5000);
        } catch (err) { 
            console.error(err);
            setMensaje('❌ Error al procesar el pedido.');
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e0e0e0', minHeight: '100vh', background: '#121214' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: '#38bdf8', border: 'none', cursor: 'pointer', fontSize: '18px', marginRight: '15px' }}>❮</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#0055ff', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>SAP</div>
                    <h2 style={{ fontSize: '20px', margin: 0, fontWeight: '500', color: '#fff' }}>Crear Oferta Guatemala: Resumen</h2>
                </div>
            </div>

            {mensaje && <div style={{ marginBottom: '20px', padding: '12px', background: '#1c1c1e', borderLeft: mensaje.includes('❌') ? '4px solid #ef4444' : '4px solid #34d399', color: mensaje.includes('❌') ? '#ef4444' : '#34d399', fontWeight: 'bold' }}>{mensaje}</div>}

            <form onSubmit={registrarPedido}>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    {/* SECCIÓN: SOLICITANTE */}
                    <div style={{ flex: 1, background: '#1c1c1e', padding: '20px', borderRadius: '4px', borderTop: '3px solid #38bdf8' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#aaa', textTransform: 'uppercase' }}>Datos del Solicitante</h3>
                        
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" id="checkCF" checked={orden.esCF} onChange={e => setOrden({...orden, esCF: e.target.checked, nit: e.target.checked ? '' : orden.nit})} />
                            <label htmlFor="checkCF" style={{ fontSize: '13px', color: '#888' }}>Consumidor Final (CF)</label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '13px', color: '#888', textAlign: 'right' }}>Solicitante:*</label>
                            <input type="text" placeholder="NIT / Código BP" value={orden.nit} onChange={e => setOrden({...orden, nit: e.target.value})} onBlur={buscarBP} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarBP(); } }} disabled={orden.esCF} required={!orden.esCF} style={{ padding: '6px 10px', background: '#121214', color: '#fff', border: '1px solid #333', borderRadius: '3px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '13px', color: '#888', textAlign: 'right' }}>Nombre:*</label>
                            <input type="text" value={orden.cliente} onChange={e => setOrden({...orden, cliente: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} required style={{ padding: '6px 10px', background: '#121214', color: '#fff', border: '1px solid #333', borderRadius: '3px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '13px', color: '#888', textAlign: 'right' }}>Teléfono:*</label>
                            <input type="text" value={orden.telefono} onChange={e => setOrden({...orden, telefono: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} required style={{ padding: '6px 10px', background: '#121214', color: '#fff', border: '1px solid #333', borderRadius: '3px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', color: '#888', textAlign: 'right' }}>Destinat.mcía:*</label>
                            <input type="text" placeholder="Dirección de entrega" value={orden.direccion} onChange={e => setOrden({...orden, direccion: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} required style={{ padding: '6px 10px', background: '#121214', color: '#fff', border: '1px solid #333', borderRadius: '3px', outline: 'none' }} />
                        </div>
                    </div>

                    {/* SECCIÓN: APROVISIONAMIENTO */}
                    <div style={{ flex: 1, background: '#1c1c1e', padding: '20px', borderRadius: '4px', borderTop: '3px solid #00ffcc' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#aaa', textTransform: 'uppercase' }}>Aprovisionamiento y Pago</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                            <label style={{ fontSize: '13px', color: '#888', textAlign: 'right' }}>Centro sumin.:*</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {/* BUSCADOR PREDICTIVO SUCURSAL */}
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Cód o Nombre" 
                                        value={orden.id_sucursal} 
                                        onChange={e => {
                                            setOrden({...orden, id_sucursal: e.target.value});
                                            setDropdownSucursal(true);
                                            setNombreSucursal('');
                                        }} 
                                        onKeyDown={handleKeyDownSucursal} // Captura el Enter aquí
                                        onBlur={() => setTimeout(() => setDropdownSucursal(false), 200)}
                                        required 
                                        style={{ width: '120px', padding: '6px 10px', background: '#121214', color: '#00ffcc', border: '1px solid #333', borderRadius: '3px', outline: 'none', fontWeight: 'bold' }} 
                                    />
                                    
                                    {dropdownSucursal && orden.id_sucursal && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, width: '250px', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                            {sucursales.filter(s => 
                                                s.ID_SUCURSAL.toString().includes(orden.id_sucursal) || 
                                                (s.NOMBRE_UBICACION && s.NOMBRE_UBICACION.toLowerCase().includes(orden.id_sucursal.toLowerCase()))
                                            ).map(s => (
                                                <div key={s.ID_SUCURSAL} 
                                                    onClick={() => {
                                                        setOrden({...orden, id_sucursal: s.ID_SUCURSAL.toString()});
                                                        setNombreSucursal(s.NOMBRE_UBICACION);
                                                        setDropdownSucursal(false);
                                                    }}
                                                    style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #333', fontSize: '12px' }}
                                                >
                                                    <strong style={{ color: '#00ffcc' }}>{s.ID_SUCURSAL}</strong> - {s.NOMBRE_UBICACION}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span style={{ fontSize: '13px', color: nombreSucursal.includes('⚠️') ? '#ef4444' : '#fff', fontWeight: 'bold' }}>
                                    {nombreSucursal || <span style={{ color: '#666', fontWeight: 'normal' }}>(Búsqueda rápida)</span>}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', alignItems: 'center', marginBottom: '30px' }}>
                            <label style={{ fontSize: '13px', color: '#888', textAlign: 'right' }}>Condic.pago:*</label>
                            <select value={orden.metodo_pago} onChange={e => setOrden({...orden, metodo_pago: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} style={{ padding: '6px 10px', background: '#121214', color: '#fff', border: '1px solid #333', borderRadius: '3px', outline: 'none' }}>
                                <option value="EFECTIVO">0001 - Efectivo C.O.D.</option>
                                <option value="POS">0002 - Tarjeta POS</option>
                                <option value="LINK">0003 - Link de Pago</option>
                            </select>
                        </div>

                        <div style={{ borderTop: '1px solid #333', paddingTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', color: '#888' }}>Importe total:</span>
                            <span style={{ fontSize: '18px', color: '#38bdf8', fontWeight: 'bold' }}>GTQ {totalDocumento.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN: TABLA DE POSICIONES */}
                <div style={{ background: '#1c1c1e', padding: '20px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button type="button" onClick={agregarPosicion} style={{ background: '#252528', color: '#fff', border: '1px solid #444', padding: '6px 12px', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ color: '#34d399', fontSize: '16px' }}>+</span> Añadir Posición
                        </button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#121214', color: '#888', textAlign: 'left' }}>
                                <th style={{ padding: '10px', borderBottom: '2px solid #333', width: '50px' }}>Pos.</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #333', width: '180px' }}>Material</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #333', width: '100px' }}>Cant. pedido</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #333', width: '50px' }}>UM</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #333' }}>Denominación de posición</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #333', textAlign: 'right', width: '100px' }}>Subtotal</th>
                                <th style={{ padding: '10px', borderBottom: '2px solid #333', width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {posiciones.map((row, index) => (
                                <tr key={row.id_row} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                    <td style={{ padding: '8px 10px', color: '#aaa' }}>{row.pos}</td>
                                    
                                    {/* BUSCADOR PREDICTIVO PRODUCTOS */}
                                    <td style={{ padding: '8px 10px', position: 'relative' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Cód o Nombre..."
                                            value={row.id_producto}
                                            onChange={e => {
                                                actualizarFila(index, 'id_producto', e.target.value);
                                                setDropdownPosicion(index);
                                            }}
                                            onKeyDown={(e) => handleKeyDownProducto(e, index, e.target.value)} // Captura el Enter aquí
                                            onBlur={() => setTimeout(() => setDropdownPosicion(null), 250)}
                                            required
                                            style={{ width: '100%', padding: '6px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '3px', outline: 'none' }}
                                        />
                                        
                                        {dropdownPosicion === index && row.id_producto && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '380px', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                                                {catalogo.filter(m => 
                                                    m.ID_MEDICAMENTO?.toString().includes(row.id_producto) || 
                                                    (m.NOMBRE_COMERCIAL || m.NOMBRE_COMERCI)?.toLowerCase().includes(row.id_producto.toLowerCase()) ||
                                                    m.DESCRIPCION?.toLowerCase().includes(row.id_producto.toLowerCase())
                                                ).map(m => (
                                                    <div key={m.ID_MEDICAMENTO} 
                                                        onClick={() => {
                                                            const nuevas = [...posiciones];
                                                            nuevas[index].id_producto = m.ID_MEDICAMENTO.toString();
                                                            const nom = m.NOMBRE_COMERCIAL || m.NOMBRE_COMERCI;
                                                            const desc = m.DESCRIPCION || m.descripcion;
                                                            
                                                            nuevas[index].nombre = desc ? `${nom} - ${desc}` : nom;
                                                            nuevas[index].precio = m.PRECIO_UNITARIO || m.precio_unitario || 0;
                                                            
                                                            setPosiciones(nuevas);
                                                            setDropdownPosicion(null);
                                                        }}
                                                        style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #333', fontSize: '12px', lineHeight: '1.4' }}
                                                    >
                                                        <strong style={{ color: '#00ffcc' }}>{m.ID_MEDICAMENTO}</strong> - {m.NOMBRE_COMERCIAL || m.NOMBRE_COMERCI}
                                                        <br/><span style={{ color: '#aaa', fontSize: '11px' }}>{m.DESCRIPCION || m.descripcion}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    
                                    <td style={{ padding: '8px 10px' }}>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={row.cantidad}
                                            onChange={e => actualizarFila(index, 'cantidad', parseInt(e.target.value) || 1)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                            required
                                            style={{ width: '100%', padding: '6px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '3px', outline: 'none' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px 10px', color: '#888' }}>UN</td>
                                    <td style={{ padding: '8px 10px', color: row.nombre.includes('⚠️') ? '#ef4444' : '#fff' }}>{row.nombre}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#aaa' }}>
                                        {(row.precio * row.cantidad).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                        {posiciones.length > 1 && (
                                            <button type="button" onClick={() => eliminarPosicion(row.id_row)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✖</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" style={{ background: '#34d399', color: '#000', border: 'none', padding: '10px 30px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                        Contabilizar Documento (Grabar)
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CallCenter;