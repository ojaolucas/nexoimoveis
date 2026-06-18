const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT m.*, 
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo
    FROM manutencoes m
    JOIN imoveis i ON m.imovel_id = i.id
    WHERE m.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function create(m) {
  const { 
    codigo, imovel_id, tipo, titulo, descricao, data_solicitacao, 
    data_prevista, data_inicio, responsavel, fornecedor_nome, 
    fornecedor_telefone, fornecedor_email, fornecedor_observacoes, 
    valor_previsto, status 
  } = m;

  const query = `
    INSERT INTO manutencoes (
      codigo, imovel_id, tipo, titulo, descricao, data_solicitacao, 
      data_prevista, data_inicio, responsavel, fornecedor_nome, 
      fornecedor_telefone, fornecedor_email, fornecedor_observacoes, 
      valor_previsto, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;
  
  const result = await db.query(query, [
    codigo, imovel_id, tipo, titulo, descricao, data_solicitacao,
    data_prevista || null, data_inicio || null, responsavel, 
    fornecedor_nome || null, fornecedor_telefone || null, 
    fornecedor_email || null, fornecedor_observacoes || null,
    valor_previsto || 0, status || 'Planejada'
  ]);
  return result.rows[0];
}

async function update(id, m) {
  const { 
    tipo, titulo, descricao, data_solicitacao, data_prevista, 
    data_inicio, data_conclusao, responsavel, fornecedor_nome, 
    fornecedor_telefone, fornecedor_email, fornecedor_observacoes, 
    valor_previsto, valor_real, observacoes, status 
  } = m;

  const query = `
    UPDATE manutencoes
    SET tipo = $1, 
        titulo = $2, 
        descricao = $3, 
        data_solicitacao = $4, 
        data_prevista = $5, 
        data_inicio = $6, 
        data_conclusao = $7, 
        responsavel = $8, 
        fornecedor_nome = $9, 
        fornecedor_telefone = $10, 
        fornecedor_email = $11, 
        fornecedor_observacoes = $12, 
        valor_previsto = $13, 
        valor_real = $14, 
        observacoes = $15, 
        status = $16,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $17
    RETURNING *
  `;

  const result = await db.query(query, [
    tipo, titulo, descricao, data_solicitacao, data_prevista || null,
    data_inicio || null, data_conclusao || null, responsavel,
    fornecedor_nome || null, fornecedor_telefone || null,
    fornecedor_email || null, fornecedor_observacoes || null,
    valor_previsto || 0, valor_real || null, observacoes || null,
    status, id
  ]);
  return result.rows[0];
}

async function setStatus(id, status) {
  const query = `
    UPDATE manutencoes
    SET status = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT m.*, 
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo
    FROM manutencoes m
    JOIN imoveis i ON m.imovel_id = i.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.imovel) {
    query += ` AND m.imovel_id = $${paramCount}`;
    params.push(filters.imovel);
    paramCount++;
  }

  if (filters.tipo) {
    query += ` AND m.tipo = $${paramCount}`;
    params.push(filters.tipo);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND m.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.data_inicial) {
    query += ` AND m.data_prevista >= $${paramCount}`;
    params.push(filters.data_inicial);
    paramCount++;
  }

  if (filters.data_final) {
    query += ` AND m.data_prevista <= $${paramCount}`;
    params.push(filters.data_final);
    paramCount++;
  }

  if (filters.busca) {
    query += ` AND (m.titulo ILIKE $${paramCount} OR m.codigo ILIKE $${paramCount} OR i.nome ILIKE $${paramCount})`;
    params.push(`%${filters.busca}%`);
    paramCount++;
  }

  let countQuery = `
    SELECT COUNT(m.id)
    FROM manutencoes m
    JOIN imoveis i ON m.imovel_id = i.id
    WHERE 1=1
  `;
  let countParamIndex = 1;
  const countParams = [];

  if (filters.imovel) {
    countQuery += ` AND m.imovel_id = $${countParamIndex}`;
    countParams.push(filters.imovel);
    countParamIndex++;
  }
  if (filters.tipo) {
    countQuery += ` AND m.tipo = $${countParamIndex}`;
    countParams.push(filters.tipo);
    countParamIndex++;
  }
  if (filters.status) {
    countQuery += ` AND m.status = $${countParamIndex}`;
    countParams.push(filters.status);
    countParamIndex++;
  }
  if (filters.data_inicial) {
    countQuery += ` AND m.data_prevista >= $${countParamIndex}`;
    countParams.push(filters.data_inicial);
    countParamIndex++;
  }
  if (filters.data_final) {
    countQuery += ` AND m.data_prevista <= $${countParamIndex}`;
    countParams.push(filters.data_final);
    countParamIndex++;
  }
  if (filters.busca) {
    countQuery += ` AND (m.titulo ILIKE $${countParamIndex} OR m.codigo ILIKE $${countParamIndex} OR i.nome ILIKE $${countParamIndex})`;
    countParams.push(`%${filters.busca}%`);
  }

  query += ` ORDER BY m.criado_em DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

// --- Anexos Satélite ---

async function listAnexos(manutencaoId) {
  const query = `
    SELECT * FROM manutencoes_anexos
    WHERE manutencao_id = $1
    ORDER BY criado_em ASC
  `;
  const result = await db.query(query, [manutencaoId]);
  return result.rows;
}

async function addAnexo(manutencaoId, tipoAnexo, nomeArquivo, caminhoArquivo) {
  const query = `
    INSERT INTO manutencoes_anexos (manutencao_id, tipo_anexo, nome_arquivo, caminho_arquivo)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [manutencaoId, tipoAnexo, nomeArquivo, caminhoArquivo]);
  return result.rows[0];
}

