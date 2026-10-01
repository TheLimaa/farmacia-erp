import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                login(data.token, data.usuario);
                navigate('/dashboard');
            } else {
                setError(data.message || 'Credenciales inválidas');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        }
    };

    return (
        <div style={{ 
            height: '100vh', 
            width: '100vw', 
            background: 'linear-gradient(135deg, #c7d9ef 0%, #e2ecf8 50%, #b3cfe8 100%)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            margin: 0,
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999
        }}>
            <div style={{ width: '380px', padding: '40px 30px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)', borderRadius: '4px' }}>
                {error && <div style={{ background: '#ffdddd', color: '#990000', padding: '8px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <input 
                            type="text" 
                            placeholder="Usuario" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '10px', background: '#fff', color: '#000', border: '1px solid #b0c4de', borderRadius: '2px', boxSizing: 'border-box', outline: 'none' }}
                        />
                    </div>
                    <div>
                        <input 
                            type="password" 
                            placeholder="Contraseña" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '10px', background: '#fff', color: '#000', border: '1px solid #b0c4de', borderRadius: '2px', boxSizing: 'border-box', outline: 'none' }}
                        />
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '11px', background: '#4682b4', color: '#fff', border: 'none', borderRadius: '2px', fontWeight: '500', cursor: 'pointer', marginTop: '10px' }}>
                        Acceder al sistema
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;