const despesasRepository = require('../repositories/despesas.repository');
const imoveisRepository = require('../repositories/imoveis.repository');
const auditoriaService = require('./auditoria.service');
const path = require('path');
const fs = require('fs');

async function listar(limit, offset, filters) {
  return await despesasRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const desp = await despesasRepository.findById(id);
  if (!desp) throw new Error('Despesa não encontrada.');

  const comprovantes = await despesasRepository.listComprovantes(id);
  const timeline = await despesasRepository.listTimeline(id);

  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Despesas',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou detalhes da despesa ID: ${id} (Imóvel: ${desp.imovel_nome}, Categoria: ${desp.categoria}).`,
      ip
    });
  }

  return {
    ...desp,
    comprovantes,
    timeline
  };
}

async function cadastrar(despData, responsavelUser, ip) {
  const { 
    imovel_id, categoria, responsavel, competencia, vencimento, valor, 
    observacoes, status, recorrente, frequencia, dia_vencimento,
    documento_emissao, documento_vencimento
  } = despData;

  // Validations
  if (!imovel_id) throw new Error('O imóvel é obrigatório.');
  const imovel = await imoveisRepository.findById(imovel_id);
  if (!imovel || imovel.status === 'Inativo') {
    throw new Error('Imóvel associado não encontrado ou inativo.');
  }

  const allowedCategorias = ['IPTU', 'Água', 'Energia', 'Condomínio', 'Seguro', 'Internet', 'Limpeza', 'Manutenção', 'Taxa de Localização', 'Outras'];
  if (!allowedCategorias.includes(categoria)) {
    throw new Error('Categoria de despesa inválida.');
  }

  if (responsavel !== 'Locador' && responsavel !== 'Locatário') {
    throw new Error('Responsável inválido. Deve ser Locador ou Locatário.');
  }

  const numericValor = parseFloat(valor);
  if (isNaN(numericValor) || numericValor <= 0) {
    throw new Error('O valor da despesa deve ser maior que zero.');
  }

  if (!competencia) throw new Error('A competência é obrigatória.');
  if (!vencimento) throw new Error('A data de vencimento é obrigatória.');

  const allowedStatus = ['A Vencer', 'Pago', 'Vencido', 'Cancelado'];
  const finalStatus = status || 'A Vencer';
  if (!allowedStatus.includes(finalStatus)) {
    throw new Error('Status de despesa inválido.');
  }

  let createdDesp;

  if (recorrente) {
    // 1. Recurrence template checks
    const allowedFrequencias = ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];
    if (!allowedFrequencias.includes(frequencia)) {
      throw new Error('Frequência de recorrência inválida.');
    }

    const dueDay = parseInt(dia_vencimento, 10);
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      throw new Error('Dia do vencimento deve estar entre 1 e 31.');
    }

    // Create recurrence template
    const recurrenceTemplate = await despesasRepository.createRecorrencia({
      imovel_id,
      categoria,
      responsavel,
      dia_vencimento: dueDay,
      valor: numericValor,
      frequencia,
      observacoes: observacoes || `Recorrência ${frequencia} cadastrada.`
    });

    // Generate initial installment
    createdDesp = await despesasRepository.create({
      imovel_id,
      categoria,
      responsavel,
      competencia,
      vencimento,
      valor: numericValor,
      observacoes: observacoes ? `${observacoes} (Gerada do modelo recorrente)` : 'Gerada do modelo recorrente',
      status: finalStatus,
      recorrente: true,
      documento_emissao,
      documento_vencimento
    });

    // Update template's last generation column (store initial month)
    const compDate = new Date(competencia + 'T00:00:00');
    await despesasRepository.updateRecorrenciaUltimaGeracao(recurrenceTemplate.id, competencia);

  } else {
    // Single avulsa despesa
    createdDesp = await despesasRepository.create({
      imovel_id,
      categoria,
      responsavel,
      competencia,
      vencimento,
      valor: numericValor,
      observacoes,
      status: finalStatus,
      recorrente: false,
      documento_emissao,
      documento_vencimento
    });
  }

  // Logs and timelines
  const descText = `Despesa cadastrada no valor de R$ ${numericValor} (Categoria: ${categoria}, Responsável: ${responsavel}) por ${responsavelUser.nome}.`;
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cadastro',
      modulo: 'Despesas',
      registroId: createdDesp.id,
      descricao: `Usuário ${responsavelUser.nome} cadastrou despesa ID: ${createdDesp.id} no valor de R$ ${numericValor}.`,
      ip
    }),
    despesasRepository.addTimeline(createdDesp.id, responsavelUser.id, 'Cadastro', descText)
  ]);

  return createdDesp;
}

