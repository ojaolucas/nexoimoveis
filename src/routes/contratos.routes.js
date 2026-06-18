const express = require('express');
const contratosController = require('../controllers/contratos.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(requireAuth);

// 1. Static and stats routes (MUST be defined before dynamic :id routes)
router.get('/', isConsultaOrAbove, contratosController.listar);
router.get('/cards', isConsultaOrAbove, contratosController.getCardsStats);
router.get('/exportar/excel', isConsultaOrAbove, contratosController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, contratosController.exportarPDF);

// 2. Dynamic ID operations
router.get('/:id', isConsultaOrAbove, contratosController.buscarPorId);
router.post('/', isOperacionalOrAdmin, contratosController.cadastrar);
router.put('/:id', isOperacionalOrAdmin, contratosController.atualizar);
router.patch('/:id/encerrar', isAdmin, contratosController.encerrar);
router.patch('/:id/cancelar', isAdmin, contratosController.cancelar);
router.post('/:id/renovar', isOperacionalOrAdmin, contratosController.renovar);
router.post('/:id/reajustar', isOperacionalOrAdmin, contratosController.reajustar);

// 3. Sub-resource documents
router.post('/:id/documentos', isOperacionalOrAdmin, upload.single('arquivo'), contratosController.adicionarDocumento);
router.delete('/:id/documentos/:documentoId', isOperacionalOrAdmin, contratosController.removerDocumento);

module.exports = router;
