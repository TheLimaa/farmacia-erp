const oracledb = require('oracledb');
require('dotenv').config();

async function initialize() {
  try {
    // Configuración del pool de conexiones
    await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 2
    });
    console.log('✅ Pool de conexiones a Oracle DB inicializado exitosamente.');
  } catch (err) {
    console.error('❌ Error al inicializar el pool de base de datos:', err);
    process.exit(1);
  }
}

// Opcional: Función para cerrar el pool al apagar el servidor
async function close() {
  await oracledb.getPool().close(0);
}

module.exports = { initialize, close };