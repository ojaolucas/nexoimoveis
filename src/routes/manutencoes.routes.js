const express = require('express');
const manutencoesController = require('../controllers/manutencoes.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(requireAuth);

// Static endpoints (must precede dynamic ID-based ones)
router.get('/stats', isConsultaOrAbove, manutencoesController.getCardsStats);
router.get('/graficos', isConsultaOrAbove, manutencoesController.getGraficosData);
router.get('/exportar/excel', isConsultaOrAbove, manutencoesController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, manutencoesController.exportarPDF);
router.get('/imovel/:id', isConsultaOrAbove, manutencoesController.listByImovel);

// Dynamic endpoints
router.get('/:id', isConsultaOrAbove, manutencoesController.buscarPorId);
router.post('/', isOperacionalOrAdmin, manutencoesController.cadastrar);
router.put('/:id', isOperacionalOrAdmin, manutencoesController.atualizar);
router.patch('/:id/concluir', isOperacionalOrAdmin, manutencoesController.concluir);
router.patch('/:id/cancelar', isAdmin, manutencoesController.cancelar);

// Sub-resources
router.get('/:id/timeline', isConsultaOrAbove, manutencoesController.buscarTimeline);
router.post('/:id/anexos', isOperacionalOrAdmin, upload.single('arquivo'), manutencoesController.adicionarAnexo);
router.delete('/:id/anexos/:arquivoId', isOperacionalOrAdmin, manutencoesController.removerAnexo);

router.get('/', isConsultaOrAbove, manutencoesController.listar);

module.exports = router;
