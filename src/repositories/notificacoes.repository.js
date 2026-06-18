const db = require('../config/database');

/**
 * Encontrar uma notificação específica por ID.
 */
async function findById(id) {
  const query = `
    SELECT n.*, u.nome AS usuario_nome
    FROM notificacoes n
    LEFT JOIN usuarios u ON n.usuario_id = u.id
    WHERE n.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Listagem de notificações com filtros e paginação.
 */
async function listAll(filters = {}, limit = 50, offset = 0) {
  let query = `
    SELECT n.*, u.nome AS usuario_nome
    FROM notificacoes n
    LEFT JOIN usuarios u ON n.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.categoria) {
    query += ` AND n.categoria = $${paramCount}`;
    params.push(filters.categoria);
    paramCount++;
  }

  if (filters.prioridade) {
    query += ` AND n.prioridade = $${paramCount}`;
    params.push(filters.prioridade);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND n.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.usuario_id) {
    query += ` AND (n.usuario_id = $${paramCount} OR n.usuario_id IS NULL)`;
    params.push(filters.usuario_id);
    paramCount++;
  }

  if (filters.data_inicio) {
    query += ` AND n.created_at >= $${paramCount}`;
    params.push(filters.data_inicio);
    paramCount++;
  }

  if (filters.data_fim) {
    query += ` AND n.created_at <= $${paramCount}`;
    params.push(filters.data_fim);
    paramCount++;
  }

  if (filters.texto) {
    query += ` AND (n.titulo ILIKE $${paramCount} OR n.descricao ILIKE $${paramCount})`;
    params.push(`%${filters.texto}%`);
    paramCount++;
  }

  let countQuery = `
    SELECT COUNT(n.id) FROM notificacoes n
    WHERE 1=1
  `;
  
  // Replicar filtros no COUNT query
  let countParamIndex = 1;
  const countParams = [];
  
  if (filters.categoria) {
    countQuery += ` AND n.categoria = $${countParamIndex}`;
    countParams.push(filters.categoria);
    countParamIndex++;
  }
  if (filters.prioridade) {
    countQuery += ` AND n.prioridade = $${countParamIndex}`;
    countParams.push(filters.prioridade);
    countParamIndex++;
  }
  if (filters.status) {
    countQuery += ` AND n.status = $${countParamIndex}`;
    countParams.push(filters.status);
    countParamIndex++;
  }
  if (filters.usuario_id) {
    countQuery += ` AND (n.usuario_id = $${countParamIndex} OR n.usuario_id IS NULL)`;
    countParams.push(filters.usuario_id);
    countParamIndex++;
  }
  if (filters.data_inicio) {
    countQuery += ` AND n.created_at >= $${countParamIndex}`;
    countParams.push(filters.data_inicio);
    countParamIndex++;
  }
  if (filters.data_fim) {
    countQuery += ` AND n.created_at <= $${countParamIndex}`;
    countParams.push(filters.data_fim);
    countParamIndex++;
  }
  if (filters.texto) {
    countQuery += ` AND (n.titulo ILIKE $${countParamIndex} OR n.descricao ILIKE $${countParamIndex})`;
    countParams.push(`%${filters.texto}%`);
  }

  query += ` ORDER BY n.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const [resList, resCount] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, countParams)
  ]);

  return {
    rows: resList.rows,
    total: parseInt(resCount.rows[0].count, 10)
  };
}

/**
 * Listagem das notificações não lidas.
 */
async function listUnread(usuarioId, limit = 50, offset = 0) {
  const query = `
    SELECT n.*, u.nome AS usuario_nome
    FROM notificacoes n
    LEFT JOIN usuarios u ON n.usuario_id = u.id
    WHERE n.status = 'Não Lida' AND (n.usuario_id = $1 OR n.usuario_id IS NULL)
    ORDER BY n.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const countQuery = `
    SELECT COUNT(id) FROM notificacoes
    WHERE status = 'Não Lida' AND (usuario_id = $1 OR usuario_id IS NULL)
  `;

  const [resList, resCount] = await Promise.all([
    db.query(query, [usuarioId, limit, offset]),
    db.query(countQuery, [usuarioId])
  ]);

  return {
    rows: resList.rows,
    total: parseInt(resCount.rows[0].count, 10)
  };
}

