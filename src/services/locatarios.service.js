const locatariosRepository = require('../repositories/locatarios.repository');
const { generateNextCode } = require('../utils/generateCode');
const auditoriaService = require('./auditoria.service');
const validateCPF = require('../validators/cpf.validator');
const validateCNPJ = require('../validators/cnpj.validator');
const validateEmail = require('../validators/email.validator');
const validateTelefone = require('../validators/telefone.validator');
const path = require('path');
const fs = require('fs');

async function listar(limit, offset, filters) {
  return await locatariosRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const loc = await locatariosRepository.findById(id);
  if (!loc) throw new Error('Locatário não encontrado.');

  const documentos = await locatariosRepository.listDocuments(id);
  const contratos = await locatariosRepository.listContratos(id);
  const imoveis = await locatariosRepository.listImoveis(id);
  const recebimentos = await locatariosRepository.listRecebimentos(id);
  const timeline = await locatariosRepository.getTimeline(id);

  // Register details view audit log
  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Locatários',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou a ficha do locatário ${loc.nome_razao_social} (Código: ${loc.codigo}).`,
      ip
    });
  }

  return {
    ...loc,
    documentos,
    contratos,
    imoveis,
    recebimentos,
    timeline
  };
}

async function cadastrar(userData, responsavelUser, ip) {
  const { tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao } = userData;

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
  const duplicated = await locatariosRepository.existsCpfCnpj(cleanCpfCnpj);
  if (duplicated) throw new Error('CPF/CNPJ já cadastrado para outro locatário.');

  // 3. Generate code automatically: LOC-0001
  const codigo = await generateNextCode('LOC', 'locatarios', 'codigo');

  // 4. Create
  const loc = await locatariosRepository.create({
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
    status: status || 'ativo',
    data_nascimento: data_nascimento ? data_nascimento : null,
    rg_orgao: rg_orgao ? rg_orgao.trim() : null,
    rg_uf: rg_uf ? rg_uf.trim() : null,
    genero: genero || 'Não informado',
    nacionalidade: nacionalidade ? nacionalidade.trim() : null,
    estado_civil: estado_civil || 'Não informado',
    profissao: profissao ? profissao.trim() : null
  });

  // 5. Audit log
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Cadastro',
    modulo: 'Locatários',
    registroId: loc.id,
    descricao: `Usuário ${responsavelUser.nome} cadastrou o locatário ${nome_razao_social} (Código: ${codigo}).`,
    ip
  });

  return loc;
}

async function atualizar(id, userData, responsavelUser, ip) {
  const { tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, inscricao_estadual, responsavel, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao } = userData;

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

  // Check duplicate CPF/CNPJ excluding current ID
  const duplicated = await locatariosRepository.existsCpfCnpj(cleanCpfCnpj, id);
  if (duplicated) throw new Error('CPF/CNPJ já cadastrado para outro locatário.');

  // 3. Update
  const updated = await locatariosRepository.update(id, {
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
    status,
    data_nascimento: data_nascimento ? data_nascimento : null,
    rg_orgao: rg_orgao ? rg_orgao.trim() : null,
    rg_uf: rg_uf ? rg_uf.trim() : null,
    genero: genero || 'Não informado',
    nacionalidade: nacionalidade ? nacionalidade.trim() : null,
    estado_civil: estado_civil || 'Não informado',
    profissao: profissao ? profissao.trim() : null
  });

  if (!updated) throw new Error('Locatário não encontrado.');

  // 4. Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Edição',
    modulo: 'Locatários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} editou os dados do locatário ${nome_razao_social} (ID: ${id}).`,
    ip
  });

  return updated;
}

async function inativar(id, responsavelUser, ip) {
  const loc = await locatariosRepository.findById(id);
  if (!loc) throw new Error('Locatário não encontrado.');

  const result = await locatariosRepository.setStatus(id, 'inativo');

  // Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Inativação',
    modulo: 'Locatários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} inativou o locatário ${loc.nome_razao_social} (ID: ${id}).`,
    ip
  });

  return result;
}

async function alterarStatus(id, novoStatus, responsavelUser, ip) {
  const loc = await locatariosRepository.findById(id);
  if (!loc) throw new Error('Locatário não encontrado.');

  if (!['ativo', 'inativo'].includes(novoStatus)) {
    throw new Error('Status inválido.');
  }

  const result = await locatariosRepository.setStatus(id, novoStatus);

  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: novoStatus === 'inativo' ? 'Inativação' : 'Ativação',
    modulo: 'Locatários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} alterou o status do locatário ${loc.nome_razao_social} para "${novoStatus}".`,
    ip
  });

  return result;
}

async function excluir(id, responsavelUser, ip) {
  const loc = await locatariosRepository.findById(id);
  if (!loc) throw new Error('Locatário não encontrado.');

  try {
    const result = await locatariosRepository.remove(id);

    // Audit exclusão
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Exclusão',
      modulo: 'Locatários',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} excluiu o locatário ${loc.nome_razao_social} (Código: ${loc.codigo}).`,
      ip
    });

    return result;
  } catch (err) {
    if (err.code === '23503') {
      throw new Error('Não é possível excluir este locatário porque existem contratos vinculados a ele. Remova os contratos ou altere o status para Inativo.');
    }
    throw err;
  }
}

// --- Document Management Services ---

async function adicionarDocumento(locatarioId, tipoDocumento, file, responsavelUser, ip) {
  const loc = await locatariosRepository.findById(locatarioId);
  if (!loc) throw new Error('Locatário não encontrado.');

  const { salvarArquivo } = require('../config/storage');
  const storageUrl = await salvarArquivo(file, 'locatarios');

  const doc = await locatariosRepository.addDocument(
    locatarioId,
    tipoDocumento,
    file.originalname,
    storageUrl
  );

  // Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Upload de Documento',
    modulo: 'Locatários',
    registroId: locatarioId,
    descricao: `Usuário ${responsavelUser.nome} fez upload do documento ${tipoDocumento} (${file.originalname}) para o locatário ${loc.nome_razao_social}.`,
    ip
  });

  return doc;
}

async function removerDocumento(documentoId, responsavelUser, ip) {
  const doc = await locatariosRepository.findDocumentById(documentoId);
  if (!doc) throw new Error('Documento não encontrado.');

  const loc = await locatariosRepository.findById(doc.locatario_id);
  const locName = loc ? loc.nome_razao_social : 'Desconhecido';

  // Delete physical file
  const filePath = path.join(__dirname, '../../public', doc.caminho_arquivo);
  const rootFilePath = path.join(__dirname, '../../', doc.caminho_arquivo);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  } else if (fs.existsSync(rootFilePath)) {
    fs.unlinkSync(rootFilePath);
  }

  const result = await locatariosRepository.removeDocument(documentoId);

  // Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Remoção de Documento',
    modulo: 'Locatários',
    registroId: doc.locatario_id,
    descricao: `Usuário ${responsavelUser.nome} removeu o documento ${doc.tipo_documento} (${doc.nome_arquivo}) do locatário ${locName}.`,
    ip
  });

  return result;
}

// --- Sub Resource Lists ---

async function listarContratos(locatarioId) {
  return await locatariosRepository.listContratos(locatarioId);
}

async function listarImoveis(locatarioId) {
  return await locatariosRepository.listImoveis(locatarioId);
}

async function listarRecebimentos(locatarioId) {
  return await locatariosRepository.listRecebimentos(locatarioId);
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
  listarContratos,
  listarImoveis,
  listarRecebimentos,
  excluir,
};
