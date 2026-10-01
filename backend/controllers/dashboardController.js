const oracledb = require('oracledb');

const getDashboardMetrics = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT 
                (SELECT NVL(SUM(valor_inicial), 0) FROM activo_fijo) as total_inversion,
                (SELECT NVL(SUM(saldo_actual), 0) FROM caja_sucursal) as efectivo_total,
                (SELECT COUNT(*) FROM pedido_entrega WHERE estado_pedido = 'EN_CAMINO') as entregas_activas,
                (SELECT COUNT(*) FROM traslado_interno WHERE estado_traslado = 'EN_CAMINO') as traslados_activos
            FROM dual
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error al obtener métricas del dashboard:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { getDashboardMetrics };
