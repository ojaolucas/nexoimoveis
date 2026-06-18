const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/cards', dashboardController.getCards);
router.get('/receita-despesa', dashboardController.getReceitaDespesa);
router.get('/ocupacao', dashboardController.getOcupacao);
router.get('/inadimplencia', dashboardController.getInadimplencia);
router.get('/contratos', dashboardController.getContratos);
router.get('/alertas', dashboardController.getAlertas);
router.get('/movimentacoes', dashboardController.getMovimentacoes);
router.get('/notificacoes', dashboardController.getNotificacoes);
router.put('/notificacoes/:id/lida', dashboardController.marcarLida);
router.put('/notificacoes/lidas', dashboardController.marcarTodasLidas);
router.get('/busca-global', dashboardController.buscaGlobal);

module.exports = router;
