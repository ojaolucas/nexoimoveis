const db = require('../config/database');

async function getReceitas(filters = {}) {
  let query = `
    SELECT 
      i.nome AS imovel_nome,
      l.nome_razao_social AS locatario_nome,
      r.competencia,
      r.vencimento,
      r.valor_previsto,
      r.valor_recebido,
      r.data_pagamento,
      r.forma_pagamento,
      r.status,
      r.observacoes
    FROM recebimentos r
    JOIN contratos c ON r.contrato_id = c.id
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN pessoas l ON c.locatario_id = l.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND r.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }
  if (filters.data_inicio) {
    query += ` AND r.vencimento >= $${paramCount}`;
    params.push(filters.data_inicio);
    paramCount++;
  }
  if (filters.data_fim) {
    query += ` AND r.vencimento <= $${paramCount}`;
    params.push(filters.data_fim);
    paramCount++;
  }
  if (filters.imovel_id) {
    query += ` AND c.imovel_id = $${paramCount}`;
    params.push(filters.imovel_id);
    paramCount++;
  }

  query += ` ORDER BY r.vencimento DESC`;
  const result = await db.query(query, params);
  return result.rows;
}

async function getDespesas(filters = {}) {
  let query = `
    SELECT 
      i.nome AS imovel_nome,
      d.categoria,
      d.responsavel,
      d.competencia,
      d.vencimento,
      d.valor,
      d.data_pagamento,
      d.status,
      d.observacoes
    FROM despesas d
    JOIN imoveis i ON d.imovel_id = i.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND d.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }
  if (filters.categoria) {
    query += ` AND d.categoria = $${paramCount}`;
    params.push(filters.categoria);
    paramCount++;
  }
  if (filters.data_inicio) {
    query += ` AND d.vencimento >= $${paramCount}`;
    params.push(filters.data_inicio);
    paramCount++;
  }
  if (filters.data_fim) {
    query += ` AND d.vencimento <= $${paramCount}`;
    params.push(filters.data_fim);
    paramCount++;
  }
  if (filters.imovel_id) {
    query += ` AND d.imovel_id = $${paramCount}`;
    params.push(filters.imovel_id);
    paramCount++;
  }

  query += ` ORDER BY d.vencimento DESC`;
  const result = await db.query(query, params);
  return result.rows;
}

async function getFinanceiroPorImovel(filters = {}) {
  let query = `
    SELECT 
      i.id AS imovel_id,
      i.nome AS imovel_nome,
      COALESCE(r.total_receitas, 0) AS total_receitas,
      COALESCE(d.total_despesas, 0) AS total_despesas,
      (COALESCE(r.total_receitas, 0) - COALESCE(d.total_despesas, 0)) AS saldo
    FROM imoveis i
    LEFT JOIN (
      SELECT c.imovel_id, SUM(COALESCE(rec.valor_recebido, 0)) AS total_receitas
      FROM recebimentos rec
      JOIN contratos c ON rec.contrato_id = c.id
      WHERE rec.status = 'Pago'
      GROUP BY c.imovel_id
    ) r ON i.id = r.imovel_id
    LEFT JOIN (
      SELECT desp.imovel_id, SUM(desp.valor) AS total_despesas
      FROM despesas desp
      WHERE desp.status = 'Pago'
      GROUP BY desp.imovel_id
    ) d ON i.id = d.imovel_id
    WHERE i.status != 'Inativo'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.imovel_id) {
    query += ` AND i.id = $${paramCount}`;
    params.push(filters.imovel_id);
    paramCount++;
  }

  query += ` ORDER BY i.nome ASC`;
  const result = await db.query(query, params);
  return result.rows;
}

async function getInadimplencia(filters = {}) {
  let query = `
    SELECT 
      i.nome AS imovel_nome,
      l.nome_razao_social AS locatario_nome,
      r.competencia,
      r.vencimento,
      r.valor_previsto,
      (CURRENT_DATE - r.vencimento) AS dias_atraso
    FROM recebimentos r
    JOIN contratos c ON r.contrato_id = c.id
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN pessoas l ON c.locatario_id = l.id
    WHERE r.status = 'Vencido'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.imovel_id) {
    query += ` AND c.imovel_id = $${paramCount}`;
    params.push(filters.imovel_id);
    paramCount++;
  }

  query += ` ORDER BY r.vencimento ASC`;
  const result = await db.query(query, params);
  return result.rows;
}

async function getContratos(filters = {}) {
  let query = `
    SELECT 
      i.nome AS imovel_nome,
      l.nome_razao_social AS locatario_nome,
      c.data_inicio,
      c.data_fim,
      c.valor_mensal,
      c.status
    FROM contratos c
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN pessoas l ON c.locatario_id = l.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND c.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }
  if (filters.imovel_id) {
    query += ` AND c.imovel_id = $${paramCount}`;
    params.push(filters.imovel_id);
    paramCount++;
  }

  query += ` ORDER BY c.data_inicio DESC`;
  const result = await db.query(query, params);
  return result.rows;
}

async function getOcupacao(filters = {}) {
  let query = `
    SELECT 
      i.nome AS imovel_nome,
      i.tipo,
      i.status,
      i.valor_locacao,
      l.nome_razao_social AS locatario_nome
    FROM imoveis i
    LEFT JOIN contratos c ON c.imovel_id = i.id AND c.status = 'Ativo'
    LEFT JOIN pessoas l ON c.locatario_id = l.id
    WHERE i.status != 'Inativo'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND i.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  query += ` ORDER BY i.nome ASC`;
  const result = await db.query(query, params);
  return result.rows;
}

async function getImoveis(filters = {}) {
  let query = `
    SELECT 
      i.nome AS imovel_nome,
      i.tipo,
      i.status,
      i.area_total,
      i.valor_locacao,
      i.endereco,
      p.nome_razao_social AS proprietario_nome
    FROM imoveis i
    JOIN pessoas p ON i.proprietario_id = p.id
    WHERE i.status != 'Inativo'
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND i.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }
  if (filters.tipo) {
    query += ` AND i.tipo = $${paramCount}`;
    params.push(filters.tipo);
    paramCount++;
  }

  query += ` ORDER BY i.nome ASC`;
  const result = await db.query(query, params);
  return result.rows;
}

module.exports = {
  getReceitas,
  getDespesas,
  getFinanceiroPorImovel,
  getInadimplencia,
  getContratos,
  getOcupacao,
  getImoveis
};
