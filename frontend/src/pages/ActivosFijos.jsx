import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ActivosFijos = () => {
    const navigate = useNavigate();
    const [activos, setActivos] = useState([]);
    const [mensaje, setMensaje] = useState('');
    
    // Estados para el buscador de sucursales
    const [sucursales, setSucursales] = useState([]);
    const [busquedaSucursal, setBusquedaSucursal] = useState('');
    const [showSucursales, setShowSucursales] = useState(false);
    const refSucursales = useRef(null);
    
    const [nuevoActivo, setNuevoActivo] = useState({
        id_sucursal: '',
        tipo_activo: 'EQUIPO_COMPUTO',
        descripcion: '',
        valor_compra: ''
    });

    useEffect(() => {
        cargarActivos();
        cargarSucursales();

        // Cierra el menú de sugerencias si haces clic afuera
        const handleClickOutside = (e) => {
            if (refSucursales.current && !refSucursales.current.contains(e.target)) {
                setShowSucursales(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const cargarActivos = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/activos');
            const data = await res.json();
            if (data.success) setActivos(data.data);
        } catch (error) { console.error('Error al cargar activos:', error); }
    };

    const cargarSucursales = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/sucursales');
            const data = await res.json();
            if (data.success) setSucursales(data.data);
        } catch (error) { console.error('Error al cargar sucursales:', error); }
    };

    const sucursalesFiltradas = sucursales.filter(s => 
        s.ID_SUCURSAL?.toString().includes(busquedaSucursal) || 
        s.NOMBRE_UBICACION?.toLowerCase().includes(busquedaSucursal.toLowerCase())
    );

    const handleRegistrar = async (e) => {
        e.preventDefault();
        
        if (!nuevoActivo.id_sucursal) {
            setMensaje('❌ Por favor, selecciona una sucursal de la lista de sugerencias.');
            setTimeout(() => setMensaje(''), 4000);
            return;
        }

        try {
            const res = await fetch('http://localhost:3000/api/activos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoActivo)
            });
            const data = await res.json();
            
            if (data.success) {
                setMensaje('✅ ' + data.message);
                setNuevoActivo({ id_sucursal: '', tipo_activo: 'EQUIPO_COMPUTO', descripcion: '', valor_compra: '' });
                setBusquedaSucursal(''); 
                cargarActivos();
                setTimeout(() => setMensaje(''), 4000);
            }
        } catch (error) {
            console.error('Error al registrar activo:', error);
        }
    };

    // Nueva función con confirmación de seguridad
    const handleEstadoChange = async (id, nuevoEstado) => {
        const confirmar = window.confirm(`¿Estás seguro que deseas cambiar el estado de este activo a "${nuevoEstado.replace('_', ' ')}"?\n\nEsto puede afectar el cálculo del patrimonio total.`);
        
        if (!confirmar) {
            // Si el usuario cancela, recargamos la lista para devolver el <select> a su valor original
            cargarActivos();
            return; 
        }

        try {
            await fetch(`http://localhost:3000/api/activos/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            cargarActivos();
        } catch (error) { 
            console.error('Error al actualizar estado:', error); 
        }
    };

    const patrimonioTotal = activos
        .filter(a => a.ESTADO !== 'DE_BAJA')
        .reduce((sum, a) => sum + parseFloat(a.VALOR_COMPRA || 0), 0);

    return (
        <div style={{ padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    ← Regresar al Dashboard
                </button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: '500' }}>Control de Activos Fijos y Patrimonio</h2>
                    <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Auditoría de equipamiento, mobiliario y flota por sucursal.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {mensaje && <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', padding: '12px', background: '#252528', border: mensaje.includes('❌') ? '1px solid #ef4444' : '1px solid #34d399', color: mensaje.includes('❌') ? '#ef4444' : '#34d399', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>{mensaje}</div>}

            <div style={{ display: 'flex', gap: '30px', maxWidth: '1200px', margin: '0 auto 40px auto' }}>
                
                {/* Formulario de Registro */}
                <div style={{ flex: 1, background: '#1c1c1e', padding: '25px', borderRadius: '8px', border: '1px solid #2a2a2c' }}>
                    <h3 style={{ color: '#aaa', fontSize: '15px', marginBottom: '20px' }}>Registrar Nueva Adquisición</h3>
                    <form onSubmit={handleRegistrar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div ref={refSucursales} style={{ flex: 1, position: 'relative' }}>
                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Sucursal Asignada</label>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por ID o Nombre..." 
                                    value={busquedaSucursal}
                                    onFocus={() => setShowSucursales(true)}
                                    onChange={e => { 
                                        setBusquedaSucursal(e.target.value); 
                                        setShowSucursales(true); 
                                        setNuevoActivo({...nuevoActivo, id_sucursal: ''}); 
                                    }}
                                    required
                                    style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                                {showSucursales && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', marginTop: '4px' }}>
                                        {sucursalesFiltradas.map(s => (
                                            <div 
                                                key={s.ID_SUCURSAL} 
                                                onClick={() => { 
                                                    setNuevoActivo({...nuevoActivo, id_sucursal: s.ID_SUCURSAL}); 
                                                    setBusquedaSucursal(s.NOMBRE_UBICACION); 
                                                    setShowSucursales(false); 
                                                }}
                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} 
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <strong style={{ color: '#00ffcc' }}>{s.ID_SUCURSAL}</strong> - {s.NOMBRE_UBICACION}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Clasificación del Activo</label>
                                <select value={nuevoActivo.tipo_activo} onChange={e => setNuevoActivo({...nuevoActivo, tipo_activo: e.target.value})} style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}>
                                    <option value="EQUIPO_COMPUTO">Equipo de Cómputo / POS</option>
                                    <option value="VEHICULO">Vehículo / Motocicleta</option>
                                    <option value="MOBILIARIO">Mobiliario y Estantería</option>
                                    <option value="EQUIPO_ESPECIAL">Equipo Especial / Clínico</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Descripción Técnica</label>
                            <input type="text" required placeholder="Ej. Motocicleta Honda NX 190, Mac M2..." value={nuevoActivo.descripcion} onChange={e => setNuevoActivo({...nuevoActivo, descripcion: e.target.value})} style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}/>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Valor de Compra (Q)</label>
                            <input type="number" step="0.01" required placeholder="0.00" value={nuevoActivo.valor_compra} onChange={e => setNuevoActivo({...nuevoActivo, valor_compra: e.target.value})} style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}/>
                        </div>

                        <button type="submit" style={{ padding: '12px', background: '#facc15', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', marginTop: '10px' }}>Dar de Alta Activo</button>
                    </form>
                </div>

                {/* Resumen Financiero Rápido */}
                <div style={{ flex: 1, background: '#1c1c1e', padding: '25px', borderRadius: '8px', border: '1px solid #2a2a2c', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏢</div>
                    <h3 style={{ color: '#aaa', fontSize: '16px', margin: '0 0 10px 0' }}>Valor Total del Patrimonio</h3>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#facc15' }}>
                        Q {patrimonioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '15px', maxWidth: '300px' }}>
                        Este valor consolida la inversión en infraestructura de toda la cadena (excluyendo activos dados de baja).
                    </p>
                </div>
            </div>

            {/* Tabla de Activos */}
            <div style={{ background: '#1c1c1e', padding: '25px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1200px', margin: '0 auto' }}>
                <h3 style={{ color: '#aaa', fontSize: '16px', marginBottom: '20px' }}>Inventario de Activos Fijos por Sucursal</h3>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                            <th style={{ padding: '12px' }}>Código</th>
                            <th style={{ padding: '12px' }}>Sucursal Asignada</th>
                            <th style={{ padding: '12px' }}>Clasificación</th>
                            <th style={{ padding: '12px' }}>Descripción Técnica</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Valor Compra (Q)</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activos.length > 0 ? (
                            activos.map(a => (
                                <tr key={a.ID_ACTIVO} style={{ borderBottom: '1px solid #2a2a2c', opacity: a.ESTADO === 'DE_BAJA' ? 0.5 : 1 }}>
                                    <td style={{ padding: '15px 12px', color: '#38bdf8', fontWeight: 'bold' }}>AF-{a.ID_ACTIVO}</td>
                                    <td style={{ padding: '15px 12px', color: '#ffaa00' }}>{a.SUCURSAL || `Centro ${a.ID_SUCURSAL}`}</td>
                                    <td style={{ padding: '15px 12px', color: '#aaa' }}>{a.TIPO_ACTIVO.replace('_', ' ')}</td>
                                    <td style={{ padding: '15px 12px', color: '#fff' }}>{a.DESCRIPCION}</td>
                                    <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold' }}>Q {parseFloat(a.VALOR_COMPRA).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                                        
                                        {/* Lista desplegable de seguridad para cambiar estado */}
                                        <select 
                                            value={a.ESTADO}
                                            onChange={(e) => handleEstadoChange(a.ID_ACTIVO, e.target.value)}
                                            style={{ 
                                                background: a.ESTADO === 'ACTIVO' ? '#00cc66' : (a.ESTADO === 'EN_REPARACION' ? '#facc15' : '#ef4444'), 
                                                color: '#000', 
                                                border: 'none', 
                                                padding: '6px', 
                                                borderRadius: '4px', 
                                                fontSize: '11px', 
                                                fontWeight: 'bold', 
                                                cursor: 'pointer',
                                                outline: 'none',
                                                width: '120px'
                                            }}
                                        >
                                            <option value="ACTIVO">ACTIVO</option>
                                            <option value="EN_REPARACION">EN REPARACION</option>
                                            <option value="DE_BAJA">DE BAJA</option>
                                        </select>

                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#555' }}>No hay activos fijos registrados en la empresa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivosFijos;