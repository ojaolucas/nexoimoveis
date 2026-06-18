const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const calendarioController = require('../controllers/calendario.controller');

const router = express.Router();

// Protect all calendar routes
router.use(requireAuth);

// Overview (cards & alerts)
router.get('/', calendarioController.getOverview);

// List events with filters & pagination
router.get('/eventos', calendarioController.listarEventos);

// Event detail
router.get('/evento/:id', calendarioController.detalharEvento);

module.exports = router;
