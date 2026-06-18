const bcrypt = require('bcryptjs');
const usuariosRepository = require('../repositories/usuarios.repository');
const auditoriaService = require('./auditoria.service');

/**
 * Perform user authentication.
 */
async function login(loginVal, senha, ip) {
  // 1. Fetch user by login (email or CPF)
  const user = await usuariosRepository.findByLogin(loginVal);

  if (!user) {
    throw new Error('Usuário ou senha incorretos.');
  }

  // 2. Check status
  if (user.status !== 'ativo') {
    throw new Error('Este usuário está inativo.');
  }

  // 3. Verify password
  const passwordMatch = await bcrypt.compare(senha, user.senha_hash);
  if (!passwordMatch) {
    throw new Error('Usuário ou senha incorretos.');
  }

  // 4. Update last login
  await usuariosRepository.updateLastLogin(user.id);

  // 5. Register login log in audit
  await auditoriaService.registrarLog({
    usuarioId: user.id,
    acao: 'Login',
    modulo: 'Segurança',
    registroId: user.id,
    descricao: `Usuário ${user.nome} realizou login com sucesso a partir do IP: ${ip}.`
  });

  return {
    id: user.id,
    nome: user.nome,
    perfil: user.perfil
  };
}

/**
 * Perform user logout auditing.
 */
async function logout(user, ip) {
  if (!user) return;
  await auditoriaService.registrarLog({
    usuarioId: user.id,
    acao: 'Logout',
    modulo: 'Segurança',
    registroId: user.id,
    descricao: `Usuário ${user.nome} realizou logout a partir do IP: ${ip}.`
  });
}

module.exports = {
  login,
  logout,
};
