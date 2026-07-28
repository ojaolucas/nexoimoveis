const imoveisService = require('../services/imoveis.service');
const fs = require('fs');
const path = require('path');

// Helper to format currency
function formatCurrency(val) {
  if (val === null || val === undefined) return '';
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed);
}

async function listar(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const filters = {
      busca: req.query.busca || '',
      status: req.query.status || '',
      tipo: req.query.tipo || '',
      proprietario: req.query.proprietario || ''
    };

    const data = await imoveisService.listar(limit, offset, filters);

    res.status(200).json({
      success: true,
      message: 'Imóveis listados com sucesso.',
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

async function getCardsStats(req, res, next) {
  try {
    const stats = await imoveisService.getCardsStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const imovel = await imoveisService.buscarPorId(id, responsavelUser, ip);
    res.status(200).json({ success: true, data: imovel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cadastrar(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (req.file) {
      const { salvarArquivo } = require('../config/storage');
      req.body.foto_principal = await salvarArquivo(req.file, 'imoveis');
    }

    const imovel = await imoveisService.cadastrar(req.body, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Imóvel cadastrado com sucesso.', data: imovel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (req.file) {
      const { salvarArquivo } = require('../config/storage');
      req.body.foto_principal = await salvarArquivo(req.file, 'imoveis');
    }

    const imovel = await imoveisService.atualizar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Imóvel atualizado com sucesso.', data: imovel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await imoveisService.excluir(id, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Imóvel excluído com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function adicionarDocumento(req, res, next) {
  try {
    const { id } = req.params;
    const { tipo_documento } = req.body;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }
    if (!tipo_documento) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Tipo de documento é obrigatório.' });
    }

    // Size validations: Images <= 10MB, PDFs <= 20MB
    const extension = path.extname(req.file.originalname).toLowerCase();
    const isImage = /jpeg|jpg|png/.test(extension);
    const size = req.file.size;

    if (isImage && size > 10 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Arquivos de imagem não podem exceder o limite de 10 MB.' });
    }
    if (extension === '.pdf' && size > 20 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Arquivos em formato PDF não podem exceder o limite de 20 MB.' });
    }

    const doc = await imoveisService.adicionarDocumento(id, req.body, req.file, responsavelUser, ip);
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

    await imoveisService.removerDocumento(documentoId, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Documento removido com sucesso.' });
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
      return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const isImage = /jpeg|jpg|png/.test(extension);
    const size = req.file.size;

    if (!isImage) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Apenas imagens (JPG, JPEG, PNG) são permitidas na galeria.' });
    }
    if (size > 10 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Imagens de galeria não podem exceder o limite de 10 MB.' });
    }

    const foto = await imoveisService.adicionarFoto(id, req.file, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Foto adicionada com sucesso.', data: foto });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ success: false, message: error.message });
  }
}

async function removerFoto(req, res, next) {
  try {
    const { id, fotoId } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await imoveisService.removerFoto(fotoId, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Foto removida com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function exportarExcel(req, res, next) {
  try {
    const filters = {
      busca: req.query.busca || '',
      status: req.query.status || '',
      tipo: req.query.tipo || '',
      proprietario: req.query.proprietario || ''
    };

    const data = await imoveisService.listar(10000, 0, filters);
    
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Código;Nome;Tipo;Proprietário;Valor Locação;Status;Contratos Ativos\n';

    data.rows.forEach(i => {
      const code = i.codigo || '';
      const name = i.nome || '';
      const type = i.tipo || '';
      const owner = i.proprietario_nome || '';
      const val = formatCurrency(i.valor_locacao);
      const status = i.status || '';
      const activeContracts = i.contratos_ativos || '0';

      const cleanName = name.replace(/;/g, ',');
      const cleanOwner = owner.replace(/;/g, ',');

      csv += `${code};${cleanName};${type};${cleanOwner};${val};${status};${activeContracts}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=imoveis_nexo.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

async function exportarPDF(req, res, next) {
  try {
    const filters = {
      busca: req.query.busca || '',
      status: req.query.status || '',
      tipo: req.query.tipo || '',
      proprietario: req.query.proprietario || ''
    };
    
    const data = await imoveisService.listar(10000, 0, filters);
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
      <title>Relatório de Imóveis - NexoMoveis</title>
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
        .status-disponivel { background-color: #DEF7EC; color: #03543F; }
        .status-alugado { background-color: #E1EFFE; color: #1E429F; }
        .status-reservado { background-color: #FEF08A; color: #854D0E; }
        .status-manutencao { background-color: #FDE8E8; color: #9B1C1C; }
        .status-inativo { background-color: #F3F4F6; color: #374151; }
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
          <div><strong>Filtros aplicados:</strong> Busca: "${filters.busca || 'Nenhum'}" | Tipo: "${filters.tipo || 'Todos'}" | Status: "${filters.status || 'Todos'}"</div>
        </div>
      </div>
      
      <h2 class="report-title">Relatório de Imóveis</h2>
      
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome / Identificação</th>
            <th>Tipo</th>
            <th>Proprietário</th>
            <th>Valor Locação</th>
            <th>Contratos Ativos</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.rows.forEach(i => {
      const code = i.codigo || '';
      const name = i.nome || '';
      const type = i.tipo || '';
      const owner = i.proprietario_nome || '';
      const val = formatCurrency(i.valor_locacao);
      const activeContracts = i.contratos_ativos || '0';
      
      let statusClass = 'status-disponivel';
      if (i.status === 'Alugado') statusClass = 'status-alugado';
      if (i.status === 'Reservado') statusClass = 'status-reservado';
      if (i.status === 'Manutenção') statusClass = 'status-manutencao';
      if (i.status === 'Inativo') statusClass = 'status-inativo';

      html += `
        <tr>
          <td><strong>${code}</strong></td>
          <td>${name}</td>
          <td>${type}</td>
          <td>${owner}</td>
          <td>${val}</td>
          <td>${activeContracts}</td>
          <td><span class="status-badge ${statusClass}">${i.status}</span></td>
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

module.exports = {
  listar,
  getCardsStats,
  buscarPorId,
  cadastrar,
  atualizar,
  excluir,
  adicionarDocumento,
  removerDocumento,
  adicionarFoto,
  removerFoto,
  exportarExcel,
  exportarPDF,
};
