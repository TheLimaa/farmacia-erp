import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const TransitReport = () => {
    const navigate = useNavigate();
    const [filtros, setFiltros] = useState({ id_sucursal: '', id_medicamento: '' });
    const [vistaResultados, setVistaResultados] = useState(false);
    const [stockTransito, setStockTransito] = useState([]);

    const [catalogoMedicamentos, setCatalogoMedicamentos] = useState([
        { ID_MEDICAMENTO: 1, NOMBRE_COMERCIAL: 'Paracetamol 500 mg' },
        { ID_MEDICAMENTO: 2, NOMBRE_COMERCIAL: 'Ibuprofeno 400 mg' },
        { ID_MEDICAMENTO: 3, NOMBRE_COMERCIAL: 'Acetaminofén 500 mg' },
        { ID_MEDICAMENTO: 4, NOMBRE_COMERCIAL: 'Ciprofloxacina' }
    ]);
    
    const [catalogoSucursales] = useState([
        { ID_SUCURSAL: 1, NOMBRE_UBICACION: 'Farmacia Miraflores' },
        { ID_SUCURSAL: 2, NOMBRE_UBICACION: 'Stand Gasolinera Puma Próceres' },
        { ID_SUCURSAL: 3, NOMBRE_UBICACION: 'Farmacia Oakland Mall' }
    ]);

    const [showSucursalHelp, setShowSucursalHelp] = useState(false);
    const [showMaterialHelp, setShowMaterialHelp] = useState(false);

    const sucursalRef = useRef(null);
    const materialRef = useRef(null);

    useEffect(() => {
        const fetchCatalogo = async () => {
            try {
                const resMed = await fetch('http://localhost:3000/api/inventario/medicamentos');
                const dataMed = await resMed.json();
                if (dataMed.success && dataMed.data && dataMed.data.length > 0) {
                    const normalizados = dataMed.data.map(m => ({
                        ID_MEDICAMENTO: m.ID_MEDICAMENTO || m.id_medicamento,
                        NOMBRE_COMERCIAL: m.NOMBRE_COMERCIAL || m.nombre_comercial || m.NOMBRE || m.nombre
                    }));
                    setCatalogoMedicamentos(normalizados);
                }
            } catch (error) { console.error(error); }
        };
        fetchCatalogo();

        const handleClickOutside = (event) => {
            if (sucursalRef.current && !sucursalRef.current.contains(event.target)) setShowSucursalHelp(false);
            if (materialRef.current && !materialRef.current.contains(event.target)) setShowMaterialHelp(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sucursalesFiltradas = catalogoSucursales.filter(s => {
        const query = filtros.id_sucursal ? filtros.id_sucursal.toString().toLowerCase() : '';
        return s.ID_SUCURSAL.toString().includes(query) || s.NOMBRE_UBICACION.toLowerCase().includes(query);
    });

    const medicamentosFiltrados = catalogoMedicamentos.filter(m => {
        const query = filtros.id_medicamento ? filtros.id_medicamento.toString().toLowerCase() : '';
        const idMatch = m.ID_MEDICAMENTO?.toString().includes(query);
        const nameMatch = m.NOMBRE_COMERCIAL?.toLowerCase().includes(query);
        return idMatch || nameMatch;
    });

    const buscarTransito = async (e) => {
        if (e) e.preventDefault();
        try {
            const params = new URLSearchParams();
            if (filtros.id_sucursal) params.append('id_sucursal', filtros.id_sucursal);
            if (filtros.id_medicamento) params.append('id_medicamento', filtros.id_medicamento);

            const res = await fetch(`http://localhost:3000/api/inventario/transito?${params.toString()}`);
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
            const res = await fetch('http://localhost:3000/api/inventario/recibir', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_lote })
            });
            const data = await res.json();
            if(data.success) {
                alert(data.message);
                setStockTransito(stockTransito.filter(item => item.ID_LOTE !== id_lote));
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
                    <h2 style={{ fontSize: '22px', margin: '0 0 8px 0', color: '#fff', fontWeight: '500' }}>Visualizar Stock en Tránsito</h2>
                    <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Auditoría de lotes pendientes de recepción en centro receptor.</p>
                </div>
                <div style={{ width: '130px' }}></div> {/* Espaciador para centrar el título */}
            </div>

            {!vistaResultados && (
                <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1000px', margin: '0 auto' }}>
                    <h3 style={{ textAlign: 'center', color: '#555', margin: '0 0 25px 0', fontSize: '16px', fontWeight: 'bold' }}>Selecciones de Base de Datos</h3>

                    <form onSubmit={buscarTransito} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', width: '100%', maxWidth: '900px' }}>
                            
                            {/* CENTRO RECEPTOR CON MATCHCODE IDÉNTICO */}
                            <div ref={sucursalRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <label style={{ color: '#777', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>Centro Receptor (ID Sucursal):</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. 1 o Miraflores" 
                                    value={filtros.id_sucursal} 
                                    onFocus={() => setShowSucursalHelp(true)}
                                    onChange={e => { setFiltros({...filtros, id_sucursal: e.target.value}); setShowSucursalHelp(true); }} 
                                    style={{ background: '#333', color: '#fff', border: '1px solid #444', borderRight: 'none', padding: '12px 15px', borderRadius: '4px 0 0 4px', outline: 'none' }} 
                                />
                                {showSucursalHelp && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>Seleccionar Centro</div>
                                        {sucursalesFiltradas.length > 0 ? (
                                            sucursalesFiltradas.map(s => (
                                                <div key={s.ID_SUCURSAL} onClick={() => { setFiltros({...filtros, id_sucursal: s.ID_SUCURSAL.toString()}); setShowSucursalHelp(false); }}
                                                     style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', borderTop: '1px solid #333', color: '#ddd' }}
                                                     onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <strong style={{ color: '#ffaa00' }}>{s.ID_SUCURSAL}</strong> - {s.NOMBRE_UBICACION}
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>No hay resultados</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* MATERIAL CON MATCHCODE IDÉNTICO AL QUE SÍ FUNCIONA */}
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
                                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#252528', border: '1px solid #444', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>Seleccionar Material</div>
                                        {medicamentosFiltrados.length > 0 ? (
                                            medicamentosFiltrados.map(m => (
                                                <div key={m.ID_MEDICAMENTO} onClick={() => { setFiltros({...filtros, id_medicamento: m.ID_MEDICAMENTO.toString()}); setShowMaterialHelp(false); }}
                                                     style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', borderTop: '1px solid #333', color: '#ddd' }}
                                                     onMouseEnter={e => e.currentTarget.style.background = '#3a3a3d'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <strong style={{ color: '#00ffcc' }}>{m.ID_MEDICAMENTO}</strong> - {m.NOMBRE_COMERCIAL}
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>No hay medicamentos en el catálogo</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button type="submit" style={{ background: '#0055ff', color: '#fff', border: 'none', padding: '13px 25px', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}>Ejecutar</button>
                                <button type="button" onClick={() => setFiltros({id_sucursal:'', id_medicamento:''})} style={{ background: '#4a4a4a', color: '#ddd', border: 'none', padding: '13px 20px', borderRadius: '0 4px 4px 0', cursor: 'pointer', outline: 'none' }}>Limpiar</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {vistaResultados && (
                <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '8px', border: '1px solid #2a2a2c', maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <h3 style={{ color: '#555', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Lotes en Tránsito (Pendientes de Recepción)</h3>
                        <button onClick={() => setVistaResultados(false)} style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>← Volver</button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '12px', color: '#555' }}>ID Lote</th>
                                <th style={{ padding: '12px', color: '#555' }}>Centro Receptor</th>
                                <th style={{ padding: '12px', color: '#555' }}>Material</th>
                                <th style={{ padding: '12px', color: '#555' }}>No. Lote Fab.</th>
                                <th style={{ padding: '12px', color: '#555', textAlign: 'right' }}>Cantidad</th>
                                <th style={{ padding: '12px', color: '#555', textAlign: 'center' }}>Acción (MIGO)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockTransito.length > 0 ? (
                                stockTransito.map((inv) => (
                                    <tr key={inv.ID_LOTE} style={{ borderBottom: '1px solid #2a2a2c' }}>
                                        <td style={{ padding: '16px 12px', color: '#aaa' }}>#{inv.ID_LOTE}</td>
                                        <td style={{ padding: '16px 12px', color: '#ffaa00' }}>{inv.ID_SUCURSAL} - {inv.SUCURSAL}</td>
                                        <td style={{ padding: '16px 12px', color: '#00ffcc' }}>{inv.ID_MEDICAMENTO} - {inv.MEDICAMENTO}</td>
                                        <td style={{ padding: '16px 12px', color: '#666' }}>{inv.NUMERO_LOTE}</td>
                                        <td style={{ padding: '16px 12px', color: '#fff', fontWeight: 'bold', textAlign: 'right' }}>{inv.CANTIDAD}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            <button onClick={() => handleRecibir(inv.ID_LOTE)} style={{ background: '#00cc66', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                Contabilizar Recepción
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#555' }}>No hay mercancía en tránsito.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TransitReport;