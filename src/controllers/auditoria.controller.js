const auditoriaRepository = require('../repositories/auditoria.repository');
const auditoriaService = require('../services/auditoria.service');
const ExcelJS = require('exceljs');

/**
 * Cards de resumo (topo da tela).
 */
async function cards(req, res) {
  try {
    const data = await auditoriaRepository.getCards();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Lista logs com filtros e paginação.
 * GET /api/auditoria
 */
async function listar(req, res) {
  try {
    const { usuario, perfil, modulo, acao, data_inicio, data_fim, texto, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const filters = { usuario, perfil, modulo, acao, data_inicio, data_fim, texto };

    const result = await auditoriaRepository.listAll(filters, parseInt(limit), offset);

    // Registrar auditoria de visualização
    await auditoriaService.registrarLog({
      usuarioId: req.session.usuario?.id,
      perfil: req.session.usuario?.perfil,
      acao: 'VIEW',
      modulo: 'Auditoria',
      entidade: 'Log',
      descricao: `Usuário ${req.session.usuario?.nome} visualizou os logs de auditoria.`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, data: result.rows, total: result.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Detalha um log específico.
 * GET /api/auditoria/:id
 */
async function detalhar(req, res) {
  try {
    const log = await auditoriaRepository.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log não encontrado.' });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Logs de login/logout.
 * GET /api/auditoria/logins
 */
async function logins(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await auditoriaRepository.listLogins(parseInt(limit), offset);
    res.json({ success: true, data: result.rows, total: result.total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Logs de exportação.
 * GET /api/auditoria/exportacoes
 */
async function exportacoes(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await auditoriaRepository.listExportacoes(parseInt(limit), offset);
    res.json({ success: true, data: result.rows, total: result.total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Logs de alterações.
 * GET /api/auditoria/alteracoes
 */
async function alteracoes(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await auditoriaRepository.listAlteracoes(parseInt(limit), offset);
    res.json({ success: true, data: result.rows, total: result.total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Logs por módulo.
 * GET /api/auditoria/modulo/:modulo
 */
async function porModulo(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await auditoriaRepository.listByModulo(req.params.modulo, parseInt(limit), offset);
    res.json({ success: true, data: result.rows, total: result.total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Logs por usuário.
 * GET /api/auditoria/usuario/:usuarioId
 */
async function porUsuario(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await auditoriaRepository.listByUsuario(req.params.usuarioId, parseInt(limit), offset);
    res.json({ success: true, data: result.rows, total: result.total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Exportar logs em Excel.
 * GET /api/auditoria/exportar/excel
 */
async function exportarExcel(req, res) {
  try {
    const filters = {
      usuario: req.query.usuario, perfil: req.query.perfil,
      modulo: req.query.modulo, acao: req.query.acao,
      data_inicio: req.query.data_inicio, data_fim: req.query.data_fim,
      texto: req.query.texto
    };
    const rows = await auditoriaRepository.listForExport(filters);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Logs de Auditoria');

    sheet.columns = [
      { header: 'Data/Hora', key: 'data_hora', width: 22 },
      { header: 'Usuário', key: 'usuario_nome', width: 25 },
      { header: 'Perfil', key: 'perfil', width: 15 },
      { header: 'Módulo', key: 'modulo', width: 18 },
      { header: 'Entidade', key: 'entidade', width: 18 },
      { header: 'Ação', key: 'acao', width: 18 },
      { header: 'Descrição', key: 'descricao', width: 50 },
      { header: 'IP', key: 'ip', width: 18 },
    ];

    // Cabeçalho estilizado
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF001731' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(1).height = 20;

    rows.forEach(row => {
      sheet.addRow({
        data_hora: row.data_hora ? new Date(row.data_hora).toLocaleString('pt-BR') : '',
        usuario_nome: row.usuario_nome || 'Sistema',
        perfil: row.perfil || '-',
        modulo: row.modulo,
        entidade: row.entidade || '-',
        acao: row.acao,
        descricao: row.descricao,
        ip: row.ip || '-'
      });
    });

    // Registrar auditoria da exportação
    await auditoriaService.registrarLog({
      usuarioId: req.session.usuario?.id,
      perfil: req.session.usuario?.perfil,
      acao: 'EXPORT',
      modulo: 'Auditoria',
      entidade: 'Log',
      descricao: `Usuário ${req.session.usuario?.nome} exportou ${rows.length} logs de auditoria em Excel.`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Exportar logs em PDF (HTML-to-print).
 * GET /api/auditoria/exportar/pdf
 */
async function exportarPDF(req, res) {
  try {
    const filters = {
      usuario: req.query.usuario, perfil: req.query.perfil,
      modulo: req.query.modulo, acao: req.query.acao,
      data_inicio: req.query.data_inicio, data_fim: req.query.data_fim,
      texto: req.query.texto
    };
    const rows = await auditoriaRepository.listForExport(filters);

    // Registrar auditoria da exportação
    await auditoriaService.registrarLog({
      usuarioId: req.session.usuario?.id,
      perfil: req.session.usuario?.perfil,
      acao: 'EXPORT',
      modulo: 'Auditoria',
      entidade: 'Log',
      descricao: `Usuário ${req.session.usuario?.nome} exportou ${rows.length} logs de auditoria em PDF.`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const linhas = rows.map(r => `
      <tr>
        <td>${r.data_hora ? new Date(r.data_hora).toLocaleString('pt-BR') : '-'}</td>
        <td>${r.usuario_nome || 'Sistema'}</td>
        <td>${r.perfil || '-'}</td>
        <td>${r.modulo}</td>
        <td><span class="badge badge-${r.acao.toLowerCase()}">${r.acao}</span></td>
        <td>${r.descricao}</td>
        <td>${r.ip || '-'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>Auditoria - NexoMoveis</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px; }
        h1 { font-size: 18px; color: #001731; margin-bottom: 4px; }
        .subtitle { color: #555; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #001731; color: #fff; padding: 7px 6px; text-align: left; font-size: 10px; }
        td { padding: 6px; border-bottom: 1px solid #eee; font-size: 10px; vertical-align: top; }
        tr:nth-child(even) { background: #f9f9f9; }
        .badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold; }
        .badge-create { background:#dcfce7; color:#166534; }
        .badge-update { background:#dbeafe; color:#1e40af; }
        .badge-delete_logico { background:#fee2e2; color:#991b1b; }
        .badge-login { background:#f0fdf4; color:#166534; }
        .badge-logout { background:#fef9c3; color:#854d0e; }
        .badge-export { background:#ede9fe; color:#4c1d95; }
        .badge-payment { background:#d1fae5; color:#065f46; }
        .badge-reversal { background:#fee2e2; color:#991b1b; }
        .badge-upload { background:#e0f2fe; color:#0369a1; }
        .badge-view { background:#f1f5f9; color:#475569; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>🔍 Logs de Auditoria — NexoMoveis</h1>
      <p class="subtitle">Gerado em: ${new Date().toLocaleString('pt-BR')} · Total: ${rows.length} registros</p>
      <table>
        <thead><tr>
          <th>Data/Hora</th><th>Usuário</th><th>Perfil</th>
          <th>Módulo</th><th>Ação</th><th>Descrição</th><th>IP</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  cards, listar, detalhar, logins, exportacoes,
  alteracoes, porModulo, porUsuario, exportarExcel, exportarPDF
};
