import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando';
import { API_URL } from '../config/api';

const Usuarios = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(true);
    const [verPassword, setVerPassword] = useState(false);
    const [verPasswordEdit, setVerPasswordEdit] = useState(false);
    
    // Estados para el buscador
    const [busqueda, setBusqueda] = useState('');

    // Estados para el Modal de Crear Usuario
    const [modalAbierto, setModalAbierto] = useState(false);
    const [idEmpleadoBusqueda, setIdEmpleadoBusqueda] = useState('');
    const [empleadoEncontrado, setEmpleadoEncontrado] = useState(null);
    
    const [formUsuario, setFormUsuario] = useState({
        username: '',
        password: '',
        rol: 'VENDEDOR'
    });

    // Estados para el Modal de Cambiar Contraseña
    const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [nuevaPassword, setNuevaPassword] = useState('');

    // Carga la lista inicial de usuarios en paralelo junto con un tiempo mínimo de espera
    useEffect(() => {
        const inicializarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const [res] = await Promise.all([
                    fetch(`${API_URL}/api/usuarios`).then(r => r.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (res.success) {
                    setUsuarios(res.data);
                }
            } catch (error) {
                console.error('Error al cargar usuarios:', error);
            } finally {
                setCargando(false);
            }
        };

        inicializarDatos();
    }, []);

    // Consulta la lista actualizada de usuarios desde la API
    const cargarUsuarios = async () => {
        try {
            const res = await fetch(`${API_URL}/api/usuarios`);
            const data = await res.json();
            if (data.success) setUsuarios(data.data);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        }
    };

    // Busca un empleado por su código para asociarlo al nuevo usuario y asigna su rol automáticamente
    const buscarEmpleado = async () => {
        if (!idEmpleadoBusqueda) return;
        try {
            const res = await fetch(`${API_URL}/api/usuarios/empleado/${idEmpleadoBusqueda}`);
            const data = await res.json();
            
            if (data.success && data.data) {
                const emp = data.data;
                const puestoUpper = (emp.PUESTO || emp.puesto || '').toUpperCase();

                setEmpleadoEncontrado(emp);
                
                let rolCalculado = 'VENDEDOR'; 
                
                if (puestoUpper.includes('ADMINISTRADOR') || puestoUpper === 'ADMINISTRADOR') {
                    rolCalculado = 'ADMINISTRADOR';
                } else if (puestoUpper.includes('GERENTE') || puestoUpper === 'GERENTE') {
                    rolCalculado = 'GERENTE';
                } else if (puestoUpper.includes('CAJERO') || puestoUpper === 'CAJERO') {
                    rolCalculado = 'CAJERO';
                } else if (puestoUpper.includes('REPARTIDOR') || puestoUpper === 'REPARTIDOR') {
                    rolCalculado = 'REPARTIDOR';
                } else if (puestoUpper.includes('GESTOR DE PERSONAL') || puestoUpper === 'GESTOR DE PERSONAL') {
                    rolCalculado = 'GESTOR DE PERSONAL';
                } else if (puestoUpper.includes('AUDITOR') || puestoUpper === 'AUDITOR') {
                    rolCalculado = 'AUDITOR';
                } else if (puestoUpper.includes('VENDEDOR') || puestoUpper === 'VENDEDOR') {
                    rolCalculado = 'VENDEDOR';
                }

                setFormUsuario(prev => ({ ...prev, rol: rolCalculado }));
            } else {
                setEmpleadoEncontrado(null);
                alert('Empleado no encontrado con el código ingresado.');
            }
        } catch (error) {
            console.error('Error buscando empleado:', error);
        }
    };

    // Envía los datos del formulario para registrar las nuevas credenciales de acceso de un usuario
    const crearUsuario = async (e) => {
        e.preventDefault();
        if (!empleadoEncontrado) {
            alert('Debe verificar un código de empleado primero.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_empleado: empleadoEncontrado.ID_EMPLEADO || empleadoEncontrado.id_empleado,
                    username: formUsuario.username,
                    password: formUsuario.password,
                    rol: formUsuario.rol
                })
            });
            const data = await res.json();

            if (data.success) {
                setMensaje('✅ ' + data.message);
                setModalAbierto(false);
                setEmpleadoEncontrado(null);
                setIdEmpleadoBusqueda('');
                setFormUsuario({ username: '', password: '', rol: 'VENDEDOR' });
                cargarUsuarios();
            } else {
                setMensaje('❌ ' + data.message);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            setMensaje('❌ Error al crear usuario.');
        }
    };

    // Función para actualizar / cambiar la contraseña del usuario seleccionado
    const cambiarPassword = async (e) => {
        e.preventDefault();
        if (!usuarioSeleccionado) return;

        const idUsuario = usuarioSeleccionado.ID_USUARIO || usuarioSeleccionado.id_usuario;

        try {
            const res = await fetch(`${API_URL}/api/usuarios/${idUsuario}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: nuevaPassword })
            });
            const data = await res.json();

            if (data.success) {
                setMensaje('✅ Contraseña actualizada correctamente para ' + (usuarioSeleccionado.USERNAME || usuarioSeleccionado.username));
                setModalPasswordAbierto(false);
                setUsuarioSeleccionado(null);
                setNuevaPassword('');
                setVerPasswordEdit(false);
            } else {
                setMensaje('❌ ' + (data.message || 'Error al actualizar contraseña.'));
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            setMensaje('❌ Error de conexión al cambiar la contraseña.');
        }
    };

    // Elimina las credenciales de acceso de un usuario previa confirmación
    const eliminarUsuario = async (id, user) => {
        if (!window.confirm(`¿Está seguro de eliminar las credenciales de "${user}"?`)) return;
        try {
            const res = await fetch(`${API_URL}/api/usuarios/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMensaje('✅ ' + data.message);
                cargarUsuarios();
            } else {
                alert(data.message);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            console.error('Error eliminando usuario:', error);
        }
    };

    // Filtrar usuarios basado en el input de búsqueda (por ID, nombre de usuario o nombre del empleado)
    const usuariosFiltrados = usuarios.filter(u => {
        const id = String(u.ID_USUARIO || u.id_usuario || '');
        const username = (u.USERNAME || u.username || '').toLowerCase();
        const empleado = (u.NOMBRE_COMPLETO || u.nombre_completo || '').toLowerCase();
        const termino = busqueda.toLowerCase();

        return id.includes(termino) || username.includes(termino) || empleado.includes(termino);
    });

    // Muestra la pantalla de carga mientras se obtienen los datos iniciales
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="usuarios-container">
            
            <div className="usuarios-header-bar">
                <div className="usuarios-title-wrapper">
                    <button onClick={() => navigate('/dashboard')} className="btn-regresar-usuarios">❮</button>
                    <h2 className="usuarios-main-title">Gestión de Usuarios del Sistema</h2>
                </div>
                <button onClick={() => {
                    setEmpleadoEncontrado(null);
                    setIdEmpleadoBusqueda('');
                    setFormUsuario({ username: '', password: '', rol: 'VENDEDOR' });
                    setVerPassword(false);
                    setModalAbierto(true);
                }} className="btn-nuevo-usuario">
                    + Nuevo Usuario
                </button>
            </div>

            {mensaje && (
                <div className={`usuarios-mensaje-alerta ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
                    {mensaje}
                </div>
            )}

            {/* Barra de Búsqueda */}
            <div className="usuarios-filtro-container" style={{ margin: '15px 0', display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    placeholder="🔍 Filtrar por ID, Nombre de Usuario o Empleado..." 
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="usuarios-form-input"
                    style={{ maxWidth: '400px' }}
                />
            </div>

            <div className="usuarios-card-tabla">
                <table className="usuarios-tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Empleado Vinculado</th>
                            <th>Puesto</th>
                            <th>Sucursal Asignada</th>
                            <th>Rol / Permisos</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuariosFiltrados.length > 0 ? (
                            usuariosFiltrados.map(u => {
                                const id = u.ID_USUARIO || u.id_usuario;
                                const username = u.USERNAME || u.username;
                                const empleado = u.NOMBRE_COMPLETO || u.nombre_completo || 'Sin Ficha Empleado';
                                const puesto = u.PUESTO || u.puesto || '-';
                                const sucursal = u.SUCURSAL || u.sucursal || 'Acceso Global (ADMINISTRADOR)';
                                const rol = u.ROL || u.rol;

                                let claseRol = 'vendedor'; 
                                if (rol === 'ADMINISTRADOR') claseRol = 'administrador'; 
                                else if (rol === 'GERENTE') claseRol = 'gerente'; 
                                else if (rol === 'CAJERO') claseRol = 'cajero'; 
                                else if (rol === 'REPARTIDOR') claseRol = 'repartidor';
                                else if (rol === 'GESTOR DE PERSONAL') claseRol = 'gestor-personal';
                                else if (rol === 'AUDITOR') claseRol = 'auditor';

                                return (
                                    <tr key={id}>
                                        <td className="td-id-usuario">#{id}</td>
                                        <td className="td-username">{username}</td>
                                        <td className="td-empleado-vinculado">{empleado}</td>
                                        <td className="td-puesto-usuario">{puesto}</td>
                                        <td className={`td-sucursal-usuario ${sucursal.includes('Global') ? 'global' : 'tienda'}`}>{sucursal}</td>
                                        <td>
                                            <span className={`badge-rol-usuario ${claseRol}`}>
                                                {rol}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => {
                                                    setUsuarioSeleccionado(u);
                                                    setNuevaPassword('');
                                                    setVerPasswordEdit(false);
                                                    setModalPasswordAbierto(true);
                                                }} 
                                                className="btn-editar-password"
                                                title="Cambiar contraseña"
                                                style={{ background: '#644c5d', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}
                                            >
                                                🔑 Cambiar Clave
                                            </button>
                                            <button onClick={() => eliminarUsuario(id, username)} className="btn-eliminar-acceso">
                                                🗑️ Eliminar Acceso
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>
                                    No se encontraron usuarios coincidentes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal para Crear Usuario */}
            {modalAbierto && (
                <div className="usuarios-modal-overlay">
                    <div className="usuarios-modal-content">
                        <h3 className="usuarios-modal-title">Crear Credenciales de Acceso</h3>
                        
                        <div className="usuarios-busqueda-grupo">
                            <label className="usuarios-form-label">Código de Empleado:*</label>
                            <div className="usuarios-busqueda-row">
                                <input 
                                    type="number" 
                                    placeholder="" 
                                    value={idEmpleadoBusqueda} 
                                    onChange={e => setIdEmpleadoBusqueda(e.target.value)} 
                                    className="usuarios-input-buscar" 
                                />
                                <button type="button" onClick={buscarEmpleado} className="btn-verificar-empleado">
                                    Verificar
                                </button>
                            </div>
                        </div>

                        {empleadoEncontrado && (
                            <div className="usuarios-empleado-encontrado-card">
                                <div className="usuarios-empleado-grid-row">
                                    <strong className="usuarios-empleado-label">Empleado:</strong> 
                                    <span className="usuarios-empleado-valor-nombre">{empleadoEncontrado.NOMBRE_COMPLETO || empleadoEncontrado.nombre_completo}</span>
                                </div>
                                <div className="usuarios-empleado-grid-row">
                                    <strong className="usuarios-empleado-label">Puesto:</strong> 
                                    <span className="usuarios-empleado-valor-puesto">{empleadoEncontrado.PUESTO || empleadoEncontrado.puesto}</span>
                                </div>
                                <div className="usuarios-empleado-grid-row">
                                    <strong className="usuarios-empleado-label">Centro:</strong> 
                                    <span className="usuarios-empleado-valor-centro">{empleadoEncontrado.SUCURSAL || empleadoEncontrado.sucursal || 'Global (Sin Sucursal)'}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={crearUsuario} className="usuarios-form-crear">
                            <div className="usuarios-form-field">
                                <label className="usuarios-form-label">Nombre de Usuario:*</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formUsuario.username} 
                                    onChange={e => setFormUsuario({...formUsuario, username: e.target.value.toUpperCase()})} 
                                    style={{ textTransform: 'uppercase' }}
                                    className="usuarios-form-input" 
                                />
                            </div>

                            <div className="usuarios-form-field">
                                <label className="usuarios-form-label">Contraseña:*</label>
                                <div className="usuarios-password-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type={verPassword ? "text" : "password"} 
                                        required 
                                        value={formUsuario.password} 
                                        onChange={e => setFormUsuario({...formUsuario, password: e.target.value})} 
                                        className="usuarios-form-input" 
                                        style={{ width: '100%', paddingRight: '40px' }}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setVerPassword(!verPassword)} 
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.1rem',
                                            padding: '0'
                                        }}
                                        title={verPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                    >
                                        {verPassword ? "👁️‍🗨️" : "👁️"}
                                    </button>
                                </div>
                            </div>

                            <div className="usuarios-form-field">
                                <label className="usuarios-form-label">Rol / Permisos de Acceso:*</label>
                                <select 
                                    value={formUsuario.rol} 
                                    disabled={true} 
                                    className="usuarios-form-select-disabled"
                                >
                                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                                    <option value="GERENTE">GERENTE</option>
                                    <option value="CAJERO">CAJERO</option>
                                    <option value="REPARTIDOR">REPARTIDOR</option>
                                    <option value="GESTOR DE PERSONAL">GESTOR DE PERSONAL</option>
                                    <option value="AUDITOR">AUDITOR</option>
                                    <option value="VENDEDOR">VENDEDOR</option>
                                </select>
                                <small className="usuarios-helper-text">
                                    🔒 Permisos asignados automáticamente según el puesto ({empleadoEncontrado?.PUESTO || empleadoEncontrado?.puesto || 'Sin verificar'}).
                                </small>
                            </div>

                            <div className="usuarios-modal-buttons-row">
                                <button type="button" onClick={() => setModalAbierto(false)} className="btn-modal-cancelar">
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={!empleadoEncontrado}
                                    className={`btn-modal-grabar ${empleadoEncontrado ? 'valido' : 'invalido'}`}
                                >
                                    Grabar Usuario
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Cambiar Contraseña */}
            {modalPasswordAbierto && usuarioSeleccionado && (
                <div className="usuarios-modal-overlay">
                    <div className="usuarios-modal-content">
                        <h3 className="usuarios-modal-title">Cambiar Contraseña</h3>
                        <p style={{ marginBottom: '15px', color: '#555' }}>
                            Usuario: <strong>{usuarioSeleccionado.USERNAME || usuarioSeleccionado.username}</strong> <br />
                            Empleado: <strong>{usuarioSeleccionado.NOMBRE_COMPLETO || usuarioSeleccionado.nombre_completo}</strong>
                        </p>

                        <form onSubmit={cambiarPassword} className="usuarios-form-crear">
                            <div className="usuarios-form-field">
                                <label className="usuarios-form-label">Nueva Contraseña:*</label>
                                <div className="usuarios-password-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type={verPasswordEdit ? "text" : "password"} 
                                        required 
                                        value={nuevaPassword} 
                                        onChange={e => setNuevaPassword(e.target.value)} 
                                        className="usuarios-form-input" 
                                        placeholder="Ingrese la nueva clave"
                                        style={{ width: '100%', paddingRight: '40px' }}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setVerPasswordEdit(!verPasswordEdit)} 
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.1rem',
                                            padding: '0'
                                        }}
                                        title={verPasswordEdit ? "Ocultar contraseña" : "Ver contraseña"}
                                    >
                                        {verPasswordEdit ? "👁️‍🗨️" : "👁️"}
                                    </button>
                                </div>
                            </div>

                            <div className="usuarios-modal-buttons-row" style={{ marginTop: '20px' }}>
                                <button type="button" onClick={() => setModalPasswordAbierto(false)} className="btn-modal-cancelar">
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-modal-grabar valido"
                                >
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Usuarios;