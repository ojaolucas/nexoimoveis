const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT v.*, 
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo,
           c.numero_contrato AS contrato_codigo
    FROM vistorias v
    JOIN imoveis i ON v.imovel_id = i.id
    LEFT JOIN contratos c ON v.contrato_id = c.id
    WHERE v.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function create(v) {
  const { 
    codigo, imovel_id, contrato_id, tipo, data_vistoria, 
    responsavel, observacoes_gerais, status 
  } = v;

  const query = `
    INSERT INTO vistorias (
      codigo, imovel_id, contrato_id, tipo, data_vistoria, 
      responsavel, observacoes_gerais, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  
  const result = await db.query(query, [
    codigo, imovel_id, contrato_id || null, tipo, data_vistoria, 
    responsavel, observacoes_gerais || null, status || 'Pendente'
  ]);
  return result.rows[0];
}

async function update(id, v) {
  const { 
    contrato_id, tipo, data_vistoria, responsavel, 
    observacoes_gerais, status 
  } = v;

  const query = `
    UPDATE vistorias
    SET contrato_id = $1, 
        tipo = $2, 
        data_vistoria = $3, 
        responsavel = $4, 
        observacoes_gerais = $5, 
        status = $6,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;

  const result = await db.query(query, [
    contrato_id || null, tipo, data_vistoria, responsavel, 
    observacoes_gerais || null, status, id
  ]);
  return result.rows[0];
}

async function setStatus(id, status) {
  const query = `
    UPDATE vistorias
    SET status = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT v.*, 
           i.nome AS imovel_nome,
           i.codigo AS imovel_codigo,
           c.numero_contrato AS contrato_codigo
    FROM vistorias v
    JOIN imoveis i ON v.imovel_id = i.id
    LEFT JOIN contratos c ON v.contrato_id = c.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.imovel) {
    query += ` AND v.imovel_id = $${paramCount}`;
    params.push(filters.imovel);
    paramCount++;
  }

  if (filters.tipo) {
    query += ` AND v.tipo = $${paramCount}`;
    params.push(filters.tipo);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND v.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.responsavel) {
    query += ` AND v.responsavel ILIKE $${paramCount}`;
    params.push(`%${filters.responsavel}%`);
    paramCount++;
  }

  if (filters.data_inicial) {
    query += ` AND v.data_vistoria >= $${paramCount}`;
    params.push(filters.data_inicial);
    paramCount++;
  }

  if (filters.data_final) {
    query += ` AND v.data_vistoria <= $${paramCount}`;
    params.push(filters.data_final);
    paramCount++;
  }

  if (filters.busca) {
    query += ` AND (v.codigo ILIKE $${paramCount} OR v.responsavel ILIKE $${paramCount} OR i.nome ILIKE $${paramCount})`;
    params.push(`%${filters.busca}%`);
    paramCount++;
  }

  let countQuery = `
    SELECT COUNT(v.id)
    FROM vistorias v
    JOIN imoveis i ON v.imovel_id = i.id
    WHERE 1=1
  `;
  let countParamIndex = 1;
  const countParams = [];

  if (filters.imovel) {
    countQuery += ` AND v.imovel_id = $${countParamIndex}`;
    countParams.push(filters.imovel);
    countParamIndex++;
  }
  if (filters.tipo) {
    countQuery += ` AND v.tipo = $${countParamIndex}`;
    countParams.push(filters.tipo);
    countParamIndex++;
  }
  if (filters.status) {
    countQuery += ` AND v.status = $${countParamIndex}`;
    countParams.push(filters.status);
    countParamIndex++;
  }
  if (filters.responsavel) {
    countQuery += ` AND v.responsavel ILIKE $${countParamIndex}`;
    countParams.push(`%${filters.responsavel}%`);
    countParamIndex++;
  }
  if (filters.data_inicial) {
    countQuery += ` AND v.data_vistoria >= $${countParamIndex}`;
    countParams.push(filters.data_inicial);
    countParamIndex++;
  }
  if (filters.data_final) {
    countQuery += ` AND v.data_vistoria <= $${countParamIndex}`;
    countParams.push(filters.data_final);
    countParamIndex++;
  }
  if (filters.busca) {
    countQuery += ` AND (v.codigo ILIKE $${countParamIndex} OR v.responsavel ILIKE $${countParamIndex} OR i.nome ILIKE $${countParamIndex})`;
    countParams.push(`%${filters.busca}%`);
  }

  query += ` ORDER BY v.criado_em DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

// --- Checklist Items Queries ---

async function listItens(vistoriaId) {
  const query = `
    SELECT * FROM vistorias_itens
    WHERE vistoria_id = $1
    ORDER BY criado_em ASC
  `;
  const result = await db.query(query, [vistoriaId]);
  return result.rows;
}

async function createItem(vistoriaId, itemNome, condicao = 'Bom', observacao = '') {
  const query = `
    INSERT INTO vistorias_itens (vistoria_id, item_nome, condicao, observacao)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [vistoriaId, itemNome, condicao, observacao || null]);
  return result.rows[0];
}

async function updateItem(itemId, condicao, observacao) {
  const query = `
    UPDATE vistorias_itens
    SET condicao = $1, observacao = $2, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await db.query(query, [condicao, observacao || null, itemId]);
  return result.rows[0];
}

// --- Photos Queries ---

async function listFotos(vistoriaId) {
  const query = `
    SELECT * FROM vistorias_fotos
    WHERE vistoria_id = $1
    ORDER BY criado_em ASC
  `;
  const result = await db.query(query, [vistoriaId]);
  return result.rows;
}

async function addFoto(vistoriaId, itemId, tipoFoto, caminhoArquivo) {
  const query = `
    INSERT INTO vistorias_fotos (vistoria_id, item_id, tipo_foto, caminho_arquivo)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [vistoriaId, itemId || null, tipoFoto, caminhoArquivo]);
  return result.rows[0];
}

async function findFotoById(id) {
  const query = 'SELECT * FROM vistorias_fotos WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function removeFoto(id) {
  const query = 'DELETE FROM vistorias_fotos WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

// --- Timeline Queries ---

async function listTimeline(vistoriaId) {
  const query = `
    SELECT t.*, u.nome AS usuario_nome
    FROM vistorias_timeline t
    LEFT JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.vistoria_id = $1
    ORDER BY t.data_hora DESC
  `;
  const result = await db.query(query, [vistoriaId]);
  return result.rows;
}

async function addTimeline(vistoriaId, usuarioId, acao, descricao) {
  const query = `
    INSERT INTO vistorias_timeline (vistoria_id, usuario_id, acao, descricao)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [vistoriaId, usuarioId, acao, descricao]);
  return result.rows[0];
}

