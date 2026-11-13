import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando';
import logoVita from '../assets/Vita+.svg';
import { API_URL } from '../config/api';

const Dashboard = () => {
    const navigate = useNavigate();
    
    // Obtiene los datos de la sesión actual del almacenamiento local o de sesión
    const sessionUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    
    const [userData, setUserData] = useState({
        nombreCompleto: sessionUser.nombre_empleado || sessionUser.nombre || sessionUser.usuario || sessionUser.username || 'Usuario',
        rol: (sessionUser.rol || sessionUser.ROL || '').toUpperCase(),
        sucursal: sessionUser.sucursal || sessionUser.SUCURSAL || ''
    });

    const [cargando, setCargando] = useState(true);

    // Consulta los detalles actualizados del usuario en la base de datos al montar el componente
    useEffect(() => {
        const obtenerDetallesUsuario = async () => {
            const usuarioBuscado = (sessionUser.usuario || sessionUser.username || sessionUser.nombre || '').toString().toLowerCase();
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 500));

            try {
                const [res] = await Promise.all([
                    usuarioBuscado ? fetch('' + API_URL + '/api/usuarios') : Promise.resolve(null),
                    tiempoMinimo
                ]);

                if (res) {
                    const data = await res.json();
                    
                    if (data.success) {
                        const match = data.data.find(u => {
                            const dbUser = (u.USERNAME || u.username || u.USUARIO || u.nombre_usuario || '').toString().toLowerCase();
                            return dbUser === usuarioBuscado;
                        });

                        if (match) {
                            const nombreReal = match.NOMBRE_EMPLEADO || match.nombre_empleado || match.NOMBRE || sessionUser.nombre || sessionUser.usuario;
                            const rolReal = (match.ROL || match.rol || sessionUser.rol || '').toUpperCase();
                            const sucursalReal = match.SUCURSAL || match.sucursal || match.NOMBRE_UBICACION || '';

                            setUserData({
                                nombreCompleto: nombreReal,
                                rol: rolReal,
                                sucursal: sucursalReal
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Error al obtener detalles del usuario:", error);
            } finally {
                setCargando(false);
            }
        };

        obtenerDetallesUsuario();
    }, []);

    // Limpia todo el almacenamiento del navegador y redirige al usuario a la pantalla de inicio de sesión
    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login');
    };

    const permisosPorRol = {
        'REPARTIDOR': [],
        'VENDEDOR': ['/stock', '/call-center'],
        'CAJERO': ['/stock', '/call-center', '/delivery', '/transito'],
        'AUDITOR': ['/stock', '/sucursales', '/activos-fijos', '/auditoria'],
        'GESTOR DE PERSONAL': ['/sucursales', '/rrhh'],
        'GERENTE': ['/stock', '/call-center', '/transito', '/delivery', '/activos-fijos', '/auditoria'],
        'ADMINISTRADOR': ['*']
    };

    // Verifica si el rol del usuario cuenta con permisos para acceder a una ruta específica
    const tienePermiso = (ruta) => {
        const rolUsuario = (userData.rol || '').toUpperCase();
        const permisos = permisosPorRol[rolUsuario] || [];
        
        if (permisos.includes('*')) return true;
        return permisos.includes(ruta);
    };

    // Muestra la pantalla de carga mientras se obtienen los datos del usuario
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="dashboard-container">
            
            <div className="dashboard-topbar">
                <div className="dashboard-topbar-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img 
                        src={logoVita} 
                        alt="Logo Vitta+" 
                        style={{ width: '56px', height: '56px', objectFit: 'contain' }} 
                    />
                    <span className="dashboard-topbar-title">Página de inicio — Farmacias Vita+</span>
                </div>
                <div className="dashboard-user-info-wrapper">
                    <span className="dashboard-user-meta">
                        Conectado: <strong className="dashboard-user-name-highlight">{userData.nombreCompleto}</strong> ({userData.rol || 'SIN ROL'} {userData.sucursal ? `- ${userData.sucursal}` : ''})
                    </span>
                    <button onClick={handleLogout} className="btn-cerrar-sesion">Cerrar Sesión</button>
                </div>
            </div>

            <div className="dashboard-subnav">
                ≡ &nbsp; INICIO
            </div>

            <div className="dashboard-content">
                <h3 className="dashboard-section-title">Páginas Operativas</h3>

                <div className="dashboard-tiles-grid">
                    
                    {tienePermiso('/registros-medicamento') && (
                        <div 
                            onClick={() => navigate('/registros-medicamento')}
                            className="dashboard-tile tile-inventario"
                        >
                            <div className="dashboard-tile-icono">📦</div>
                            <div className="dashboard-tile-titulo">Gestión de Inventarios</div>
                            <div className="dashboard-tile-descripcion">Registrar medicamento y asignación de lotes</div>
                        </div>
                    )}

                    {tienePermiso('/stock') && (
                        <div 
                            onClick={() => navigate('/stock')}
                            className="dashboard-tile tile-stocks"
                        >
                            <div className="dashboard-tile-icono">📊</div>
                            <div className="dashboard-tile-titulo">Reporte de Stocks</div>
                            <div className="dashboard-tile-descripcion">Visualizar stocks en almacén</div>
                        </div>
                    )}

                    {tienePermiso('/transito') && (
                        <div 
                            onClick={() => navigate('/transito')}
                            className="dashboard-tile tile-transito"
                        >
                            <div className="dashboard-tile-icono">🚚</div>
                            <div className="dashboard-tile-titulo">Stock en Tránsito</div>
                            <div className="dashboard-tile-descripcion">Auditoría y recepción de lotes</div>
                        </div>
                    )}

                    {tienePermiso('/rrhh') && (
                        <div 
                            onClick={() => navigate('/rrhh')}
                            className="dashboard-tile tile-rrhh"
                        >
                            <div className="dashboard-tile-icono">👥</div>
                            <div className="dashboard-tile-titulo">Recursos Humanos</div>
                            <div className="dashboard-tile-descripcion">Gestión de personal y nómina activa</div>
                        </div>
                    )}

                    {tienePermiso('/call-center') && (
                        <div 
                            onClick={() => navigate('/call-center')}
                            className="dashboard-tile tile-call-center"
                        >
                            <div className="dashboard-tile-icono">🎧</div>
                            <div className="dashboard-tile-titulo">Call Center y Pedidos</div>
                            <div className="dashboard-tile-descripcion">Toma de órdenes y asignación de despacho</div>
                        </div>
                    )}

                    {tienePermiso('/delivery') && (
                        <div 
                            onClick={() => navigate('/delivery')}
                            className="dashboard-tile tile-delivery"
                        >
                            <div className="dashboard-tile-icono">🛵</div>
                            <div className="dashboard-tile-titulo">Logística Delivery</div>
                            <div className="dashboard-tile-descripcion">Monitor de entregas y última milla</div>
                        </div>
                    )}

                    {tienePermiso('/sucursales') && (
                        <div 
                            onClick={() => navigate('/sucursales')}
                            className="dashboard-tile tile-sucursales"
                        >
                            <div className="dashboard-tile-icono">🏢</div>
                            <div className="dashboard-tile-titulo">Sucursales</div>
                            <div className="dashboard-tile-descripcion">Gestión de Sucursales</div>
                        </div>
                    )}

                    {tienePermiso('/activos-fijos') && (
                        <div 
                            onClick={() => navigate('/activos-fijos')}
                            className="dashboard-tile tile-activos-fijos"
                        >
                            <div className="dashboard-tile-icono">🖨️</div>
                            <div className="dashboard-tile-titulo">Activos Fijos</div>
                            <div className="dashboard-tile-descripcion">Auditoría de patrimonio y equipamiento</div>
                        </div>
                    )}

                     {tienePermiso('/auditoria') && (
                        <div 
                            onClick={() => navigate('/auditoria')}
                            className="dashboard-tile tile-auditoria"
                        >
                            <div className="dashboard-tile-icono">📈</div>
                            <div className="dashboard-tile-titulo">Auditoria</div>
                            <div className="dashboard-tile-descripcion">Auditoría Financiera y Gerencial</div>
                        </div>
                    )}

                    {tienePermiso('/usuarios') && (
                        <div 
                            onClick={() => navigate('/usuarios')}
                            className="dashboard-tile tile-usuarios"
                        >
                            <div className="dashboard-tile-icono">🔐</div>
                            <div className="dashboard-tile-titulo">Usuarios del Sistema</div>
                            <div className="dashboard-tile-descripcion">Gestion de usuarios y contraseñas</div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Dashboard;