const { Pool } = require('pg');
require('dotenv').config();

// Si existe DATABASE_URL (en Render), la usamos. Si no, armamos el objeto con variables individuales (en local).
const connectionConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

const pool = new Pool(connectionConfig);

// Función para probar e inicializar la conexión al arrancar el servidor
async function initialize() {
    try {
        const client = await pool.connect();
        console.log('¡Conexión exitosa al pool de PostgreSQL (Supabase)!');
        client.release();
    } catch (err) {
        console.error('Error al conectar con la base de datos PostgreSQL:', err);
        process.exit(1);
    }
}

// Función para cerrar el pool de conexiones al apagar el servidor (Graceful shutdown)
async function close() {
    await pool.end();
    console.log('Pool de conexiones de PostgreSQL cerrado.');
}

// Función auxiliar para ejecutar consultas directas desde los controladores
async function query(text, params) {
    return await pool.query(text, params);
}

module.exports = { 
    initialize, 
    close, 
    query,
    pool 
};