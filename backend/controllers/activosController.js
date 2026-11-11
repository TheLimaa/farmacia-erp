const db = require('../config/db'); // Importa tu conexión a PostgreSQL

// GET: Obtener todos los activos
const obtenerActivos = async (req, res) => {
    try {
        const sql = `
            SELECT 
                a.id_activo, 
                a.id_sucursal, 
                s.nombre_ubicacion AS sucursal, 
                a.tipo_activo, 
                a.descripcion, 
                a.valor_compra, 
                a.fecha_adquisicion, 
                a.estado
            FROM activo_fijo a
            LEFT JOIN sucursal s ON a.id_sucursal = s.id_sucursal
            ORDER BY a.id_sucursal ASC, a.id_activo DESC
        `;
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener activos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST: Registrar un nuevo activo (SIN AFECTAR EL SALDO DE LA CAJA)
const registrarActivo = async (req, res) => {
    try {
        const { id_sucursal, tipo_activo, descripcion, valor_compra } = req.body;
        
        // En PostgreSQL no necesitamos calcular el MAX() manualmente gracias a SERIAL,
        // simplemente insertamos y dejamos que la base de datos asigne el ID y el TIMESTAMP automático.
        const sqlActivo = `
            INSERT INTO activo_fijo (id_sucursal, tipo_activo, descripcion, valor_compra, fecha_adquisicion, estado) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'ACTIVO')
        `;
        
        await db.query(sqlActivo, [id_sucursal, tipo_activo, descripcion, valor_compra]);

        res.status(200).json({ success: true, message: 'Activo fijo registrado exitosamente.' });

    } catch (error) {
        console.error('Error al registrar activo:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al intentar registrar el activo.' });
    }
};

// PUT: Cambiar estado (ACTIVO, EN_REPARACION, DE_BAJA)
const actualizarEstadoActivo = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        // Se usan parámetros posicionales ($1, $2) propios de PostgreSQL
        const sql = `UPDATE activo_fijo SET estado = $1 WHERE id_activo = $2`;
        await db.query(sql, [estado, id]);
        
        res.status(200).json({ success: true, message: `Estado actualizado a ${estado}` });
    } catch (error) {
        console.error('Error al actualizar activo:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = { obtenerActivos, registrarActivo, actualizarEstadoActivo };