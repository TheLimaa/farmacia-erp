import logoVita from '../assets/Vita+.svg';

const Cargando = ({ mensaje = "Cargando..." }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#0f1012',
            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
            cursor: 'default',        // Evita que aparezca el puntero de texto
            userSelect: 'none',       // Evita que se seleccione texto por error
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            zIndex: 9999             // Asegura que cubra toda la pantalla por encima de cualquier elemento
        }}>
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <svg style={{
                    position: 'absolute',
                    width: '90px',
                    height: '90px',
                    animation: 'spin 1.2s linear infinite'
                }} viewBox="0 0 100 100">
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        fill="none" 
                        stroke="rgba(0, 255, 204, 0.15)" 
                        strokeWidth="6"
                    />
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        fill="none" 
                        stroke="#00ffcc" 
                        strokeWidth="6" 
                        strokeDasharray="80 180" 
                        strokeLinecap="round"
                    />
                </svg>

                <img 
                    src={logoVita} 
                    alt="Logo Vita" 
                    style={{
                        width: '45px',
                        height: '45px',
                        objectFit: 'contain',
                        animation: 'pulse 1.5s ease-in-out infinite',
                        zIndex: 1
                    }} 
                />
            </div>

            <h3 style={{ margin: '0 0 8px 0', color: '#f3f4f6', fontSize: '18px', fontWeight: '600' }}>
                {mensaje}
            </h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
                Sincronizando perfil de usuario...
            </p>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.08); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Cargando;