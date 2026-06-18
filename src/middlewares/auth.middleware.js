/**
 * Middleware to check if the user is authenticated.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }

  // If request is for an API route, return 401 JSON
  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({
      success: false,
      message: 'Sessão expirada ou usuário não autenticado.'
    });
  }

  // Otherwise, redirect to login page
  return res.redirect('/login');
}

/**
 * Middleware to redirect authenticated users away from login page.
 */
function redirectIfAuth(req, res, next) {
  if (req.session && req.session.usuario) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = {
  requireAuth,
  redirectIfAuth
};
