const db = require('../config/database');
const notificacoesService = require('../services/notificacoes.service');

async function run() {
  console.log('[Job] Checking pending revenues and overdue alerts (verificarRecebimentos) started...');

  try {
    // 1. Auto-update unpaid, expired recebimentos to 'Vencido'
    const updateRes = await db.query(`
      UPDATE recebimentos 
      SET status = 'Vencido' 
      WHERE status IN ('A Vencer', 'Parcial') 
        AND vencimento < CURRENT_DATE
      RETURNING id
    `);
    
    if (updateRes.rows.length > 0) {
      console.log(`[Job] Updated ${updateRes.rows.length} recebimentos to status 'Vencido'.`);
    }

    const formatBrl = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val));
    const formatDate = (val) => new Date(val).toLocaleDateString('pt-BR');

    // 2. Alert on upcoming vencimento (30, 15, 7, 3, 1 days)
    const upcomingQuery = `
      SELECT r.id, r.vencimento, r.valor_previsto, c.numero_contrato,
             (r.vencimento - CURRENT_DATE) AS dias_restantes
      FROM recebimentos r
      JOIN contratos c ON r.contrato_id = c.id
      WHERE r.status IN ('A Vencer', 'Parcial')
        AND (r.vencimento - CURRENT_DATE) IN (30, 15, 7, 3, 1)
    `;
    const upcomingRes = await db.query(upcomingQuery);
    
    for (const r of upcomingRes.rows) {
      const titulo = `Recebimento de Aluguel Vencendo`;
      const descricao = `O recebimento de aluguel do Contrato ${r.numero_contrato} vence em ${r.dias_restantes} dia(s) (${formatDate(r.vencimento)}). Valor: ${formatBrl(r.valor_previsto)}.`;
      
      let prioridade = 'Média';
      if (r.dias_restantes <= 3) {
        prioridade = 'Crítica';
      } else if (r.dias_restantes <= 7) {
        prioridade = 'Alta';
      }

      await notificacoesService.criarNotificacao({
        categoria: 'Recebimentos',
        titulo,
        descricao,
        prioridade,
        status: 'Não Lida',
        entidade: 'recebimento',
        registro_id: r.id
      });
    }

    // 3. Alert on overdue recebimentos (1, 5, 15, 30 days of delay)
    const overdueQuery = `
      SELECT r.id, r.vencimento, r.valor_previsto, c.numero_contrato,
             (CURRENT_DATE - r.vencimento) AS dias_atraso
      FROM recebimentos r
      JOIN contratos c ON r.contrato_id = c.id
      WHERE r.status = 'Vencido'
        AND (CURRENT_DATE - r.vencimento) IN (1, 5, 15, 30)
    `;
    const overdueRes = await db.query(overdueQuery);
    
    for (const r of overdueRes.rows) {
      const titulo = `Aluguel Vencido (Em Atraso)`;
      const descricao = `ATENÇÃO: O recebimento de aluguel do Contrato ${r.numero_contrato} está VENCIDO há ${r.dias_atraso} dia(s). Vencimento em ${formatDate(r.vencimento)}. Valor: ${formatBrl(r.valor_previsto)}.`;
      
      await notificacoesService.criarNotificacao({
        categoria: 'Recebimentos',
        titulo,
        descricao,
        prioridade: 'Crítica',
        status: 'Não Lida',
        entidade: 'recebimento',
        registro_id: r.id
      });
    }

    console.log('[Job] verificarRecebimentos completed successfully.');
  } catch (error) {
    console.error('[Job] Error executing verificarRecebimentos job:', error);
  }
}

module.exports = { run };
