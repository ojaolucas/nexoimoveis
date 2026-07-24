const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT p.*, (SELECT COUNT(id) FROM imoveis WHERE proprietario_id = p.id) AS qtd_imoveis 
    FROM pessoas p 
    WHERE p.id = $1 AND p.papel_proprietario = TRUE
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function findByCpfCnpj(cpfCnpj) {
  const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
  const query = "SELECT * FROM pessoas WHERE REGEXP_REPLACE(cpf_cnpj, '\\D', '', 'g') = $1 AND papel_proprietario = TRUE";
  const result = await db.query(query, [cleanCpfCnpj]);
  return result.rows[0] || null;
}

async function existsCpfCnpj(cpfCnpj, excludeId = null) {
  const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
  let query = "SELECT id FROM pessoas WHERE REGEXP_REPLACE(cpf_cnpj, '\\D', '', 'g') = $1 AND papel_proprietario = TRUE";
  const params = [cleanCpfCnpj];

  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
}

async function create(prop) {
  const { codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao, representante_nome, representante_cpf } = prop;
  
  // Utiliza UPSERT para marcar papel_proprietario = TRUE caso a pessoa ja exista (ex: como inquilino)
  const query = `
    INSERT INTO pessoas (
      codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, 
      telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, 
      nacionalidade, estado_civil, profissao, representante_nome, representante_cpf, papel_proprietario, papel_locatario
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, TRUE, FALSE)
    ON CONFLICT (cpf_cnpj) DO UPDATE SET 
      papel_proprietario = TRUE,
      nome_razao_social = EXCLUDED.nome_razao_social,
      nome_fantasia = EXCLUDED.nome_fantasia,
      telefone = EXCLUDED.telefone,
      email = EXCLUDED.email,
      endereco = EXCLUDED.endereco,
      observacoes = EXCLUDED.observacoes,
      status = EXCLUDED.status,
      rg = EXCLUDED.rg,
      rg_orgao = EXCLUDED.rg_orgao,
      rg_uf = EXCLUDED.rg_uf,
      inscricao_estadual = EXCLUDED.inscricao_estadual,
      responsavel = EXCLUDED.responsavel,
      data_nascimento = EXCLUDED.data_nascimento,
      genero = EXCLUDED.genero,
      nacionalidade = EXCLUDED.nacionalidade,
      estado_civil = EXCLUDED.estado_civil,
      profissao = EXCLUDED.profissao,
      representante_nome = EXCLUDED.representante_nome,
      representante_cpf = EXCLUDED.representante_cpf,
      atualizado_em = CURRENT_TIMESTAMP
    RETURNING *
  `;
  
  const result = await db.query(query, [
    codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status || 'ativo',
    data_nascimento || null, rg_orgao || null, rg_uf || null, genero || 'Não informado', nacionalidade || null, estado_civil || 'Não informado', profissao || null, representante_nome || null, representante_cpf || null
  ]);
  return result.rows[0];
}

async function update(id, prop) {
  const { tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao, representante_nome, representante_cpf } = prop;
  const query = `
    UPDATE pessoas
    SET tipo_pessoa = $1, nome_razao_social = $2, nome_fantasia = $3, cpf_cnpj = $4, rg = $5, inscricao_estadual = $6, responsavel = $7, telefone = $8, email = $9, endereco = $10, observacoes = $11, status = $12,
        data_nascimento = $13, rg_orgao = $14, rg_uf = $15, genero = $16, nacionalidade = $17, estado_civil = $18, profissao = $19, representante_nome = $20, representante_cpf = $21, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $22 AND papel_proprietario = TRUE
    RETURNING *
  `;
  const result = await db.query(query, [
    tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status || 'ativo',
    data_nascimento || null, rg_orgao || null, rg_uf || null, genero || 'Não informado', nacionalidade || null, estado_civil || 'Não informado', profissao || null, representante_nome || null, representante_cpf || null,
    id
  ]);
  return result.rows[0];
}

async function remove(id) {
  // Em vez de deletar fisicamente, podemos desvincular a flag. 
  // Mas se for exclusao de fato (pedido do usuario nas fases anteriores), removemos se nao houver vinculos, ou se houver papel_locatario = TRUE, apenas limpamos a flag papel_proprietario = FALSE.
  // Vamos checar se tem papel_locatario ativo:
  const checkQuery = 'SELECT papel_locatario FROM pessoas WHERE id = $1';
  const checkRes = await db.query(checkQuery, [id]);
  
  if (checkRes.rows[0] && checkRes.rows[0].papel_locatario) {
    const query = 'UPDATE pessoas SET papel_proprietario = FALSE, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  } else {
    const query = 'DELETE FROM pessoas WHERE id = $1 AND papel_proprietario = TRUE RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
}

async function setStatus(id, status) {
  const query = `
    UPDATE pessoas
    SET status = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $2 AND papel_proprietario = TRUE
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT p.*, (SELECT COUNT(id) FROM imoveis WHERE proprietario_id = p.id) AS qtd_imoveis 
    FROM pessoas p 
    WHERE p.papel_proprietario = TRUE
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
    FROM pessoas p 
    WHERE p.papel_proprietario = TRUE
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
    INSERT INTO pessoas_documentos (pessoa_id, tipo_documento, nome_arquivo, caminho_arquivo)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [proprietarioId, tipoDocumento, nomeArquivo, caminhoArquivo]);
  return result.rows[0];
}

async function removeDocument(documentId) {
  const query = 'DELETE FROM pessoas_documentos WHERE id = $1 RETURNING *';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

async function findDocumentById(documentId) {
  const query = 'SELECT * FROM pessoas_documentos WHERE id = $1';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

async function listDocuments(proprietarioId) {
  const query = 'SELECT * FROM pessoas_documentos WHERE pessoa_id = $1 ORDER BY criado_em DESC';
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
