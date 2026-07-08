const relatoriosService = require('../services/relatorios.service');

// Helper to format currency
function formatCurrency(val) {
  if (val === null || val === undefined) return 'R$ 0,00';
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed);
}

// Helper to format dates
function formatDate(val) {
  if (!val) return '-';
  if (typeof val === 'string') {
    const dateOnly = val.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const date = new Date(val);
  if (isNaN(date.getTime())) return val;
  return date.toLocaleDateString('pt-BR');
}

// Fetch preview data in JSON format
async function obterVisualizacao(req, res, next) {
  try {
    const { tipo } = req.query;
    if (!tipo) throw new Error('Tipo de relatório é obrigatório.');

    const filters = {
      status: req.query.status || '',
      categoria: req.query.categoria || '',
      imovel_id: req.query.imovel_id || '',
      data_inicio: req.query.data_inicio || '',
      data_fim: req.query.data_fim || '',
      tipo: req.query.tipo_imovel || '',
    };

    let data = [];
    switch (tipo) {
      case 'receitas':
        data = await relatoriosService.obterReceitas(filters);
        break;
      case 'despesas':
        data = await relatoriosService.obterDespesas(filters);
        break;
      case 'financeiro-imovel':
        data = await relatoriosService.obterFinanceiroPorImovel(filters);
        break;
      case 'inadimplencia':
        data = await relatoriosService.obterInadimplencia(filters);
        break;
      case 'contratos':
        data = await relatoriosService.obterContratos(filters);
        break;
      case 'ocupacao':
        data = await relatoriosService.obterOcupacao(filters);
        break;
      case 'imoveis':
        data = await relatoriosService.obterImoveis(filters);
        break;
      default:
        throw new Error('Tipo de relatório inválido.');
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Export to CSV (Excel format)
async function exportarExcel(req, res, next) {
  try {
    const { tipo } = req.query;
    if (!tipo) throw new Error('Tipo de relatório é obrigatório.');

    const filters = {
      status: req.query.status || '',
      categoria: req.query.categoria || '',
      imovel_id: req.query.imovel_id || '',
      data_inicio: req.query.data_inicio || '',
      data_fim: req.query.data_fim || '',
      tipo: req.query.tipo_imovel || '',
    };

    let data = [];
    let headers = '';
    let rowMapper = (row) => '';
    let filename = `relatorio_${tipo}.csv`;

    switch (tipo) {
      case 'receitas':
        data = await relatoriosService.obterReceitas(filters);
        headers = 'Imóvel;Locatário;Competência;Vencimento;Previsto;Recebido;Data Pagamento;Forma Pagamento;Status;Observações\n';
        rowMapper = r => `${r.imovel_nome};${r.locatario_nome};${formatDate(r.competencia)};${formatDate(r.vencimento)};${formatCurrency(r.valor_previsto)};${r.valor_recebido ? formatCurrency(r.valor_recebido) : '-'};${r.data_pagamento ? formatDate(r.data_pagamento) : '-'};${r.forma_pagamento || '-'};${r.status};${(r.observacoes || '').replace(/;/g, ',')}\n`;
        break;
      case 'despesas':
        data = await relatoriosService.obterDespesas(filters);
        headers = 'Imóvel;Categoria;Responsável;Competência;Vencimento;Valor;Data Pagamento;Status;Observações\n';
        rowMapper = r => `${r.imovel_nome};${r.categoria};${r.responsavel};${formatDate(r.competencia)};${formatDate(r.vencimento)};${formatCurrency(r.valor)};${r.data_pagamento ? formatDate(r.data_pagamento) : '-'};${r.status};${(r.observacoes || '').replace(/;/g, ',')}\n`;
        break;
      case 'financeiro-imovel':
        data = await relatoriosService.obterFinanceiroPorImovel(filters);
        headers = 'Imóvel;Total Receitas Recebidas;Total Despesas Pagas;Saldo Líquido\n';
        rowMapper = r => `${r.imovel_nome};${formatCurrency(r.total_receitas)};${formatCurrency(r.total_despesas)};${formatCurrency(r.saldo)}\n`;
        break;
      case 'inadimplencia':
        data = await relatoriosService.obterInadimplencia(filters);
        headers = 'Imóvel;Locatário;Competência;Vencimento;Valor Aberto;Dias de Atraso\n';
        rowMapper = r => `${r.imovel_nome};${r.locatario_nome};${formatDate(r.competencia)};${formatDate(r.vencimento)};${formatCurrency(r.valor_previsto)};${r.dias_atraso}\n`;
        break;
      case 'contratos':
        data = await relatoriosService.obterContratos(filters);
        headers = 'Imóvel;Locatário;Data Início;Data Fim;Valor Mensal;Status\n';
        rowMapper = r => `${r.imovel_nome};${r.locatario_nome};${formatDate(r.data_inicio)};${formatDate(r.data_fim)};${formatCurrency(r.valor_mensal)};${r.status}\n`;
        break;
      case 'ocupacao':
        data = await relatoriosService.obterOcupacao(filters);
        headers = 'Imóvel;Tipo;Status;Valor Locação;Locatário Atual\n';
        rowMapper = r => `${r.imovel_nome};${r.tipo};${r.status};${formatCurrency(r.valor_locacao)};${r.locatario_nome || '-'}\n`;
        break;
      case 'imoveis':
        data = await relatoriosService.obterImoveis(filters);
        headers = 'Imóvel;Tipo;Status;Área Total;Valor Locação;Endereço;Proprietário\n';
        rowMapper = r => `${r.imovel_nome};${r.tipo};${r.status};${r.area_total} m²;${formatCurrency(r.valor_locacao)};${(r.endereco || '').replace(/;/g, ',')};${r.proprietario_nome}\n`;
        break;
      default:
        throw new Error('Tipo de relatório inválido.');
    }

    // Prepend UTF-8 BOM
    let csv = '\uFEFF';

    // Header metadata info
    const responsavelUser = req.session.usuario;
    const dataEmissao = new Date().toLocaleString('pt-BR');
    csv += `NEXOMOVEIS;RELATORIO GERENCIAL: ${tipo.toUpperCase()}\n`;
    csv += `Emissor:;${responsavelUser ? responsavelUser.nome : 'Sistema'}\n`;
    csv += `Data Emissão:;${dataEmissao}\n\n`;

    csv += headers;
    data.forEach(row => {
      csv += rowMapper(row);
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

// Export to print-ready HTML page (PDF trigger)
async function exportarPDF(req, res, next) {
  try {
    const { tipo } = req.query;
    if (!tipo) throw new Error('Tipo de relatório é obrigatório.');

    const filters = {
      status: req.query.status || '',
      categoria: req.query.categoria || '',
      imovel_id: req.query.imovel_id || '',
      data_inicio: req.query.data_inicio || '',
      data_fim: req.query.data_fim || '',
      tipo: req.query.tipo_imovel || '',
    };

    let data = [];
    let title = '';
    let thHeaders = '';
    let rowMapper = (row) => '';

    switch (tipo) {
      case 'receitas':
        data = await relatoriosService.obterReceitas(filters);
        title = 'Relatório de Receitas';
        thHeaders = `<th>Imóvel</th><th>Locatário</th><th>Competência</th><th>Vencimento</th><th>Previsto</th><th>Recebido</th><th>Pagamento</th><th>Forma</th><th>Status</th>`;
        rowMapper = r => `<tr><td>${r.imovel_nome}</td><td>${r.locatario_nome}</td><td>${formatDate(r.competencia)}</td><td>${formatDate(r.vencimento)}</td><td>${formatCurrency(r.valor_previsto)}</td><td>${r.valor_recebido ? formatCurrency(r.valor_recebido) : '-'}</td><td>${r.data_pagamento ? formatDate(r.data_pagamento) : '-'}</td><td>${r.forma_pagamento || '-'}</td><td>${r.status}</td></tr>`;
        break;
      case 'despesas':
        data = await relatoriosService.obterDespesas(filters);
        title = 'Relatório de Despesas';
        thHeaders = `<th>Imóvel</th><th>Categoria</th><th>Responsável</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Pagamento</th><th>Status</th>`;
        rowMapper = r => `<tr><td>${r.imovel_nome}</td><td>${r.categoria}</td><td>${r.responsavel}</td><td>${formatDate(r.competencia)}</td><td>${formatDate(r.vencimento)}</td><td>${formatCurrency(r.valor)}</td><td>${r.data_pagamento ? formatDate(r.data_pagamento) : '-'}</td><td>${r.status}</td></tr>`;
        break;
      case 'financeiro-imovel':
        data = await relatoriosService.obterFinanceiroPorImovel(filters);
        title = 'Relatório Financeiro por Imóvel';
        thHeaders = `<th>Imóvel</th><th>Total Receitas</th><th>Total Despesas</th><th>Saldo Líquido</th>`;
        rowMapper = r => `<tr><td><strong>${r.imovel_nome}</strong></td><td>${formatCurrency(r.total_receitas)}</td><td>${formatCurrency(r.total_despesas)}</td><td style="font-weight:700; color:${r.saldo >= 0 ? '#478C27' : '#9B1C1C'}">${formatCurrency(r.saldo)}</td></tr>`;
        break;
      case 'inadimplencia':
        data = await relatoriosService.obterInadimplencia(filters);
        title = 'Relatório de Inadimplência';
        thHeaders = `<th>Imóvel</th><th>Locatário</th><th>Competência</th><th>Vencimento</th><th>Valor Aberto</th><th>Dias Atraso</th>`;
        rowMapper = r => `<tr><td>${r.imovel_nome}</td><td>${r.locatario_nome}</td><td>${formatDate(r.competencia)}</td><td>${formatDate(r.vencimento)}</td><td>${formatCurrency(r.valor_previsto)}</td><td style="color:#9B1C1C;font-weight:700;">${r.dias_atraso} dias</td></tr>`;
        break;
      case 'contratos':
        data = await relatoriosService.obterContratos(filters);
        title = 'Relatório de Contratos';
        thHeaders = `<th>Imóvel</th><th>Locatário</th><th>Data Início</th><th>Data Fim</th><th>Valor Mensal</th><th>Status</th>`;
        rowMapper = r => `<tr><td>${r.imovel_nome}</td><td>${r.locatario_nome}</td><td>${formatDate(r.data_inicio)}</td><td>${formatDate(r.data_fim)}</td><td>${formatCurrency(r.valor_mensal)}</td><td>${r.status}</td></tr>`;
        break;
      case 'ocupacao':
        data = await relatoriosService.obterOcupacao(filters);
        title = 'Relatório de Ocupação';
        thHeaders = `<th>Imóvel</th><th>Tipo</th><th>Status</th><th>Valor Locação</th><th>Inquilino Atual</th>`;
        rowMapper = r => `<tr><td><strong>${r.imovel_nome}</strong></td><td>${r.tipo}</td><td>${r.status}</td><td>${formatCurrency(r.valor_locacao)}</td><td>${r.locatario_nome || '-'}</td></tr>`;
        break;
      case 'imoveis':
        data = await relatoriosService.obterImoveis(filters);
        title = 'Relatório de Imóveis';
        thHeaders = `<th>Imóvel</th><th>Tipo</th><th>Status</th><th>Área</th><th>Valor Locação</th><th>Proprietário</th>`;
        rowMapper = r => `<tr><td><strong>${r.imovel_nome}</strong></td><td>${r.tipo}</td><td>${r.status}</td><td>${r.area_total} m²</td><td>${formatCurrency(r.valor_locacao)}</td><td>${r.proprietario_nome}</td></tr>`;
        break;
      default:
        throw new Error('Tipo de relatório inválido.');
    }

    const responsavelUser = req.session.usuario;
    const dataEmissao = new Date().toLocaleString('pt-BR');

    let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title} - NexoMoveis</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; color: #111827; padding: 25px; background-color: #ffffff; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #001731; padding-bottom: 15px; margin-bottom: 25px; }
        .logo-title { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 700; color: #001731; }
        .logo-icon { width: 32px; height: 32px; background-color: #478C27; border-radius: 6px; display: flex; align-items:center; justify-content:center; color:white; font-size: 16px; font-weight: bold; }
        .meta-info { text-align: right; font-size: 11px; color: #6B7280; line-height: 1.5; }
        .report-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
        th { background-color: #001731; color: #ffffff; text-align: left; padding: 10px 8px; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
        td { border-bottom: 1px solid #E5E7EB; padding: 10px 8px; color: #374151; }
        tr:nth-child(even) { background-color: #F9FAFB; }
        @media print {
          body { padding: 0; }
          @page { size: A4 landscape; margin: 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-title">
          <div class="logo-icon">N</div>
          <span>NexoMoveis</span>
        </div>
        <div class="meta-info">
          <div><strong>Emissor:</strong> ${responsavelUser ? responsavelUser.nome : 'Sistema'}</div>
          <div><strong>Emissão:</strong> ${dataEmissao}</div>
        </div>
      </div>
      
      <h2 class="report-title">${title}</h2>
      
      <table>
        <thead>
          <tr>${thHeaders}</tr>
        </thead>
        <tbody>
          ${data.map(rowMapper).join('')}
        </tbody>
      </table>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
    `;

    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  obterVisualizacao,
  exportarExcel,
  exportarPDF
};
