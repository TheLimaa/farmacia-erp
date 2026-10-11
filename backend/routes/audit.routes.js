const express = require('express');
const router = express.Router();
const { getFinancialAuditSummary, getCashFlowHistory } = require('../controllers/auditController');

router.get('/financial-summary', getFinancialAuditSummary);
router.get('/cash-flow', getCashFlowHistory);

module.exports = router;