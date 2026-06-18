const db = require('../config/database');
const notificacoesService = require('../services/notificacoes.service');

async function run() {
  console.log('[Job] Checking pending expenses and document alerts (verificarDespesas) started...');

  try {
    // 1. Auto-update unpaid, expired despesas to 'Vencido'
    const updateRes = await db.query(`
      UPDATE despesas 
      SET status = 'Vencido' 
      WHERE status = 'A Vencer' 
        AND vencimento < CURRENT_DATE
      RETURNING id
    `);
    
    if (updateRes.rows.length > 0) {
      console.log(`[Job] Updated ${updateRes.rows.length} despesas to status 'Vencido'.`);
      
      for (const d of updateRes.rows) {
        await db.query(`
          INSERT INTO despesas_timeline (despesa_id, usuario_id, acao, descricao)
          VALUES ($1, NULL, 'Status', 'Despesa alterada para status Vencido automaticamente pelo sistema devido ao vencimento.')
        `, [d.id]);
      }
    }

    const formatBrl = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val));
    const formatDate = (val) => new Date(val).toLocaleDateString('pt-BR');

    // 2. Alert on upcoming vencimento (30, 15, 7, 3, 1 days)
    const upcomingQuery = `
      SELECT d.*, i.nome AS imovel_name, (d.vencimento - CURRENT_DATE) AS dias_restantes
      FROM despesas d
      JOIN imoveis i ON d.imovel_id = i.id
      WHERE d.status = 'A Vencer'
        AND (d.vencimento - CURRENT_DATE) IN (30, 15, 7, 3, 1)
    `;
    const upcomingRes = await db.query(upcomingQuery);
    
    for (const d of upcomingRes.rows) {
      const titulo = `Despesa Próxima do Vencimento`;
      const descricao = `A despesa da categoria ${d.categoria} do Imóvel "${d.imovel_name}" vence em ${d.dias_restantes} dia(s) (${formatDate(d.vencimento)}). Valor: ${formatBrl(d.valor)}.`;
      
      let prioridade = 'Média';
      if (d.dias_restantes <= 3) {
        prioridade = 'Crítica';
      } else if (d.dias_restantes <= 7) {
        prioridade = 'Alta';
      }

      await notificacoesService.criarNotificacao({
        categoria: 'Despesas',
        titulo,
        descricao,
        prioridade,
        status: 'Não Lida',
        entidade: 'despesa',
        registro_id: d.id
      });
    }

    // 3. Alert on overdue despesas (1, 5, 15, 30 days of delay)
    const overdueQuery = `
      SELECT d.*, i.nome AS imovel_name, (CURRENT_DATE - d.vencimento) AS dias_atraso
      FROM despesas d
      JOIN imoveis i ON d.imovel_id = i.id
      WHERE d.status = 'Vencido'
        AND (CURRENT_DATE - d.vencimento) IN (1, 5, 15, 30)
    `;
    const overdueRes = await db.query(overdueQuery);
    
    for (const d of overdueRes.rows) {
      const titulo = `Despesa Vencida (Atraso)`;
      const descricao = `A despesa da categoria ${d.categoria} do Imóvel "${d.imovel_name}" está em atraso há ${d.dias_atraso} dia(s). Valor: ${formatBrl(d.valor)}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Despesas',
        titulo,
        descricao,
        prioridade: 'Crítica',
        status: 'Não Lida',
        entidade: 'despesa',
        registro_id: d.id
      });
    }

    // 4. Alert on documents vencimento (IPTU, Seguro, Taxa de Localização)
    const docQuery = `
      SELECT d.*, i.nome AS imovel_name, (d.documento_vencimento - CURRENT_DATE) AS dias_documento
      FROM despesas d
      JOIN imoveis i ON d.imovel_id = i.id
      WHERE d.categoria IN ('IPTU', 'Seguro', 'Taxa de Localização')
        AND d.documento_vencimento IS NOT NULL
        AND d.status != 'Cancelado'
        AND (d.documento_vencimento - CURRENT_DATE) IN (30, 15, 7, 3, 1)
    `;
    const docRes = await db.query(docQuery);
    
    for (const d of docRes.rows) {
      const dataVenc = formatDate(d.documento_vencimento);
      const obs = (d.observacoes || '').toLowerCase();
      
      let catNotif = 'Seguros';
      if (d.categoria === 'IPTU') catNotif = 'IPTU';
      else if (d.categoria === 'Taxa de Localização' || obs.includes('alvará') || obs.includes('alvara')) catNotif = 'Alvarás';
      
      const titulo = `Documento de ${d.categoria} Próximo do Vencimento`;
      const descricao = `O documento de ${d.categoria} do Imóvel "${d.imovel_name}" expira em ${d.dias_documento} dia(s) (${dataVenc}).`;
      
      let prioridade = 'Média';
      if (d.dias_documento <= 3) {
        prioridade = 'Crítica';
      } else if (d.dias_documento <= 7) {
        prioridade = 'Alta';
      }

      await notificacoesService.criarNotificacao({
        categoria: catNotif,
        titulo,
        descricao,
        prioridade,
        status: 'Não Lida',
        entidade: 'despesa', // Associado a esta despesa de documento
        registro_id: d.id
      });
    }

    console.log('[Job] verificarDespesas completed successfully.');
  } catch (error) {
    console.error('[Job] Error executing verificarDespesas job:', error);
  }
}

module.exports = { run };
