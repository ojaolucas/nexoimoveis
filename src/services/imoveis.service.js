const imoveisRepository = require('../repositories/imoveis.repository');
const proprietariosRepository = require('../repositories/proprietarios.repository');
const { generateNextCode } = require('../utils/generateCode');
const auditoriaService = require('./auditoria.service');
const path = require('path');
const fs = require('fs');

// Helpers for file size
function getFileSizeOnDisk(caminho) {
  if (!caminho) return 0;
  try {
    const p1 = path.join(__dirname, '../../public', caminho);
    const p2 = path.join(__dirname, '../../', caminho);
    if (fs.existsSync(p1)) {
      return fs.statSync(p1).size;
    } else if (fs.existsSync(p2)) {
      return fs.statSync(p2).size;
    }
  } catch (err) {
    console.error('Error reading size of', caminho, err);
  }
  return 0;
}

async function getCumulativeSize(imovelId, newFileSize = 0) {
  const docs = await imoveisRepository.listDocuments(imovelId);
  const photos = await imoveisRepository.listPhotos(imovelId);
  const imovel = await imoveisRepository.findById(imovelId);

  let total = newFileSize;
  
  // Sum documents
  docs.forEach(d => {
    total += getFileSizeOnDisk(d.caminho_arquivo);
  });
  
  // Sum gallery photos
  photos.forEach(f => {
    total += getFileSizeOnDisk(f.caminho_arquivo);
  });

  // Sum main photo
  if (imovel && imovel.foto_principal) {
    total += getFileSizeOnDisk(imovel.foto_principal);
  }

  return total;
}

async function listar(limit, offset, filters) {
  return await imoveisRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const imovel = await imoveisRepository.findById(id);
  if (!imovel) throw new Error('Imóvel não encontrado.');

  const documentos = await imoveisRepository.listDocuments(id);
  const fotos = await imoveisRepository.listPhotos(id);
  const contratos = await imoveisRepository.listContratos(id);
  const recebimentos = await imoveisRepository.listRecebimentos(id);
  const despesas = await imoveisRepository.listDespesas(id);
  const manutencoes = await imoveisRepository.listManutencoes(id);
  const vistorias = await imoveisRepository.listVistorias(id);
  const timeline = await imoveisRepository.listTimeline(id);

  // Audit view detail
  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Imóveis',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou a ficha completa do imóvel ${imovel.nome} (Código: ${imovel.codigo}).`,
      ip
    });
  }

  return {
    ...imovel,
    documentos,
    fotos,
    contratos,
    recebimentos,
    despesas,
    manutencoes,
    vistorias,
    timeline
  };
}

async function cadastrar(imovelData, responsavelUser, ip) {
  const { nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet } = imovelData;

  // 1. Validations
  if (!nome || nome.trim() === '') throw new Error('Nome/Identificação do imóvel é obrigatório.');
  if (!tipo || tipo.trim() === '') throw new Error('Tipo de imóvel é obrigatório.');
  if (!endereco || endereco.trim() === '') throw new Error('Endereço completo é obrigatório.');
  
  // Verify owner
  const prop = await proprietariosRepository.findById(proprietario_id);
  if (!prop || prop.status !== 'ativo') {
    throw new Error('Proprietário associado não encontrado ou inativo.');
  }

  const area = parseFloat(area_total);
  const valor = parseFloat(valor_locacao);

  if (isNaN(area) || area <= 0) throw new Error('Área total deve ser maior que zero.');
  if (isNaN(valor) || valor <= 0) throw new Error('Valor da locação deve ser maior que zero.');

  // Validate allowed list values
  const allowedTipos = ['Galpão', 'Casa', 'Apartamento', 'Sala Comercial', 'Loja', 'Terreno', 'Galeria Comercial', 'Prédio Comercial'];
  if (!allowedTipos.includes(tipo)) {
    throw new Error('Tipo de imóvel inválido.');
  }

  // 2. Generate Code: IMO-0001
  const codigo = await generateNextCode('IMO', 'imoveis', 'codigo');

  // 3. Persist
  const imovel = await imoveisRepository.create({
    codigo,
    nome: nome.trim(),
    tipo,
    proprietario_id,
    endereco: endereco.trim(),
    area_total: area,
    valor_locacao: valor,
    status: status || 'Disponível',
    observacoes: observacoes ? observacoes.trim() : null,
    foto_principal: foto_principal || null,
    quartos: parseInt(quartos || '0', 10),
    banheiros: parseInt(banheiros || '0', 10),
    vagas_garagem: parseInt(vagas_garagem || '0', 10),
    mobiliado: mobiliado || 'Não informado',
    valor_condominio: parseFloat(valor_condominio || '0'),
    aceita_pet: aceita_pet || 'Não informado'
  });

  // 4. Audit & local timeline
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cadastro',
      modulo: 'Imóveis',
      registroId: imovel.id,
      descricao: `Usuário ${responsavelUser.nome} cadastrou o imóvel ${imovel.nome} (Código: ${codigo}).`,
      ip
    }),
    imoveisRepository.addTimeline(imovel.id, responsavelUser.id, 'Cadastro', `Imóvel cadastrado no sistema por ${responsavelUser.nome} com código ${codigo}.`)
  ]);

  return imovel;
}

