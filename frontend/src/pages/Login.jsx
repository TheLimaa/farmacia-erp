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
    const { login } = useAuth();
    const navigate = useNavigate();

    // Valida las credenciales del usuario enviándolas al servidor y redirige según su rol
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const [response] = await Promise.all([
                fetch('' + API_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                }),
                tiempoMinimo
            ]);

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('user', JSON.stringify(data.usuario));
                login(data.token, data.usuario);
                
                const rolUsuario = (data.usuario?.rol || '').toUpperCase();
                if (rolUsuario === 'REPARTIDOR') {
                    navigate('/repartidor');
                } else {
                    navigate('/dashboard');
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

    // Muestra la pantalla de carga mientras se procesa el inicio de sesión
    if (cargando) {
        return <Cargando mensaje="Iniciando sesión..." />;
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
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="login-input"
                        />
                    </div>

                    <button type="submit" className="login-submit-btn">
                        Iniciar Sesión
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;