const manutencoesRepository = require('../repositories/manutencoes.repository');
const imoveisRepository = require('../repositories/imoveis.repository');
const auditoriaService = require('./auditoria.service');
const { generateNextCode } = require('../utils/generateCode');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

async function listar(limit, offset, filters) {
  return await manutencoesRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const m = await manutencoesRepository.findById(id);
  if (!m) throw new Error('Manutenção não encontrada.');

  const anexos = await manutencoesRepository.listAnexos(id);
  const timeline = await manutencoesRepository.listTimeline(id);

  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Manutenções',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou detalhes da manutenção ID: ${id} (Imóvel: ${m.imovel_nome}, Título: ${m.titulo}).`,
      ip
    });
  }

  return {
    ...m,
    anexos,
    timeline
  };
}

async function cadastrar(mData, responsavelUser, ip) {
  const { 
    imovel_id, tipo, titulo, descricao, data_solicitacao, 
    data_prevista, data_inicio, responsavel, fornecedor_nome, 
    fornecedor_telefone, fornecedor_email, fornecedor_observacoes, 
    valor_previsto, status 
  } = mData;

  // Validations
  if (!imovel_id) throw new Error('O imóvel é obrigatório.');
  const imovel = await imoveisRepository.findById(imovel_id);
  if (!imovel || imovel.status === 'Inativo') {
    throw new Error('Imóvel associado não encontrado ou inativo.');
  }

  const allowedTipos = ['Preventiva', 'Corretiva', 'Emergencial', 'Melhoria', 'Inspeção'];
  if (!allowedTipos.includes(tipo)) {
    throw new Error('Tipo de manutenção inválido.');
  }

  if (!titulo || titulo.trim() === '') {
    throw new Error('O título da manutenção é obrigatório.');
  }

  if (!descricao || descricao.trim() === '') {
    throw new Error('A descrição da manutenção é obrigatória.');
  }

  if (!responsavel || responsavel.trim() === '') {
    throw new Error('O responsável é obrigatório.');
  }

  const valPrev = parseFloat(valor_previsto);
  if (isNaN(valPrev) || valPrev < 0) {
    throw new Error('O valor previsto deve ser um número positivo.');
  }

  const allowedStatus = ['Planejada', 'Em Andamento', 'Concluída', 'Cancelada'];
  const finalStatus = status || 'Planejada';
  if (!allowedStatus.includes(finalStatus)) {
    throw new Error('Status de manutenção inválido.');
  }

  // Generate sequence code MAN-000001
  const queryMax = `
    SELECT MAX(CAST(SUBSTRING(codigo FROM '\\d+') AS INTEGER)) AS max_val
    FROM manutencoes
    WHERE codigo LIKE 'MAN-%'
  `;
  const resMax = await db.query(queryMax);
  const maxVal = resMax.rows[0]?.max_val || 0;
  const nextVal = maxVal + 1;
  const padded = String(nextVal).padStart(6, '0');
  const codigo = `MAN-${padded}`;

  const created = await manutencoesRepository.create({
    codigo,
    imovel_id,
    tipo,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    data_solicitacao: data_solicitacao || new Date().toISOString().split('T')[0],
    data_prevista,
    data_inicio,
    responsavel: responsavel.trim(),
    fornecedor_nome: fornecedor_nome || null,
    fornecedor_telefone: fornecedor_telefone || null,
    fornecedor_email: fornecedor_email || null,
    fornecedor_observacoes: fornecedor_observacoes || null,
    valor_previsto: valPrev,
    status: finalStatus
  });

  // Timeline and Audit logs
  const descTxt = `Manutenção cadastrada no valor previsto de R$ ${valPrev} por ${responsavelUser.nome}.`;
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cadastro',
      modulo: 'Manutenções',
      registroId: created.id,
      descricao: `Usuário ${responsavelUser.nome} cadastrou a manutenção ${codigo} (Título: ${titulo}) para o imóvel ID: ${imovel_id}.`,
      ip
    }),
    manutencoesRepository.addTimeline(created.id, responsavelUser.id, 'Cadastro', descTxt)
  ]);

  return created;
}

