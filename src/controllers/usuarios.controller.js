const usuariosService = require('../services/usuarios.service');
const { validateCreateUser, validateUpdateUser } = require('../validators/usuario.validator');

async function listar(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const data = await usuariosService.listar(limit, offset);

    res.status(200).json({
      success: true,
      message: 'Usuários listados com sucesso.',
      data: data.rows,
      pagination: {
        page,
        limit,
        total: data.total,
        pages: Math.ceil(data.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;
    const user = await usuariosService.buscarPorId(id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function cadastrar(req, res, next) {
  try {
    const validation = validateCreateUser(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(' | ')
      });
    }

    const responsavelUser = req.session.usuario;
    const newUser = await usuariosService.cadastrar(req.body, responsavelUser);

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso.',
      data: newUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const validation = validateUpdateUser(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(' | ')
      });
    }

    const responsavelUser = req.session.usuario;
    const updatedUser = await usuariosService.atualizar(id, req.body, responsavelUser);

    res.status(200).json({
      success: true,
      message: 'Usuário atualizado com sucesso.',
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function resetarSenha(req, res, next) {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body;

    if (!novaSenha) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha é obrigatória.'
      });
    }

    const responsavelUser = req.session.usuario;
    await usuariosService.resetarSenha(id, novaSenha, responsavelUser);

    res.status(200).json({
      success: true,
      message: 'Senha resetada com sucesso.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function alterarStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const responsavelUser = req.session.usuario;

    if (!status || !['ativo', 'inativo'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status inválido. Use "ativo" ou "inativo".' });
    }

    await usuariosService.alterarStatus(id, status, responsavelUser);
    res.status(200).json({
      success: true,
      message: `Status alterado para "${status === 'ativo' ? 'Ativo' : 'Inativo'}" com sucesso.`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    
    await usuariosService.excluir(id, responsavelUser);

    res.status(200).json({
      success: true,
      message: 'Usuário excluído com sucesso.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  resetarSenha,
  alterarStatus,
  excluir,
};
