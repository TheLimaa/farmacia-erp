const db = require('../config/db'); // Importa tu conexión a PostgreSQL
const bcrypt = require('bcryptjs'); // O 'bcrypt' según tu package.json

// GET: Listar usuarios con los datos del empleado asociado
const obtenerUsuarios = async (req, res) => {
    try {
        const sql = `
            SELECT u.id_usuario, 
                   u.nombre_usuario AS username, 
                   u.rol, 
                   'ACTIVO' AS estado,
                   u.id_empleado, 
                   e.nombre_completo, 
                   e.puesto, 
                   s.nombre_ubicacion AS sucursal
            FROM usuario_sistema u
            LEFT JOIN empleado e ON u.id_empleado = e.id_empleado
            LEFT JOIN sucursal s ON e.id_sucursal = s.id_sucursal
            ORDER BY u.id_usuario ASC
        `;
        const result = await db.query(sql);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET: Buscar datos de un empleado por ID para autodetectar puesto/rol
const obtenerEmpleadoParaUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const sql = `
            SELECT e.id_empleado, e.nombre_completo, e.puesto, s.nombre_ubicacion AS sucursal
            FROM empleado e
            LEFT JOIN sucursal s ON e.id_sucursal = s.id_sucursal
            WHERE e.id_empleado = $1
        `;
        const result = await db.query(sql, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }

        const emp = result.rows[0];
        // En PostgreSQL los campos devueltos vienen en minúsculas por defecto
        const puestoUpper = (emp.puesto || '').toUpperCase();
        
        let rolSugerido = 'OPERADOR';
        if (puestoUpper.includes('ADMINISTRADOR') || puestoUpper === 'ADMINISTRADOR') {
            rolSugerido = 'ADMINISTRADOR';
        }

        res.status(200).json({ 
            success: true, 
            data: { ...emp, rolSugerido } 
        });
    } catch (error) {
        console.error('Error buscando empleado:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// POST: Crear nuevo Usuario de Sistema con Encriptación BCrypt
const crearUsuario = async (req, res) => {
    try {
        const { id_empleado, username, password, rol } = req.body;

        if (!id_empleado) {
            return res.status(400).json({ success: false, message: 'Debe asociar un empleado válido.' });
        }

        // 1. Validar si el nombre de usuario ya existe (usando LOWER para búsqueda insensible a mayúsculas)
        const checkUser = await db.query(
            `SELECT id_usuario FROM usuario_sistema WHERE LOWER(nombre_usuario) = LOWER($1)`,
            [username]
        );
        
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está en uso.' });
        }

        // 2. ENCRIPTAR LA CONTRASEÑA CON BCRYPT
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Insertar el Hash en la base de datos (id_usuario es SERIAL, se omite del INSERT)
        const sql = `
            INSERT INTO usuario_sistema (id_empleado, nombre_usuario, password_hash, rol)
            VALUES ($1, $2, $3, $4)
        `;
        
        await db.query(sql, [
            id_empleado,
            username,
            passwordHash,
            rol
        ]);

        res.status(201).json({ success: true, message: `Usuario "${username}" creado exitosamente.` });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ success: false, message: 'Error al registrar el usuario' });
    }
};

// DELETE: Eliminar únicamente la cuenta de usuario
const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(`DELETE FROM usuario_sistema WHERE id_usuario = $1`, [id]);
        res.status(200).json({ success: true, message: 'Cuenta de usuario eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
};

module.exports = {
    obtenerUsuarios,
    obtenerEmpleadoParaUsuario,
    crearUsuario,
    eliminarUsuario
};