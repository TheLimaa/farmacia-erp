const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool de conexiones para PostgreSQL / Supabase
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false // Obligatorio para conexiones seguras a la nube (Supabase)
    },
    max: 10,       // Máximo de conexiones en el pool
    min: 2,        // Mínimo de conexiones inactivas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

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