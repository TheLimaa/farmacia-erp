import { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Saca el token del almacenamiento local o lo deja nulo si no hay nada
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    // Busca los datos del usuario guardados y los parsea, si no encuentra nada se queda en null
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || localStorage.getItem('usuario')) || null);

    // Guarda el token y el usuario en el estado y los encaja de una vez en el almacenamiento local
    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    // Borra todo rastro de la sesión limpiando los estados y vaciando el almacenamiento del navegador
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para consumir el contexto de autenticación en cualquier parte de la app
export const useAuth = () => useContext(AuthContext);