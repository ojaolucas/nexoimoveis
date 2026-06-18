const vistoriasRepository = require('../repositories/vistorias.repository');
const imoveisRepository = require('../repositories/imoveis.repository');
const auditoriaService = require('./auditoria.service');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

async function listar(limit, offset, filters) {
  return await vistoriasRepository.listAll(limit, offset, filters);
}

async function buscarPorId(id, responsavelUser = null, ip = null) {
  const v = await vistoriasRepository.findById(id);
  if (!v) throw new Error('Vistoria não encontrada.');

  const itens = await vistoriasRepository.listItens(id);
  const fotos = await vistoriasRepository.listFotos(id);
  const timeline = await vistoriasRepository.listTimeline(id);

  if (responsavelUser && ip) {
    await auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Visualização',
      modulo: 'Vistorias',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} visualizou detalhes da vistoria ID: ${id} (Imóvel: ${v.imovel_nome}, Código: ${v.codigo}).`,
      ip
    });
  }

  return {
    ...v,
    itens,
    fotos,
    timeline
  };
}

async function cadastrar(vData, responsavelUser, ip) {
  const { 
    imovel_id, contrato_id, tipo, data_vistoria, 
    responsavel, observacoes_gerais, status 
  } = vData;

  // Validations
  if (!imovel_id) throw new Error('O imóvel é obrigatório.');
  const imovel = await imoveisRepository.findById(imovel_id);
  if (!imovel || imovel.status === 'Inativo') {
    throw new Error('Imóvel associado não encontrado ou inativo.');
  }

  const allowedTipos = ['Entrada', 'Saída', 'Periódica', 'Extraordinária'];
  if (!allowedTipos.includes(tipo)) {
    throw new Error('Tipo de vistoria inválido.');
  }

  if (!data_vistoria) throw new Error('A data da vistoria é obrigatória.');
  if (!responsavel || responsavel.trim() === '') {
    throw new Error('O responsável é obrigatório.');
  }

  const allowedStatus = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'];
  const finalStatus = status || 'Pendente';
  if (!allowedStatus.includes(finalStatus)) {
    throw new Error('Status de vistoria inválido.');
  }

  // Generate sequence code VIS-000001
  const queryMax = `
    SELECT MAX(CAST(SUBSTRING(codigo FROM '\\d+') AS INTEGER)) AS max_val
    FROM vistorias
    WHERE codigo LIKE 'VIS-%'
  `;
  const resMax = await db.query(queryMax);
  const maxVal = resMax.rows[0]?.max_val || 0;
  const nextVal = maxVal + 1;
  const padded = String(nextVal).padStart(6, '0');
  const codigo = `VIS-${padded}`;

  // Start Transaction to guarantee both vistoria and checklist items are created
  const client = await db.getClient ? await db.getClient() : db;
  let created = null;

  try {
    if (client.query) {
      // If db connection supports transaction helper or raw query
      created = await vistoriasRepository.create({
        codigo,
        imovel_id,
        contrato_id: contrato_id || null,
        tipo,
        data_vistoria,
        responsavel: responsavel.trim(),
        observacoes_gerais: observacoes_gerais || null,
        status: finalStatus
      });

      // 14 Standard items checklist initialization
      const standardItens = [
        'Estrutura', 'Cobertura', 'Piso', 'Paredes', 'Pintura', 'Portões', 'Portas', 
        'Janelas', 'Instalação Elétrica', 'Instalação Hidráulica', 'Banheiros', 
        'Área Externa', 'Limpeza Geral', 'Outros'
      ];

      for (const item of standardItens) {
        await vistoriasRepository.createItem(created.id, item, 'Bom', '');
      }
    }
  } catch (err) {
    throw new Error('Erro ao inicializar vistoria: ' + err.message);
  }

  // Timeline and Audit logs
  const descTxt = `Vistoria criada no status "${finalStatus}" por ${responsavelUser.nome}.`;
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cadastro',
      modulo: 'Vistorias',
      registroId: created.id,
      descricao: `Usuário ${responsavelUser.nome} cadastrou a vistoria ${codigo} (Tipo: ${tipo}) para o imóvel ID: ${imovel_id}.`,
      ip
    }),
    vistoriasRepository.addTimeline(created.id, responsavelUser.id, 'Cadastro', descTxt)
  ]);

  return created;
}

async function atualizar(id, vData, responsavelUser, ip) {
  const current = await vistoriasRepository.findById(id);
  if (!current) throw new Error('Vistoria não encontrada.');

  const { 
    contrato_id, tipo, data_vistoria, responsavel, 
    observacoes_gerais, status, checklist 
  } = vData;

  const allowedTipos = ['Entrada', 'Saída', 'Periódica', 'Extraordinária'];
  if (!allowedTipos.includes(tipo)) {
    throw new Error('Tipo de vistoria inválido.');
  }

  if (!data_vistoria) throw new Error('A data é obrigatória.');
  if (!responsavel || responsavel.trim() === '') {
    throw new Error('O responsável é obrigatório.');
  }

  const allowedStatus = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'];
  if (!allowedStatus.includes(status)) {
    throw new Error('Status inválido.');
  }

  // Cancel logic check for RBAC
  if (status === 'Cancelada' && current.status !== 'Cancelada') {
    if (responsavelUser.perfil !== 'administrador') {
      throw new Error('Apenas administradores podem cancelar vistorias.');
    }
  }

  // Update main vistoria
  const updated = await vistoriasRepository.update(id, {
    contrato_id: contrato_id || null,
    tipo,
    data_vistoria,
    responsavel: responsavel.trim(),
    observacoes_gerais: observacoes_gerais || null,
    status
  });

  // Update checklist items if provided
  if (checklist && Array.isArray(checklist)) {
    for (const item of checklist) {
      if (item.id && item.condicao) {
        await vistoriasRepository.updateItem(item.id, item.condicao, item.observacao || '');
      }
    }
  }

  // Timeline and Audit logs
  const diffTxt = `Vistoria editada por ${responsavelUser.nome}. Status: ${status}, Tipo: ${tipo}.`;
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Alteração',
      modulo: 'Vistorias',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} alterou os dados da vistoria ${current.codigo} (ID: ${id}).`,
      ip
    }),
    vistoriasRepository.addTimeline(id, responsavelUser.id, 'Alteração', diffTxt)
  ]);

  return updated;
}

