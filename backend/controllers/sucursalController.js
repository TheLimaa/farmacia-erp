const db = require('../config/db'); // Importa tu conexión a PostgreSQL

// GET: Obtener todas las sucursales (incluyendo TIPO_UBICACION)
const obtenerSucursales = async (req, res) => {
    try {
        const sql = `
            SELECT s.id_sucursal, 
                   s.nombre_ubicacion, 
                   COALESCE(s.tipo_ubicacion, 'FARMACIA') AS tipo_ubicacion,
                   COALESCE(s.estado, 'ACTIVO') AS estado,
                   COALESCE(c.saldo_actual, 0) AS saldo_caja
            FROM sucursal s
            LEFT JOIN caja_sucursal c ON s.id_sucursal = c.id_sucursal
            ORDER BY s.id_sucursal ASC
        `;
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener sucursales:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST: Crear nueva sucursal + asignar su caja automáticamente
const crearSucursal = async (req, res) => {
    try {
        const { nombre_ubicacion, tipo_ubicacion } = req.body;
        if (!nombre_ubicacion) {
            return res.status(400).json({ success: false, message: 'El nombre de la sucursal es obligatorio.' });
        }

        // 1. Insertar sucursal usando SERIAL y obteniendo el ID generado con RETURNING
        const sqlSucursal = `
            INSERT INTO sucursal (nombre_ubicacion, tipo_ubicacion, estado)
            VALUES ($1, $2, 'ACTIVO')
            RETURNING id_sucursal
        `;
        const resSucursal = await db.query(sqlSucursal, [
            nombre_ubicacion,
            tipo_ubicacion || 'FARMACIA'
        ]);
        const newIdSucursal = resSucursal.rows[0].id_sucursal;

        // 2. Crear su caja automáticamente (id_caja es SERIAL también) con saldo_apertura y saldo_actual en 0.00
        const sqlCaja = `
            INSERT INTO caja_sucursal (id_sucursal, saldo_apertura, saldo_actual)
            VALUES ($1, 0.00, 0.00)
        `;
        await db.query(sqlCaja, [newIdSucursal]);

        res.status(201).json({ success: true, message: `Sucursal "${nombre_ubicacion}" creada exitosamente con ID ${newIdSucursal}.` });
    } catch (error) {
        console.error('Error al crear sucursal:', error);
        res.status(500).json({ success: false, message: 'Error al registrar la sucursal' });
    }
};

// PUT: Editar nombre, tipo de ubicación o cambiar estado (ACTIVO / INACTIVO)
const actualizarSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_ubicacion, tipo_ubicacion, estado } = req.body;

        // Usamos COALESCE con parámetros posicionales para actualizar solo lo que venga en el body
        const sql = `
            UPDATE sucursal 
            SET nombre_ubicacion = COALESCE($1, nombre_ubicacion),
                tipo_ubicacion = COALESCE($2, tipo_ubicacion),
                estado = COALESCE($3, estado)
            WHERE id_sucursal = $4
        `;
        await db.query(sql, [
            nombre_ubicacion || null,
            tipo_ubicacion || null,
            estado || null,
            id
        ]);

        res.status(200).json({ success: true, message: 'Sucursal actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar sucursal:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
};

// DELETE: Eliminar sucursal y su caja
const eliminarSucursal = async (req, res) => {
    try {
        const { id } = req.params;

        // Como hay integridad referencial o dependencias, eliminamos primero la caja asociada y luego la sucursal
        await db.query(`DELETE FROM caja_sucursal WHERE id_sucursal = $1`, [id]);
        await db.query(`DELETE FROM sucursal WHERE id_sucursal = $1`, [id]);

        res.status(200).json({ success: true, message: 'Sucursal eliminada del sistema.' });
    } catch (error) {
        console.error('Error al eliminar sucursal:', error);
        res.status(400).json({ 
            success: false, 
            message: 'No se puede eliminar la sucursal porque tiene operaciones asociadas. Se recomienda INACTIVARLA.' 
        });
    }
};

module.exports = {
    obtenerUsuarios: undefined, // no utilizado aquí
    obtenerSucursales,
    crearSucursal,
    actualizarSucursal,
    eliminarSucursal
};