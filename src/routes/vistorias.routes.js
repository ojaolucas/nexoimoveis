const express = require('express');
const vistoriasController = require('../controllers/vistorias.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(requireAuth);

// Static endpoints (must precede dynamic ID-based ones)
router.get('/stats', isConsultaOrAbove, vistoriasController.getCardsStats);
router.get('/graficos', isConsultaOrAbove, vistoriasController.getGraficosData);
router.get('/exportar/excel', isConsultaOrAbove, vistoriasController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, vistoriasController.exportarPDF);
router.get('/imovel/:id', isConsultaOrAbove, vistoriasController.listByImovel);

// Dynamic ID-based endpoints
router.get('/:id', isConsultaOrAbove, vistoriasController.buscarPorId);
router.post('/', isOperacionalOrAdmin, vistoriasController.cadastrar);
router.put('/:id', isOperacionalOrAdmin, vistoriasController.atualizar);
router.patch('/:id/concluir', isOperacionalOrAdmin, vistoriasController.concluir);
router.patch('/:id/cancelar', isAdmin, vistoriasController.cancelar);

// Sub-resources
router.get('/:id/timeline', isConsultaOrAbove, vistoriasController.buscarTimeline);
router.post('/:id/fotos', isOperacionalOrAdmin, upload.single('arquivo'), vistoriasController.adicionarFoto);
router.delete('/:id/fotos/:fotoId', isOperacionalOrAdmin, vistoriasController.removerFoto);

router.get('/', isConsultaOrAbove, vistoriasController.listar);

module.exports = router;
