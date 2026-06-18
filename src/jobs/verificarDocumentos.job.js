const db = require('../config/database');
const notificacoesService = require('../services/notificacoes.service');

async function run() {
  console.log('[Job] Checking property document expirations (verificarDocumentos) started...');
  try {
    // Helper function to map document string to target category in notifications
    const mapCategory = (tipoDoc) => {
      const doc = (tipoDoc || '').toLowerCase();
      if (doc.includes('iptu')) return 'IPTU';
      if (doc.includes('alvará') || doc.includes('alvara')) return 'Alvarás';
      if (doc.includes('avcb')) return 'AVCB';
      if (doc.includes('seguro')) return 'Seguros';
      return 'Sistema'; // Default fallback
    };

    // 1. Query documents expiring in (90, 60, 30, 15, 7, 1) days
    const queryExpiring = `
      SELECT d.id, d.tipo_documento, d.data_vencimento, i.nome AS imovel_name,
             (d.data_vencimento - CURRENT_DATE) AS dias_restantes
      FROM imoveis_documentos d
      JOIN imoveis i ON d.imovel_id = i.id
      WHERE d.data_vencimento IS NOT NULL
        AND i.status != 'Inativo'
        AND (d.data_vencimento - CURRENT_DATE) IN (90, 60, 30, 15, 7, 1)
    `;
    const resExpiring = await db.query(queryExpiring);

    for (const doc of resExpiring.rows) {
      const { id, tipo_documento, data_vencimento, imovel_name, dias_restantes } = doc;
      const dataVencStr = new Date(data_vencimento).toLocaleDateString('pt-BR');
      
      const titulo = `Documento ${tipo_documento} vencendo em ${dias_restantes} dias`;
      const descricao = `O documento "${tipo_documento}" do Imóvel "${imovel_name}" vencerá em ${dias_restantes} dias, na data ${dataVencStr}. Providencie a renovação do documento.`;
      
      // Mapeamento de prioridades
      let prioridade = 'Média';
      if (dias_restantes <= 7) {
        prioridade = 'Crítica';
      } else if (dias_restantes <= 30) {
        prioridade = 'Alta';
      }

      await notificacoesService.criarNotificacao({
        categoria: mapCategory(tipo_documento),
        titulo,
        descricao,
        prioridade,
        status: 'Não Lida',
        entidade: 'documento',
        registro_id: id
      });
    }

    // 2. Query documents already expired (1, 5, 15, 30 days ago)
    const queryExpired = `
      SELECT d.id, d.tipo_documento, d.data_vencimento, i.nome AS imovel_name,
             (CURRENT_DATE - d.data_vencimento) AS dias_atraso
      FROM imoveis_documentos d
      JOIN imoveis i ON d.imovel_id = i.id
      WHERE d.data_vencimento IS NOT NULL
        AND i.status != 'Inativo'
        AND d.data_vencimento < CURRENT_DATE
        AND (CURRENT_DATE - d.data_vencimento) IN (1, 5, 15, 30)
    `;
    const resExpired = await db.query(queryExpired);

    for (const doc of resExpired.rows) {
      const { id, tipo_documento, data_vencimento, imovel_name, dias_atraso } = doc;
      const dataVencStr = new Date(data_vencimento).toLocaleDateString('pt-BR');
      
      const titulo = `Documento ${tipo_documento} VENCIDO!`;
      const descricao = `ATENÇÃO: O documento "${tipo_documento}" do Imóvel "${imovel_name}" está VENCIDO há ${dias_atraso} dia(s) (vencimento em ${dataVencStr}).`;

      await notificacoesService.criarNotificacao({
        categoria: mapCategory(tipo_documento),
        titulo,
        descricao,
        prioridade: 'Crítica',
        status: 'Não Lida',
        entidade: 'documento',
        registro_id: id
      });
    }

    console.log('[Job] Checking property document expirations completed.');
  } catch (error) {
    console.error('[Job] Error running verificarDocumentos job:', error);
  }
}

module.exports = { run };
