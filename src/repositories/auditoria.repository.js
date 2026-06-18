const db = require('../config/database');

/**
 * Cria um registro de auditoria no banco de dados.
 */
async function create(log) {
  const {
    usuario_id, perfil, acao, modulo, entidade,
    registro_id, descricao, dados_anteriores, dados_novos,
    ip, user_agent
  } = log;

  const query = `
    INSERT INTO auditoria_logs 
      (usuario_id, perfil, acao, modulo, entidade, registro_id, descricao,
       dados_anteriores, dados_novos, ip, user_agent, data_hora, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, 'ativo')
    RETURNING *
  `;
  const result = await db.query(query, [
    usuario_id || null, perfil || null, acao, modulo, entidade || null,
    registro_id || null, descricao,
    dados_anteriores ? JSON.stringify(dados_anteriores) : null,
    dados_novos ? JSON.stringify(dados_novos) : null,
    ip || null, user_agent || null
  ]);
  return result.rows[0];
}

/**
 * Retorna cards de resumo para o topo da tela.
 */
async function getCards() {
  const query = `
    SELECT
      COUNT(*) AS total_logs,
      COUNT(*) FILTER (WHERE acao IN ('LOGIN','LOGOUT') AND data_hora::date = CURRENT_DATE) AS logins_hoje,
      COUNT(*) FILTER (WHERE acao IN ('CREATE','UPDATE','DELETE_LOGICO','PAYMENT','REVERSAL') AND data_hora::date = CURRENT_DATE) AS alteracoes_hoje,
      COUNT(*) FILTER (WHERE acao = 'EXPORT' AND data_hora::date = CURRENT_DATE) AS exportacoes_hoje
    FROM auditoria_logs
    WHERE status = 'ativo'
  `;
  const result = await db.query(query);
  return result.rows[0];
}

/**
 * Lista logs com filtros, ordenação e paginação.
 */
async function listAll(filters = {}, limit = 50, offset = 0) {
  const params = [];
  let p = 1;
  let where = `WHERE l.status = 'ativo'`;

  if (filters.usuario) {
    where += ` AND (u.nome ILIKE $${p} OR u.email ILIKE $${p} OR u.cpf ILIKE $${p})`;
    params.push(`%${filters.usuario}%`);
    p++;
  }
  if (filters.perfil) {
    where += ` AND l.perfil = $${p}`;
    params.push(filters.perfil);
    p++;
  }
  if (filters.modulo) {
    where += ` AND l.modulo = $${p}`;
    params.push(filters.modulo);
    p++;
  }
  if (filters.acao) {
    where += ` AND l.acao = $${p}`;
    params.push(filters.acao);
    p++;
  }
  if (filters.data_inicio) {
    where += ` AND l.data_hora >= $${p}`;
    params.push(filters.data_inicio);
    p++;
  }
  if (filters.data_fim) {
    where += ` AND l.data_hora <= $${p}::date + INTERVAL '1 day'`;
    params.push(filters.data_fim);
    p++;
  }
  if (filters.texto) {
    where += ` AND (l.descricao ILIKE $${p} OR l.entidade ILIKE $${p} OR u.nome ILIKE $${p})`;
    params.push(`%${filters.texto}%`);
    p++;
  }

  const dataQuery = `
    SELECT 
      l.id, l.acao, l.modulo, l.entidade, l.registro_id, l.descricao,
      l.dados_anteriores, l.dados_novos, l.ip, l.user_agent,
      l.data_hora, l.perfil,
      u.nome AS usuario_nome, u.email AS usuario_email
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    ${where}
    ORDER BY l.data_hora DESC
    LIMIT $${p} OFFSET $${p + 1}
  `;
  const countQuery = `
    SELECT COUNT(l.id) 
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    ${where}
  `;

  const [data, count] = await Promise.all([
    db.query(dataQuery, [...params, limit, offset]),
    db.query(countQuery, params)
  ]);

  return {
    rows: data.rows,
    total: parseInt(count.rows[0].count, 10)
  };
}

/**
 * Retorna um log pelo ID.
 */
