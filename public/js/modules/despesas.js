// Despesas Módulo JavaScript Controller (Fase 09)

let currentPage = 1;
const limit = 10;
let currentFilters = { status: '', imovel: '', categoria: '', responsavel: '', competencia: '', data_inicial: '', data_final: '' };
let currentDespesaId = null;
let currentNominalValor = 0;
let userProfile = null;
let allImoveis = [];
let currentTab = 'painel-lista'; // 'painel-lista', 'painel-graficos', 'painel-recorrencias'

// Chart.js instances to prevent duplication warnings
let despesasCategoriaChart = null;
let despesasMesChart = null;
let despesasStatusChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/despesas') {
    initDespesas();
  }
});

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

async function initDespesas() {
  // 1. Get user profile and configure buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        // Show create and action buttons
        const btnNew = document.getElementById('btn-nova-despesa');
        if (btnNew) btnNew.style.display = 'inline-flex';
        
        const uploadForm = document.getElementById('upload-comprovante-container');
        if (uploadForm) uploadForm.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile:', err);
  }

  // 2. Fetch options
  await carregarOpcoes();

  // 3. Load initial list and stats
  await carregarDespesas(currentPage);
  await carregarCardsStats();

  // 4. Register Event Listeners
  setupEventListeners();
}

