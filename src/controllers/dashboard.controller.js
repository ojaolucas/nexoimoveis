const dashboardService = require('../services/dashboard.service');
const auditoriaService = require('../services/auditoria.service');

async function getCards(req, res, next) {
  try {
    const data = await dashboardService.getCards();
    
    // Audit log for dashboard access
    const user = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditoriaService.registrarLog({
      usuarioId: user.id,
      acao: 'Acesso ao Dashboard',
      modulo: 'Dashboard',
      registroId: user.id,
      descricao: `Usuário ${user.nome} acessou o Dashboard Executivo.`,
      ip
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getReceitaDespesa(req, res, next) {
  try {
    const data = await dashboardService.getReceitaDespesa();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getOcupacao(req, res, next) {
  try {
    const data = await dashboardService.getOcupacao();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getInadimplencia(req, res, next) {
  try {
    const data = await dashboardService.getInadimplencia();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getContratos(req, res, next) {
  try {
    const data = await dashboardService.getContratos();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getAlertas(req, res, next) {
  try {
    const data = await dashboardService.getAlertas();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getMovimentacoes(req, res, next) {
  try {
    const data = await dashboardService.getMovimentacoes();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getNotificacoes(req, res, next) {
  try {
    const data = await dashboardService.getNotificacoes();
    
    // Audit retrieval of notifications
    const user = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await auditoriaService.registrarLog({
      usuarioId: user.id,
      acao: 'Leitura de notificações',
      modulo: 'Notificações',
      registroId: user.id,
      descricao: `Usuário ${user.nome} listou a fila de notificações do sistema.`,
      ip
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function marcarLida(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const notif = await dashboardService.marcarLida(id);
    if (!notif) throw new Error('Notificação não encontrada.');

    // Audit mark read
    await auditoriaService.registrarLog({
      usuarioId: user.id,
      acao: 'Marcação de notificações',
      modulo: 'Notificações',
      registroId: id,
      descricao: `Usuário ${user.nome} marcou como lida a notificação ID: ${id}.`,
      ip
    });

    res.status(200).json({ success: true, message: 'Notificação marcada como lida.', data: notif });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function marcarTodasLidas(req, res, next) {
  try {
    const user = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await dashboardService.marcarTodasLidas();

    // Audit mark all read
    await auditoriaService.registrarLog({
      usuarioId: user.id,
      acao: 'Marcação de notificações',
      modulo: 'Notificações',
      registroId: user.id,
      descricao: `Usuário ${user.nome} marcou todas as notificações como lidas.`,
      ip
    });

    res.status(200).json({ success: true, message: 'Todas as notificações marcadas como lidas.' });
  } catch (error) {
    next(error);
  }
}

async function buscaGlobal(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Parâmetro de busca obrigatório.' });
    }
    const data = await dashboardService.buscaGlobal(q);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCards,
  getReceitaDespesa,
  getOcupacao,
  getInadimplencia,
  getContratos,
  getAlertas,
  getMovimentacoes,
  getNotificacoes,
  marcarLida,
  marcarTodasLidas,
  buscaGlobal,
};
