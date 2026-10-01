const oracledb = require('oracledb');

const obtenerBPs = async (req, res) => {
    let connection;
    try {
        const { q } = req.query;
        connection = await oracledb.getConnection();
        
        let sql = `SELECT id_cliente, nit, nombre_completo, telefono_contacto FROM cliente`;
        let binds = [];
        
        if (q) {
            sql += ` WHERE LOWER(nit) LIKE :q OR LOWER(nombre_completo) LIKE :q`;
            binds = { q: `%${q.toLowerCase()}%` };
        }
        
        sql += ` ORDER BY id_cliente DESC`;
        
        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener BPs:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.close();
    }
};

const crearBP = async (req, res) => {
    let connection;
    try {
        const { nit, nombre_completo, telefono_contacto } = req.body;
        connection = await oracledb.getConnection();
        
        const sql = `
            INSERT INTO cliente (nit, nombre_completo, telefono_contacto) 
            VALUES (:nit, :nombre_completo, :telefono_contacto)
        `;
        
        await connection.execute(sql, [nit, nombre_completo, telefono_contacto], { autoCommit: true });
        res.status(200).json({ success: true, message: 'Interlocutor Comercial (BP) creado exitosamente.' });
    } catch (error) {
        console.error('Error al crear BP:', error);
        // Error 1 (Unique Constraint) si el NIT ya existe
        if (error.errorNum === 1) {
            return res.status(400).json({ success: false, message: 'El NIT ingresado ya está registrado.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { obtenerBPs, crearBP };