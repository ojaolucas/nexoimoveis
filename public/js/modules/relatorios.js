// Client-side Relatórios module

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/relatorios')) {
    initRelatorios();
  }
});

async function initRelatorios() {
  try {
    // Load active properties to populate the filter dropdown
    await loadPropertiesFilter();
    
    // Bind change listener for report type
    const selectTipo = document.getElementById('report-select-tipo');
    if (selectTipo) {
      selectTipo.addEventListener('change', handleReportTypeChange);
    }
    
    // Bind buttons
    const btnVisualizar = document.getElementById('report-btn-visualizar');
    if (btnVisualizar) {
      btnVisualizar.addEventListener('click', handleVisualizarRelatorio);
    }
    
    const btnLimpar = document.getElementById('report-btn-limpar');
    if (btnLimpar) {
      btnLimpar.addEventListener('click', clearFilters);
    }
    
    const btnExcel = document.getElementById('report-btn-excel');
    if (btnExcel) {
      btnExcel.addEventListener('click', () => handleExport('excel'));
    }
    
    const btnPdf = document.getElementById('report-btn-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => handleExport('pdf'));
    }
  } catch (error) {
    console.error('Erro ao inicializar módulo de relatórios:', error);
  }
}

// Fetch active properties
async function loadPropertiesFilter() {
  try {
    const res = await api.get('/api/imoveis');
    if (res.success && res.data) {
      const selectImovel = document.getElementById('report-filter-imovel');
      if (selectImovel) {
        // Clear except first option
        selectImovel.innerHTML = '<option value="">Todos os Imóveis</option>';
        
        res.data.forEach(imovel => {
          if (imovel.status !== 'Inativo') {
            const option = document.createElement('option');
            option.value = imovel.id;
            option.textContent = imovel.nome;
            selectImovel.appendChild(option);
          }
        });
      }
    }
  } catch (error) {
    console.error('Erro ao carregar lista de imóveis para filtro:', error);
  }
}

// Show/Hide filters dynamically based on report type
function handleReportTypeChange(e) {
  const tipo = e.target.value;
  
  // Hide all dynamic filters first
  document.querySelectorAll('.filter-dynamic').forEach(el => el.style.display = 'none');
  
  const btnVisualizar = document.getElementById('report-btn-visualizar');
  const btnLimpar = document.getElementById('report-btn-limpar');
  
  if (!tipo) {
    if (btnVisualizar) btnVisualizar.disabled = true;
    if (btnLimpar) btnLimpar.style.display = 'none';
    return;
  }
  
  if (btnVisualizar) btnVisualizar.disabled = false;
  if (btnLimpar) btnLimpar.style.display = 'inline-flex';
  
  // Show filters based on report type
  switch (tipo) {
    case 'receitas':
      showFilter('imovel');
      showFilter('status');
      showFilter('data-inicio');
      showFilter('data-fim');
      populateStatusOptions(['Pendente', 'Pago', 'Vencido']);
      break;
    case 'despesas':
      showFilter('imovel');
      showFilter('status');
      showFilter('categoria');
      showFilter('data-inicio');
      showFilter('data-fim');
      populateStatusOptions(['Pendente', 'Pago', 'Vencido']);
      break;
    case 'financeiro-imovel':
      showFilter('imovel');
      break;
    case 'inadimplencia':
      showFilter('imovel');
      break;
    case 'contratos':
      showFilter('imovel');
      showFilter('status');
      populateStatusOptions(['Ativo', 'Encerrado', 'Rescindido', 'Suspenso']);
      break;
    case 'ocupacao':
      showFilter('status');
      populateStatusOptions(['Disponível', 'Alugado', 'Reservado', 'Em Manutenção']);
      break;
    case 'imoveis':
      showFilter('status');
      showFilter('tipo-imovel');
      populateStatusOptions(['Disponível', 'Alugado', 'Reservado', 'Em Manutenção']);
      break;
  }
}

function showFilter(name) {
  const el = document.getElementById(`filter-group-${name}`);
  if (el) el.style.display = 'flex';
}

function populateStatusOptions(options) {
  const selectStatus = document.getElementById('report-filter-status');
  if (selectStatus) {
    selectStatus.innerHTML = '<option value="">Todos</option>';
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      selectStatus.appendChild(option);
    });
  }
}

