import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Inventory = () => {
    const navigate = useNavigate();
    const [producto, setProducto] = useState({ nombre: '', descripcion: '', precio: '', requiere_receta: 'NO' });
    const [stock, setStock] = useState({ id_sucursal: '', id_producto: '', cantidad: '', numero_lote: '', fecha_vencimiento: '' });
    const [mensaje, setMensaje] = useState('');
    
    // Catálogos y estados para los desplegables tipo SAP (F4 Help)
    const [catalogo, setCatalogo] = useState([]);
    const [catalogoSucursales] = useState([
        { ID_SUCURSAL: 1, NOMBRE_UBICACION: 'Farmacia Miraflores' },
        { ID_SUCURSAL: 2, NOMBRE_UBICACION: 'Stand Gasolinera Puma Próceres' },
        { ID_SUCURSAL: 3, NOMBRE_UBICACION: 'Farmacia Oakland Mall' }
    ]);
    const [showSucursalHelp, setShowSucursalHelp] = useState(false);
    const [showProductoHelp, setShowProductoHelp] = useState(false);

    const sucursalRef = useRef(null);
    const productoRef = useRef(null);

    useEffect(() => {
        cargarCatalogo();
        const handleClickOutside = (event) => {
            if (sucursalRef.current && !sucursalRef.current.contains(event.target)) setShowSucursalHelp(false);
            if (productoRef.current && !productoRef.current.contains(event.target)) setShowProductoHelp(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const cargarCatalogo = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/inventario/medicamentos');
            const data = await res.json();
            if (data.success) setCatalogo(data.data);
        } catch (error) { console.error('Error catálogo:', error); }
    };

    const sucursalesFiltradas = catalogoSucursales.filter(s => s.ID_SUCURSAL.toString().includes(stock.id_sucursal) || s.NOMBRE_UBICACION.toLowerCase().includes(stock.id_sucursal.toLowerCase()));
    const productosFiltrados = catalogo.filter(m => m.ID_MEDICAMENTO.toString().includes(stock.id_producto) || m.NOMBRE_COMERCIAL.toLowerCase().includes(stock.id_producto.toLowerCase()));

    const handleCrearProducto = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:3000/api/inventario/producto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(producto) });
        const data = await res.json();
        setMensaje(data.message);
        if(data.success) { setProducto({ nombre: '', descripcion: '', precio: '', requiere_receta: 'NO' }); cargarCatalogo(); }
    };

    const handleIngresarStock = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:3000/api/inventario/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stock) });
        const data = await res.json();
        setMensaje(data.message);
        if(data.success) { setStock({ id_sucursal: '', id_producto: '', cantidad: '', numero_lote: '', fecha_vencimiento: '' }); }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ marginBottom: '20px' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    ← Regresar al Dashboard
                </button>
            </div>

            <h2>Mantenimiento de Catálogo y Entradas</h2>
            <p>Registro de nuevos materiales e ingreso de lotes.</p>
            {mensaje && <div style={{ padding: '10px', background: '#333', color: '#00ffcc', marginBottom: '20px' }}>{mensaje}</div>}

            <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
                <div style={{ flex: 1, background: '#1e1e1e', padding: '20px', borderRadius: '8px' }}>
                    <h3>1. Nuevo Material (Catálogo)</h3>
                    <form onSubmit={handleCrearProducto} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="text" placeholder="Nombre Comercial" value={producto.nombre} onChange={e => setProducto({...producto, nombre: e.target.value})} required style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444' }}/>
                        <input type="text" placeholder="Descripción" value={producto.descripcion} onChange={e => setProducto({...producto, descripcion: e.target.value})} required style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444' }}/>
                        <input type="number" placeholder="Precio (Q)" value={producto.precio} onChange={e => setProducto({...producto, precio: e.target.value})} required style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444' }} step="0.01"/>
                        <select value={producto.requiere_receta} onChange={e => setProducto({...producto, requiere_receta: e.target.value})} style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444' }}>
                            <option value="NO">Venta Libre</option>
                            <option value="SI">Requiere Receta</option>
                        </select>
                        <button type="submit" style={{ padding: '10px', background: '#00ffcc', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>Registrar Material</button>
                    </form>
                </div>

                <div style={{ flex: 1, background: '#1e1e1e', padding: '20px', borderRadius: '8px' }}>
                    <h3>2. Entrada de Mercancías a Sucursal</h3>
                    <form onSubmit={handleIngresarStock} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        
                        {/* INPUT SUCURSAL CON MATCHCODE */}
                        <div ref={sucursalRef} style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="ID Sucursal (Centro)" 
                                value={stock.id_sucursal} 
                                onFocus={() => setShowSucursalHelp(true)}
                                onChange={e => { setStock({...stock, id_sucursal: e.target.value}); setShowSucursalHelp(true); }} 
                                required 
                                style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', boxSizing: 'border-box' }}
                            />
                            {showSucursalHelp && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '150px', overflowY: 'auto' }}>
                                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #333', fontSize: '11px', color: '#888' }}>Seleccione Centro</div>
                                    {sucursalesFiltradas.map(s => (
                                        <div key={s.ID_SUCURSAL} onClick={() => { setStock({...stock, id_sucursal: s.ID_SUCURSAL.toString()}); setShowSucursalHelp(false); }}
                                             style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333' }}
                                             onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <strong style={{ color: '#ffaa00' }}>{s.ID_SUCURSAL}</strong> - {s.NOMBRE_UBICACION}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* INPUT PRODUCTO CON MATCHCODE */}
                        <div ref={productoRef} style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="ID Producto (Material)" 
                                value={stock.id_producto} 
                                onFocus={() => setShowProductoHelp(true)}
                                onChange={e => { setStock({...stock, id_producto: e.target.value}); setShowProductoHelp(true); }} 
                                required 
                                style={{ width: '100%', padding: '8px', background: '#333', color: '#fff', border: '1px solid #444', boxSizing: 'border-box' }}
                            />
                            {showProductoHelp && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '150px', overflowY: 'auto' }}>
                                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #333', fontSize: '11px', color: '#888' }}>Seleccione Material</div>
                                    {productosFiltrados.map(m => (
                                        <div key={m.ID_MEDICAMENTO} onClick={() => { setStock({...stock, id_producto: m.ID_MEDICAMENTO.toString()}); setShowProductoHelp(false); }}
                                             style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333' }}
                                             onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <strong style={{ color: '#00ffcc' }}>{m.ID_MEDICAMENTO}</strong> - {m.NOMBRE_COMERCIAL}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <input type="number" placeholder="Cantidad de Cajas" value={stock.cantidad} onChange={e => setStock({...stock, cantidad: e.target.value})} required style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444' }}/>
                        <input type="text" placeholder="Número de Lote" value={stock.numero_lote} onChange={e => setStock({...stock, numero_lote: e.target.value})} required style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444' }}/>
                        <input type="date" value={stock.fecha_vencimiento} onChange={e => setStock({...stock, fecha_vencimiento: e.target.value})} required style={{ padding: '8px', background: '#333', color: '#fff', border: '1px solid #444' }}/>
                        
                        <button type="submit" style={{ padding: '10px', background: '#ffaa00', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>Contabilizar Entrada</button>
                    </form>
                </div>
            </div>

            <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px' }}>
                <h3>Referencia de materiales existentes</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #444' }}>
                            <th style={{ padding: '10px', color: '#888' }}>Material de identificación</th>
                            <th style={{ padding: '10px', color: '#888' }}>Nombre</th>
                        </tr>
                    </thead>
                    <tbody>
                        {catalogo.map((med) => (
                            <tr key={med.ID_MEDICAMENTO} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold', color: '#00ffcc' }}>{med.ID_MEDICAMENTO}</td>
                                <td style={{ padding: '10px', color: '#fff' }}>{med.NOMBRE_COMERCIAL}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;