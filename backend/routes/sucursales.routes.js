const express = require('express');
const router = express.Router();
const { 
    obtenerSucursales, 
    crearSucursal, 
    actualizarSucursal, 
    eliminarSucursal 
} = require('../controllers/sucursalController');

router.get('/', obtenerSucursales);
router.post('/', crearSucursal);
router.put('/:id', actualizarSucursal);
router.delete('/:id', eliminarSucursal);

module.exports = router;