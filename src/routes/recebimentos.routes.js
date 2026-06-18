const express = require('express');
const recebimentosController = require('../controllers/recebimentos.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');

const router = express.Router();

router.use(requireAuth);

// Static endpoints must precede dynamic id-based ones
router.get('/inadimplencia', isConsultaOrAbove, recebimentosController.getInadimplencias);
router.get('/fluxo-caixa', isConsultaOrAbove, recebimentosController.getFluxoCaixa);
router.get('/stats', isConsultaOrAbove, recebimentosController.getCardsStats);
router.get('/exportar/excel', isConsultaOrAbove, recebimentosController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, recebimentosController.exportarPDF);

// Dynamic endpoints
router.get('/:id', isConsultaOrAbove, recebimentosController.buscarPorId);
router.post('/:id/pagamento', isOperacionalOrAdmin, recebimentosController.registrarPagamento);
router.post('/:id/estorno', isAdmin, recebimentosController.estornar);
router.put('/:id', isOperacionalOrAdmin, recebimentosController.atualizar);
router.get('/', isConsultaOrAbove, recebimentosController.listar);

module.exports = router;
