const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Autentica las credenciales de un usuario buscando su nombre en la base de datos, verificando la contraseña con hash y generando un token JWT si el acceso es válido
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const sql = `SELECT * FROM usuario_sistema WHERE nombre_usuario = $1`;
        const result = await db.query(sql, [username]);
        
        if (result.rows.length === 0) {
            console.log("❌ Usuario no encontrado en la BD:", username);
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        console.log("✅ Usuario encontrado:", user.nombre_usuario);
        console.log("🔑 Hash en BD:", user.password_hash);

        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log("🔍 ¿La contraseña coincide?:", isMatch);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id_usuario, rol: user.rol, empleadoId: user.id_empleado }, 
            process.env.JWT_SECRET || 'farmacia_super_secreta_2026', 
            { expiresIn: '8h' }
        );

        // Se incluye requiere_cambio_password en la respuesta para que el frontend sepa si debe bloquear o redirigir
        res.status(200).json({ 
            success: true, 
            token, 
            requiere_cambio_password: user.requiere_cambio_password, // <-- NUEVO
            usuario: { 
                id_usuario: user.id_usuario, // <-- Útil para mandarlo al endpoint de cambio de clave
                nombre: user.nombre_usuario, 
                rol: user.rol 
            } 
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Encripta la contraseña de un nuevo usuario con bcrypt y registra sus credenciales junto con su rol en la base de datos
const register = async (req, res) => {
    try {
        const { id_empleado, username, password, rol } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Se añade requiere_cambio_password explícitamente en TRUE para nuevos registros
        const sql = `
            INSERT INTO usuario_sistema (id_empleado, nombre_usuario, password_hash, rol, requiere_cambio_password, ultimo_acceso)
            VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
        `;
        
        await db.query(sql, [id_empleado, username, hashedPassword, rol]);

        res.status(201).json({ success: true, message: 'Usuario registrado y encriptado correctamente' });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al crear el usuario en la base de datos' });
    }
};

module.exports = { login, register };