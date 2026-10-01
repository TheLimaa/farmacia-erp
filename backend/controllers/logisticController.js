const oracledb = require('oracledb');

const getTraslados = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT 
                t.id_traslado,
                s1.nombre_ubicacion as origen,
                s2.nombre_ubicacion as destino,
                t.estado_traslado,
                t.fecha_emision
            FROM traslado_interno t
            JOIN sucursal s1 ON t.id_suc_origen = s1.id_sucursal
            JOIN sucursal s2 ON t.id_suc_destino = s2.id_sucursal
            ORDER BY t.fecha_emision DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener traslados:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    } finally {
        if (connection) await connection.close();
    }
};

const createTraslado = async (req, res) => {
    let connection;
    try {
        const { id_suc_origen, id_suc_destino } = req.body;
        connection = await oracledb.getConnection();
        
        const sql = `
            INSERT INTO traslado_interno (id_traslado, id_suc_origen, id_suc_destino, estado_traslado)
            VALUES ((SELECT NVL(MAX(id_traslado),0)+1 FROM traslado_interno), :id_suc_origen, :id_suc_destino, 'EN_CAMINO')
        `;
        await connection.execute(sql, [id_suc_origen, id_suc_destino], { autoCommit: true });
        
        res.status(201).json({ success: true, message: 'Traslado registrado exitosamente' });
    } catch (error) {
        console.error('Error al crear traslado:', error);
        res.status(500).json({ success: false, message: 'Error al registrar traslado' });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { getTraslados, createTraslado };