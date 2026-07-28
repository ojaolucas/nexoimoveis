const db = require('../config/database');

async function findById(id) {
  const query = `
    SELECT i.*, p.nome_razao_social AS proprietario_nome,
      (SELECT COUNT(id) FROM contratos WHERE imovel_id = i.id AND status = 'Ativo') AS contratos_ativos
    FROM imoveis i
    LEFT JOIN pessoas p ON i.proprietario_id = p.id
    WHERE i.id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function create(imovel) {
  const { codigo, nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet } = imovel;
  const query = `
    INSERT INTO imoveis (codigo, nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `;
  const result = await db.query(query, [
    codigo, nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status || 'Disponível', observacoes, foto_principal,
    quartos || 0, banheiros || 0, vagas_garagem || 0, mobiliado || 'Não informado', valor_condominio || 0, aceita_pet || 'Não informado'
  ]);
  return result.rows[0];
}

async function update(id, imovel) {
  const { nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet } = imovel;
  const query = `
    UPDATE imoveis
    SET nome = $1, tipo = $2, proprietario_id = $3, endereco = $4, area_total = $5, valor_locacao = $6, status = $7, observacoes = $8, foto_principal = $9, 
        quartos = $10, banheiros = $11, vagas_garagem = $12, mobiliado = $13, valor_condominio = $14, aceita_pet = $15, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $16
    RETURNING *
  `;
  const result = await db.query(query, [
    nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal,
    quartos || 0, banheiros || 0, vagas_garagem || 0, mobiliado || 'Não informado', valor_condominio || 0, aceita_pet || 'Não informado',
    id
  ]);
  return result.rows[0];
}

async function setStatus(id, status) {
  const query = `
    UPDATE imoveis
    SET status = $1, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

async function listAll(limit = 10, offset = 0, filters = {}) {
  let query = `
    SELECT i.*, p.nome_razao_social AS proprietario_nome,
      (SELECT COUNT(id) FROM contratos WHERE imovel_id = i.id AND status = 'Ativo') AS contratos_ativos
    FROM imoveis i
    LEFT JOIN pessoas p ON i.proprietario_id = p.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    query += ` AND i.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  } else {
    // Show active by default if no status filter
    query += ` AND i.status != 'Inativo'`;
  }

  if (filters.tipo) {
    query += ` AND i.tipo = $${paramCount}`;
    params.push(filters.tipo);
    paramCount++;
  }

  if (filters.proprietario) {
    query += ` AND i.proprietario_id = $${paramCount}`;
    params.push(filters.proprietario);
    paramCount++;
  }

  if (filters.busca) {
    query += ` AND (i.nome ILIKE $${paramCount} OR i.codigo ILIKE $${paramCount})`;
    params.push(`%${filters.busca}%`);
    paramCount++;
  }

  // Clone parameters for count query
  let countQuery = `
    SELECT COUNT(i.id) 
    FROM imoveis i 
    WHERE 1=1
  `;
  const countParams = [...params];
  
  let countParamIndex = 1;
  if (filters.status) {
    countQuery += ` AND i.status = $${countParamIndex}`;
    countParamIndex++;
  } else {
    countQuery += ` AND i.status != 'Inativo'`;
  }

  if (filters.tipo) {
    countQuery += ` AND i.tipo = $${countParamIndex}`;
    countParamIndex++;
  }

  if (filters.proprietario) {
    countQuery += ` AND i.proprietario_id = $${countParamIndex}`;
    countParamIndex++;
  }

  if (filters.busca) {
    countQuery += ` AND (i.nome ILIKE $${countParamIndex} OR i.codigo ILIKE $${countParamIndex})`;
  }

  query += ` ORDER BY i.codigo ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

// --- Documents queries ---

async function listDocuments(imovelId) {
  const query = 'SELECT * FROM imoveis_documentos WHERE imovel_id = $1 ORDER BY criado_em DESC';
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

async function addDocument(imovelId, tipoDocumento, nomeArquivo, caminhoArquivo, dataEmissao, dataVencimento) {
  const query = `
    INSERT INTO imoveis_documentos (imovel_id, tipo_documento, nome_arquivo, caminho_arquivo, data_emissao, data_vencimento)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await db.query(query, [imovelId, tipoDocumento, nomeArquivo, caminhoArquivo, dataEmissao || null, dataVencimento || null]);
  return result.rows[0];
}

async function removeDocument(documentId) {
  const query = 'DELETE FROM imoveis_documentos WHERE id = $1 RETURNING *';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

async function findDocumentById(documentId) {
  const query = 'SELECT * FROM imoveis_documentos WHERE id = $1';
  const result = await db.query(query, [documentId]);
  return result.rows[0] || null;
}

// --- Gallery Photos queries ---

async function listPhotos(imovelId) {
  const query = 'SELECT * FROM imoveis_fotos WHERE imovel_id = $1 ORDER BY criado_em DESC';
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

async function addPhoto(imovelId, caminhoArquivo) {
  const query = `
    INSERT INTO imoveis_fotos (imovel_id, caminho_arquivo)
    VALUES ($1, $2)
    RETURNING *
  `;
  const result = await db.query(query, [imovelId, caminhoArquivo]);
  return result.rows[0];
}

async function removePhoto(fotoId) {
  const query = 'DELETE FROM imoveis_fotos WHERE id = $1 RETURNING *';
  const result = await db.query(query, [fotoId]);
  return result.rows[0] || null;
}

async function findPhotoById(fotoId) {
  const query = 'SELECT * FROM imoveis_fotos WHERE id = $1';
  const result = await db.query(query, [fotoId]);
  return result.rows[0] || null;
}

// --- Local Timeline queries ---

async function listTimeline(imovelId) {
  const query = `
    SELECT t.*, u.nome AS usuario_nome 
    FROM imoveis_timeline t 
    LEFT JOIN usuarios u ON t.usuario_id = u.id 
    WHERE t.imovel_id = $1 
    ORDER BY t.data_hora DESC
  `;
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

async function addTimeline(imovelId, usuarioId, acao, descricao) {
  const query = `
    INSERT INTO imoveis_timeline (imovel_id, usuario_id, acao, descricao)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await db.query(query, [imovelId, usuarioId, acao, descricao]);
  return result.rows[0];
}

// --- Sub-resources lists ---

async function listContratos(imovelId) {
  const query = `
    SELECT c.*, l.nome_razao_social AS locatario_nome 
    FROM contratos c 
    JOIN pessoas l ON c.locatario_id = l.id 
    WHERE c.imovel_id = $1 
    ORDER BY c.criado_em DESC
  `;
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

async function listRecebimentos(imovelId) {
  const query = `
    SELECT r.*, c.numero_contrato 
    FROM recebimentos r 
    JOIN contratos c ON r.contrato_id = c.id 
    WHERE c.imovel_id = $1 
    ORDER BY r.vencimento DESC
  `;
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

async function listDespesas(imovelId) {
  const query = `
    SELECT d.* 
    FROM despesas d 
    WHERE d.imovel_id = $1 
    ORDER BY d.vencimento DESC
  `;
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

async function listManutencoes(imovelId) {
  const query = `
    SELECT m.* 
    FROM manutencoes m 
    WHERE m.imovel_id = $1 
    ORDER BY m.data_prevista DESC
  `;
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

async function listVistorias(imovelId) {
  const query = `
    SELECT v.* 
    FROM vistorias v 
    WHERE v.imovel_id = $1 
    ORDER BY v.data_vistoria DESC
  `;
  const result = await db.query(query, [imovelId]);
  return result.rows;
}

// --- Cards Upper stats ---

async function getCardsStats() {
  const query = `
    SELECT 
      COUNT(id) AS total,
      SUM(CASE WHEN status = 'Disponível' THEN 1 ELSE 0 END) AS disponiveis,
      SUM(CASE WHEN status = 'Alugado' THEN 1 ELSE 0 END) AS alugados,
      SUM(CASE WHEN status = 'Reservado' THEN 1 ELSE 0 END) AS reservados,
      SUM(CASE WHEN status = 'Em Manutenção' THEN 1 ELSE 0 END) AS manutencao
    FROM imoveis
    WHERE status != 'Inativo'
  `;
  const result = await db.query(query);
  const row = result.rows[0];
  return {
    total: parseInt(row.total || 0, 10),
    disponiveis: parseInt(row.disponiveis || 0, 10),
    alugados: parseInt(row.alugados || 0, 10),
    reservados: parseInt(row.reservados || 0, 10),
    manutencao: parseInt(row.manutencao || 0, 10)
  };
}

async function remove(id) {
  const query = 'DELETE FROM imoveis WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

module.exports = {
  findById,
  create,
  update,
  setStatus,
  listAll,
  listDocuments,
  addDocument,
  removeDocument,
  findDocumentById,
  listPhotos,
  addPhoto,
  removePhoto,
  findPhotoById,
  listTimeline,
  addTimeline,
  listContratos,
  listRecebimentos,
  listDespesas,
  listManutencoes,
  listVistorias,
  getCardsStats,
  remove,
};
