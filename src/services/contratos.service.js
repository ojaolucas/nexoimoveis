const contratosRepository = require('../repositories/contratos.repository');
const imoveisRepository = require('../repositories/imoveis.repository');
const locatariosRepository = require('../repositories/locatarios.repository');
const recebimentosRepository = require('../repositories/recebimentos.repository');
const db = require('../config/database');
const auditoriaService = require('./auditoria.service');
const path = require('path');
const fs = require('fs');

// Generates next contract code formatted as CT-000001
async function generateNextContractCode() {
  const query = `
    SELECT MAX(CAST(SUBSTRING(numero_contrato FROM '\\d+') AS INTEGER)) AS max_val
    FROM contratos
    WHERE numero_contrato LIKE 'CT-%'
  `;
  const result = await db.query(query);
  const maxVal = result.rows[0]?.max_val || 0;
  const nextVal = maxVal + 1;
  const padded = String(nextVal).padStart(6, '0');
  return `CT-${padded}`;
}

async function checkNumeroUnique(numero, excludeId = null) {
  let query = 'SELECT id FROM contratos WHERE numero_contrato = $1';
  const params = [numero];
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const res = await db.query(query, params);
  return res.rows.length === 0;
}

async function listar(limit, offset, filters) {
  return await contratosRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const contrato = await contratosRepository.findById(id);
  if (!contrato) throw new Error('Contrato não encontrado.');

  const recebimentos = await db.query(
    'SELECT * FROM recebimentos WHERE contrato_id = $1 ORDER BY vencimento ASC',
    [id]
  ).then(res => res.rows);

  const reajustes = await contratosRepository.listReajustes(id);
  const renovacoes = await contratosRepository.listRenewals(id);
  const documentos = await contratosRepository.listDocuments(id);
  const timeline = await contratosRepository.listTimeline(id);

  // Log visualization
  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Contratos',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou a ficha do contrato nº ${contrato.numero_contrato}.`,
      ip
    });
  }

  return {
    ...contrato,
    recebimentos,
    reajustes,
    renovacoes,
    documentos,
    timeline
  };
}

async function cadastrar(contratoData, responsavelUser, ip) {
  const { numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes } = contratoData;

  // 1. Core validations
  if (!imovel_id) throw new Error('O imóvel é obrigatório.');
  if (!locatario_id) throw new Error('O locatário é obrigatório.');
  if (!data_inicio) throw new Error('A data de início é obrigatória.');
  if (!data_fim) throw new Error('A data de término é obrigatória.');
  if (!dia_vencimento) throw new Error('O dia de vencimento é obrigatório.');
  if (!garantia) throw new Error('A garantia é obrigatória.');
  if (!indice_reajuste) throw new Error('O índice de reajuste é obrigatório.');

  const imovel = await imoveisRepository.findById(imovel_id);
  if (!imovel || imovel.status === 'Inativo') {
    throw new Error('Imóvel não encontrado ou inativo.');
  }

  const loc = await locatariosRepository.findById(locatario_id);
  if (!loc || loc.status !== 'ativo') {
    throw new Error('Locatário não encontrado ou inativo.');
  }

  // Enforce single active contract limit
  const activeContrato = await contratosRepository.findActiveContratoByImovel(imovel_id);
  if (activeContrato) {
    throw new Error('O imóvel selecionado já possui um contrato ativo.');
  }

  const start = new Date(data_inicio + 'T00:00:00');
  const end = new Date(data_fim + 'T00:00:00');
  if (start >= end) {
    throw new Error('A data de início deve ser anterior à data de término.');
  }

  const val = parseFloat(valor_mensal);
  if (isNaN(val) || val <= 0) {
    throw new Error('O valor mensal do aluguel deve ser maior que zero.');
  }

  const due = parseInt(dia_vencimento, 10);
  if (isNaN(due) || due < 1 || due > 31) {
    throw new Error('O dia de vencimento deve estar entre 1 e 31.');
  }

  // 2. Generate/Validate Code
  let numero = (numero_contrato || '').trim();
  if (!numero) {
    numero = await generateNextContractCode();
  } else {
    const isUnique = await checkNumeroUnique(numero);
    if (!isUnique) {
      throw new Error(`O número de contrato "${numero}" já está em uso.`);
    }
  }

  // 3. Create
  const contrato = await contratosRepository.create({
    numero_contrato: numero,
    imovel_id,
    locatario_id,
    data_inicio,
    data_fim,
    valor_mensal: val,
    dia_vencimento: due,
    caucao: caucao ? parseFloat(caucao) : null,
    garantia,
    indice_reajuste,
    observacoes,
    arquivo_pdf: null
  });

  // 4. Set Property status as 'Alugado'
  await imoveisRepository.setStatus(imovel_id, 'Alugado');

  // 5. Generate payments installments automatically
  await gerarRecebimentosAutomaticos(contrato);

  // 6. Log timeline & audit
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Criação',
      modulo: 'Contratos',
      registroId: contrato.id,
      descricao: `Usuário ${responsavelUser.nome} criou o contrato nº ${numero} (Imóvel: ${imovel.nome}, Locatário: ${loc.nome_razao_social}).`,
      ip
    }),
    contratosRepository.addTimeline(
      contrato.id,
      responsavelUser.id,
      'Criação',
      `Contrato criado no sistema com numeração ${numero} por ${responsavelUser.nome}.`
    )
  ]);

  return contrato;
}

