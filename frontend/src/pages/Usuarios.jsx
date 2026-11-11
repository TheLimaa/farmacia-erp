import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga

const Usuarios = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido
    
    // Modal y Formulario
    const [modalAbierto, setModalAbierto] = useState(false);
    const [idEmpleadoBusqueda, setIdEmpleadoBusqueda] = useState('');
    const [empleadoEncontrado, setEmpleadoEncontrado] = useState(null);
    
    const [formUsuario, setFormUsuario] = useState({
        username: '',
        password: '',
        rol: 'VENDEDOR'
    });

    useEffect(() => {
        const inicializarDatos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Ejecutamos la petición y el tiempo mínimo en paralelo
                const [res] = await Promise.all([
                    fetch('http://localhost:3000/api/usuarios').then(r => r.json()).catch(() => ({ success: false })),
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

    const cargarUsuarios = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/usuarios');
            const data = await res.json();
            if (data.success) setUsuarios(data.data);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        }
    };

    const buscarEmpleado = async () => {
        if (!idEmpleadoBusqueda) return;
        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/empleado/${idEmpleadoBusqueda}`);
            const data = await res.json();
            
            if (data.success && data.data) {
                const emp = data.data;
                const puestoUpper = (emp.PUESTO || emp.puesto || '').toUpperCase();

                setEmpleadoEncontrado(emp);
                
                // AUTODETECCIÓN DE ROL INCLUYENDO REPARTIDOR
                let rolCalculado = 'VENDEDOR'; 
                
                if (puestoUpper.includes('ADMINISTRADOR') || puestoUpper === 'ADMINISTRADOR') {
                    rolCalculado = 'ADMINISTRADOR';
                } else if (puestoUpper.includes('GERENTE') || puestoUpper === 'GERENTE') {
                    rolCalculado = 'GERENTE';
                } else if (puestoUpper.includes('CAJERO') || puestoUpper === 'CAJERO') {
                    rolCalculado = 'CAJERO';
                } else if (puestoUpper.includes('REPARTIDOR') || puestoUpper === 'REPARTIDOR') {
                    rolCalculado = 'REPARTIDOR';
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

    const crearUsuario = async (e) => {
        e.preventDefault();
        if (!empleadoEncontrado) {
            alert('Debe verificar un código de empleado primero.');
            return;
        }

        try {
            const res = await fetch('http://localhost:3000/api/usuarios', {
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

    const eliminarUsuario = async (id, user) => {
        if (!window.confirm(`¿Está seguro de eliminar las credenciales de "${user}"?`)) return;
        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, { method: 'DELETE' });
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

    // Si está cargando inicialmente, mostramos la plantilla reutilizable
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="usuarios-container">
            
            {/* Cabecera */}
            <div className="usuarios-header-bar">
                <div className="usuarios-title-wrapper">
                    <button onClick={() => navigate('/dashboard')} className="btn-regresar-usuarios">❮</button>
                    <h2 className="usuarios-main-title">Gestión de Usuarios del Sistema</h2>
                </div>
                <button onClick={() => {
                    setEmpleadoEncontrado(null);
                    setIdEmpleadoBusqueda('');
                    setFormUsuario({ username: '', password: '', rol: 'VENDEDOR' });
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

            {/* Tabla de Usuarios */}
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
                            <th style={{ textAlign: 'center' }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => {
                            const id = u.ID_USUARIO || u.id_usuario;
                            const username = u.USERNAME || u.username;
                            const empleado = u.NOMBRE_COMPLETO || u.nombre_completo || 'Sin Ficha Empleado';
                            const puesto = u.PUESTO || u.puesto || '-';
                            const sucursal = u.SUCURSAL || u.sucursal || 'Acceso Global (ADMINISTRADOR)';
                            const rol = u.ROL || u.rol;

                            // Definir clase del badge según el rol
                            let claseRol = 'vendedor'; 
                            if (rol === 'ADMINISTRADOR') claseRol = 'administrador'; 
                            else if (rol === 'GERENTE') claseRol = 'gerente'; 
                            else if (rol === 'CAJERO') claseRol = 'cajero'; 
                            else if (rol === 'REPARTIDOR') claseRol = 'repartidor';

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
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => eliminarUsuario(id, username)} className="btn-eliminar-acceso">
                                            🗑️ Eliminar Acceso
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear Usuario */}
            {modalAbierto && (
                <div className="usuarios-modal-overlay">
                    <div className="usuarios-modal-content">
                        <h3 className="usuarios-modal-title">Crear Credenciales de Acceso</h3>
                        
                        <div className="usuarios-busqueda-grupo">
                            <label className="usuarios-form-label">Código de Empleado:*</label>
                            <div className="usuarios-busqueda-row">
                                <input 
                                    type="number" 
                                    placeholder="Ej. 3" 
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
                                <input type="text" required value={formUsuario.username} onChange={e => setFormUsuario({...formUsuario, username: e.target.value})} className="usuarios-form-input" />
                            </div>

                            <div className="usuarios-form-field">
                                <label className="usuarios-form-label">Contraseña:*</label>
                                <input type="password" required value={formUsuario.password} onChange={e => setFormUsuario({...formUsuario, password: e.target.value})} className="usuarios-form-input" />
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
        </div>
    );
};

export default Usuarios;