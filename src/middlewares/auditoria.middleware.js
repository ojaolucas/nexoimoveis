const auditoriaService = require('../services/auditoria.service');

/**
 * Middleware global de auditoria automática.
 * Intercepta todas as requisições de escrita (POST, PUT, PATCH, DELETE)
 * e registra automaticamente o log de auditoria após a resposta.
 * 
 * Não depende de implementação manual em cada módulo.
 */
function auditoriaMiddleware(req, res, next) {
  // Só auditar métodos de escrita em rotas de API
  const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isApiRoute = req.originalUrl.startsWith('/api/');
  // Ignorar rotas de auth (login/logout têm auditoria própria)
  const isAuthRoute = req.originalUrl.startsWith('/api/auth');

  if (!writeMethod || !isApiRoute || isAuthRoute) {
    return next();
  }

  // Sobrescrever res.json para capturar a resposta
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // Só auditar respostas bem-sucedidas (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const usuario = req.session?.usuario;
      const { modulo, entidade } = auditoriaService.inferModulo(req.originalUrl);
      const acao = auditoriaService.METHOD_ACTION_MAP[req.method] || 'UPDATE';

      // Extrair registro_id da resposta ou URL
      let registroId = null;
      if (body?.data?.id) registroId = body.data.id;
      else if (req.params?.id) registroId = req.params.id;

      const descricao = auditoriaService.gerarDescricao(acao, modulo, entidade, usuario);
      const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];

      // Dados antes/depois (se disponíveis via req.auditoria)
      const dadosAnteriores = req.auditoria?.antes || null;
      const dadosNovos = req.auditoria?.depois || (body?.data || null);

      auditoriaService.registrarLog({
        usuarioId: usuario?.id || null,
        perfil: usuario?.perfil || null,
        acao,
        modulo,
        entidade,
        registroId,
        descricao,
        dadosAnteriores,
        dadosNovos,
        ip,
        userAgent
      });
    }

    return originalJson(body);
  };

  next();
}

module.exports = auditoriaMiddleware;
