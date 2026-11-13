import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Cargando from '../components/Cargando';
import logoVita from '../assets/Vita+.svg';
import { API_URL } from '../config/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    
    // Estados para el flujo de cambio obligatorio de contraseña
    const [requiereCambio, setRequiereCambio] = useState(false);
    const [idUsuarioTemp, setIdUsuarioTemp] = useState(null);
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    
    // Estados independientes para alternar la visibilidad de las contraseñas en cada formulario
    const [verPasswordLogin, setVerPasswordLogin] = useState(false);
    const [verPasswordNuevo, setVerPasswordNuevo] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    // Valida las credenciales del usuario enviándolas al servidor
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const [response] = await Promise.all([
                fetch(`${API_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                }),
                tiempoMinimo
            ]);

            const data = await response.json();

            if (response.ok && data.success) {
                // Verificamos si el usuario necesita cambiar su contraseña temporal
                if (data.requiere_cambio_password) {
                    setCargando(false);
                    setIdUsuarioTemp(data.usuario.id_usuario);
                    setRequiereCambio(true); // Activa la vista del formulario de cambio obligatorio
                } else {
                    // Flujo normal de inicio de sesión
                    localStorage.setItem('user', JSON.stringify(data.usuario));
                    login(data.token, data.usuario);
                    
                    const rolUsuario = (data.usuario?.rol || '').toUpperCase();
                    if (rolUsuario === 'REPARTIDOR') {
                        navigate('/repartidor');
                    } else {
                        navigate('/dashboard');
                    }
                }
            } else {
                setError(data.message || 'Credenciales inválidas');
                setCargando(false);
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
            setCargando(false);
        }
    };

    // Maneja el envío de la nueva contraseña obligatoria
    const handleCambioPasswordForzado = async (e) => {
        e.preventDefault();
        if (nuevaPassword !== confirmarPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (nuevaPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setCargando(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/usuarios/${idUsuarioTemp}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: nuevaPassword })
            });
            const data = await res.json();

            if (data.success) {
                alert('Contraseña actualizada con éxito. Por favor, inicia sesión con tu nueva clave.');
                // Se reinicia el estado para que vuelva al login normal
                setRequiereCambio(false);
                setPassword('');
                setNuevaPassword('');
                setConfirmarPassword('');
                setIdUsuarioTemp(null);
                setCargando(false);
            } else {
                setError(data.message || 'Error al actualizar la contraseña.');
                setCargando(false);
            }
        } catch (error) {
            setError('Error de conexión al actualizar la contraseña.');
            setCargando(false);
        }
    };

    // Muestra la pantalla de carga mientras se procesa
    if (cargando) {
        return <Cargando mensaje={requiereCambio ? "Actualizando contraseña..." : "Iniciando sesión..."} />;
    }

    return (
        <div className="login-container">
            <div className="login-card">
                
                <div className="login-header-bar">
                    <img 
                        src={logoVita} 
                        alt="Logo Vitta+" 
                        className="login-logo-img"
                    />
                    <div className="login-header-text">
                        <h2 className="login-brand-title">Farmacias Vita+</h2>
                    </div>
                </div>

                {error && <div className="login-error-message">{error}</div>}
                
                {/* Si requiere cambio de contraseña, mostramos este formulario especial */}
                {requiereCambio ? (
                    <form onSubmit={handleCambioPasswordForzado} className="login-form">
                        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                            <h3 style={{ color: '#d9534f', fontSize: '1.1rem' }}>⚠️ Cambio de Contraseña Obligatorio</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                                Estás ingresando con una contraseña temporal. Por seguridad, debes establecer una nueva contraseña personal antes de continuar.
                            </p>
                        </div>

                        <div className="login-field-group">
                            <label className="login-label">Nueva Contraseña</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type={verPasswordNuevo ? "text" : "password"} 
                                    placeholder="Nueva contraseña" 
                                    value={nuevaPassword} 
                                    onChange={(e) => setNuevaPassword(e.target.value)} 
                                    required 
                                    className="login-input"
                                    style={{ width: '100%', paddingRight: '40px' }}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setVerPasswordNuevo(!verPasswordNuevo)} 
                                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                                    title={verPasswordNuevo ? "Ocultar contraseña" : "Ver contraseña"}
                                >
                                    {verPasswordNuevo ? "👁️‍🗨️" : "👁️"}
                                </button>
                            </div>
                        </div>

                        <div className="login-field-group">
                            <label className="login-label">Confirmar Nueva Contraseña</label>
                            <input 
                                type="password" 
                                placeholder="Repite la contraseña" 
                                value={confirmarPassword} 
                                onChange={(e) => setConfirmarPassword(e.target.value)} 
                                required 
                                className="login-input"
                            />
                        </div>

                        <button type="submit" className="login-submit-btn" style={{ background: '#0275d8' }}>
                            Guardar y Continuar
                        </button>
                    </form>
                ) : (
                    /* Formulario de Login normal con botón de ver contraseña */
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field-group">
                            <label className="login-label">Usuario</label>
                            <input 
                                type="text" 
                                placeholder="Ingrese su usuario" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value.toUpperCase())} 
                                style={{ textTransform: 'uppercase' }}
                                required 
                                className="login-input"
                            />
                        </div>
                        <div className="login-field-group">
                            <label className="login-label">Contraseña</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type={verPasswordLogin ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    className="login-input"
                                    style={{ width: '100%', paddingRight: '40px' }}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setVerPasswordLogin(!verPasswordLogin)} 
                                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                                    title={verPasswordLogin ? "Ocultar contraseña" : "Ver contraseña"}
                                >
                                    {verPasswordLogin ? "👁️‍🗨️" : "👁️"}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="login-submit-btn">
                            Iniciar Sesión
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;