// --- Upper Stat Cards ---

async function getCardsStats() {
  const query = `
    SELECT
      COUNT(id) AS total_vistorias,
      SUM(CASE WHEN tipo = 'Entrada' THEN 1 ELSE 0 END) AS entradas,
      SUM(CASE WHEN tipo = 'Saída' THEN 1 ELSE 0 END) AS saidas,
      SUM(CASE WHEN status = 'Pendente' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status = 'Concluída' THEN 1 ELSE 0 END) AS concluidas
    FROM vistorias
    WHERE status != 'Cancelada'
  `;
  const result = await db.query(query);
  const row = result.rows[0];
  
  return {
    total_vistorias: parseInt(row.total_vistorias || 0, 10),
    entradas: parseInt(row.entradas || 0, 10),
    saidas: parseInt(row.saidas || 0, 10),
    pendentes: parseInt(row.pendentes || 0, 10),
    concluidas: parseInt(row.concluidas || 0, 10)
  };
}

// --- Chart metrics ---

async function getGraficosData() {
  // 1. Vistorias por Tipo (Doughnut)
  const queryTipos = `
    SELECT tipo, COUNT(id) AS total
    FROM vistorias
    WHERE status != 'Cancelada'
    GROUP BY tipo
    ORDER BY total DESC
  `;
  const resTipos = await db.query(queryTipos);

  // 2. Vistorias por Mês (Bar Chart - últimos 12 meses)
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
      SELECT TO_CHAR(data_vistoria, 'MM/YYYY') AS mes_ano, COUNT(id) AS total
      FROM vistorias
      WHERE status = 'Concluída' AND data_vistoria >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_vistoria, 'MM/YYYY')
    )
    SELECT m.mes_ano, COALESCE(v.total, 0) AS total
    FROM meses m
    LEFT JOIN valores v ON m.mes_ano = v.mes_ano
    ORDER BY m.date_val ASC
  `;
  const resMeses = await db.query(queryMeses);

  // 3. Condições Encontradas (Pie Chart)
  const queryCondicoes = `
    SELECT condicao, COUNT(id) AS total
    FROM vistorias_itens
    WHERE condicao IN ('Excelente', 'Bom', 'Regular', 'Ruim', 'Necessita Reparo')
    GROUP BY condicao
    ORDER BY total DESC
  `;
  const resCondicoes = await db.query(queryCondicoes);

  return {
    tipos: {
      labels: resTipos.rows.map(r => r.tipo),
      valores: resTipos.rows.map(r => parseInt(r.total, 10))
    },
    meses: {
      labels: resMeses.rows.map(r => r.mes_ano),
      valores: resMeses.rows.map(r => parseInt(r.total, 10))
    },
    condicoes: {
      labels: resCondicoes.rows.map(r => r.condicao),
      valores: resCondicoes.rows.map(r => parseInt(r.total, 10))
    }
  };
}

async function listByImovel(imovelId) {
  const query = `
    SELECT id, codigo, tipo, data_vistoria, responsavel, status, criado_em
    FROM vistorias
    WHERE imovel_id = $1
    ORDER BY data_vistoria DESC, criado_em DESC
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
  listItens,
  createItem,
  updateItem,
  listFotos,
  addFoto,
  findFotoById,
  removeFoto,
  listTimeline,
  addTimeline,
  getCardsStats,
  getGraficosData,
  listByImovel
};
