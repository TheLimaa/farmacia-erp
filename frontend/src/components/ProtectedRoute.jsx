import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { token, user } = useAuth();

    // Si no hay token, redirigir al login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Si la ruta tiene roles permitidos configurados y el usuario no tiene ninguno de ellos, redirigir al dashboard
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user?.rol)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;