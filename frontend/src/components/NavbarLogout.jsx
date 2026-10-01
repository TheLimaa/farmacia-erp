import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const NavbarLogout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: '#1e1e1e', borderBottom: '1px solid #333', marginBottom: '20px' }}>
            <span style={{ color: '#fff' }}>Conectado como: <strong>{user.nombre}</strong> ({user.rol})</span>
            <button onClick={handleLogout} style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
                Cerrar Sesión
            </button>
        </div>
    );
};

export default NavbarLogout;