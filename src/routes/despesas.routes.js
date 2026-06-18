const express = require('express');
const despesasController = require('../controllers/despesas.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(requireAuth);

// Static endpoints (must precede dynamic id-based ones)
router.get('/vencidas', isConsultaOrAbove, despesasController.listVencidas);
router.get('/recorrentes', isConsultaOrAbove, despesasController.listRecorrentes);
router.get('/stats', isConsultaOrAbove, despesasController.getCardsStats);
router.get('/graficos', isConsultaOrAbove, despesasController.getGraficosData);
router.get('/exportar/excel', isConsultaOrAbove, despesasController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, despesasController.exportarPDF);

// Dynamic endpoints
router.get('/:id', isConsultaOrAbove, despesasController.buscarPorId);
router.post('/', isOperacionalOrAdmin, despesasController.cadastrar);
router.put('/:id', isOperacionalOrAdmin, despesasController.atualizar);
router.patch('/:id/cancelar', isAdmin, despesasController.cancelar);

// Sub-resources
router.get('/:id/timeline', isConsultaOrAbove, despesasController.buscarTimeline);
router.post('/:id/pagamento', isOperacionalOrAdmin, upload.single('comprovante'), despesasController.registrarPagamento);
router.post('/:id/comprovantes', isOperacionalOrAdmin, upload.single('arquivo'), despesasController.adicionarComprovante);
router.delete('/:id/comprovantes/:arquivoId', isOperacionalOrAdmin, despesasController.removerComprovante);
router.get('/', isConsultaOrAbove, despesasController.listar);

module.exports = router;
