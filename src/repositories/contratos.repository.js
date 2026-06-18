const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT c.*, 
           i.nome AS imovel_nome, 
           i.codigo AS imovel_codigo,
           i.endereco AS imovel_endereco,
           i.tipo AS imovel_tipo,
           l.nome_razao_social AS locatario_nome, 
           l.codigo AS locatario_codigo,
           l.cpf_cnpj AS locatario_cpf_cnpj,
           l.email AS locatario_email,
           l.telefone AS locatario_telefone,
           p.nome_razao_social AS proprietario_nome,
           p.codigo AS proprietario_codigo
    FROM contratos c
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN locatarios l ON c.locatario_id = l.id
    LEFT JOIN proprietarios p ON i.proprietario_id = p.id
    WHERE c.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Checks if there is an active contract for a property.
 * Optionally excludes a contract ID during updates.
 */
async function findActiveContratoByImovel(imovelId, excludeId = null) {
  let query = "SELECT * FROM contratos WHERE imovel_id = $1 AND status = 'Ativo'";
  const params = [imovelId];

  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }

  const result = await db.query(query, params);
  return result.rows[0] || null;
}

async function create(contrato) {
  const { numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes, arquivo_pdf } = contrato;
  const query = `
    INSERT INTO contratos (numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes, arquivo_pdf, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Ativo')
    RETURNING *
  `;
  const result = await db.query(query, [
    numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao || null, garantia, indice_reajuste, observacoes || null, arquivo_pdf || null
  ]);
  return result.rows[0];
}

async function update(id, contrato) {
  const { numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes, arquivo_pdf, status } = contrato;
  const query = `
    UPDATE contratos
    SET numero_contrato = $1, 
        imovel_id = $2, 
        locatario_id = $3, 
        data_inicio = $4, 
        data_fim = $5, 
        valor_mensal = $6, 
        dia_vencimento = $7, 
        caucao = $8, 
        garantia = $9, 
        indice_reajuste = $10, 
        observacoes = $11, 
        arquivo_pdf = $12, 
        status = $13, 
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $14
    RETURNING *
  `;
  const result = await db.query(query, [
    numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao || null, garantia, indice_reajuste, observacoes || null, arquivo_pdf || null, status, id
  ]);
  return result.rows[0];
}

async function setStatus(id, status) {
  const query = `
    UPDATE contratos
    SET status = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT c.*, 
           i.nome AS imovel_nome, 
           i.codigo AS imovel_codigo,
           l.nome_razao_social AS locatario_nome, 
           l.codigo AS locatario_codigo
    FROM contratos c
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN locatarios l ON c.locatario_id = l.id
    WHERE 1 = 1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND c.status = $${paramCount}`;
    params.push(filters.status);
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

  if (filters.numero) {
    query += ` AND c.numero_contrato ILIKE $${paramCount}`;
    params.push(`%${filters.numero}%`);
    paramCount++;
  }

  if (filters.data_inicio) {
    query += ` AND c.data_inicio >= $${paramCount}`;
    params.push(filters.data_inicio);
    paramCount++;
  }

  if (filters.data_fim) {
    query += ` AND c.data_fim <= $${paramCount}`;
    params.push(filters.data_fim);
    paramCount++;
  }

  // Clone parameters for count query
  let countQuery = `
    SELECT COUNT(c.id) 
    FROM contratos c
    JOIN imoveis i ON c.imovel_id = i.id
    JOIN locatarios l ON c.locatario_id = l.id
    WHERE 1 = 1
  `;
  
  let countParamIndex = 1;
  const countParams = [];
  if (filters.status) {
    countQuery += ` AND c.status = $${countParamIndex}`;
    countParams.push(filters.status);
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
  if (filters.numero) {
    countQuery += ` AND c.numero_contrato ILIKE $${countParamIndex}`;
    countParams.push(`%${filters.numero}%`);
    countParamIndex++;
  }
  if (filters.data_inicio) {
    countQuery += ` AND c.data_inicio >= $${countParamIndex}`;
    countParams.push(filters.data_inicio);
    countParamIndex++;
  }
  if (filters.data_fim) {
    countQuery += ` AND c.data_fim <= $${countParamIndex}`;
    countParams.push(filters.data_fim);
    countParamIndex++;
  }

  query += ` ORDER BY c.numero_contrato DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

// --- Documents ---

async function listDocuments(contratoId) {
  const query = 'SELECT * FROM contratos_documentos WHERE contrato_id = $1 ORDER BY criado_em DESC';
  const result = await db.query(query, [contratoId]);
  return result.rows;
}

async function addDocument(contratoId, tipoDocumento, nomeArquivo, caminhoArquivo) {
  const query = `
    INSERT INTO contratos_documentos (contrato_id, tipo_documento, nome_arquivo, caminho_arquivo)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [contratoId, tipoDocumento, nomeArquivo, caminhoArquivo]);
  return result.rows[0];
}

