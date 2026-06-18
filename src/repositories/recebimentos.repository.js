const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT r.*, 
           c.numero_contrato,
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo,
           i.endereco AS imovel_endereco,
           l.nome_razao_social AS locatario_nome,
           l.codigo AS locatario_codigo,
           l.cpf_cnpj AS locatario_cpf_cnpj,
           l.telefone AS locatario_telefone,
           l.email AS locatario_email
    FROM recebimentos r
    JOIN contratos c ON r.contrato_id = c.id
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN locatarios l ON c.locatario_id = l.id
    WHERE r.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function create(rec) {
  const { contrato_id, competencia, vencimento, valor_previsto, valor_recebido, data_pagamento, forma_pagamento, observacoes, status } = rec;
  const query = `
    INSERT INTO recebimentos (contrato_id, competencia, vencimento, valor_previsto, valor_recebido, data_pagamento, forma_pagamento, observacoes, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const result = await db.query(query, [
    contrato_id, competencia, vencimento, valor_previsto, valor_recebido || null, data_pagamento || null, forma_pagamento || null, observacoes || null, status || 'A Vencer'
  ]);
  return result.rows[0];
}

async function update(id, rec) {
  const { competencia, vencimento, valor_previsto, valor_recebido, data_pagamento, forma_pagamento, observacoes, status } = rec;
  const query = `
    UPDATE recebimentos
    SET competencia = $1, 
        vencimento = $2, 
        valor_previsto = $3, 
        valor_recebido = $4, 
        data_pagamento = $5, 
        forma_pagamento = $6, 
        observacoes = $7, 
        status = $8
    WHERE id = $9
    RETURNING *
  `;
  const result = await db.query(query, [
    competencia, vencimento, valor_previsto, valor_recebido || null, data_pagamento || null, forma_pagamento || null, observacoes || null, status, id
  ]);
  return result.rows[0];
}

async function setStatus(id, status) {
  const query = `
    UPDATE recebimentos
    SET status = $1
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT r.*, 
           c.numero_contrato,
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo,
           l.nome_razao_social AS locatario_nome,
           l.codigo AS locatario_codigo
    FROM recebimentos r
    JOIN contratos c ON r.contrato_id = c.id
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN locatarios l ON c.locatario_id = l.id
    WHERE 1 = 1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND r.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.contrato) {
    query += ` AND r.contrato_id = $${paramCount}`;
    params.push(filters.contrato);
    paramCount++;
  }

  if (filters.imovel) {
    query += ` AND c.imovel_id = $${paramCount}`;
    params.push(filters.imovel);
    paramCount++;
  }

  if (filters.locatario) {
    query += ` AND c.locatario_id = $${paramCount}`;
    params.push(filters.locatario);
    paramCount++;
  }

  if (filters.competencia) {
    // Exact month/year check or exact date
    query += ` AND r.competencia = $${paramCount}`;
    params.push(filters.competencia);
    paramCount++;
  }

  if (filters.data_inicial) {
    query += ` AND r.vencimento >= $${paramCount}`;
    params.push(filters.data_inicial);
    paramCount++;
  }

  if (filters.data_final) {
    query += ` AND r.vencimento <= $${paramCount}`;
    params.push(filters.data_final);
    paramCount++;
  }

  let countQuery = `
    SELECT COUNT(r.id)
    FROM recebimentos r
    JOIN contratos c ON r.contrato_id = c.id
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN locatarios l ON c.locatario_id = l.id
    WHERE 1 = 1
  `;
  
  let countParamIndex = 1;
  const countParams = [];

  if (filters.status) {
    countQuery += ` AND r.status = $${countParamIndex}`;
    countParams.push(filters.status);
    countParamIndex++;
  }
  if (filters.contrato) {
    countQuery += ` AND r.contrato_id = $${countParamIndex}`;
    countParams.push(filters.contrato);
    countParamIndex++;
  }
  if (filters.imovel) {
    countQuery += ` AND c.imovel_id = $${countParamIndex}`;
    countParams.push(filters.imovel);
    countParamIndex++;
  }
  if (filters.locatario) {
    countQuery += ` AND c.locatario_id = $${countParamIndex}`;
    countParams.push(filters.locatario);
    countParamIndex++;
  }
  if (filters.competencia) {
    countQuery += ` AND r.competencia = $${countParamIndex}`;
    countParams.push(filters.competencia);
    countParamIndex++;
  }
  if (filters.data_inicial) {
    countQuery += ` AND r.vencimento >= $${countParamIndex}`;
    countParams.push(filters.data_inicial);
    countParamIndex++;
  }
  if (filters.data_final) {
    countQuery += ` AND r.vencimento <= $${countParamIndex}`;
    countParams.push(filters.data_final);
  }

  query += ` ORDER BY r.vencimento ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const [resList, resCount] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, countParams)
  ]);

  return {
    rows: resList.rows,
    total: parseInt(resCount.rows[0].count, 10),
  };
}

// --- Payments satelite ---

async function listPayments(recebimentoId) {
  const query = `
    SELECT p.*, u.nome AS usuario_nome
    FROM recebimentos_pagamentos p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.recebimento_id = $1
    ORDER BY p.data_pagamento ASC, p.criado_em ASC
  `;
  const result = await db.query(query, [recebimentoId]);
  return result.rows;
}

async function addPayment(recebimentoId, valor, dataPagamento, formaPagamento, usuarioId, observacoes) {
  const query = `
    INSERT INTO recebimentos_pagamentos (recebimento_id, valor, data_pagamento, forma_pagamento, usuario_id, observacoes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await db.query(query, [recebimentoId, valor, dataPagamento, formaPagamento, usuarioId, observacoes || null]);
  return result.rows[0];
}