async function atualizar(id, despData, responsavelUser, ip) {
  const currentDesp = await despesasRepository.findById(id);
  if (!currentDesp) {
    // If not found in despesas, try despesas_recorrencias
    const currentRec = await despesasRepository.findRecorrenciaById(id);
    if (!currentRec) {
      throw new Error('Despesa ou modelo de recorrência não encontrado.');
    }
    
    // Validate recurrence template fields
    const { categoria, responsavel, dia_vencimento, valor, frequencia, observacoes, ativa } = despData;
    
    const allowedCategorias = ['IPTU', 'Água', 'Energia', 'Condomínio', 'Seguro', 'Internet', 'Limpeza', 'Manutenção', 'Taxa de Localização', 'Outras'];
    if (!allowedCategorias.includes(categoria)) {
      throw new Error('Categoria de despesa inválida.');
    }

    if (responsavel !== 'Locador' && responsavel !== 'Locatário') {
      throw new Error('Responsável inválido. Deve ser Locador ou Locatário.');
    }

    const numericValor = parseFloat(valor);
    if (isNaN(numericValor) || numericValor <= 0) {
      throw new Error('O valor da recorrência deve ser maior que zero.');
    }

    const dueDay = parseInt(dia_vencimento, 10);
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      throw new Error('Dia do vencimento deve estar entre 1 e 31.');
    }

    const allowedFrequencias = ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];
    if (!allowedFrequencias.includes(frequencia)) {
      throw new Error('Frequência de recorrência inválida.');
    }

    const isAtiva = ativa !== undefined ? !!ativa : true;

    const updated = await despesasRepository.updateRecorrencia(id, {
      categoria,
      responsavel,
      dia_vencimento: dueDay,
      valor: numericValor,
      frequencia,
      observacoes,
      ativa: isAtiva
    });

    // Auditoria
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Alteração',
      modulo: 'Despesas',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} alterou o modelo de recorrência ID: ${id}.`,
      ip
    });

    return updated;
  }

  const { categoria, responsavel, competencia, vencimento, valor, data_pagamento, observacoes, status, recorrente, documento_emissao, documento_vencimento } = despData;

  const allowedCategorias = ['IPTU', 'Água', 'Energia', 'Condomínio', 'Seguro', 'Internet', 'Limpeza', 'Manutenção', 'Taxa de Localização', 'Outras'];
  if (!allowedCategorias.includes(categoria)) {
    throw new Error('Categoria de despesa inválida.');
  }

  if (responsavel !== 'Locador' && responsavel !== 'Locatário') {
    throw new Error('Responsável inválido. Deve ser Locador ou Locatário.');
  }

  const numericValor = parseFloat(valor);
  if (isNaN(numericValor) || numericValor <= 0) {
    throw new Error('O valor da despesa deve ser maior que zero.');
  }

  if (!competencia) throw new Error('A competência é obrigatória.');
  if (!vencimento) throw new Error('A data de vencimento é obrigatória.');

  const updated = await despesasRepository.update(id, {
    categoria, 
    responsavel, 
    competencia, 
    vencimento, 
    valor: numericValor, 
    data_pagamento: data_pagamento || null, 
    observacoes, 
    status, 
    recorrente: !!recorrente,
    documento_emissao,
    documento_vencimento
  });

  const timelineTxt = `Despesa editada por ${responsavelUser.nome}. Categoria: ${categoria}, Valor: R$ ${numericValor}, Status: ${status}.`;
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Alteração',
      modulo: 'Despesas',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} alterou os dados da despesa ID: ${id}.`,
      ip
    }),
    despesasRepository.addTimeline(id, responsavelUser.id, 'Alteração', timelineTxt)
  ]);

  return updated;
}

