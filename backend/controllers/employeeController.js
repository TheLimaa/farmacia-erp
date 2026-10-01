const oracledb = require('oracledb');

const getEmpleados = async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `SELECT * FROM empleado ORDER BY id_empleado DESC`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al obtener empleados' });
    } finally {
        if (connection) await connection.close();
    }
};

const crearEmpleado = async (req, res) => {
    let connection;
    try {
        const { id_sucursal, nombre_completo, puesto, salario_base } = req.body;
        connection = await oracledb.getConnection();
        
        const sql = `
            INSERT INTO empleado (id_empleado, id_sucursal, nombre_completo, puesto, salario_base, fecha_contratacion)
            VALUES ((SELECT NVL(MAX(id_empleado),0)+1 FROM empleado), :id_sucursal, :nombre, :puesto, :salario, SYSDATE)
        `;
        
        await connection.execute(sql, [id_sucursal, nombre_completo, puesto, salario_base], { autoCommit: true });
        res.status(201).json({ success: true, message: 'Empleado registrado exitosamente' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error al crear el empleado' });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { getEmpleados, crearEmpleado };