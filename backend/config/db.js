const { Pool } = require('pg');
require('dotenv').config();

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

// Establece una conexión de prueba con la base de datos PostgreSQL al iniciar el servidor y libera el cliente
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

// Cierra todas las conexiones activas del pool de PostgreSQL al apagar el servidor de forma segura
async function close() {
    await pool.end();
    console.log('Pool de conexiones de PostgreSQL cerrado.');
}

// Ejecuta consultas SQL directamente en la base de datos recibiendo el texto de la sentencia y sus parámetros opcionales
async function query(text, params) {
    return await pool.query(text, params);
}

module.exports = { 
    initialize, 
    close, 
    query,
    pool 
};