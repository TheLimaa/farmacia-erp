const express = require('express');
const router = express.Router();
const { getTraslados, createTraslado } = require('../controllers/logisticController');

router.get('/', getTraslados);
router.post('/', createTraslado);

module.exports = router;