const express = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { isAdmin, isConsultaOrAbove } = require('../middlewares/permission.middleware');

const router = express.Router();

// Apply requireAuth globally to this router
router.use(requireAuth);

router.get('/', isConsultaOrAbove, usuariosController.listar);
router.get('/:id', isConsultaOrAbove, usuariosController.buscarPorId);
router.post('/', isAdmin, usuariosController.cadastrar);
router.put('/:id', isAdmin, usuariosController.atualizar);
router.patch('/:id/status', isAdmin, usuariosController.alterarStatus);
router.put('/:id/resetar-senha', isAdmin, usuariosController.resetarSenha);
router.delete('/:id', isAdmin, usuariosController.excluir);

module.exports = router;
