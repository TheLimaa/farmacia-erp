import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga
import { API_URL } from '../config/api';

const CallCenter = () => {
    const navigate = useNavigate();
    const [mensaje, setMensaje] = useState('');

    const [catalogo, setCatalogo] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido

    const [dropdownSucursal, setDropdownSucursal] = useState(false);
    const [dropdownPosicion, setDropdownPosicion] = useState(null); 

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

    const [posiciones, setPosiciones] = useState([
        { id_row: 1, pos: 10, id_producto: '', cantidad: 1, nombre: '', precio: 0 }
    ]);

    const subtotal = posiciones.reduce((sum, item) => sum + (item.precio * (item.cantidad || 0)), 0);
    const totalDocumento = subtotal > 0 ? subtotal + 25 : 0; 

    // --- CARGAR LISTAS ---
    useEffect(() => {
        const cargarListas = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Cargamos medicamentos, sucursales y garantizamos el tiempo mínimo en paralelo
                const [resMed, resSuc] = await Promise.all([
                    fetch(`${API_URL}/api/inventario/medicamentos`).then(res => res.json()).catch(() => ({ success: false })),
                    fetch(`${API_URL}/api/sucursales`).then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resMed.success) setCatalogo(resMed.data);
                if (resSuc.success) setSucursales(resSuc.data);
            } catch (error) {
                console.error('Error cargando listas predictivas:', error);
            } finally {
                setCargando(false);
            }
        };
        cargarListas();
    }, []);

    // --- BÚSQUEDA AUTOMÁTICA DEL BP AL ESCRIBIR EL NIT ---
    const buscarBP = async (nitBusqueda) => {
        if (!nitBusqueda || orden.esCF) return;
        
        try {
            const res = await fetch(`${API_URL}/api/pedidos/cliente/${nitBusqueda}`);
            const data = await res.json();
            
            if (data.success && data.data) {
                setOrden(prev => ({
                    ...prev,
                    cliente: data.data.NOMBRE_COMPLETO || data.data.nombre_completo,
                    telefono: data.data.TELEFONO_CONTACTO || data.data.telefono_contacto
                }));
            } else {
                setOrden(prev => ({
                    ...prev,
                    cliente: '',
                    telefono: ''
                }));
            }
        } catch (error) { 
            console.error('Error buscando BP', error); 
        }
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

    // --- LÓGICA DE AUTOCOMPLETADO (ENTER) ---
    const handleKeyDownSucursal = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            if (orden.id_sucursal && sucursales.length > 0) {
                const encontradas = sucursales.filter(s => {
                    const id = (s.ID_SUCURSAL || s.id_sucursal || '').toString();
                    const nombre = (s.NOMBRE_UBICACION || s.nombre_ubicacion || '').toLowerCase();
                    const query = orden.id_sucursal.toLowerCase();
                    return id.includes(query) || nombre.includes(query);
                });
                
                if (encontradas.length > 0) {
                    const sucEncontrada = encontradas[0];
                    const idSuc = (sucEncontrada.ID_SUCURSAL || sucEncontrada.id_sucursal).toString();
                    const nomSuc = sucEncontrada.NOMBRE_UBICACION || sucEncontrada.nombre_ubicacion;
                    
                    setOrden({...orden, id_sucursal: idSuc});
                    setNombreSucursal(nomSuc);
                    setDropdownSucursal(false);
                } else {
                    setNombreSucursal('⚠️ Sucursal no existe');
                }
            }
        }
    };

    const handleKeyDownProducto = (e, index, textoBuscado) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            if (textoBuscado && catalogo.length > 0) {
                const encontrados = catalogo.filter(m => {
                    const id = (m.ID_MEDICAMENTO || m.id_medicamento || '').toString();
                    const nombre = (m.NOMBRE_COMERCIAL || m.nombre_comercial || '').toLowerCase();
                    const desc = (m.DESCRIPCION || m.descripcion || '').toLowerCase();
                    const query = textoBuscado.toLowerCase();
                    return id.includes(query) || nombre.includes(query) || desc.includes(query);
                });
                
                if (encontrados.length > 0) {
                    const m = encontrados[0]; 
                    const nuevas = [...posiciones];
                    const idMed = (m.ID_MEDICAMENTO || m.id_medicamento).toString();
                    const nom = m.NOMBRE_COMERCIAL || m.nombre_comercial;
                    const desc = m.DESCRIPCION || m.descripcion;
                    
                    nuevas[index].id_producto = idMed;
                    nuevas[index].nombre = desc ? `${nom}\n${desc}` : nom;
                    nuevas[index].precio = parseFloat(m.PRECIO_UNITARIO || m.precio_unitario || 0);
                    
                    setPosiciones(nuevas);
                    setDropdownPosicion(null);
                } else {
                    actualizarFila(index, 'nombre', '⚠️ Cod.Producto no existe');
                }
            }
        }
    };

    // --- ENVIAR AL BACKEND Y MANEJAR RESPUESTA ---
    const registrarPedido = async (e) => {
        e.preventDefault();
        
        const posicionesValidas = posiciones.filter(p => p.id_producto && Number(p.cantidad) > 0 && !p.nombre.includes('⚠️'));
        if (posicionesValidas.length === 0) {
            setMensaje('❌ Debe ingresar al menos una posición válida.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/pedidos/registrar`, {
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
                        cantidad: Number(p.cantidad)
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
                setMensaje('⚠️ ' + data.message);
            }
            setTimeout(() => setMensaje(''), 6000);
        } catch (err) { 
            console.error(err);
            setMensaje('❌ Error al procesar el pedido.');
        }
    };

    // Si está cargando, retornamos la plantilla reutilizable
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="call-center-container">
            
            <div className="call-center-header">
                <button onClick={() => navigate('/dashboard')} className="btn-regresar-cc">❮</button>
                <div className="call-center-title-wrapper">
                    <h2 className="call-center-title">Crear Pedido</h2>
                </div>
            </div>

            {/* SECCIÓN DE ALERTA DINÁMICA */}
            {mensaje && (
                <div className={`alerta-mensaje ${mensaje.includes('❌') ? 'error' : mensaje.includes('⚠️') ? 'advertencia' : 'exito'}`}>
                    {mensaje}
                </div>
            )}

            <form onSubmit={registrarPedido}>
                
                <div className="seccion-formularios-grid">
                    {/* SECCIÓN: SOLICITANTE */}
                    <div className="card-solicitante">
                        <h3 className="card-title">Datos del Solicitante</h3>
                        
                        <div className="checkbox-cf-container">
                            <input type="checkbox" id="checkCF" checked={orden.esCF} onChange={e => setOrden({...orden, esCF: e.target.checked, nit: e.target.checked ? '' : orden.nit})} />
                            <label htmlFor="checkCF" className="checkbox-cf-label">Consumidor Final (CF)</label>
                        </div>

                        <div className="form-field-row">
                            <label className="form-label">Solicitante:*</label>
                            <input 
                                type="text" 
                                placeholder="NIT / Código BP" 
                                value={orden.nit} 
                                onChange={e => setOrden({...orden, nit: e.target.value})} 
                                onBlur={() => buscarBP(orden.nit)} 
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarBP(orden.nit); } }} 
                                disabled={orden.esCF} 
                                required={!orden.esCF} 
                                className="form-input-dark" 
                            />
                        </div>
                        <div className="form-field-row">
                            <label className="form-label">Nombre:*</label>
                            <input type="text" value={orden.cliente} onChange={e => setOrden({...orden, cliente: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} required className="form-input-dark" />
                        </div>
                        <div className="form-field-row">
                            <label className="form-label">Teléfono:*</label>
                            <input type="text" value={orden.telefono} onChange={e => setOrden({...orden, telefono: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} required className="form-input-dark" />
                        </div>
                        <div className="form-field-row">
                            <label className="form-label">Destinat.mcía:*</label>
                            <input type="text" placeholder="Dirección de entrega" value={orden.direccion} onChange={e => setOrden({...orden, direccion: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} required className="form-input-dark" />
                        </div>
                    </div>

                    {/* SECCIÓN: APROVISIONAMIENTO */}
                    <div className="card-aprovisionamiento">
                        <h3 className="card-title">Aprovisionamiento y Pago</h3>
                        
                        <div className="form-field-row-aprov">
                            <label className="form-label">Centro sumin.:*</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {/* BUSCADOR PREDICTIVO SUCURSAL */}
                                <div className="buscador-predictivo-container">
                                    <input 
                                        type="text" 
                                        placeholder="Cód o Nombre" 
                                        value={orden.id_sucursal} 
                                        onChange={e => {
                                            setOrden({...orden, id_sucursal: e.target.value});
                                            setDropdownSucursal(true);
                                            setNombreSucursal('');
                                        }} 
                                        onKeyDown={handleKeyDownSucursal} 
                                        onBlur={() => setTimeout(() => setDropdownSucursal(false), 200)}
                                        required 
                                        className="input-sucursal-busqueda" 
                                    />
                                    
                                    {dropdownSucursal && orden.id_sucursal && (
                                        <div className="dropdown-sugerencias">
                                            {sucursales.filter(s => {
                                                const id = (s.ID_SUCURSAL || s.id_sucursal || '').toString();
                                                const nombre = (s.NOMBRE_UBICACION || s.nombre_ubicacion || '').toLowerCase();
                                                const query = orden.id_sucursal.toLowerCase();
                                                return id.includes(query) || nombre.includes(query);
                                            }).map(s => {
                                                const id = s.ID_SUCURSAL || s.id_sucursal;
                                                const nombre = s.NOMBRE_UBICACION || s.nombre_ubicacion;
                                                return (
                                                    <div key={id} 
                                                        onClick={() => {
                                                            setOrden({...orden, id_sucursal: id.toString()});
                                                            setNombreSucursal(nombre);
                                                            setDropdownSucursal(false);
                                                        }}
                                                        className="sugerencia-item"
                                                    >
                                                        <strong className="sugerencia-id-highlight">{id}</strong>
                                                        {nombre}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <span className={`sucursal-nombre-estado ${nombreSucursal.includes('⚠️') ? 'advertencia' : nombreSucursal ? 'normal' : 'placeholder'}`}>
                                    {nombreSucursal || '(Búsqueda rápida)'}
                                </span>
                            </div>
                        </div>

                        <div className="form-field-row-select">
                            <label className="form-label">Condic.pago:*</label>
                            <select value={orden.metodo_pago} onChange={e => setOrden({...orden, metodo_pago: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="form-input-dark">
                                <option value="EFECTIVO">0001 - Efectivo C.O.D.</option>
                                <option value="POS">0002 - Tarjeta POS</option>
                                <option value="LINK">0003 - Link de Pago</option>
                            </select>
                        </div>

                        <div className="importe-total-container">
                            <span className="importe-total-label">Importe total:</span>
                            <span className="importe-total-valor">GTQ {totalDocumento.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN: TABLA DE POSICIONES */}
                <div className="card-tabla-posiciones">
                    <div className="tabla-acciones-bar">
                        <button type="button" onClick={agregarPosicion} className="btn-agregar-posicion">
                            <span className="icono-mas-verde">+</span> Añadir Posición
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', overflowY: 'visible', minHeight: '250px' }}>
                        <table className="tabla-posiciones" style={{ position: 'relative' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>Pos.</th>
                                    <th style={{ width: '220px' }}>Producto</th>
                                    <th style={{ width: '120px' }}>Cant. pedido</th>
                                    <th style={{ width: '60px' }}>UM</th>
                                    <th>Denominación de posición</th>
                                    <th style={{ textAlign: 'right', width: '100px' }}>Subtotal</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {posiciones.map((row, index) => (
                                    <tr key={row.id_row} style={{ position: 'relative' }}>
                                        <td className="td-pos-numero">{row.pos}</td>
                                        
                                        {/* BUSCADOR PREDICTIVO PRODUCTOS */}
                                        <td style={{ position: 'relative', overflow: 'visible' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Cód o Nombre..."
                                                value={row.id_producto}
                                                onChange={e => {
                                                    actualizarFila(index, 'id_producto', e.target.value);
                                                    setDropdownPosicion(index);
                                                }}
                                                onKeyDown={(e) => handleKeyDownProducto(e, index, e.target.value)} 
                                                onBlur={() => setTimeout(() => setDropdownPosicion(null), 250)}
                                                required
                                                className="input-tabla-material"
                                            />
                                            
                                            {dropdownPosicion === index && row.id_producto && (
                                                <div className="dropdown-sugerencias-materiales" style={{ position: 'absolute', top: '100%', left: '0', zIndex: 9999, width: '280px', background: '#1e293b', border: '1px solid #475569', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                                                    {catalogo.filter(m => {
                                                        const id = (m.ID_MEDICAMENTO || m.id_medicamento || '').toString();
                                                        const nombre = (m.NOMBRE_COMERCIAL || m.nombre_comercial || '').toLowerCase();
                                                        const desc = (m.DESCRIPCION || m.descripcion || '').toLowerCase();
                                                        const query = row.id_producto.toLowerCase();
                                                        return id.includes(query) || nombre.includes(query) || desc.includes(query);
                                                    }).map(m => {
                                                        const idMed = m.ID_MEDICAMENTO || m.id_medicamento;
                                                        const nomMed = m.NOMBRE_COMERCIAL || m.nombre_comercial;
                                                        const descMed = m.DESCRIPCION || m.descripcion;
                                                        const precioMed = parseFloat(m.PRECIO_UNITARIO || m.precio_unitario || 0);

                                                        return (
                                                            <div key={idMed} 
                                                                onClick={() => {
                                                                    const nuevas = [...posiciones];
                                                                    nuevas[index].id_producto = idMed.toString();
                                                                    nuevas[index].nombre = descMed ? `${nomMed}\n${descMed}` : nomMed;
                                                                    nuevas[index].precio = precioMed;
                                                                    
                                                                    setPosiciones(nuevas);
                                                                    setDropdownPosicion(null);
                                                                }}
                                                                className="sugerencia-item-material"
                                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #334155' }}
                                                            >
                                                                <strong className="sugerencia-id-highlight" style={{ marginRight: '6px' }}>{idMed}</strong>
                                                                {nomMed}
                                                                <br/><span className="sugerencia-subdescripcion" style={{ fontSize: '11px', color: '#94a3b8' }}>{descMed}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        
                                        <td>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={row.cantidad}
                                                onChange={e => {
                                                    const valor = e.target.value;
                                                    actualizarFila(index, 'cantidad', valor === '' ? '' : Math.max(1, parseInt(valor) || 1));
                                                }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                                required
                                                className="input-tabla-cantidad"
                                            />
                                        </td>
                                        <td className="td-um">UN</td>
                                        <td style={{ color: row.nombre.includes('⚠️') ? '#ef4444' : '#fff', whiteSpace: 'pre-line' }}>{row.nombre}</td>
                                        <td className="td-subtotal" style={{ textAlign: 'right' }}>
                                            {(row.precio * (row.cantidad || 0)).toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {posiciones.length > 1 && (
                                                <button type="button" onClick={() => eliminarPosicion(row.id_row)} className="btn-eliminar-posicion">✖</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="form-submit-container">
                    <button type="submit" className="btn-contabilizar">
                        Contabilizar Documento (Grabar)
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CallCenter;