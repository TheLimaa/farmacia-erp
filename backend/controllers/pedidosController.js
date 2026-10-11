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

// NUEVO GET: Buscar Material (Medicamento) para autocompletar la tabla de posiciones
// REEMPLAZA ESTA FUNCIÓN:
const buscarMedicamento = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        // Usamos SELECT * para que Oracle traiga todas las columnas sin importar si se llama NOMBRE_COMERCI o NOMBRE_COMERCIAL
        const sql = `SELECT * FROM medicamento WHERE id_medicamento = :id`;
        const result = await connection.execute(sql, [req.params.id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Material no encontrado' });
        }
    } catch (error) {
        console.error('Error en base de datos:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        if (connection) await connection.close();
    }
};

// AGREGA ESTA NUEVA FUNCIÓN:
const buscarSucursal = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `SELECT * FROM sucursal WHERE id_sucursal = :id`; // Usar SELECT *
        const result = await connection.execute(sql, [req.params.id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        if (connection) await connection.close();
    }
};




// POST: Registrar Pedido con Múltiples Posiciones (Estilo SAP)
const registrarPedido = async (req, res) => {
    let connection;
    try {
        // Ahora recibimos un arreglo llamado "posiciones" en lugar de un solo producto
        const { id_sucursal, nit, cliente, telefono, direccion, metodo_pago, posiciones } = req.body;
        connection = await oracledb.getConnection();
        
        if (!posiciones || posiciones.length === 0) {
            return res.status(400).json({ success: false, message: 'El pedido debe contener al menos una posición.' });
        }

        const finalNit = (nit === '' || nit === undefined) ? null : nit;
        let idClienteFinal = null;

        // --- 1. VALIDACIÓN DE CAJA ---
        const cajaResult = await connection.execute(
            `SELECT id_caja FROM caja_sucursal WHERE id_sucursal = :id_sucursal`,
            [id_sucursal]
        );
        if (cajaResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Esta sucursal no tiene una caja asignada.' });
        }
        const id_caja = cajaResult.rows[0][0];

        // --- 2. LÓGICA DEL CLIENTE (BP) ---
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

        // --- 3. INSERTAR CABECERA DEL PEDIDO ---
        // Obtenemos el nuevo ID primero para usarlo en los detalles
        const resultId = await connection.execute(`SELECT NVL(MAX(id_pedido), 0) + 1 FROM pedido_entrega`);
        const newPedidoId = resultId.rows[0][0];

        await connection.execute(`
            INSERT INTO pedido_entrega (
                id_pedido, id_cliente, id_sucursal_despacho, id_repartidor, 
                estado_pedido, metodo_pago_acordado, costo_envio, direccion_envio
            ) VALUES (
                :id_pedido, :id_cliente, :id_sucursal_despacho, :id_repartidor, 
                'EN RUTA', :metodo_pago, 25.00, :direccion_envio
            )
        `, {
            id_pedido: newPedidoId, id_cliente: idClienteFinal, id_sucursal_despacho: id_sucursal,
            id_repartidor: 2, metodo_pago, direccion_envio: direccion
        });

        // --- 4. BUCLE DE POSICIONES (DETALLES E INVENTARIO) ---
        let subtotalProductos = 0;
        let numPosicion = 10; // SAP numera de 10 en 10

        for (let pos of posiciones) {
            const { id_producto, cantidad } = pos;
            
            // Obtener precio actual
            const precioMed = await connection.execute(`SELECT precio_unitario FROM medicamento WHERE id_medicamento = :id`, [id_producto]);
            const precioUnitario = precioMed.rows.length > 0 ? precioMed.rows[0][0] : 0;
            
            subtotalProductos += (precioUnitario * cantidad);

            // Insertar la posición en DETALLE_PEDIDO
            await connection.execute(`
                INSERT INTO detalle_pedido (id_detalle, id_pedido, posicion, id_producto, cantidad, precio_unitario)
                VALUES ((SELECT NVL(MAX(id_detalle), 0) + 1 FROM detalle_pedido), :id_pedido, :posicion, :id_producto, :cantidad, :precio)
            `, { id_pedido: newPedidoId, posicion: numPosicion, id_producto, cantidad, precio: precioUnitario });

            numPosicion += 10;

            // Descontar Stock FIFO para esta posición
            let restante = parseInt(cantidad);
            const lotes = await connection.execute(
                `SELECT id_lote, cantidad FROM inventario_lote 
                 WHERE id_sucursal = :id_sucursal AND id_medicamento = :id_producto 
                 AND cantidad > 0 AND estado = 'DISPONIBLE' ORDER BY id_lote ASC`,
                { id_sucursal, id_producto }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            for (let lote of lotes.rows) {
                if (restante <= 0) break;
                let aDescontar = Math.min(restante, lote.CANTIDAD);
                await connection.execute(
                    `UPDATE inventario_lote SET cantidad = cantidad - :aDescontar WHERE id_lote = :id_lote`,
                    { aDescontar, id_lote: lote.ID_LOTE }
                );
                restante -= aDescontar;
            }
        }

        // --- 5. LÓGICA DE FLUJO DE CAJA ---
        const totalVenta = subtotalProductos + 25.00; // Productos + Envío
        const metodoPagoUpper = metodo_pago ? metodo_pago.toUpperCase() : 'EFECTIVO';
        
        if (metodoPagoUpper === 'EFECTIVO') {
            const concepto = `Venta Múltiple BP: ${cliente} - Doc: ${newPedidoId}`;
            await connection.execute(`
                INSERT INTO movimiento_caja (id_movimiento, id_caja, tipo_movimiento, monto, concepto, fecha_hora)
                VALUES ((SELECT NVL(MAX(id_movimiento), 0) + 1 FROM movimiento_caja), :id_caja, 'INGRESO', :monto, :concepto, CURRENT_TIMESTAMP)
            `, { id_caja, monto: totalVenta, concepto });

            await connection.execute(`
                UPDATE caja_sucursal SET saldo_actual = saldo_actual + :monto WHERE id_caja = :id_caja
            `, { monto: totalVenta, id_caja });
        }
        
        await connection.commit();
        res.status(200).json({ success: true, message: `Pedido ${newPedidoId} contabilizado exitosamente.` });
    } catch (error) {
        console.error('Error al registrar pedido múltiple:', error);
        if (connection) await connection.rollback(); 
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.close();
    }
};

// GET: Consultar pedidos pendientes (Query actualizado con JOIN a Detalles)
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
                (NVL(d.total_productos, 0) + NVL(p.costo_envio, 0)) as total, 
                p.estado_pedido 
            FROM pedido_entrega p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN sucursal s ON p.id_sucursal_despacho = s.id_sucursal
            LEFT JOIN (
                SELECT id_pedido, SUM(cantidad * precio_unitario) as total_productos
                FROM detalle_pedido
                GROUP BY id_pedido
            ) d ON p.id_pedido = d.id_pedido
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
    buscarCliente,
    buscarMedicamento,
    buscarSucursal
};