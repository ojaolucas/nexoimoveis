/**
 * Middleware to check if the user has an allowed role.
 * @param {string[]} allowedRoles 
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.'
      });
    }

    const { perfil } = req.session.usuario;

    if (!allowedRoles.includes(perfil)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Nível de permissão insuficiente.'
      });
    }

    next();
  };
}

// Helpers for common role configurations
const isAdmin = requireRole(['administrador']);
const isOperacionalOrAdmin = requireRole(['administrador', 'operacional']);
const isConsultaOrAbove = requireRole(['administrador', 'operacional', 'consulta']);

module.exports = {
  requireRole,
  isAdmin,
  isOperacionalOrAdmin,
  isConsultaOrAbove,
};
