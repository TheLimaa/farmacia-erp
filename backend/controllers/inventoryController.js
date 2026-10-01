const oracledb = require('oracledb');

// 1. Call Center (Consolidado sin restricción de fechas para igualar al MB52)
const checkStockForCallCenter = async (req, res) => {
    let connection;
    try {
        const { id_medicamento } = req.params;
        connection = await oracledb.getConnection();
        const sql = `
            SELECT s.id_sucursal, s.nombre_ubicacion, s.tipo_ubicacion, m.nombre_comercial, m.precio_unitario, SUM(i.cantidad) as total_disponible
            FROM sucursal s
            JOIN inventario_lote i ON s.id_sucursal = i.id_sucursal
            JOIN medicamento m ON i.id_medicamento = m.id_medicamento
            WHERE i.id_medicamento = :id_medicamento 
              AND i.cantidad > 0 
              AND i.estado = 'DISPONIBLE'
            GROUP BY s.id_sucursal, s.nombre_ubicacion, s.tipo_ubicacion, m.nombre_comercial, m.precio_unitario
            ORDER BY total_disponible DESC
        `;
        const result = await connection.execute(sql, [id_medicamento], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); } finally { if (connection) await connection.close(); }
};

// 2. Inventario General MB52
const getInventarioGeneral = async (req, res) => {
    let connection;
    try {
        const { id_sucursal, id_medicamento } = req.query;
        connection = await oracledb.getConnection();
        let sql = `
            SELECT s.id_sucursal, s.nombre_ubicacion AS sucursal, m.id_medicamento, m.nombre_comercial AS medicamento, SUM(i.cantidad) AS total_cajas
            FROM sucursal s
            JOIN inventario_lote i ON s.id_sucursal = i.id_sucursal
            JOIN medicamento m ON i.id_medicamento = m.id_medicamento
            WHERE i.cantidad > 0 AND i.estado = 'DISPONIBLE'
        `;
        const binds = {};
        if (id_sucursal) { sql += ` AND s.id_sucursal = :id_sucursal`; binds.id_sucursal = id_sucursal; }
        if (id_medicamento) { sql += ` AND m.id_medicamento = :id_medicamento`; binds.id_medicamento = id_medicamento; }
        sql += ` GROUP BY s.id_sucursal, s.nombre_ubicacion, m.id_medicamento, m.nombre_comercial ORDER BY s.id_sucursal, m.id_medicamento`;
        
        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { if (connection) await connection.close(); }
};

// 3. Crear Medicamento
const crearMedicamento = async (req, res) => {
    let connection;
    try {
        const { nombre, descripcion, precio, requiere_receta } = req.body;
        connection = await oracledb.getConnection();
        const sql = `INSERT INTO medicamento (id_medicamento, nombre_comercial, descripcion, precio_unitario, requiere_receta) VALUES ((SELECT NVL(MAX(id_medicamento),0)+1 FROM medicamento), :nombre, :descripcion, :precio, :requiere_receta)`;
        await connection.execute(sql, [nombre, descripcion, precio, requiere_receta], { autoCommit: true });
        res.status(201).json({ success: true, message: 'Material registrado.' });
    } catch (error) { res.status(500).json({ success: false }); } finally { if (connection) await connection.close(); }
};

// 4. Obtener Catálogo
const getMedicamentos = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(`SELECT * FROM medicamento ORDER BY id_medicamento ASC`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { if (connection) await connection.close(); }
};

// 5. Trasladar Stock (Entra como EN_TRANSITO)
const ingresarStock = async (req, res) => {
    let connection;
    try {
        const { id_sucursal, id_producto, cantidad, numero_lote, fecha_vencimiento } = req.body;
        connection = await oracledb.getConnection();
        const sql = `
            INSERT INTO inventario_lote (id_lote, id_sucursal, id_medicamento, cantidad, numero_lote, fecha_vencimiento, estado)
            VALUES ((SELECT NVL(MAX(id_lote),0)+1 FROM inventario_lote), :id_sucursal, :id_producto, :cantidad, :numero_lote, TO_DATE(:fecha_vencimiento, 'YYYY-MM-DD'), 'EN_TRANSITO')
        `;
        await connection.execute(sql, [id_sucursal, id_producto, cantidad, numero_lote, fecha_vencimiento], { autoCommit: true });
        res.status(201).json({ success: true, message: 'Mercancía en tránsito hacia la sucursal.' });
    } catch (error) { console.error(error); res.status(500).json({ success: false }); } finally { if (connection) await connection.close(); }
};

// 6. MB5T - Ver Stock en Tránsito
const getStockEnTransito = async (req, res) => {
    let connection;
    try {
        const { id_sucursal, id_medicamento } = req.query;
        connection = await oracledb.getConnection();
        let sql = `
            SELECT i.id_lote, s.id_sucursal, s.nombre_ubicacion AS sucursal, m.id_medicamento, m.nombre_comercial AS medicamento, i.numero_lote, i.cantidad
            FROM inventario_lote i
            JOIN sucursal s ON i.id_sucursal = s.id_sucursal
            JOIN medicamento m ON i.id_medicamento = m.id_medicamento
            WHERE i.estado = 'EN_TRANSITO'
        `;
        const binds = {};
        if (id_sucursal) { sql += ` AND s.id_sucursal = :id_sucursal`; binds.id_sucursal = id_sucursal; }
        if (id_medicamento) { sql += ` AND m.id_medicamento = :id_medicamento`; binds.id_medicamento = id_medicamento; }
        sql += ` ORDER BY s.id_sucursal, m.id_medicamento`;
        
        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { if (connection) await connection.close(); }
};

// 7. MIGO - Recibir Mercancía (Cambia a DISPONIBLE)
const recibirStock = async (req, res) => {
    let connection;
    try {
        const { id_lote } = req.body;
        connection = await oracledb.getConnection();
        const sql = `UPDATE inventario_lote SET estado = 'DISPONIBLE' WHERE id_lote = :id_lote`;
        await connection.execute(sql, [id_lote], { autoCommit: true });
        res.status(200).json({ success: true, message: 'Recepción contabilizada. Stock disponible en sucursal.' });
    } catch (error) { res.status(500).json({ success: false }); } finally { if (connection) await connection.close(); }
};

module.exports = { 
    checkStockForCallCenter, 
    crearMedicamento, ingresarStock, 
    getMedicamentos, 
    getInventarioGeneral, 
    getStockEnTransito, 
    recibirStock };