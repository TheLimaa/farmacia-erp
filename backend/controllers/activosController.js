const oracledb = require('oracledb');

// GET: Obtener todos los activos
const obtenerActivos = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
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
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener activos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.close();
    }
};

// POST: Registrar un nuevo activo (CON TRANSACCIÓN DE CAJA INTEGRADA)
const registrarActivo = async (req, res) => {
    let connection;
    try {
        const { id_sucursal, tipo_activo, descripcion, valor_compra } = req.body;
        connection = await oracledb.getConnection();
        
        // 1. Validar que la sucursal tenga caja y saldo suficiente
        const cajaResult = await connection.execute(
            `SELECT id_caja, saldo_actual FROM caja_sucursal WHERE id_sucursal = :id_sucursal`,
            [id_sucursal]
        );
        
        if (cajaResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Esta sucursal no tiene una caja asignada.' });
        }
        
        const id_caja = cajaResult.rows[0][0];
        const saldo_actual = cajaResult.rows[0][1];

        if (saldo_actual < valor_compra) {
            return res.status(400).json({ success: false, message: `Saldo insuficiente. La caja solo tiene Q ${saldo_actual}` });
        }

        // 2. Insertar el Activo Fijo
        const sqlActivo = `
            INSERT INTO activo_fijo (id_activo, id_sucursal, tipo_activo, descripcion, valor_compra, fecha_adquisicion, estado) 
            SELECT NVL(MAX(id_activo), 0) + 1, :id_sucursal, :tipo_activo, :descripcion, :valor_compra, SYSDATE, 'ACTIVO' FROM activo_fijo
        `;
        await connection.execute(sqlActivo, { id_sucursal, tipo_activo, descripcion, valor_compra });

        // 3. Registrar el EGRESO en la tabla movimiento_caja
        const concepto = `Compra de Activo Fijo: ${tipo_activo} - ${descripcion}`;
        const sqlMovimiento = `
            INSERT INTO movimiento_caja (id_movimiento, id_caja, tipo_movimiento, monto, concepto, fecha_hora)
            SELECT NVL(MAX(id_movimiento), 0) + 1, :id_caja, 'EGRESO', :monto, :concepto, CURRENT_TIMESTAMP FROM movimiento_caja
        `;
        await connection.execute(sqlMovimiento, { id_caja, monto: valor_compra, concepto });

        // 4. Descontar el dinero del saldo de la caja
        const sqlUpdateCaja = `
            UPDATE caja_sucursal SET saldo_actual = saldo_actual - :monto WHERE id_caja = :id_caja
        `;
        await connection.execute(sqlUpdateCaja, { monto: valor_compra, id_caja });

        // 5. Confirmar transacción
        await connection.commit();
        res.status(200).json({ success: true, message: 'Activo fijo registrado y dinero debitado de la caja exitosamente.' });

    } catch (error) {
        console.error('Error al registrar activo y debitar caja:', error);
        if (connection) await connection.rollback(); // Revierte todo si algo falla
        res.status(500).json({ success: false, message: 'Error interno del servidor durante la transacción financiera' });
    } finally {
        if (connection) await connection.close();
    }
};

// PUT: Cambiar estado (ACTIVO, EN_REPARACION, DE_BAJA)
const actualizarEstadoActivo = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { estado } = req.body;
        connection = await oracledb.getConnection();
        
        const sql = `UPDATE activo_fijo SET estado = :estado WHERE id_activo = :id`;
        await connection.execute(sql, [estado, id], { autoCommit: true });
        
        res.status(200).json({ success: true, message: `Estado actualizado a ${estado}` });
    } catch (error) {
        console.error('Error al actualizar activo:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { obtenerActivos, registrarActivo, actualizarEstadoActivo };