const db = require('../config/database');
const notificacoesService = require('../services/notificacoes.service');

async function run() {
  console.log('[Job] Checking vistorias and scheduling alerts (verificarVistorias) started...');

  try {
    const formatDate = (val) => new Date(val).toLocaleDateString('pt-BR');

    // 1. Alert: Vistoria agendada para hoje
    const todayQuery = `
      SELECT v.*, i.nome AS imovel_name
      FROM vistorias v
      JOIN imoveis i ON v.imovel_id = i.id
      WHERE v.status IN ('Pendente', 'Em Andamento')
        AND v.data_vistoria = CURRENT_DATE
    `;
    const todayRes = await db.query(todayQuery);
    
    for (const v of todayRes.rows) {
      const titulo = `Vistoria Agendada para Hoje`;
      const descricao = `A vistoria ${v.codigo} (${v.tipo}) do Imóvel "${v.imovel_name}" está agendada para hoje (${formatDate(v.data_vistoria)}). Responsável: ${v.responsavel}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Vistorias',
        titulo,
        descricao,
        prioridade: 'Alta',
        status: 'Não Lida',
        entidade: 'vistoria',
        registro_id: v.id
      });
    }

    // 2. Alert: Vistoria atrasada
    const overdueQuery = `
      SELECT v.*, i.nome AS imovel_name, (CURRENT_DATE - v.data_vistoria) AS dias_atraso
      FROM vistorias v
      JOIN imoveis i ON v.imovel_id = i.id
      WHERE v.status IN ('Pendente', 'Em Andamento')
        AND v.data_vistoria < CURRENT_DATE
    `;
    const overdueRes = await db.query(overdueQuery);
    
    for (const v of overdueRes.rows) {
      const titulo = `Vistoria Atrasada`;
      const descricao = `A vistoria ${v.codigo} (${v.tipo}) do Imóvel "${v.imovel_name}" está atrasada há ${v.dias_atraso} dia(s). Data agendada era: ${formatDate(v.data_vistoria)}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Vistorias',
        titulo,
        descricao,
        prioridade: 'Crítica',
        status: 'Não Lida',
        entidade: 'vistoria',
        registro_id: v.id
      });
    }

    // 3. Alert: Vistoria pendente (Sem iniciar há mais de 2 dias desde a criação)
    const pendingQuery = `
      SELECT v.*, i.nome AS imovel_name
      FROM vistorias v
      JOIN imoveis i ON v.imovel_id = i.id
      WHERE v.status = 'Pendente'
        AND v.criado_em < CURRENT_TIMESTAMP - INTERVAL '2 days'
    `;
    const pendingRes = await db.query(pendingQuery);
    
    for (const v of pendingRes.rows) {
      const titulo = `Vistoria Pendente no Sistema`;
      const descricao = `A vistoria ${v.codigo} (${v.tipo}) do Imóvel "${v.imovel_name}" permanece com status Pendente e sem execução iniciada. Responsável: ${v.responsavel}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Vistorias',
        titulo,
        descricao,
        prioridade: 'Média',
        status: 'Não Lida',
        entidade: 'vistoria',
        registro_id: v.id
      });
    }

    console.log('[Job] verificarVistorias completed successfully.');
  } catch (error) {
    console.error('[Job] Error executing verificarVistorias job:', error);
  }
}

module.exports = { run };
