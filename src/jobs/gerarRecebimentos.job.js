const db = require('../config/database');

async function run() {
  console.log('[Job] Generating automatic receipts status updates (gerarRecebimentos) started...');
  try {
    // 1. Update status to 'Vencido' for overdue unpaid receivables
    const updateOverdueRes = await db.query(`
      UPDATE recebimentos
      SET status = 'Vencido'
      WHERE status IN ('A Vencer', 'Parcial') AND vencimento < CURRENT_DATE
      RETURNING id, contrato_id
    `);
    if (updateOverdueRes.rows.length > 0) {
      console.log(`[Job] Updated ${updateOverdueRes.rows.length} receivables status to 'Vencido'.`);
    }

    console.log('[Job] Generating automatic receipts status updates completed.');
  } catch (error) {
    console.error('[Job] Error running gerarRecebimentos job:', error);
  }
}

module.exports = { run };
