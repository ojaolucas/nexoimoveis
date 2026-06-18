const db = require('../config/database');

/**
 * Build WHERE clause based on provided filters.
 * Supported filters: tipo (string or array), imovelId, responsavelId, status, periodo (object with start and end ISO dates).
 */
function buildWhereClause(filters, params) {
  let clauses = [];
  let idx = params.length + 1;
  if (filters.evento_id) {
    clauses.push(`evento_id = $${idx++}`);
    params.push(filters.evento_id);
  }
  if (filters.tipo) {
    if (Array.isArray(filters.tipo)) {
      const placeholders = filters.tipo.map(() => `$${idx++}`).join(', ');
      clauses.push(`tipo IN (${placeholders})`);
      params.push(...filters.tipo);
    } else {
      clauses.push(`tipo = $${idx++}`);
      params.push(filters.tipo);
    }
  }
  if (filters.imovelId) {
    clauses.push(`imovel_id = $${idx++}`);
    params.push(filters.imovelId);
  }
  if (filters.responsavelId) {
    clauses.push(`responsavel_id = $${idx++}`);
    params.push(filters.responsavelId);
  }
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      const placeholders = filters.status.map(() => `$${idx++}`).join(', ');
      clauses.push(`status IN (${placeholders})`);
      params.push(...filters.status);
    } else {
      clauses.push(`status = $${idx++}`);
      params.push(filters.status);
    }
  }
  if (filters.periodo && filters.periodo.start && filters.periodo.end) {
    clauses.push(`data_inicio >= $${idx++}`);
    params.push(filters.periodo.start);
    clauses.push(`data_fim <= $${idx++}`);
    params.push(filters.periodo.end);
  }
  return clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
}

/**
 * Fetch events with optional filters, pagination and ordering.
 */
async function buscarEventos({ filters = {}, limit = 100, offset = 0, order = 'data_inicio ASC' }) {
  const params = [];
  const where = buildWhereClause(filters, params);
  const query = `
    SELECT * FROM view_calendario_eventos
    ${where}
    ORDER BY ${order}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Count events that are overdue (data_fim < today and status not 'Concluída'/'Cancelada').
 */
async function contarEventosAtrasados() {
  const query = `
    SELECT COUNT(*) AS total FROM view_calendario_eventos
    WHERE data_fim < CURRENT_DATE AND status NOT IN ('Concluída', 'Cancelada')`;
  const result = await db.query(query);
  return parseInt(result.rows[0].total, 10);
}

/**
 * Count events for a given period (used for month/weekly/daily views).
 */
async function contarEventosPorPeriodo(startDate, endDate) {
  const query = `
    SELECT COUNT(*) AS total FROM view_calendario_eventos
    WHERE data_inicio >= $1 AND data_fim <= $2`;
  const result = await db.query(query, [startDate, endDate]);
  return parseInt(result.rows[0].total, 10);
}

module.exports = {
  buscarEventos,
  contarEventosAtrasados,
  contarEventosPorPeriodo,
};
