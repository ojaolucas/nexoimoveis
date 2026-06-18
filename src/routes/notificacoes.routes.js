const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificacoes.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isOperacionalOrAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');

router.use(requireAuth);

// 1. Overview and lists (Static ones must precede ID params)
router.get('/nao-lidas', isConsultaOrAbove, controller.listarNaoLidas);
router.get('/contador', isConsultaOrAbove, controller.obterContador);
router.get('/metricas', isConsultaOrAbove, controller.obterMetricas);

// 2. Actions (Bulk updates must precede ID params)
router.patch('/lidas', isConsultaOrAbove, controller.marcarTodasLidas);

// 3. ID-based endpoints
router.get('/:id', isConsultaOrAbove, controller.detalhar);
router.patch('/:id/lida', isConsultaOrAbove, controller.marcarLida);
router.patch('/:id/arquivar', isOperacionalOrAdmin, controller.arquivar);
router.get('/:id/abrir', isConsultaOrAbove, controller.abrirRegistro);

// 4. Main list filter endpoint
router.get('/', isConsultaOrAbove, controller.listar);

module.exports = router;
