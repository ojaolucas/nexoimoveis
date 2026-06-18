const db = require('../config/database');
const notificacoesService = require('../services/notificacoes.service');

async function run() {
  console.log('[Job] Checking contract dates (verificarContratos) started...');
  try {
    const query = `
      SELECT c.id, c.numero_contrato, c.data_fim, l.nome_razao_social AS locatario_nome,
             (c.data_fim - CURRENT_DATE) AS dias_restantes
      FROM contratos c
      JOIN locatarios l ON c.locatario_id = l.id
      WHERE c.status = 'Ativo' 
        AND (c.data_fim - CURRENT_DATE) IN (90, 60, 30, 15, 7, 1)
    `;
    const result = await db.query(query);
    
    for (const row of result.rows) {
      const { id, numero_contrato, data_fim, locatario_nome, dias_restantes } = row;
      const dataFimStr = new Date(data_fim).toLocaleDateString('pt-BR');
      
      const titulo = `Contrato ${numero_contrato} vencendo em ${dias_restantes} dias`;
      const descricao = `O contrato de locação nº ${numero_contrato} (Locatário: ${locatario_nome}) vencerá em ${dias_restantes} dias, na data ${dataFimStr}. Providencie a renovação ou renegociação.`;
      
      // Mapeamento de prioridades
      let prioridade = 'Média';
      if (dias_restantes <= 7) {
        prioridade = 'Crítica';
      } else if (dias_restantes <= 30) {
        prioridade = 'Alta';
      }

      await notificacoesService.criarNotificacao({
        categoria: 'Contrato',
        titulo,
        descricao,
        prioridade,
        status: 'Não Lida',
        entidade: 'contrato',
        registro_id: id
      });
    }
    console.log('[Job] Checking contract dates completed.');
  } catch (error) {
    console.error('[Job] Error running verificarContratos job:', error);
  }
}

module.exports = { run };
