const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db'); // Debe exportar tu pool de PostgreSQL
const webpush = require('web-push');

// Configuración directa y obligatoria de las llaves VAPID
const publicVapidKey = 'BFv8hAWs38mYSb5pLSQAKR4X43c1ZJnzhYTDOLxyg9D13YqRp4eTvqmBS_S_x02hmNj_xtzoVFRDCfmuGhNL_4c';
const privateVapidKey = '8xJ8dAV2idpylHqcxup_qDp2D6-uO4IyfBvbeXCgIL8';

webpush.setVapidDetails(
    'mailto:admin@farmaciasvitta.com',
    publicVapidKey,
    privateVapidKey
);

// Almacén temporal de suscripciones de repartidores
const suscripcionesRepartidores = new Map();

// Importar rutas 
const inventoryRoutes = require('./routes/inventory.routes');
const auditRoutes = require('./routes/audit.routes'); 
const logisticRoutes = require('./routes/logistic.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes'); 
const employeeRoutes = require('./routes/employee.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const bpRoutes = require('./routes/bp.routes');
const activosRoutes = require('./routes/activos.routes');
const sucursalesRoutes = require('./routes/sucursales.routes');
const usuarioRoutes = require('./routes/usuario.routes');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// ==========================================
// RUTA DE SUSCRIPCIÓN PUSH PARA REPARTIDORES
// ==========================================
app.post('/api/notificaciones/suscribir', async (req, res) => {
    const { usuario, subscription } = req.body;
    
    if (!usuario || !subscription) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para la suscripción' });
    }

    const keyLimpia = usuario.trim();
    
    // 1. Guardamos con el nombre de usuario directo
    suscripcionesRepartidores.set(keyLimpia, subscription);
    suscripcionesRepartidores.set(keyLimpia.toUpperCase(), subscription);

    // 2. Cruzamos con las tablas de PostgreSQL para registrar también el nombre_completo real del empleado
    try {
        const sqlCruze = `
            SELECT e.nombre_completo 
            FROM usuario_sistema u
            JOIN empleado e ON u.id_empleado = e.id_empleado
            WHERE UPPER(u.nombre_usuario) = UPPER($1)
        `;
        
        // Asumiendo que tu módulo 'db' expone una función query(text, params)
        const result = await db.query(sqlCruze, [keyLimpia]);
        
        if (result.rows.length > 0) {
            // PostgreSQL devuelve los nombres de columnas en minúsculas por defecto
            const nombreReal = (result.rows[0].nombre_completo || '').trim();
            
            // Guardamos también el nombre real en el mapa
            suscripcionesRepartidores.set(nombreReal, subscription);
            suscripcionesRepartidores.set(nombreReal.toUpperCase(), subscription);
            
            console.log(`Suscripción vinculada para usuario "${keyLimpia}" y mapeada al empleado oficial: "${nombreReal}"`);
        } else {
            console.log(`Repartidor "${keyLimpia}" suscrito (sin cruce de empleado encontrado).`);
        }
    } catch (dbErr) {
        console.error('Error al cruzar usuario con empleado para notificaciones:', dbErr.message);
    }

    res.status(201).json({ success: true, message: 'Suscripción push registrada con éxito' });
});

// Función exportable o utilizable para disparar notificaciones cuando caiga un pedido
global.enviarNotificacionRepartidor = (nombreRepartidor, titulo, cuerpo) => {
    const sub = suscripcionesRepartidores.get(nombreRepartidor) || suscripcionesRepartidores.get(nombreRepartidor?.toUpperCase());
    if (sub) {
        const payload = JSON.stringify({ title: titulo, body: cuerpo });
        webpush.sendNotification(sub, payload).catch(err => {
            console.error('Error al enviar push notification:', err);
        });
    } else {
        console.log(`No se encontró suscripción activa en memoria para: "${nombreRepartidor}"`);
    }
};

// Rutas de la API
app.use('/api/inventario', inventoryRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/logistic', logisticRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/empleados', employeeRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/bp', bpRoutes);
app.use('/api/activos', activosRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/usuarios', usuarioRoutes);

// Ruta de estado de salud (Healthcheck)
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'API del Sistema Farmacéutico Operativa (Supabase)',
        timestamp: new Date().toISOString()
    });
});

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Manejo global de errores (500)
app.use((err, req, res, next) => {
    console.error('Error en el servidor:', err.stack);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// Inicialización del servidor
async function startup() {
    console.log('Iniciando el sistema...');
    try {
        // Opcional: si tu config/db.js exporta una función initialize o un test de conexión rápido
        if (typeof db.initialize === 'function') {
            await db.initialize();
        }
        
        app.listen(port, () => {
            console.log(`Backend corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Fallo al iniciar la aplicación:', error);
        process.exit(1);
    }
}

// Apagado elegante (Graceful shutdown)
process.on('SIGINT', async () => {
    console.log('\nCerrando conexiones y apagando el servidor...');
    try {
        if (typeof db.close === 'function') {
            await db.close();
        }
        process.exit(0);
    } catch (error) {
        console.error('Error durante el apagado:', error);
        process.exit(1);
    }
});

startup();