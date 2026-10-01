import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BusinessPartner = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('busqueda'); // 'busqueda' o 'crear'
    const [bps, setBps] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [mensaje, setMensaje] = useState('');
    
    // Estado para nuevo BP
    const [nuevoBP, setNuevoBP] = useState({ nit: '', nombre_completo: '', telefono_contacto: '' });

    useEffect(() => {
        buscarBPs();
    }, []);

    const buscarBPs = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await fetch(`http://localhost:3000/api/bp?q=${searchQuery}`);
            const data = await res.json();
            if (data.success) setBps(data.data);
        } catch (error) {
            console.error('Error al buscar BPs:', error);
        }
    };

    const handleCrearBP = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3000/api/bp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoBP)
            });
            const data = await res.json();
            
            if (data.success) {
                setMensaje(data.message);
                setNuevoBP({ nit: '', nombre_completo: '', telefono_contacto: '' });
                setTab('busqueda');
                buscarBPs();
                setTimeout(() => setMensaje(''), 4000);
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error al crear BP:', error);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#1c1c1e', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* Cabecera SAP */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', background: '#121214', borderBottom: '1px solid #2a2a2c' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '18px', marginRight: '15px' }}>{'<'}</button>
                
                <span style={{ fontSize: '15px', fontWeight: '500' }}>Tratar interlocutor comercial</span>
            </div>

            {/* Menú Superior Secundario */}
            <div style={{ padding: '12px 20px', display: 'flex', gap: '10px', background: '#1c1c1e', borderBottom: '1px solid #2a2a2c', fontSize: '13px' }}>
                <button onClick={() => setTab('crear')} style={{ background: tab === 'crear' ? '#38bdf8' : 'transparent', color: tab === 'crear' ? '#000' : '#38bdf8', border: '1px solid #38bdf8', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Persona / Organización</button>
            </div>

            <div style={{ padding: '20px' }}>
                {mensaje && <div style={{ marginBottom: '20px', padding: '10px', background: '#252528', border: '1px solid #00ffcc', color: '#00ffcc', borderRadius: '4px' }}>{mensaje}</div>}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #333', marginBottom: '20px', fontSize: '14px' }}>
                    <div onClick={() => setTab('busqueda')} style={{ paddingBottom: '10px', cursor: 'pointer', color: tab === 'busqueda' ? '#38bdf8' : '#aaa', borderBottom: tab === 'busqueda' ? '2px solid #38bdf8' : 'none', fontWeight: tab === 'busqueda' ? 'bold' : 'normal' }}>Búsqueda y Pool Trabajo</div>
                    <div onClick={() => setTab('crear')} style={{ paddingBottom: '10px', cursor: 'pointer', color: tab === 'crear' ? '#38bdf8' : '#aaa', borderBottom: tab === 'crear' ? '2px solid #38bdf8' : 'none', fontWeight: tab === 'crear' ? 'bold' : 'normal' }}>Nuevo Interlocutor</div>
                </div>

                {/* TAB BÚSQUEDA */}
                {tab === 'busqueda' && (
                    <div>
                        <form onSubmit={buscarBPs} style={{ display: 'flex', gap: '40px', marginBottom: '30px', maxWidth: '800px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ width: '100px', color: '#aaa', fontSize: '13px', textAlign: 'right' }}>Búsqueda:</label>
                                    <select style={{ flex: 1, padding: '6px', background: '#252528', color: '#fff', border: '1px solid #444', borderRadius: '2px' }}>
                                        <option>Interlocutor comercial</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ width: '100px', color: '#aaa', fontSize: '13px', textAlign: 'right' }}>Interl.cial/NIT:</label>
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '6px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '2px' }} />
                                </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ width: '80px', color: '#aaa', fontSize: '13px', textAlign: 'right' }}>De:</label>
                                    <select style={{ flex: 1, padding: '6px', background: '#252528', color: '#fff', border: '1px solid #444', borderRadius: '2px' }}>
                                        <option>Número o NIT</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', paddingLeft: '90px' }}>
                                    <button type="submit" style={{ background: '#252528', color: '#38bdf8', border: '1px solid #444', padding: '6px 20px', borderRadius: '2px', cursor: 'pointer' }}>Inicio</button>
                                    <button type="button" onClick={() => { setSearchQuery(''); buscarBPs(); }} style={{ background: '#252528', color: '#aaa', border: '1px solid #444', padding: '6px 15px', borderRadius: '2px', cursor: 'pointer' }}>🗑</button>
                                </div>
                            </div>
                        </form>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', borderTop: '1px solid #333' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #444', background: '#252528' }}>
                                    <th style={{ padding: '8px 12px', color: '#ccc', fontWeight: 'normal' }}>Interl.cial. (ID)</th>
                                    <th style={{ padding: '8px 12px', color: '#ccc', fontWeight: 'normal' }}>NIT</th>
                                    <th style={{ padding: '8px 12px', color: '#ccc', fontWeight: 'normal' }}>Nombre Completo / Razón Social</th>
                                    <th style={{ padding: '8px 12px', color: '#ccc', fontWeight: 'normal' }}>Teléfono</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bps.length > 0 ? bps.map(bp => (
                                    <tr key={bp.ID_CLIENTE} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                        <td style={{ padding: '10px 12px', color: '#38bdf8' }}>{bp.ID_CLIENTE}</td>
                                        <td style={{ padding: '10px 12px' }}>{bp.NIT || 'S/N'}</td>
                                        <td style={{ padding: '10px 12px' }}>{bp.NOMBRE_COMPLETO}</td>
                                        <td style={{ padding: '10px 12px', color: '#aaa' }}>{bp.TELEFONO_CONTACTO}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No se encontraron interlocutores comerciales.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* TAB CREAR */}
                {tab === 'crear' && (
                    <div style={{ maxWidth: '600px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '20px', color: '#ccc' }}>Crear Persona u Organización (BP)</h3>
                        <form onSubmit={handleCrearBP} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '13px', color: '#aaa' }}>Número de Identificación Tributaria (NIT)</label>
                                <input type="text" required value={nuevoBP.nit} onChange={e => setNuevoBP({...nuevoBP, nit: e.target.value})} style={{ padding: '10px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '13px', color: '#aaa' }}>Nombre Completo o Razón Social</label>
                                <input type="text" required value={nuevoBP.nombre_completo} onChange={e => setNuevoBP({...nuevoBP, nombre_completo: e.target.value})} style={{ padding: '10px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '13px', color: '#aaa' }}>Teléfono de Contacto</label>
                                <input type="tel" required value={nuevoBP.telefono_contacto} onChange={e => setNuevoBP({...nuevoBP, telefono_contacto: e.target.value})} style={{ padding: '10px', background: '#121214', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} />
                            </div>
                            <button type="submit" style={{ marginTop: '10px', padding: '12px', background: '#0055ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Grabar Interlocutor Comercial
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusinessPartner;