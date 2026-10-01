const express = require('express');
const router = express.Router();
const { registrarPedido, obtenerPendientes, entregarPedido, buscarCliente } = require('../controllers/pedidosController');

router.post('/', registrarPedido);
router.get('/pendientes', obtenerPendientes);
router.put('/:id/entregar', entregarPedido);
// NUEVA RUTA BP
router.get('/cliente/:nit', buscarCliente);

module.exports = router;