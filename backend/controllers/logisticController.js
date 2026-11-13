const db = require('../config/db');

// Consulta la lista detallada de traslados internos entre sucursales indicando el origen, destino, estado y fecha de emisión, ordenados de forma descendente
const getTraslados = async (req, res) => {
    try {
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
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener traslados:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Registra un nuevo traslado interno especificando las sucursales de origen y destino con un estado inicial en camino
const createTraslado = async (req, res) => {
    try {
        const { id_suc_origen, id_suc_destino } = req.body;
        
        const sql = `
            INSERT INTO traslado_interno (id_suc_origen, id_suc_destino, estado_traslado)
            VALUES ($1, $2, 'EN_CAMINO')
        `;
        await db.query(sql, [id_suc_origen, id_suc_destino]);
        
        res.status(201).json({ success: true, message: 'Traslado registrado exitosamente' });
    } catch (error) {
        console.error('Error al crear traslado:', error);
        res.status(500).json({ success: false, message: 'Error al registrar traslado' });
    }
};

module.exports = { getTraslados, createTraslado };