async function atualizar(id, mData, responsavelUser, ip) {
  const current = await manutencoesRepository.findById(id);
  if (!current) throw new Error('Manutenção não encontrada.');

  const { 
    tipo, titulo, descricao, data_solicitacao, data_prevista, 
    data_inicio, data_conclusao, responsavel, fornecedor_nome, 
    fornecedor_telefone, fornecedor_email, fornecedor_observacoes, 
    valor_previsto, valor_real, observacoes, status 
  } = mData;

  const allowedTipos = ['Preventiva', 'Corretiva', 'Emergencial', 'Melhoria', 'Inspeção'];
  if (!allowedTipos.includes(tipo)) {
    throw new Error('Tipo de manutenção inválido.');
  }

  if (!titulo || titulo.trim() === '') {
    throw new Error('O título é obrigatório.');
  }

  if (!descricao || descricao.trim() === '') {
    throw new Error('A descrição é obrigatória.');
  }

  if (!responsavel || responsavel.trim() === '') {
    throw new Error('O responsável é obrigatório.');
  }

  const valPrev = parseFloat(valor_previsto);
  if (isNaN(valPrev) || valPrev < 0) {
    throw new Error('O valor previsto deve ser positivo.');
  }

  let valReal = null;
  if (valor_real !== undefined && valor_real !== null && valor_real !== '') {
    valReal = parseFloat(valor_real);
    if (isNaN(valReal) || valReal < 0) {
      throw new Error('O valor real deve ser um número positivo.');
    }
  }

  const allowedStatus = ['Planejada', 'Em Andamento', 'Concluída', 'Cancelada'];
  if (!allowedStatus.includes(status)) {
    throw new Error('Status inválido.');
  }

  // Cancel logic check for RBAC
  if (status === 'Cancelada' && current.status !== 'Cancelada') {
    if (responsavelUser.perfil !== 'administrador') {
      throw new Error('Apenas administradores podem cancelar manutenções.');
    }
  }

  const updated = await manutencoesRepository.update(id, {
    tipo,
    titulo: titulo.trim(),
    descricao: descricao.trim(),
    data_solicitacao,
    data_prevista,
    data_inicio,
    data_conclusao: status === 'Concluída' ? (data_conclusao || new Date().toISOString().split('T')[0]) : (data_conclusao || null),
    responsavel: responsavel.trim(),
    fornecedor_nome: fornecedor_nome || null,
    fornecedor_telefone: fornecedor_telefone || null,
    fornecedor_email: fornecedor_email || null,
    fornecedor_observacoes: fornecedor_observacoes || null,
    valor_previsto: valPrev,
    valor_real: valReal,
    observacoes: observacoes || null,
    status
  });

  // Timeline and Audit logs
  const diffTxt = `Manutenção editada por ${responsavelUser.nome}. Status: ${status}, Tipo: ${tipo}, Responsável: ${responsavel}.`;
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Alteração',
      modulo: 'Manutenções',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} alterou os dados da manutenção ${current.codigo} (ID: ${id}).`,
      ip
    }),
    manutencoesRepository.addTimeline(id, responsavelUser.id, 'Alteração', diffTxt)
  ]);

  return updated;
}

async function concluir(id, payload, responsavelUser, ip) {
  const current = await manutencoesRepository.findById(id);
  if (!current) throw new Error('Manutenção não encontrada.');

  if (current.status === 'Cancelada') {
    throw new Error('Não é possível concluir uma manutenção que foi cancelada.');
  }

  const { data_conclusao, valor_real, observacoes } = payload;

  if (!data_conclusao) throw new Error('A data de conclusão é obrigatória.');
  const valReal = parseFloat(valor_real);
  if (isNaN(valReal) || valReal < 0) {
    throw new Error('O valor real pago deve ser positivo.');
  }

  // Update in DB
  const updated = await manutencoesRepository.update(id, {
    tipo: current.tipo,
    titulo: current.titulo,
    descricao: current.descricao,
    data_solicitacao: current.data_solicitacao.toISOString().split('T')[0],
    data_prevista: current.data_prevista ? current.data_prevista.toISOString().split('T')[0] : null,
    data_inicio: current.data_inicio ? current.data_inicio.toISOString().split('T')[0] : null,
    data_conclusao,
    responsavel: current.responsavel,
    fornecedor_nome: current.fornecedor_nome,
    fornecedor_telefone: current.fornecedor_telefone,
    fornecedor_email: current.fornecedor_email,
    fornecedor_observacoes: current.fornecedor_observacoes,
    valor_previsto: current.valor_previsto,
    valor_real: valReal,
    observacoes: observacoes || current.observacoes,
    status: 'Concluída'
  });

  const timelineTxt = `Manutenção concluída em ${data_conclusao} por ${responsavelUser.nome}. Custo Executado: R$ ${valReal}.`;
  
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Conclusão',
      modulo: 'Manutenções',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} marcou a manutenção ${current.codigo} como Concluída (Valor Real: R$ ${valReal}).`,
      ip
    }),
    manutencoesRepository.addTimeline(id, responsavelUser.id, 'Conclusão', timelineTxt)
  ]);

  return updated;
}

