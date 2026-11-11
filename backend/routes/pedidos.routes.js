const express = require('express');
const router = express.Router();
const { 
    registrarPedido, 
    obtenerPendientes, 
    entregarPedido, 
    buscarCliente, 
    buscarMedicamento, 
    buscarSucursal, 
    cancelarPedido,
    obtenerTodos,
    generarFactura 
} = require('../controllers/pedidosController');

router.post('/registrar', registrarPedido);
router.get('/pendientes', obtenerPendientes);
router.put('/:id/entregar', entregarPedido);
router.get('/cliente/:nit', buscarCliente);
router.get('/medicamento/:id', buscarMedicamento);
router.get('/sucursal/:id', buscarSucursal);
router.put('/:id/cancelar', cancelarPedido);
router.get('/todos', obtenerTodos);

// Ruta corregida (relativa al prefijo /api/pedidos que ya está en app.js)
router.post('/:id/generar-factura', generarFactura); 

module.exports = router;