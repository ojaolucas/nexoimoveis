const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT d.*, 
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo
    FROM despesas d
    JOIN imoveis i ON d.imovel_id = i.id
    WHERE d.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function create(desp) {
  const { imovel_id, categoria, responsavel, competencia, vencimento, valor, data_pagamento, observacoes, status, recorrente, documento_emissao, documento_vencimento } = desp;
  const query = `
    INSERT INTO despesas (
      imovel_id, categoria, responsavel, competencia, vencimento, valor, 
      data_pagamento, observacoes, status, recorrente, documento_emissao, documento_vencimento
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;
  const result = await db.query(query, [
    imovel_id, 
    categoria, 
    responsavel, 
    competencia, 
    vencimento, 
    valor, 
    data_pagamento || null, 
    observacoes || null, 
    status || 'A Vencer', 
    recorrente || false,
    documento_emissao || null,
    documento_vencimento || null
  ]);
  return result.rows[0];
}

async function update(id, desp) {
  const { categoria, responsavel, competencia, vencimento, valor, data_pagamento, observacoes, status, recorrente, documento_emissao, documento_vencimento } = desp;
  const query = `
    UPDATE despesas
    SET categoria = $1, 
        responsavel = $2, 
        competencia = $3, 
        vencimento = $4, 
        valor = $5, 
        data_pagamento = $6, 
        observacoes = $7, 
        status = $8, 
        recorrente = $9,
        documento_emissao = $10,
        documento_vencimento = $11
    WHERE id = $12
    RETURNING *
  `;
  const result = await db.query(query, [
    categoria, 
    responsavel, 
    competencia, 
    vencimento, 
    valor, 
    data_pagamento || null, 
    observacoes || null, 
    status, 
    recorrente,
    documento_emissao || null,
    documento_vencimento || null,
    id
  ]);
  return result.rows[0];
}

async function setStatus(id, status) {
  const query = `
    UPDATE despesas
    SET status = $1
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT d.*, 
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo
    FROM despesas d
    JOIN imoveis i ON d.imovel_id = i.id
    WHERE 1 = 1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND d.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.imovel) {
    query += ` AND d.imovel_id = $${paramCount}`;
    params.push(filters.imovel);
    paramCount++;
  }

  if (filters.categoria) {
    query += ` AND d.categoria = $${paramCount}`;
    params.push(filters.categoria);
    paramCount++;
  }

  if (filters.responsavel) {
    query += ` AND d.responsavel = $${paramCount}`;
    params.push(filters.responsavel);
    paramCount++;
  }

  if (filters.competencia) {
    query += ` AND TO_CHAR(d.competencia, 'YYYY-MM') = $${paramCount}`;
    params.push(filters.competencia); // Format expected: 'YYYY-MM'
    paramCount++;
  }

  if (filters.data_inicial) {
    query += ` AND d.vencimento >= $${paramCount}`;
    params.push(filters.data_inicial);
    paramCount++;
  }

  if (filters.data_final) {
    query += ` AND d.vencimento <= $${paramCount}`;
    params.push(filters.data_final);
    paramCount++;
  }

  let countQuery = `
    SELECT COUNT(d.id)
    FROM despesas d
    JOIN imoveis i ON d.imovel_id = i.id
    WHERE 1 = 1
  `;
  
  let countParamIndex = 1;
  const countParams = [];

  if (filters.status) {
    countQuery += ` AND d.status = $${countParamIndex}`;
    countParams.push(filters.status);
    countParamIndex++;
  }
  if (filters.imovel) {
    countQuery += ` AND d.imovel_id = $${countParamIndex}`;
    countParams.push(filters.imovel);
    countParamIndex++;
  }
  if (filters.categoria) {
    countQuery += ` AND d.categoria = $${countParamIndex}`;
    countParams.push(filters.categoria);
    countParamIndex++;
  }
  if (filters.responsavel) {
    countQuery += ` AND d.responsavel = $${countParamIndex}`;
    countParams.push(filters.responsavel);
    countParamIndex++;
  }
  if (filters.competencia) {
    countQuery += ` AND TO_CHAR(d.competencia, 'YYYY-MM') = $${countParamIndex}`;
    countParams.push(filters.competencia);
    countParamIndex++;
  }
  if (filters.data_inicial) {
    countQuery += ` AND d.vencimento >= $${countParamIndex}`;
    countParams.push(filters.data_inicial);
    countParamIndex++;
  }
  if (filters.data_final) {
    countQuery += ` AND d.vencimento <= $${countParamIndex}`;
    countParams.push(filters.data_final);
  }

  query += ` ORDER BY d.vencimento ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

// --- Comprovantes Satélite ---

async function listComprovantes(despesaId) {
  const query = `
    SELECT * FROM despesas_comprovantes 
    WHERE despesa_id = $1 
    ORDER BY criado_em ASC
  `;
  const result = await db.query(query, [despesaId]);
  return result.rows;
}

async function addComprovante(despesaId, nomeArquivo, caminhoArquivo) {
  const query = `
    INSERT INTO despesas_comprovantes (despesa_id, nome_arquivo, caminho_arquivo)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await db.query(query, [despesaId, nomeArquivo, caminhoArquivo]);
  return result.rows[0];
}

