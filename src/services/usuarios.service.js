const bcrypt = require('bcryptjs');
const usuariosRepository = require('../repositories/usuarios.repository');
const auditoriaService = require('./auditoria.service');

/**
 * List all users with pagination.
 */
async function listar(limit, offset) {
  return await usuariosRepository.listAll(limit, offset);
}

/**
 * Fetch a single user by ID.
 */
async function buscarPorId(id) {
  const user = await usuariosRepository.findById(id);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }
  return user;
}

/**
 * Create a new user.
 */
async function cadastrar(userData, responsavelUser) {
  const { nome, cpf, email, senha, perfil, status } = userData;

  // Clean CPF
  const cleanCpf = cpf.replace(/\D/g, '');

  // 1. Verify duplicates
  const cpfDuplicated = await usuariosRepository.existsCpf(cleanCpf);
  if (cpfDuplicated) {
    throw new Error('CPF já cadastrado no sistema.');
  }

  const emailDuplicated = await usuariosRepository.existsEmail(email);
  if (emailDuplicated) {
    throw new Error('E-mail já cadastrado no sistema.');
  }

  // 2. Hash password
  const senha_hash = await bcrypt.hash(senha, 10);

  // 3. Persist
  const newUser = await usuariosRepository.create({
    nome,
    cpf: cleanCpf,
    email,
    senha_hash,
    perfil,
    status: status || 'ativo'
  });

  // 4. Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Cadastro de Usuário',
    modulo: 'Usuários',
    registroId: newUser.id,
    descricao: `Usuário ${responsavelUser.nome} cadastrou o usuário ${nome} (ID: ${newUser.id}, CPF: ${cleanCpf}).`
  });

  return newUser;
}

/**
 * Update an existing user.
 */
async function atualizar(id, userData, responsavelUser) {
  const { nome, cpf, email, perfil, status } = userData;

  const cleanCpf = cpf.replace(/\D/g, '');

  // 1. Verify duplicates excluding current user ID
  const cpfDuplicated = await usuariosRepository.existsCpf(cleanCpf, id);
  if (cpfDuplicated) {
    throw new Error('CPF já cadastrado para outro usuário.');
  }

  const emailDuplicated = await usuariosRepository.existsEmail(email, id);
  if (emailDuplicated) {
    throw new Error('E-mail já cadastrado para outro usuário.');
  }

  // 2. Update
  const updatedUser = await usuariosRepository.update(id, {
    nome,
    cpf: cleanCpf,
    email,
    perfil,
    status
  });

  if (!updatedUser) {
    throw new Error('Erro ao atualizar usuário.');
  }

  // 3. Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Alteração de Usuário',
    modulo: 'Usuários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} alterou os dados do usuário ${nome} (ID: ${id}).`
  });

  return updatedUser;
}

/**
 * Reset a user's password.
 */
async function resetarSenha(id, novaSenha, responsavelUser) {
  if (!novaSenha || novaSenha.length < 8) {
    throw new Error('A nova senha deve conter no mínimo 8 caracteres.');
  }

  // 1. Hash password
  const senha_hash = await bcrypt.hash(novaSenha, 10);

  // 2. Persist update
  const success = await usuariosRepository.updatePassword(id, senha_hash);
  if (!success) {
    throw new Error('Usuário não encontrado ou erro ao redefinir senha.');
  }

  // 3. Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Reset de Senha',
    modulo: 'Usuários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} redefiniu a senha do usuário com ID ${id}.`
  });
}

/**
 * Set user status (e.g. inativar).
 */
async function inativar(id, responsavelUser) {
  // Prevent self-inactivation
  if (id === responsavelUser.id) {
    throw new Error('Você não pode inativar a si mesmo.');
  }

  const result = await usuariosRepository.setStatus(id, 'inativo');
  if (!result) {
    throw new Error('Usuário não encontrado ou erro ao inativar.');
  }

  // Audit
  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: 'Inativação de Usuário',
    modulo: 'Usuários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} inativou o usuário com ID ${id}.`
  });

  return result;
}

async function alterarStatus(id, novoStatus, responsavelUser) {
  if (id === responsavelUser.id) {
    throw new Error('Você não pode alterar o próprio status.');
  }

  if (!['ativo', 'inativo'].includes(novoStatus)) {
    throw new Error('Status inválido.');
  }

  const user = await usuariosRepository.findById(id);
  if (!user) throw new Error('Usuário não encontrado.');

  const result = await usuariosRepository.setStatus(id, novoStatus);

  await auditoriaService.registrarLog({
    usuarioId: responsavelUser.id,
    acao: novoStatus === 'inativo' ? 'Inativação de Usuário' : 'Ativação de Usuário',
    modulo: 'Usuários',
    registroId: id,
    descricao: `Usuário ${responsavelUser.nome} alterou o status do usuário ${user.nome} para "${novoStatus}".`
  });

  return result;
}

async function excluir(id, responsavelUser) {
  // Prevent self-exclusion
  if (id === responsavelUser.id) {
    throw new Error('Você não pode excluir a si mesmo.');
  }

  const user = await usuariosRepository.findById(id);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  try {
    const result = await usuariosRepository.remove(id);

    // Audit exclusão
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Exclusão de Usuário',
      modulo: 'Usuários',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} excluiu o usuário ${user.nome} (ID: ${id}, CPF: ${user.cpf}).`
    });

    return result;
  } catch (err) {
    if (err.code === '23503') {
      throw new Error('Não é possível excluir este usuário porque ele está vinculado a logs de auditoria ou outras ações. Altere o status para Inativo.');
    }
    throw err;
  }
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  resetarSenha,
  inativar,
  alterarStatus,
  excluir
};
