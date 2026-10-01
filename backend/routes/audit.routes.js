const express = require('express');
const router = express.Router();
const { getFinancialAuditSummary } = require('../controllers/auditController');

// GET /api/audit/financial-summary
router.get('/financial-summary', getFinancialAuditSummary);

module.exports = router;