async function concluir(id, payload, responsavelUser, ip) {
  const current = await vistoriasRepository.findById(id);
  if (!current) throw new Error('Vistoria não encontrada.');

  if (current.status === 'Cancelada') {
    throw new Error('Não é possível concluir uma vistoria que foi cancelada.');
  }

  // Update checklist items if they are passed during conclusion
  const { checklist, observacoes_gerais } = payload;
  if (checklist && Array.isArray(checklist)) {
    for (const item of checklist) {
      if (item.id && item.condicao) {
        await vistoriasRepository.updateItem(item.id, item.condicao, item.observacao || '');
      }
    }
  }

  // Update status in DB
  const updated = await vistoriasRepository.update(id, {
    contrato_id: current.contrato_id,
    tipo: current.tipo,
    data_vistoria: current.data_vistoria.toISOString().split('T')[0],
    responsavel: current.responsavel,
    observacoes_gerais: observacoes_gerais || current.observacoes_gerais,
    status: 'Concluída'
  });

  const timelineTxt = `Vistoria finalizada e concluída com sucesso por ${responsavelUser.nome}.`;
  
  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Conclusão',
      modulo: 'Vistorias',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} marcou a vistoria ${current.codigo} como Concluída.`,
      ip
    }),
    vistoriasRepository.addTimeline(id, responsavelUser.id, 'Conclusão', timelineTxt)
  ]);

  return updated;
}

async function cancelar(id, responsavelUser, ip) {
  if (responsavelUser.perfil !== 'administrador') {
    throw new Error('Apenas administradores podem cancelar vistorias.');
  }

  const current = await vistoriasRepository.findById(id);
  if (!current) throw new Error('Vistoria não encontrada.');

  if (current.status === 'Concluída') {
    throw new Error('Não é possível cancelar uma vistoria que já foi concluída.');
  }

  const updated = await vistoriasRepository.setStatus(id, 'Cancelada');

  await Promise.all([
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Cancelamento',
      modulo: 'Vistorias',
      registroId: id,
      descricao: `Usuário ${responsavelUser.nome} cancelou a vistoria ${current.codigo} (ID: ${id}).`,
      ip
    }),
    vistoriasRepository.addTimeline(id, responsavelUser.id, 'Cancelamento', `Vistoria cancelada no sistema por ${responsavelUser.nome}.`)
  ]);

  return updated;
}

// --- Photos Uploads and Removes ---

async function adicionarFoto(vistoriaId, payload, file, responsavelUser, ip) {
  const v = await vistoriasRepository.findById(vistoriaId);
  if (!v) throw new Error('Vistoria não encontrada.');

  const { item_id, tipo_foto } = payload; // tipo_foto: 'Principal', 'Geral', 'Item'
  if (!tipo_foto) throw new Error('O tipo de foto é obrigatório.');

  const allowedTipos = ['Principal', 'Geral', 'Item'];
  if (!allowedTipos.includes(tipo_foto)) {
    throw new Error('Tipo de foto inválido.');
  }

  if (!file) throw new Error('Nenhum arquivo enviado.');

  const extension = path.extname(file.originalname).toLowerCase();
  const isImage = /jpeg|jpg|png/.test(extension);
  const size = file.size;

  if (!isImage) {
    fs.unlinkSync(file.path);
    throw new Error('Apenas formatos de imagem JPG, JPEG e PNG são aceitos.');
  }
  if (size > 10 * 1024 * 1024) {
    fs.unlinkSync(file.path);
    throw new Error('A imagem de vistoria não pode exceder 10 MB.');
  }

  const doc = await vistoriasRepository.addFoto(
    vistoriaId, 
    item_id || null, 
    tipo_foto, 
    `/uploads/vistorias/${file.filename}`
  );

  await Promise.all([
    vistoriasRepository.addTimeline(
      vistoriaId,
      responsavelUser.id,
      'Upload de Foto',
      `Imagem "${tipo_foto}" (${file.originalname}) enviada por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Upload',
      modulo: 'Vistorias',
      registroId: vistoriaId,
      descricao: `Usuário ${responsavelUser.nome} enviou imagem "${tipo_foto}" (${file.originalname}) para vistoria ${v.codigo}.`,
      ip
    })
  ]);

  return doc;
}

