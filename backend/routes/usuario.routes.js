const express = require('express');
const router = express.Router();
const { 
    obtenerUsuarios, 
    obtenerEmpleadoParaUsuario, 
    crearUsuario, 
    eliminarUsuario 
} = require('../controllers/usuarioController');

router.get('/', obtenerUsuarios);
router.get('/empleado/:id', obtenerEmpleadoParaUsuario);
router.post('/', crearUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;