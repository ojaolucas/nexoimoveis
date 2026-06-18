const vistoriasService = require('../services/vistorias.service');
const vistoriasRepository = require('../repositories/vistorias.repository');

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
      responsavel: req.query.responsavel || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || '',
      busca: req.query.busca || ''
    };

    const data = await vistoriasService.listar(limit, offset, filters);

    res.status(200).json({
      success: true,
      message: 'Vistorias listadas com sucesso.',
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

    const data = await vistoriasService.buscarPorId(id, responsavelUser, ip);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cadastrar(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await vistoriasService.cadastrar(req.body, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Vistoria cadastrada com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await vistoriasService.atualizar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Vistoria atualizada com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function concluir(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const data = await vistoriasService.concluir(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Vistoria concluída com sucesso.', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await vistoriasService.cancelar(id, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Vistoria cancelada com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function buscarTimeline(req, res, next) {
  try {
    const { id } = req.params;
    const list = await vistoriasRepository.listTimeline(id);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function adicionarFoto(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo de imagem enviado.' });
    }

    const doc = await vistoriasService.adicionarFoto(id, req.body, req.file, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Foto adicionada com sucesso.', data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function removerFoto(req, res, next) {
  try {
    const { id, fotoId } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await vistoriasService.removerFoto(fotoId, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Foto de vistoria removida com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listByImovel(req, res, next) {
  try {
    const { id } = req.params;
    const list = await vistoriasRepository.listByImovel(id);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getCardsStats(req, res, next) {
  try {
    const stats = await vistoriasService.getCardsStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getGraficosData(req, res, next) {
  try {
    const graphs = await vistoriasService.getGraficosData();
    res.status(200).json({ success: true, data: graphs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function exportarExcel(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo'; // imovel, periodo, pendentes, concluidas
    const filters = {
      imovel: req.query.imovel || '',
      tipo: req.query.tipo || '',
      status: req.query.status || '',
      responsavel: req.query.responsavel || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || '',
      busca: req.query.busca || ''
    };

    if (reportType === 'pendentes') {
      filters.status = 'Pendente';
    } else if (reportType === 'concluidas') {
      filters.status = 'Concluída';
    }

    const data = await vistoriasService.listar(10000, 0, filters);

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Código;Imóvel;Tipo de Vistoria;Data;Responsável;Status;Contrato Relacionado\n';

    data.rows.forEach(r => {
      csv += `${r.codigo};${r.imovel_nome.replace(/;/g, ',')};${r.tipo};${formatDate(r.data_vistoria)};${r.responsavel.replace(/;/g, ',')};${r.status};${r.contrato_codigo || '-'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=vistorias_${reportType}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

async function exportarPDF(req, res, next) {
  try {
    const reportType = req.query.tipo || 'periodo'; // imovel, periodo, pendentes, concluidas
    const filters = {
      imovel: req.query.imovel || '',
      tipo: req.query.tipo || '',
      status: req.query.status || '',
      responsavel: req.query.responsavel || '',
      data_inicial: req.query.data_inicial || '',
      data_final: req.query.data_final || '',
      busca: req.query.busca || ''
    };

    if (reportType === 'pendentes') {
      filters.status = 'Pendente';
    } else if (reportType === 'concluidas') {
      filters.status = 'Concluída';
    }

    const data = await vistoriasService.listar(10000, 0, filters);
    const responsavelUser = req.session.usuario;
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let tituloRelatorio = 'Relatório Geral de Vistorias';
    if (reportType === 'imovel') tituloRelatorio = 'Relatório de Vistorias por Imóvel';
    if (reportType === 'pendentes') tituloRelatorio = 'Relatório de Vistorias Pendentes';
    if (reportType === 'concluidas') tituloRelatorio = 'Relatório de Vistorias Concluídas';

    let rowsHTML = '';
    data.rows.forEach(r => {
      rowsHTML += `
        <tr>
          <td><strong>${r.codigo}</strong></td>
          <td>${r.imovel_nome} (${r.imovel_codigo})</td>
          <td>${r.tipo}</td>
          <td>${formatDate(r.data_vistoria)}</td>
          <td>${r.responsavel}</td>
          <td><span class="status-badge status-${r.status.toLowerCase()}">${r.status}</span></td>
          <td>${r.contrato_codigo || '-'}</td>
        </tr>
      `;
    });

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
        .status-pendente { background-color: #FEF08A; color: #854D0E; }
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
            <th>Código</th>
            <th>Imóvel</th>
            <th>Tipo</th>
            <th>Data</th>
            <th>Responsável</th>
            <th>Status</th>
            <th>Contrato</th>
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
  adicionarFoto,
  removerFoto,
  listByImovel,
  getCardsStats,
  getGraficosData,
  exportarExcel,
  exportarPDF
};
