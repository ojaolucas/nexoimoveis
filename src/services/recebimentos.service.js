const recebimentosRepository = require('../repositories/recebimentos.repository');
const auditoriaService = require('./auditoria.service');
const db = require('../config/database');

async function listar(limit, offset, filters) {
  return await recebimentosRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const rec = await recebimentosRepository.findById(id);
  if (!rec) throw new Error('Recebimento não encontrado.');

  const pagamentos = await recebimentosRepository.listPayments(id);
  const timeline = await recebimentosRepository.listTimeline(id);

  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Recebimentos',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou detalhes do recebimento (Contrato: ${rec.numero_contrato}, Vencimento: ${rec.vencimento.toISOString().split('T')[0]}).`,
      ip
    });
  }

  // Calculate informative Multa and Juros if overdue
  let multa = 0;
  let juros = 0;
  let diasAtraso = 0;
  const saldoDevedor = parseFloat(rec.valor_previsto) - parseFloat(rec.valor_recebido || 0);

  if (rec.status === 'Vencido' && saldoDevedor > 0) {
    const today = new Date();
    const venc = new Date(rec.vencimento);
    const diffTime = Math.abs(today - venc);
    diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Multa: 2%
    multa = saldoDevedor * 0.02;
    // Juros: 0,033% ao dia
    juros = saldoDevedor * 0.00033 * diasAtraso;
  }

  return {
    ...rec,
    saldo_devedor: saldoDevedor,
    multa_informativa: multa,
    juros_informativo: juros,
    dias_atraso: diasAtraso,
    pagamentos,
    timeline
  };
}

async function registrarPagamento(id, payload, responsavelUser, ip) {
  const { valor_recebido, data_pagamento, forma_pagamento, observacoes } = payload;

  const rec = await recebimentosRepository.findById(id);
  if (!rec) throw new Error('Recebimento não encontrado.');

  if (rec.status === 'Cancelado') {
    throw new Error('Não é possível registrar pagamento em parcelas canceladas.');
  }

  const val = parseFloat(valor_recebido);
  if (isNaN(val) || val <= 0) {
    throw new Error('O valor recebido deve ser maior que zero.');
  }

  if (!data_pagamento) {
    throw new Error('A data de pagamento é obrigatória.');
  }

  const allowedFormas = ['PIX', 'Transferência', 'Dinheiro', 'Boleto', 'Cartão', 'Outros'];
  if (!allowedFormas.includes(forma_pagamento)) {
    throw new Error('Forma de pagamento inválida.');
  }

  // Calculate total already paid
  const pagamentos = await recebimentosRepository.listPayments(id);
  const totalPagoAnterior = pagamentos
    .filter(p => !p.estornado)
    .reduce((sum, p) => sum + parseFloat(p.valor), 0);

  const totalPrevisto = parseFloat(rec.valor_previsto);
  const saldoRestante = totalPrevisto - totalPagoAnterior;

  // Validation: value cannot exceed balance
  // Use a tiny epsilon offset for floating points checks
  if (val > (saldoRestante + 0.001)) {
    throw new Error(`O valor informado (R$ ${val}) é maior do que o saldo devedor restante (R$ ${saldoRestante.toFixed(2)}).`);
  }

  // 1. Add payment entry
  const paymentEntry = await recebimentosRepository.addPayment(
    id,
    val,
    data_pagamento,
    forma_pagamento,
    responsavelUser.id,
    observacoes
  );

  // 2. Recompute totals
  const novoTotalPago = totalPagoAnterior + val;
  let status = 'Parcial';
  if (Math.abs(novoTotalPago - totalPrevisto) < 0.01) {
    status = 'Pago';
  }

  // Update main receivable row
  await recebimentosRepository.update(id, {
    competencia: rec.competencia.toISOString().split('T')[0],
    vencimento: rec.vencimento.toISOString().split('T')[0],
    valor_previsto: totalPrevisto,
    valor_recebido: novoTotalPago,
    data_pagamento: data_pagamento,
    forma_pagamento: forma_pagamento,
    observacoes: rec.observacoes,
    status: status
  });

  // 3. Log events
  const obsDesc = observacoes ? ` Observação: "${observacoes}".` : '';
  const acaoNome = status === 'Pago' ? 'Pagamento' : 'Pagamento Parcial';
  const descTxt = `${acaoNome} de R$ ${val} via ${forma_pagamento} efetuado por ${responsavelUser.nome}.${obsDesc} Saldo restante: R$ ${(totalPrevisto - novoTotalPago).toFixed(2)}.`;

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: acaoNome,
      modulo: 'Recebimentos',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} registrou ${acaoNome.toLowerCase()} de R$ ${val} no recebimento ID: ${id} do Contrato: ${rec.numero_contrato}.`,
      ip
    }),
    recebimentosRepository.addTimeline(id, responsavelUser.id, acaoNome, descTxt)
  ]);

  return await buscarPorId(id);
}

async function estornar(id, payload, responsavelUser, ip) {
  // Privilege check: Admin only
  if (responsavelUser.perfil !== 'administrador') {
    throw new Error('Apenas administradores podem realizar o estorno de lançamentos financeiros.');
  }

  const { pagamento_id } = payload;
  if (!pagamento_id) throw new Error('ID do pagamento é obrigatório para estorno.');

  const rec = await recebimentosRepository.findById(id);
  if (!rec) throw new Error('Recebimento não encontrado.');

  const payment = await recebimentosRepository.findPaymentById(pagamento_id);
  if (!payment || payment.recebimento_id !== id) {
    throw new Error('Lançamento de pagamento não encontrado para este recebimento.');
  }

  if (payment.estornado) {
    throw new Error('Este lançamento de pagamento já foi estornado anteriormente.');
  }

  // 1. Mark as estornado
  await recebimentosRepository.setPaymentEstornado(pagamento_id);

  // 2. Recalculate sum of active payments
  const pagamentos = await recebimentosRepository.listPayments(id);
  const novoTotalPago = pagamentos
    .filter(p => !p.estornado)
    .reduce((sum, p) => sum + parseFloat(p.valor), 0);

  const totalPrevisto = parseFloat(rec.valor_previsto);
  
  // Decide status
  let status = 'Parcial';
  if (novoTotalPago === 0) {
    const today = new Date();
    const venc = new Date(rec.vencimento);
    status = venc < today ? 'Vencido' : 'A Vencer';
  } else if (Math.abs(novoTotalPago - totalPrevisto) < 0.01) {
    status = 'Pago';
  }

  // Get last active payment to preserve data_pagamento and forma_pagamento fields
  const activePayments = pagamentos.filter(p => !p.estornado);
  const lastActive = activePayments[activePayments.length - 1] || null;

  // Update main row
  await recebimentosRepository.update(id, {
    competencia: rec.competencia.toISOString().split('T')[0],
    vencimento: rec.vencimento.toISOString().split('T')[0],
    valor_previsto: totalPrevisto,
    valor_recebido: novoTotalPago > 0 ? novoTotalPago : null,
    data_pagamento: lastActive ? lastActive.data_pagamento.toISOString().split('T')[0] : null,
    forma_pagamento: lastActive ? lastActive.forma_pagamento : null,
    observacoes: rec.observacoes,
    status: status
  });

  // 3. Log actions
  const descTxt = `Estorno de pagamento de R$ ${payment.valor} realizado por ${responsavelUser.nome}. Status revertido para "${status}". Novo saldo devedor: R$ ${(totalPrevisto - novoTotalPago).toFixed(2)}.`;

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Estorno',
      modulo: 'Recebimentos',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} estornou o pagamento ID ${pagamento_id} (R$ ${payment.valor}) no recebimento do Contrato: ${rec.numero_contrato}.`,
      ip
    }),
    recebimentosRepository.addTimeline(id, responsavelUser.id, 'Estorno', descTxt)
  ]);

  return await buscarPorId(id);
}

