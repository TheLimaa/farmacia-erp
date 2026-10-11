const express = require('express');
const router = express.Router();
const { obtenerActivos, registrarActivo, actualizarEstadoActivo } = require('../controllers/activosController');

router.get('/', obtenerActivos);
router.post('/', registrarActivo);
router.put('/:id/estado', actualizarEstadoActivo);

module.exports = router;