const db = require('../config/database');

/**
 * Find user by ID
 */
async function findById(id) {
  const query = 'SELECT id, nome, cpf, email, perfil, status, created_at, updated_at FROM usuarios WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Find user with hash for authentication (by email or CPF)
 */
async function findByLogin(login) {
  let query;
  let params;

  if (login.includes('@')) {
    // Search by email
    query = 'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)';
    params = [login];
  } else {
    // Search by cleaned CPF
    const cleanCpf = login.replace(/\D/g, '');
    query = "SELECT * FROM usuarios WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = $1";
    params = [cleanCpf];
  }

  const result = await db.query(query, params);
  return result.rows[0] || null;
}

/**
 * Check if CPF exists for another user
 */
async function existsCpf(cpf, excludeId = null) {
  const cleanCpf = cpf.replace(/\D/g, '');
  let query = "SELECT id FROM usuarios WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = $1";
  const params = [cleanCpf];

  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
}

/**
 * Check if Email exists for another user
 */
async function existsEmail(email, excludeId = null) {
  let query = 'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)';
  const params = [email];

  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
}

/**
 * Create a new user
 */
async function create(user) {
  const { nome, cpf, email, senha_hash, perfil, status } = user;
  const query = `
    INSERT INTO usuarios (nome, cpf, email, senha_hash, perfil, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, nome, cpf, email, perfil, status, created_at
  `;
  const result = await db.query(query, [nome, cpf, email, senha_hash, perfil, status || 'ativo']);
  return result.rows[0];
}

/**
 * Update user details (excluding password)
 */
async function update(id, user) {
  const { nome, cpf, email, perfil, status } = user;
  const query = `
    UPDATE usuarios
    SET nome = $1, cpf = $2, email = $3, perfil = $4, status = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING id, nome, cpf, email, perfil, status, updated_at
  `;
  const result = await db.query(query, [nome, cpf, email, perfil, status || 'ativo', id]);
  return result.rows[0];
}

async function remove(id) {
  const query = 'DELETE FROM usuarios WHERE id = $1 RETURNING id, nome';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Redefine user password
 */
async function updatePassword(id, senha_hash) {
  const query = `
    UPDATE usuarios
    SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id
  `;
  const result = await db.query(query, [senha_hash, id]);
  return result.rows.length > 0;
}

/**
 * Update user's last login timestamp
 */
async function updateLastLogin(id) {
  const query = 'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1';
  await db.query(query, [id]);
}

/**
 * Soft delete/Inactivate user
 */
async function setStatus(id, status) {
  const query = `
    UPDATE usuarios
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, status
  `;
  const result = await db.query(query, [status, id]);
  return result.rows[0] || null;
}

/**
 * List all users (with pagination and filters)
 */
async function listAll(limit = 10, offset = 0) {
  const query = `
    SELECT id, nome, cpf, email, perfil, status, ultimo_login, created_at, updated_at
    FROM usuarios
    ORDER BY nome ASC
    LIMIT $1 OFFSET $2
  `;
  const countQuery = 'SELECT COUNT(id) FROM usuarios';

  const [resList, resCount] = await Promise.all([
    db.query(query, [limit, offset]),
    db.query(countQuery),
  ]);

  return {
    rows: resList.rows,
    total: parseInt(resCount.rows[0].count, 10),
  };
}

module.exports = {
  findById,
  findByLogin,
  existsCpf,
  existsEmail,
  create,
  update,
  updatePassword,
  updateLastLogin,
  setStatus,
  listAll,
  remove,
};