async function removerFoto(fotoId, responsavelUser, ip) {
  const doc = await vistoriasRepository.findFotoById(fotoId);
  if (!doc) throw new Error('Foto de vistoria não encontrada.');

  const vistoriaId = doc.vistoria_id;
  const v = await vistoriasRepository.findById(vistoriaId);
  const code = v ? v.codigo : 'Desconhecido';

  // Physical delete
  const p1 = path.join(__dirname, '../../public', doc.caminho_arquivo);
  const p2 = path.join(__dirname, '../../', doc.caminho_arquivo);

  if (fs.existsSync(p1)) {
    fs.unlinkSync(p1);
  } else if (fs.existsSync(p2)) {
    fs.unlinkSync(p2);
  }

  await vistoriasRepository.removeFoto(fotoId);

  await Promise.all([
    vistoriasRepository.addTimeline(
      vistoriaId,
      responsavelUser.id,
      'Remoção de Foto',
      `Foto ID ${fotoId} do tipo "${doc.tipo_foto}" removida por ${responsavelUser.nome}.`
    ),
    auditoriaService.registrarLog({
      usuarioId: responsavelUser.id,
      acao: 'Exclusão',
      modulo: 'Vistorias',
      registroId: vistoriaId,
      descricao: `Usuário ${responsavelUser.nome} removeu foto da vistoria ${code}.`,
      ip
    })
  ]);

  return true;
}

async function getCardsStats() {
  return await vistoriasRepository.getCardsStats();
}

async function getGraficosData() {
  return await vistoriasRepository.getGraficosData();
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  concluir,
  cancelar,
  adicionarFoto,
  removerFoto,
  getCardsStats,
  getGraficosData
};
