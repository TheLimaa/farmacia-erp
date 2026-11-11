import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando'; // <--- Importamos la plantilla de carga
import { API_URL } from '../config/api';

const StockReport = () => {
    const navigate = useNavigate();
    const [filtros, setFiltros] = useState({ id_sucursal: '', id_medicamento: '' });
    const [catalogoSucursales, setCatalogoSucursales] = useState([]);
    const [catalogoMedicamentos, setCatalogoMedicamentos] = useState([]);
    const [showSucursalHelp, setShowSucursalHelp] = useState(false);
    const [showMaterialHelp, setShowMaterialHelp] = useState(false);
    const [cargando, setCargando] = useState(true); // <--- Estado de carga añadido
    
    const [vistaResultados, setVistaResultados] = useState(false);
    const [inventarioGeneral, setInventarioGeneral] = useState([]);
    
    const sucursalRef = useRef(null);
    const materialRef = useRef(null);

    useEffect(() => {
        const fetchCatalogos = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const [resMed, resSuc] = await Promise.all([
                    fetch(`${API_URL}/api/inventario/medicamentos`).then(res => res.json()).catch(() => ({ success: false })),
                    fetch(`${API_URL}/api/sucursales`).then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resMed.success) setCatalogoMedicamentos(resMed.data);
                if (resSuc.success) setCatalogoSucursales(resSuc.data);
            } catch (error) { 
                console.error(error); 
            } finally {
                setCargando(false);
            }
        };
        fetchCatalogos();

        const handleClickOutside = (event) => {
            if (sucursalRef.current && !sucursalRef.current.contains(event.target)) setShowSucursalHelp(false);
            if (materialRef.current && !materialRef.current.contains(event.target)) setShowMaterialHelp(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sucursalesFiltradas = catalogoSucursales.filter(s => {
        const query = (filtros.id_sucursal || '').toLowerCase();
        const id = (s.ID_SUCURSAL || s.id_sucursal || '').toString();
        const nombre = (s.NOMBRE_UBICACION || s.nombre_ubicacion || '').toLowerCase();
        return id.includes(query) || nombre.includes(query);
    });

    const medicamentosFiltrados = catalogoMedicamentos.filter(m => {
        const query = (filtros.id_medicamento || '').toLowerCase();
        const id = (m.ID_MEDICAMENTO || m.id_medicamento || '').toString();
        const nombre = (m.NOMBRE_COMERCIAL || m.nombre_comercial || '').toLowerCase();
        return id.includes(query) || nombre.includes(query);
    });

    const buscarInventario = async (e) => {
        if (e) e.preventDefault();
        try {
            const params = new URLSearchParams();
            if (filtros.id_sucursal) params.append('id_sucursal', filtros.id_sucursal);
            if (filtros.id_medicamento) params.append('id_medicamento', filtros.id_medicamento);

            const res = await fetch(`${API_URL}/api/inventario/general?${params.toString()}`);
            const data = await res.json();
            
            if (data.success) {
                setInventarioGeneral(data.data);
                setVistaResultados(true);
            }
        } catch (error) { console.error(error); }
    };

    // Si está cargando los catálogos iniciales, mostramos el componente de carga
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="stock-report-container">
            <div className="stock-report-header">
                <button onClick={() => navigate('/dashboard')} className="btn-regresar-stock">
                    ← Regresar al Dashboard
                </button>
                <div className="stock-report-title-wrapper">
                    <h2 className="stock-report-main-title">Visualizar Stocks en Almacén</h2>
                    <p className="stock-report-subtitle">Reporte consolidado de inventario por centro y medicamento.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {!vistaResultados && (
                <div className="stock-filter-card">
                    <h3 className="stock-filter-section-title">Selecciones de Base de Datos</h3>

                    <form onSubmit={buscarInventario} className="stock-filter-form">
                        <div className="stock-filter-fields-row">
                            {/* Input Centro */}
                            <div ref={sucursalRef} className="stock-input-group">
                                <label className="stock-input-label">Centro (ID Sucursal):</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1 o Miraflores"
                                    value={filtros.id_sucursal}
                                    onFocus={() => setShowSucursalHelp(true)}
                                    onChange={e => { setFiltros({...filtros, id_sucursal: e.target.value}); setShowSucursalHelp(true); }}
                                    className="stock-input-field"
                                />
                                {showSucursalHelp && (
                                    <div className="stock-dropdown-help">
                                        <div className="stock-dropdown-header-title">Resultados del proceso de búsqueda</div>
                                        <table className="stock-dropdown-table">
                                            <thead>
                                                <tr>
                                                    <th className="stock-dropdown-th">Ce.</th>
                                                    <th className="stock-dropdown-th">Nombre</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sucursalesFiltradas.map(s => {
                                                    const id = s.ID_SUCURSAL || s.id_sucursal;
                                                    const nombre = s.NOMBRE_UBICACION || s.nombre_ubicacion;
                                                    return (
                                                        <tr key={id} className="stock-dropdown-tr"
                                                            onClick={() => { setFiltros({...filtros, id_sucursal: id.toString()}); setShowSucursalHelp(false); }}
                                                        >
                                                            <td className="stock-dropdown-td-id-sucursal">{id}</td>
                                                            <td className="stock-dropdown-td-text">{nombre}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            
                            {/* Input Material */}
                            <div ref={materialRef} className="stock-input-group">
                                <label className="stock-input-label">Medicamento (ID Producto):</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 3 o Paracetamol"
                                    value={filtros.id_medicamento}
                                    onFocus={() => setShowMaterialHelp(true)}
                                    onChange={e => { setFiltros({...filtros, id_medicamento: e.target.value}); setShowMaterialHelp(true); }}
                                    className="stock-input-field-middle"
                                />
                                {showMaterialHelp && (
                                    <div className="stock-dropdown-help">
                                        <div className="stock-dropdown-header-title">Resultados del proceso de búsqueda</div>
                                        <table className="stock-dropdown-table">
                                            <thead>
                                                <tr>
                                                    <th className="stock-dropdown-th">Material</th>
                                                    <th className="stock-dropdown-th">Texto breve de producto</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {medicamentosFiltrados.map(m => {
                                                    const id = m.ID_MEDICAMENTO || m.id_medicamento;
                                                    const nombre = m.NOMBRE_COMERCIAL || m.nombre_comercial;
                                                    return (
                                                        <tr key={id} className="stock-dropdown-tr"
                                                            onClick={() => { setFiltros({...filtros, id_medicamento: id.toString()}); setShowMaterialHelp(false); }}
                                                        >
                                                            <td className="stock-dropdown-td-id-material">{id}</td>
                                                            <td className="stock-dropdown-td-text">{nombre}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="stock-buttons-action-wrapper">
                                <button type="submit" className="btn-ejecutar-busqueda">Ejecutar Búsqueda</button>
                                <button type="button" onClick={() => setFiltros({id_sucursal:'', id_medicamento:''})} className="btn-limpiar-filtros">Limpiar</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {vistaResultados && (
                <div className="stock-results-card">
                    <div className="stock-results-header-bar">
                        <h3 className="stock-results-title">Resultados del Reporte</h3>
                        <button onClick={() => setVistaResultados(false)} className="btn-volver-selecciones">
                            ← Volver a Selecciones
                        </button>
                    </div>

                    <table className="stock-tabla-resultados">
                        <thead>
                            <tr>
                                <th>ID Sucursal</th>
                                <th>Nombre Sucursal</th>
                                <th>ID Material</th>
                                <th>Descripción del Material</th>
                                <th className="align-right">Total Cajas Físicas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventarioGeneral.length > 0 ? (
                                inventarioGeneral.map((inv, index) => (
                                    <tr key={index}>
                                        <td className="td-res-sucursal-id">{inv.ID_SUCURSAL || inv.id_sucursal}</td>
                                        <td className="td-res-sucursal-nombre">{inv.SUCURSAL || inv.sucursal}</td>
                                        <td className="td-res-material-id">{inv.ID_MEDICAMENTO || inv.id_medicamento}</td>
                                        <td className="td-res-material-desc">{inv.MEDICAMENTO || inv.medicamento}</td>
                                        <td className="align-right td-res-total-cajas">{inv.TOTAL_CAJAS || inv.total_cajas}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="stock-tabla-vacia">No se encontraron registros con los criterios seleccionados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockReport;