const recebimentosService = require('../services/recebimentos.service');

function formatCurrency(val) {
  if (val === null || val === undefined) return '';
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed);
}

function formatDate(val) {
  if (!val) return '';
  const date = new Date(val);
  if (isNaN(date.getTime())) return val;
  return date.toLocaleDateString('pt-BR');
}

async function listar(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const filters = {
      status: req.query.status || '',
      contrato: req.query.contrato || '',
      imovel: req.query.imovel || '',
      locatario: req.query.locatario || '',
      competencia: req.query.competencia || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || ''
    };

    const data = await recebimentosService.listar(limit, offset, filters);

    res.status(200).json({
      success: true,
      message: 'Recebimentos listados com sucesso.',
      data: data.rows,
      pagination: {
        page,
        limit,
        total: data.total,
        pages: Math.ceil(data.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await recebimentosService.buscarPorId(id, responsavelUser, ip);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function registrarPagamento(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await recebimentosService.registrarPagamento(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Pagamento registrado com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function estornar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await recebimentosService.estornar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Estorno de pagamento realizado com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await recebimentosService.atualizarObservacoes(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Observações atualizadas com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getInadimplencias(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await recebimentosService.getInadimplencias(responsavelUser, ip);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getFluxoCaixa(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await recebimentosService.getFluxoCaixa(responsavelUser, ip);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getCardsStats(req, res, next) {
  try {
    const stats = await recebimentosService.getCardsStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function exportarExcel(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo';
    const filters = {
      status: req.query.status || '',
      contrato: req.query.contrato || '',
      imovel: req.query.imovel || '',
      locatario: req.query.locatario || '',
      competencia: req.query.competencia || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || ''
    };

    let csv = '\uFEFF'; // UTF-8 BOM

    if (reportType === 'prevista') {
      csv += 'Competência;Contrato;Imóvel;Locatário;Vencimento;Valor Previsto\n';
      const data = await recebimentosService.listar(10000, 0, { ...filters, status: 'A Vencer' });
      data.rows.forEach(r => {
        csv += `${formatDate(r.competencia).substring(3)};${r.numero_contrato};${r.imovel_nome.replace(/;/g, ',')};${r.locatario_nome.replace(/;/g, ',')};${formatDate(r.vencimento)};${formatCurrency(r.valor_previsto)}\n`;
      });
    } else if (reportType === 'recebida') {
      csv += 'Competência;Contrato;Imóvel;Locatário;Vencimento;Valor Recebido;Data Pagamento;Forma Pagamento\n';
      // Load Pago/Parcial
      const data = await recebimentosService.listar(10000, 0, filters);
      data.rows.filter(r => r.status === 'Pago' || r.status === 'Parcial').forEach(r => {
        csv += `${formatDate(r.competencia).substring(3)};${r.numero_contrato};${r.imovel_nome.replace(/;/g, ',')};${r.locatario_nome.replace(/;/g, ',')};${formatDate(r.vencimento)};${formatCurrency(r.valor_recebido)};${formatDate(r.data_pagamento)};${r.forma_pagamento || ''}\n`;
      });
    } else if (reportType === 'inadimplencia') {
      csv += 'Contrato;Imóvel;Locatário;Vencimento;Valor Previsto;Valor Recebido;Saldo devedor;Dias em Atraso;Multa (2%);Juros (0.033%/dia)\n';
      const data = await recebimentosService.getInadimplencias();
      data.forEach(r => {
        csv += `${r.numero_contrato};${r.imovel_nome.replace(/;/g, ',')};${r.locatario_nome.replace(/;/g, ',')};${formatDate(r.vencimento)};${formatCurrency(r.valor_previsto)};${formatCurrency(r.valor_recebido)};${formatCurrency(r.saldo_devedor)};${r.dias_atraso};${formatCurrency(r.multa_informativa)};${formatCurrency(r.juros_informativo)}\n`;
      });
    } else if (reportType === 'fluxo-caixa') {
      csv += 'Mês/Ano;Previsto;Recebido\n';
      const data = await recebimentosService.getFluxoCaixa();
      data.forecast.labels.forEach((label, idx) => {
        csv += `${label};${formatCurrency(data.forecast.previstos[idx])};${formatCurrency(data.forecast.recebidos[idx])}\n`;
      });
    } else {
      // periodo / default
      csv += 'Competência;Contrato;Imóvel;Locatário;Vencimento;Valor Previsto;Valor Recebido;Saldo;Status\n';
      const data = await recebimentosService.listar(10000, 0, filters);
      data.rows.forEach(r => {
        const saldo = parseFloat(r.valor_previsto) - parseFloat(r.valor_recebido || 0);
        csv += `${formatDate(r.competencia).substring(3)};${r.numero_contrato};${r.imovel_nome.replace(/;/g, ',')};${r.locatario_nome.replace(/;/g, ',')};${formatDate(r.vencimento)};${formatCurrency(r.valor_previsto)};${formatCurrency(r.valor_recebido)};${formatCurrency(saldo)};${r.status}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=recebimentos_${reportType}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

async function exportarPDF(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo';
    const filters = {
      status: req.query.status || '',
      contrato: req.query.contrato || '',
      imovel: req.query.imovel || '',
      locatario: req.query.locatario || '',
      competencia: req.query.competencia || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || ''
    };

    const responsavelUser = req.session.usuario;
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let tituloRelatorio = 'Relatório de Recebimentos';
    let headersHTML = '';
    let rowsHTML = '';

    if (reportType === 'prevista') {
      tituloRelatorio = 'Relatório de Receita Prevista';
      headersHTML = '<th>Competência</th><th>Contrato</th><th>Imóvel</th><th>Locatário</th><th>Vencimento</th><th>Valor Previsto</th>';
      const data = await recebimentosService.listar(10000, 0, { ...filters, status: 'A Vencer' });
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td>${formatDate(r.competencia).substring(3)}</td>
            <td><strong>${r.numero_contrato}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.locatario_nome}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor_previsto)}</td>
          </tr>
        `;
      });
    } else if (reportType === 'recebida') {
      tituloRelatorio = 'Relatório de Receita Recebida';
      headersHTML = '<th>Competência</th><th>Contrato</th><th>Imóvel</th><th>Locatário</th><th>Vencimento</th><th>Valor Recebido</th><th>Data Pagamento</th><th>Forma</th>';
      const data = await recebimentosService.listar(10000, 0, filters);
      data.rows.filter(r => r.status === 'Pago' || r.status === 'Parcial').forEach(r => {
        rowsHTML += `
          <tr>
            <td>${formatDate(r.competencia).substring(3)}</td>
            <td><strong>${r.numero_contrato}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.locatario_nome}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor_recebido)}</td>
            <td>${formatDate(r.data_pagamento)}</td>
            <td>${r.forma_pagamento || ''}</td>
          </tr>
        `;
      });
    } else if (reportType === 'inadimplencia') {
      tituloRelatorio = 'Relatório de Inadimplência';
      headersHTML = '<th>Contrato</th><th>Imóvel</th><th>Locatário</th><th>Vencimento</th><th>Valor Previsto</th><th>Recebido</th><th>Aberto</th><th>Atraso</th><th>Multa</th><th>Juros</th>';
      const data = await recebimentosService.getInadimplencias();
      data.forEach(r => {
        rowsHTML += `
          <tr>
            <td><strong>${r.numero_contrato}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.locatario_nome}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor_previsto)}</td>
            <td>${formatCurrency(r.valor_recebido)}</td>
            <td><strong style="color:#DC2626;">${formatCurrency(r.saldo_devedor)}</strong></td>
            <td>${r.dias_atraso} dias</td>
            <td>${formatCurrency(r.multa_informativa)}</td>
            <td>${formatCurrency(r.juros_informativo)}</td>
          </tr>
        `;
      });
    } else if (reportType === 'fluxo-caixa') {
      tituloRelatorio = 'Relatório de Fluxo de Caixa';
      headersHTML = '<th>Mês/Ano</th><th>Receita Prevista</th><th>Receita Recebida</th><th>Saldo Diferença</th>';
      const data = await recebimentosService.getFluxoCaixa();
      data.forecast.labels.forEach((label, idx) => {
        const prev = data.forecast.previstos[idx];
        const rec = data.forecast.recebidos[idx];
        const dif = prev - rec;
        rowsHTML += `
          <tr>
            <td><strong>${label}</strong></td>
            <td>${formatCurrency(prev)}</td>
            <td>${formatCurrency(rec)}</td>
            <td>${formatCurrency(dif)}</td>
          </tr>
        `;
      });
    } else {
      tituloRelatorio = 'Relatório de Recebimentos por Período';
      headersHTML = '<th>Competência</th><th>Contrato</th><th>Imóvel</th><th>Locatário</th><th>Vencimento</th><th>Previsto</th><th>Recebido</th><th>Saldo</th><th>Status</th>';
      const data = await recebimentosService.listar(10000, 0, filters);
      data.rows.forEach(r => {
        const saldo = parseFloat(r.valor_previsto) - parseFloat(r.valor_recebido || 0);
        let statusClass = 'status-prevista';
        if (r.status === 'Pago') statusClass = 'status-recebida';
        if (r.status === 'Vencido') statusClass = 'status-inadimplencia';
        if (r.status === 'Parcial') statusClass = 'status-recebida';

        rowsHTML += `
          <tr>
            <td>${formatDate(r.competencia).substring(3)}</td>
            <td><strong>${r.numero_contrato}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.locatario_nome}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor_previsto)}</td>
            <td>${formatCurrency(r.valor_recebido)}</td>
            <td>${formatCurrency(saldo)}</td>
            <td><span class="status-badge ${statusClass}">${r.status}</span></td>
          </tr>
        `;
      });
    }

    let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${tituloRelatorio} - NexoMoveis</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; color: #111827; padding: 20px; background-color: #ffffff; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #001731; padding-bottom: 15px; margin-bottom: 30px; }
        .logo-title { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 700; color: #001731; }
        .logo-icon { width: 32px; height: 32px; background-color: #478C27; border-radius: 6px; display: inline-block; }
        .meta-info { text-align: right; font-size: 11px; color: #6B7280; line-height: 1.5; }
        .report-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
        th { background-color: #001731; color: #ffffff; text-align: left; padding: 10px 8px; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
        td { border-bottom: 1px solid #E5E7EB; padding: 10px 8px; color: #374151; }
        tr:nth-child(even) { background-color: #F9FAFB; }
        .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
        .status-prevista { background-color: #FEF08A; color: #854D0E; }
        .status-recebida { background-color: #DEF7EC; color: #03543F; }
        .status-inadimplencia { background-color: #FDE8E8; color: #9B1C1C; }
        @media print {
          body { padding: 0; }
          button { display: none; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-title">
          <div class="logo-icon"></div>
          <span>NexoMoveis</span>
        </div>
        <div class="meta-info">
          <div><strong>Emissão:</strong> ${dataEmissao}</div>
          <div><strong>Responsável:</strong> ${responsavelUser ? responsavelUser.nome : 'Administrador'}</div>
          <div><strong>Tipo de Relatório:</strong> ${tituloRelatorio}</div>
        </div>
      </div>
      
      <h2 class="report-title">${tituloRelatorio}</h2>
      
      <table>
        <thead>
          <tr>
            ${headersHTML}
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
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
  listar,
  buscarPorId,
  registrarPagamento,
  estornar,
  atualizar,
  getInadimplencias,
  getFluxoCaixa,
  getCardsStats,
  exportarExcel,
  exportarPDF,
};