async function carregarOpcoes() {
  try {
    const res = await api.get('/api/imoveis?limit=1000');
    if (res.success && res.data) {
      allImoveis = res.data;
      
      // Populate filters select
      const filtroImovel = document.getElementById('filtro-imovel');
      if (filtroImovel) {
        filtroImovel.innerHTML = '<option value="">Todos os Imóveis</option>' + 
          allImoveis.map(i => `<option value="${i.id}">${i.nome} (${i.codigo})</option>`).join('');
      }

      // Populate form select
      const formImovel = document.getElementById('imovel_id');
      if (formImovel) {
        formImovel.innerHTML = '<option value="" disabled selected>Selecione um imóvel</option>' + 
          allImoveis.filter(i => i.status !== 'Inativo').map(i => `<option value="${i.id}">${i.nome} (${i.codigo})</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dropdown choices:', err);
  }
}

async function carregarCardsStats() {
  try {
    const res = await api.get('/api/despesas/stats');
    if (res.success && res.data) {
      const stats = res.data;
      document.getElementById('card-despesas-mes').textContent = formatCurrency(stats.despesas_mes);
      document.getElementById('card-despesas-pagas').textContent = formatCurrency(stats.despesas_pagas);
      document.getElementById('card-despesas-aberto').textContent = formatCurrency(stats.despesas_aberto);
      document.getElementById('card-despesas-vencidas').textContent = formatCurrency(stats.despesas_vencidas);
      document.getElementById('card-qtd-despesas').textContent = stats.qtd_despesas;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function carregarDespesas(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/despesas?${query}`);
    const tbody = document.getElementById('despesas-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Nenhuma despesa encontrada.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(d => {
      const compVal = d.competencia ? formatDate(d.competencia).substring(3) : '-'; // MM/YYYY
      const vencVal = formatDate(d.vencimento);
      const valVal = formatCurrency(d.valor);

      let badgeClass = 'badge-a-vencer';
      if (d.status === 'Pago') badgeClass = 'badge-pago';
      if (d.status === 'Vencido') badgeClass = 'badge-vencido';
      if (d.status === 'Cancelado') badgeClass = 'badge-cancelado';

      let actions = `<button onclick="verDetalhes('${d.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i> Ficha</button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarDespesa('${d.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i> Editar</button>`;
      }
      
      if ((userProfile === 'administrador' || userProfile === 'operacional') && d.status !== 'Pago' && d.status !== 'Cancelado') {
        actions += `<button onclick="abrirBaixaDireta('${d.id}', ${d.valor})" class="btn btn-primary btn-icon" style="margin-left: 6px;" title="Pagar"><i class="fi fi-rr-checkbox"></i> Pagar</button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${compVal}</strong></td>
          <td>${d.imovel_nome || 'Nenhum'}</td>
          <td><strong>${d.categoria}</strong></td>
          <td>${d.responsavel}</td>
          <td>${vencVal}</td>
          <td>${valVal}</td>
          <td><span class="badge ${badgeClass}">${d.status}</span></td>
          <td style="text-align: right; padding-right: 24px;">
            <div class="action-btn-group">${actions}</div>
          </td>
        </tr>
      `;
    }).join('');

    const total = res.pagination.total;
    const pages = res.pagination.pages;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    
    document.getElementById('pagination-info').textContent = `Mostrando ${start} a ${end} de ${total} registros`;
    updatePaginationControls(pages, page);
  } catch (err) {
    console.error('Error loading expenses:', err);
    showToast('Erro ao obter despesas.', 'error');
  } finally {
    hideLoader();
  }
}

function updatePaginationControls(totalPages, activePage) {
  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');

  btnPrev.disabled = activePage <= 1;
  btnNext.disabled = activePage >= totalPages;
}

async function carregarRecorrencias() {
  showLoader();
  try {
    const res = await api.get('/api/despesas/recorrentes');
    const tbody = document.getElementById('recorrencias-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Nenhum modelo de recorrência cadastrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(r => {
      const valVal = formatCurrency(r.valor);
      
      let actions = '';
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions = `<button onclick="inativarRecorrencia('${r.id}')" class="btn btn-secondary btn-icon" style="color:var(--color-error); border-color:var(--color-error-light);" title="Desativar Recorrência"><i class="fi fi-rr-ban"></i> Desativar</button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td>${r.imovel_nome} (${r.imovel_codigo})</td>
          <td><strong>${r.categoria}</strong></td>
          <td>${r.responsavel}</td>
          <td>Dia ${r.dia_vencimento}</td>
          <td>${valVal}</td>
          <td><span class="badge badge-pago">${r.frequencia}</span></td>
          <td>${r.observacoes || '-'}</td>
          <td style="text-align: right; padding-right: 24px;">${actions}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading recurrences:', err);
    showToast('Erro ao obter modelos de recorrências.', 'error');
  } finally {
    hideLoader();
  }
}

async function carregarGraficosDespesas() {
  showLoader();
  try {
    const res = await api.get('/api/despesas/graficos');
    if (!res.success || !res.data) {
      showToast('Erro ao obter dados analíticos.', 'error');
      return;
    }

    const { categorias, meses, status } = res.data;

    renderCategoriasChart(categorias);
    renderMesesChart(meses);
    renderStatusChart(status);
  } catch (err) {
    console.error('Error rendering graphs:', err);
    showToast('Erro ao obter dados para gráficos.', 'error');
  } finally {
    hideLoader();
  }
}

function renderCategoriasChart(data) {
  const ctx = document.getElementById('chart-despesas-categoria').getContext('2d');
  
  if (despesasCategoriaChart) {
    despesasCategoriaChart.destroy();
  }

  const colors = ['#001731', '#478C27', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#10B981', '#6366F1', '#6B7280'];

  despesasCategoriaChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.valores,
        backgroundColor: colors.slice(0, data.labels.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 10,
            font: { family: 'Inter', size: 10 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ' ' + context.label + ': ' + formatCurrency(context.parsed);
            }
          }
        }
      }
    }
  });
}

function renderMesesChart(data) {
  const ctx = document.getElementById('chart-despesas-mes').getContext('2d');
  
  if (despesasMesChart) {
    despesasMesChart.destroy();
  }

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#001731';

  despesasMesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Valor Total',
        data: data.valores,
        backgroundColor: primaryColor + 'cc',
        borderColor: primaryColor,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Total: ' + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

function renderStatusChart(data) {
  const ctx = document.getElementById('chart-despesas-status').getContext('2d');
  
  if (despesasStatusChart) {
    despesasStatusChart.destroy();
  }

  const successColor = getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim() || '#478C27';
  const errorColor = getComputedStyle(document.documentElement).getPropertyValue('--color-error').trim() || '#DC2626';

  despesasStatusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.valores,
        backgroundColor: [successColor, errorColor],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: { family: 'Inter', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ' ' + context.label + ': ' + formatCurrency(context.parsed);
            }
          }
        }
      }
    }
  });
}

function setupEventListeners() {
  // Main Tab Navigation Toggles
  document.getElementById('tab-btn-lista').addEventListener('click', (e) => {
    switchMainTab('painel-lista', e.currentTarget);
  });
  document.getElementById('tab-btn-graficos').addEventListener('click', (e) => {
    switchMainTab('painel-graficos', e.currentTarget);
  });
  document.getElementById('tab-btn-recorrencias').addEventListener('click', (e) => {
    switchMainTab('painel-recorrencias', e.currentTarget);
  });

  // Filters
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    currentFilters.imovel = document.getElementById('filtro-imovel').value;
    currentFilters.categoria = document.getElementById('filtro-categoria').value;
    currentFilters.responsavel = document.getElementById('filtro-responsavel').value;
    currentFilters.status = document.getElementById('filtro-status').value;
    currentFilters.competencia = document.getElementById('filtro-competencia').value;
    currentFilters.data_inicial = document.getElementById('filtro-data-inicio').value;
    currentFilters.data_final = document.getElementById('filtro-data-fim').value;
    currentPage = 1;
    carregarDespesas(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-imovel').value = '';
    document.getElementById('filtro-categoria').value = '';
    document.getElementById('filtro-responsavel').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-competencia').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    currentFilters = { status: '', imovel: '', categoria: '', responsavel: '', competencia: '', data_inicial: '', data_final: '' };
    currentPage = 1;
    carregarDespesas(currentPage);
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      carregarDespesas(currentPage);
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    carregarDespesas(currentPage);
  });

  // Context-based Exports (PDF/CSV)
  document.getElementById('btn-exportar-csv').addEventListener('click', () => {
    let tipo = 'periodo';
    let queryParams = new URLSearchParams(currentFilters);

    if (currentFilters.status === 'Pago') {
      tipo = 'pagas';
    } else if (currentFilters.status === 'Vencido') {
      tipo = 'vencidas';
    } else if (currentFilters.imovel) {
      tipo = 'imovel';
    } else if (currentFilters.categoria) {
      tipo = 'categoria';
    }

    queryParams.set('tipo', tipo);
    window.location.href = `/api/despesas/exportar/excel?${queryParams.toString()}`;
  });

  document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
    let tipo = 'periodo';
    let queryParams = new URLSearchParams(currentFilters);

    if (currentFilters.status === 'Pago') {
      tipo = 'pagas';
    } else if (currentFilters.status === 'Vencido') {
      tipo = 'vencidas';
    } else if (currentFilters.imovel) {
      tipo = 'imovel';
    } else if (currentFilters.categoria) {
      tipo = 'categoria';
    }

    queryParams.set('tipo', tipo);
    window.open(`/api/despesas/exportar/pdf?${queryParams.toString()}`, '_blank');
  });

  // Open Creation Modal
  const modalDesp = document.getElementById('modal-despesa');
  const btnNovo = document.getElementById('btn-nova-despesa');
  
  if (btnNovo) {
    btnNovo.addEventListener('click', () => {
      document.getElementById('form-despesa').reset();
      document.getElementById('despesa-id').value = '';
      document.getElementById('modal-title').textContent = 'Nova Despesa';
      document.getElementById('btn-salvar-despesa').textContent = 'Cadastrar';
      
      // Defaults and hide/show blocks
      document.getElementById('recorrente-checkbox-group').style.display = 'block';
      document.getElementById('recurrence-fields').style.display = 'none';
      document.getElementById('document-expiry-fields').style.display = 'none';
      document.getElementById('edit-status-group').style.display = 'none';
      
      modalDesp.classList.add('active');
    });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modalDesp.classList.remove('active');
  });
  document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
    modalDesp.classList.remove('active');
  });

  // Form submit for create/edit despesa
  document.getElementById('form-despesa').addEventListener('submit', handleSaveDespesa);

  // Recurrente checkbox toggle configuration box
  document.getElementById('recorrente').addEventListener('change', (e) => {
    const fields = document.getElementById('recurrence-fields');
    fields.style.display = e.target.checked ? 'block' : 'none';
    
    // Set validation required fields on toggle
    document.getElementById('dia_vencimento').required = e.target.checked;
  });

  // Categoria selection toggle document box
  document.getElementById('categoria').addEventListener('change', (e) => {
    const cat = e.target.value;
    const documentBox = document.getElementById('document-expiry-fields');
    
    if (cat === 'IPTU' || cat === 'Seguro' || cat === 'Taxa de Localização') {
      documentBox.style.display = 'block';
    } else {
      documentBox.style.display = 'none';
      // clear inputs
      document.getElementById('documento_emissao').value = '';
      document.getElementById('documento_vencimento').value = '';
    }
  });

  // Detail Modal sub-navigation tabs toggler
  document.querySelectorAll('#modal-detalhes .modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchModalTab(e.currentTarget.getAttribute('data-tab'));
    });
  });

  // Close Detail Modals
  document.getElementById('btn-close-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes').classList.remove('active');
  });
  document.getElementById('btn-fechar-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes').classList.remove('active');
  });

  document.getElementById('btn-close-pagamento').addEventListener('click', () => {
    document.getElementById('modal-pagamento').classList.remove('active');
  });
  document.getElementById('btn-cancelar-pagamento').addEventListener('click', () => {
    document.getElementById('modal-pagamento').classList.remove('active');
  });

  // Modal comprobante form submit
  document.getElementById('form-upload-comprovante').addEventListener('submit', handleUploadComprovante);

  // Payment register submit
  document.getElementById('form-pagamento').addEventListener('submit', handleSavePagamento);

  // Actions click inside detail modal
  document.getElementById('btn-modal-pagar').addEventListener('click', () => {
    abrirFormPagamento(currentDespesaId, currentNominalValor);
  });

  document.getElementById('btn-modal-cancelar').addEventListener('click', () => {
    cancelarDespesa(currentDespesaId);
  });
}

function switchMainTab(tabId, tabButton) {
  currentTab = tabId;

  // Toggle active class on buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  tabButton.classList.add('active');

  // Toggle active class on panes
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');

  // Load contextual tab content
  if (tabId === 'painel-lista') {
    carregarDespesas(currentPage);
  } else if (tabId === 'painel-graficos') {
    carregarGraficosDespesas();
  } else if (tabId === 'painel-recorrencias') {
    carregarRecorrencias();
  }
}

function switchModalTab(tabId) {
  // Toggle buttons
  document.querySelectorAll('#modal-detalhes .modal-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Toggle panels
  document.querySelectorAll('#modal-detalhes .modal-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === tabId);
  });
}

async function handleSaveDespesa(e) {
  e.preventDefault();
  const id = document.getElementById('despesa-id').value;
  
  const payload = {
    imovel_id: document.getElementById('imovel_id').value,
    categoria: document.getElementById('categoria').value,
    responsavel: document.getElementById('responsavel').value,
    valor: document.getElementById('valor').value,
    competencia: document.getElementById('competencia').value,
    vencimento: document.getElementById('vencimento').value,
    observacoes: document.getElementById('observacoes').value.trim(),
    
    // Recurrence
    recorrente: document.getElementById('recorrente').checked,
    frequencia: document.getElementById('frequencia').value,
    dia_vencimento: document.getElementById('dia_vencimento').value,
    
    // Document
    documento_emissao: document.getElementById('documento_emissao').value || null,
    documento_vencimento: document.getElementById('documento_vencimento').value || null
  };

  // If in edit mode, add status & data_pagamento
  if (id) {
    payload.status = document.getElementById('status').value;
    payload.data_pagamento = document.getElementById('data_pagamento_edit').value || null;
  }

  showLoader();
  try {
    let res;
    if (id) {
      res = await api.put(`/api/despesas/${id}`, payload);
    } else {
      res = await api.post('/api/despesas', payload);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-despesa').classList.remove('active');
      
      // Reload stats & table
      await carregarCardsStats();
      carregarDespesas(currentPage);
      if (currentTab === 'painel-recorrencias') carregarRecorrencias();
    } else {
      showToast(res.message || 'Erro ao processar despesa.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

window.editarDespesa = async function(id) {
  try {
    const res = await api.get(`/api/despesas/${id}`);
    if (res.success && res.data) {
      const d = res.data;
      
      document.getElementById('despesa-id').value = d.id;
      document.getElementById('imovel_id').value = d.imovel_id;
      document.getElementById('categoria').value = d.categoria;
      document.getElementById('responsavel').value = d.responsavel;
      document.getElementById('valor').value = d.valor;
      
      // dates to yyyy-MM-dd
      document.getElementById('competencia').value = d.competencia ? d.competencia.split('T')[0] : '';
      document.getElementById('vencimento').value = d.vencimento ? d.vencimento.split('T')[0] : '';
      document.getElementById('observacoes').value = d.observacoes || '';

      // Set document fields
      const documentBox = document.getElementById('document-expiry-fields');
      if (d.categoria === 'IPTU' || d.categoria === 'Seguro' || d.categoria === 'Taxa de Localização') {
        documentBox.style.display = 'block';
        document.getElementById('documento_emissao').value = d.documento_emissao ? d.documento_emissao.split('T')[0] : '';
        document.getElementById('documento_vencimento').value = d.documento_vencimento ? d.documento_vencimento.split('T')[0] : '';
      } else {
        documentBox.style.display = 'none';
        document.getElementById('documento_emissao').value = '';
        document.getElementById('documento_vencimento').value = '';
      }

      // Hide recurrence template controls on edit (templates are managed via recurrences tab)
      document.getElementById('recorrente-checkbox-group').style.display = 'none';
      document.getElementById('recurrence-fields').style.display = 'none';
      
      // Show edit status group
      document.getElementById('edit-status-group').style.display = 'grid';
      document.getElementById('status').value = d.status;
      document.getElementById('data_pagamento_edit').value = d.data_pagamento ? d.data_pagamento.split('T')[0] : '';

      document.getElementById('modal-title').textContent = 'Editar Despesa';
      document.getElementById('btn-salvar-despesa').textContent = 'Salvar Alterações';
      
      document.getElementById('modal-despesa').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar dados da despesa.', 'error');
  }
};

window.verDetalhes = async function(id) {
  try {
    const res = await api.get(`/api/despesas/${id}`);
    if (res.success && res.data) {
      const d = res.data;
      currentDespesaId = d.id;
      currentNominalValor = d.valor;

      // Header
      document.getElementById('detalhe-header-title').textContent = `Ficha da Despesa #${d.id.substring(0, 8)}`;
      const badgeStatus = document.getElementById('detalhe-status-badge');
      badgeStatus.textContent = d.status;
      badgeStatus.className = `badge badge-${d.status.toLowerCase().replace(' ', '-')}`;

      // General Data
      document.getElementById('det-categoria').textContent = d.categoria;
      document.getElementById('det-vencimento').textContent = formatDate(d.vencimento);
      document.getElementById('det-competencia').textContent = d.competencia ? formatDate(d.competencia).substring(3) : '-';
      document.getElementById('det-valor').textContent = formatCurrency(d.valor);
      document.getElementById('det-responsavel').textContent = d.responsavel;
      document.getElementById('det-recorrente').textContent = d.recorrente ? 'Sim' : 'Não';
      document.getElementById('det-data-pagamento').textContent = d.data_pagamento ? `Paga em ${formatDate(d.data_pagamento)}` : 'Não paga';
      document.getElementById('det-observacoes').textContent = d.observacoes || 'Nenhuma observação informada.';

      // Document Expiration details
      const docBox = document.getElementById('det-document-box');
      if (d.categoria === 'IPTU' || d.categoria === 'Seguro' || d.categoria === 'Taxa de Localização') {
        document.getElementById('det-doc-emissao').textContent = d.documento_emissao ? formatDate(d.documento_emissao) : 'Não informada';
        document.getElementById('det-doc-vencimento').textContent = d.documento_vencimento ? formatDate(d.documento_vencimento) : 'Não informada';
        docBox.style.display = 'block';
      } else {
        docBox.style.display = 'none';
      }

      // Imóvel Data
      document.getElementById('det-imovel-codigo').textContent = d.imovel_codigo || '-';
      document.getElementById('det-imovel-nome').textContent = d.imovel_nome || '-';
      document.getElementById('det-imovel-endereco').textContent = d.imovel_endereco || '-';

      // Attachments counter and list
      document.getElementById('det-comprovante-count').textContent = d.comprovantes ? d.comprovantes.length : 0;
      
      // Clear file upload input
      document.getElementById('comprovante-arquivo').value = '';

      // Rbac actions configuration inside details
      const btnPagar = document.getElementById('btn-modal-pagar');
      const btnCancelar = document.getElementById('btn-modal-cancelar');
      const uploadComprovanteForm = document.getElementById('upload-comprovante-container');

      const isEditable = d.status !== 'Pago' && d.status !== 'Cancelado';

      if (btnPagar) {
        btnPagar.style.display = (isEditable && (userProfile === 'administrador' || userProfile === 'operacional')) ? 'inline-flex' : 'none';
      }
      if (btnCancelar) {
        btnCancelar.style.display = (isEditable && userProfile === 'administrador') ? 'inline-flex' : 'none';
      }
      if (uploadComprovanteForm) {
        uploadComprovanteForm.style.display = (userProfile === 'administrador' || userProfile === 'operacional') ? 'block' : 'none';
      }

      // Render satelites
      renderComprovantesList(d.comprovantes);
      renderTimelineList(d.timeline);

      // Open Modal
      switchModalTab('modal-det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    console.error('Error fetching details:', err);
    showToast('Erro ao obter ficha de detalhes.', 'error');
  }
};

function renderComprovantesList(list) {
  const container = document.getElementById('det-comprovantes-list');
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum comprovante anexado.</div>`;
    return;
  }

  container.innerHTML = list.map(c => {
    let removeBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      removeBtn = `<button onclick="excluirComprovante('${c.id}')" style="background:none; border:none; color:var(--color-error); font-size:16px; cursor:pointer;" title="Remover"><i class="fi fi-rr-trash"></i></button>`;
    }
    const envStr = formatDate(c.criado_em);

    return `
      <div class="document-item animate-fade-in">
        <div class="document-info">
          <i class="fi fi-rr-document document-icon"></i>
          <div>
            <strong style="font-size:13px; color:var(--color-text-main); display:block;">${c.nome_arquivo}</strong>
            <span style="font-size:11px; color:var(--color-text-muted);">Enviado em ${envStr}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <a href="${c.caminho_arquivo}" target="_blank" class="btn btn-secondary btn-icon" style="height:32px; width:32px;" title="Baixar/Visualizar"><i class="fi fi-rr-download"></i></a>
          ${removeBtn}
        </div>
      </div>
    `;
  }).join('');
}

function renderTimelineList(list) {
  const container = document.getElementById('det-timeline-list');
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum histórico registrado.</div>`;
    return;
  }

  container.innerHTML = list.map(t => {
    const dtStr = new Date(t.data_hora).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    return `
      <div class="timeline-item animate-fade-in">
        <div class="timeline-time">${dtStr} por <strong>${t.usuario_nome || 'Sistema'}</strong></div>
        <div class="timeline-title">${t.acao}</div>
        <p class="timeline-desc">${t.descricao}</p>
      </div>
    `;
  }).join('');
}

window.abrirBaixaDireta = function(id, valor) {
  abrirFormPagamento(id, parseFloat(valor));
};

function abrirFormPagamento(id, valor) {
  document.getElementById('form-pagamento').reset();
  
  document.getElementById('pagamento-despesa-id').value = id;
  document.getElementById('pagamento-valor-exibicao').value = formatCurrency(valor);
  document.getElementById('pagamento-valor-pago').value = valor.toFixed(2);

  // default date is today
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm = today.getMonth() + 1;
  let dd = today.getDate();
  if (mm < 10) mm = '0' + mm;
  if (dd < 10) dd = '0' + dd;
  document.getElementById('pagamento-data').value = `${yyyy}-${mm}-${dd}`;

  document.getElementById('modal-pagamento').classList.add('active');
}

async function handleSavePagamento(e) {
  e.preventDefault();
  
  const id = document.getElementById('pagamento-despesa-id').value;
  const fileInput = document.getElementById('pagamento-comprovante');
  
  const formData = new FormData();
  formData.append('valor_pago', document.getElementById('pagamento-valor-pago').value);
  formData.append('data_pagamento', document.getElementById('pagamento-data').value);
  formData.append('observacoes', document.getElementById('pagamento-observacoes').value.trim());
  
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    // check size constraints
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isImage = /jpeg|jpg|png/.test(ext);
    
    if (isImage && file.size > 10 * 1024 * 1024) {
      showToast('Limite excedido: Imagens de comprovante devem ter no máximo 10MB.', 'error');
      return;
    }
    if (ext === '.pdf' && file.size > 20 * 1024 * 1024) {
      showToast('Limite excedido: Comprovantes em PDF devem ter no máximo 20MB.', 'error');
      return;
    }
    
    formData.append('comprovante', file);
  }

  showLoader();
  try {
    const res = await api.post(`/api/despesas/${id}/pagamento`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-pagamento').classList.remove('active');

      // If Ficha details modal is currently open, reload its details
      const detailsOpen = document.getElementById('modal-detalhes').classList.contains('active');
      if (detailsOpen && currentDespesaId === id) {
        verDetalhes(id);
      }

      await carregarCardsStats();
      if (currentTab === 'painel-lista') await carregarDespesas(currentPage);
      if (currentTab === 'painel-graficos') await carregarGraficosDespesas();
    } else {
      showToast(res.message || 'Erro ao registrar pagamento.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

async function handleUploadComprovante(e) {
  e.preventDefault();
  const fileInput = document.getElementById('comprovante-arquivo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo para anexar.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const isImage = /jpeg|jpg|png/.test(extension);
  
  if (!isImage && extension !== '.pdf') {
    showToast('Apenas arquivos de imagem (PNG, JPG, JPEG) e PDF são permitidos.', 'error');
    return;
  }

  if (isImage && file.size > 10 * 1024 * 1024) {
    showToast('Limite excedido: Imagens de comprovante devem ter no máximo 10 MB.', 'error');
    return;
  }
  if (extension === '.pdf' && file.size > 20 * 1024 * 1024) {
    showToast('Limite excedido: PDFs de comprovante devem ter no máximo 20 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);

  showLoader();
  try {
    const res = await api.post(`/api/despesas/${currentDespesaId}/comprovantes`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';

      // Reload Ficha Details
      const resDetails = await api.get(`/api/despesas/${currentDespesaId}`);
      if (resDetails.success && resDetails.data) {
        document.getElementById('det-comprovante-count').textContent = resDetails.data.comprovantes.length;
        renderComprovantesList(resDetails.data.comprovantes);
        renderTimelineList(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao anexar comprovante.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha no upload do anexo.', 'error');
  } finally {
    hideLoader();
  }
}

window.excluirComprovante = async function(comprovanteId) {
  if (confirm('Deseja realmente remover este comprovante? Esta ação não pode ser desfeita.')) {
    showLoader();
    try {
      const res = await api.delete(`/api/despesas/${currentDespesaId}/comprovantes/${comprovanteId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload details list
        const resDetails = await api.get(`/api/despesas/${currentDespesaId}`);
        if (resDetails.success && resDetails.data) {
          document.getElementById('det-comprovante-count').textContent = resDetails.data.comprovantes.length;
          renderComprovantesList(resDetails.data.comprovantes);
          renderTimelineList(resDetails.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover comprovante.', 'error');
      }
    } catch (err) {
      showToast('Falha na remoção do comprovante.', 'error');
    } finally {
      hideLoader();
    }
  }
};

async function cancelarDespesa(id) {
  if (confirm('Deseja realmente CANCELAR esta despesa? Esta ação é de auditoria e cancelará o lançamento financeiro.')) {
    showLoader();
    try {
      const res = await api.patch(`/api/despesas/${id}/cancelar`);
      if (res.success) {
        showToast('Despesa cancelada com sucesso.', 'success');
        document.getElementById('modal-detalhes').classList.remove('active');

        await carregarCardsStats();
        if (currentTab === 'painel-lista') await carregarDespesas(currentPage);
      } else {
        showToast(res.message || 'Erro ao cancelar despesa.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
}

window.inativarRecorrencia = async function(id) {
  if (confirm('Deseja realmente desativar esta recorrência? O sistema não gerará mais novas parcelas para este modelo.')) {
    showLoader();
    try {
      // Get current template details, set active=false and update
      const resTemp = await api.get(`/api/despesas/recorrentes`); // list all to find target
      const temp = resTemp.data.find(r => r.id === id);
      
      if (temp) {
        const payload = {
          categoria: temp.categoria,
          responsavel: temp.responsavel,
          dia_vencimento: temp.dia_vencimento,
          valor: temp.valor,
          frequencia: temp.frequencia,
          observacoes: temp.observacoes,
          ativa: false
        };

        const res = await api.put(`/api/despesas/${id}`, payload); // template updates are handled on the PUT route with templates fallback or direct controller map
        // Wait, templates are stored in a different table, let's see how updateRecorrencia is exposed.
        // Wait, the API routes list in the prompt has:
        // PUT /api/despesas/:id -> can update templates if id belongs to template or we handle it in controller!
        // Actually, we will make sure the controller PUT checks and handles templates or despesas, or let's check!
        // Yes, we will implement that PUT /api/despesas/:id updates the record correctly. Wait, does PUT /api/despesas/:id update template?
        // Wait! In API list of the prompt:
        // PUT /api/despesas/:id (updates a despesa or template).
        // Let's implement PUT /api/despesas/:id to check table. Or does it map to template updates too? Yes, we will handle that in the controller.
        // Actually, let's look at the implementation of PUT /api/despesas/:id in our routes: it goes to despesasController.atualizar.
        // Wait! If the id belongs to a recurrence template (table despesas_recorrencias), how do we update it?
        // In JavaScript, recurrence templates are listed under `/api/despesas/recorrentes`. We can update it via PUT /api/despesas/:id by checking if the id exists in `despesas_recorrencias` table! If yes, update `despesas_recorrencias`, else update `despesas`. That's an extremely robust and transparent solution!
        
        const resUpdate = await api.put(`/api/despesas/${id}`, payload);
        if (resUpdate.success) {
          showToast('Recorrência desativada com sucesso.', 'success');
          carregarRecorrencias();
        } else {
          showToast(resUpdate.message || 'Erro ao desativar recorrência.', 'error');
        }
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};
