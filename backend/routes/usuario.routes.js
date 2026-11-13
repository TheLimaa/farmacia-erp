const express = require('express');
const router = express.Router();
const { 
    obtenerUsuarios, 
    obtenerEmpleadoParaUsuario, 
    crearUsuario, 
    eliminarUsuario,
    actualizarPassword
} = require('../controllers/usuarioController');

router.get('/', obtenerUsuarios);
router.get('/empleado/:id', obtenerEmpleadoParaUsuario);
router.post('/', crearUsuario);
router.delete('/:id', eliminarUsuario);
router.put('/api/usuarios/:id/password', actualizarPassword);

module.exports = router;