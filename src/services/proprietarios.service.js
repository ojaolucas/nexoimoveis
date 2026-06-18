const proprietariosRepository = require('../repositories/proprietarios.repository');
const { generateNextCode } = require('../utils/generateCode');
const auditoriaService = require('./auditoria.service');
const validateCPF = require('../validators/cpf.validator');
const validateCNPJ = require('../validators/cnpj.validator');
const validateEmail = require('../validators/email.validator');
const validateTelefone = require('../validators/telefone.validator');
const path = require('path');
const fs = require('fs');

async function listar(limit, offset, filters) {
  return await proprietariosRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const prop = await proprietariosRepository.findById(id);
  if (!prop) throw new Error('Proprietário não encontrado.');

  const documentos = await proprietariosRepository.listDocuments(id);
  const imoveis = await proprietariosRepository.listImoveis(id);
  const timeline = await proprietariosRepository.getTimeline(id);

  // Register audit for details view
  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Proprietários',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou os detalhes do proprietário ${prop.nome_razao_social} (Código: ${prop.codigo}).`,
      ip
    });
  }

  return {
    ...prop,
    documentos,
    imoveis,
    timeline
  };
}

async function cadastrar(userData, responsavelUser, ip) {
  const { tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status } = userData;

  // 1. Common validations
  if (!nome_razao_social || nome_razao_social.trim() === '') {
    throw new Error('Nome ou Razão Social é obrigatório.');
  }
  if (!telefone || telefone.trim() === '') {
    throw new Error('Telefone é obrigatório.');
  }
  if (!email || email.trim() === '') {
    throw new Error('E-mail é obrigatório.');
  }

  if (!validateTelefone(telefone)) {
    throw new Error('Telefone inválido. Deve conter DDD e de 8 a 9 dígitos numéricos.');
  }
  if (!validateEmail(email)) {
    throw new Error('E-mail inválido.');
  }

  // 2. Specific validations based on PF/PJ
  let cleanCpfCnpj = (cpf_cnpj || '').replace(/\D/g, '');
  let validatedRg = null;
  let validatedIe = null;
  let validatedResponsavel = null;

  if (tipo_pessoa === 'PF') {
    if (!validateCPF(cleanCpfCnpj)) throw new Error('CPF inválido.');
    validatedRg = rg ? rg.trim() : null;
  } else if (tipo_pessoa === 'PJ') {
    if (!validateCNPJ(cleanCpfCnpj)) throw new Error('CNPJ inválido.');
    if (!responsavel || responsavel.trim() === '') {
      throw new Error('Responsável PJ é obrigatório.');
    }
    validatedResponsavel = responsavel.trim();
    validatedIe = inscricao_estadual ? inscricao_estadual.trim() : null;
  } else {
    throw new Error('Tipo de pessoa inválido. Deve ser PF ou PJ.');
  }

  // Check duplicated CPF/CNPJ
  const duplicated = await proprietariosRepository.existsCpfCnpj(cleanCpfCnpj);
  if (duplicated) throw new Error('CPF/CNPJ já cadastrado para outro proprietário.');

  // 3. Generate sequential code: PROP-0001
  // We use code generator: prefix 'PROP', table 'proprietarios', column 'codigo'
  const codigo = await generateNextCode('PROP', 'proprietarios', 'codigo');

  // 4. Create
  const prop = await proprietariosRepository.create({
    codigo,
    tipo_pessoa,
    nome_razao_social: nome_razao_social.trim(),
    nome_fantasia: nome_fantasia ? nome_fantasia.trim() : null,
    cpf_cnpj: cleanCpfCnpj,
    rg: validatedRg,
    inscricao_estadual: validatedIe,
    responsavel: validatedResponsavel,
    telefone: telefone.trim(),
    email: email.trim(),
    endereco: endereco ? endereco.trim() : null,
    observacoes: observacoes ? observacoes.trim() : null,
    status: status || 'ativo'
  });

  // 5. Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Cadastro',
    modulo: 'Proprietários',
    registroId: prop.id,
    descricao: `Usuário ${responsavelUser.nome} cadastrou o proprietário ${nome_razao_social} (Código: ${codigo}).`,
    ip
  });

  return prop;
}