async function atualizar(id, imovelData, responsavelUser, ip) {
  const { nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet } = imovelData;

  const current = await imoveisRepository.findById(id);
  if (!current) throw new Error('Imóvel não encontrado.');

  // 1. Validations
  if (!nome || nome.trim() === '') throw new Error('Nome/Identificação do imóvel é obrigatório.');
  if (!tipo || tipo.trim() === '') throw new Error('Tipo de imóvel é obrigatório.');
  if (!endereco || endereco.trim() === '') throw new Error('Endereço completo é obrigatório.');

  const prop = await proprietariosRepository.findById(proprietario_id);
  if (!prop) throw new Error('Proprietário associado não encontrado.');

  const area = parseFloat(area_total);
  const valor = parseFloat(valor_locacao);

  if (isNaN(area) || area <= 0) throw new Error('Área total deve ser maior que zero.');
  if (isNaN(valor) || valor <= 0) throw new Error('Valor da locação deve ser maior que zero.');

  const allowedTipos = ['Galpão', 'Casa', 'Apartamento', 'Sala Comercial', 'Loja', 'Terreno', 'Galeria Comercial', 'Prédio Comercial'];
  if (!allowedTipos.includes(tipo)) {
    throw new Error('Tipo de imóvel inválido.');
  }

  const allowedStatus = ['Disponível', 'Alugado', 'Reservado', 'Manutenção', 'Inativo'];
  if (!allowedStatus.includes(status)) {
    throw new Error('Status de imóvel inválido.');
  }

  // 2. Persist
  const updated = await imoveisRepository.update(id, {
    nome: nome.trim(),
    tipo,
    proprietario_id,
    endereco: endereco.trim(),
    area_total: area,
    valor_locacao: valor,
    status,
    observacoes: observacoes ? observacoes.trim() : null,
    foto_principal: foto_principal || current.foto_principal,
    quartos: parseInt(quartos || '0', 10),
    banheiros: parseInt(banheiros || '0', 10),
    vagas_garagem: parseInt(vagas_garagem || '0', 10),
    mobiliado: mobiliado || 'Não informado',
    valor_condominio: parseFloat(valor_condominio || '0'),
    aceita_pet: aceita_pet || 'Não informado'
  });

  // Check if status changed
  const statusChanged = current.status !== status;

  // 3. Log actions
  const promises = [
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Alteração',
      modulo: 'Imóveis',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} alterou os dados cadastrais do imóvel ${nome} (Código: ${current.codigo}).`,
      ip
    }),
    imoveisRepository.addTimeline(id, responsavelUser.id, 'Alterações', `Dados cadastrais do imóvel atualizados por ${responsavelUser.nome}.`)
  ];

  if (statusChanged) {
    promises.push(
      auditoriaService.registrarLog({
        usuarioId: responsavelUser.id,
        acao: 'Mudança de Status',
        modulo: 'Imóveis',
        registroId: id,
        descricao: `Status do imóvel ${current.codigo} alterado de "${current.status}" para "${status}".`,
        ip
      }),
      imoveisRepository.addTimeline(id, responsavelUser.id, 'Mudança de Status', `Status do imóvel alterado de "${current.status}" para "${status}".`)
    );
  }

  await Promise.all(promises);
  return updated;
}

async function inativar(id, responsavelUser, ip) {
  const imovel = await imoveisRepository.findById(id);
  if (!imovel) throw new Error('Imóvel não encontrado.');

  const result = await imoveisRepository.setStatus(id, 'Inativo');

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Inativação',
      modulo: 'Imóveis',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} inativou o imóvel ${imovel.nome} (Código: ${imovel.codigo}).`,
      ip
    }),
    imoveisRepository.addTimeline(id, responsavelUser.id, 'Mudança de Status', `Imóvel inativado logicamente no sistema por ${responsavelUser.nome}.`)
  ]);

  return result;
}

async function excluir(id, responsavelUser, ip) {
  const imovel = await imoveisRepository.findById(id);
  if (!imovel) throw new Error('Imóvel não encontrado.');

  try {
    const result = await imoveisRepository.remove(id);

    // Audit exclusão
    await Promise.all([
      auditoriaService.registrarLog({
        usuarioId: responsavelUser.id,
        acao: 'Exclusão',
        modulo: 'Imóveis',
        registroId: id,
        descricao: `Usuário ${responsavelUser.nome} excluiu o imóvel ${imovel.nome} (Código: ${imovel.codigo}).`,
        ip
      })
    ]);

    return result;
  } catch (err) {
    if (err.code === '23503') {
      throw new Error('Não é possível excluir este imóvel porque existem contratos, despesas ou manutenções vinculadas a ele. Remova os vínculos ou altere o status para Inativo.');
    }
    throw err;
  }
}

// --- Upload of Documents ---