/**
 * Marcar notificação por ID como Lida.
 */
async function markAsRead(id) {
  const query = `
    UPDATE notificacoes
    SET status = 'Lida', lida_em = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Marcar todas as notificações como Lidas.
 */
async function markAllAsRead(usuarioId) {
  const query = `
    UPDATE notificacoes
    SET status = 'Lida', lida_em = CURRENT_TIMESTAMP
    WHERE status = 'Não Lida' AND (usuario_id = $1 OR usuario_id IS NULL)
    RETURNING id
  `;
  const result = await db.query(query, [usuarioId]);
  return result.rows;
}

/**
 * Arquivar notificação (mudar status para 'Arquivada').
 */
async function archive(id) {
  const query = `
    UPDATE notificacoes
    SET status = 'Arquivada'
    WHERE id = $1
    RETURNING *
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Contar total de notificações 'Não Lida'.
 */
async function getUnreadCount(usuarioId) {
  const query = `
    SELECT COUNT(id) AS total FROM notificacoes
    WHERE status = 'Não Lida' AND (usuario_id = $1 OR usuario_id IS NULL)
  `;
  const result = await db.query(query, [usuarioId]);
  return parseInt(result.rows[0].total, 10);
}

/**
 * Obter métricas rápidas (cards superiores do painel).
 */
async function getMetrics(usuarioId) {
  const query = `
    SELECT
      COUNT(id) AS total,
      SUM(CASE WHEN status = 'Não Lida' THEN 1 ELSE 0 END) AS nao_lidas,
      SUM(CASE WHEN prioridade = 'Crítica' AND status = 'Não Lida' THEN 1 ELSE 0 END) AS criticas,
      SUM(CASE WHEN created_at::date = CURRENT_DATE THEN 1 ELSE 0 END) AS hoje
    FROM notificacoes
    WHERE (usuario_id = $1 OR usuario_id IS NULL) AND status != 'Arquivada'
  `;
  const result = await db.query(query, [usuarioId]);
  const row = result.rows[0];

  return {
    total: parseInt(row.total || 0, 10),
    nao_lidas: parseInt(row.nao_lidas || 0, 10),
    criticas: parseInt(row.criticas || 0, 10),
    hoje: parseInt(row.hoje || 0, 10)
  };
}

/**
 * Inserir nova notificação.
 */
async function create(data) {
  const { usuario_id, categoria, titulo, descricao, prioridade, status, entidade, registro_id } = data;
  const query = `
    INSERT INTO notificacoes (
      usuario_id, categoria, titulo, descricao, prioridade, status, entidade, registro_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await db.query(query, [
    usuario_id || null, 
    categoria, 
    titulo, 
    descricao, 
    prioridade || 'Média', 
    status || 'Não Lida', 
    entidade || null, 
    registro_id || null
  ]);
  return result.rows[0];
}

/**
 * Verificar se já existe notificação idêntica inserida nas últimas 24h.
 */
async function checkDuplicate(categoria, entidade, registro_id, titulo) {
  let query = `
    SELECT id FROM notificacoes
    WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND categoria = $1
      AND titulo = $2
  `;
  const params = [categoria, titulo];

  if (entidade) {
    query += ` AND entidade = $3`;
    params.push(entidade);
  } else {
    query += ` AND entidade IS NULL`;
  }

  if (registro_id) {
    query += ` AND registro_id = $${params.length + 1}`;
    params.push(registro_id);
  } else {
    query += ` AND registro_id IS NULL`;
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
}

module.exports = {
  findById,
  listAll,
  listUnread,
  markAsRead,
  markAllAsRead,
  archive,
  getUnreadCount,
  getMetrics,
  create,
  checkDuplicate
};
