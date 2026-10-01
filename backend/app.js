const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

// Importar rutas (Iremos descomentando conforme las creemos)
const inventoryRoutes = require('./routes/inventory.routes');
const auditRoutes = require('./routes/audit.routes'); 
const logisticRoutes = require('./routes/logistic.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes'); 
const employeeRoutes = require('./routes/employee.routes'); 
const pedidosRoutes = require('./routes/pedidos.routes');
const bpRoutes = require('./routes/bp.routes');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

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


// Ruta de estado de salud (Healthcheck) - Muy útil para los balanceadores de carga cuando pases a la nube
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'API del Sistema Farmacéutico Operativa',
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

// Inicialización del servidor y base de datos
async function startup() {
    console.log('Iniciando el sistema...');
    try {
        await db.initialize();
        
        app.listen(port, () => {
            console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Fallo al iniciar la aplicación:', error);
        process.exit(1); // Detener el proceso si la base de datos no conecta
    }
}

// Apagado elegante (Graceful shutdown)
process.on('SIGINT', async () => {
    console.log('\nCerrando conexiones y apagando el servidor...');
    try {
        await db.close(); // Liberamos el pool de conexiones de Oracle
        process.exit(0);
    } catch (error) {
        console.error('Error durante el apagado:', error);
        process.exit(1);
    }
});

startup();