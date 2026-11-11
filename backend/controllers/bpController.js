const db = require('../config/db'); // Importa tu conexión a PostgreSQL

const obtenerBPs = async (req, res) => {
    try {
        const { q } = req.query;
        
        let sql = `SELECT id_cliente, nit, nombre_completo, telefono_contacto FROM cliente`;
        let params = [];
        
        if (q) {
            // En PostgreSQL usamos ILIKE para hacer búsqueda insensible a mayúsculas/minúsculas de forma más limpia,
            // o LOWER() con parámetros posicionales ($1)
            sql += ` WHERE LOWER(nit) LIKE $1 OR LOWER(nombre_completo) LIKE $1`;
            params = [`%${q.toLowerCase()}%`];
        }
        
        sql += ` ORDER BY id_cliente DESC`;
        
        const result = await db.query(sql, params);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener BPs:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const crearBP = async (req, res) => {
    try {
        const { nit, nombre_completo, telefono_contacto } = req.body;
        
        const sql = `
            INSERT INTO cliente (nit, nombre_completo, telefono_contacto) 
            VALUES ($1, $2, $3)
        `;
        
        await db.query(sql, [nit, nombre_completo, telefono_contacto]);
        res.status(200).json({ success: true, message: 'Interlocutor Comercial (BP) creado exitosamente.' });
    } catch (error) {
        console.error('Error al crear BP:', error);
        
        // En PostgreSQL, el código '23505' corresponde a violación de restricción única (Unique Violation / NIT duplicado)
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'El NIT ingresado ya está registrado.' });
        }
        
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = { obtenerBPs, crearBP };