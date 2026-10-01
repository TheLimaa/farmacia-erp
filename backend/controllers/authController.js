const oracledb = require('oracledb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
    let connection;
    try {
        const { username, password } = req.body;
        connection = await oracledb.getConnection();
        
        // Buscar el usuario en la base de datos
        const sql = `SELECT * FROM usuario_sistema WHERE nombre_usuario = :username`;
        const result = await connection.execute(sql, [username], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        
        // Comparar la contraseña ingresada con el hash en Oracle
        const isMatch = await bcrypt.compare(password, user.PASSWORD_HASH);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        // Generar Token JWT (Firma electrónica del usuario)
        const token = jwt.sign(
            { id: user.ID_USUARIO, rol: user.ROL, empleadoId: user.ID_EMPLEADO }, 
            process.env.JWT_SECRET || 'farmacia_super_secreta_2026', 
            { expiresIn: '8h' }
        );

        res.status(200).json({ 
            success: true, 
            token, 
            usuario: { nombre: user.NOMBRE_USUARIO, rol: user.ROL } 
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.close();
    }
};

const register = async (req, res) => {
    let connection;
    try {
        const { id_empleado, username, password, rol } = req.body;
        connection = await oracledb.getConnection();

        // 1. Encriptar la contraseña de forma segura
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Insertar el usuario en la base de datos con ID autoincremental
        const sql = `
            INSERT INTO usuario_sistema (id_usuario, id_empleado, nombre_usuario, password_hash, rol, ultimo_acceso)
            VALUES ((SELECT NVL(MAX(id_usuario),0)+1 FROM usuario_sistema), :id_empleado, :username, :password_hash, :rol, SYSDATE)
        `;
        
        await connection.execute(sql, [id_empleado, username, hashedPassword, rol], { autoCommit: true });

        res.status(201).json({ success: true, message: 'Usuario registrado y encriptado correctamente' });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al crear el usuario en la base de datos' });
    } finally {
        if (connection) await connection.close();
    }
};


module.exports = { login, register };

