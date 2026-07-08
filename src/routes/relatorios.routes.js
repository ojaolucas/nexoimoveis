const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const relatoriosController = require('../controllers/relatorios.controller');

const router = express.Router();

// Protect all reports routes
router.use(requireAuth);

router.get('/', relatoriosController.obterVisualizacao);
router.get('/exportar/excel', relatoriosController.exportarExcel);
router.get('/exportar/pdf', relatoriosController.exportarPDF);

module.exports = router;
