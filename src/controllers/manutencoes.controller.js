const manutencoesService = require('../services/manutencoes.service');
const manutencoesRepository = require('../repositories/manutencoes.repository');

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
      imovel: req.query.imovel || '',
      tipo: req.query.tipo || '',
      status: req.query.status || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || '',
      busca: req.query.busca || ''
    };

    const data = await manutencoesService.listar(limit, offset, filters);

    res.status(200).json({
      success: true,
      message: 'Manutenções listadas com sucesso.',
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

    const data = await manutencoesService.buscarPorId(id, responsavelUser, ip);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cadastrar(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await manutencoesService.cadastrar(req.body, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Manutenção cadastrada com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await manutencoesService.atualizar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Manutenção atualizada com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function concluir(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await manutencoesService.concluir(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Manutenção concluída com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await manutencoesService.cancelar(id, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Manutenção cancelada com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function buscarTimeline(req, res, next) {
  try {
    const { id } = req.params;
    const list = await manutencoesRepository.listTimeline(id);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function adicionarAnexo(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }

    const doc = await manutencoesService.adicionarAnexo(id, req.body, req.file, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Anexo adicionado com sucesso.', data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function removerAnexo(req, res, next) {
  try {
    const { id, arquivoId } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await manutencoesService.removerAnexo(arquivoId, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Anexo removido com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listByImovel(req, res, next) {
  try {
    const { id } = req.params;
    const list = await manutencoesRepository.listByImovel(id);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getCardsStats(req, res, next) {
  try {
    const stats = await manutencoesService.getCardsStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getGraficosData(req, res, next) {
  try {
    const graphs = await manutencoesService.getGraficosData();
    res.status(200).json({ success: true, data: graphs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function exportarExcel(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo'; // imovel, custos, concluidas, em_andamento, periodo
    const filters = {
      imovel: req.query.imovel || '',
      tipo: req.query.tipo || '',
      status: req.query.status || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || '',
      busca: req.query.busca || ''
    };

    if (reportType === 'concluidas') {
      filters.status = 'Concluída';
    } else if (reportType === 'em_andamento') {
      filters.status = 'Em Andamento';
    }

    const data = await manutencoesService.listar(10000, 0, filters);

    let csv = '\uFEFF'; // UTF-8 BOM

    if (reportType === 'imovel') {
      csv += 'Código;Imóvel;Tipo;Título;Data Prevista;Valor Previsto;Valor Real;Status\n';
      data.rows.forEach(r => {
        csv += `${r.codigo};${r.imovel_nome.replace(/;/g, ',')};${r.tipo};${r.titulo.replace(/;/g, ',')};${formatDate(r.data_prevista)};${formatCurrency(r.valor_previsto)};${formatCurrency(r.valor_real)};${r.status}\n`;
      });
    } else if (reportType === 'custos') {
      csv += 'Código;Imóvel;Título;Valor Previsto;Valor Real;Diferença;Desvio %\n';
      data.rows.forEach(r => {
        const valPrev = parseFloat(r.valor_previsto) || 0;
        const valReal = parseFloat(r.valor_real) || 0;
        const diff = valReal - valPrev;
        const pct = valPrev > 0 ? ((diff / valPrev) * 100).toFixed(1) + '%' : '0%';
        csv += `${r.codigo};${r.imovel_nome.replace(/;/g, ',')};${r.titulo.replace(/;/g, ',')};${formatCurrency(valPrev)};${formatCurrency(valReal)};${formatCurrency(diff)};${pct}\n`;
      });
    } else if (reportType === 'concluidas') {
      csv += 'Código;Imóvel;Tipo;Título;Responsável;Conclusão;Valor Real;Status\n';
      data.rows.forEach(r => {
        csv += `${r.codigo};${r.imovel_nome.replace(/;/g, ',')};${r.tipo};${r.titulo.replace(/;/g, ',')};${r.responsavel};${formatDate(r.data_conclusao)};${formatCurrency(r.valor_real)};${r.status}\n`;
      });
    } else if (reportType === 'em_andamento') {
      csv += 'Código;Imóvel;Tipo;Título;Responsável;Previsão;Valor Previsto;Status\n';
      data.rows.forEach(r => {
        csv += `${r.codigo};${r.imovel_nome.replace(/;/g, ',')};${r.tipo};${r.titulo.replace(/;/g, ',')};${r.responsavel};${formatDate(r.data_prevista)};${formatCurrency(r.valor_previsto)};${r.status}\n`;
      });
    } else {
      // periodo / default
      csv += 'Código;Competência/Solicitação;Imóvel;Tipo;Título;Valor Previsto;Valor Real;Status\n';
      data.rows.forEach(r => {
        csv += `${r.codigo};${formatDate(r.data_solicitacao)};${r.imovel_nome.replace(/;/g, ',')};${r.tipo};${r.titulo.replace(/;/g, ',')};${formatCurrency(r.valor_previsto)};${formatCurrency(r.valor_real)};${r.status}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=manutencoes_${reportType}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

async function exportarPDF(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo'; // imovel, custos, concluidas, em_andamento, periodo
    const filters = {
      imovel: req.query.imovel || '',
      tipo: req.query.tipo || '',
      status: req.query.status || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || '',
      busca: req.query.busca || ''
    };

    if (reportType === 'concluidas') {
      filters.status = 'Concluída';
    } else if (reportType === 'em_andamento') {
      filters.status = 'Em Andamento';
    }

    const data = await manutencoesService.listar(10000, 0, filters);
    const responsavelUser = req.session.usuario;
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let tituloRelatorio = 'Relatório Geral de Manutenções';
    let headersHTML = '';
    let rowsHTML = '';

    if (reportType === 'imovel') {
      tituloRelatorio = 'Relatório de Manutenções por Imóvel';
      headersHTML = '<th>Código</th><th>Imóvel</th><th>Tipo</th><th>Título</th><th>Previsão</th><th>Previsto</th><th>Real</th><th>Status</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td><strong>${r.codigo}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.tipo}</td>
            <td><strong>${r.titulo}</strong></td>
            <td>${formatDate(r.data_prevista)}</td>
            <td>${formatCurrency(r.valor_previsto)}</td>
            <td>${formatCurrency(r.valor_real)}</td>
            <td><span class="status-badge status-${r.status.toLowerCase().replace(' ', '-') || 'planejada'}">${r.status}</span></td>
          </tr>
        `;
      });
    } else if (reportType === 'custos') {
      tituloRelatorio = 'Relatório de Desvio de Custos';
      headersHTML = '<th>Código</th><th>Imóvel</th><th>Título</th><th>Previsto</th><th>Real Executado</th><th>Diferença</th><th>Desvio %</th>';
      data.rows.forEach(r => {
        const valPrev = parseFloat(r.valor_previsto) || 0;
        const valReal = parseFloat(r.valor_real) || 0;
        const diff = valReal - valPrev;
        const pct = valPrev > 0 ? ((diff / valPrev) * 100).toFixed(1) + '%' : '0%';
        const color = diff > 0 ? '#DC2626' : (diff < 0 ? '#059669' : '#374151');
        
        rowsHTML += `
          <tr>
            <td><strong>${r.codigo}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.titulo}</td>
            <td>${formatCurrency(valPrev)}</td>
            <td><strong>${formatCurrency(valReal)}</strong></td>
            <td style="color:${color}; font-weight:700;">${formatCurrency(diff)}</td>
            <td style="color:${color}; font-weight:700;">${pct}</td>
          </tr>
        `;
      });
    } else if (reportType === 'concluidas') {
      tituloRelatorio = 'Relatório de Manutenções Concluídas';
      headersHTML = '<th>Código</th><th>Imóvel</th><th>Tipo</th><th>Título</th><th>Encarregado</th><th>Conclusão</th><th>Valor Real</th><th>Status</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td><strong>${r.codigo}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.tipo}</td>
            <td><strong>${r.titulo}</strong></td>
            <td>${r.responsavel}</td>
            <td>${formatDate(r.data_conclusao)}</td>
            <td>${formatCurrency(r.valor_real)}</td>
            <td><span class="status-badge status-concluida">${r.status}</span></td>
          </tr>
        `;
      });
    } else if (reportType === 'em_andamento') {
      tituloRelatorio = 'Relatório de Manutenções em Andamento';
      headersHTML = '<th>Código</th><th>Imóvel</th><th>Tipo</th><th>Título</th><th>Encarregado</th><th>Previsão</th><th>Previsto</th><th>Status</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td><strong>${r.codigo}</strong></td>
            <td>${r.imovel_nome}</td>
            <td>${r.tipo}</td>
            <td><strong>${r.titulo}</strong></td>
            <td>${r.responsavel}</td>
            <td>${formatDate(r.data_prevista)}</td>
            <td>${formatCurrency(r.valor_previsto)}</td>
            <td><span class="status-badge status-em-andamento">${r.status}</span></td>
          </tr>
        `;
      });
    } else {
      tituloRelatorio = 'Relatório Geral por Período';
      headersHTML = '<th>Código</th><th>Solicitação</th><th>Imóvel</th><th>Tipo</th><th>Título</th><th>Previsto</th><th>Real</th><th>Status</th>';
      data.rows.forEach(r => {
        rowsHTML += `
          <tr>
            <td><strong>${r.codigo}</strong></td>
            <td>${formatDate(r.data_solicitacao)}</td>
            <td>${r.imovel_nome}</td>
            <td>${r.tipo}</td>
            <td><strong>${r.titulo}</strong></td>
            <td>${formatCurrency(r.valor_previsto)}</td>
            <td>${formatCurrency(r.valor_real)}</td>
            <td><span class="status-badge status-${r.status.toLowerCase().replace(' ', '-') || 'planejada'}">${r.status}</span></td>
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
        .status-planejada { background-color: #FEF08A; color: #854D0E; }
        .status-em-andamento { background-color: #DEF7EC; color: #03543F; }
        .status-concluida { background-color: #DEF7EC; color: #03543F; }
        .status-cancelada { background-color: #FDE8E8; color: #9B1C1C; }
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
  concluir,
  cancelar,
  buscarTimeline,
  adicionarAnexo,
  removerAnexo,
  listByImovel,
  getCardsStats,
  getGraficosData,
  exportarExcel,
  exportarPDF
};