async function registrarPagamento(id, payload, file, responsavelUser, ip) {
  const desp = await despesasRepository.findById(id);
  if (!desp) throw new Error('Despesa não encontrada.');

  if (desp.status === 'Cancelado') {
    throw new Error('Não é possível pagar uma despesa cancelada.');
  }

  const { data_pagamento, valor_pago, observacoes } = payload;

  if (!data_pagamento) throw new Error('A data de pagamento é obrigatória.');
  const valPago = parseFloat(valor_pago);
  if (isNaN(valPago) || valPago <= 0) {
    throw new Error('O valor pago deve ser maior que zero.');
  }

  // Update despesa to Paid
  const updatedDesp = await despesasRepository.update(id, {
    categoria: desp.categoria,
    responsavel: desp.responsavel,
    competencia: desp.competencia.toISOString().split('T')[0],
    vencimento: desp.vencimento.toISOString().split('T')[0],
    valor: desp.valor, // keep nominal value
    data_pagamento,
    observacoes: observacoes || desp.observacoes,
    status: 'Pago',
    recorrente: desp.recorrente,
    documento_emissao: desp.documento_emissao ? desp.documento_emissao.toISOString().split('T')[0] : null,
    documento_vencimento: desp.documento_vencimento ? desp.documento_vencimento.toISOString().split('T')[0] : null
  });

  const promises = [];

  // optional file comprobante save
  if (file) {
    // file size constraints: PDF 20MB, images 10MB
    const extension = path.extname(file.originalname).toLowerCase();
    const isImage = /jpeg|jpg|png/.test(extension);
    const size = file.size;

    if (isImage && size > 10 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      throw new Error('Imagens de comprovante não podem exceder 10 MB.');
    }
    if (extension === '.pdf' && size > 20 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      throw new Error('Comprovantes em formato PDF não podem exceder 20 MB.');
    }

    const doc = await despesasRepository.addComprovante(id, file.originalname, `/uploads/despesas/${file.filename}`);
    promises.push(
      despesasRepository.addTimeline(
        id,
        responsavelUser.id,
        'Upload',
        `Comprovante de pagamento "${file.originalname}" anexado por ${responsavelUser.nome}.`
      )
    );
  }

  const pDesc = `Pagamento de R$ ${valPago} efetuado em ${data_pagamento} por ${responsavelUser.nome}.`;
  
  promises.push(
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Pagamento',
      modulo: 'Despesas',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} registrou pagamento de R$ ${valPago} para despesa ID: ${id}.`,
      ip
    }),
    despesasRepository.addTimeline(id, responsavelUser.id, 'Pagamento', pDesc)
  );

  await Promise.all(promises);
  return await buscarPorId(id);
}

async function cancelar(id, responsavelUser, ip) {
  // Privilege check
  if (responsavelUser.perfil !== 'administrador') {
    throw new Error('Apenas administradores podem cancelar despesas.');
  }

  const desp = await despesasRepository.findById(id);
  if (!desp) throw new Error('Despesa não encontrada.');

  const result = await despesasRepository.setStatus(id, 'Cancelado');

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cancelamento',
      modulo: 'Despesas',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} cancelou a despesa ID: ${id}.`,
      ip
    }),
    despesasRepository.addTimeline(id, responsavelUser.id, 'Cancelamento', `Despesa cancelada no sistema por ${responsavelUser.nome}.`)
  ]);

  return result;
}

// --- Comprovantes upload & remove ---

async function adicionarComprovante(despesaId, file, responsavelUser, ip) {
  const desp = await despesasRepository.findById(despesaId);
  if (!desp) throw new Error('Despesa não encontrada.');

  const extension = path.extname(file.originalname).toLowerCase();
  const isImage = /jpeg|jpg|png/.test(extension);
  const size = file.size;

  if (isImage && size > 10 * 1024 * 1024) {
    fs.unlinkSync(file.path);
    throw new Error('Imagens de comprovante não podem exceder 10 MB.');
  }
  if (extension === '.pdf' && size > 20 * 1024 * 1024) {
    fs.unlinkSync(file.path);
    throw new Error('Comprovantes em formato PDF não podem exceder 20 MB.');
  }

  const doc = await despesasRepository.addComprovante(despesaId, file.originalname, `/uploads/despesas/${file.filename}`);

  await Promise.all([
    despesasRepository.addTimeline(
      despesaId,
      responsavelUser.id,
      'Upload',
      `Comprovante "${file.originalname}" anexado por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Upload',
      modulo: 'Despesas',
      registroId: despesaId,
      descricao: `Usuário ${responsavelUser.nome} enviou anexo "${file.originalname}" para despesa ID: ${despesaId}.`,
      ip
    })
  ]);

  return doc;
}

async function removerComprovante(comprovanteId, responsavelUser, ip) {
  const comp = await despesasRepository.findComprovanteById(comprovanteId);
  if (!comp) throw new Error('Comprovante não encontrado.');

  const despesaId = comp.despesa_id;

  // Physical file delete from uploads directory
  const p1 = path.join(__dirname, '../../public', comp.caminho_arquivo);
  const p2 = path.join(__dirname, '../../', comp.caminho_arquivo);

  if (fs.existsSync(p1)) {
    fs.unlinkSync(p1);
  } else if (fs.existsSync(p2)) {
    fs.unlinkSync(p2);
  }

  await despesasRepository.removeComprovante(comprovanteId);

  await Promise.all([
    despesasRepository.addTimeline(
      despesaId,
      responsavelUser.id,
      'Remoção de Documento',
      `Comprovante "${comp.nome_arquivo}" removido por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Remoção de Documento',
      modulo: 'Despesas',
      registroId: despesaId,
      descricao: `Usuário ${responsavelUser.nome} removeu o comprovante "${comp.nome_arquivo}" da despesa ID: ${despesaId}.`,
      ip
    })
  ]);

  return true;
}

async function listRecorrentes() {
  return await despesasRepository.listRecorrentes();
}

async function getCardsStats() {
  return await despesasRepository.getCardsStats();
}

async function getGraficosData() {
  return await despesasRepository.getGraficosData();
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  registrarPagamento,
  cancelar,
  adicionarComprovante,
  removerComprovante,
  listRecorrentes,
  getCardsStats,
  getGraficosData,
};