async function cancelar(id, responsavelUser, ip) {
  if (responsavelUser.perfil !== 'administrador') {
    throw new Error('Apenas administradores podem cancelar manutenções.');
  }

  const current = await manutencoesRepository.findById(id);
  if (!current) throw new Error('Manutenção não encontrada.');

  if (current.status === 'Concluída') {
    throw new Error('Não é possível cancelar uma manutenção que já foi concluída.');
  }

  const updated = await manutencoesRepository.setStatus(id, 'Cancelada');

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cancelamento',
      modulo: 'Manutenções',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} cancelou a manutenção ${current.codigo} (ID: ${id}).`,
      ip
    }),
    manutencoesRepository.addTimeline(id, responsavelUser.id, 'Cancelamento', `Manutenção cancelada operacionalmente no sistema por ${responsavelUser.nome}.`)
  ]);

  return updated;
}

// --- Anexos uploads and removes ---

async function adicionarAnexo(manutencaoId, payload, file, responsavelUser, ip) {
  const m = await manutencoesRepository.findById(manutencaoId);
  if (!m) throw new Error('Manutenção não encontrada.');

  const { tipo_anexo } = payload;
  if (!tipo_anexo) throw new Error('O tipo de anexo é obrigatório.');

  const allowedTipos = ['Orçamentos', 'Notas Fiscais', 'Fotos', 'Laudos', 'Relatórios', 'Outros'];
  if (!allowedTipos.includes(tipo_anexo)) {
    throw new Error('Tipo de anexo inválido.');
  }

  if (!file) throw new Error('Nenhum arquivo enviado.');

  const extension = path.extname(file.originalname).toLowerCase();
  const isImage = /jpeg|jpg|png/.test(extension);
  const size = file.size;

  if (isImage && size > 10 * 1024 * 1024) {
    throw new Error('Imagens de anexo não podem exceder 10 MB.');
  }
  if (extension === '.pdf' && size > 20 * 1024 * 1024) {
    throw new Error('Documentos em formato PDF não podem exceder 20 MB.');
  }

  const { salvarArquivo } = require('../config/storage');
  const storageUrl = await salvarArquivo(file, 'manutencoes');

  const doc = await manutencoesRepository.addAnexo(manutencaoId, tipo_anexo, file.originalname, storageUrl);

  await Promise.all([
    manutencoesRepository.addTimeline(
      manutencaoId,
      responsavelUser.id,
      'Upload',
      `Anexo "${tipo_anexo}" (${file.originalname}) enviado por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Upload',
      modulo: 'Manutenções',
      registroId: manutencaoId,
      descricao: `Usuário ${responsavelUser.nome} enviou anexo "${tipo_anexo}" (${file.originalname}) para manutenção ${m.codigo}.`,
      ip
    })
  ]);

  return doc;
}

async function removerAnexo(anexoId, responsavelUser, ip) {
  const doc = await manutencoesRepository.findAnexoById(anexoId);
  if (!doc) throw new Error('Anexo não encontrado.');

  const manutencaoId = doc.manutencao_id;
  const m = await manutencoesRepository.findById(manutencaoId);
  const code = m ? m.codigo : 'Desconhecido';

  // Physical delete
  const p1 = path.join(__dirname, '../../public', doc.caminho_arquivo);
  const p2 = path.join(__dirname, '../../', doc.caminho_arquivo);

  if (fs.existsSync(p1)) {
    fs.unlinkSync(p1);
  } else if (fs.existsSync(p2)) {
    fs.unlinkSync(p2);
  }

  await manutencoesRepository.removeAnexo(anexoId);

  await Promise.all([
    manutencoesRepository.addTimeline(
      manutencaoId,
      responsavelUser.id,
      'Remoção de Documento',
      `Anexo "${doc.tipo_anexo}" (${doc.nome_arquivo}) removido por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Remoção de Documento',
      modulo: 'Manutenções',
      registroId: manutencaoId,
      descricao: `Usuário ${responsavelUser.nome} removeu o anexo "${doc.tipo_anexo}" (${doc.nome_arquivo}) da manutenção ${code}.`,
      ip
    })
  ]);

  return true;
}

async function getCardsStats() {
  return await manutencoesRepository.getCardsStats();
}

async function getGraficosData() {
  return await manutencoesRepository.getGraficosData();
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  concluir,
  cancelar,
  adicionarAnexo,
  removerAnexo,
  getCardsStats,
  getGraficosData
};