async function adicionarDocumento(imovelId, documentData, file, responsavelUser, ip) {
  const { tipo_documento, data_emissao, data_vencimento } = documentData;

  const imovel = await imoveisRepository.findById(imovelId);
  if (!imovel) throw new Error('Imóvel não encontrado.');

  if (!tipo_documento) throw new Error('Tipo de documento é obrigatório.');

  // Check cumulative size limit: 500 MB
  const currentTotal = await getCumulativeSize(imovelId, file.size);
  if (currentTotal > 500 * 1024 * 1024) {
    throw new Error('Limite total de armazenamento excedido. O limite acumulado por imóvel é de 500 MB.');
  }

  const doc = await imoveisRepository.addDocument(
    imovelId,
    tipo_documento,
    file.originalname,
    `/uploads/imoveis/${file.filename}`,
    data_emissao,
    data_vencimento
  );

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Upload',
      modulo: 'Imóveis',
      registroId: imovelId,
      descricao: `Usuário ${responsavelUser.nome} anexou o documento ${tipo_documento} (${file.originalname}) no imóvel ${imovel.nome}.`,
      ip
    }),
    imoveisRepository.addTimeline(imovelId, responsavelUser.id, 'Upload de Documentos', `Documento do tipo "${tipo_documento}" (${file.originalname}) anexado por ${responsavelUser.nome}.`)
  ]);

  return doc;
}

async function removerDocumento(documentoId, responsavelUser, ip) {
  const doc = await imoveisRepository.findDocumentById(documentoId);
  if (!doc) throw new Error('Documento não encontrado.');

  const imovel = await imoveisRepository.findById(doc.imovel_id);
  const imovelName = imovel ? imovel.nome : 'Desconhecido';

  // Delete physical file
  const filePath = path.join(__dirname, '../../public', doc.caminho_arquivo);
  const rootFilePath = path.join(__dirname, '../../', doc.caminho_arquivo);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  } else if (fs.existsSync(rootFilePath)) {
    fs.unlinkSync(rootFilePath);
  }

  await imoveisRepository.removeDocument(documentoId);

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Remoção de Documento',
      modulo: 'Imóveis',
      registroId: doc.imovel_id,
      descricao: `Usuário ${responsavelUser.nome} removeu o documento ${doc.tipo_documento} (${doc.nome_arquivo}) do imóvel ${imovelName}.`,
      ip
    }),
    imoveisRepository.addTimeline(doc.imovel_id, responsavelUser.id, 'Upload de Documentos', `Documento do tipo "${doc.tipo_documento}" (${doc.nome_arquivo}) removido por ${responsavelUser.nome}.`)
  ]);

  return true;
}

// --- Upload of Gallery Photos ---

async function adicionarFoto(imovelId, file, responsavelUser, ip) {
  const imovel = await imoveisRepository.findById(imovelId);
  if (!imovel) throw new Error('Imóvel não encontrado.');

  // Check cumulative size limit: 500 MB
  const currentTotal = await getCumulativeSize(imovelId, file.size);
  if (currentTotal > 500 * 1024 * 1024) {
    throw new Error('Limite total de armazenamento excedido. O limite acumulado por imóvel é de 500 MB.');
  }

  const foto = await imoveisRepository.addPhoto(imovelId, `/uploads/imoveis/${file.filename}`);

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Upload',
      modulo: 'Imóveis',
      registroId: imovelId,
      descricao: `Usuário ${responsavelUser.nome} anexou uma foto à galeria do imóvel ${imovel.nome}.`,
      ip
    }),
    imoveisRepository.addTimeline(imovelId, responsavelUser.id, 'Alterações', `Nova foto (${file.originalname}) adicionada à galeria por ${responsavelUser.nome}.`)
  ]);

  return foto;
}

async function removerFoto(fotoId, responsavelUser, ip) {
  const foto = await imoveisRepository.findPhotoById(fotoId);
  if (!foto) throw new Error('Foto não encontrada.');

  const imovel = await imoveisRepository.findById(foto.imovel_id);
  const imovelName = imovel ? imovel.nome : 'Desconhecido';

  // Delete physical file
  const filePath = path.join(__dirname, '../../public', foto.caminho_arquivo);
  const rootFilePath = path.join(__dirname, '../../', foto.caminho_arquivo);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  } else if (fs.existsSync(rootFilePath)) {
    fs.unlinkSync(rootFilePath);
  }

  await imoveisRepository.removePhoto(fotoId);

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Alteração',
      modulo: 'Imóveis',
      registroId: foto.imovel_id,
      descricao: `Usuário ${responsavelUser.nome} removeu uma foto da galeria do imóvel ${imovelName}.`,
      ip
    }),
    imoveisRepository.addTimeline(foto.imovel_id, responsavelUser.id, 'Alterações', `Uma foto da galeria foi removida por ${responsavelUser.nome}.`)
  ]);

  return true;
}

// --- Cards Upper stats ---

async function getCardsStats() {
  return await imoveisRepository.getCardsStats();
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  inativar,
  adicionarDocumento,
  removerDocumento,
  adicionarFoto,
  removerFoto,
  getCardsStats,
  excluir,
};
