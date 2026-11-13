const db = require('../config/db');

// Consulta la disponibilidad de stock de un medicamento específico en todas las sucursales para el centro de llamadas, ordenando los resultados de mayor a menor cantidad disponible
const checkStockForCallCenter = async (req, res) => {
    try {
        const { id_medicamento } = req.params;
        const sql = `
            SELECT s.id_sucursal, s.nombre_ubicacion, s.tipo_ubicacion, m.nombre_comercial, m.precio_unitario, SUM(i.cantidad) as total_disponible
            FROM sucursal s
            JOIN inventario_lote i ON s.id_sucursal = i.id_sucursal
            JOIN medicamento m ON i.id_medicamento = m.id_medicamento
            WHERE i.id_medicamento = $1 
              AND i.cantidad > 0 
              AND i.estado = 'DISPONIBLE'
            GROUP BY s.id_sucursal, s.nombre_ubicacion, s.tipo_ubicacion, m.nombre_comercial, m.precio_unitario
            ORDER BY total_disponible DESC
        `;
        const result = await db.query(sql, [id_medicamento]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { 
        console.error('Error al chequear stock para call center:', error);
        res.status(500).json({ success: false, message: 'Error interno' }); 
    }
};

// Consulta el inventario general disponible de medicamentos por sucursal con filtros opcionales de ubicación y producto
const getInventarioGeneral = async (req, res) => {
    try {
        const { id_sucursal, id_medicamento } = req.query;
        let sql = `
            SELECT s.id_sucursal, s.nombre_ubicacion AS sucursal, m.id_medicamento, m.nombre_comercial AS medicamento, SUM(i.cantidad) AS total_cajas
            FROM sucursal s
            JOIN inventario_lote i ON s.id_sucursal = i.id_sucursal
            JOIN medicamento m ON i.id_medicamento = m.id_medicamento
            WHERE i.cantidad > 0 AND i.estado = 'DISPONIBLE'
        `;
        
        const params = [];
        let paramIndex = 1;

        if (id_sucursal) { 
            sql += ` AND s.id_sucursal = $${paramIndex++}`; 
            params.push(id_sucursal); 
        }
        if (id_medicamento) { 
            sql += ` AND m.id_medicamento = $${paramIndex++}`; 
            params.push(id_medicamento); 
        }
        
        sql += ` GROUP BY s.id_sucursal, s.nombre_ubicacion, m.id_medicamento, m.nombre_comercial ORDER BY s.id_sucursal, m.id_medicamento`;
        
        const result = await db.query(sql, params);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { 
        console.error('Error en inventario general:', error);
        res.status(500).json({ success: false, message: 'Error interno' }); 
    }
};

// Registra uno o varios medicamentos nuevos en el catálogo del sistema
const crearMedicamento = async (req, res) => {
    try {
        const { productos, nombre, descripcion, precio, requiere_receta } = req.body;

        const listaProds = Array.isArray(productos) && productos.length > 0 
            ? productos 
            : [{ nombre, descripcion, precio, requiere_receta }];

        for (const prod of listaProds) {
            if (!prod.nombre || !prod.precio) continue;
            
            const sql = `
                INSERT INTO medicamento (nombre_comercial, descripcion, precio_unitario, requiere_receta) 
                VALUES ($1, $2, $3, $4)
            `;
            await db.query(sql, [
                prod.nombre,
                prod.descripcion || '',
                parseFloat(prod.precio),
                prod.requiere_receta || 'NO'
            ]);
        }

        res.status(201).json({ success: true, message: `Se registraron ${listaProds.length} material(es) en el catálogo.` });
    } catch (error) { 
        console.error('Error al crear medicamento(s):', error); 
        res.status(500).json({ success: false, message: 'Error registrando materiales.' }); 
    }
};

// Consulta la lista completa de medicamentos registrados en el catálogo ordenados por su identificador
const getMedicamentos = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM medicamento ORDER BY id_medicamento ASC`);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { 
        console.error('Error al obtener catálogo:', error);
        res.status(500).json({ success: false, message: 'Error interno' }); 
    }
};

// Registra la entrada de stock en tránsito (lotes) para una sucursal, permitiendo procesar una o múltiples posiciones simultáneamente
const ingresarStock = async (req, res) => {
    try {
        const { id_sucursal, posiciones, id_producto, cantidad, numero_lote, fecha_vencimiento } = req.body;

        const listaPosiciones = Array.isArray(posiciones) && posiciones.length > 0
            ? posiciones
            : [{ id_producto, cantidad, numero_lote, fecha_vencimiento }];

        const targetSucursal = id_sucursal || (listaPosiciones[0] && listaPosiciones[0].id_sucursal);

        if (!targetSucursal) {
            return res.status(400).json({ success: false, message: 'La sucursal destino es obligatoria.' });
        }

        for (const pos of listaPosiciones) {
            const sucTarget = pos.id_sucursal || targetSucursal;
            if (!pos.id_producto || !pos.cantidad || !pos.numero_lote || !pos.fecha_vencimiento) continue;

            const sql = `
                INSERT INTO inventario_lote (id_sucursal, id_medicamento, cantidad, numero_lote, fecha_vencimiento, estado)
                VALUES ($1, $2, $3, $4, $5, 'EN_TRANSITO')
            `;
            await db.query(sql, [
                sucTarget,
                pos.id_producto,
                parseInt(pos.cantidad),
                pos.numero_lote,
                pos.fecha_vencimiento
            ]);
        }

        res.status(201).json({ 
            success: true, 
            message: `Documento de entrada contabilizado exitosamente con ${listaPosiciones.length} posición(es) en tránsito.` 
        });
    } catch (error) { 
        console.error('Error al ingresar stock en posiciones:', error); 
        res.status(500).json({ success: false, message: 'Error procesando documento de entrada.' }); 
    }
};

// Consulta los lotes de inventario que se encuentran actualmente en estado de tránsito con filtros opcionales de sucursal y producto
const getStockEnTransito = async (req, res) => {
    try {
        const { id_sucursal, id_medicamento } = req.query;
        let sql = `
            SELECT i.id_lote, s.id_sucursal, s.nombre_ubicacion AS sucursal, m.id_medicamento, m.nombre_comercial AS medicamento, i.numero_lote, i.cantidad
            FROM inventario_lote i
            JOIN sucursal s ON i.id_sucursal = s.id_sucursal
            JOIN medicamento m ON i.id_medicamento = m.id_medicamento
            WHERE i.estado = 'EN_TRANSITO'
        `;
        
        const params = [];
        let paramIndex = 1;

        if (id_sucursal) { 
            sql += ` AND s.id_sucursal = $${paramIndex++}`; 
            params.push(id_sucursal); 
        }
        if (id_medicamento) { 
            sql += ` AND m.id_medicamento = $${paramIndex++}`; 
            params.push(id_medicamento); 
        }
        
        sql += ` ORDER BY s.id_sucursal, m.id_medicamento`;
        
        const result = await db.query(sql, params);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { 
        console.error('Error al obtener stock en tránsito:', error);
        res.status(500).json({ success: false, message: 'Error interno' }); 
    }
};

// Actualiza el estado de un lote en tránsito a disponible para confirmar la recepción de la mercancía en la sucursal
const recibirStock = async (req, res) => {
    try {
        const { id_lote } = req.body;
        const sql = `UPDATE inventario_lote SET estado = 'DISPONIBLE' WHERE id_lote = $1`;
        await db.query(sql, [id_lote]);
        res.status(200).json({ success: true, message: 'Recepción contabilizada. Stock disponible en sucursal.' });
    } catch (error) { 
        console.error('Error al recibir stock:', error);
        res.status(500).json({ success: false, message: 'Error interno' }); 
    }
};

module.exports = { 
    checkStockForCallCenter, 
    crearMedicamento, 
    ingresarStock, 
    getMedicamentos, 
    getInventarioGeneral, 
    getStockEnTransito, 
    recibirStock 
};