async function gerarRecebimentosAutomaticos(contrato) {
  const start = new Date(contrato.data_inicio + 'T00:00:00');
  const end = new Date(contrato.data_fim + 'T00:00:00');
  const value = contrato.valor_mensal;
  const dueDay = contrato.dia_vencimento;

  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const finish = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= finish) {
    const competencia = new Date(current.getFullYear(), current.getMonth(), 1);
    
    let vencimento = new Date(current.getFullYear(), current.getMonth(), dueDay);
    if (vencimento.getMonth() !== current.getMonth()) {
      vencimento = new Date(current.getFullYear(), current.getMonth() + 1, 0); // last day
    }

    const compStr = `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, '0')}-01`;
    const vencStr = `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, '0')}-${String(vencimento.getDate()).padStart(2, '0')}`;

    await recebimentosRepository.create({
      contrato_id: contrato.id,
      competencia: compStr,
      vencimento: vencStr,
      valor_previsto: value,
      valor_recebido: null,
      data_pagamento: null,
      forma_pagamento: null,
      observacoes: `Gerado automaticamente para competência ${String(competencia.getMonth() + 1).padStart(2, '0')}/${competencia.getFullYear()}`,
      status: 'A Vencer'
    });

    current.setMonth(current.getMonth() + 1);
  }
}

