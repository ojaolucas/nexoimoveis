const express = require('express');
const locatariosController = require('../controllers/locatarios.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(requireAuth);

// 1. Static lists and export routes (placed BEFORE dynamic :id routes)
router.get('/', isConsultaOrAbove, locatariosController.listar);
router.get('/exportar/excel', isConsultaOrAbove, locatariosController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, locatariosController.exportarPDF);

// 2. Dynamic ID routes
router.get('/:id', isConsultaOrAbove, locatariosController.buscarPorId);
router.post('/', isOperacionalOrAdmin, locatariosController.cadastrar);
router.put('/:id', isOperacionalOrAdmin, locatariosController.atualizar);
router.patch('/:id/status', isOperacionalOrAdmin, locatariosController.alterarStatus);
router.delete('/:id', isAdmin, locatariosController.excluir);

// 3. Sub-resource routes (Contratos, Imoveis, Recebimentos & Documentos)
router.get('/:id/contratos', isConsultaOrAbove, locatariosController.listarContratos);
router.get('/:id/imoveis', isConsultaOrAbove, locatariosController.listarImoveis);
router.get('/:id/recebimentos', isConsultaOrAbove, locatariosController.listarRecebimentos);
router.post('/:id/documentos', isOperacionalOrAdmin, upload.single('arquivo'), locatariosController.adicionarDocumento);
router.delete('/:id/documentos/:documentoId', isOperacionalOrAdmin, locatariosController.removerDocumento);

module.exports = router;