async function findPaymentById(paymentId) {
  const query = 'SELECT * FROM recebimentos_pagamentos WHERE id = $1';
  const result = await db.query(query, [paymentId]);
  return result.rows[0] || null;
}

async function setPaymentEstornado(paymentId) {
  const query = `
    UPDATE recebimentos_pagamentos 
    SET estornado = TRUE, data_estorno = CURRENT_TIMESTAMP 
    WHERE id = $1
    RETURNING *
  `;
  const result = await db.query(query, [paymentId]);
  return result.rows[0] || null;
}

// --- Timeline ---

async function listTimeline(recebimentoId) {
  const query = `
    SELECT t.*, u.nome AS usuario_nome
    FROM recebimentos_timeline t
    LEFT JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.recebimento_id = $1
    ORDER BY t.data_hora DESC
  `;
  const result = await db.query(query, [recebimentoId]);
  return result.rows;
}

async function addTimeline(recebimentoId, usuarioId, acao, descricao) {
  const query = `
    INSERT INTO recebimentos_timeline (recebimento_id, usuario_id, acao, descricao)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [recebimentoId, usuarioId, acao, descricao]);
  return result.rows[0];
}

// --- Dynamic cards stats ---

async function getCardsStats() {
  const query = `
    SELECT 
      -- 1. Receita Prevista do mês corrente
      COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM vencimento) = EXTRACT(MONTH FROM CURRENT_DATE) 
                         AND EXTRACT(YEAR FROM vencimento) = EXTRACT(YEAR FROM CURRENT_DATE) 
                         AND status != 'Cancelado' THEN valor_previsto ELSE 0 END), 0) AS prevista_mes,
      
      -- 2. Receita Recebida do mês corrente
      COALESCE(SUM(CASE WHEN status IN ('Pago', 'Parcial') THEN COALESCE(valor_recebido, 0) ELSE 0 END), 0) AS recebida_total, -- will be filtered in service for payments made in current month
      
      -- 3. Receita em Atraso (Vencidas)
      COALESCE(SUM(CASE WHEN status = 'Vencido' THEN (valor_previsto - COALESCE(valor_recebido, 0)) ELSE 0 END), 0) AS atraso_total,
      
      -- 4. Contagem de Recebimentos do mês corrente
      COUNT(CASE WHEN EXTRACT(MONTH FROM vencimento) = EXTRACT(MONTH FROM CURRENT_DATE) 
                  AND EXTRACT(YEAR FROM vencimento) = EXTRACT(YEAR FROM CURRENT_DATE) 
                  AND status != 'Cancelado' THEN 1 END) AS count_mes,
                  
      -- 5. Contagem de Vencidos
      COUNT(CASE WHEN status = 'Vencido' THEN 1 END) AS count_vencidos
    FROM recebimentos
  `;
  const res = await db.query(query);
  const row = res.rows[0];

  // For Receita Recebida (paid inside the month, sum from payments table)
  const queryReceivedMonth = `
    SELECT COALESCE(SUM(valor), 0) AS recebida_mes
    FROM recebimentos_pagamentos
    WHERE estornado = FALSE 
      AND EXTRACT(MONTH FROM data_pagamento) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM data_pagamento) = EXTRACT(YEAR FROM CURRENT_DATE)
  `;
  const resRec = await db.query(queryReceivedMonth);
  const recebidaMes = parseFloat(resRec.rows[0].recebida_mes || 0);

  // In aberto = prevista_mes - recebida_mes (approximate for current month billing)
  const inAberto = Math.max(0, parseFloat(row.prevista_mes) - recebidaMes);

  return {
    receita_prevista: parseFloat(row.prevista_mes),
    receita_recebida: recebidaMes,
    receita_em_aberto: inAberto,
    receita_em_atraso: parseFloat(row.atraso_total),
    recebimentos_mes: parseInt(row.count_mes || 0, 10),
    recebimentos_vencidos: parseInt(row.count_vencidos || 0, 10)
  };
}

// --- Overdue details ---

async function getInadimplencias() {
  const query = `
    SELECT r.*, 
           c.numero_contrato,
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo,
           l.nome_razao_social AS locatario_nome,
           l.codigo AS locatario_codigo,
           (CURRENT_DATE - r.vencimento) AS dias_atraso
    FROM recebimentos r
    JOIN contratos c ON r.contrato_id = c.id
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN locatarios l ON c.locatario_id = l.id
    WHERE r.status = 'Vencido'
    ORDER BY dias_atraso DESC, r.vencimento ASC
  `;
  const result = await db.query(query);
  return result.rows;
}

// --- Forecast groups 12 months ---

async function getFluxoCaixaData() {
  // 12 Months forecast vs payments
  const queryForecast = `
    WITH meses AS (
      SELECT TO_CHAR(m, 'MM/YYYY') AS mes_ano, m AS date_val
      FROM generate_series(
        CURRENT_DATE - INTERVAL '11 months',
        CURRENT_DATE,
        INTERVAL '1 month'
      ) AS m
    ),
    forecast AS (
      SELECT 
        TO_CHAR(vencimento, 'MM/YYYY') AS mes_ano,
        SUM(valor_previsto) AS total_previsto
      FROM recebimentos
      WHERE status != 'Cancelado' AND vencimento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(vencimento, 'MM/YYYY')
    ),
    payments AS (
      SELECT 
        TO_CHAR(p.data_pagamento, 'MM/YYYY') AS mes_ano,
        SUM(p.valor) AS total_recebido
      FROM recebimentos_pagamentos p
      WHERE p.estornado = FALSE AND p.data_pagamento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(p.data_pagamento, 'MM/YYYY')
    )
    SELECT 
      m.mes_ano,
      COALESCE(f.total_previsto, 0) AS previsto,
      COALESCE(p.total_recebido, 0) AS recebido
    FROM meses m
    LEFT JOIN forecast f ON m.mes_ano = f.mes_ano
    LEFT JOIN payments p ON m.mes_ano = p.mes_ano
    ORDER BY m.date_val ASC
  `;
  const resForecast = await db.query(queryForecast);

  // Inadimplência mensal (Expected amount - Received amount for installments of each month, where status = Vencido)
  const queryInadimplencia = `
    WITH meses AS (
      SELECT TO_CHAR(m, 'MM/YYYY') AS mes_ano, m AS date_val
      FROM generate_series(
        CURRENT_DATE - INTERVAL '11 months',
        CURRENT_DATE,
        INTERVAL '1 month'
      ) AS m
    ),
    vencidos AS (
      SELECT 
        TO_CHAR(vencimento, 'MM/YYYY') AS mes_ano,
        SUM(valor_previsto - COALESCE(valor_recebido, 0)) AS total_vencido
      FROM recebimentos
      WHERE status = 'Vencido' AND vencimento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(vencimento, 'MM/YYYY')
    )
    SELECT 
      m.mes_ano,
      COALESCE(v.total_vencido, 0) AS valor
    FROM meses m
    LEFT JOIN vencidos v ON m.mes_ano = v.mes_ano
    ORDER BY m.date_val ASC
  `;
  const resInad = await db.query(queryInadimplencia);

  // Payments by payment method
  const queryMethods = `
    SELECT forma_pagamento, COUNT(id) AS count, SUM(valor) AS total
    FROM recebimentos_pagamentos
    WHERE estornado = FALSE
    GROUP BY forma_pagamento
    ORDER BY total DESC
  `;
  const resMethods = await db.query(queryMethods);

  return {
    forecast: {
      labels: resForecast.rows.map(r => r.mes_ano),
      previstos: resForecast.rows.map(r => parseFloat(r.previsto)),
      recebidos: resForecast.rows.map(r => parseFloat(r.recebido))
    },
    inadimplencia: {
      labels: resInad.rows.map(r => r.mes_ano),
      valores: resInad.rows.map(r => parseFloat(r.valor))
    },
    paymentMethods: {
      labels: resMethods.rows.map(r => r.forma_pagamento),
      valores: resMethods.rows.map(r => parseFloat(r.total))
    }
  };
}

module.exports = {
  findById,
  create,
  update,
  setStatus,
  listAll,
  listPayments,
  addPayment,
  findPaymentById,
  setPaymentEstornado,
  listTimeline,
  addTimeline,
  getCardsStats,
  getInadimplencias,
  getFluxoCaixaData,
};
