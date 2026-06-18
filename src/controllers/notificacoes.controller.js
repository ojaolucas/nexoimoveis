const service = require('../services/notificacoes.service');

async function listar(req, res, next) {
  try {
    const { categoria, prioridade, status, data_inicio, data_fim, texto, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const filters = { categoria, prioridade, status, data_inicio, data_fim, texto };
    const pagination = { limit: parseInt(limit, 10), offset };
    
    const result = await service.listar(filters, pagination, req.session.usuario);
    
    res.status(200).json({
      success: true,
      data: result.rows,
      total: result.total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
  } catch (error) {
    next(error);
  }
}

async function detalhar(req, res, next) {
  try {
    const { id } = req.params;
    const notif = await service.obterPorId(id, req.session.usuario);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada.' });
    }
    res.status(200).json({ success: true, data: notif });
  } catch (error) {
    next(error);
  }
}

async function listarNaoLidas(req, res, next) {
  try {
    const data = await service.listarNaoLidas(req.session.usuario);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function marcarLida(req, res, next) {
  try {
    const { id } = req.params;
    const notif = await service.marcarLida(id, req.session.usuario);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada.' });
    }
    res.status(200).json({ success: true, message: 'Notificação marcada como lida.', data: notif });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function marcarTodasLidas(req, res, next) {
  try {
    await service.marcarTodasLidas(req.session.usuario);
    res.status(200).json({ success: true, message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (error) {
    next(error);
  }
}

async function arquivar(req, res, next) {
  try {
    const { id } = req.params;
    const notif = await service.arquivar(id, req.session.usuario);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada.' });
    }
    res.status(200).json({ success: true, message: 'Notificação arquivada.', data: notif });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function obterContador(req, res, next) {
  try {
    const total = await service.obterContador(req.session.usuario);
    res.status(200).json({ success: true, total });
  } catch (error) {
    next(error);
  }
}

async function obterMetricas(req, res, next) {
  try {
    const data = await service.obterMetricas(req.session.usuario);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function abrirRegistro(req, res, next) {
  try {
    const { id } = req.params;
    const url = await service.registrarAberturaRegistro(id, req.session.usuario);
    if (!url) {
      return res.status(404).json({ success: false, message: 'Registro relacionado não encontrado.' });
    }
    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  detalhar,
  listarNaoLidas,
  marcarLida,
  marcarTodasLidas,
  arquivar,
  obterContador,
  obterMetricas,
  abrirRegistro
};
