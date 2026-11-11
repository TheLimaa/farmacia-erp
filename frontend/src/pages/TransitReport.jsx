import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga
import { API_URL } from '../config/api';

const TransitReport = () => {
    const navigate = useNavigate();
    
    // --- LÓGICA DE ROLES Y SUCURSAL ---
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const rolUsuario = (user.rol || user.ROL || '').toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';

    const [filtros, setFiltros] = useState({ id_sucursal: '', id_medicamento: '' });
    const [vistaResultados, setVistaResultados] = useState(false);
    const [stockTransito, setStockTransito] = useState([]);
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido

    const [catalogoMedicamentos, setCatalogoMedicamentos] = useState([]);
    const [catalogoSucursales, setCatalogoSucursales] = useState([]);

    const [showSucursalHelp, setShowSucursalHelp] = useState(false);
    const [showMaterialHelp, setShowMaterialHelp] = useState(false);
    const [sucursalUsuarioNombre, setSucursalUsuarioNombre] = useState('');

    const sucursalRef = useRef(null);
    const materialRef = useRef(null);

    useEffect(() => {
        const fetchCatalogosYPermisos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Cargamos medicamentos, sucursales, permisos y los 2 segundos en paralelo
                const [resMed, resSuc] = await Promise.all([
                    fetch(`${API_URL}/api/inventario/medicamentos`).then(res => res.json()).catch(() => ({ success: false })),
                    fetch(`${API_URL}/api/sucursales`).then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resMed.success) setCatalogoMedicamentos(resMed.data);
                
                if (resSuc.success) {
                    setCatalogoSucursales(resSuc.data);

                    if (!esAdmin) {
                        const resUser = await fetch(`${API_URL}/api/usuarios`).then(res => res.json()).catch(() => ({ success: false }));
                        if (resUser.success) {
                            const usuarioBuscado = (user.usuario || user.username || user.nombre || '').toString().toLowerCase();
                            const currentUser = resUser.data.find(u => {
                                const dbUser = (u.USERNAME || u.username || u.USUARIO || u.nombre_usuario || '').toString().toLowerCase();
                                return dbUser === usuarioBuscado;
                            });

                            if (currentUser) {
                                const nombreSuc = currentUser.SUCURSAL || currentUser.sucursal || currentUser.NOMBRE_UBICACION || '';
                                setSucursalUsuarioNombre(nombreSuc);
                            }
                        }
                    }
                }
            } catch (error) { 
                console.error('Error cargando catálogos o permisos:', error); 
            } finally {
                setCargando(false);
            }
        };
        fetchCatalogosYPermisos();

        const handleClickOutside = (event) => {
            if (sucursalRef.current && !sucursalRef.current.contains(event.target)) setShowSucursalHelp(false);
            if (materialRef.current && !materialRef.current.contains(event.target)) setShowMaterialHelp(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [esAdmin]);

    // Filtros dinámicos manejando mayúsculas y minúsculas
    const sucursalesFiltradas = catalogoSucursales.filter(s => {
        const query = (filtros.id_sucursal || '').toString().toLowerCase();
        const id = (s.ID_SUCURSAL || s.id_sucursal || '').toString();
        const nombre = (s.NOMBRE_UBICACION || s.nombre_ubicacion || '').toLowerCase();
        return id.includes(query) || nombre.includes(query);
    });

    const medicamentosFiltrados = catalogoMedicamentos.filter(m => {
        const query = (filtros.id_medicamento || '').toString().toLowerCase();
        const id = (m.ID_MEDICAMENTO || m.id_medicamento || '').toString();
        const nombre = (m.NOMBRE_COMERCIAL || m.nombre_comercial || '').toLowerCase();
        return id.includes(query) || nombre.includes(query);
    });

    const buscarTransito = async (e) => {
        if (e) e.preventDefault();
        try {
            const params = new URLSearchParams();
            if (filtros.id_sucursal) params.append('id_sucursal', filtros.id_sucursal);
            if (filtros.id_medicamento) params.append('id_medicamento', filtros.id_medicamento);

            const res = await fetch(`${API_URL}/api/inventario/transito?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setStockTransito(data.data);
                setVistaResultados(true);
            }
        } catch (error) { console.error('Error:', error); }
    };

    const handleRecibir = async (id_lote) => {
        if(!window.confirm("¿Confirmas la recepción física de este lote en la sucursal?")) return;
        try {
            const res = await fetch(`${API_URL}/api/inventario/recibir`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_lote })
            });
            const data = await res.json();
            if(data.success) {
                alert(data.message);
                setStockTransito(stockTransito.filter(item => (item.ID_LOTE || item.id_lote) !== id_lote));
            } else {
                alert(data.message || 'No se pudo procesar la recepción.');
            }
        } catch (error) { console.error(error); }
    };

    // Si está cargando inicialmente, mostramos la plantilla reutilizable
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="transit-report-container">
            <div className="transit-report-header">
                <button onClick={() => navigate('/dashboard')} className="btn-regresar-transit">
                    ← Regresar al Dashboard
                </button>
                <div className="transit-report-title-wrapper">
                    <h2 className="transit-report-main-title">
                        Visualizar Stock en Tránsito
                    </h2>
                    <p className="transit-report-subtitle">Auditoría de lotes pendientes de recepción en centro receptor.</p>
                </div>
                <div style={{ width: '130px' }}></div>
            </div>

            {!vistaResultados && (
                <div className="transit-filter-card">
                    <h3 className="transit-filter-section-title">Selecciones de Base de Datos</h3>

                    <form onSubmit={buscarTransito} className="transit-filter-form">
                        <div className="transit-filter-fields-row">
                            
                            {/* CENTRO RECEPTOR */}
                            <div ref={sucursalRef} className="transit-input-group">
                                <label className="transit-input-label">Centro Receptor (ID Sucursal):</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. 1 o Miraflores (Dejar vacío para todos)"
                                    value={filtros.id_sucursal} 
                                    onFocus={() => setShowSucursalHelp(true)}
                                    onChange={e => { 
                                        setFiltros({...filtros, id_sucursal: e.target.value}); 
                                        setShowSucursalHelp(true); 
                                    }} 
                                    className="transit-input-field admin"
                                />
                                {showSucursalHelp && (
                                    <div className="transit-dropdown-help">
                                        <div className="transit-dropdown-header-title">Seleccionar Centro</div>
                                        {sucursalesFiltradas.length > 0 ? (
                                            sucursalesFiltradas.map(s => {
                                                const id = s.ID_SUCURSAL || s.id_sucursal;
                                                const nom = s.NOMBRE_UBICACION || s.nombre_ubicacion;
                                                return (
                                                    <div key={id} onClick={() => { setFiltros({...filtros, id_sucursal: id.toString()}); setShowSucursalHelp(false); }}
                                                         className="transit-dropdown-item"
                                                    >
                                                        <span className="transit-dropdown-id-sucursal">{id}</span>
                                                        {nom}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="transit-dropdown-vacio">No hay resultados</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* MATERIAL */}
                            <div ref={materialRef} className="transit-input-group">
                                <label className="transit-input-label">Producto (ID Producto):</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. 3 o Paracetamol" 
                                    value={filtros.id_medicamento} 
                                    onFocus={() => setShowMaterialHelp(true)}
                                    onChange={e => { setFiltros({...filtros, id_medicamento: e.target.value}); setShowMaterialHelp(true); }} 
                                    className="transit-input-field material"
                                />
                                {showMaterialHelp && (
                                    <div className="transit-dropdown-help">
                                        <div className="transit-dropdown-header-title">Seleccionar Material</div>
                                        {medicamentosFiltrados.length > 0 ? (
                                            medicamentosFiltrados.map(m => {
                                                const id = m.ID_MEDICAMENTO || m.id_medicamento;
                                                const nom = m.NOMBRE_COMERCIAL || m.nombre_comercial;
                                                return (
                                                    <div key={id} onClick={() => { setFiltros({...filtros, id_medicamento: id.toString()}); setShowMaterialHelp(false); }}
                                                         className="transit-dropdown-item"
                                                    >
                                                        <span className="transit-dropdown-id-material">{id}</span>
                                                        {nom}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="transit-dropdown-vacio">No hay medicamentos en el catálogo</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="transit-buttons-action-wrapper">
                                <button type="submit" className="btn-ejecutar-transit">Ejecutar</button>
                                <button type="button" onClick={() => setFiltros({id_sucursal: '', id_medicamento:''})} className="btn-limpiar-transit">Limpiar</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {vistaResultados && (
                <div className="transit-results-card">
                    <div className="transit-results-header-bar">
                        <h3 className="transit-results-title">Lotes en Tránsito (Pendientes de Recepción)</h3>
                        <button onClick={() => setVistaResultados(false)} className="btn-volver-filtros">← Volver</button>
                    </div>

                    <table className="transit-tabla-resultados">
                        <thead>
                            <tr>
                                <th>ID Lote</th>
                                <th>Centro Receptor</th>
                                <th>Material</th>
                                <th>No. Lote Fab.</th>
                                <th className="align-right">Cantidad</th>
                                <th className="align-center">Acción (MIGO)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockTransito.length > 0 ? (
                                stockTransito.map((inv) => {
                                    const nombreSucursalItem = (inv.SUCURSAL || inv.sucursal || '').toString().trim();
                                    const puedeRecepcionar = esAdmin || (nombreSucursalItem.toLowerCase() === sucursalUsuarioNombre.toLowerCase());

                                    return (
                                        <tr key={inv.ID_LOTE || inv.id_lote}>
                                            <td className="td-lote-id">#{inv.ID_LOTE || inv.id_lote}</td>
                                            <td className="td-centro-receptor">
                                                {inv.ID_SUCURSAL || inv.id_sucursal} - {nombreSucursalItem}
                                            </td>
                                            <td className="td-material-nombre">
                                                {inv.ID_MEDICAMENTO || inv.id_medicamento} - {inv.MEDICAMENTO || inv.medicamento}
                                            </td>
                                            <td className="td-lote-fab">{inv.NUMERO_LOTE || inv.numero_lote}</td>
                                            <td className="align-right td-cantidad-transito">{inv.CANTIDAD || inv.cantidad}</td>
                                            <td className="align-center">
                                                {puedeRecepcionar ? (
                                                    <button onClick={() => handleRecibir(inv.ID_LOTE || inv.id_lote)} className="btn-contabilizar-recepcion">
                                                        Contabilizar Recepción
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }} title="Solo el Administrador o el Gerente de esta sucursal pueden recibir este lote">
                                                        🔒 Solo sucursal destino
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan="6" className="transit-tabla-vacia">No hay mercancía en tránsito para esta selección.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TransitReport;