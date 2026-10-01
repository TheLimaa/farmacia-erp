const express = require('express');
const router = express.Router();
const { getPedidosEntrega } = require('../controllers/deliveryController');

router.get('/', getPedidosEntrega);

module.exports = router;