async function findComprovanteById(id) {
  const query = 'SELECT * FROM despesas_comprovantes WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function removeComprovante(id) {
  const query = 'DELETE FROM despesas_comprovantes WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

// --- Timeline Satélite ---

async function listTimeline(despesaId) {
  const query = `
    SELECT t.*, u.nome AS usuario_nome
    FROM despesas_timeline t
    LEFT JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.despesa_id = $1
    ORDER BY t.data_hora DESC
  `;
  const result = await db.query(query, [despesaId]);
  return result.rows;
}

async function addTimeline(despesaId, usuarioId, acao, descricao) {
  const query = `
    INSERT INTO despesas_timeline (despesa_id, usuario_id, acao, descricao)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [despesaId, usuarioId, acao, descricao]);
  return result.rows[0];
}

// --- Recorrências Satélite ---

async function listRecorrentes() {
  const query = `
    SELECT r.*, i.nome AS imovel_nome, i.codigo AS imovel_codigo
    FROM despesas_recorrencias r
    JOIN imoveis i ON r.imovel_id = i.id
    WHERE r.ativa = TRUE
    ORDER BY r.criado_em DESC
  `;
  const result = await db.query(query);
  return result.rows;
}

async function findRecorrenciaById(id) {
  const query = 'SELECT * FROM despesas_recorrencias WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function createRecorrencia(rec) {
  const { imovel_id, categoria, responsavel, dia_vencimento, valor, frequencia, observacoes } = rec;
  const query = `
    INSERT INTO despesas_recorrencias (imovel_id, categoria, responsavel, dia_vencimento, valor, frequencia, observacoes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const result = await db.query(query, [imovel_id, categoria, responsavel, dia_vencimento, valor, frequencia, observacoes || null]);
  return result.rows[0];
}

async function updateRecorrencia(id, rec) {
  const { categoria, responsavel, dia_vencimento, valor, frequencia, observacoes, ativa } = rec;
  const query = `
    UPDATE despesas_recorrencias
    SET categoria = $1, responsavel = $2, dia_vencimento = $3, valor = $4, frequencia = $5, observacoes = $6, ativa = $7, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;
  const result = await db.query(query, [categoria, responsavel, dia_vencimento, valor, frequencia, observacoes, ativa, id]);
  return result.rows[0];
}

async function updateRecorrenciaUltimaGeracao(id, dateVal) {
  const query = `
    UPDATE despesas_recorrencias
    SET ultima_geracao = $1
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [dateVal, id]);
  return result.rows[0];
}

// --- Cards estatísticos de topo ---

async function getCardsStats() {
  const query = `
    SELECT
      -- 1. Despesas do Mês (soma de previstas e pagas no mês corrente)
      COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM competencia) = EXTRACT(MONTH FROM CURRENT_DATE)
                         AND EXTRACT(YEAR FROM competencia) = EXTRACT(YEAR FROM CURRENT_DATE)
                         AND status != 'Cancelado' THEN valor ELSE 0 END), 0) AS despesas_mes,
      
      -- 2. Despesas Pagas (soma paga no mês corrente)
      COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM data_pagamento) = EXTRACT(MONTH FROM CURRENT_DATE)
                         AND EXTRACT(YEAR FROM data_pagamento) = EXTRACT(YEAR FROM CURRENT_DATE)
                         AND status = 'Pago' THEN valor ELSE 0 END), 0) AS despesas_pagas,
      
      -- 3. Despesas em Aberto (soma não paga de parcelas a vencer no mês)
      COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM competencia) = EXTRACT(MONTH FROM CURRENT_DATE)
                         AND EXTRACT(YEAR FROM competencia) = EXTRACT(YEAR FROM CURRENT_DATE)
                         AND status = 'A Vencer' THEN valor ELSE 0 END), 0) AS despesas_aberto,
      
      -- 4. Despesas Vencidas (soma total em atraso)
      COALESCE(SUM(CASE WHEN status = 'Vencido' THEN valor ELSE 0 END), 0) AS despesas_vencidas,
      
      -- 5. Quantidade de Despesas (contagem geral de lançamentos no mês)
      COUNT(CASE WHEN EXTRACT(MONTH FROM competencia) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM competencia) = EXTRACT(YEAR FROM CURRENT_DATE)
                  AND status != 'Cancelado' THEN 1 END) AS qtd_despesas
    FROM despesas
  `;
  const result = await db.query(query);
  const row = result.rows[0];

  return {
    despesas_mes: parseFloat(row.despesas_mes),
    despesas_pagas: parseFloat(row.despesas_pagas),
    despesas_aberto: parseFloat(row.despesas_aberto),
    despesas_vencidas: parseFloat(row.despesas_vencidas),
    qtd_despesas: parseInt(row.qtd_despesas || 0, 10)
  };
}

// --- Agrupamento para gráficos ---

async function getGraficosData() {
  // 1. Despesas por Categoria (Doughnut)
  const queryCategorias = `
    SELECT categoria, SUM(valor) AS total
    FROM despesas
    WHERE status != 'Cancelado'
    GROUP BY categoria
    ORDER BY total DESC
  `;
  const resCategorias = await db.query(queryCategorias);

  // 2. Despesas por Mês (Bar Chart - últimos 12 meses)
  const queryMeses = `
    WITH meses AS (
      SELECT TO_CHAR(m, 'MM/YYYY') AS mes_ano, m AS date_val
      FROM generate_series(
        CURRENT_DATE - INTERVAL '11 months',
        CURRENT_DATE,
        INTERVAL '1 month'
      ) AS m
    ),
    valores AS (
      SELECT TO_CHAR(competencia, 'MM/YYYY') AS mes_ano, SUM(valor) AS total
      FROM despesas
      WHERE status != 'Cancelado' AND competencia >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(competencia, 'MM/YYYY')
    )
    SELECT m.mes_ano, COALESCE(v.total, 0) AS total
    FROM meses m
    LEFT JOIN valores v ON m.mes_ano = v.mes_ano
    ORDER BY m.date_val ASC
  `;
  const resMeses = await db.query(queryMeses);

  // 3. Despesas Pagas x Vencidas (Pie Chart)
  const queryStatus = `
    SELECT status, SUM(valor) AS total
    FROM despesas
    WHERE status IN ('Pago', 'Vencido')
    GROUP BY status
  `;
  const resStatus = await db.query(queryStatus);

  return {
    categorias: {
      labels: resCategorias.rows.map(r => r.categoria),
      valores: resCategorias.rows.map(r => parseFloat(r.total))
    },
    meses: {
      labels: resMeses.rows.map(r => r.mes_ano),
      valores: resMeses.rows.map(r => parseFloat(r.total))
    },
    status: {
      labels: resStatus.rows.map(r => r.status),
      valores: resStatus.rows.map(r => parseFloat(r.total))
    }
  };
}

module.exports = {
  findById,
  create,
  update,
  setStatus,
  listAll,
  listComprovantes,
  addComprovante,
  findComprovanteById,
  removeComprovante,
  listTimeline,
  addTimeline,
  listRecorrentes,
  findRecorrenciaById,
  createRecorrencia,
  updateRecorrencia,
  updateRecorrenciaUltimaGeracao,
  getCardsStats,
  getGraficosData,
};
