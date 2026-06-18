const logger = require('../utils/logger');

function errorMiddleware(err, req, res, next) {
  const statusCode = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  
  // Extract user details from session if logged in
  const usuario = req.session && req.session.usuario ? req.session.usuario.nome : 'Anônimo';
  const usuarioId = req.session && req.session.usuario ? req.session.usuario.id : null;

  // Log error using the centralized logger
  logger.error(`Erro na rota ${req.method} ${req.originalUrl}`, err, {
    usuario,
    usuarioId,
    statusCode,
    ip: req.ip
  });

  // Standard JSON response based on API.md
  res.status(statusCode).json({
    success: false,
    message: message
  });
}

module.exports = errorMiddleware;
