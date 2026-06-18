const validateCPF = require('./cpf.validator');
const validateEmail = require('./email.validator');

/**
 * Validates the request body for creating a user.
 */
function validateCreateUser(body) {
  const errors = [];

  const { nome, cpf, email, senha, perfil } = body;

  if (!nome || nome.trim() === '') {
    errors.push('Nome é obrigatório.');
  }

  if (!cpf || !validateCPF(cpf)) {
    errors.push('CPF inválido ou não informado.');
  }

  if (!email || !validateEmail(email)) {
    errors.push('E-mail inválido ou não informado.');
  }

  if (!senha || senha.length < 8) {
    errors.push('A senha deve conter no mínimo 8 caracteres.');
  }

  const validPerfis = ['administrador', 'operacional', 'consulta'];
  if (!perfil || !validPerfis.includes(perfil)) {
    errors.push('Perfil inválido. Deve ser administrador, operacional ou consulta.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates the request body for updating a user.
 */
function validateUpdateUser(body) {
  const errors = [];

  const { nome, cpf, email, perfil } = body;

  if (!nome || nome.trim() === '') {
    errors.push('Nome é obrigatório.');
  }

  if (!cpf || !validateCPF(cpf)) {
    errors.push('CPF inválido ou não informado.');
  }

  if (!email || !validateEmail(email)) {
    errors.push('E-mail inválido ou não informado.');
  }

  const validPerfis = ['administrador', 'operacional', 'consulta'];
  if (!perfil || !validPerfis.includes(perfil)) {
    errors.push('Perfil inválido. Deve ser administrador, operacional ou consulta.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
};