async function atualizar(id, userData, responsavelUser, ip) {
  const { tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status } = userData;

  // 1. Common validations
  if (!nome_razao_social || nome_razao_social.trim() === '') {
    throw new Error('Nome ou Razão Social é obrigatório.');
  }
  if (!telefone || telefone.trim() === '') {
    throw new Error('Telefone é obrigatório.');
  }
  if (!email || email.trim() === '') {
    throw new Error('E-mail é obrigatório.');
  }

  if (!validateTelefone(telefone)) {
    throw new Error('Telefone inválido. Deve conter DDD e de 8 a 9 dígitos numéricos.');
  }
  if (!validateEmail(email)) {
    throw new Error('E-mail inválido.');
  }

  // 2. Specific validations based on PF/PJ
  let cleanCpfCnpj = (cpf_cnpj || '').replace(/\D/g, '');
  let validatedRg = null;
  let validatedIe = null;
  let validatedResponsavel = null;

  if (tipo_pessoa === 'PF') {
    if (!validateCPF(cleanCpfCnpj)) throw new Error('CPF inválido.');
    validatedRg = rg ? rg.trim() : null;
  } else if (tipo_pessoa === 'PJ') {
    if (!validateCNPJ(cleanCpfCnpj)) throw new Error('CNPJ inválido.');
    if (!responsavel || responsavel.trim() === '') {
      throw new Error('Responsável PJ é obrigatório.');
    }
    validatedResponsavel = responsavel.trim();
    validatedIe = inscricao_estadual ? inscricao_estadual.trim() : null;
  } else {
    throw new Error('Tipo de pessoa inválido. Deve ser PF ou PJ.');
  }

  // Check duplicated CPF/CNPJ excluding current ID
  const duplicated = await proprietariosRepository.existsCpfCnpj(cleanCpfCnpj, id);
  if (duplicated) throw new Error('CPF/CNPJ já cadastrado para outro proprietário.');

  // 3. Update
  const updated = await proprietariosRepository.update(id, {
    tipo_pessoa,
    nome_razao_social: nome_razao_social.trim(),
    nome_fantasia: nome_fantasia ? nome_fantasia.trim() : null,
    cpf_cnpj: cleanCpfCnpj,
    rg: validatedRg,
    inscricao_estadual: validatedIe,
    responsavel: validatedResponsavel,
    telefone: telefone.trim(),
    email: email.trim(),
    endereco: endereco ? endereco.trim() : null,
    observacoes: observacoes ? observacoes.trim() : null,
    status
  });

  if (!updated) throw new Error('Proprietário não encontrado.');

  // 4. Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Edição',
    modulo: 'Proprietários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} editou os dados do proprietário ${nome_razao_social} (ID: ${id}).`,
    ip
  });

  return updated;
}

async function inativar(id, responsavelUser, ip) {
  const prop = await proprietariosRepository.findById(id);
  if (!prop) throw new Error('Proprietário não encontrado.');

  const result = await proprietariosRepository.setStatus(id, 'inativo');

  // Audit inativação
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Inativação',
    modulo: 'Proprietários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} inativou o proprietário ${prop.nome_razao_social} (ID: ${id}).`,
    ip
  });

  return result;
}

async function alterarStatus(id, novoStatus, responsavelUser, ip) {
  const prop = await proprietariosRepository.findById(id);
  if (!prop) throw new Error('Proprietário não encontrado.');

  if (!['ativo', 'inativo'].includes(novoStatus)) {
    throw new Error('Status inválido.');
  }

  const result = await proprietariosRepository.setStatus(id, novoStatus);

  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: novoStatus === 'inativo' ? 'Inativação' : 'Ativação',
    modulo: 'Proprietários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} alterou o status do proprietário ${prop.nome_razao_social} para "${novoStatus}".`,
    ip
  });

  return result;
}

async function excluir(id, responsavelUser, ip) {
  const prop = await proprietariosRepository.findById(id);
  if (!prop) throw new Error('Proprietário não encontrado.');

  try {
    const result = await proprietariosRepository.remove(id);

    // Audit exclusão
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Exclusão',
      modulo: 'Proprietários',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} excluiu o proprietário ${prop.nome_razao_social} (Código: ${prop.codigo}).`,
      ip
    });

    return result;
  } catch (err) {
    if (err.code === '23503') {
      throw new Error('Não é possível excluir este proprietário porque existem imóveis vinculados a ele. Remova os vínculos ou altere o status para Inativo.');
    }
    throw err;
  }
}

// --- Document Management Services ---

async function adicionarDocumento(proprietarioId, tipoDocumento, file, responsavelUser, ip) {
  const prop = await proprietariosRepository.findById(proprietarioId);
  if (!prop) throw new Error('Proprietário não encontrado.');

  const doc = await proprietariosRepository.addDocument(
    proprietarioId,
    tipoDocumento,
    file.originalname,
    `/uploads/proprietarios/${file.filename}`
  );

  // Audit upload
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Upload de Documento',
    modulo: 'Proprietários',
    registroId: proprietarioId,
    descricao: `Usuário ${responsavelUser.nome} fez upload do documento ${tipoDocumento} (${file.originalname}) para o proprietário ${prop.nome_razao_social}.`,
    ip
  });

  return doc;
}

async function removerDocumento(documentoId, responsavelUser, ip) {
  const doc = await proprietariosRepository.findDocumentById(documentoId);
  if (!doc) throw new Error('Documento não encontrado.');

  const prop = await proprietariosRepository.findById(doc.proprietario_id);
  const propName = prop ? prop.nome_razao_social : 'Desconhecido';

  // Delete file physically from uploads/proprietarios
  const filePath = path.join(__dirname, '../../public', doc.caminho_arquivo);
  // Also try root uploads folder if public prefix is different
  const rootFilePath = path.join(__dirname, '../../', doc.caminho_arquivo);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  } else if (fs.existsSync(rootFilePath)) {
    fs.unlinkSync(rootFilePath);
  }

  const result = await proprietariosRepository.removeDocument(documentoId);

  // Audit removal
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Remoção de Documento',
    modulo: 'Proprietários',
    registroId: doc.proprietario_id,
    descricao: `Usuário ${responsavelUser.nome} removeu o documento ${doc.tipo_documento} (${doc.nome_arquivo}) do proprietário ${propName}.`,
    ip
  });

  return result;
}

// --- Associated Properties Service ---

async function listarImoveis(proprietarioId) {
  const prop = await proprietariosRepository.findById(proprietarioId);
  if (!prop) throw new Error('Proprietário não encontrado.');
  return await proprietariosRepository.listImoveis(proprietarioId);
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  inativar,
  alterarStatus,
  adicionarDocumento,
  removerDocumento,
  listarImoveis,
  excluir,
};
