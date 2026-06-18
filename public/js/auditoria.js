/**
 * auditoria.js
 * Frontend do Módulo Auditoria e Logs — NexoMoveis Fase 14
 */

const AuditoriaApp = (() => {
  // Estado
  let currentPage = 1;
  const PAGE_SIZE = 50;
  let totalRecords = 0;

  // ─── Inicialização ───
  async function init() {
    carregarCards();
    carregarLogs();
    bindEventos();
  }

  function bindEventos() {
    document.getElementById('btn-filtrar')?.addEventListener('click', () => {
      currentPage = 1;
      carregarLogs();
    });

    document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
      ['filter-usuario','filter-perfil','filter-modulo','filter-acao',
       'filter-data-inicio','filter-data-fim','filter-texto'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      currentPage = 1;
      carregarLogs();
    });

    // Enter nos campos de filtro
    ['filter-usuario','filter-texto'].forEach(id => {
      document.getElementById(id)?.addEventListener('keypress', e => {
        if (e.key === 'Enter') { currentPage = 1; carregarLogs(); }
      });
    });

    document.getElementById('btn-export-excel')?.addEventListener('click', exportarExcel);
    document.getElementById('btn-export-pdf')?.addEventListener('click', exportarPDF);

    document.getElementById('modal-close')?.addEventListener('click', fecharModal);
    document.getElementById('modal-detalhes')?.addEventListener('click', e => {
      if (e.target.id === 'modal-detalhes') fecharModal();
    });
  }

  // ─── Cards ───
  async function carregarCards() {
    try {
      const res = await fetch('/api/auditoria/cards', { credentials: 'include' });
      if (!res.ok) return;
      const { data } = await res.json();
      if (!data) return;
      document.getElementById('card-total').textContent = formatNum(data.total_logs);
      document.getElementById('card-logins').textContent = formatNum(data.logins_hoje);
      document.getElementById('card-alteracoes').textContent = formatNum(data.alteracoes_hoje);
      document.getElementById('card-exportacoes').textContent = formatNum(data.exportacoes_hoje);
    } catch (err) {
      console.error('[Auditoria] Erro ao carregar cards:', err);
    }
  }

  // ─── Carregar logs ───
  async function carregarLogs() {
    const tbody = document.getElementById('audit-tbody');
    tbody.innerHTML = `<tr class="loading-row"><td colspan="8"><i class="fi fi-rr-spinner fa-spin"></i> Carregando...</td></tr>`;

    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: PAGE_SIZE,
        usuario: getValue('filter-usuario'),
        perfil: getValue('filter-perfil'),
        modulo: getValue('filter-modulo'),
        acao: getValue('filter-acao'),
        data_inicio: getValue('filter-data-inicio'),
        data_fim: getValue('filter-data-fim'),
        texto: getValue('filter-texto'),
      });
      // Remover parâmetros vazios
      for (const [k,v] of [...params.entries()]) { if (!v) params.delete(k); }

      const res = await fetch(`/api/auditoria?${params}`, { credentials: 'include' });
      if (res.status === 403) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--color-danger);">
          <i class="fi fi-rr-lock" style="font-size:32px;display:block;margin-bottom:8px;"></i>
          Acesso restrito a administradores.</td></tr>`;
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      totalRecords = json.total;
      renderTabela(json.data);
      renderPaginacao();
      document.getElementById('table-count').textContent = `(${formatNum(totalRecords)} registros)`;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--color-danger);">
        <i class="fi fi-rr-cross-circle"></i> Erro ao carregar logs: ${err.message}</td></tr>`;
    }
  }

  // ─── Renderizar tabela ───
  function renderTabela(rows) {
    const tbody = document.getElementById('audit-tbody');
    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">
        <div class="empty-state">
          <i class="fi fi-rr-shield-check"></i>
          <p>Nenhum registro encontrado com os filtros aplicados.</p>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const dt = r.data_hora ? new Date(r.data_hora) : null;
      const data = dt ? dt.toLocaleDateString('pt-BR') : '-';
      const hora = dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      const badge = `<span class="badge-acao badge-${r.acao}">${acaoIcon(r.acao)} ${r.acao}</span>`;
      return `
        <tr>
          <td>${data}</td>
          <td style="font-family:monospace;font-size:12px;">${hora}</td>
          <td>
            <div style="font-weight:600;font-size:13px;">${escapeHtml(r.usuario_nome || 'Sistema')}</div>
            ${r.perfil ? `<div style="font-size:11px;color:var(--color-text-muted);">${r.perfil}</div>` : ''}
          </td>
          <td><span style="font-size:12px;color:var(--color-text-muted);">${escapeHtml(r.modulo || '-')}</span></td>
          <td>${badge}</td>
          <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(r.descricao || '')}">${escapeHtml(r.descricao || '-')}</td>
          <td style="font-family:monospace;font-size:12px;color:var(--color-text-muted);">${r.ip || '-'}</td>
          <td style="text-align:center;">
            <button class="btn-icon" onclick="AuditoriaApp.verDetalhes('${r.id}')" title="Ver Detalhes">
              <i class="fi fi-rr-eye"></i>
            </button>
          </td>
        </tr>`;
    }).join('');
  }

  // ─── Ver detalhes ───
  async function verDetalhes(id) {
    try {
      const res = await fetch(`/api/auditoria/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      const r = json.data;
      const dt = r.data_hora ? new Date(r.data_hora) : null;

      // Campos do detalhe
      document.getElementById('detail-fields').innerHTML = `
        <div class="detail-field"><span class="detail-label">Usuário</span><span class="detail-value">${escapeHtml(r.usuario_nome || 'Sistema')}</span></div>
        <div class="detail-field"><span class="detail-label">Perfil</span><span class="detail-value">${r.usuario_perfil || r.perfil || '-'}</span></div>
        <div class="detail-field"><span class="detail-label">Data</span><span class="detail-value">${dt ? dt.toLocaleDateString('pt-BR') : '-'}</span></div>
        <div class="detail-field"><span class="detail-label">Hora</span><span class="detail-value" style="font-family:monospace;">${dt ? dt.toLocaleTimeString('pt-BR') : '-'}</span></div>
        <div class="detail-field"><span class="detail-label">IP</span><span class="detail-value" style="font-family:monospace;">${r.ip || '-'}</span></div>
        <div class="detail-field"><span class="detail-label">Módulo</span><span class="detail-value">${r.modulo || '-'}</span></div>
        <div class="detail-field"><span class="detail-label">Entidade</span><span class="detail-value">${r.entidade || '-'}</span></div>
        <div class="detail-field"><span class="detail-label">Ação</span><span class="detail-value"><span class="badge-acao badge-${r.acao}">${acaoIcon(r.acao)} ${r.acao}</span></span></div>
        <div class="detail-field" style="grid-column:1/-1;"><span class="detail-label">Descrição</span><span class="detail-value">${escapeHtml(r.descricao || '-')}</span></div>
        <div class="detail-field" style="grid-column:1/-1;"><span class="detail-label">Navegador/OS</span><span class="detail-value" style="font-size:12px;color:var(--color-text-muted);">${escapeHtml(r.user_agent || '-')}</span></div>
      `;

      // Diff antes/depois
      renderDiff(r.dados_anteriores, r.dados_novos);

      abrirModal();
    } catch (err) {
      alert('Erro ao carregar detalhes: ' + err.message);
    }
  }

  function renderDiff(antes, depois) {
    const section = document.getElementById('diff-section');
    if (!antes && !depois) { section.innerHTML = ''; return; }

    let antesObj = {}, depoisObj = {};
    try { antesObj = typeof antes === 'string' ? JSON.parse(antes) : (antes || {}); } catch(_){}
    try { depoisObj = typeof depois === 'string' ? JSON.parse(depois) : (depois || {}); } catch(_){}

    const todosKeys = new Set([...Object.keys(antesObj), ...Object.keys(depoisObj)]);
    const linhasComDiff = [];

    todosKeys.forEach(key => {
      const v1 = antesObj[key];
      const v2 = depoisObj[key];
      const s1 = v1 !== undefined ? String(v1) : '';
      const s2 = v2 !== undefined ? String(v2) : '';
      if (s1 !== s2) {
        linhasComDiff.push({ campo: key, antes: s1, depois: s2 });
      }
    });

    if (linhasComDiff.length === 0) {
      section.innerHTML = `<div class="diff-section"><div class="diff-title"><i class="fi fi-rr-compare"></i> Comparação de Alterações</div><p class="no-diff">Nenhuma alteração detectada nos dados.</p></div>`;
      return;
    }

    section.innerHTML = `
      <div class="diff-section">
        <div class="diff-title"><i class="fi fi-rr-compare"></i> Comparação de Alterações (${linhasComDiff.length} campos alterados)</div>
        <table class="diff-table">
          <thead><tr><th>Campo</th><th>🔴 Antes</th><th>🟢 Depois</th></tr></thead>
          <tbody>
            ${linhasComDiff.map(l => `
              <tr>
                <td class="diff-field">${escapeHtml(formatCampo(l.campo))}</td>
                <td class="diff-before">${escapeHtml(l.antes || '(vazio)')}</td>
                <td class="diff-after">${escapeHtml(l.depois || '(vazio)')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ─── Paginação ───
  function renderPaginacao() {
    const container = document.getElementById('pagination-container');
    const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
    const inicio = (currentPage - 1) * PAGE_SIZE + 1;
    const fim = Math.min(currentPage * PAGE_SIZE, totalRecords);

    if (totalRecords === 0) { container.innerHTML = ''; return; }

    let btns = '';
    const delta = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        btns += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="AuditoriaApp.goPage(${i})">${i}</button>`;
      } else if (i === currentPage - delta - 1 || i === currentPage + delta + 1) {
        btns += `<span style="padding:0 4px;color:var(--color-text-muted);">...</span>`;
      }
    }

    container.innerHTML = `
      <span class="pagination-info">Exibindo ${formatNum(inicio)} a ${formatNum(fim)} de ${formatNum(totalRecords)} registros</span>
      <div class="pagination-controls">
        <button class="page-btn" onclick="AuditoriaApp.goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
          <i class="fi fi-rr-angle-left"></i>
        </button>
        ${btns}
        <button class="page-btn" onclick="AuditoriaApp.goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
          <i class="fi fi-rr-angle-right"></i>
        </button>
      </div>`;
  }

  function goPage(p) {
    const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    carregarLogs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Exportações ───
  function exportarExcel() {
    const params = filtrosParaParams();
    window.open(`/api/auditoria/exportar/excel?${params}`, '_blank');
  }

  function exportarPDF() {
    const params = filtrosParaParams();
    window.open(`/api/auditoria/exportar/pdf?${params}`, '_blank');
  }

  function filtrosParaParams() {
    const p = new URLSearchParams({
      usuario: getValue('filter-usuario'),
      perfil: getValue('filter-perfil'),
      modulo: getValue('filter-modulo'),
      acao: getValue('filter-acao'),
      data_inicio: getValue('filter-data-inicio'),
      data_fim: getValue('filter-data-fim'),
      texto: getValue('filter-texto'),
    });
    for (const [k,v] of [...p.entries()]) { if (!v) p.delete(k); }
    return p.toString();
  }

  // ─── Modal ───
  function abrirModal() { document.getElementById('modal-detalhes').classList.add('open'); }
  function fecharModal() { document.getElementById('modal-detalhes').classList.remove('open'); }

  // ─── Helpers ───
  function getValue(id) { return document.getElementById(id)?.value?.trim() || ''; }

  function formatNum(n) {
    if (n === null || n === undefined) return '-';
    return Number(n).toLocaleString('pt-BR');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatCampo(campo) {
    return campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function acaoIcon(acao) {
    const icons = {
      LOGIN: '🔑', LOGOUT: '🚪', CREATE: '✚', UPDATE: '✏️',
      DELETE_LOGICO: '🗑️', UPLOAD: '⬆️', DOWNLOAD: '⬇️',
      VIEW: '👁️', PAYMENT: '💳', REVERSAL: '↩️', EXPORT: '📤'
    };
    return icons[acao] || '•';
  }

  // API pública
  return { init, verDetalhes, goPage };
})();

document.addEventListener('DOMContentLoaded', AuditoriaApp.init);
