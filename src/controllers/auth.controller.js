const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { login, senha } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!login || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha o login (CPF/E-mail) e a senha.'
      });
    }

    const user = await authService.login(login, senha, ip);

    // Save to Express Session: id, nome, perfil
    req.session.usuario = {
      id: user.id,
      nome: user.nome,
      perfil: user.perfil
    };

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso.',
      usuario: req.session.usuario
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function logout(req, res, next) {
  try {
    const user = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (user) {
      await authService.logout(user, ip);
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Erro ao encerrar sessão.' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ success: true, message: 'Sessão encerrada com sucesso.' });
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    if (req.session && req.session.usuario) {
      return res.status(200).json({
        success: true,
        usuario: req.session.usuario
      });
    }
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  logout,
  me,
};
