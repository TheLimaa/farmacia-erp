const oracledb = require('oracledb');

// GET: Buscar BP (Cliente) por NIT
const buscarCliente = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `SELECT id_cliente, nombre_completo, telefono_contacto FROM cliente WHERE nit = :nit`;
        const result = await connection.execute(sql, [req.params.nit], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            res.status(200).json({ success: false, message: 'BP no encontrado, se creará uno nuevo.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        if (connection) await connection.close();
    }
};

// POST: Registrar Pedido, Calcular Total y Descontar Stock con Lógica FIFO
const registrarPedido = async (req, res) => {
    let connection;
    try {
        const { id_sucursal, id_producto, nit, cliente, telefono, direccion, metodo_pago, cantidad } = req.body;
        connection = await oracledb.getConnection();
        
        const finalNit = (nit === '' || nit === undefined) ? null : nit;
        let idClienteFinal = null;

        // 1. Lógica del Cliente (BP)
        if (finalNit) {
            const resultBP = await connection.execute(
                `SELECT id_cliente FROM cliente WHERE nit = :nit`, 
                [finalNit], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (resultBP.rows.length > 0) idClienteFinal = resultBP.rows[0].ID_CLIENTE;
        }

        if (!idClienteFinal) {
            const insertBP = await connection.execute(`
                INSERT INTO cliente (nit, nombre_completo, telefono_contacto) 
                VALUES (:nit, :nombre, :telefono) 
                RETURNING id_cliente INTO :out_id
            `, {
                nit: finalNit,
                nombre: cliente,
                telefono: telefono,
                out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            });
            idClienteFinal = insertBP.outBinds.out_id[0];
        }

        // 2. Insertar el Pedido 
        const sqlPedido = `
            INSERT INTO pedido_entrega (
                id_pedido, id_cliente, id_sucursal_despacho, id_repartidor, 
                estado_pedido, metodo_pago_acordado, costo_envio, direccion_envio, id_producto, cantidad
            ) 
            SELECT 
                NVL(MAX(id_pedido), 0) + 1, :id_cliente, :id_sucursal_despacho, :id_repartidor, 
                'EN RUTA', :metodo_pago, 25.00, :direccion_envio, :id_producto, :cantidad 
            FROM pedido_entrega
        `;
        
        await connection.execute(sqlPedido, {
            id_cliente: idClienteFinal,
            id_sucursal_despacho: id_sucursal,
            id_repartidor: 2, 
            metodo_pago: metodo_pago,
            direccion_envio: direccion,
            id_producto: id_producto,
            cantidad: cantidad
        });

        // 3. DESCONTAR STOCK DEL INVENTARIO - LÓGICA FIFO
        let restante = parseInt(cantidad);
        
        // Obtener todos los lotes disponibles ordenados del más antiguo al más nuevo
        const lotes = await connection.execute(
            `SELECT id_lote, cantidad FROM inventario_lote 
             WHERE id_sucursal = :id_sucursal 
               AND id_medicamento = :id_producto 
               AND cantidad > 0 
               AND estado = 'DISPONIBLE'
             ORDER BY id_lote ASC`,
            { id_sucursal: id_sucursal, id_producto: id_producto },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Iterar restando stock hasta cumplir el pedido
        for (let lote of lotes.rows) {
            if (restante <= 0) break;
            
            // Calculamos cuánto podemos tomar de este lote
            let aDescontar = Math.min(restante, lote.CANTIDAD);
            
            // Actualizamos el lote
            await connection.execute(
                `UPDATE inventario_lote SET cantidad = cantidad - :aDescontar WHERE id_lote = :id_lote`,
                { aDescontar: aDescontar, id_lote: lote.ID_LOTE }
            );
            
            restante -= aDescontar;
        }
        
        await connection.commit();
        res.status(200).json({ success: true, message: 'Pedido facturado y stock descontado exitosamente.' });
    } catch (error) {
        console.error('Error al registrar pedido:', error);
        if (connection) await connection.rollback(); 
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.close();
    }
};

// GET: Consultar pedidos pendientes
const obtenerPendientes = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT 
                p.id_pedido, 
                NVL(c.nit, 'CF') || ' - ' || c.nombre_completo as cliente,  
                p.direccion_envio as direccion, 
                s.nombre_ubicacion as sucursal_despacho, 
                p.metodo_pago_acordado, 
                ((p.cantidad * m.precio_unitario) + NVL(p.costo_envio, 0)) as total, 
                p.estado_pedido 
            FROM pedido_entrega p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN sucursal s ON p.id_sucursal_despacho = s.id_sucursal
            LEFT JOIN medicamento m ON p.id_producto = m.id_medicamento
            WHERE p.estado_pedido != 'ENTREGADO'
            ORDER BY p.id_pedido DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        if (connection) await connection.close();
    }
};

const entregarPedido = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        await connection.execute(`UPDATE pedido_entrega SET estado_pedido = 'ENTREGADO' WHERE id_pedido = :id`, [req.params.id], { autoCommit: true });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); } finally { if (connection) await connection.close(); }
};

module.exports = { 
    registrarPedido, 
    obtenerPendientes, 
    entregarPedido, 
    buscarCliente };