async function atualizarObservacoes(id, payload, responsavelUser, ip) {
  const { observacoes } = payload;
  const rec = await recebimentosRepository.findById(id);
  if (!rec) throw new Error('Recebimento não encontrado.');

  const updated = await recebimentosRepository.update(id, {
    competencia: rec.competencia.toISOString().split('T')[0],
    vencimento: rec.vencimento.toISOString().split('T')[0],
    valor_previsto: parseFloat(rec.valor_previsto),
    valor_recebido: rec.valor_recebido ? parseFloat(rec.valor_recebido) : null,
    data_pagamento: rec.data_pagamento ? rec.data_pagamento.toISOString().split('T')[0] : null,
    forma_pagamento: rec.forma_pagamento,
    observacoes: observacoes ? observacoes.trim() : null,
    status: rec.status
  });

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Alteração',
      modulo: 'Recebimentos',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} atualizou as observações do recebimento ID: ${id}.`,
      ip
    }),
    recebimentosRepository.addTimeline(id, responsavelUser.id, 'Alteração', `Observações do recebimento atualizadas por ${responsavelUser.nome}.`)
  ]);

  return updated;
}

async function getInadimplencias(responsavelUser = null, ip = null) {
  const data = await recebimentosRepository.getInadimplencias();
  
  // Log visualization
  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Recebimentos',
      registroId: null,
      descricao: `Usuário ${responsavelUser.nome} visualizou o painel de inadimplência.`,
      ip
    });
  }

  // Append informative multa and juros to each item
  return data.map(item => {
    const prev = parseFloat(item.valor_previsto);
    const rec = parseFloat(item.valor_recebido || 0);
    const saldo = prev - rec;
    const dias = parseInt(item.dias_atraso, 10);
    
    return {
      ...item,
      saldo_devedor: saldo,
      multa_informativa: saldo * 0.02,
      juros_informativo: saldo * 0.00033 * dias
    };
  });
}

async function getFluxoCaixa(responsavelUser = null, ip = null) {
  const data = await recebimentosRepository.getFluxoCaixaData();
  
  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Recebimentos',
      registroId: null,
      descricao: `Usuário ${responsavelUser.nome} visualizou o painel de fluxo de caixa.`,
      ip
    });
  }

  return data;
}

async function getCardsStats() {
  return await recebimentosRepository.getCardsStats();
}

module.exports = {
  listar,
  buscarPorId,
  registrarPagamento,
  estornar,
  atualizarObservacoes,
  getInadimplencias,
  getFluxoCaixa,
  getCardsStats,
};