async function findById(id) {
  const query = `
    SELECT 
      l.*, u.nome AS usuario_nome, u.email AS usuario_email, u.perfil AS usuario_perfil
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    WHERE l.id = $1 AND l.status = 'ativo'
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Logs de login/logout.
 */
async function listLogins(limit = 50, offset = 0) {
  const query = `
    SELECT l.*, u.nome AS usuario_nome, u.email AS usuario_email
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    WHERE l.acao IN ('LOGIN', 'LOGOUT') AND l.status = 'ativo'
    ORDER BY l.data_hora DESC
    LIMIT $1 OFFSET $2
  `;
  const count = await db.query(`SELECT COUNT(*) FROM auditoria_logs WHERE acao IN ('LOGIN','LOGOUT') AND status = 'ativo'`);
  const data = await db.query(query, [limit, offset]);
  return { rows: data.rows, total: parseInt(count.rows[0].count, 10) };
}

/**
 * Logs de exportação.
 */
async function listExportacoes(limit = 50, offset = 0) {
  const query = `
    SELECT l.*, u.nome AS usuario_nome
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    WHERE l.acao = 'EXPORT' AND l.status = 'ativo'
    ORDER BY l.data_hora DESC
    LIMIT $1 OFFSET $2
  `;
  const count = await db.query(`SELECT COUNT(*) FROM auditoria_logs WHERE acao = 'EXPORT' AND status = 'ativo'`);
  const data = await db.query(query, [limit, offset]);
  return { rows: data.rows, total: parseInt(count.rows[0].count, 10) };
}

/**
 * Logs de alterações (UPDATE, CREATE, DELETE_LOGICO, PAYMENT, REVERSAL).
 */
async function listAlteracoes(limit = 50, offset = 0) {
  const query = `
    SELECT l.*, u.nome AS usuario_nome
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    WHERE l.acao IN ('CREATE','UPDATE','DELETE_LOGICO','PAYMENT','REVERSAL') AND l.status = 'ativo'
    ORDER BY l.data_hora DESC
    LIMIT $1 OFFSET $2
  `;
  const count = await db.query(`SELECT COUNT(*) FROM auditoria_logs WHERE acao IN ('CREATE','UPDATE','DELETE_LOGICO','PAYMENT','REVERSAL') AND status = 'ativo'`);
  const data = await db.query(query, [limit, offset]);
  return { rows: data.rows, total: parseInt(count.rows[0].count, 10) };
}

/**
 * Logs por módulo.
 */
async function listByModulo(modulo, limit = 50, offset = 0) {
  const query = `
    SELECT l.*, u.nome AS usuario_nome
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    WHERE l.modulo = $1 AND l.status = 'ativo'
    ORDER BY l.data_hora DESC
    LIMIT $2 OFFSET $3
  `;
  const count = await db.query(`SELECT COUNT(*) FROM auditoria_logs WHERE modulo = $1 AND status = 'ativo'`, [modulo]);
  const data = await db.query(query, [modulo, limit, offset]);
  return { rows: data.rows, total: parseInt(count.rows[0].count, 10) };
}

/**
 * Logs por usuário.
 */
async function listByUsuario(usuarioId, limit = 50, offset = 0) {
  const query = `
    SELECT l.*, u.nome AS usuario_nome
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    WHERE l.usuario_id = $1 AND l.status = 'ativo'
    ORDER BY l.data_hora DESC
    LIMIT $2 OFFSET $3
  `;
  const count = await db.query(`SELECT COUNT(*) FROM auditoria_logs WHERE usuario_id = $1 AND status = 'ativo'`, [usuarioId]);
  const data = await db.query(query, [usuarioId, limit, offset]);
  return { rows: data.rows, total: parseInt(count.rows[0].count, 10) };
}

/**
 * Lista todos os logs para exportação (sem paginação, com filtros).
 */
async function listForExport(filters = {}) {
  const { rows } = await listAll(filters, 10000, 0);
  return rows;
}

module.exports = {
  create,
  getCards,
  listAll,
  findById,
  listLogins,
  listExportacoes,
  listAlteracoes,
  listByModulo,
  listByUsuario,
  listForExport
};