async function removeDocument(documentId) {
  const query = 'DELETE FROM contratos_documentos WHERE id = $1 RETURNING *';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

async function findDocumentById(documentId) {
  const query = 'SELECT * FROM contratos_documentos WHERE id = $1';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

// --- Readjustments (Reajustes) ---

async function listReajustes(contratoId) {
  const query = 'SELECT * FROM contratos_reajustes WHERE contrato_id = $1 ORDER BY criado_em DESC';
  const result = await db.query(query, [contratoId]);
  return result.rows;
}

async function addReajuste(contratoId, dataReajuste, indice, percentual, valorAnterior, novoValor) {
  const query = `
    INSERT INTO contratos_reajustes (contrato_id, data_reajuste, indice, percentual, valor_anterior, novo_valor)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await db.query(query, [contratoId, dataReajuste, indice, percentual, valorAnterior, novoValor]);
  return result.rows[0];
}

// --- Renewals (Renovações) ---

async function listRenewals(contratoId) {
  const query = `
    SELECT r.*, 
           c_orig.numero_contrato AS origem_numero, 
           c_dest.numero_contrato AS destino_numero
    FROM contratos_renovacoes r
    LEFT JOIN contratos c_orig ON r.contrato_origem_id = c_orig.id
    JOIN contratos c_dest ON r.contrato_destino_id = c_dest.id
    WHERE r.contrato_origem_id = $1 OR r.contrato_destino_id = $1
    ORDER BY r.criado_em DESC
  `;
  const result = await db.query(query, [contratoId]);
  return result.rows;
}

async function addRenewals(contratoOrigemId, contratoDestinoId, dataRenovacao) {
  const query = `
    INSERT INTO contratos_renovacoes (contrato_origem_id, contrato_destino_id, data_renovacao)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await db.query(query, [contratoOrigemId, contratoDestinoId, dataRenovacao]);
  return result.rows[0];
}

// --- Timeline ---

async function listTimeline(contratoId) {
  const query = `
    SELECT t.*, u.nome AS usuario_nome
    FROM contratos_timeline t
    LEFT JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.contrato_id = $1
    ORDER BY t.data_hora DESC
  `;
  const result = await db.query(query, [contratoId]);
  return result.rows;
}

async function addTimeline(contratoId, usuarioId, acao, descricao) {
  const query = `
    INSERT INTO contratos_timeline (contrato_id, usuario_id, acao, descricao)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [contratoId, usuarioId, acao, descricao]);
  return result.rows[0];
}

// --- Cards Upper Stats ---

async function getCardsStats() {
  const query = `
    SELECT 
      SUM(CASE WHEN status = 'Ativo' THEN 1 ELSE 0 END) AS ativos,
      SUM(CASE WHEN status = 'Encerrado' THEN 1 ELSE 0 END) AS encerrados,
      SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) AS cancelados,
      SUM(CASE WHEN status = 'Ativo' AND data_fim - CURRENT_DATE <= 90 AND data_fim - CURRENT_DATE >= 0 THEN 1 ELSE 0 END) AS vencendo
    FROM contratos
  `;
  const result = await db.query(query);
  const row = result.rows[0];
  return {
    ativos: parseInt(row.ativos || 0, 10),
    encerrados: parseInt(row.encerrados || 0, 10),
    cancelados: parseInt(row.cancelados || 0, 10),
    vencendo: parseInt(row.vencendo || 0, 10),
  };
}

module.exports = {
  findById,
  findActiveContratoByImovel,
  create,
  update,
  setStatus,
  listAll,
  listDocuments,
  addDocument,
  removeDocument,
  findDocumentById,
  listReajustes,
  addReajuste,
  listRenewals,
  addRenewals,
  listTimeline,
  addTimeline,
  getCardsStats,
};
