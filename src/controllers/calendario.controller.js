const calendarioService = require('../services/calendario.service');

/**
 * GET /api/calendario
 * Returns overview info: cards (today, week, month, overdue) and alerts.
 */
async function getOverview(req, res, next) {
  try {
    const cards = {
      hoje: await calendarioService.contarPorPeriodo(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
      semana: await calendarioService.contarPorPeriodo(
        // start of week (Monday)
        new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0],
        new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7)).toISOString().split('T')[0]
      ),
      mes: await calendarioService.contarPorPeriodo(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
      ),
      atrasados: await calendarioService.contarAtrasados()
    };
    // For simplicity, reuse existing alert logic from dashboard service
    const alerts = await require('../services/dashboard.service').getAlertas();
    res.status(200).json({ success: true, cards, alerts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/calendario/eventos
 * Returns list of events with optional filters and pagination.
 */
async function listarEventos(req, res, next) {
  try {
    const { tipo, imovelId, responsavelId, status, start, end, page = 1, limit = 50 } = req.query;
    const filters = {};
    if (tipo) filters.tipo = tipo.split(',');
    if (imovelId) filters.imovelId = imovelId;
    if (responsavelId) filters.responsavelId = responsavelId;
    if (status) filters.status = status.split(',');
    if (start && end) filters.periodo = { start, end };
    const offset = (page - 1) * limit;
    const eventos = await calendarioService.listarEventos(filters, { limit: parseInt(limit, 10), offset });
    res.status(200).json({ success: true, eventos, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10) } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/calendario/:id
 * Returns detailed info for a single event.
 */
async function detalharEvento(req, res, next) {
  try {
    const { id } = req.params;
    const evento = await calendarioService.obterDetalhes(id);
    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    }
    res.status(200).json({ success: true, evento });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview, listarEventos, detalharEvento };
