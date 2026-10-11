import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const RRHH = () => {
    const navigate = useNavigate();
    const [empleado, setEmpleado] = useState({ 
        id_sucursal: '', 
        nombre_completo: '', 
        puesto: 'VENDEDOR', 
        salario_base: '', 
        fecha_contratacion: new Date().toISOString().split('T')[0] 
    });
    const [usuario, setUsuario] = useState({ id_empleado: '', username: '', password: '', rol: 'OPERADOR' });
    const [mensaje, setMensaje] = useState('');
    
    const [empleadosLista, setEmpleadosLista] = useState([]);
    const [filtroSucursal, setFiltroSucursal] = useState('');
    const [catalogoSucursales] = useState([
  
    ]);

    const [showSucursalHelp, setShowSucursalHelp] = useState(false);
    const [showEmpHelp, setShowEmpHelp] = useState(false);
    const [showFiltroSucHelp, setShowFiltroSucHelp] = useState(false);

    const sucursalRef = useRef(null);
    const empRef = useRef(null);
    const filtroSucRef = useRef(null);

    useEffect(() => {
        cargarEmpleados();
        const handleClickOutside = (e) => {
            if (sucursalRef.current && !sucursalRef.current.contains(e.target)) setShowSucursalHelp(false);
            if (empRef.current && !empRef.current.contains(e.target)) setShowEmpHelp(false);
            if (filtroSucRef.current && !filtroSucRef.current.contains(e.target)) setShowFiltroSucHelp(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const cargarEmpleados = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/empleados');
            const data = await res.json();
            if (data.success) setEmpleadosLista(data.data);
        } catch (err) { console.error('Error al cargar empleados:', err); }
    };

    const handleCrearEmpleado = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:3000/api/empleados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(empleado)
        });
        const data = await res.json();
        setMensaje(data.message);
        if(data.success) {
            setEmpleado({ id_sucursal: '', nombre_completo: '', puesto: 'VENDEDOR', salario_base: '', fecha_contratacion: new Date().toISOString().split('T')[0] });
            cargarEmpleados();
        }
    };

    const handleCrearUsuario = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usuario)
        });
        const data = await res.json();
        setMensaje(data.message);
        if(data.success) setUsuario({ id_empleado: '', username: '', password: '', rol: 'OPERADOR' });
    };

    const sucursalesFiltradas = catalogoSucursales.filter(s => 
        s.ID_SUCURSAL.toString().includes(empleado.id_sucursal) || 
        s.NOMBRE_UBICACION.toLowerCase().includes(empleado.id_sucursal.toLowerCase())
    );

    const sucursalesFiltroTabla = catalogoSucursales.filter(s => 
        s.ID_SUCURSAL.toString().includes(filtroSucursal) || 
        s.NOMBRE_UBICACION.toLowerCase().includes(filtroSucursal.toLowerCase())
    );

    const empleadosFiltrados = empleadosLista.filter(emp => 
        emp.ID_EMPLEADO?.toString().includes(usuario.id_empleado) || 
        emp.NOMBRE_COMPLETO?.toLowerCase().includes(usuario.id_empleado.toLowerCase())
    );

    const empleadosTablaFiltrados = empleadosLista.filter(emp => {
        const idSuc = (emp.ID_SUCURSAL || emp.id_sucursal)?.toString() || '';
        if (!filtroSucursal) return true;
        const query = filtroSucursal.toLowerCase().trim();
        const sucObj = catalogoSucursales.find(s => s.ID_SUCURSAL.toString() === idSuc);
        const nombreSuc = sucObj ? sucObj.NOMBRE_UBICACION.toLowerCase() : '';
        return idSuc === query || nombreSuc.includes(query);
    });

    const totalPlanilla = empleadosTablaFiltrados.reduce((acc, curr) => {
        const salario = parseFloat(curr.SALARIO_BASE ?? curr.salario_base ?? 0);
        return acc + (isNaN(salario) ? 0 : salario);
    }, 0);

    const getNombreSucursal = (id) => {
        const suc = catalogoSucursales.find(s => s.ID_SUCURSAL.toString() === id?.toString());
        return suc ? `${suc.ID_SUCURSAL} - ${suc.NOMBRE_UBICACION}` : `Centro #${id}`;
    };

    return (
        <div style={{ padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1200px', margin: '0 auto 30px auto' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    ← Regresar al Dashboard
                </button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', fontWeight: '500' }}>Recursos Humanos y Accesos corporativos</h2>
                    <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Gestión de personal, asignación de centros y control de planilla.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {mensaje && <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', padding: '12px', background: '#252528', border: '1px solid #00ffcc', color: '#00ffcc', borderRadius: '6px' }}>{mensaje}</div>}

            <div style={{ display: 'flex', gap: '30px', maxWidth: '1200px', margin: '0 auto 40px auto' }}>
                {/* Formulario de Empleados */}
                <div style={{ flex: 1, background: '#1c1c1e', padding: '25px', borderRadius: '8px', border: '1px solid #2a2a2c' }}>
                    <h3 style={{ color: '#aaa', fontSize: '15px', marginBottom: '20px' }}>1. Contratar Nuevo Empleado</h3>
                    <form onSubmit={handleCrearEmpleado} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input type="text" placeholder="Nombre Completo" value={empleado.nombre_completo} onChange={e => setEmpleado({...empleado, nombre_completo: e.target.value})} required style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}/>
                        
                        {/* Input Sucursal con F4 */}
                        <div ref={sucursalRef} style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="ID Sucursal (Centro) o Nombre" 
                                value={empleado.id_sucursal} 
                                onFocus={() => setShowSucursalHelp(true)}
                                onChange={e => { setEmpleado({...empleado, id_sucursal: e.target.value}); setShowSucursalHelp(true); }} 
                                required 
                                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}
                            />
                            {showSucursalHelp && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '150px', overflowY: 'auto' }}>
                                    {sucursalesFiltradas.map(s => (
                                        <div key={s.ID_SUCURSAL} onClick={() => { setEmpleado({...empleado, id_sucursal: s.ID_SUCURSAL.toString()}); setShowSucursalHelp(false); }}
                                             style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333' }}
                                             onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <strong style={{ color: '#ffaa00' }}>{s.ID_SUCURSAL}</strong> - {s.NOMBRE_UBICACION}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <select value={empleado.puesto} onChange={e => setEmpleado({...empleado, puesto: e.target.value})} style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                            <option value="GERENTE">Gerente</option>
                            <option value="VENDEDOR">Vendedor</option>
                            <option value="REPARTIDOR">Repartidor</option>
                            <option value="OPERADOR_CALLCENTER">Operador Call Center</option>
                        </select>
                        <input type="number" placeholder="Salario Base (Q)" value={empleado.salario_base} onChange={e => setEmpleado({...empleado, salario_base: e.target.value})} required style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }} step="0.01"/>
                        
                        <div>
                            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Fecha de Contratación:</label>
                            <input type="date" value={empleado.fecha_contratacion} onChange={e => setEmpleado({...empleado, fecha_contratacion: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}/>
                        </div>

                        <button type="submit" style={{ padding: '12px', background: '#00ffcc', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>Registrar Empleado</button>
                    </form>
                </div>

                {/* Formulario de Usuarios */}
                <div style={{ flex: 1, background: '#1c1c1e', padding: '25px', borderRadius: '8px', border: '1px solid #2a2a2c' }}>
                    <h3 style={{ color: '#aaa', fontSize: '15px', marginBottom: '20px' }}>2. Crear Usuario de Sistema</h3>
                    <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {/* Input Empleado con F4 */}
                        <div ref={empRef} style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="ID del Empleado o Nombre" 
                                value={usuario.id_empleado} 
                                onFocus={() => setShowEmpHelp(true)}
                                onChange={e => { setUsuario({...usuario, id_empleado: e.target.value}); setShowEmpHelp(true); }} 
                                required 
                                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' }}
                            />
                            {showEmpHelp && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '150px', overflowY: 'auto' }}>
                                    {empleadosFiltrados.map(emp => (
                                        <div key={emp.ID_EMPLEADO || emp.id_empleado} onClick={() => { setUsuario({...usuario, id_empleado: (emp.ID_EMPLEADO || emp.id_empleado).toString()}); setShowEmpHelp(false); }}
                                             style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333' }}
                                             onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <strong style={{ color: '#00ffcc' }}>#{emp.ID_EMPLEADO || emp.id_empleado}</strong> - {emp.NOMBRE_COMPLETO || emp.nombre_completo}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <input type="text" placeholder="Nombre de Usuario" value={usuario.username} onChange={e => setUsuario({...usuario, username: e.target.value})} required style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}/>
                        <input type="password" placeholder="Contraseña Segura" value={usuario.password} onChange={e => setUsuario({...usuario, password: e.target.value})} required style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}/>
                        <select value={usuario.rol} onChange={e => setUsuario({...usuario, rol: e.target.value})} style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                            <option value="ADMINISTRADOR">Administrador / Auditor</option>
                            <option value="OPERADOR">Operador de Call Center</option>
                            <option value="REPARTIDOR">Repartidor de Delivery</option>
                        </select>
                        <button type="submit" style={{ padding: '12px', background: '#ffaa00', color: '#000', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px' }}>Generar Credenciales</button>
                    </form>
                </div>
            </div>

            {/* SECCIÓN: NÓMINA ACTIVA CON FILTRO DE SUCURSAL */}
            <div style={{ background: '#1c1c1e', padding: '25px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <h3 style={{ color: '#aaa', fontSize: '16px', margin: 0 }}>Nómina Activa y Gasto Total en Planilla</h3>
                    
                    {/* Buscador / Filtro de Sucursal con Ayuda F4 */}
                    <div ref={filtroSucRef} style={{ position: 'relative', width: '300px' }}>
                        <input 
                            type="text" 
                            placeholder="Filtrar por sucursal..." 
                            value={filtroSucursal} 
                            onFocus={() => setShowFiltroSucHelp(true)}
                            onChange={e => { setFiltroSucursal(e.target.value); setShowFiltroSucHelp(true); }}
                            style={{ width: '100%', padding: '8px 12px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                        />
                        {showFiltroSucHelp && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '150px', overflowY: 'auto' }}>
                                <div onClick={() => { setFiltroSucursal(''); setShowFiltroSucHelp(false); }} style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333', color: '#888' }}>
                                    -- Todas las sucursales --
                                </div>
                                {sucursalesFiltroTabla.map(s => (
                                    <div key={s.ID_SUCURSAL} onClick={() => { setFiltroSucursal(s.ID_SUCURSAL.toString()); setShowFiltroSucHelp(false); }}
                                         style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #333' }}
                                         onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <strong style={{ color: '#ffaa00' }}>{s.ID_SUCURSAL}</strong> - {s.NOMBRE_UBICACION}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ background: '#333', padding: '8px 15px', borderRadius: '4px', color: '#00ffcc', fontWeight: 'bold' }}>
                        Planilla total: Q {totalPlanilla.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                            <th style={{ padding: '10px' }}>IDENTIFICACIÓN</th>
                            <th style={{ padding: '10px' }}>Nombre Completo</th>
                            <th style={{ padding: '10px' }}>Sucursal (Centro)</th>
                            <th style={{ padding: '10px' }}>Puesto</th>
                            <th style={{ padding: '10px' }}>Fecha Contratación</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Salario base (Q)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleadosTablaFiltrados.length > 0 ? (
                            empleadosTablaFiltrados.map((emp, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                    <td style={{ padding: '12px 10px', color: '#00ffcc' }}># {emp.ID_EMPLEADO || emp.id_empleado}</td>
                                    <td style={{ padding: '12px 10px', color: '#fff' }}>{emp.NOMBRE_COMPLETO || emp.nombre_completo}</td>
                                    <td style={{ padding: '12px 10px', color: '#ffaa00' }}>{getNombreSucursal(emp.ID_SUCURSAL || emp.id_sucursal)}</td>
                                    <td style={{ padding: '12px 10px', color: '#aaa' }}>{emp.PUESTO || emp.puesto || 'VENDEDOR'}</td>
                                    <td style={{ padding: '12px 10px', color: '#888' }}>{emp.FECHA_CONTRATACION ? new Date(emp.FECHA_CONTRATACION).toLocaleDateString() : (emp.fecha_contratacion ? new Date(emp.fecha_contratacion).toLocaleDateString() : 'N/A')}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold' }}>Q {Number(emp.SALARIO_BASE ?? emp.salario_base ?? 0).toFixed(2)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#555' }}>No se encontraron empleados para los filtros seleccionados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RRHH;