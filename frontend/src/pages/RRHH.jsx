import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cargando from '../components/Cargando';
import { API_URL } from '../config/api';

const RRHH = () => {
    const navigate = useNavigate();
    const [empleados, setEmpleados] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [filtroSucursal, setFiltroSucursal] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [errorServidorModal, setErrorServidorModal] = useState('');
    const [cargando, setCargando] = useState(true);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [formEmpleado, setFormEmpleado] = useState({
        nombre_completo: '',
        puesto: 'VENDEDOR',
        salario_base: '',
        id_sucursal: ''
    });

    // Carga inicial de datos de empleados y sucursales en paralelo
    useEffect(() => {
        const cargarDatosIniciales = async () => {
            const tiempoMinimo = new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const [resEmp, resSuc] = await Promise.all([
                    fetch('' + API_URL + '/api/empleados').then(res => res.json()).catch(() => ({ success: false })),
                    fetch('' + API_URL + '/api/sucursales').then(res => res.json()).catch(() => ({ success: false })),
                    tiempoMinimo
                ]);

                if (resEmp.success) setEmpleados(resEmp.data);
                if (resSuc.success) setSucursales(resSuc.data);
            } catch (error) {
                console.error('Error al cargar datos de RRHH:', error);
            } finally {
                setCargando(false);
            }
        };

        cargarDatosIniciales();
    }, []);

    // Consulta la lista actualizada de empleados desde la API
    const cargarEmpleados = async () => {
        try {
            const res = await fetch('' + API_URL + '/api/empleados'); 
            const data = await res.json();
            if (data.success) setEmpleados(data.data);
        } catch (error) {
            console.error('Error al cargar empleados:', error);
        }
    };

    // Consulta la lista actualizada de sucursales desde la API
    const cargarSucursales = async () => {
        try {
            const res = await fetch('' + API_URL + '/api/sucursales');
            const data = await res.json();
            if (data.success) setSucursales(data.data);
        } catch (error) {
            console.error('Error al cargar sucursales:', error);
        }
    };

    // Abre el modal configurado para registrar un nuevo empleado
    const abrirModalCrear = () => {
        setEditandoId(null);
        setErrorServidorModal('');
        const primeraSucursal = sucursales[0]?.ID_SUCURSAL || sucursales[0]?.id_sucursal || '';
        setFormEmpleado({ 
            nombre_completo: '', 
            puesto: 'VENDEDOR', 
            salario_base: '', 
            id_sucursal: primeraSucursal 
        });
        setModalAbierto(true);
    };

    // Abre el modal cargando los datos del empleado seleccionado para su edición
    const abrirModalEditar = (emp) => {
        setEditandoId(emp.ID_EMPLEADO || emp.id_empleado);
        setErrorServidorModal('');
        setFormEmpleado({
            nombre_completo: emp.NOMBRE_COMPLETO || emp.nombre_completo,
            puesto: emp.PUESTO || emp.puesto,
            salario_base: emp.SALARIO_BASE || emp.salario_base,
            id_sucursal: emp.ID_SUCURSAL || emp.id_sucursal || ''
        });
        setModalAbierto(true);
    };

    const esAdmin = formEmpleado.puesto === 'ADMINISTRADOR' || formEmpleado.puesto === 'ADMIN';
    const esInvalidoAdmin = esAdmin && formEmpleado.id_sucursal !== '';
    const esInvalidoOperativo = !esAdmin && formEmpleado.id_sucursal === '';
    const hayErrorValidacion = esInvalidoAdmin || esInvalidoOperativo;

    let mensajeValidacion = '';
    if (esInvalidoAdmin) {
        mensajeValidacion = '⚠️ Un Administrador no puede estar ligado a una tienda en específico.';
    } else if (esInvalidoOperativo) {
        mensajeValidacion = '⚠️ Este puesto debe estar ligado a una sucursal específica.';
    }

    // Valida y envía los datos del formulario para registrar o actualizar un empleado en el servidor
    const guardarEmpleado = async (e) => {
        e.preventDefault();
        setErrorServidorModal('');

        if (hayErrorValidacion) return;

        const url = editandoId 
            ? `' + API_URL + '/api/empleados/${editandoId}`
            : '' + API_URL + '/api/empleados';
        const method = editandoId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formEmpleado)
            });
            const data = await res.json();

            if (data.success) {
                setMensaje('✅ ' + data.message);
                setModalAbierto(false);
                cargarEmpleados();
            } else {
                setErrorServidorModal('❌ ' + data.message);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            setErrorServidorModal('❌ Error al procesar empleado.');
        }
    };

    // Elimina un empleado del sistema previa confirmación
    const eliminarEmpleado = async (id) => {
        if (!window.confirm(`¿Está seguro de eliminar al empleado #${id}?`)) return;
        try {
            const res = await fetch(`' + API_URL + '/api/empleados/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMensaje('✅ ' + data.message);
                cargarEmpleados();
            } else {
                alert(data.message);
            }
            setTimeout(() => setMensaje(''), 4000);
        } catch (error) {
            console.error('Error eliminando empleado:', error);
        }
    };

    // Filtra la lista de empleados según la sucursal seleccionada
    const empleadosFiltrados = empleados.filter(e => {
        const suc = (e.SUCURSAL || e.sucursal || '').toLowerCase();
        return suc.includes(filtroSucursal.toLowerCase());
    });

    const gastoTotalPlanilla = empleadosFiltrados.reduce((acc, curr) => acc + (parseFloat(curr.SALARIO_BASE || curr.salario_base) || 0), 0);

    // Muestra la pantalla de carga mientras se obtienen los datos iniciales
    if (cargando) {
        return <Cargando mensaje="Cargando..." />;
    }

    return (
        <div className="rrhh-container">
            
            <div className="rrhh-header-bar">
                <div className="rrhh-title-wrapper">
                    <button onClick={() => navigate('/dashboard')} className="btn-regresar-rrhh">❮</button>
                    <h2 className="rrhh-main-title">Gestión de Recursos Humanos (Nómina)</h2>
                </div>
                <button onClick={abrirModalCrear} className="btn-nuevo-empleado">
                    + Nuevo Empleado
                </button>
            </div>

            {mensaje && (
                <div className={`rrhh-mensaje-alerta ${mensaje.includes('❌') ? 'error' : 'exito'}`}>
                    {mensaje}
                </div>
            )}

            <div className="rrhh-card-resumen">
                <div className="rrhh-resumen-header">
                    <h3 className="rrhh-section-title">Nómina Activa y Gasto Total en Planilla</h3>
                    <input 
                        type="text" 
                        placeholder="Filtrar por sucursal..." 
                        value={filtroSucursal} 
                        onChange={e => setFiltroSucursal(e.target.value)} 
                        className="rrhh-input-buscar-sucursal" 
                    />
                    <div className="rrhh-gasto-total-badge">
                        Planilla total: Q {gastoTotalPlanilla.toFixed(2)}
                    </div>
                </div>

                <table className="rrhh-tabla">
                    <thead>
                        <tr>
                            <th>IDENTIFICACIÓN</th>
                            <th>Nombre Completo</th>
                            <th>Sucursal (Centro)</th>
                            <th>Puesto</th>
                            <th>Salario base (Q)</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleadosFiltrados.map(emp => {
                            const id = emp.ID_EMPLEADO || emp.id_empleado;
                            const nombre = emp.NOMBRE_COMPLETO || emp.nombre_completo;
                            const sucursal = emp.SUCURSAL || emp.sucursal || 'Acceso Global (Admin)';
                            const puesto = emp.PUESTO || emp.puesto;
                            const salario = parseFloat(emp.SALARIO_BASE || emp.salario_base || 0);

                            return (
                                <tr key={id}>
                                    <td className="td-id-empleado"># {id}</td>
                                    <td className="td-nombre-empleado">{nombre}</td>
                                    <td className={`td-sucursal-empleado ${sucursal.includes('Global') ? 'global' : 'tienda'}`}>{sucursal}</td>
                                    <td className="td-puesto-empleado">{puesto}</td>
                                    <td className="td-salario-empleado">Q {salario.toFixed(2)}</td>
                                    <td>
                                        <div className="rrhh-acciones-wrapper">
                                            <button onClick={() => abrirModalEditar(emp)} className="btn-editar-empleado">
                                                ✏️ Reasignar / Editar
                                            </button>
                                            <button onClick={() => eliminarEmpleado(id)} className="btn-eliminar-empleado">
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modalAbierto && (
                <div className="rrhh-modal-overlay">
                    <div className="rrhh-modal-content">
                        <h3 className="rrhh-modal-title">
                            {editandoId ? `Editar Empleado #${editandoId}` : 'Nuevo Empleado'}
                        </h3>

                        {mensajeValidacion && (
                            <div className="rrhh-modal-advertencia">
                                {mensajeValidacion}
                            </div>
                        )}

                        {errorServidorModal && (
                            <div className="rrhh-modal-error-servidor">
                                {errorServidorModal}
                            </div>
                        )}

                        <form onSubmit={guardarEmpleado} className="rrhh-form-group">
                            <div className="rrhh-form-field">
                                <label className="rrhh-form-label">Nombre Completo:*</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formEmpleado.nombre_completo} 
                                    onChange={e => setFormEmpleado({ ...formEmpleado, nombre_completo: e.target.value })} 
                                    className="rrhh-form-input" 
                                />
                            </div>

                            <div className="rrhh-form-field">
                                <label className="rrhh-form-label">Puesto:*</label>
                                <select 
                                    value={formEmpleado.puesto} 
                                    onChange={e => setFormEmpleado({ ...formEmpleado, puesto: e.target.value })} 
                                    className="rrhh-form-select"
                                >
                                    <option value="VENDEDOR">Vendedor</option>
                                    <option value="CAJERO">Cajero</option>
                                    <option value="REPARTIDOR">Repartidor</option>
                                    <option value="GERENTE">Gerente de Sucursal</option>
                                    <option value="ADMINISTRADOR">Administrador</option>
                                </select>
                            </div>

                            <div className="rrhh-form-field">
                                <label className="rrhh-form-label">Salario Base (Q):*</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    value={formEmpleado.salario_base} 
                                    onChange={e => setFormEmpleado({ ...formEmpleado, salario_base: e.target.value })} 
                                    className="rrhh-form-input" 
                                />
                            </div>

                            <div className="rrhh-form-field">
                                <label className="rrhh-form-label">
                                    Sucursal Asignada {esAdmin ? '(Exclusivo Admin)' : ':*'}
                                </label>
                                <select 
                                    value={formEmpleado.id_sucursal} 
                                    onChange={e => setFormEmpleado({ ...formEmpleado, id_sucursal: e.target.value })} 
                                    className="rrhh-form-select"
                                >
                                    <option value="">Acceso Global (Admin)</option>
                                    {sucursales.map(s => (
                                        <option key={s.ID_SUCURSAL || s.id_sucursal} value={s.ID_SUCURSAL || s.id_sucursal}>
                                            {s.ID_SUCURSAL || s.id_sucursal} - {s.NOMBRE_UBICACION || s.nombre_ubicacion}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rrhh-modal-buttons-row">
                                <button type="button" onClick={() => setModalAbierto(false)} className="btn-modal-cancelar">
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={hayErrorValidacion}
                                    className={`btn-modal-guardar ${hayErrorValidacion ? 'invalido' : 'valido'}`}
                                >
                                    {editandoId ? 'Guardar Cambios' : 'Registrar Empleado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RRHH;