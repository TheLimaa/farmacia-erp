import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user') || '{"usuario": "Admin", "rol": "ADMINISTRADOR"}');

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#121214', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* Barra Superior SAP Fiori */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 25px', background: '#18181b', borderBottom: '1px solid #27272a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '500' }}>Página de inicio</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px' }}>
                    <span style={{ color: '#a1a1aa' }}>Conectado: <strong style={{ color: '#fff' }}>{user.usuario}</strong> ({user.rol})</span>
                    <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar Sesión</button>
                </div>
            </div>

            {/* Sub-barra de navegación */}
            <div style={{ padding: '15px 25px', background: '#18181b', borderBottom: '1px solid #27272a', fontSize: '14px', color: '#38bdf8', fontWeight: '500' }}>
                ≡ &nbsp; INICIO
            </div>

            {/* Contenido Principal / Fichas (Tiles) */}
            <div style={{ padding: '30px 25px' }}>
                <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '20px', fontWeight: '600' }}>Páginas Operativas</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    
                    {/* Ficha 1: Gestión de Inventarios y Catálogo */}
                    <div 
                        onClick={() => navigate('/registros-medicamento')}
                        style={{ background: '#38bdf8', color: '#0f172a', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(56, 189, 248, 0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>📦</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>Gestión de Inventarios</div>
                        <div style={{ fontSize: '12px', opacity: '0.8' }}>Registrar medicamento y asignación de lotes</div>
                    </div>

                    {/* Ficha 2: Visualizar Stocks (MB52) */}
                    <div 
                        onClick={() => navigate('/stock')}
                        style={{ background: '#f472b6', color: '#0f172a', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(244, 114, 182, 0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>📊</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>Reporte de Stocks</div>
                        <div style={{ fontSize: '12px', opacity: '0.8' }}>Visualizar stocks en almacén por material</div>
                    </div>

                    {/* Ficha 3: Stock en Tránsito (MB5T) */}
                    <div 
                        onClick={() => navigate('/transito')}
                        style={{ background: '#fbbf24', color: '#0f172a', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>🚚</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>Stock en Tránsito</div>
                        <div style={{ fontSize: '12px', opacity: '0.8' }}>Auditoría y recepción de lotes</div>
                    </div>

                    {/* Ficha 4: Recursos Humanos y Planilla */}
                    <div 
                        onClick={() => navigate('/rrhh')}
                        style={{ background: '#2dd4bf', color: '#0f172a', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(45, 212, 191, 0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>👥</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>Recursos Humanos</div>
                        <div style={{ fontSize: '12px', opacity: '0.8' }}>Gestión de personal y nómina activa</div>
                    </div>

                    {/* Ficha 5: Call Center y Pedidos */}
                    <div 
                        onClick={() => navigate('/call-center')}
                        style={{ background: '#34d399', color: '#0f172a', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(52, 211, 153, 0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>🎧</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>Call Center y Pedidos</div>
                        <div style={{ fontSize: '12px', opacity: '0.8' }}>Toma de órdenes y asignación de despacho</div>
                    </div>

                    {/* Ficha 6: Logística Delivery */}
                    <div 
                        onClick={() => navigate('/delivery')}
                        style={{ background: '#a78bfa', color: '#0f172a', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(167, 139, 250, 0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>🛵</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>Logística Delivery</div>
                        <div style={{ fontSize: '12px', opacity: '0.8' }}>Monitor de entregas y última milla</div>
                    </div>

                    {/* Ficha 7: Interlocutores Comerciales (BP) */}
                    <div 
                        onClick={() => navigate('/business-partner')}
                        style={{ background: '#818cf8', color: '#0f172a', padding: '20px', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(129, 140, 248, 0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '20px', marginBottom: '10px' }}>🏢</div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>Interlocutores (BP)</div>
                        <div style={{ fontSize: '12px', opacity: '0.8' }}>Gestión de BPs, Clientes y Organizaciones</div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;