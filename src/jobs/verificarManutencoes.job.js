const db = require('../config/database');
const notificacoesService = require('../services/notificacoes.service');

async function run() {
  console.log('[Job] Checking maintenances and scheduling alerts (verificarManutencoes) started...');

  try {
    const formatDate = (val) => new Date(val).toLocaleDateString('pt-BR');

    // 1. Alert on: Manutenção prevista para hoje
    const todayQuery = `
      SELECT m.*, i.nome AS imovel_name
      FROM manutencoes m
      JOIN imoveis i ON m.imovel_id = i.id
      WHERE m.status IN ('Planejada', 'Em Andamento')
        AND m.data_prevista = CURRENT_DATE
    `;
    const todayRes = await db.query(todayQuery);
    
    for (const m of todayRes.rows) {
      const titulo = `Manutenção Prevista para Hoje`;
      const descricao = `A manutenção ${m.codigo} ("${m.titulo}") do Imóvel "${m.imovel_name}" está prevista para ser iniciada/executada hoje (${formatDate(m.data_prevista)}). Encarregado: ${m.responsavel}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Manutenções',
        titulo,
        descricao,
        prioridade: 'Alta',
        status: 'Não Lida',
        entidade: 'manutencao',
        registro_id: m.id
      });
    }

    // 2. Alert on: Manutenção atrasada
    const overdueQuery = `
      SELECT m.*, i.nome AS imovel_name, (CURRENT_DATE - m.data_prevista) AS dias_atraso
      FROM manutencoes m
      JOIN imoveis i ON m.imovel_id = i.id
      WHERE m.status NOT IN ('Concluída', 'Cancelada')
        AND m.data_prevista < CURRENT_DATE
    `;
    const overdueRes = await db.query(overdueQuery);
    
    for (const m of overdueRes.rows) {
      const titulo = `Manutenção Atrasada`;
      const descricao = `A manutenção ${m.codigo} ("${m.titulo}") do Imóvel "${m.imovel_name}" está atrasada há ${m.dias_atraso} dia(s). Vencimento previsto: ${formatDate(m.data_prevista)}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Manutenções',
        titulo,
        descricao,
        prioridade: 'Crítica',
        status: 'Não Lida',
        entidade: 'manutencao',
        registro_id: m.id
      });
    }

    // 3. Alert on: Manutenção em andamento há mais de 7 dias
    const longRunningQuery = `
      SELECT m.*, i.nome AS imovel_name, (CURRENT_DATE - m.data_inicio) AS dias_andamento
      FROM manutencoes m
      JOIN imoveis i ON m.imovel_id = i.id
      WHERE m.status = 'Em Andamento'
        AND m.data_inicio < CURRENT_DATE - INTERVAL '7 days'
    `;
    const longRunningRes = await db.query(longRunningQuery);
    
    for (const m of longRunningRes.rows) {
      const titulo = `Manutenção em Andamento Prolongado`;
      const descricao = `A manutenção ${m.codigo} ("${m.titulo}") do Imóvel "${m.imovel_name}" está em andamento há ${m.dias_andamento} dia(s). Data de início: ${formatDate(m.data_inicio)}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Manutenções',
        titulo,
        descricao,
        prioridade: 'Média',
        status: 'Não Lida',
        entidade: 'manutencao',
        registro_id: m.id
      });
    }

    console.log('[Job] verificarManutencoes completed successfully.');
  } catch (error) {
    console.error('[Job] Error executing verificarManutencoes job:', error);
  }
}

module.exports = { run };
