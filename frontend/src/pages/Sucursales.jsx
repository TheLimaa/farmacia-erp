import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga
import { API_URL } from '../config/api';

const Sucursales = () => {
    const navigate = useNavigate();
    const [sucursales, setSucursales] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(true);

    // Verificación de Rol (Admin)
    const usuarioSesion = JSON.parse(localStorage.getItem('usuario') || '{}');
    const esAdmin = usuarioSesion.rol === 'ADMIN' || usuarioSesion.ROL === 'ADMIN' || usuarioSesion.rol === 'ADMINISTRADOR';

    // Estados para Formulario / Modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [nombreUbicacion, setNombreUbicacion] = useState('');
    const [tipoUbicacion, setTipoUbicacion] = useState('FARMACIA');

    useEffect(() => {
        const inicializarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            setCargando(true);
            try {
                const [res] = await Promise.all([
                    fetch('' + API_URL + '/api/sucursales').then(r => r.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (res.success) {
                    setSucursales(res.data);
                }
            } catch (error) {
                console.error('Error al cargar sucursales:', error);
                setMensaje('❌ Error al conectar con el servidor.');
            } finally {
                setCargando(false);
            }
        };

        inicializarDatos();
    }, []);

    const cargarSucursales = async () => {
        try {
            const res = await fetch('' + API_URL + '/api/sucursales');
            const data = await res.json();
            if (data.success) setSucursales(data.data);
        } catch (error) {
            console.error('Error al cargar sucursales:', error);
            setMensaje('❌ Error al conectar con el servidor.');
        }
    };

    const abrirModalCrear = () => {
        setEditandoId(null);
        setNombreUbicacion('');
        setTipoUbicacion('FARMACIA');
        setModalAbierto(true);
    };

    const abrirModalEditar = (suc) => {
        setEditandoId(suc.ID_SUCURSAL || suc.id_sucursal);
        setNombreUbicacion(suc.NOMBRE_UBICACION || suc.nombre_ubicacion);
        setTipoUbicacion(suc.TIPO_UBICACION || suc.tipo_ubicacion || 'FARMACIA');
        setModalAbierto(true);
    };

    const guardarSucursal = async (e) => {
        e.preventDefault();
        const url = editandoId 
            ? `' + API_URL + '/api/sucursales/${editandoId}`
            : '' + API_URL + '/api/sucursales';
        const method = editandoId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nombre_ubicacion: nombreUbicacion,
                    tipo_ubicacion: tipoUbicacion 
                })
            });
            const data = await res.json();

            if (data.success) {
                setMensaje('✅ ' + data.message);
                setModalAbierto(false);
                cargarSucursales();
            } else {
                setMensaje('❌ ' + data.message);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            setMensaje('❌ Error procesando la solicitud.');
        }
    };

    const cambiarEstado = async (id, estadoActual) => {
        const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        try {
            const res = await fetch(`' + API_URL + '/api/sucursales/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            const data = await res.json();
            if (data.success) {
                cargarSucursales();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    const eliminarSucursal = async (id) => {
        if (!window.confirm(`¿Está seguro de eliminar la sucursal ID ${id}?`)) return;
        try {
            const res = await fetch(`' + API_URL + '/api/sucursales/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMensaje('✅ ' + data.message);
                cargarSucursales();
            } else {
                alert(data.message);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            console.error('Error eliminando sucursal:', error);
        }
    };

    // Bloqueo de acceso si no es Administrador
    if (!esAdmin && usuarioSesion.rol) {
        return (
            <div className="sucursales-denegado-container">
                <h2 className="sucursales-denegado-titulo">⚠️ Acceso Denegado</h2>
                <p className="sucursales-denegado-texto">Esta vista está reservada exclusivamente para Administradores del Sistema.</p>
                <button onClick={() => navigate('/dashboard')} className="btn-volver-dashboard">
                    Volver al Dashboard
                </button>
            </div>
        );
    }

    // Si está cargando inicialmente, mostramos la plantilla reutilizable
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="sucursales-container">
            
            {/* Cabecera */}
            <div className="sucursales-header-bar">
                <div className="sucursales-title-wrapper">
                    <button onClick={() => navigate('/dashboard')} className="btn-regresar-sucursales">❮</button>
                    <h2 className="sucursales-main-title">Gestión de Sucursales (Administración)</h2>
                </div>
                <button onClick={abrirModalCrear} className="btn-nueva-sucursal">
                    + Nueva Sucursal
                </button>
            </div>

            {mensaje && (
                <div className={`sucursales-mensaje-alerta ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
                    {mensaje}
                </div>
            )}

            {/* Tabla de Sucursales */}
            <div className="sucursales-card-tabla">
                <table className="sucursales-tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre / Ubicación</th>
                            <th>Tipo Ubicación</th>
                            <th>Saldo Caja</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sucursales.length > 0 ? (
                            sucursales.map((suc) => {
                                const id = suc.ID_SUCURSAL || suc.id_sucursal;
                                const nombre = suc.NOMBRE_UBICACION || suc.nombre_ubicacion;
                                const tipo = suc.TIPO_UBICACION || suc.tipo_ubicacion || 'FARMACIA';
                                const estado = suc.ESTADO || suc.estado || 'ACTIVO';
                                const saldo = suc.SALDO_CAJA || suc.saldo_caja || 0;

                                return (
                                    <tr key={id}>
                                        <td className="td-id-sucursal">{id}</td>
                                        <td className="td-nombre-sucursal">{nombre}</td>
                                        <td className="td-tipo-sucursal">{tipo}</td>
                                        <td className="td-saldo-caja">Q {parseFloat(saldo).toFixed(2)}</td>
                                        <td>
                                            <span className={`badge-estado-sucursal ${estado === 'ACTIVO' ? 'activo' : 'inactivo'}`}>
                                                {estado}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="sucursales-acciones-wrapper">
                                                <button onClick={() => abrirModalEditar(suc)} className="btn-editar-sucursal">
                                                    ✏️ Editar
                                                </button>
                                                <button onClick={() => cambiarEstado(id, estado)} className={`btn-estado-sucursal ${estado === 'ACTIVO' ? 'inactivar' : 'activar'}`}>
                                                    {estado === 'ACTIVO' ? '🚫 Inactivar' : '✅ Activar'}
                                                </button>
                                                <button onClick={() => eliminarSucursal(id)} className="btn-eliminar-sucursal">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="6" className="sucursales-tabla-vacia">No hay sucursales registradas.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal para Crear / Editar */}
            {modalAbierto && (
                <div className="sucursales-modal-overlay">
                    <div className="sucursales-modal-content">
                        <h3 className="sucursales-modal-title">
                            {editandoId ? `Editar Sucursal #${editandoId}` : 'Nueva Sucursal'}
                        </h3>
                        <form onSubmit={guardarSucursal} className="sucursales-form-group">
                            <div className="sucursales-form-field">
                                <label className="sucursales-form-label">Nombre / Ubicación:*</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={nombreUbicacion} 
                                    onChange={e => setNombreUbicacion(e.target.value)} 
                                    placeholder="Ej. Farmacia Centro Comercial Andaria" 
                                    className="sucursales-form-input" 
                                />
                            </div>

                            <div className="sucursales-form-field">
                                <label className="sucursales-form-label">Tipo de Ubicación:*</label>
                                <select 
                                    value={tipoUbicacion} 
                                    onChange={e => setTipoUbicacion(e.target.value)} 
                                    className="sucursales-form-select"
                                >
                                    <option value="FARMACIA">FARMACIA (Punto de Venta)</option>
                                    <option value="BODEGA">BODEGA (Almacén Central)</option>
                                    <option value="CALL_CENTER">CALL_CENTER (Atención a Clientes)</option>
                                </select>
                            </div>

                            <div className="sucursales-modal-buttons-row">
                                <button type="button" onClick={() => setModalAbierto(false)} className="btn-modal-cancelar">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-modal-guardar">
                                    {editandoId ? 'Actualizar' : 'Crear y Asignar Caja'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sucursales;