import { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Cambiamos sessionStorage por localStorage para que la sesión persista de verdad al recargar
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || localStorage.getItem('usuario')) || null);

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        // Guardamos permanentemente en localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        // Limpiamos todo el almacenamiento local y de sesión
        localStorage.clear();
        sessionStorage.clear();
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);