async function atualizar(id, contratoData, responsavelUser, ip) {
  const currentContrato = await contratosRepository.findById(id);
  if (!currentContrato) throw new Error('Contrato não encontrado.');

  const { numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes, status } = contratoData;

  // 1. Validations
  if (!imovel_id) throw new Error('O imóvel é obrigatório.');
  if (!locatario_id) throw new Error('O locatário é obrigatório.');
  if (!data_inicio) throw new Error('A data de início é obrigatória.');
  if (!data_fim) throw new Error('A data de término é obrigatória.');
  if (!dia_vencimento) throw new Error('O dia de vencimento é obrigatório.');

  const imovel = await imoveisRepository.findById(imovel_id);
  if (!imovel) throw new Error('Imóvel não encontrado.');

  const loc = await locatariosRepository.findById(locatario_id);
  if (!loc) throw new Error('Locatário não encontrado.');

  // Validate active contract unique checks
  if (status === 'Ativo') {
    const activeContrato = await contratosRepository.findActiveContratoByImovel(imovel_id, id);
    if (activeContrato) {
      throw new Error('O imóvel selecionado já possui outro contrato ativo.');
    }
  }

  const start = new Date(data_inicio + 'T00:00:00');
  const end = new Date(data_fim + 'T00:00:00');
  if (start >= end) {
    throw new Error('A data de início deve ser anterior à data de término.');
  }

  const val = parseFloat(valor_mensal);
  if (isNaN(val) || val <= 0) {
    throw new Error('O valor mensal deve ser maior que zero.');
  }

  const due = parseInt(dia_vencimento, 10);
  if (isNaN(due) || due < 1 || due > 31) {
    throw new Error('O dia de vencimento deve estar entre 1 e 31.');
  }

  // Validate number unique
  let numero = (numero_contrato || '').trim();
  if (!numero) {
    numero = currentContrato.numero_contrato;
  } else if (numero !== currentContrato.numero_contrato) {
    const isUnique = await checkNumeroUnique(numero, id);
    if (!isUnique) {
      throw new Error(`O número de contrato "${numero}" já está em uso.`);
    }
  }

  // 2. Update
  const updated = await contratosRepository.update(id, {
    numero_contrato: numero,
    imovel_id,
    locatario_id,
    data_inicio,
    data_fim,
    valor_mensal: val,
    dia_vencimento: due,
    caucao: caucao ? parseFloat(caucao) : null,
    garantia,
    indice_reajuste,
    observacoes,
    status,
    arquivo_pdf: currentContrato.arquivo_pdf
  });

  // If status changed to Encerrado or Cancelado, release the property
  const statusChanged = currentContrato.status !== status;
  if (statusChanged && (status === 'Encerrado' || status === 'Cancelado')) {
    await imoveisRepository.setStatus(imovel_id, 'Disponível');
  } else if (statusChanged && status === 'Ativo') {
    await imoveisRepository.setStatus(imovel_id, 'Alugado');
  }

  // 3. Log actions
  const promises = [
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Edição',
      modulo: 'Contratos',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} alterou os dados cadastrais do contrato nº ${numero}.`,
      ip
    }),
    contratosRepository.addTimeline(
      id,
      responsavelUser.id,
      'Edição',
      `Cadastro do contrato editado por ${responsavelUser.nome}.`
    )
  ];

  if (statusChanged) {
    let logAcao = status === 'Encerrado' ? 'Encerramento' : 'Cancelamento';
    promises.push(
      contratosRepository.addTimeline(
        id,
        responsavelUser.id,
        logAcao,
        `Status do contrato alterado para "${status}" por ${responsavelUser.nome}.`
      )
    );
  }

  await Promise.all(promises);
  return updated;
}

async function encerrar(id, responsavelUser, ip) {
  const contrato = await contratosRepository.findById(id);
  if (!contrato) throw new Error('Contrato não encontrado.');

  const updated = await contratosRepository.setStatus(id, 'Encerrado');
  await imoveisRepository.setStatus(contrato.imovel_id, 'Disponível');

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Encerramento',
      modulo: 'Contratos',
      registroId: id,
      descricao: `Contrato nº ${contrato.numero_contrato} foi encerrado pelo usuário ${responsavelUser.nome}.`,
      ip
    }),
    contratosRepository.addTimeline(
      id,
      responsavelUser.id,
      'Encerramento',
      `Contrato encerrado operacionalmente no sistema por ${responsavelUser.nome}.`
    )
  ]);

  return updated;
}

async function cancelar(id, responsavelUser, ip) {
  const contrato = await contratosRepository.findById(id);
  if (!contrato) throw new Error('Contrato não encontrado.');

  const updated = await contratosRepository.setStatus(id, 'Cancelado');
  await imoveisRepository.setStatus(contrato.imovel_id, 'Disponível');

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cancelamento',
      modulo: 'Contratos',
      registroId: id,
      descricao: `Contrato nº ${contrato.numero_contrato} foi cancelado pelo usuário ${responsavelUser.nome}.`,
      ip
    }),
    contratosRepository.addTimeline(
      id,
      responsavelUser.id,
      'Cancelamento',
      `Contrato cancelado operacionalmente no sistema por ${responsavelUser.nome}.`
    )
  ]);

  return updated;
}

async function renovar(id, renovacaoData, responsavelUser, ip) {
  const oldContrato = await buscarPorId(id);
  if (!oldContrato || oldContrato.status !== 'Ativo') {
    throw new Error('Apenas contratos ativos podem ser renovados.');
  }

  const { data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes } = renovacaoData;

  // Encerrar contrato antigo
  await contratosRepository.setStatus(id, 'Encerrado');

  // Gerar numeração automática do novo contrato
  const novoNumero = await generateNextContractCode();

  // Criar novo contrato
  const newContrato = await contratosRepository.create({
    numero_contrato: novoNumero,
    imovel_id: oldContrato.imovel_id,
    locatario_id: oldContrato.locatario_id,
    data_inicio,
    data_fim,
    valor_mensal: parseFloat(valor_mensal),
    dia_vencimento: parseInt(dia_vencimento, 10),
    caucao: caucao ? parseFloat(caucao) : null,
    garantia: garantia || oldContrato.garantia,
    indice_reajuste: indice_reajuste || oldContrato.indice_reajuste,
    observacoes: observacoes || `Renovação do contrato ${oldContrato.numero_contrato}`,
    arquivo_pdf: null
  });

  // Vincular Imóvel como alugado (já está, mas reforçamos)
  await imoveisRepository.setStatus(oldContrato.imovel_id, 'Alugado');

  // Gerar recebimentos automáticos para o novo contrato
  await gerarRecebimentosAutomaticos(newContrato);

  // Registrar em contratos_renovacoes
  await contratosRepository.addRenewals(id, newContrato.id, data_inicio);

  // Registrar local timeline para ambos os contratos
  await Promise.all([
    contratosRepository.addTimeline(
      id,
      responsavelUser.id,
      'Renovação',
      `Contrato renovado e encerrado. Novo contrato gerado: ${novoNumero}.`
    ),
    contratosRepository.addTimeline(
      newContrato.id,
      responsavelUser.id,
      'Criação',
      `Contrato criado via fluxo de renovação do contrato ${oldContrato.numero_contrato} por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Renovação',
      modulo: 'Contratos',
      registroId: newContrato.id,
      descricao: `Contrato nº ${oldContrato.numero_contrato} renovado. Novo contrato nº ${novoNumero} criado.`,
      ip
    })
  ]);

  return newContrato;
}

