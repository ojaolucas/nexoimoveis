const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT p.*, (SELECT COUNT(id) FROM imoveis WHERE proprietario_id = p.id) AS qtd_imoveis 
    FROM proprietarios p 
    WHERE p.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function findByCpfCnpj(cpfCnpj) {
  const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
  const query = "SELECT * FROM proprietarios WHERE REGEXP_REPLACE(cpf_cnpj, '\\D', '', 'g') = $1";
  const result = await db.query(query, [cleanCpfCnpj]);
  return result.rows[0] || null;
}

async function existsCpfCnpj(cpfCnpj, excludeId = null) {
  const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
  let query = "SELECT id FROM proprietarios WHERE REGEXP_REPLACE(cpf_cnpj, '\\D', '', 'g') = $1";
  const params = [cleanCpfCnpj];

  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function create(prop) {
  const { codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status } = prop;
  const query = `
    INSERT INTO proprietarios (codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  const result = await db.query(query, [codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status || 'ativo']);
  return result.rows[0];
}

async function update(id, prop) {
  const { tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status } = prop;
  const query = `
    UPDATE proprietarios
    SET tipo_pessoa = $1, nome_razao_social = $2, nome_fantasia = $3, cpf_cnpj = $4, rg = $5, inscricao_estadual = $6, responsavel = $7, telefone = $8, email = $9, endereco = $10, observacoes = $11, status = $12, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *
  `;
  const result = await db.query(query, [tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status || 'ativo', id]);
  return result.rows[0];
}

async function remove(id) {
  const query = 'DELETE FROM proprietarios WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function setStatus(id, status) {
  const query = `
    UPDATE proprietarios
    SET status = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT p.*, (SELECT COUNT(id) FROM imoveis WHERE proprietario_id = p.id) AS qtd_imoveis 
    FROM proprietarios p 
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.busca) {
    query += ` AND (p.nome_razao_social ILIKE $${paramCount} OR p.nome_fantasia ILIKE $${paramCount} OR p.cpf_cnpj LIKE $${paramCount} OR p.codigo ILIKE $${paramCount})`;
    params.push(`%${filters.busca}%`);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND p.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.tipo) {
    query += ` AND p.tipo_pessoa = $${paramCount}`;
    params.push(filters.tipo);
    paramCount++;
  }

  // Clone parameters and query for total count calculation
  let countQuery = `
    SELECT COUNT(p.id) 
    FROM proprietarios p 
    WHERE 1=1
  `;
  const countParams = [...params];
  
  if (filters.busca) {
    countQuery += ` AND (p.nome_razao_social ILIKE $1 OR p.nome_fantasia ILIKE $1 OR p.cpf_cnpj LIKE $1 OR p.codigo ILIKE $1)`;
  }
  let countParamIndex = filters.busca ? 2 : 1;
  if (filters.status) {
    countQuery += ` AND p.status = $${countParamIndex}`;
    countParamIndex++;
  }
  if (filters.tipo) {
    countQuery += ` AND p.tipo_pessoa = $${countParamIndex}`;
    countParamIndex++;
  }

  query += ` ORDER BY p.nome_razao_social ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

// --- Document Management Methods ---

async function addDocument(proprietarioId, tipoDocumento, nomeArquivo, caminhoArquivo) {
  const query = `
    INSERT INTO proprietarios_documentos (proprietario_id, tipo_documento, nome_arquivo, caminho_arquivo)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [proprietarioId, tipoDocumento, nomeArquivo, caminhoArquivo]);
  return result.rows[0];
}

async function removeDocument(documentId) {
  const query = 'DELETE FROM proprietarios_documentos WHERE id = $1 RETURNING *';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

async function findDocumentById(documentId) {
  const query = 'SELECT * FROM proprietarios_documentos WHERE id = $1';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

async function listDocuments(proprietarioId) {
  const query = 'SELECT * FROM proprietarios_documentos WHERE proprietario_id = $1 ORDER BY criado_em DESC';
  const result = await db.query(query, [proprietarioId]);
  return result.rows;
}

// --- Linked Properties Methods ---

async function listImoveis(proprietarioId) {
  const query = "SELECT * FROM imoveis WHERE proprietario_id = $1 AND status != 'Inativo' ORDER BY codigo ASC";
  const result = await db.query(query, [proprietarioId]);
  return result.rows;
}

async function getTimeline(proprietarioId) {
  const query = `
    SELECT l.id, l.acao, l.modulo, l.registro_id, l.descricao, l.data_hora, u.nome AS usuario_nome
    FROM auditoria_logs l
    LEFT JOIN usuarios u ON l.usuario_id = u.id
    WHERE l.modulo = 'Proprietários' AND l.registro_id = $1
    ORDER BY l.data_hora DESC
  `;
  const result = await db.query(query, [proprietarioId]);
  return result.rows;
}

module.exports = {
  findById,
  findByCpfCnpj,
  existsCpfCnpj,
  create,
  update,
  setStatus,
  listAll,
  addDocument,
  removeDocument,
  findDocumentById,
  listDocuments,
  listImoveis,
  getTimeline,
  remove,
};
