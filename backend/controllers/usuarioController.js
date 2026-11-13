const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Consulta la lista completa de usuarios del sistema junto con los datos del empleado asociado y su sucursal, ordenados de forma ascendente por identificador
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

// Consulta la información detallada de un empleado por su identificador para autodetectar sus datos y sugerir un rol en el sistema basado en su puesto
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

// Registra un nuevo usuario del sistema asociándolo a un empleado válido, validando que el nombre de usuario no esté en uso y encriptando su contraseña con bcrypt
const crearUsuario = async (req, res) => {
    try {
        const { id_empleado, username, password, rol } = req.body;

        if (!id_empleado) {
            return res.status(400).json({ success: false, message: 'Debe asociar un empleado válido.' });
        }

        const checkUser = await db.query(
            `SELECT id_usuario FROM usuario_sistema WHERE LOWER(nombre_usuario) = LOWER($1)`,
            [username]
        );
        
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está en uso.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Se incluye requiere_cambio_password = true por defecto para nuevos usuarios
        const sql = `
            INSERT INTO usuario_sistema (id_empleado, nombre_usuario, password_hash, rol, requiere_cambio_password)
            VALUES ($1, $2, $3, $4, TRUE)
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

// Actualiza/cambia la contraseña de un usuario, la encripta con bcrypt y DESACTIVA el cambio obligatorio de contraseña
const actualizarPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'La nueva contraseña es obligatoria.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Actualiza el hash y cambia la bandera a FALSE para que no vuelva a pedir cambio obligatorio
        const sql = `
            UPDATE usuario_sistema 
            SET password_hash = $1, requiere_cambio_password = FALSE 
            WHERE id_usuario = $2
        `;
        
        const result = await db.query(sql, [passwordHash, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la contraseña:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar la contraseña' });
    }
};

// Elimina únicamente la cuenta de acceso de un usuario del sistema utilizando su identificador
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
    actualizarPassword,
    eliminarUsuario
};