async function reajustar(id, reajusteData, responsavelUser, ip) {
  const contrato = await contratosRepository.findById(id);
  if (!contrato || contrato.status !== 'Ativo') {
    throw new Error('Apenas contratos ativos podem sofrer reajustes.');
  }

  const { indice, percentual, novo_valor } = reajusteData;
  if (!indice) throw new Error('Índice de reajuste é obrigatório.');
  
  const pct = parseFloat(percentual);
  if (isNaN(pct) || pct <= 0) throw new Error('Percentual de reajuste deve ser maior que zero.');

  const nVal = parseFloat(novo_valor);
  if (isNaN(nVal) || nVal <= 0) throw new Error('Novo valor do contrato deve ser maior que zero.');

  const valorAnterior = parseFloat(contrato.valor_mensal);

  // Update contract monthly value
  await db.query(
    'UPDATE contratos SET valor_mensal = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
    [nVal, id]
  );

  // Update future payments value (status = 'A Vencer')
  await db.query(
    `UPDATE recebimentos 
     SET valor_previsto = $1, 
         observacoes = observacoes || ' (Valor reajustado por índice ' || $2 || ' em ' || $3 || '%)'
     WHERE contrato_id = $4 AND status = 'A Vencer'`,
    [nVal, indice, pct, id]
  );

  // Save to reajustes history
  const dataHoje = new Date().toISOString().split('T')[0];
  await contratosRepository.addReajuste(id, dataHoje, indice, pct, valorAnterior, nVal);

  // Logs
  await Promise.all([
    contratosRepository.addTimeline(
      id,
      responsavelUser.id,
      'Reajuste',
      `Contrato reajustado em ${pct}% pelo índice ${indice}. Valor alterado de R$ ${valorAnterior} para R$ ${nVal} por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Reajuste',
      modulo: 'Contratos',
      registroId: id,
      descricao: `Reajuste de ${pct}% (${indice}) aplicado no contrato nº ${contrato.numero_contrato}. Valor alterado de R$ ${valorAnterior} para R$ ${nVal}.`,
      ip
    })
  ]);

  return {
    ...contrato,
    valor_mensal: nVal
  };
}

// --- Documents uploads and removes ---

async function adicionarDocumento(contratoId, documentData, file, responsavelUser, ip) {
  const contrato = await contratosRepository.findById(contratoId);
  if (!contrato) throw new Error('Contrato não encontrado.');

  const { tipo_documento } = documentData;
  if (!tipo_documento) throw new Error('Tipo de documento é obrigatório.');

  const doc = await contratosRepository.addDocument(
    contratoId,
    tipo_documento,
    file.originalname,
    `/uploads/contratos/${file.filename}`
  );

  await Promise.all([
    contratosRepository.addTimeline(
      contratoId,
      responsavelUser.id,
      'Upload',
      `Documento "${tipo_documento}" (${file.originalname}) anexado por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Upload',
      modulo: 'Contratos',
      registroId: contratoId,
      descricao: `Usuário ${responsavelUser.nome} enviou anexo "${tipo_documento}" (${file.originalname}) para contrato nº ${contrato.numero_contrato}.`,
      ip
    })
  ]);

  return doc;
}

async function removerDocumento(documentoId, responsavelUser, ip) {
  const doc = await contratosRepository.findDocumentById(documentoId);
  if (!doc) throw new Error('Documento não encontrado.');

  const contrato = await contratosRepository.findById(doc.contrato_id);
  const numContrato = contrato ? contrato.numero_contrato : 'Desconhecido';

  // Physical delete
  const p1 = path.join(__dirname, '../../public', doc.caminho_arquivo);
  const p2 = path.join(__dirname, '../../', doc.caminho_arquivo);

  if (fs.existsSync(p1)) {
    fs.unlinkSync(p1);
  } else if (fs.existsSync(p2)) {
    fs.unlinkSync(p2);
  }

  await contratosRepository.removeDocument(documentoId);

  await Promise.all([
    contratosRepository.addTimeline(
      doc.contrato_id,
      responsavelUser.id,
      'Remoção de Documento',
      `Anexo "${doc.tipo_documento}" (${doc.nome_arquivo}) removido por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Remoção de Documento',
      modulo: 'Contratos',
      registroId: doc.contrato_id,
      descricao: `Usuário ${responsavelUser.nome} removeu o anexo "${doc.tipo_documento}" (${doc.nome_arquivo}) do contrato nº ${numContrato}.`,
      ip
    })
  ]);

  return true;
}

async function getCardsStats() {
  return await contratosRepository.getCardsStats();
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  encerrar,
  cancelar,
  renovar,
  reajustar,
  adicionarDocumento,
  removerDocumento,
  getCardsStats,
};
