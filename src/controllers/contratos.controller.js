const contratosService = require('../services/contratos.service');
const fs = require('fs');
const path = require('path');

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
      locatario: req.query.locatario || '',
      numero: req.query.numero || '',
      data_inicio: req.query.data_inicio || '',
      data_fim: req.query.data_fim || '',
    };

    const data = await contratosService.listar(limit, offset, filters);

    res.status(200).json({
      success: true,
      message: 'Contratos listados com sucesso.',
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

    const contrato = await contratosService.buscarPorId(id, responsavelUser, ip);
    res.status(200).json({ success: true, data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cadastrar(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const contrato = await contratosService.cadastrar(req.body, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Contrato cadastrado com sucesso.', data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const contrato = await contratosService.atualizar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Contrato atualizado com sucesso.', data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function encerrar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const contrato = await contratosService.encerrar(id, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Contrato encerrado com sucesso.', data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cancelar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const contrato = await contratosService.cancelar(id, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Contrato cancelado com sucesso.', data: contrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function renovar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newContrato = await contratosService.renovar(id, req.body, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Contrato renovado com sucesso.', data: newContrato });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function reajustar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const updated = await contratosService.reajustar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Contrato reajustado com sucesso.', data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function adicionarDocumento(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }

    const { tipo_documento } = req.body;
    if (!tipo_documento) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Tipo de documento é obrigatório.' });
    }

    // PDF validation only, up to 20MB
    const extension = path.extname(req.file.originalname).toLowerCase();
    if (extension !== '.pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Apenas arquivos em formato PDF são permitidos.' });
    }
    if (req.file.size > 20 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Arquivos de documento não podem exceder 20 MB.' });
    }

    const doc = await contratosService.adicionarDocumento(id, req.body, req.file, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Documento anexado com sucesso.', data: doc });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function removerDocumento(req, res, next) {
  try {
    const { id, documentoId } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await contratosService.removerDocumento(documentoId, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Documento removido com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function exportarExcel(req, res, next) {
  try {
    const filters = {
      status: req.query.status || '',
      imovel: req.query.imovel || '',
      locatario: req.query.locatario || '',
      numero: req.query.numero || '',
      data_inicio: req.query.data_inicio || '',
      data_fim: req.query.data_fim || '',
    };

    const data = await contratosService.listar(10000, 0, filters);

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Número;Imóvel;Locatário;Início;Fim;Valor Mensal;Status\n';

    data.rows.forEach(c => {
      const num = c.numero_contrato || '';
      const imovName = c.imovel_nome || '';
      const locName = c.locatario_nome || '';
      const ini = formatDate(c.data_inicio);
      const fim = formatDate(c.data_fim);
      const val = formatCurrency(c.valor_mensal);
      const status = c.status || '';

      const cleanImov = imovName.replace(/;/g, ',');
      const cleanLoc = locName.replace(/;/g, ',');

      csv += `${num};${cleanImov};${cleanLoc};${ini};${fim};${val};${status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=contratos_nexo.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

async function exportarPDF(req, res, next) {
  try {
    const filters = {
      status: req.query.status || '',
      imovel: req.query.imovel || '',
      locatario: req.query.locatario || '',
      numero: req.query.numero || '',
      data_inicio: req.query.data_inicio || '',
      data_fim: req.query.data_fim || '',
    };

    const data = await contratosService.listar(10000, 0, filters);
    const responsavelUser = req.session.usuario;
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Contratos - NexoMoveis</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; color: #111827; padding: 20px; background-color: #ffffff; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #001731; padding-bottom: 15px; margin-bottom: 30px; }
        .logo-title { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 700; color: #001731; }
        .logo-icon { width: 32px; height: 32px; background-color: #478C27; border-radius: 6px; display: inline-block; }
        .meta-info { text-align: right; font-size: 11px; color: #6B7280; line-height: 1.5; }
        .report-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
        th { background-color: #001731; color: #ffffff; text-align: left; padding: 10px 8px; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
        td { border-bottom: 1px solid #E5E7EB; padding: 10px 8px; color: #374151; }
        tr:nth-child(even) { background-color: #F9FAFB; }
        .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
        .status-ativo { background-color: #DEF7EC; color: #03543F; }
        .status-encerrado { background-color: #F3F4F6; color: #374151; }
        .status-cancelado { background-color: #FDE8E8; color: #9B1C1C; }
        @media print {
          body { padding: 0; }
          button { display: none; }
          @page { size: A4 landscape; margin: 15mm; }
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
          <div><strong>Filtros:</strong> Status: "${filters.status || 'Todos'}" | Busca: "${filters.numero || 'Nenhum'}"</div>
        </div>
      </div>
      
      <h2 class="report-title">Relatório de Contratos</h2>
      
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Imóvel</th>
            <th>Locatário</th>
            <th>Início</th>
            <th>Término</th>
            <th>Valor Mensal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.rows.forEach(c => {
      const num = c.numero_contrato || '';
      const imovName = c.imovel_nome || '';
      const locName = c.locatario_nome || '';
      const ini = formatDate(c.data_inicio);
      const fim = formatDate(c.data_fim);
      const val = formatCurrency(c.valor_mensal);
      const status = c.status || '';

      let statusClass = 'status-ativo';
      if (status === 'Encerrado') statusClass = 'status-encerrado';
      if (status === 'Cancelado') statusClass = 'status-cancelado';

      html += `
        <tr>
          <td><strong>${num}</strong></td>
          <td>${imovName}</td>
          <td>${locName}</td>
          <td>${ini}</td>
          <td>${fim}</td>
          <td>${val}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
        </tr>
      `;
    });

    html += `
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

async function getCardsStats(req, res, next) {
  try {
    const stats = await contratosService.getCardsStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  buscarPorId,
  cadastrar,
  atualizar,
  encerrar,
  cancelar,
  renovar,
  reajustar,
  adicionarDocumento,
  removerDocumento,
  exportarExcel,
  exportarPDF,
  getCardsStats,
};
