const auditoriaRepository = require('../repositories/auditoria.repository');

/**
 * Mapa de rotas para módulos e entidades do sistema.
 */
const ROUTE_MAP = {
  '/api/imoveis': { modulo: 'Imóveis', entidade: 'Imóvel' },
  '/api/proprietarios': { modulo: 'Proprietários', entidade: 'Proprietário' },
  '/api/locatarios': { modulo: 'Locatários', entidade: 'Locatário' },
  '/api/contratos': { modulo: 'Contratos', entidade: 'Contrato' },
  '/api/recebimentos': { modulo: 'Recebimentos', entidade: 'Recebimento' },
  '/api/despesas': { modulo: 'Despesas', entidade: 'Despesa' },
  '/api/manutencoes': { modulo: 'Manutenções', entidade: 'Manutenção' },
  '/api/vistorias': { modulo: 'Vistorias', entidade: 'Vistoria' },
  '/api/usuarios': { modulo: 'Usuários', entidade: 'Usuário' },
  '/api/relatorios': { modulo: 'Relatórios', entidade: 'Relatório' },
  '/api/auditoria': { modulo: 'Auditoria', entidade: 'Log' },
  '/api/notificacoes': { modulo: 'Notificações', entidade: 'Notificação' },
  '/api/calendario': { modulo: 'Calendário', entidade: 'Evento' },
};

/**
 * Mapa de método HTTP para ação de auditoria.
 */
const METHOD_ACTION_MAP = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE_LOGICO',
};

/**
 * Infere módulo e entidade a partir da URL da requisição.
 */
function inferModulo(url) {
  for (const prefix of Object.keys(ROUTE_MAP)) {
    if (url.startsWith(prefix)) return ROUTE_MAP[prefix];
  }
  return { modulo: 'Sistema', entidade: 'Registro' };
}

/**
 * Registra um log de auditoria de forma segura (nunca lança exceção).
 */
async function registrarLog({
  usuarioId, perfil, acao, modulo, entidade,
  registroId, descricao, dadosAnteriores, dadosNovos,
  ip, userAgent
}) {
  try {
    await auditoriaRepository.create({
      usuario_id: usuarioId,
      perfil: perfil || null,
      acao,
      modulo,
      entidade: entidade || null,
      registro_id: registroId || null,
      descricao,
      dados_anteriores: dadosAnteriores || null,
      dados_novos: dadosNovos || null,
      ip: ip || null,
      user_agent: userAgent || null
    });
  } catch (err) {
    console.error('[Auditoria] Falha ao registrar log:', err.message);
  }
}

/**
 * Gera descrição humanizada com base na ação e módulo.
 */
function gerarDescricao(acao, modulo, entidade, usuario) {
  const nomeUsuario = usuario?.nome || 'Sistema';
  const maps = {
    CREATE: `${nomeUsuario} cadastrou um novo registro em ${modulo}.`,
    UPDATE: `${nomeUsuario} atualizou um registro em ${modulo}.`,
    DELETE_LOGICO: `${nomeUsuario} inativou um registro em ${modulo}.`,
    UPLOAD: `${nomeUsuario} realizou upload de arquivo em ${modulo}.`,
    DOWNLOAD: `${nomeUsuario} realizou download de arquivo em ${modulo}.`,
    VIEW: `${nomeUsuario} visualizou um registro em ${modulo}.`,
    PAYMENT: `${nomeUsuario} registrou um pagamento em ${modulo}.`,
    REVERSAL: `${nomeUsuario} realizou um estorno em ${modulo}.`,
    EXPORT: `${nomeUsuario} exportou dados de ${modulo}.`,
    LOGIN: `${nomeUsuario} realizou login no sistema.`,
    LOGOUT: `${nomeUsuario} realizou logout do sistema.`,
  };
  return maps[acao] || `${nomeUsuario} executou ação ${acao} em ${modulo}.`;
}

module.exports = {
  registrarLog,
  inferModulo,
  gerarDescricao,
  METHOD_ACTION_MAP
};