async function findAnexoById(id) {
  const query = 'SELECT * FROM manutencoes_anexos WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function removeAnexo(id) {
  const query = 'DELETE FROM manutencoes_anexos WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

// --- Timeline Satélite ---

async function listTimeline(manutencaoId) {
  const query = `
    SELECT t.*, u.nome AS usuario_nome
    FROM manutencoes_timeline t
    LEFT JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.manutencao_id = $1
    ORDER BY t.data_hora DESC
  `;
  const result = await db.query(query, [manutencaoId]);
  return result.rows;
}

async function addTimeline(manutencaoId, usuarioId, acao, descricao) {
  const query = `
    INSERT INTO manutencoes_timeline (manutencao_id, usuario_id, acao, descricao)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [manutencaoId, usuarioId, acao, descricao]);
  return result.rows[0];
}

// --- Cards Upper Stats ---

async function getCardsStats() {
  const query = `
    SELECT
      COUNT(id) AS total_manutencoes,
      SUM(CASE WHEN status = 'Planejada' THEN 1 ELSE 0 END) AS planejadas,
      SUM(CASE WHEN status = 'Em Andamento' THEN 1 ELSE 0 END) AS em_andamento,
      SUM(CASE WHEN status = 'Concluída' THEN 1 ELSE 0 END) AS concluidas,
      COALESCE(SUM(valor_previsto), 0) AS valor_previsto,
      COALESCE(SUM(valor_real), 0) AS valor_real
    FROM manutencoes
    WHERE status != 'Cancelada'
  `;
  const result = await db.query(query);
  const row = result.rows[0];
  
  return {
    total_manutencoes: parseInt(row.total_manutencoes || 0, 10),
    planejadas: parseInt(row.planejadas || 0, 10),
    em_andamento: parseInt(row.em_andamento || 0, 10),
    concluidas: parseInt(row.concluidas || 0, 10),
    valor_previsto: parseFloat(row.valor_previsto),
    valor_real: parseFloat(row.valor_real)
  };
}

// --- Charts Agrupamento ---

async function getGraficosData() {
  // 1. Manutenções por Tipo (Doughnut)
  const queryTipos = `
    SELECT tipo, COUNT(id) AS total
    FROM manutencoes
    WHERE status != 'Cancelada'
    GROUP BY tipo
    ORDER BY total DESC
  `;
  const resTipos = await db.query(queryTipos);

  // 2. Custos por Mês (Bar Chart - últimos 12 meses)
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
      SELECT TO_CHAR(data_conclusao, 'MM/YYYY') AS mes_ano, SUM(valor_real) AS total
      FROM manutencoes
      WHERE status = 'Concluída' AND data_conclusao >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_conclusao, 'MM/YYYY')
    )
    SELECT m.mes_ano, COALESCE(v.total, 0) AS total
    FROM meses m
    LEFT JOIN valores v ON m.mes_ano = v.mes_ano
    ORDER BY m.date_val ASC
  `;
  const resMeses = await db.query(queryMeses);

  // 3. Planejadas x Concluídas (Pie Chart)
  const queryStatus = `
    SELECT status, COUNT(id) AS total
    FROM manutencoes
    WHERE status IN ('Planejada', 'Concluída')
    GROUP BY status
  `;
  const resStatus = await db.query(queryStatus);

  return {
    tipos: {
      labels: resTipos.rows.map(r => r.tipo),
      valores: resTipos.rows.map(r => parseInt(r.total, 10))
    },
    meses: {
      labels: resMeses.rows.map(r => r.mes_ano),
      valores: resMeses.rows.map(r => parseFloat(r.total))
    },
    status: {
      labels: resStatus.rows.map(r => r.status),
      valores: resStatus.rows.map(r => parseInt(r.total, 10))
    }
  };
}

async function listByImovel(imovelId) {
  const query = `
    SELECT id, codigo, tipo, titulo, data_prevista, valor_real, status, criado_em
    FROM manutencoes
    WHERE imovel_id = $1
    ORDER BY data_prevista DESC, criado_em DESC
  `;
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

module.exports = {
  findById,
  create,
  update,
  setStatus,
  listAll,
  listAnexos,
  addAnexo,
  findAnexoById,
  removeAnexo,
  listTimeline,
  addTimeline,
  getCardsStats,
  getGraficosData,
  listByImovel
};
