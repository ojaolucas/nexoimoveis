const express = require('express');
const proprietariosController = require('../controllers/proprietarios.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(requireAuth);

// 1. Static lists and export routes (placed BEFORE dynamic :id routes)
router.get('/', isConsultaOrAbove, proprietariosController.listar);
router.get('/exportar/excel', isConsultaOrAbove, proprietariosController.exportarExcel);
router.get('/exportar/pdf', isConsultaOrAbove, proprietariosController.exportarPDF);

// 2. Dynamic ID routes
router.get('/:id', isConsultaOrAbove, proprietariosController.buscarPorId);
router.post('/', isOperacionalOrAdmin, proprietariosController.cadastrar);
router.put('/:id', isOperacionalOrAdmin, proprietariosController.atualizar);
router.patch('/:id/status', isOperacionalOrAdmin, proprietariosController.alterarStatus);
router.delete('/:id', isAdmin, proprietariosController.excluir);

// 3. Sub-resource routes (Imoveis & Documentos)
router.get('/:id/imoveis', isConsultaOrAbove, proprietariosController.listarImoveis);
router.post('/:id/documentos', isOperacionalOrAdmin, upload.single('arquivo'), proprietariosController.adicionarDocumento);
router.delete('/:id/documentos/:documentoId', isOperacionalOrAdmin, proprietariosController.removerDocumento);

module.exports = router;
