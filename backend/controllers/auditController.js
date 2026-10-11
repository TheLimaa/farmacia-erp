const oracledb = require('oracledb');

const getFinancialAuditSummary = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        // CORRECCIÓN: Se agregó el JOIN con EMPLEADO para poder agrupar por id_sucursal
        const sql = `
            SELECT 
                s.id_sucursal,
                s.nombre_ubicacion,
                s.tipo_ubicacion,
                NVL(c.saldo_actual, 0) as saldo_caja,
                NVL(p.total_planilla, 0) as gasto_planilla,
                NVL(a.total_activos, 0) as valor_activos_fijos
            FROM sucursal s
            LEFT JOIN caja_sucursal c ON s.id_sucursal = c.id_sucursal
            LEFT JOIN (
                SELECT e.id_sucursal, SUM(pp.monto_pagado) as total_planilla
                FROM pago_planilla pp
                JOIN empleado e ON pp.id_empleado = e.id_empleado
                GROUP BY e.id_sucursal
            ) p ON s.id_sucursal = p.id_sucursal
            LEFT JOIN (
                SELECT id_sucursal, SUM(valor_compra) as total_activos
                FROM activo_fijo WHERE estado != 'DE_BAJA' GROUP BY id_sucursal
            ) a ON s.id_sucursal = a.id_sucursal
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener el resumen financiero:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        if (connection) await connection.close();
    }
};

const getCashFlowHistory = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT 
                m.id_movimiento,
                s.nombre_ubicacion as sucursal,
                m.tipo_movimiento,
                m.monto,
                m.concepto,
                TO_CHAR(m.fecha_hora, 'DD/MM/YYYY HH24:MI:SS') as fecha_hora
            FROM movimiento_caja m
            JOIN caja_sucursal c ON m.id_caja = c.id_caja
            JOIN sucursal s ON c.id_sucursal = s.id_sucursal
            ORDER BY m.fecha_hora DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al consultar el historial de caja:', error);
        res.status(500).json({ success: false, message: 'Error al consultar historial de caja' });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { getFinancialAuditSummary, getCashFlowHistory };