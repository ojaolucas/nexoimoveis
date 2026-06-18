const db = require('../config/database');

/**
 * Helper to build WHERE clause based on filters object.
 * Returns { clause: string, params: array }
 */
function buildWhere(filters, startIndex = 1) {
  let clause = '';
  const params = [];
  let idx = startIndex;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    switch (key) {
      case 'status':
        clause += ` AND status = $${idx}`;
        params.push(value);
        idx++; break;
      case 'imovel':
        clause += ` AND imovel_id = $${idx}`;
        params.push(value);
        idx++; break;
      case 'locatario':
        clause += ` AND locatario_id = $${idx}`;
        params.push(value);
        idx++; break;
      case 'proprietario':
        clause += ` AND proprietario_id = $${idx}`;
        params.push(value);
        idx++; break;
      case 'periodo':
        // expecting { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
        if (value.start) {
          clause += ` AND data >= $${idx}`;
          params.push(value.start);
          idx++;
        }
        if (value.end) {
          clause += ` AND data <= $${idx}`;
          params.push(value.end);
          idx++;
        }
        break;
      case 'categoria':
        clause += ` AND categoria = $${idx}`;
        params.push(value);
        idx++; break;
      case 'responsavel':
        clause += ` AND responsavel_id = $${idx}`;
        params.push(value);
        idx++; break;
    }
  }
  return { clause, params };
}

/** Imóveis */
async function listarImoveis(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT * FROM imoveis WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Proprietários */
async function listarProprietarios(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT p.*, COUNT(i.id) AS imoveis_qtd, SUM(i.valor_locacao) AS valor_total_locacoes FROM proprietarios p LEFT JOIN imoveis i ON i.proprietario_id = p.id WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} GROUP BY p.id ORDER BY p.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Locatários */
async function listarLocatarios(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT l.*, COUNT(c.id) AS contratos_qtd, COUNT(i.id) AS imoveis_qtd FROM locatarios l LEFT JOIN contratos c ON c.locatario_id = l.id LEFT JOIN imoveis i ON c.imovel_id = i.id WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} GROUP BY l.id ORDER BY l.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Contratos */
async function listarContratos(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT * FROM contratos WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Recebimentos */
async function listarRecebimentos(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT * FROM recebimentos WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} ORDER BY data_vencimento DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Despesas */
async function listarDespesas(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT * FROM despesas WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} ORDER BY data_vencimento DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Manutenções */
async function listarManutencoes(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT * FROM manutencoes WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} ORDER BY data_prevista DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Vistorias */
async function listarVistorias(filtros = {}, limit = 50, offset = 0) {
  const base = `SELECT * FROM vistorias WHERE 1=1`;
  const { clause, params } = buildWhere(filtros, 1);
  const query = `${base}${clause} ORDER BY data_vistoria DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const allParams = [...params, limit, offset];
  const result = await db.query(query, allParams);
  return result.rows;
}

/** Ocupação */
async function obterOcupacao() {
  const query = 'SELECT * FROM vw_relatorio_ocupacao';
  const result = await db.query(query);
  return result.rows[0];
}

/** Inadimplência */
async function obterInadimplencia(filtros = {}) {
  const { clause, params } = buildWhere(filtros, 1);
  const query = `SELECT * FROM vw_relatorio_inadimplencia WHERE 1=1${clause}`;
  const result = await db.query(query, params);
  return result.rows;
}

/** Fluxo de Caixa */
async function obterFluxoCaixa() {
  const query = 'SELECT * FROM vw_relatorio_fluxo_caixa';
  const result = await db.query(query);
  return result.rows;
}

/** Financeiro (resumo geral) */
async function obterFinanceiro() {
  const query = 'SELECT * FROM vw_relatorio_financeiro';
  const result = await db.query(query);
  return result.rows;
}

module.exports = {
  listarImoveis,
  listarProprietarios,
  listarLocatarios,
  listarContratos,
  listarRecebimentos,
  listarDespesas,
  listarManutencoes,
  listarVistorias,
  obterOcupacao,
  obterInadimplencia,
  obterFluxoCaixa,
  obterFinanceiro,
};
