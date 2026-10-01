const oracledb = require('oracledb');

const getPedidosEntrega = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT 
                p.id_pedido,
                c.nombre_completo as cliente,
                s.nombre_ubicacion as sucursal_despacho,
                e.nombre_completo as repartidor,
                p.estado_pedido,
                p.metodo_pago_acordado,
                p.costo_envio,
                p.fecha_hora_solicitud
            FROM pedido_entrega p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            JOIN sucursal s ON p.id_sucursal_despacho = s.id_sucursal
            JOIN empleado e ON p.id_repartidor = e.id_empleado
            ORDER BY p.fecha_hora_solicitud DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener pedidos de entrega:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { getPedidosEntrega };
