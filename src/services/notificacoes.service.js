const repository = require('../repositories/notificacoes.repository');
const auditoriaService = require('./auditoria.service');

/**
 * Mapeamento de links amigáveis das entidades no sistema.
 */
function getLinkEntidade(entidade, registro_id) {
  if (!entidade || !registro_id) return null;
  const map = {
    imovel: `/imoveis#${registro_id}`,
    contrato: `/contratos#${registro_id}`,
    recebimento: `/recebimentos#${registro_id}`,
    despesa: `/despesas#${registro_id}`,
    manutencao: `/manutencoes#${registro_id}`,
    vistoria: `/vistorias#${registro_id}`,
    documento: `/imoveis#${registro_id}` // Geralmente anexado a imóvel
  };
  
  const key = entidade.toLowerCase();
  return map[key] || null;
}

/**
 * Listagem geral das notificações de um usuário.
 */
async function listar(filters = {}, pagination = {}, reqUser = {}) {
  const limit = pagination.limit || 50;
  const offset = pagination.offset || 0;
  
  // Usuário de perfil 'administrador' pode visualizar todas as notificações
  // Perfis operacional e consulta visualizam suas próprias ou notificações gerais (usuario_id IS NULL)
  const queryFilters = { ...filters };
  if (reqUser.perfil !== 'administrador') {
    queryFilters.usuario_id = reqUser.id;
  }

  const result = await repository.listAll(queryFilters, limit, offset);

  // Registrar auditoria
  await auditoriaService.registrarLog({
    usuarioId: reqUser.id,
    perfil: reqUser.perfil,
    acao: 'VIEW',
    modulo: 'Notificações',
    descricao: `Usuário ${reqUser.nome} visualizou o painel de notificações.`
  });

  return result;
}

/**
 * Listagem das notificações não lidas para o dropdown/sino.
 */
async function listarNaoLidas(reqUser = {}) {
  // Administradores veem todas as não lidas de sistema, operacionais veem as próprias ou gerais
  const usuarioId = reqUser.perfil === 'administrador' ? null : reqUser.id;
  const result = await repository.listUnread(usuarioId, 20, 0);
  return result.rows;
}

/**
 * Obter uma notificação por ID com auditoria.
 */
async function obterPorId(id, reqUser = {}) {
  const notif = await repository.findById(id);
  if (!notif) return null;

  // Registrar auditoria
  await auditoriaService.registrarLog({
    usuarioId: reqUser.id,
    perfil: reqUser.perfil,
    acao: 'VIEW',
    modulo: 'Notificações',
    registroId: id,
    descricao: `Usuário ${reqUser.nome} visualizou detalhes da notificação "${notif.titulo}".`
  });

  return {
    ...notif,
    url_original: getLinkEntidade(notif.entidade, notif.registro_id)
  };
}

/**
 * Marcar notificação por ID como Lida.
 */
async function marcarLida(id, reqUser = {}) {
  const notif = await repository.markAsRead(id);
  if (notif) {
    // Registrar auditoria
    await auditoriaService.registrarLog({
      usuarioId: reqUser.id,
      perfil: reqUser.perfil,
      acao: 'UPDATE',
      modulo: 'Notificações',
      registroId: id,
      descricao: `Usuário ${reqUser.nome} marcou como Lida a notificação "${notif.titulo}".`
    });
  }
  return notif;
}

/**
 * Marcar todas as notificações não lidas como Lidas.
 */
async function marcarTodasLidas(reqUser = {}) {
  const result = await repository.markAllAsRead(reqUser.id);
  
  // Registrar auditoria
  await auditoriaService.registrarLog({
    usuarioId: reqUser.id,
    perfil: reqUser.perfil,
    acao: 'UPDATE',
    modulo: 'Notificações',
    descricao: `Usuário ${reqUser.nome} marcou todas as notificações como lidas.`
  });
  
  return result;
}

/**
 * Arquivar notificação.
 */
async function arquivar(id, reqUser = {}) {
  const notif = await repository.archive(id);
  if (notif) {
    // Registrar auditoria
    await auditoriaService.registrarLog({
      usuarioId: reqUser.id,
      perfil: reqUser.perfil,
      acao: 'DELETE_LOGICO',
      modulo: 'Notificações',
      registroId: id,
      descricao: `Usuário ${reqUser.nome} arquivou a notificação "${notif.titulo}".`
    });
  }
  return notif;
}

/**
 * Obter contador de não lidas.
 */
async function obterContador(reqUser = {}) {
  const total = await repository.getUnreadCount(reqUser.id);
  return total;
}

/**
 * Obter métricas do painel de notificações (Total, Não Lidas, Críticas, Hoje).
 */
async function obterMetricas(reqUser = {}) {
  const metrics = await repository.getMetrics(reqUser.id);
  return metrics;
}

/**
 * Lógica para registrar auditoria de abertura do registro relacionado.
 */
async function registrarAberturaRegistro(id, reqUser = {}) {
  const notif = await repository.findById(id);
  if (!notif) return null;

  const url = getLinkEntidade(notif.entidade, notif.registro_id);

  // Registrar auditoria
  await auditoriaService.registrarLog({
    usuarioId: reqUser.id,
    perfil: reqUser.perfil,
    acao: 'OPEN_LINK',
    modulo: 'Notificações',
    registroId: notif.registro_id,
    descricao: `Usuário ${reqUser.nome} abriu o registro relacionado da entidade "${notif.entidade}" a partir da notificação "${notif.titulo}".`
  });

  return url;
}

/**
 * Criar nova notificação com verificação automática de duplicados.
 * Usado por jobs e eventos internos do sistema.
 */
async function criarNotificacao(data) {
  const { categoria, entidade, registro_id, titulo } = data;
  
  // Evitar duplicados nas últimas 24 horas
  const isDuplicate = await repository.checkDuplicate(categoria, entidade, registro_id, titulo);
  if (isDuplicate) {
    console.log(`[Service] Notificação duplicada ignorada: Categoria=${categoria}, Titulo=${titulo}`);
    return null;
  }

  const result = await repository.create(data);
  return result;
}

module.exports = {
  listar,
  listarNaoLidas,
  obterPorId,
  marcarLida,
  marcarTodasLidas,
  arquivar,
  obterContador,
  obterMetricas,
  registrarAberturaRegistro,
  criarNotificacao,
  getLinkEntidade
};