// Clear all inputs
function clearFilters() {
  const selectTipo = document.getElementById('report-select-tipo');
  if (selectTipo) selectTipo.value = '';
  
  const selects = ['report-filter-imovel', 'report-filter-status', 'report-filter-categoria', 'report-filter-tipo-imovel'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  const dates = ['report-filter-data-inicio', 'report-filter-data-fim'];
  dates.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  handleReportTypeChange({ target: { value: '' } });
  
  // Clear table preview
  const container = document.getElementById('preview-table-container');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fi fi-rr-stats"></i>
        <p>Nenhum dado para exibir. Selecione um tipo de relatório e clique em "Visualizar Relatório".</p>
      </div>
    `;
  }
  
  const title = document.getElementById('preview-report-title');
  if (title) title.textContent = 'Selecione um relatório para visualizar';
  
  const exportBtn = document.getElementById('export-buttons-container');
  if (exportBtn) exportBtn.style.display = 'none';
}

// Gather all filters into a query string
function getFilterQueryParams() {
  const tipo = document.getElementById('report-select-tipo').value;
  const imovelId = document.getElementById('report-filter-imovel').value;
  const status = document.getElementById('report-filter-status').value;
  const categoria = document.getElementById('report-filter-categoria').value;
  const tipoImovel = document.getElementById('report-filter-tipo-imovel').value;
  const dataInicio = document.getElementById('report-filter-data-inicio').value;
  const dataFim = document.getElementById('report-filter-data-fim').value;
  
  const params = new URLSearchParams();
  params.append('tipo', tipo);
  if (imovelId) params.append('imovel_id', imovelId);
  if (status) params.append('status', status);
  if (categoria) params.append('categoria', categoria);
  if (tipoImovel) params.append('tipo_imovel', tipoImovel);
  if (dataInicio) params.append('data_inicio', dataInicio);
  if (dataFim) params.append('data_fim', dataFim);
  
  return params.toString();
}

// Perform preview query and render table
async function handleVisualizarRelatorio() {
  const tipo = document.getElementById('report-select-tipo').value;
  if (!tipo) return;
  
  const container = document.getElementById('preview-table-container');
  const titleEl = document.getElementById('preview-report-title');
  const exportBtn = document.getElementById('export-buttons-container');
  
  if (container) {
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Buscando dados no banco de dados...</p>
      </div>
    `;
  }
  
  try {
    const queryStr = getFilterQueryParams();
    const res = await api.get(`/api/relatorios?${queryStr}`);
    
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Erro desconhecido.');
    }
    
    const rows = res.data;
    
    if (rows.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fi fi-rr-stats"></i>
          <p>Nenhum resultado encontrado para os filtros selecionados.</p>
        </div>
      `;
      if (exportBtn) exportBtn.style.display = 'none';
      return;
    }
    
    // Set report title
    const selectTipo = document.getElementById('report-select-tipo');
    const label = selectTipo.options[selectTipo.selectedIndex].text;
    titleEl.textContent = label;
    
    // Render table based on report type
    renderPreviewTable(tipo, rows, container);
    
    if (exportBtn) exportBtn.style.display = 'flex';
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fi fi-rr-cross-circle" style="color: var(--color-error);"></i>
        <p style="color: var(--color-error);">Erro ao processar relatório: ${error.message || error}</p>
      </div>
    `;
    if (exportBtn) exportBtn.style.display = 'none';
  }
}

