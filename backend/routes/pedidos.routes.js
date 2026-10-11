const express = require('express');
const router = express.Router();
const { 
    registrarPedido, 
    obtenerPendientes, 
    entregarPedido, 
    buscarCliente, 
    buscarMedicamento, 
    buscarSucursal // <-- Importamos la nueva función
} = require('../controllers/pedidosController');

router.post('/', registrarPedido);
router.get('/pendientes', obtenerPendientes);
router.put('/:id/entregar', entregarPedido);
router.get('/cliente/:nit', buscarCliente);
router.get('/medicamento/:id', buscarMedicamento);
router.get('/sucursal/:id', buscarSucursal); // <-- Nueva ruta para el 404

module.exports = router;