const db = require('../config/db');

// Consulta un resumen financiero consolidado por sucursal que incluye el saldo actual de caja, el gasto en planilla y el valor total de los activos fijos activos
const getFinancialAuditSummary = async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.id_sucursal,
                s.nombre_ubicacion,
                s.tipo_ubicacion,
                COALESCE(c.saldo_actual, 0) AS saldo_caja,
                COALESCE(p.total_planilla, 0) AS gasto_planilla,
                COALESCE(a.total_activos, 0) AS valor_activos_fijos
            FROM sucursal s
            LEFT JOIN caja_sucursal c ON s.id_sucursal = c.id_sucursal
            LEFT JOIN (
                SELECT 
                    e.id_sucursal,
                    SUM(COALESCE(pp.total_pagado, e.salario_base)) AS total_planilla
                FROM empleado e
                LEFT JOIN (
                    SELECT id_empleado, SUM(monto_pagado) AS total_pagado
                    FROM pago_planilla
                    GROUP BY id_empleado
                ) pp ON e.id_empleado = pp.id_empleado
                GROUP BY e.id_sucursal
            ) p ON s.id_sucursal = p.id_sucursal
            LEFT JOIN (
                SELECT id_sucursal, SUM(valor_compra) AS total_activos
                FROM activo_fijo 
                WHERE estado != 'DE_BAJA' 
                GROUP BY id_sucursal
            ) a ON s.id_sucursal = a.id_sucursal
            ORDER BY s.id_sucursal ASC
        `;
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener el resumen financiero:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Consulta el historial completo de movimientos de caja registrados en todas las sucursales ordenados de forma descendente por fecha y hora
const getCashFlowHistory = async (req, res) => {
    try {
        const sql = `
            SELECT 
                m.id_movimiento,
                s.nombre_ubicacion AS sucursal,
                m.tipo_movimiento,
                m.monto,
                m.concepto,
                TO_CHAR(m.fecha_hora, 'DD/MM/YYYY HH24:MI:SS') AS fecha_hora
            FROM movimiento_caja m
            JOIN caja_sucursal c ON m.id_caja = c.id_caja
            JOIN sucursal s ON c.id_sucursal = s.id_sucursal
            ORDER BY m.fecha_hora DESC
        `;
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al consultar el historial de caja:', error);
        res.status(500).json({ success: false, message: 'Error al consultar historial de caja' });
    }
};

module.exports = { getFinancialAuditSummary, getCashFlowHistory };