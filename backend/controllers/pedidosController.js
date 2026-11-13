const db = require('../config/db');

// Consulta la información de un cliente (BP) en la base de datos utilizando su número de NIT
const buscarCliente = async (req, res) => {
    try {
        const sql = `SELECT id_cliente, nombre_completo, telefono_contacto FROM cliente WHERE nit = $1`;
        const result = await db.query(sql, [req.params.nit]);
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            res.status(200).json({ success: false, message: 'BP no encontrado, se creará uno nuevo.' });
        }
    } catch (error) {
        console.error('Error buscando cliente:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Consulta los datos detallados de un medicamento en el catálogo mediante su identificador para autocompletar posiciones
const buscarMedicamento = async (req, res) => {
    try {
        const sql = `SELECT * FROM medicamento WHERE id_medicamento = $1`;
        const result = await db.query(sql, [req.params.id]);
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Material no encontrado' });
        }
    } catch (error) {
        console.error('Error buscando medicamento:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Consulta la información general de una sucursal en la base de datos a partir de su identificador
const buscarSucursal = async (req, res) => {
    try {
        const sql = `SELECT * FROM sucursal WHERE id_sucursal = $1`;
        const result = await db.query(sql, [req.params.id]);
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }
    } catch (error) {
        console.error('Error buscando sucursal:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Registra un nuevo pedido de entrega con múltiples posiciones validando estrictamente el stock disponible, la caja de la sucursal, asignando un repartidor, gestionando el cliente y descontando el inventario mediante FIFO
const registrarPedido = async (req, res) => {
    try {
        const { id_sucursal, nit, cliente, telefono, direccion, metodo_pago, posiciones, id_repartidor } = req.body;
        
        if (!posiciones || posiciones.length === 0) {
            return res.status(400).json({ success: false, message: 'El pedido debe contener al menos una posición.' });
        }

        const finalNit = (nit === '' || nit === undefined) ? null : nit;
        let idClienteFinal = null;

        for (let pos of posiciones) {
            const stockCheck = await db.query(
                `SELECT COALESCE(SUM(cantidad), 0) as total_stock 
                 FROM inventario_lote 
                 WHERE id_sucursal = $1 
                   AND id_medicamento = $2 
                   AND estado = 'DISPONIBLE'`,
                [id_sucursal, pos.id_producto]
            );

            let stockDisponible = 0;
            if (stockCheck.rows.length > 0 && stockCheck.rows[0].total_stock !== undefined) {
                stockDisponible = Number(stockCheck.rows[0].total_stock);
            }

            if (stockDisponible < Number(pos.cantidad)) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Stock insuficiente, revisar existencia en tienda para el medicamento ID ${pos.id_producto}.` 
                });
            }
        }

        const cajaResult = await db.query(
            `SELECT id_caja FROM caja_sucursal WHERE id_sucursal = $1`,
            [id_sucursal]
        );
        if (cajaResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Esta sucursal no tiene una caja asignada.' });
        }

        let idRepartidorFinal = id_repartidor;

        if (!idRepartidorFinal) {
            const resRepartidor = await db.query(
                `SELECT id_empleado 
                 FROM empleado 
                 WHERE id_sucursal = $1 
                   AND UPPER(puesto) = 'REPARTIDOR' 
                 LIMIT 1`,
                [id_sucursal]
            );

            if (resRepartidor.rows.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `No hay personal asignado con puesto de REPARTIDOR en el centro suministrador.` 
                });
            }

            idRepartidorFinal = resRepartidor.rows[0].id_empleado;
        } else {
            const checkRepartidor = await db.query(
                `SELECT id_empleado 
                 FROM empleado 
                 WHERE id_empleado = $1 
                   AND UPPER(puesto) = 'REPARTIDOR'`,
                [idRepartidorFinal]
            );

            if (checkRepartidor.rows.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `El empleado seleccionado no cuenta con el puesto de REPARTIDOR.` 
                });
            }
        }

        if (finalNit) {
            const resultBP = await db.query(
                `SELECT id_cliente FROM cliente WHERE nit = $1`, 
                [finalNit]
            );
            if (resultBP.rows.length > 0) {
                idClienteFinal = resultBP.rows[0].id_cliente;
            }
        }

        if (!idClienteFinal) {
            const insertBP = await db.query(`
                INSERT INTO cliente (nit, nombre_completo, telefono_contacto) 
                VALUES ($1, $2, $3) 
                RETURNING id_cliente
            `, [finalNit, cliente, telefono]);
            idClienteFinal = insertBP.rows[0].id_cliente;
        }

        const insertPedidoQuery = `
            INSERT INTO pedido_entrega (
                id_cliente, id_sucursal_despacho, id_repartidor, 
                estado_pedido, metodo_pago_acordado, costo_envio, direccion_envio
            ) VALUES (
                $1, $2, $3, 
                'CARGADO EN TIENDA', $4, 25.00, $5
            ) RETURNING id_pedido
        `;
        const resultPedido = await db.query(insertPedidoQuery, [
            idClienteFinal, 
            id_sucursal,
            idRepartidorFinal, 
            metodo_pago, 
            direccion
        ]);
        const newPedidoId = resultPedido.rows[0].id_pedido;

        let numPosicion = 10;

        for (let pos of posiciones) {
            const { id_producto, cantidad } = pos;
            
            const precioMed = await db.query(`SELECT precio_unitario FROM medicamento WHERE id_medicamento = $1`, [id_producto]);
            const precioUnitario = precioMed.rows.length > 0 ? precioMed.rows[0].precio_unitario : 0;

            await db.query(`
                INSERT INTO detalle_pedido (id_pedido, posicion, id_producto, cantidad, precio_unitario)
                VALUES ($1, $2, $3, $4, $5)
            `, [newPedidoId, numPosicion, id_producto, cantidad, precioUnitario]);

            numPosicion += 10;

            let restante = parseInt(cantidad);
            const lotes = await db.query(
                `SELECT id_lote, cantidad FROM inventario_lote 
                 WHERE id_sucursal = $1 AND id_medicamento = $2 
                 AND cantidad > 0 AND estado = 'DISPONIBLE' ORDER BY id_lote ASC`,
                [id_sucursal, id_producto]
            );

            for (let lote of lotes.rows) {
                if (restante <= 0) break;
                let aDescontar = Math.min(restante, lote.cantidad);
                await db.query(
                    `UPDATE inventario_lote SET cantidad = cantidad - $1 WHERE id_lote = $2`,
                    [aDescontar, lote.id_lote]
                );
                restante -= aDescontar;
            }
        }

        try {
            const resNombreRepartidor = await db.query(
                `SELECT nombre_completo FROM empleado WHERE id_empleado = $1`,
                [idRepartidorFinal]
            );
            
            if (resNombreRepartidor.rows.length > 0) {
                const emp = resNombreRepartidor.rows[0];
                const nombreRepartidor = (emp.nombre_completo || 'Repartidor').trim();
                
                if (global.enviarNotificacionRepartidor) {
                    global.enviarNotificacionRepartidor(
                        nombreRepartidor,
                        "📦 ¡Nuevo Pedido Asignado!",
                        `Tienes asignado el pedido #${newPedidoId} para entregar en: ${direccion}.`
                    );
                }
            }
        } catch (pushErr) {
            console.error('No se pudo enviar la notificación push automática:', pushErr);
        }

        res.status(200).json({ success: true, message: `Pedido ${newPedidoId} contabilizado exitosamente.` });
    } catch (error) {
        console.error('Error al registrar pedido múltiple:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Consulta la lista de todos los pedidos que aún no han sido entregados, calculando sus totales y ordenándolos de forma descendente
const obtenerPendientes = async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id_pedido, 
                COALESCE(c.nit, 'CF') || ' - ' || c.nombre_completo as cliente,  
                p.direccion_envio as direccion, 
                s.nombre_ubicacion as sucursal_despacho, 
                p.metodo_pago_acordado, 
                (COALESCE(d.total_productos, 0) + COALESCE(p.costo_envio, 0)) as total, 
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
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error obteniendo pendientes:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Actualiza el estado de un pedido a entregado y registra el ingreso monetario correspondiente en la caja de la sucursal de despacho
const entregarPedido = async (req, res) => {
    try {
        const idPedido = req.params.id;

        const sqlInfo = `
            SELECT 
                p.id_sucursal_despacho, 
                p.metodo_pago_acordado, 
                p.costo_envio,
                c.nombre_completo,
                COALESCE(d.total_productos, 0) as total_productos
            FROM pedido_entrega p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN (
                SELECT id_pedido, SUM(cantidad * precio_unitario) as total_productos
                FROM detalle_pedido
                GROUP BY id_pedido
            ) d ON p.id_pedido = d.id_pedido
            WHERE p.id_pedido = $1
        `;
        const resultInfo = await db.query(sqlInfo, [idPedido]);

        if (resultInfo.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const pedido = resultInfo.rows[0];
        const totalVenta = (Number(pedido.total_productos) || 0) + (Number(pedido.costo_envio) || 25);
        const idSucursal = pedido.id_sucursal_despacho;
        const metodoPago = pedido.metodo_pago_acordado ? pedido.metodo_pago_acordado.toUpperCase() : 'EFECTIVO';
        const nombreCliente = pedido.nombre_completo || 'Cliente';

        await db.query(
            `UPDATE pedido_entrega SET estado_pedido = 'ENTREGADO' WHERE id_pedido = $1`,
            [idPedido]
        );

        if (idSucursal) {
            const cajaResult = await db.query(
                `SELECT id_caja FROM caja_sucursal WHERE id_sucursal = $1`,
                [idSucursal]
            );

            if (cajaResult.rows.length > 0) {
                const idCaja = cajaResult.rows[0].id_caja;
                const conceptoStr = `Venta (${metodoPago}) BP: ${nombreCliente} Doc: ${idPedido}`;

                await db.query(`
                    INSERT INTO movimiento_caja (id_caja, tipo_movimiento, monto, concepto, fecha_hora)
                    VALUES ($1, 'INGRESO', $2, $3, CURRENT_TIMESTAMP)
                `, [idCaja, totalVenta, conceptoStr]);

                await db.query(`
                    UPDATE caja_sucursal SET saldo_actual = saldo_actual + $1 WHERE id_caja = $2
                `, [totalVenta, idCaja]);
            }
        }

        res.status(200).json({ success: true, message: 'Entrega confirmada y pago registrado en caja' });
    } catch (error) {
        console.error('Error al entregar pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Cancela un pedido existente que no haya sido entregado y revierte las cantidades de productos asociadas reincorporándolas al inventario de la sucursal
const cancelarPedido = async (req, res) => {
    try {
        const idPedido = req.params.id;

        const sqlInfo = `
            SELECT id_sucursal_despacho, estado_pedido 
            FROM pedido_entrega 
            WHERE id_pedido = $1
        `;
        const resultInfo = await db.query(sqlInfo, [idPedido]);

        if (resultInfo.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const pedido = resultInfo.rows[0];
        const idSucursal = pedido.id_sucursal_despacho;
        const estadoActual = (pedido.estado_pedido || '').toUpperCase();

        if (estadoActual === 'CANCELADO') {
            return res.status(400).json({ success: false, message: 'El pedido ya se encuentra cancelado.' });
        }

        if (estadoActual === 'ENTREGADO') {
            return res.status(400).json({ success: false, message: 'No se puede cancelar un pedido que ya fue entregado.' });
        }

        const sqlDetalle = `
            SELECT id_producto, cantidad 
            FROM detalle_pedido 
            WHERE id_pedido = $1
        `;
        const resultDetalle = await db.query(sqlDetalle, [idPedido]);

        for (let det of resultDetalle.rows) {
            const idProducto = det.id_producto;
            const cantRevertir = det.cantidad;

            const checkLote = await db.query(
                `SELECT id_lote FROM inventario_lote 
                 WHERE id_sucursal = $1 
                   AND id_medicamento = $2 
                   AND estado = 'DISPONIBLE' 
                 ORDER BY id_lote DESC 
                 LIMIT 1`,
                [idSucursal, idProducto]
            );

            if (checkLote.rows.length > 0) {
                const idLote = checkLote.rows[0].id_lote;
                await db.query(
                    `UPDATE inventario_lote SET cantidad = cantidad + $1 WHERE id_lote = $2`,
                    [cantRevertir, idLote]
                );
            } else {
                await db.query(`
                    INSERT INTO inventario_lote (id_sucursal, id_medicamento, cantidad, numero_lote, fecha_vencimiento, estado)
                    VALUES ($1, $2, $3, 'RETORNO-CANCELACION', CURRENT_DATE + INTERVAL '12 months', 'DISPONIBLE')
                `, [idSucursal, idProducto, cantRevertir]);
            }
        }

        await db.query(
            `UPDATE pedido_entrega SET estado_pedido = 'CANCELADO' WHERE id_pedido = $1`,
            [idPedido]
        );

        res.status(200).json({ 
            success: true, 
            message: `Pedido #${idPedido} cancelado y stock reincorporado al inventario exitosamente.` 
        });

    } catch (error) {
        console.error('Error al cancelar pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al cancelar' });
    }
};

// Consulta el registro completo de todos los pedidos ingresados en el sistema con sus detalles de cobro y fechas, ordenados de forma descendente
const obtenerTodos = async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id_pedido, 
                COALESCE(c.nit, 'CF') || ' - ' || c.nombre_completo as cliente,  
                p.direccion_envio as direccion, 
                s.nombre_ubicacion as sucursal_despacho, 
                p.metodo_pago_acordado, 
                (COALESCE(d.total_productos, 0) + COALESCE(p.costo_envio, 0)) as total, 
                p.estado_pedido,
                p.fecha_hora_solicitud AS fecha
            FROM pedido_entrega p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN sucursal s ON p.id_sucursal_despacho = s.id_sucursal
            LEFT JOIN (
                SELECT id_pedido, SUM(cantidad * precio_unitario) as total_productos
                FROM detalle_pedido
                GROUP BY id_pedido
            ) d ON p.id_pedido = d.id_pedido
            ORDER BY p.id_pedido DESC
        `;
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error obteniendo todos los pedidos:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Genera una factura basada en un pedido completado registrando su cabecera en la tabla de ventas, copiando los detalles de productos y devolviendo la estructura completa del documento
const generarFactura = async (req, res) => {
    try {
        const id_pedido = req.params.id;
        const { usuario_emision } = req.body;

        const sqlPedido = `
            SELECT 
                p.id_pedido, 
                p.id_cliente, 
                p.id_sucursal_despacho, 
                p.id_repartidor,
                p.metodo_pago_acordado, 
                p.costo_envio,
                c.nit,
                c.nombre_completo AS cliente,
                p.direccion_envio AS direccion,
                s.nombre_ubicacion AS sucursal,
                COALESCE(d.total_productos, 0) AS total_productos
            FROM pedido_entrega p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN sucursal s ON p.id_sucursal_despacho = s.id_sucursal
            LEFT JOIN (
                SELECT id_pedido, SUM(cantidad * precio_unitario) as total_productos
                FROM detalle_pedido
                GROUP BY id_pedido
            ) d ON p.id_pedido = d.id_pedido
            WHERE p.id_pedido = $1
        `;
        const resPedido = await db.query(sqlPedido, [id_pedido]);

        if (resPedido.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }

        const ped = resPedido.rows[0];
        const totalVenta = (Number(ped.total_productos) || 0) + (Number(ped.costo_envio) || 25);
        const idSucursal = ped.id_sucursal_despacho;
        const idEmpleado = ped.id_repartidor;

        const insertVentaQuery = `
            INSERT INTO venta (
                id_sucursal, id_empleado, 
                total, metodo_pago, fecha_hora
            ) VALUES (
                $1, $2, 
                $3, $4, CURRENT_TIMESTAMP
            ) RETURNING id_venta
        `;
        const resIdVenta = await db.query(insertVentaQuery, [
            idSucursal,
            idEmpleado,
            totalVenta,
            ped.metodo_pago_acordado || 'EFECTIVO'
        ]);
        let idVentaFinal = resIdVenta.rows[0].id_venta;

        const sqlDetalles = `
            SELECT id_producto, cantidad, precio_unitario 
            FROM detalle_pedido 
            WHERE id_pedido = $1
        `;
        const resDetalles = await db.query(sqlDetalles, [id_pedido]);

        for (let det of resDetalles.rows) {
            const subtotalItem = det.cantidad * det.precio_unitario;
            await db.query(`
                INSERT INTO detalle_venta (id_venta, id_medicamento, cantidad_vendida, subtotal)
                VALUES ($1, $2, $3, $4)
            `, [
                idVentaFinal,
                det.id_producto,
                det.cantidad,
                subtotalItem
            ]);
        }

        let fechaFacturacion = new Date();

        const sqlItemsCompleto = `
            SELECT 
                d.cantidad AS cantidad, 
                d.precio_unitario AS precio_unitario, 
                m.nombre_comercial AS descripcion,
                (d.cantidad * d.precio_unitario) AS subtotal
            FROM detalle_pedido d
            JOIN medicamento m ON d.id_producto = m.id_medicamento
            WHERE d.id_pedido = $1
        `;
        const resItems = await db.query(sqlItemsCompleto, [id_pedido]);

        const productosProcesados = resItems.rows.map(item => ({
            cantidad: item.cantidad || 1,
            descripcion: item.descripcion || 'Medicamento',
            precio_unitario: item.precio_unitario || 0,
            subtotal: item.subtotal || 0
        }));

        res.status(200).json({
            success: true,
            data: {
                id_venta: idVentaFinal,
                id_pedido: ped.id_pedido,
                fecha_factura: fechaFacturacion,
                cliente_nit: ped.nit || 'CF',
                cliente_nombre: ped.cliente,
                direccion: ped.direccion,
                sucursal: ped.sucursal || 'General',
                metodo_pago: ped.metodo_pago_acordado || 'EFECTIVO',
                emisor: usuario_emision || 'Repartidor',
                total: totalVenta,
                productos: productosProcesados
            }
        });

    } catch (error) {
        console.error('Error al generar y guardar factura:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la factura en BD: ' + error.message });
    }
};

module.exports = { 
    registrarPedido, 
    obtenerPendientes, 
    obtenerTodos, 
    entregarPedido, 
    cancelarPedido, 
    buscarCliente,
    buscarMedicamento,
    buscarSucursal,
    generarFactura
};