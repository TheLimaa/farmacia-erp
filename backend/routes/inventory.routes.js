const express = require('express');
const router = express.Router();
const { checkStockForCallCenter, crearMedicamento, ingresarStock, getMedicamentos, getInventarioGeneral, getStockEnTransito, recibirStock } = require('../controllers/inventoryController');

router.get('/medicamentos', getMedicamentos);
router.get('/general', getInventarioGeneral);
router.get('/transito', getStockEnTransito); // <--- Nueva
router.get('/stock/:id_medicamento', checkStockForCallCenter); 
router.post('/producto', crearMedicamento); 
router.post('/stock', ingresarStock); 
router.put('/recibir', recibirStock); // <--- Nueva (PUT para actualizar)

module.exports = router;