const despesasService = require('../services/despesas.service');
const despesasRepository = require('../repositories/despesas.repository');

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
      imovel: req.query.imovel || '',
      categoria: req.query.categoria || '',
      responsavel: req.query.responsavel || '',
      competencia: req.query.competencia || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || ''
    };

    const data = await despesasService.listar(limit, offset, filters);

    res.status(200).json({
      success: true,
      message: 'Despesas listadas com sucesso.',
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

    const desp = await despesasService.buscarPorId(id, responsavelUser, ip);
    res.status(200).json({ success: true, data: desp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cadastrar(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const desp = await despesasService.cadastrar(req.body, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Despesa cadastrada com sucesso.', data: desp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const desp = await despesasService.atualizar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Despesa atualizada com sucesso.', data: desp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function registrarPagamento(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const desp = await despesasService.registrarPagamento(id, req.body, req.file, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Pagamento registrado com sucesso.', data: desp });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await despesasService.cancelar(id, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Despesa cancelada com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listVencidas(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const data = await despesasService.listar(limit, offset, { status: 'Vencido' });
    res.status(200).json({ success: true, data: data.rows, total: data.total });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listRecorrentes(req, res, next) {
  try {
    const list = await despesasService.listRecorrentes();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function buscarTimeline(req, res, next) {
  try {
    const { id } = req.params;
    const list = await despesasRepository.listTimeline(id);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function adicionarComprovante(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo de comprovante enviado.' });
    }

    const doc = await despesasService.adicionarComprovante(id, req.file, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Comprovante anexado com sucesso.', data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function removerComprovante(req, res, next) {
  try {
    const { id, arquivoId } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await despesasService.removerComprovante(arquivoId, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Comprovante removido com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getCardsStats(req, res, next) {
  try {
    const stats = await despesasService.getCardsStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getGraficosData(req, res, next) {
  try {
    const graphs = await despesasService.getGraficosData();
    res.status(200).json({ success: true, data: graphs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function exportarExcel(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo'; // imovel, categoria, vencidas, pagas, periodo
    const filters = {
      status: req.query.status || '',
      imovel: req.query.imovel || '',
      categoria: req.query.categoria || '',
      responsavel: req.query.responsavel || '',
      competencia: req.query.competencia || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || ''
    };

    if (reportType === 'vencidas') {
      filters.status = 'Vencido';
    } else if (reportType === 'pagas') {
      filters.status = 'Pago';
    }

    const data = await despesasService.listar(10000, 0, filters);

    let csv = '\uFEFF'; // UTF-8 BOM

    if (reportType === 'imovel') {
      csv += 'Imóvel;Categoria;Responsável;Competência;Vencimento;Valor;Status\n';
      data.rows.forEach(r => {
        csv += `${r.imovel_nome.replace(/;/g, ',')};${r.categoria};${r.responsavel};${formatDate(r.competencia).substring(3)};${formatDate(r.vencimento)};${formatCurrency(r.valor)};${r.status}\n`;
      });
    } else if (reportType === 'categoria') {
      csv += 'Categoria;Imóvel;Responsável;Competência;Vencimento;Valor;Status\n';
      data.rows.forEach(r => {
        csv += `${r.categoria};${r.imovel_nome.replace(/;/g, ',')};${r.responsavel};${formatDate(r.competencia).substring(3)};${formatDate(r.vencimento)};${formatCurrency(r.valor)};${r.status}\n`;
      });
    } else if (reportType === 'vencidas') {
      csv += 'Contrato/Imóvel;Categoria;Responsável;Vencimento;Valor;Dias em Atraso;Status\n';
      data.rows.forEach(r => {
        const diff = Math.max(0, Math.ceil((new Date() - new Date(r.vencimento)) / (1000 * 60 * 60 * 24)));
        csv += `${r.imovel_nome.replace(/;/g, ',')};${r.categoria};${r.responsavel};${formatDate(r.vencimento)};${formatCurrency(r.valor)};${diff} dias;${r.status}\n`;
      });
    } else if (reportType === 'pagas') {
      csv += 'Imóvel;Categoria;Responsável;Vencimento;Valor;Data Pagamento;Status\n';
      data.rows.forEach(r => {
        csv += `${r.imovel_nome.replace(/;/g, ',')};${r.categoria};${r.responsavel};${formatDate(r.vencimento)};${formatCurrency(r.valor)};${formatDate(r.data_pagamento)};${r.status}\n`;
      });
    } else {
      // periodo / default
      csv += 'Competência;Imóvel;Categoria;Responsável;Vencimento;Valor;Status;Data Pagamento\n';
      data.rows.forEach(r => {
        csv += `${formatDate(r.competencia).substring(3)};${r.imovel_nome.replace(/;/g, ',')};${r.categoria};${r.responsavel};${formatDate(r.vencimento)};${formatCurrency(r.valor)};${r.status};${formatDate(r.data_pagamento)}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=despesas_${reportType}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

async function exportarPDF(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo'; // imovel, categoria, vencidas, pagas, periodo
    const filters = {
      status: req.query.status || '',
      imovel: req.query.imovel || '',
      categoria: req.query.categoria || '',
      responsavel: req.query.responsavel || '',
      competencia: req.query.competencia || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || ''
    };

    if (reportType === 'vencidas') {
      filters.status = 'Vencido';
    } else if (reportType === 'pagas') {
      filters.status = 'Pago';
    }

    const data = await despesasService.listar(10000, 0, filters);
    const responsavelUser = req.session.usuario;
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let tituloRelatorio = 'Relatório Geral de Despesas';
    let headersHTML = '';
    let rowsHTML = '';

    if (reportType === 'imovel') {
      tituloRelatorio = 'Relatório de Despesas por Imóvel';
      headersHTML = '<th>Imóvel</th><th>Categoria</th><th>Responsável</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td><strong>${r.imovel_nome}</strong></td>
            <td>${r.categoria}</td>
            <td>${r.responsavel}</td>
            <td>${formatDate(r.competencia).substring(3)}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor)}</td>
            <td><span class="status-badge status-${r.status.toLowerCase().replace(' ', '-') || 'a-vencer'}">${r.status}</span></td>
          </tr>
        `;
      });
    } else if (reportType === 'categoria') {
      tituloRelatorio = 'Relatório de Despesas por Categoria';
      headersHTML = '<th>Categoria</th><th>Imóvel</th><th>Responsável</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td><strong>${r.categoria}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.responsavel}</td>
            <td>${formatDate(r.competencia).substring(3)}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor)}</td>
            <td><span class="status-badge status-${r.status.toLowerCase().replace(' ', '-') || 'a-vencer'}">${r.status}</span></td>
          </tr>
        `;
      });
    } else if (reportType === 'vencidas') {
      tituloRelatorio = 'Relatório de Despesas Vencidas';
      headersHTML = '<th>Imóvel</th><th>Categoria</th><th>Responsável</th><th>Vencimento</th><th>Valor</th><th>Atraso</th><th>Status</th>';
      data.rows.forEach(r => {
        const diff = Math.max(0, Math.ceil((new Date() - new Date(r.vencimento)) / (1000 * 60 * 60 * 24)));
        rowsHTML += `
          <tr>
            <td>${r.imovel_nome}</td>
            <td><strong>${r.categoria}</strong></td>
            <td>${r.responsavel}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td><strong style="color:#DC2626;">${formatCurrency(r.valor)}</strong></td>
            <td style="color:#DC2626; font-weight:700;">${diff} dias</td>
            <td><span class="status-badge status-vencido">${r.status}</span></td>
          </tr>
        `;
      });
    } else if (reportType === 'pagas') {
      tituloRelatorio = 'Relatório de Despesas Pagas';
      headersHTML = '<th>Imóvel</th><th>Categoria</th><th>Responsável</th><th>Vencimento</th><th>Valor Pago</th><th>Data Pagamento</th><th>Status</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td>${r.imovel_nome}</td>
            <td><strong>${r.categoria}</strong></td>
            <td>${r.responsavel}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor)}</td>
            <td>${formatDate(r.data_pagamento)}</td>
            <td><span class="status-badge status-pago">${r.status}</span></td>
          </tr>
        `;
      });
    } else {
      tituloRelatorio = 'Relatório de Despesas por Período';
      headersHTML = '<th>Competência</th><th>Imóvel</th><th>Categoria</th><th>Responsável</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Data Pagamento</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td>${formatDate(r.competencia).substring(3)}</td>
            <td>${r.imovel_nome}</td>
            <td><strong>${r.categoria}</strong></td>
            <td>${r.responsavel}</td>
            <td>${formatDate(r.vencimento)}</td>
            <td>${formatCurrency(r.valor)}</td>
            <td><span class="status-badge status-${r.status.toLowerCase().replace(' ', '-') || 'a-vencer'}">${r.status}</span></td>
            <td>${formatDate(r.data_pagamento)}</td>
          </tr>
        `;
      });
    }

    const html = `
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
        .status-a-vencer { background-color: #FEF08A; color: #854D0E; }
        .status-pago { background-color: #DEF7EC; color: #03543F; }
        .status-vencido { background-color: #FDE8E8; color: #9B1C1C; }
        .status-cancelado { background-color: #F3F4F6; color: #6B7280; }
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
  cadastrar,
  atualizar,
  registrarPagamento,
  cancelar,
  listVencidas,
  listRecorrentes,
  buscarTimeline,
  adicionarComprovante,
  removerComprovante,
  getCardsStats,
  getGraficosData,
  exportarExcel,
  exportarPDF,
};