// Render appropriate columns
function renderPreviewTable(tipo, rows, container) {
  let headers = [];
  let rowRenderer = (row) => '';
  
  switch (tipo) {
    case 'receitas':
      headers = ['Imóvel', 'Locatário', 'Competência', 'Vencimento', 'Previsto', 'Recebido', 'Pagamento', 'Forma', 'Status'];
      rowRenderer = r => `
        <tr>
          <td style="font-weight:600; color:var(--color-text-main);">${r.imovel_nome}</td>
          <td>${r.locatario_nome}</td>
          <td>${formatDate(r.competencia)}</td>
          <td>${formatDate(r.vencimento)}</td>
          <td>${formatCurrency(r.valor_previsto)}</td>
          <td>${r.valor_recebido ? formatCurrency(r.valor_recebido) : '-'}</td>
          <td>${r.data_pagamento ? formatDate(r.data_pagamento) : '-'}</td>
          <td>${r.forma_pagamento || '-'}</td>
          <td><span class="badge ${getStatusBadgeClass(r.status)}">${r.status}</span></td>
        </tr>
      `;
      break;
      
    case 'despesas':
      headers = ['Imóvel', 'Categoria', 'Responsável', 'Competência', 'Vencimento', 'Valor', 'Pagamento', 'Status'];
      rowRenderer = r => `
        <tr>
          <td style="font-weight:600; color:var(--color-text-main);">${r.imovel_nome}</td>
          <td>${r.categoria}</td>
          <td>${r.responsavel}</td>
          <td>${formatDate(r.competencia)}</td>
          <td>${formatDate(r.vencimento)}</td>
          <td>${formatCurrency(r.valor)}</td>
          <td>${r.data_pagamento ? formatDate(r.data_pagamento) : '-'}</td>
          <td><span class="badge ${getStatusBadgeClass(r.status)}">${r.status}</span></td>
        </tr>
      `;
      break;
      
    case 'financeiro-imovel':
      headers = ['Imóvel', 'Total Receitas', 'Total Despesas', 'Saldo Líquido'];
      rowRenderer = r => {
        const saldoClass = r.saldo >= 0 ? 'color: var(--color-success); font-weight:700;' : 'color: var(--color-error); font-weight:700;';
        return `
          <tr>
            <td style="font-weight:600; color:var(--color-text-main);">${r.imovel_nome}</td>
            <td style="color:var(--color-success); font-weight:600;">${formatCurrency(r.total_receitas)}</td>
            <td style="color:var(--color-error); font-weight:600;">${formatCurrency(r.total_despesas)}</td>
            <td style="${saldoClass}">${formatCurrency(r.saldo)}</td>
          </tr>
        `;
      };
      break;
      
    case 'inadimplencia':
      headers = ['Imóvel', 'Locatário', 'Competência', 'Vencimento', 'Valor Aberto', 'Atraso'];
      rowRenderer = r => `
        <tr>
          <td style="font-weight:600; color:var(--color-text-main);">${r.imovel_nome}</td>
          <td>${r.locatario_nome}</td>
          <td>${formatDate(r.competencia)}</td>
          <td>${formatDate(r.vencimento)}</td>
          <td>${formatCurrency(r.valor_previsto)}</td>
          <td style="color: var(--color-error); font-weight: 700;">${r.dias_atraso} dias</td>
        </tr>
      `;
      break;
      
    case 'contratos':
      headers = ['Imóvel', 'Locatário', 'Data Início', 'Data Fim', 'Valor Mensal', 'Status'];
      rowRenderer = r => `
        <tr>
          <td style="font-weight:600; color:var(--color-text-main);">${r.imovel_nome}</td>
          <td>${r.locatario_nome}</td>
          <td>${formatDate(r.data_inicio)}</td>
          <td>${formatDate(r.data_fim)}</td>
          <td>${formatCurrency(r.valor_mensal)}</td>
          <td><span class="badge ${getContratoBadgeClass(r.status)}">${r.status}</span></td>
        </tr>
      `;
      break;
      
    case 'ocupacao':
      headers = ['Imóvel', 'Tipo', 'Status', 'Valor Locação', 'Inquilino Atual'];
      rowRenderer = r => `
        <tr>
          <td style="font-weight:600; color:var(--color-text-main);">${r.imovel_nome}</td>
          <td>${r.tipo}</td>
          <td><span class="badge ${getImovelStatusBadgeClass(r.status)}">${r.status}</span></td>
          <td>${formatCurrency(r.valor_locacao)}</td>
          <td>${r.locatario_nome || '-'}</td>
        </tr>
      `;
      break;
      
    case 'imoveis':
      headers = ['Imóvel', 'Tipo', 'Status', 'Área', 'Valor Locação', 'Endereço', 'Proprietário'];
      rowRenderer = r => `
        <tr>
          <td style="font-weight:600; color:var(--color-text-main);">${r.imovel_nome}</td>
          <td>${r.tipo}</td>
          <td><span class="badge ${getImovelStatusBadgeClass(r.status)}">${r.status}</span></td>
          <td>${r.area_total} m²</td>
          <td>${formatCurrency(r.valor_locacao)}</td>
          <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.endereco || ''}">${r.endereco || '-'}</td>
          <td>${r.proprietario_nome}</td>
        </tr>
      `;
      break;
  }
  
  // Construct HTML
  const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
  const rowsHtml = rows.map(rowRenderer).join('');
  
  container.innerHTML = `
    <table class="app-table">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// Redirect to exports (they open in new window/tab)
function handleExport(format) {
  const queryStr = getFilterQueryParams();
  const endpoint = format === 'pdf' ? 'exportar/pdf' : 'exportar/excel';
  const url = `/api/relatorios/${endpoint}?${queryStr}`;
  window.open(url, '_blank');
}

// Format Helpers
function formatCurrency(val) {
  if (val === null || val === undefined) return 'R$ 0,00';
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed);
}

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

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pago': return 'badge-ativo';
    case 'Vencido': return 'badge-inativo';
    default: return 'badge-pf';
  }
}

function getContratoBadgeClass(status) {
  switch (status) {
    case 'Ativo': return 'badge-ativo';
    case 'Encerrado': return 'badge-pj';
    case 'Rescindido': return 'badge-inativo';
    default: return 'badge-pf';
  }
}

function getImovelStatusBadgeClass(status) {
  switch (status) {
    case 'Disponível': return 'badge-ativo';
    case 'Alugado': return 'badge-pj';
    case 'Reservado': return 'badge-pf';
    case 'Em Manutenção': return 'badge-inativo';
    default: return 'badge-pj';
  }
}
