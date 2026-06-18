const express = require('express');
const imoveisController = require('../controllers/imoveis.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(requireAuth);

// 1. Static and stats routes (MUST be defined before dynamic :id routes)
router.get('/', isConsultaOrAbove, imoveisController.listar);
router.get('/cards', isConsultaOrAbove, imoveisController.getCardsStats);
router.get('/exportar/excel', isConsultaOrAbove, imoveisController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, imoveisController.exportarPDF);

// 2. Dynamic ID operations
router.get('/:id', isConsultaOrAbove, imoveisController.buscarPorId);
router.post('/', isOperacionalOrAdmin, upload.single('foto_principal'), imoveisController.cadastrar);
router.put('/:id', isOperacionalOrAdmin, upload.single('foto_principal'), imoveisController.atualizar);
router.delete('/:id', isAdmin, imoveisController.excluir);

// 3. Sub-resource documents, gallery photos and logs
router.post('/:id/documentos', isOperacionalOrAdmin, upload.single('arquivo'), imoveisController.adicionarDocumento);
router.delete('/:id/documentos/:documentoId', isOperacionalOrAdmin, imoveisController.removerDocumento);
router.post('/:id/fotos', isOperacionalOrAdmin, upload.single('arquivo'), imoveisController.adicionarFoto);
router.delete('/:id/fotos/:fotoId', isOperacionalOrAdmin, imoveisController.removerFoto);

module.exports = router;
