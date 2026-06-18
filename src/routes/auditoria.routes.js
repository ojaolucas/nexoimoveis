const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const controller = require('../controllers/auditoria.controller');

/**
 * Middleware de autorização: somente administradores.
 */
function requireAdmin(req, res, next) {
  const perfil = req.session?.usuario?.perfil;
  if (perfil !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito a administradores.'
    });
  }
  next();
}

const auth = [requireAuth, requireAdmin];

// Cards de resumo
router.get('/cards', auth, controller.cards);

// Exportações (antes das rotas com parâmetro para evitar conflito)
router.get('/exportar/excel', auth, controller.exportarExcel);
router.get('/exportar/pdf', auth, controller.exportarPDF);

// Listas especializadas
router.get('/logins', auth, controller.logins);
router.get('/exportacoes', auth, controller.exportacoes);
router.get('/alteracoes', auth, controller.alteracoes);
router.get('/modulo/:modulo', auth, controller.porModulo);
router.get('/usuario/:usuarioId', auth, controller.porUsuario);

// Listagem geral
router.get('/', auth, controller.listar);

// Detalhamento
router.get('/:id', auth, controller.detalhar);

module.exports = router;
