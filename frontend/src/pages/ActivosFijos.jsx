import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando';
import { API_URL } from '../config/api';

const ActivosFijos = () => {
    const navigate = useNavigate();
    
    // --- LÓGICA DE ROLES CORREGIDA ---
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const rolUsuario = (user.rol || user.ROL || '').toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';

    const [activos, setActivos] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido
    
    // Estados para el buscador de sucursales (Solo Admin)
    const [sucursales, setSucursales] = useState([]);
    const [busquedaSucursal, setBusquedaSucursal] = useState('');
    const [showSucursales, setShowSucursales] = useState(false);
    const refSucursales = useRef(null);
    
    // Filtro de tabla y sucursal del gerente
    const [filtroTabla, setFiltroTabla] = useState('');
    const [gerenteSucursalNombre, setGerenteSucursalNombre] = useState('');
    
    const [nuevoActivo, setNuevoActivo] = useState({
        id_sucursal: '',
        tipo_activo: 'EQUIPO_COMPUTO',
        descripcion: '',
        valor_compra: ''
    });

    useEffect(() => {
        const inicializarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Ejecutamos las peticiones y los 2 segundos mínimos en paralelo
                const [resActivos, resSucursalesOrUser] = await Promise.all([
                    fetch('' + API_URL + '/api/activos').then(res => res.json()).catch(() => ({ success: false })),
                    esAdmin 
                        ? fetch('' + API_URL + '/api/sucursales').then(res => res.json()).catch(() => ({ success: false }))
                        : fetch('' + API_URL + '/api/usuarios').then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resActivos.success) {
                    setActivos(resActivos.data);
                }

                if (esAdmin) {
                    if (resSucursalesOrUser.success) {
                        setSucursales(resSucursalesOrUser.data);
                    }
                } else {
                    if (resSucursalesOrUser.success) {
                        const usuarioBuscado = (user.usuario || user.username || user.nombre || '').toString().toLowerCase();
                        const currentUser = resSucursalesOrUser.data.find(u => {
                            const dbUser = (u.USERNAME || u.username || u.USUARIO || u.nombre_usuario || '').toString().toLowerCase();
                            return dbUser === usuarioBuscado;
                        });
                        
                        if (currentUser) {
                            setGerenteSucursalNombre(currentUser.SUCURSAL || currentUser.sucursal || currentUser.NOMBRE_UBICACION || '');
                        }
                    }
                }
            } catch (error) {
                console.error("Error al inicializar datos:", error);
            } finally {
                setCargando(false);
            }
        };

        inicializarDatos();

        const handleClickOutside = (e) => {
            if (refSucursales.current && !refSucursales.current.contains(e.target)) {
                setShowSucursales(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [esAdmin]);

    const cargarActivos = async () => {
        try {
            const res = await fetch('' + API_URL + '/api/activos');
            const data = await res.json();
            if (data.success) setActivos(data.data);
        } catch (error) { console.error('Error al cargar activos:', error); }
    };

    const handleRegistrar = async (e) => {
        e.preventDefault();
        if (!esAdmin) return;
        
        if (!nuevoActivo.id_sucursal) {
            setMensaje('❌ Por favor, asegúrese de tener una sucursal asignada.');
            setTimeout(() => setMensaje(''), 4000);
            return;
        }

        try {
            const res = await fetch('' + API_URL + '/api/activos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoActivo)
            });
            const data = await res.json();
            
            if (data.success) {
                setMensaje('✅ ' + data.message);
                setNuevoActivo({ id_sucursal: '', tipo_activo: 'EQUIPO_COMPUTO', descripcion: '', valor_compra: '' });
                setBusquedaSucursal(''); 
                cargarActivos();
                setTimeout(() => setMensaje(''), 4000);
            }
        } catch (error) {
            console.error('Error al registrar activo:', error);
        }
    };

    const handleEstadoChange = async (id, nuevoEstado) => {
        const confirmar = window.confirm(`¿Estás seguro que deseas cambiar el estado de este activo a "${nuevoEstado.replace('_', ' ')}"?\n\nEsto puede afectar el cálculo del patrimonio total.`);
        
        if (!confirmar) {
            cargarActivos();
            return; 
        }

        try {
            await fetch(`' + API_URL + '/api/activos/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            cargarActivos();
        } catch (error) { 
            console.error('Error al actualizar estado:', error); 
        }
    };

    const sucursalesFiltradas = sucursales.filter(s => {
        const id = s.ID_SUCURSAL || s.id_sucursal;
        const nombre = s.NOMBRE_UBICACION || s.nombre_ubicacion;
        return id?.toString().includes(busquedaSucursal) || nombre?.toLowerCase().includes(busquedaSucursal.toLowerCase());
    });

    const activosVisibles = activos.filter(a => {
        if (!esAdmin) {
            if (gerenteSucursalNombre) {
                const nombreSucursalActivo = a.SUCURSAL || a.sucursal || a.NOMBRE_UBICACION;
                return nombreSucursalActivo === gerenteSucursalNombre;
            }
            return false;
        }
        
        if (filtroTabla) {
            const idSucursalActivo = a.ID_SUCURSAL || a.id_sucursal;
            return idSucursalActivo == filtroTabla;
        }
        return true;
    });

    const patrimonioTotal = activosVisibles
        .filter(a => {
            const estado = a.ESTADO || a.estado;
            return estado !== 'DE_BAJA';
        })
        .reduce((sum, a) => sum + parseFloat(a.VALOR_COMPRA || a.valor_compra || 0), 0);

    // Si está cargando, retornamos la plantilla reutilizable con su respectivo mensaje
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="activos-fijos-container">
            <div className="activos-header">
                <button onClick={() => navigate('/dashboard')} className="btn-regresar">
                    ← Regresar al Dashboard
                </button>
                <div className="activos-title-container">
                    <h2>Control de Activos Fijos y Patrimonio</h2>
                    <p>Auditoría de equipamiento, mobiliario y flota por sucursal.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {mensaje && (
                <div className={`mensaje-alerta ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
                    {mensaje}
                </div>
            )}

            <div className="grid-superior">
                
                {/* Formulario de Registro - SOLO VISIBLE PARA ADMIN */}
                {esAdmin && (
                    <div className="card-formulario">
                        <h3>Registrar Nueva Adquisición</h3>
                        <form onSubmit={handleRegistrar} className="form-registro">
                            
                            <div className="form-row">
                                <div ref={refSucursales} className="input-group">
                                    <label className="input-label">Sucursal Asignada</label>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por ID o Nombre..." 
                                        value={busquedaSucursal}
                                        onFocus={() => setShowSucursales(true)}
                                        onChange={e => { 
                                            setBusquedaSucursal(e.target.value); 
                                            setShowSucursales(true); 
                                            setNuevoActivo({...nuevoActivo, id_sucursal: ''}); 
                                        }}
                                        required
                                        className="input-field"
                                    />
                                    {showSucursales && (
                                        <div className="sucursales-dropdown">
                                            {sucursalesFiltradas.map(s => {
                                                const id = s.ID_SUCURSAL || s.id_sucursal;
                                                const nombre = s.NOMBRE_UBICACION || s.nombre_ubicacion;
                                                return (
                                                    <div 
                                                        key={id} 
                                                        onClick={() => { 
                                                            setNuevoActivo({...nuevoActivo, id_sucursal: id}); 
                                                            setBusquedaSucursal(nombre); 
                                                            setShowSucursales(false); 
                                                        }}
                                                        className="sucursal-item"
                                                    >
                                                        <strong className="sucursal-id">{id}</strong>
                                                        {nombre}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Clasificación del Activo</label>
                                    <select 
                                        value={nuevoActivo.tipo_activo} 
                                        onChange={e => setNuevoActivo({...nuevoActivo, tipo_activo: e.target.value})} 
                                        className="select-field"
                                    >
                                        <option value="EQUIPO_COMPUTO">Equipo de Cómputo / POS</option>
                                        <option value="VEHICULO">Vehículo / Motocicleta</option>
                                        <option value="MOBILIARIO">Mobiliario y Estantería</option>
                                        <option value="EQUIPO_ESPECIAL">Equipo Especial / Clínico</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="input-label">Descripción Técnica</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Ej. Motocicleta Honda NX 190, Mac M2..." 
                                    value={nuevoActivo.descripcion} 
                                    onChange={e => setNuevoActivo({...nuevoActivo, descripcion: e.target.value})} 
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="input-label">Valor de Compra (Q)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    placeholder="0.00" 
                                    value={nuevoActivo.valor_compra} 
                                    onChange={e => setNuevoActivo({...nuevoActivo, valor_compra: e.target.value})} 
                                    className="input-field"
                                />
                            </div>

                            <button type="submit" className="btn-submit">Dar de Alta Activo</button>
                        </form>
                    </div>
                )}

                {/* Resumen Financiero Rápido */}
                <div className="card-resumen" style={{ flex: esAdmin ? 1 : 'none', width: esAdmin ? 'auto' : '100%' }}>
                    <div className="card-resumen-icono">🏢</div>
                    <h3>Valor Total del Patrimonio</h3>
                    <div className="patrimonio-valor">
                        Q {patrimonioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="patrimonio-descripcion">
                        {esAdmin && !filtroTabla 
                            ? "Este valor consolida la inversión en infraestructura de toda la cadena (excluyendo activos dados de baja)."
                            : `Inversión en infraestructura de la sucursal ${gerenteSucursalNombre || ''} (excluyendo bajas).`
                        }
                    </p>
                </div>
            </div>

            {/* Tabla de Activos */}
            <div className="card-tabla">
                <div className="tabla-header-container">
                    <h3>
                        Inventario de Activos Fijos {esAdmin ? 'por Sucursal' : `- ${gerenteSucursalNombre}`}
                    </h3>
                    
                    {esAdmin && (
                        <div className="filtro-container">
                            <label>Filtrar vista:</label>
                            <select 
                                value={filtroTabla}
                                onChange={e => setFiltroTabla(e.target.value)}
                                className="select-filtro"
                            >
                                <option value="">--- Todas las Sucursales ---</option>
                                {sucursales.map(s => {
                                    const id = s.ID_SUCURSAL || s.id_sucursal;
                                    const nombre = s.NOMBRE_UBICACION || s.nombre_ubicacion;
                                    return <option key={id} value={id}>{nombre}</option>
                                })}
                            </select>
                        </div>
                    )}
                </div>
                
                <table className="tabla-activos">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Sucursal Asignada</th>
                            <th>Clasificación</th>
                            <th>Descripción Técnica</th>
                            <th style={{ textAlign: 'right' }}>Valor Compra (Q)</th>
                            <th style={{ textAlign: 'center' }}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activosVisibles.length > 0 ? (
                            activosVisibles.map(a => {
                                const idActivo = a.ID_ACTIVO || a.id_activo;
                                const nombreSucursal = a.SUCURSAL || a.sucursal || a.NOMBRE_UBICACION || `Centro ${a.ID_SUCURSAL || a.id_sucursal}`;
                                const tipoActivo = a.TIPO_ACTIVO || a.tipo_activo || '';
                                const descripcion = a.DESCRIPCION || a.descripcion;
                                const valorCompra = a.VALOR_COMPRA || a.valor_compra;
                                const estado = a.ESTADO || a.estado;

                                const claseEstadoSelect = 
                                    estado === 'ACTIVO' ? 'estado-activo' : 
                                    estado === 'EN_REPARACION' ? 'estado-reparacion' : 'estado-baja';

                                const claseFilaBaja = estado === 'DE_BAJA' ? 'fila-baja' : '';

                                return (
                                    <tr key={idActivo} className={claseFilaBaja}>
                                        <td className="codigo-activo">AF-{idActivo}</td>
                                        <td className="sucursal-activo">{nombreSucursal}</td>
                                        <td className="clasificacion-activo">{tipoActivo.replace('_', ' ')}</td>
                                        <td className="descripcion-activo">{descripcion}</td>
                                        <td className="valor-activo">Q {parseFloat(valorCompra).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        <td className="estado-activo-td">
                                            {esAdmin ? (
                                                <select 
                                                    value={estado}
                                                    onChange={(e) => handleEstadoChange(idActivo, e.target.value)}
                                                    className={`select-estado ${claseEstadoSelect}`}
                                                >
                                                    <option value="ACTIVO">ACTIVO</option>
                                                    <option value="EN_REPARACION">EN REPARACION</option>
                                                    <option value="DE_BAJA">DE BAJA</option>
                                                </select>
                                            ) : (
                                                <span className={`badge-estado ${claseEstadoSelect}`}>
                                                    {estado}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr><td colSpan="6" className="tabla-vacia">
                                {esAdmin && filtroTabla ? 'Esta sucursal no tiene activos registrados.' : 'No hay activos fijos registrados en esta sucursal.'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivosFijos;