const db = require('../config/database');

async function run() {
  console.log('[Job] Generating recurring expenses (gerarDespesasRecorrentes) started...');
  
  try {
    // 1. Fetch active templates
    const query = 'SELECT * FROM despesas_recorrencias WHERE ativa = TRUE';
    const templatesRes = await db.query(query);
    const templates = templatesRes.rows;

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    for (const temp of templates) {
      let nextComp;
      
      if (!temp.ultima_geracao) {
        nextComp = new Date(currentMonthStart.getTime());
      } else {
        const lastGen = new Date(temp.ultima_geracao);
        nextComp = new Date(lastGen.getFullYear(), lastGen.getMonth(), 1);
        
        // Add months based on frequency
        let monthsToAdd = 1;
        if (temp.frequencia === 'Bimestral') monthsToAdd = 2;
        else if (temp.frequencia === 'Trimestral') monthsToAdd = 3;
        else if (temp.frequencia === 'Semestral') monthsToAdd = 6;
        else if (temp.frequencia === 'Anual') monthsToAdd = 12;

        nextComp.setMonth(nextComp.getMonth() + monthsToAdd);
      }

      // Generate all missing competences up to current month (handles catch-up)
      while (nextComp <= currentMonthStart) {
        const compStr = `${nextComp.getFullYear()}-${String(nextComp.getMonth() + 1).padStart(2, '0')}-01`;
        
        // Calculate vencimento date adjusting for month length spill (e.g. Feb 31st becomes Feb 28/29th)
        let vencDate = new Date(nextComp.getFullYear(), nextComp.getMonth(), temp.dia_vencimento);
        if (vencDate.getMonth() !== nextComp.getMonth()) {
          vencDate = new Date(nextComp.getFullYear(), nextComp.getMonth() + 1, 0); // last day
        }
        const vencStr = `${vencDate.getFullYear()}-${String(vencDate.getMonth() + 1).padStart(2, '0')}-${String(vencDate.getDate()).padStart(2, '0')}`;

        console.log(`[Job] Generating despesa for Imóvel ${temp.imovel_id}, Competência ${compStr}, Vencimento ${vencStr}`);

        await db.query('BEGIN');

        try {
          // Create despesa
          const insertRes = await db.query(`
            INSERT INTO despesas (imovel_id, categoria, responsavel, competencia, vencimento, valor, status, recorrente, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, 'A Vencer', TRUE, $7)
            RETURNING id
          `, [
            temp.imovel_id, 
            temp.categoria, 
            temp.responsavel, 
            compStr, 
            vencStr, 
            temp.valor, 
            `Gerada automaticamente do modelo recorrente (Frequência: ${temp.frequencia}).`
          ]);
          
          const newDespId = insertRes.rows[0].id;

          // Add despesa timeline log
          await db.query(`
            INSERT INTO despesas_timeline (despesa_id, usuario_id, acao, descricao)
            VALUES ($1, NULL, 'Cadastro', $2)
          `, [newDespId, `Despesa gerada de forma automática pelo sistema baseando-se no modelo recorrente ID: ${temp.id}.`]);

          // Update template's last generation column
          await db.query(`
            UPDATE despesas_recorrencias 
            SET ultima_geracao = $1 
            WHERE id = $2
          `, [compStr, temp.id]);

          await db.query('COMMIT');
        } catch (err) {
          await db.query('ROLLBACK');
          console.error(`[Job] Error generating despesa for template ${temp.id}:`, err);
          break; // Stop loop for this template on error
        }

        // Advance nextComp based on frequency
        let monthsToAdd = 1;
        if (temp.frequencia === 'Bimestral') monthsToAdd = 2;
        else if (temp.frequencia === 'Trimestral') monthsToAdd = 3;
        else if (temp.frequencia === 'Semestral') monthsToAdd = 6;
        else if (temp.frequencia === 'Anual') monthsToAdd = 12;
        nextComp.setMonth(nextComp.getMonth() + monthsToAdd);
      }
    }
  } catch (error) {
    console.error('[Job] Error in gerarDespesasRecorrentes job:', error);
  }
}

module.exports = { run };
