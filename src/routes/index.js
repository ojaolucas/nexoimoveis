const express = require('express');
const path = require('path');
const { requireAuth, redirectIfAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// --- 1. HTML View Routes ---

// Home page redirect
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Login Page
router.get('/login', redirectIfAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/auth/login.html'));
});

// Dashboard Page
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/dashboard/index.html'));
});

// Redirects for legacy routes
router.get('/proprietarios', requireAuth, (req, res) => res.redirect('/pessoas'));
router.get('/locatarios', requireAuth, (req, res) => res.redirect('/pessoas'));
router.get('/contratos', requireAuth, (req, res) => res.redirect('/imoveis'));
router.get('/recebimentos', requireAuth, (req, res) => res.redirect('/imoveis'));
router.get('/vistorias', requireAuth, (req, res) => res.redirect('/imoveis'));

// Active modules views
const modules = ['usuarios', 'imoveis', 'pessoas', 'relatorios', 'auditoria', 'calendario', 'notificacoes', 'despesas', 'manutencoes'];

modules.forEach(mod => {
  router.get(`/${mod}`, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, `../../views/${mod}/index.html`));
  });
});

// --- 2. API Routes ---

// Register modular API routes
router.use('/api/auth', require('./auth.routes'));
router.use('/api/usuarios', require('./usuarios.routes'));
router.use('/api/proprietarios', require('./proprietarios.routes'));
router.use('/api/locatarios', require('./locatarios.routes'));
router.use('/api/imoveis', require('./imoveis.routes'));
router.use('/api/contratos', require('./contratos.routes'));
router.use('/api/recebimentos', require('./recebimentos.routes'));
router.use('/api/despesas', require('./despesas.routes'));
router.use('/api/manutencoes', require('./manutencoes.routes'));
router.use('/api/vistorias', require('./vistorias.routes'));
router.use('/api/dashboard', require('./dashboard.routes'));
router.use('/api/calendario', require('./calendario.routes'));
router.use('/api/notificacoes', require('./notificacoes.routes'));
router.use('/api/relatorios', require('./relatorios.routes'));
router.use('/api/auditoria', require('./auditoria.routes'));
router.use('/api/busca-global', require('./buscaGlobal.routes'));

module.exports = router;
