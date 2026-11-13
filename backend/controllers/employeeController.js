const db = require('../config/db');

// Consulta la lista completa de empleados en la base de datos junto con el nombre de su sucursal asociada, ordenados de forma descendente por su identificador
const obtenerEmpleados = async (req, res) => {
    try {
        const sql = `
            SELECT e.id_empleado, e.nombre_completo, e.puesto, e.salario_base, 
                   e.fecha_contratacion, e.id_sucursal, s.nombre_ubicacion as sucursal
            FROM empleado e
            LEFT JOIN sucursal s ON e.id_sucursal = s.id_sucursal
            ORDER BY e.id_empleado DESC
        `;
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Registra un nuevo empleado en la base de datos asignando la fecha de contratación actual y asociándolo a una sucursal o dejándola nula si es administrador
const crearEmpleado = async (req, res) => {
    try {
        const { nombre_completo, puesto, salario_base, id_sucursal } = req.body;

        const sql = `
            INSERT INTO empleado (nombre_completo, puesto, salario_base, fecha_contratacion, id_sucursal)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        `;
        
        await db.query(sql, [
            nombre_completo,
            puesto,
            salario_base,
            id_sucursal || null
        ]);

        res.status(201).json({ success: true, message: 'Empleado registrado exitosamente.' });
    } catch (error) {
        console.error('Error al crear empleado:', error);
        res.status(500).json({ success: false, message: 'Error al registrar el empleado' });
    }
};

// Actualiza los datos generales o la sucursal asignada de un empleado específico utilizando su identificador
const actualizarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, puesto, salario_base, id_sucursal } = req.body;

        const sql = `
            UPDATE empleado 
            SET nombre_completo = COALESCE($1, nombre_completo),
                puesto = COALESCE($2, puesto),
                salario_base = COALESCE($3, salario_base),
                id_sucursal = COALESCE($4, id_sucursal)
            WHERE id_empleado = $5
        `;
        
        await db.query(sql, [
            nombre_completo || null,
            puesto || null,
            salario_base || null,
            id_sucursal || null,
            id
        ]);

        res.status(200).json({ success: true, message: 'Empleado actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar empleado:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar empleado' });
    }
};

// Elimina del sistema los registros de pagos de planilla asociados y posteriormente el perfil del empleado según su identificador
const eliminarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(`DELETE FROM pago_planilla WHERE id_empleado = $1`, [id]);
        await db.query(`DELETE FROM empleado WHERE id_empleado = $1`, [id]);

        res.status(200).json({ success: true, message: 'Empleado eliminado del sistema.' });
    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar empleado' });
    }
};

module.exports = {
    obtenerEmpleados,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado
};