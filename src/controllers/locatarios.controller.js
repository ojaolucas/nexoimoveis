const locatariosService = require('../services/locatarios.service');
const fs = require('fs');
const path = require('path');

// Helper to format CPF/CNPJ
function formatCpfCnpj(val) {
  if (!val) return '';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return val;
}

// Helper to format phone
function formatTelefone(val) {
  if (!val) return '';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return val;
}

async function listar(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const filters = {
      busca: req.query.busca || '',
      status: req.query.status || '',
      tipo: req.query.tipo || '' // 'PF' or 'PJ'
    };

    const data = await locatariosService.listar(limit, offset, filters);

    res.status(200).json({
      success: true,
      message: 'Locatários listados com sucesso.',
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

    const loc = await locatariosService.buscarPorId(id, responsavelUser, ip);
    res.status(200).json({ success: true, data: loc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function cadastrar(req, res, next) {
  try {
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const loc = await locatariosService.cadastrar(req.body, responsavelUser, ip);
    res.status(201).json({ success: true, message: 'Locatário cadastrado com sucesso.', data: loc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const loc = await locatariosService.atualizar(id, req.body, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Locatário atualizado com sucesso.', data: loc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function alterarStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!status || !['ativo', 'inativo'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status inválido. Use "ativo" ou "inativo".' });
    }

    const loc = await locatariosService.alterarStatus(id, status, responsavelUser, ip);
    res.status(200).json({ success: true, message: `Status alterado para "${status === 'ativo' ? 'Ativo' : 'Inativo'}" com sucesso.`, data: loc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const responsavelUser = req.session.usuario;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await locatariosService.excluir(id, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Locatário excluído com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listarContratos(req, res, next) {
  try {
    const { id } = req.params;
    const contratos = await locatariosService.listarContratos(id);
    res.status(200).json({ success: true, data: contratos });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listarImoveis(req, res, next) {
  try {
    const { id } = req.params;
    const imoveis = await locatariosService.listarImoveis(id);
    res.status(200).json({ success: true, data: imoveis });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function listarRecebimentos(req, res, next) {
  try {
    const { id } = req.params;
    const recebimentos = await locatariosService.listarRecebimentos(id);
    res.status(200).json({ success: true, data: recebimentos });
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

    const doc = await locatariosService.adicionarDocumento(id, tipo_documento, req.file, responsavelUser, ip);
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

    await locatariosService.removerDocumento(documentoId, responsavelUser, ip);
    res.status(200).json({ success: true, message: 'Documento removido com sucesso.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function exportarExcel(req, res, next) {
  try {
    const filters = {
      busca: req.query.busca || '',
      status: req.query.status || '',
      tipo: req.query.tipo || ''
    };

    const data = await locatariosService.listar(10000, 0, filters);
    
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Código;Nome/Razão Social;CPF/CNPJ;Tipo;Telefone;E-mail;Qtd Contratos;Qtd Imóveis;Status\n';

    data.rows.forEach(l => {
      const code = l.codigo || '';
      const name = l.nome_razao_social || '';
      const doc = formatCpfCnpj(l.cpf_cnpj);
      const type = l.tipo_pessoa || '';
      const phone = formatTelefone(l.telefone);
      const mail = l.email || '';
      const qtdContratos = l.qtd_contratos || '0';
      const qtdImoveis = l.qtd_imoveis || '0';
      const status = l.status === 'ativo' ? 'Ativo' : 'Inativo';

      const cleanName = name.replace(/;/g, ',');
      const cleanMail = mail.replace(/;/g, ',');

      csv += `${code};${cleanName};${doc};${type};${phone};${cleanMail};${qtdContratos};${qtdImoveis};${status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=locatarios_nexo.csv');
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
      tipo: req.query.tipo || ''
    };
    
    const data = await locatariosService.listar(10000, 0, filters);
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
      <title>Relatório de Locatários - NexoMoveis</title>
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
        .status-inativo { background-color: #FDE8E8; color: #9B1C1C; }
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
      
      <h2 class="report-title">Relatório de Locatários</h2>
      
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome / Razão Social</th>
            <th>CPF / CNPJ</th>
            <th>Tipo</th>
            <th>Telefone</th>
            <th>E-mail</th>
            <th>Contratos</th>
            <th>Imóveis</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.rows.forEach(l => {
      const code = l.codigo || '';
      const name = l.nome_razao_social || '';
      const doc = formatCpfCnpj(l.cpf_cnpj);
      const type = l.tipo_pessoa || '';
      const phone = formatTelefone(l.telefone);
      const mail = l.email || '';
      const qtdContratos = l.qtd_contratos || '0';
      const qtdImoveis = l.qtd_imoveis || '0';
      const statusClass = l.status === 'ativo' ? 'status-ativo' : 'status-inativo';
      const statusText = l.status === 'ativo' ? 'Ativo' : 'Inativo';

      html += `
        <tr>
          <td><strong>${code}</strong></td>
          <td>${name}</td>
          <td>${doc}</td>
          <td>${type}</td>
          <td>${phone}</td>
          <td>${mail}</td>
          <td>${qtdContratos}</td>
          <td>${qtdImoveis}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
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
  buscarPorId,
  cadastrar,
  atualizar,
  alterarStatus,
  excluir,
  listarContratos,
  listarImoveis,
  listarRecebimentos,
  adicionarDocumento,
  removerDocumento,
  exportarExcel,
  exportarPDF,
};
