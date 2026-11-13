const db = require('../config/db');

// Consulta las métricas generales del tablero principal, incluyendo la inversión total en activos, el efectivo acumulado en cajas, las entregas activas y los traslados en curso
const getDashboardMetrics = async (req, res) => {
    try {
        const sql = `
            SELECT 
                (SELECT COALESCE(SUM(valor_inicial), 0) FROM activo_fijo) as total_inversion,
                (SELECT COALESCE(SUM(saldo_actual), 0) FROM caja_sucursal) as efectivo_total,
                (SELECT COUNT(*) FROM pedido_entrega WHERE estado_pedido = 'EN_CAMINO') as entregas_activas,
                (SELECT COUNT(*) FROM traslado_interno WHERE estado_traslado = 'EN_CAMINO') as traslados_activos
        `;
        const result = await db.query(sql);
        
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error al obtener métricas del dashboard:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

module.exports = { getDashboardMetrics };