import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga
import { API_URL } from '../config/api';

const Inventory = () => {
    const navigate = useNavigate();
    
    // Control de Pestañas Activas ('entrada' | 'productos' | 'catalogo')
    const [tabActiva, setTabActiva] = useState('entrada');

    const [producto, setProducto] = useState({ nombre: '', descripcion: '', precio: '', requiere_receta: 'NO' });
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido
    
    // Buscador del Catálogo de Referencia
    const [filtroCatalogo, setFiltroCatalogo] = useState('');

    // Encabezado del documento de entrada
    const [idSucursalDestino, setIdSucursalDestino] = useState('');

    // Tabla de posiciones dinámicas (Pos 10, 20, 30...)
    const [posiciones, setPosiciones] = useState([
        { id: 1, id_producto: '', cantidad: '', numero_lote: '', fecha_vencimiento: '' }
    ]);

    // Catálogos
    const [catalogo, setCatalogo] = useState([]);
    const [catalogoSucursales, setCatalogoSucursales] = useState([]);
    const [showSucursalHelp, setShowSucursalHelp] = useState(false);
    const [activeProductoIndex, setActiveProductoIndex] = useState(null);

    const sucursalRef = useRef(null);

    useEffect(() => {
        const inicializarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Cargamos el catálogo, las sucursales y garantizamos los 2 segundos en paralelo
                const [resMed, resSuc] = await Promise.all([
                    fetch('' + API_URL + '/api/inventario/medicamentos').then(res => res.json()).catch(() => ({ success: false })),
                    fetch('' + API_URL + '/api/sucursales').then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resMed.success) setCatalogo(resMed.data);
                if (resSuc.success) setCatalogoSucursales(resSuc.data);
            } catch (error) {
                console.error('Error al inicializar inventario:', error);
            } finally {
                setCargando(false);
            }
        };

        inicializarDatos();

        const handleClickOutside = (event) => {
            if (sucursalRef.current && !sucursalRef.current.contains(event.target)) setShowSucursalHelp(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const cargarCatalogo = async () => {
        try {
            const res = await fetch('' + API_URL + '/api/inventario/medicamentos');
            const data = await res.json();
            if (data.success) setCatalogo(data.data);
        } catch (error) { console.error('Error catálogo:', error); }
    };

    const cargarSucursales = async () => {
        try {
            const res = await fetch('' + API_URL + '/api/sucursales');
            const data = await res.json();
            if (data.success) setCatalogoSucursales(data.data);
        } catch (error) { console.error('Error sucursales:', error); }
    };

    // Agregar / Eliminar Posiciones
    const agregarPosicion = () => {
        setPosiciones(prev => [
            ...prev,
            { id: Date.now(), id_producto: '', cantidad: '', numero_lote: '', fecha_vencimiento: '' }
        ]);
    };

    const eliminarPosicion = (index) => {
        if (posiciones.length === 1) {
            alert('Debe haber al menos una posición en la entrada.');
            return;
        }
        setPosiciones(prev => prev.filter((_, i) => i !== index));
    };

    const actualizarPosicion = (index, campo, valor) => {
        setPosiciones(prev => {
            const copy = [...prev];
            copy[index][campo] = valor;
            return copy;
        });
    };

    // Filtros F4 Matchcode
    const sucursalesFiltradas = catalogoSucursales.filter(s => {
        const id = (s.ID_SUCURSAL || s.id_sucursal || '').toString();
        const nombre = (s.NOMBRE_UBICACION || s.nombre_ubicacion || '').toLowerCase();
        return id.includes(idSucursalDestino) || nombre.includes(idSucursalDestino.toLowerCase());
    });

    const getProductosFiltrados = (filtro) => {
        return catalogo.filter(m => {
            const id = (m.ID_MEDICAMENTO || m.id_medicamento || '').toString();
            const nombre = (m.NOMBRE_COMERCIAL || m.nombre_comercial || '').toLowerCase();
            return id.includes(filtro) || nombre.includes(filtro.toLowerCase());
        });
    };

    // Filtro corregido para el buscador del Catálogo de Referencia (Convierte ID a String de forma segura)
    const catalogoFiltrado = catalogo.filter(med => {
        const id = String(med.ID_MEDICAMENTO || med.id_medicamento || '').toLowerCase();
        const nombre = String(med.NOMBRE_COMERCIAL || med.nombre_comercial || '').toLowerCase();
        const desc = String(med.DESCRIPCION || med.descripcion || '').toLowerCase();
        const busqueda = filtroCatalogo.toLowerCase().trim();

        if (!busqueda) return true;

        return id.includes(busqueda) || nombre.includes(busqueda) || desc.includes(busqueda);
    });

    const handleCrearProducto = async (e) => {
        e.preventDefault();
        setMensaje('');
        try {
            const res = await fetch('' + API_URL + '/api/inventario/producto', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(producto) 
            });
            const data = await res.json();
            if (data.success) { 
                setMensaje('✅ Material registrado exitosamente en el catálogo.');
                setProducto({ nombre: '', descripcion: '', precio: '', requiere_receta: 'NO' }); 
                cargarCatalogo(); 
            } else {
                setMensaje('❌ ' + data.message);
            }
        } catch (error) {
            setMensaje('❌ Error de conexión al registrar producto.');
        }
    };

    const handleIngresarStockMasivo = async (e) => {
        e.preventDefault();
        setMensaje('');

        // 1. Validar Sucursal Destino
        const sucursalEncontrada = catalogoSucursales.find(s => 
            (s.ID_SUCURSAL || s.id_sucursal || '').toString() === idSucursalDestino.trim()
        );

        if (!sucursalEncontrada) {
            setMensaje('❌ Error: El código de sucursal de destino no existe.');
            return;
        }

        const estadoSucursal = (sucursalEncontrada.ESTADO || sucursalEncontrada.estado || 'ACTIVO').toUpperCase();
        if (estadoSucursal === 'INACTIVO') {
            setMensaje('❌ Error: La sucursal seleccionada se encuentra INACTIVA.');
            return;
        }

        // 2. Validar Posiciones
        for (let i = 0; i < posiciones.length; i++) {
            const pos = posiciones[i];
            const prodExistente = catalogo.find(m => 
                (m.ID_MEDICAMENTO || m.id_medicamento || '').toString() === pos.id_producto.trim()
            );

            if (!prodExistente) {
                setMensaje(`❌ Error en Posición ${(i + 1) * 10}: El Producto ID "${pos.id_producto}" no existe.`);
                return;
            }
            if (!pos.cantidad || parseInt(pos.cantidad) <= 0) {
                setMensaje(`❌ Error en Posición ${(i + 1) * 10}: Ingrese una cantidad válida.`);
                return;
            }
            if (!pos.numero_lote.trim()) {
                setMensaje(`❌ Error en Posición ${(i + 1) * 10}: El número de lote es obligatorio.`);
                return;
            }
            if (!pos.fecha_vencimiento) {
                setMensaje(`❌ Error en Posición ${(i + 1) * 10}: La fecha de vencimiento es obligatoria.`);
                return;
            }
        }

        // 3. Enviar lote al backend
        try {
            const res = await fetch('' + API_URL + '/api/inventario/stock', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                    id_sucursal: idSucursalDestino,
                    posiciones: posiciones
                }) 
            });
            const data = await res.json();
            
            if (data.success) {
                setMensaje('✅ ' + data.message);
                setIdSucursalDestino('');
                setPosiciones([{ id: Date.now(), id_producto: '', cantidad: '', numero_lote: '', fecha_vencimiento: '' }]);
            } else {
                setMensaje('❌ ' + data.message);
            }
        } catch (error) {
            console.error('Error al ingresar stock masivo:', error);
            setMensaje('❌ Error de conexión al registrar entrada por posiciones.');
        }
    };

    // Si está cargando, retornamos la plantilla reutilizable
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="inventory-container">
            <div>
                <button onClick={() => navigate('/dashboard')} className="inventory-back-btn">
                    ❮ Regresar al Dashboard
                </button>
            </div>

            <h2 className="inventory-main-title">Gestión de Inventario y Catálogo</h2>
            <p className="inventory-main-subtitle">Contabilización de entradas y mantenimiento de productos.</p>

            {/* Pestañas de Navegación Módulo-Módulo */}
            <div className="inventory-tabs-container">
                <button 
                    onClick={() => { setTabActiva('entrada'); setMensaje(''); }} 
                    className={`inventory-tab-btn ${tabActiva === 'entrada' ? 'entrada' : 'inactivo'}`}
                >
                    📦 Entrada de Productos
                </button>
                <button 
                    onClick={() => { setTabActiva('material'); setMensaje(''); }} 
                    className={`inventory-tab-btn ${tabActiva === 'material' ? 'material' : 'inactivo'}`}
                >
                    💊 Registrar Nuevo Medicamento
                </button>
                <button 
                    onClick={() => { setTabActiva('catalogo'); setMensaje(''); }} 
                    className={`inventory-tab-btn ${tabActiva === 'catalogo' ? 'catalogo' : 'inactivo'}`}
                >
                    📋 Catálogo de Referencia
                </button>
            </div>

            {mensaje && (
                <div className={`inventory-mensaje ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
                    {mensaje}
                </div>
            )}

            {/* VISTA 1: ENTRADA DE MERCANCÍAS */}
            {tabActiva === 'entrada' && (
                <div className="inventory-card-section">
                    <form onSubmit={handleIngresarStockMasivo}>
                        <div style={{ marginBottom: '20px', maxWidth: '350px' }} ref={sucursalRef}>
                            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Sucursal / Centro Destino:*</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    placeholder="Cód. o Nombre de Sucursal" 
                                    value={idSucursalDestino} 
                                    onFocus={() => setShowSucursalHelp(true)}
                                    onChange={e => { setIdSucursalDestino(e.target.value); setShowSucursalHelp(true); }} 
                                    required 
                                    style={{ width: '100%', padding: '8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                                {showSucursalHelp && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '150px', overflowY: 'auto' }}>
                                        {sucursalesFiltradas.map(s => {
                                            const idSuc = s.ID_SUCURSAL || s.id_sucursal;
                                            const nomSuc = s.NOMBRE_UBICACION || s.nombre_ubicacion;
                                            const estSuc = (s.ESTADO || s.estado || 'ACTIVO').toUpperCase();

                                            return (
                                                <div 
                                                    key={idSuc} 
                                                    onClick={() => { setIdSucursalDestino(idSuc.toString()); setShowSucursalHelp(false); }}
                                                    style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} 
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <span><strong style={{ color: '#ffaa00', marginRight: '8px' }}>{idSuc}</strong>{nomSuc}</span>
                                                    {estSuc === 'INACTIVO' && <span style={{ color: '#ef4444', fontSize: '11px' }}>(INACTIVA)</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '14px' }}>Posiciones del Documento</h4>
                            <button type="button" onClick={agregarPosicion} style={{ background: '#252528', color: '#34d399', border: '1px solid #34d399', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                                + Añadir Posición
                            </button>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', color: '#888', textAlign: 'left' }}>
                                    <th style={{ padding: '8px', width: '50px' }}>Pos.</th>
                                    <th style={{ padding: '8px', width: '220px' }}>Material (ID / Nombre)</th>
                                    <th style={{ padding: '8px', width: '120px' }}>Cant. Cajas</th>
                                    <th style={{ padding: '8px', width: '150px' }}>N° Lote</th>
                                    <th style={{ padding: '8px', width: '150px' }}>Fecha Vencimiento</th>
                                    <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {posiciones.map((pos, index) => {
                                    const productosFiltradosRow = getProductosFiltrados(pos.id_producto);

                                    return (
                                        <tr key={pos.id} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                            <td style={{ padding: '8px', color: '#888', fontWeight: 'bold' }}>{(index + 1) * 10}</td>
                                            
                                            <td style={{ padding: '8px', position: 'relative' }}>
                                                <input 
                                                    type="text"
                                                    placeholder="Cód. o Nombre..."
                                                    value={pos.id_producto}
                                                    onFocus={() => setActiveProductoIndex(index)}
                                                    onChange={e => {
                                                        actualizarPosicion(index, 'id_producto', e.target.value);
                                                        setActiveProductoIndex(index);
                                                    }}
                                                    required
                                                    style={{ width: '100%', padding: '6px 8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '3px', boxSizing: 'border-box' }}
                                                />
                                                {activeProductoIndex === index && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '140px', overflowY: 'auto' }}>
                                                        {productosFiltradosRow.map(m => {
                                                            const idMed = m.ID_MEDICAMENTO || m.id_medicamento;
                                                            const nomMed = m.NOMBRE_COMERCIAL || m.nombre_comercial;

                                                            return (
                                                                <div 
                                                                    key={idMed}
                                                                    onClick={() => {
                                                                        actualizarPosicion(index, 'id_producto', idMed.toString());
                                                                        setActiveProductoIndex(null);
                                                                    }}
                                                                    style={{ padding: '6px 8px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid #333' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#38bdf8'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <strong style={{ color: '#00ffcc', marginRight: '6px' }}>{idMed}</strong>
                                                                    {nomMed}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </td>

                                            <td style={{ padding: '8px' }}>
                                                <input 
                                                    type="number"
                                                    placeholder="Cant."
                                                    value={pos.cantidad}
                                                    onChange={e => actualizarPosicion(index, 'cantidad', e.target.value)}
                                                    required
                                                    min="1"
                                                    style={{ width: '100%', padding: '6px 8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '3px', boxSizing: 'border-box' }}
                                                />
                                            </td>

                                            <td style={{ padding: '8px' }}>
                                                <input 
                                                    type="text"
                                                    placeholder="Ej. LOT-2026-01"
                                                    value={pos.numero_lote}
                                                    onChange={e => actualizarPosicion(index, 'numero_lote', e.target.value)}
                                                    required
                                                    style={{ width: '100%', padding: '6px 8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '3px', boxSizing: 'border-box' }}
                                                />
                                            </td>

                                            <td style={{ padding: '8px' }}>
                                                <input 
                                                    type="date"
                                                    value={pos.fecha_vencimiento}
                                                    onChange={e => actualizarPosicion(index, 'fecha_vencimiento', e.target.value)}
                                                    required
                                                    style={{ width: '100%', padding: '6px 8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '3px', boxSizing: 'border-box' }}
                                                />
                                            </td>

                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                <button 
                                                    type="button" 
                                                    onClick={() => eliminarPosicion(index)}
                                                    style={{ background: '#252528', color: '#ef4444', border: '1px solid #444', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" style={{ padding: '10px 20px', background: '#ffaa00', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', fontSize: '13px' }}>
                                Contabilizar Documento de Entrada (Grabar)
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* VISTA 2: CREAR MATERIAL */}
            {tabActiva === 'material' && (
                <div className="inventory-card-section-narrow">
                    <form onSubmit={handleCrearProducto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Nombre Comercial:*</label>
                            <input type="text" placeholder="Ej. Amoxicilina 500mg" value={producto.nombre} onChange={e => setProducto({...producto, nombre: e.target.value})} required style={{ width: '100%', padding: '8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}/>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Descripción / Presentación:*</label>
                            <input type="text" placeholder="Ej. Caja con 20 cápsulas" value={producto.descripcion} onChange={e => setProducto({...producto, descripcion: e.target.value})} required style={{ width: '100%', padding: '8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}/>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Precio Unitario (Q):*</label>
                            <input type="number" placeholder="0.00" value={producto.precio} onChange={e => setProducto({...producto, precio: e.target.value})} required step="0.01" style={{ width: '100%', padding: '8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}/>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Requiere Receta Médica:*</label>
                            <select value={producto.requiere_receta} onChange={e => setProducto({...producto, requiere_receta: e.target.value})} style={{ width: '100%', padding: '8px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}>
                                <option value="NO">Venta Libre</option>
                                <option value="SI">Requiere Receta</option>
                            </select>
                        </div>

                        <button type="submit" style={{ padding: '10px 20px', background: '#00ffcc', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', marginTop: '10px' }}>
                            + Registrar Material en Catálogo
                        </button>
                    </form>
                </div>
            )}

            {/* VISTA 3: CATÁLOGO DE REFERENCIA CON BUSCADOR */}
            {tabActiva === 'catalogo' && (
                <div className="inventory-card-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>Materiales Registrados ({catalogoFiltrado.length})</h3>
                        <input 
                            type="text" 
                            placeholder="🔍 Buscar por nombre o descripción..." 
                            value={filtroCatalogo} 
                            onChange={e => setFiltroCatalogo(e.target.value)} 
                            style={{ 
                                padding: '8px 12px', 
                                background: '#121214', 
                                color: '#fff', 
                                border: '1px solid #444', 
                                borderRadius: '4px', 
                                width: '300px',
                                outline: 'none'
                            }} 
                        />
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                                <th style={{ padding: '10px' }}>ID Material</th>
                                <th style={{ padding: '10px' }}>Nombre Comercial</th>
                                <th style={{ padding: '10px' }}>Descripción</th>
                                <th style={{ padding: '10px' }}>Precio Unitario (Q)</th>
                                <th style={{ padding: '10px' }}>Receta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {catalogoFiltrado.length > 0 ? (
                                catalogoFiltrado.map((med) => {
                                    const idMed = med.ID_MEDICAMENTO || med.id_medicamento;
                                    const nomMed = med.NOMBRE_COMERCIAL || med.nombre_comercial;
                                    const descMed = med.DESCRIPCION || med.descripcion || '-';
                                    const precioMed = parseFloat(med.PRECIO_UNITARIO || med.precio_unitario || 0);
                                    const recetaMed = med.REQUIERE_RECETA || med.requiere_receta || 'NO';

                                    return (
                                        <tr key={idMed} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                            <td style={{ padding: '10px', fontWeight: 'bold', color: '#00ffcc' }}>#{idMed}</td>
                                            <td style={{ padding: '10px', color: '#fff' }}>{nomMed}</td>
                                            <td style={{ padding: '10px', color: '#aaa' }}>{descMed}</td>
                                            <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 'bold' }}>Q {precioMed.toFixed(2)}</td>
                                            <td style={{ padding: '10px', color: recetaMed === 'SI' ? '#ef4444' : '#34d399' }}>{recetaMed}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                        No se encontraron productos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Inventory;