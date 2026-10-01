const oracledb = require('oracledb');

const getFinancialAuditSummary = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();

        // Consulta unificada para auditoría gerencial (Caja, Planilla y Activos)
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
                SELECT id_sucursal, SUM(salario_base) as total_planilla
                FROM empleado
                GROUP BY id_sucursal
            ) p ON s.id_sucursal = p.id_sucursal
            LEFT JOIN (
                SELECT id_sucursal, SUM(valor_inicial) as total_activos
                FROM activo_fijo
                GROUP BY id_sucursal
            ) a ON s.id_sucursal = a.id_sucursal
        `;

        const result = await connection.execute(sql, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error al generar reporte de auditoría:', error);
        res.status(500).json({ success: false, message: 'Error interno al consultar datos financieros' });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
};

module.exports = {
    getFinancialAuditSummary
};