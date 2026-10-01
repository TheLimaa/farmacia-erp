const express = require('express');
const router = express.Router();
const { obtenerBPs, crearBP } = require('../controllers/bpController');

router.get('/', obtenerBPs);
router.post('/', crearBP);

module.exports = router;