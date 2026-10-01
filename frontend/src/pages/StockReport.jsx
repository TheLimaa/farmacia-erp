import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const StockReport = () => {
    const navigate = useNavigate();
    // ESTADOS
    const [filtros, setFiltros] = useState({ id_sucursal: '', id_medicamento: '' });
    const [catalogoSucursales, setCatalogoSucursales] = useState([]);
    const [catalogoMedicamentos, setCatalogoMedicamentos] = useState([]);
    const [showSucursalHelp, setShowSucursalHelp] = useState(false);
    const [showMaterialHelp, setShowMaterialHelp] = useState(false);
    
    // NUEVOS ESTADOS PARA CONTROLAR LA VISTA
    const [vistaResultados, setVistaResultados] = useState(false); // false = filtros, true = tabla
    const [inventarioGeneral, setInventarioGeneral] = useState([]);
    
    const sucursalRef = useRef(null);
    const materialRef = useRef(null);

    // Cargar catálogos
    useEffect(() => {
        const fetchCatalogos = async () => {
            try {
                const resMed = await fetch('http://localhost:3000/api/inventario/medicamentos');
                const dataMed = await resMed.json();
                if (dataMed.success) setCatalogoMedicamentos(dataMed.data);

                setCatalogoSucursales([
                    { ID_SUCURSAL: 1, NOMBRE_UBICACION: 'Farmacia Miraflores' },
                    { ID_SUCURSAL: 2, NOMBRE_UBICACION: 'Stand Gasolinera Puma Próceres' },
                    { ID_SUCURSAL: 3, NOMBRE_UBICACION: 'Farmacia Oakland Mall' }
                ]);
            } catch (error) { console.error(error); }
        };
        fetchCatalogos();

        const handleClickOutside = (event) => {
            if (sucursalRef.current && !sucursalRef.current.contains(event.target)) setShowSucursalHelp(false);
            if (materialRef.current && !materialRef.current.contains(event.target)) setShowMaterialHelp(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sucursalesFiltradas = catalogoSucursales.filter(s => s.ID_SUCURSAL.toString().includes(filtros.id_sucursal) || s.NOMBRE_UBICACION.toLowerCase().includes(filtros.id_sucursal.toLowerCase()));
    const medicamentosFiltrados = catalogoMedicamentos.filter(m => m.ID_MEDICAMENTO.toString().includes(filtros.id_medicamento) || m.NOMBRE_COMERCIAL.toLowerCase().includes(filtros.id_medicamento.toLowerCase()));

    // EJECUTAR BÚSQUEDA
    const buscarInventario = async (e) => {
        if (e) e.preventDefault();
        try {
            const params = new URLSearchParams();
            if (filtros.id_sucursal) params.append('id_sucursal', filtros.id_sucursal);
            if (filtros.id_medicamento) params.append('id_medicamento', filtros.id_medicamento);

            const res = await fetch(`http://localhost:3000/api/inventario/general?${params.toString()}`);
            const data = await res.json();
            
            if (data.success) {
                setInventarioGeneral(data.data); // Guardamos los datos
                setVistaResultados(true); // Cambiamos a la vista de tabla
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div style={{ padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', maxWidth: '1000px', margin: '0 auto 30px auto' }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    ← Regresar al Dashboard
                </button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#fff', fontWeight: '500' }}>Visualizar Stocks en Almacén</h2>
                    <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Reporte consolidado de inventario por centro y material.</p>
                </div>
                <div style={{ width: '150px' }}></div>
            </div>

            {/* VISTA 1: PANTALLA DE SELECCIÓN */}
            {!vistaResultados && (
                <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1000px', margin: '0 auto' }}>
                    <h3 style={{ textAlign: 'center', color: '#555', margin: '0 0 25px 0', fontSize: '16px', fontWeight: 'bold' }}>Selecciones de Base de Datos</h3>

                    <form onSubmit={buscarInventario} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', width: '100%', maxWidth: '900px' }}>
                            {/* Input Centro */}
                            <div ref={sucursalRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <label style={{ color: '#777', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>Centro (ID Sucursal):</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1 o Miraflores"
                                    value={filtros.id_sucursal}
                                    onFocus={() => setShowSucursalHelp(true)}
                                    onChange={e => { setFiltros({...filtros, id_sucursal: e.target.value}); setShowSucursalHelp(true); }}
                                    style={{ background: '#333', color: '#fff', border: '1px solid #444', borderRight: 'none', padding: '12px 15px', borderRadius: '4px 0 0 4px', outline: 'none' }}
                                />
                                {showSucursalHelp && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '150%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>Resultados del proceso de búsqueda</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#ddd' }}>
                                            <thead><tr style={{ textAlign: 'left', color: '#888' }}><th style={{ padding: '8px 12px' }}>Ce.</th><th style={{ padding: '8px 12px' }}>Nombre</th></tr></thead>
                                            <tbody>
                                                {sucursalesFiltradas.map(s => (
                                                    <tr key={s.ID_SUCURSAL} style={{ cursor: 'pointer', borderTop: '1px solid #333' }}
                                                        onClick={() => { setFiltros({...filtros, id_sucursal: s.ID_SUCURSAL.toString()}); setShowSucursalHelp(false); }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#fff' }}>{s.ID_SUCURSAL}</td><td style={{ padding: '8px 12px' }}>{s.NOMBRE_UBICACION}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            
                            {/* Input Material */}
                            <div ref={materialRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <label style={{ color: '#777', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>Material (ID Producto):</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 3 o Paracetamol"
                                    value={filtros.id_medicamento}
                                    onFocus={() => setShowMaterialHelp(true)}
                                    onChange={e => { setFiltros({...filtros, id_medicamento: e.target.value}); setShowMaterialHelp(true); }}
                                    style={{ background: '#333', color: '#fff', border: '1px solid #444', borderRight: 'none', padding: '12px 15px', outline: 'none' }}
                                />
                                {showMaterialHelp && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '150%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>Resultados del proceso de búsqueda</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#ddd' }}>
                                            <thead><tr style={{ textAlign: 'left', color: '#888' }}><th style={{ padding: '8px 12px' }}>Material</th><th style={{ padding: '8px 12px' }}>Texto breve de material</th></tr></thead>
                                            <tbody>
                                                {medicamentosFiltrados.map(m => (
                                                    <tr key={m.ID_MEDICAMENTO} style={{ cursor: 'pointer', borderTop: '1px solid #333' }}
                                                        onClick={() => { setFiltros({...filtros, id_medicamento: m.ID_MEDICAMENTO.toString()}); setShowMaterialHelp(false); }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#fff' }}>{m.ID_MEDICAMENTO}</td><td style={{ padding: '8px 12px' }}>{m.NOMBRE_COMERCIAL}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Botones */}
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button type="submit" style={{ background: '#0055ff', color: '#fff', border: 'none', padding: '13px 25px', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}>Ejecutar Búsqueda</button>
                                <button type="button" onClick={() => setFiltros({id_sucursal:'', id_medicamento:''})} style={{ background: '#4a4a4a', color: '#ddd', border: 'none', padding: '13px 20px', borderRadius: '0 4px 4px 0', cursor: 'pointer', outline: 'none' }}>Limpiar</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* VISTA 2: RESULTADOS DEL REPORTE */}
            {vistaResultados && (
                <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <h3 style={{ color: '#555', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Resultados del Reporte</h3>
                        <button onClick={() => setVistaResultados(false)} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            ← Volver a Selecciones
                        </button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '12px', color: '#555', fontWeight: 'bold' }}>ID Sucursal</th>
                                <th style={{ padding: '12px', color: '#555', fontWeight: 'bold' }}>Nombre Sucursal</th>
                                <th style={{ padding: '12px', color: '#555', fontWeight: 'bold' }}>ID Material</th>
                                <th style={{ padding: '12px', color: '#555', fontWeight: 'bold' }}>Descripción del Material</th>
                                <th style={{ padding: '12px', color: '#555', fontWeight: 'bold', textAlign: 'right' }}>Total Cajas Físicas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventarioGeneral.length > 0 ? (
                                inventarioGeneral.map((inv, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                        <td style={{ padding: '16px 12px', color: '#ffaa00' }}>{inv.ID_SUCURSAL}</td>
                                        <td style={{ padding: '16px 12px', color: '#666' }}>{inv.SUCURSAL}</td>
                                        <td style={{ padding: '16px 12px', color: '#00ffcc' }}>{inv.ID_MEDICAMENTO}</td>
                                        <td style={{ padding: '16px 12px', color: '#666' }}>{inv.MEDICAMENTO}</td>
                                        <td style={{ padding: '16px 12px', color: '#fff', fontWeight: 'bold', textAlign: 'right', fontSize: '14px' }}>{inv.TOTAL_CAJAS}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#555' }}>No se encontraron registros con los criterios seleccionados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockReport;