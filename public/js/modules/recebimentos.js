// Recebimentos Módulo JavaScript Controller (Fase 08)

let currentPage = 1;
const limit = 10;
let currentFilters = { contrato: '', status: '', imovel: '', locatario: '', competencia: '', data_inicial: '', data_final: '' };
let currentRecebimentoId = null;
let currentSaldoDevedor = 0;
let userProfile = null;
let allImoveis = [];
let allLocatarios = [];
let currentTab = 'painel-lista'; // 'painel-lista', 'painel-graficos', 'painel-inadimplencia'

// Chart.js instances to allow destruction
let previstoRecebidoChart = null;
let inadimplenciaChart = null;
let meiosPagamentoChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/recebimentos') {
    initRecebimentos();
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

async function initRecebimentos() {
  // 1. Get user profile and configure buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        // Show edit/save buttons
        const btnSaveObs = document.getElementById('btn-save-observacoes');
        if (btnSaveObs) btnSaveObs.style.display = 'inline-flex';
        
        const btnBaixa = document.getElementById('btn-modal-baixa');
        if (btnBaixa) btnBaixa.style.display = 'inline-flex';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile:', err);
  }

  // 2. Fetch data options for dropdowns
  await carregarOpcoes();

  // 3. Load initial list and stats
  await carregarRecebimentos(currentPage);
  await carregarCardsStats();

  // 4. Register Event Listeners
  setupEventListeners();
}

async function carregarOpcoes() {
  try {
    const [resImoveis, resLocatarios] = await Promise.all([
      api.get('/api/imoveis?limit=1000'), 
      api.get('/api/locatarios?limit=1000&status=ativo')
    ]);

    if (resImoveis.success && resImoveis.data) {
      allImoveis = resImoveis.data;
      const filtroImovel = document.getElementById('filtro-imovel');
      if (filtroImovel) {
        filtroImovel.innerHTML = '<option value="">Todos os Imóveis</option>' + 
          allImoveis.map(i => `<option value="${i.id}">${i.nome} (${i.codigo})</option>`).join('');
      }
    }

    if (resLocatarios.success && resLocatarios.data) {
      allLocatarios = resLocatarios.data;
      const filtroLocatario = document.getElementById('filtro-locatario');
      if (filtroLocatario) {
        filtroLocatario.innerHTML = '<option value="">Todos os Locatários</option>' + 
          allLocatarios.map(l => `<option value="${l.id}">${l.nome_razao_social} (${l.codigo})</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dropdown choices:', err);
  }
}

async function carregarCardsStats() {
  try {
    const res = await api.get('/api/recebimentos/stats');
    if (res.success && res.data) {
      const stats = res.data;
      document.getElementById('card-previsto-mes').textContent = formatCurrency(stats.receita_prevista);
      document.getElementById('card-recebido-mes').textContent = formatCurrency(stats.receita_recebida);
      document.getElementById('card-aberto-mes').textContent = formatCurrency(stats.receita_em_aberto);
      document.getElementById('card-atraso-total').textContent = formatCurrency(stats.receita_em_atraso);
      document.getElementById('card-parcelas-mes').textContent = stats.recebimentos_mes;
      document.getElementById('card-vencidas-qtd').textContent = stats.recebimentos_vencidos;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function carregarRecebimentos(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/recebimentos?${query}`);
    const tbody = document.getElementById('recebimentos-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px;">Nenhum recebimento encontrado.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(r => {
      const compVal = r.competencia ? formatDate(r.competencia).substring(3) : '-'; // MM/YYYY
      const vencVal = formatDate(r.vencimento);
      const prevVal = formatCurrency(r.valor_previsto);
      const recVal = formatCurrency(r.valor_recebido || 0);
      const saldo = parseFloat(r.valor_previsto) - parseFloat(r.valor_recebido || 0);
      const saldoVal = formatCurrency(saldo);

      let badgeClass = 'badge-a-vencer';
      if (r.status === 'Pago') badgeClass = 'badge-pago';
      if (r.status === 'Parcial') badgeClass = 'badge-parcial';
      if (r.status === 'Vencido') badgeClass = 'badge-vencido';
      if (r.status === 'Cancelado') badgeClass = 'badge-cancelado';

      let actions = `<button onclick="verDetalhes('${r.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha Detalhada"><i class="fi fi-rr-eye"></i> Ficha</button>`;
      
      if ((userProfile === 'administrador' || userProfile === 'operacional') && r.status !== 'Pago' && r.status !== 'Cancelado') {
        actions += `<button onclick="abrirBaixaDireta('${r.id}', ${saldo})" class="btn btn-primary btn-icon" style="margin-left: 6px;" title="Baixar Pagamento"><i class="fi fi-rr-money-bill-wave"></i> Baixa</button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${compVal}</strong></td>
          <td><strong>${r.numero_contrato}</strong></td>
          <td>${r.imovel_nome || 'Nenhum'}</td>
          <td>${r.locatario_nome || 'Nenhum'}</td>
          <td>${vencVal}</td>
          <td>${prevVal}</td>
          <td>${recVal}</td>
          <td><strong style="color: ${saldo > 0 ? 'var(--color-error)' : 'var(--color-success)'};">${saldoVal}</strong></td>
          <td><span class="badge ${badgeClass}">${r.status}</span></td>
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
    console.error('Error loading receivables:', err);
    showToast('Erro ao obter recebimentos.', 'error');
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

async function carregarInadimplencias() {
  showLoader();
  try {
    const res = await api.get('/api/recebimentos/inadimplencia');
    const tbody = document.getElementById('inadimplencia-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px;">Nenhuma inadimplência encontrada (nenhuma parcela vencida).</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(r => {
      const vencVal = formatDate(r.vencimento);
      const prevVal = formatCurrency(r.valor_previsto);
      const recVal = formatCurrency(r.valor_recebido || 0);
      const saldoVal = formatCurrency(r.saldo_devedor);
      const multaVal = formatCurrency(r.multa_informativa);
      const jurosVal = formatCurrency(r.juros_informativo);

      let actions = `<button onclick="verDetalhes('${r.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha Detalhada"><i class="fi fi-rr-eye"></i> Ficha</button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="abrirBaixaDireta('${r.id}', ${r.saldo_devedor})" class="btn btn-primary btn-icon" style="margin-left: 6px;" title="Baixar Pagamento"><i class="fi fi-rr-money-bill-wave"></i> Baixa</button>`;
      }

      return `
        <tr class="animate-fade-in" style="background-color: var(--color-error-light-hover);">
          <td><strong>${r.numero_contrato}</strong></td>
          <td>${r.imovel_nome || '-'}</td>
          <td>${r.locatario_nome || '-'}</td>
          <td>${vencVal}</td>
          <td><span style="color:var(--color-error); font-weight:700;">${r.dias_atraso} dias</span></td>
          <td>${prevVal}</td>
          <td>${recVal}</td>
          <td><strong style="color:var(--color-error);">${saldoVal}</strong></td>
          <td>${multaVal}</td>
          <td>${jurosVal}</td>
          <td style="text-align: right; padding-right: 24px;">
            <div class="action-btn-group">${actions}</div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading inadimplencias:', err);
    showToast('Erro ao obter inadimplências.', 'error');
  } finally {
    hideLoader();
  }
}

async function carregarGraficosFluxo() {
  showLoader();
  try {
    const res = await api.get('/api/recebimentos/fluxo-caixa');
    if (!res.success || !res.data) {
      showToast('Erro ao obter dados para gráficos.', 'error');
      return;
    }

    const { forecast, inadimplencia, paymentMethods } = res.data;

    renderPrevistoRecebidoChart(forecast);
    renderInadimplenciaChart(inadimplencia);
    renderMeiosPagamentoChart(paymentMethods);
  } catch (err) {
    console.error('Error loading flow charts:', err);
    showToast('Erro de conexão ao gerar gráficos.', 'error');
  } finally {
    hideLoader();
  }
}

function renderPrevistoRecebidoChart(data) {
  const ctx = document.getElementById('chart-previsto-recebido').getContext('2d');
  
  if (previstoRecebidoChart) {
    previstoRecebidoChart.destroy();
  }

  // Use CSS variables for colors if they exist, or clean tailored colors
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#001731';
  const successColor = getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim() || '#478C27';

  previstoRecebidoChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Receita Prevista',
          data: data.previstos,
          backgroundColor: primaryColor + 'cc', // opacity
          borderColor: primaryColor,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Receita Recebida',
          data: data.recebidos,
          backgroundColor: successColor + 'cc',
          borderColor: successColor,
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              label += formatCurrency(context.parsed.y);
              return label;
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

function renderInadimplenciaChart(data) {
  const ctx = document.getElementById('chart-inadimplencia-historico').getContext('2d');
  
  if (inadimplenciaChart) {
    inadimplenciaChart.destroy();
  }

  const errorColor = getComputedStyle(document.documentElement).getPropertyValue('--color-error').trim() || '#DC2626';

  inadimplenciaChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Valor Inadimplente',
          data: data.valores,
          borderColor: errorColor,
          backgroundColor: errorColor + '1a', // very light fill
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: errorColor,
          pointBorderWidth: 2
        }
      ]
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
              return 'Inadimplência: ' + formatCurrency(context.parsed.y);
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

function renderMeiosPagamentoChart(data) {
  const ctx = document.getElementById('chart-meios-pagamento').getContext('2d');
  
  if (meiosPagamentoChart) {
    meiosPagamentoChart.destroy();
  }

  // Predefined harmonious color scheme
  const colors = [
    '#001731', // primary
    '#478C27', // success
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#6B7280'  // Gray
  ];

  meiosPagamentoChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [
        {
          data: data.valores,
          backgroundColor: colors.slice(0, data.labels.length),
          borderWidth: 1
        }
      ]
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
  document.getElementById('tab-btn-inadimplencia').addEventListener('click', (e) => {
    switchMainTab('painel-inadimplencia', e.currentTarget);
  });

  // Filters
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    currentFilters.contrato = document.getElementById('filtro-contrato').value.trim();
    currentFilters.imovel = document.getElementById('filtro-imovel').value;
    currentFilters.locatario = document.getElementById('filtro-locatario').value;
    currentFilters.status = document.getElementById('filtro-status').value;
    currentFilters.competencia = document.getElementById('filtro-competencia').value;
    currentFilters.data_inicial = document.getElementById('filtro-data-inicio').value;
    currentFilters.data_final = document.getElementById('filtro-data-fim').value;
    currentPage = 1;
    carregarRecebimentos(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-contrato').value = '';
    document.getElementById('filtro-imovel').value = '';
    document.getElementById('filtro-locatario').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-competencia').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    currentFilters = { contrato: '', status: '', imovel: '', locatario: '', competencia: '', data_inicial: '', data_final: '' };
    currentPage = 1;
    carregarRecebimentos(currentPage);
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      carregarRecebimentos(currentPage);
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    carregarRecebimentos(currentPage);
  });

  // Context-based Exports (PDF/CSV)
  document.getElementById('btn-exportar-csv').addEventListener('click', () => {
    let tipo = 'periodo';
    let queryParams = new URLSearchParams(currentFilters);

    if (currentTab === 'painel-graficos') {
      tipo = 'fluxo-caixa';
    } else if (currentTab === 'painel-inadimplencia') {
      tipo = 'inadimplencia';
    } else {
      // Look at selected filters to decide previstas vs recebidas vs general
      if (currentFilters.status === 'A Vencer') {
        tipo = 'prevista';
      } else if (currentFilters.status === 'Pago' || currentFilters.status === 'Parcial') {
        tipo = 'recebida';
      }
    }

    queryParams.set('tipo', tipo);
    window.location.href = `/api/recebimentos/exportar/excel?${queryParams.toString()}`;
  });

  document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
    let tipo = 'periodo';
    let queryParams = new URLSearchParams(currentFilters);

    if (currentTab === 'painel-graficos') {
      tipo = 'fluxo-caixa';
    } else if (currentTab === 'painel-inadimplencia') {
      tipo = 'inadimplencia';
    } else {
      if (currentFilters.status === 'A Vencer') {
        tipo = 'prevista';
      } else if (currentFilters.status === 'Pago' || currentFilters.status === 'Parcial') {
        tipo = 'recebida';
      }
    }

    queryParams.set('tipo', tipo);
    window.open(`/api/recebimentos/exportar/pdf?${queryParams.toString()}`, '_blank');
  });

  // Modal Detalhes: subtabs toggle
  document.querySelectorAll('#modal-detalhes .modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchModalTab(e.currentTarget.getAttribute('data-tab'));
    });
  });

  // Close Modals
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

  // Observations Submit Edit
  document.getElementById('form-edit-observacoes').addEventListener('submit', handleSaveObservacoes);

  // Pagamento Submit
  document.getElementById('form-pagamento').addEventListener('submit', handleSavePagamento);

  // Trigger modal checkout form
  document.getElementById('btn-modal-baixa').addEventListener('click', () => {
    abrirFormPagamento(currentRecebimentoId, currentSaldoDevedor);
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
    carregarRecebimentos(currentPage);
  } else if (tabId === 'painel-graficos') {
    carregarGraficosFluxo();
  } else if (tabId === 'painel-inadimplencia') {
    carregarInadimplencias();
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

window.verDetalhes = async function(id) {
  try {
    const res = await api.get(`/api/recebimentos/${id}`);
    if (res.success && res.data) {
      const r = res.data;
      currentRecebimentoId = r.id;
      currentSaldoDevedor = r.saldo_devedor;

      // Header
      const compStr = r.competencia ? formatDate(r.competencia).substring(3) : '--/----';
      document.getElementById('detalhe-header-title').textContent = `Parcela - Competência ${compStr}`;
      
      const badgeStatus = document.getElementById('detalhe-status-badge');
      badgeStatus.textContent = r.status;
      badgeStatus.className = `badge badge-${r.status.toLowerCase().replace(' ', '-')}`;

      // General Data Tab
      document.getElementById('det-contrato-numero').textContent = r.numero_contrato;
      document.getElementById('det-data-vencimento').textContent = formatDate(r.vencimento);
      document.getElementById('det-competencia').textContent = compStr;
      document.getElementById('det-valor-previsto').textContent = formatCurrency(r.valor_previsto);
      document.getElementById('det-valor-recebido').textContent = formatCurrency(r.valor_recebido || 0);
      document.getElementById('det-saldo-devedor').textContent = formatCurrency(r.saldo_devedor);

      // Overdue section
      const overdueBox = document.getElementById('det-overdue-box');
      if (r.status === 'Vencido' && r.saldo_devedor > 0) {
        document.getElementById('det-dias-atraso').textContent = `${r.dias_atraso} dias`;
        document.getElementById('det-multa-informativa').textContent = formatCurrency(r.multa_informativa);
        document.getElementById('det-juros-informativo').textContent = formatCurrency(r.juros_informativo);
        overdueBox.style.display = 'block';
      } else {
        overdueBox.style.display = 'none';
      }

      // Locatário and Imóvel details
      document.getElementById('det-locatario-nome').textContent = r.locatario_nome || '-';
      document.getElementById('det-locatario-documento').textContent = r.locatario_cpf_cnpj ? `Documento: ${r.locatario_cpf_cnpj}` : '-';
      document.getElementById('det-imovel-nome').textContent = r.imovel_nome || '-';
      document.getElementById('det-imovel-endereco').textContent = r.imovel_endereco || '-';

      // Observations text
      document.getElementById('det-observacoes-input').value = r.observacoes || '';

      // Action button "Efetuar Baixa"
      const btnBaixa = document.getElementById('btn-modal-baixa');
      if (btnBaixa) {
        const canBaixar = (userProfile === 'administrador' || userProfile === 'operacional') && 
                          r.status !== 'Pago' && r.status !== 'Cancelado';
        btnBaixa.style.display = canBaixar ? 'inline-flex' : 'none';
      }

      // Render satelites
      renderPagamentosList(r.pagamentos);
      renderTimelineList(r.timeline);

      // Open Modal
      switchModalTab('modal-det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    console.error('Error fetching details:', err);
    showToast('Erro ao obter detalhes do recebimento.', 'error');
  }
};

function renderPagamentosList(pagamentos) {
  const tbody = document.getElementById('det-pagamentos-list-body');
  if (!pagamentos || pagamentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhum pagamento registrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = pagamentos.map(p => {
    const dataPg = formatDate(p.data_pagamento);
    const valorPg = formatCurrency(p.valor);
    const operador = p.usuario_nome || 'Sistema';
    const obs = p.observacoes || '-';
    
    let statusBadge = '<span class="badge badge-pago">Ativo</span>';
    let actionBtn = '';

    if (p.estornado) {
      statusBadge = `<span class="badge badge-cancelado" title="Estornado em ${formatDate(p.data_estorno)}">Estornado</span>`;
    } else {
      if (userProfile === 'administrador') {
        actionBtn = `<button onclick="estornarLançamento('${p.id}', ${p.valor})" class="btn btn-secondary btn-icon" style="color:var(--color-error); border-color:var(--color-error-light);" title="Estornar Lançamento"><i class="fi fi-rr-ban"></i> Estornar</button>`;
      }
    }

    return `
      <tr style="${p.estornado ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
        <td>${dataPg}</td>
        <td><strong>${valorPg}</strong></td>
        <td>${p.forma_pagamento}</td>
        <td>${operador}</td>
        <td>${obs}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right; padding-right:12px;">${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function renderTimelineList(timeline) {
  const container = document.getElementById('det-timeline-list');
  if (!timeline || timeline.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum histórico estrutural.</div>`;
    return;
  }

  container.innerHTML = timeline.map(t => {
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

async function handleSaveObservacoes(e) {
  e.preventDefault();
  const obs = document.getElementById('det-observacoes-input').value.trim();

  showLoader();
  try {
    const res = await api.put(`/api/recebimentos/${currentRecebimentoId}`, { observacoes: obs });
    if (res.success) {
      showToast('Observações salvas com sucesso.', 'success');
      // Reload lists in background
      if (currentTab === 'painel-lista') carregarRecebimentos(currentPage);
      if (currentTab === 'painel-inadimplencia') carregarInadimplencias();
    } else {
      showToast(res.message || 'Erro ao atualizar observações.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

window.abrirBaixaDireta = function(id, saldo) {
  abrirFormPagamento(id, parseFloat(saldo));
};

function abrirFormPagamento(id, saldo) {
  document.getElementById('form-pagamento').reset();
  
  document.getElementById('pagamento-recebimento-id').value = id;
  document.getElementById('pagamento-saldo-exibicao').value = formatCurrency(saldo);
  document.getElementById('pagamento-valor').value = saldo.toFixed(2);
  document.getElementById('pagamento-valor').max = (saldo + 0.001).toFixed(2); // allow tiny float tolerance

  // default date is today in local timezone format yyyy-MM-dd
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
  
  const id = document.getElementById('pagamento-recebimento-id').value;
  const payload = {
    valor_recebido: document.getElementById('pagamento-valor').value,
    data_pagamento: document.getElementById('pagamento-data').value,
    forma_pagamento: document.getElementById('pagamento-forma').value,
    observacoes: document.getElementById('pagamento-observacoes').value.trim()
  };

  showLoader();
  try {
    const res = await api.post(`/api/recebimentos/${id}/pagamento`, payload);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-pagamento').classList.remove('active');

      // If Ficha modal is currently open, reload its values
      const detailsOpen = document.getElementById('modal-detalhes').classList.contains('active');
      if (detailsOpen && currentRecebimentoId === id) {
        verDetalhes(id);
      }

      // Reload tabs/stats
      await carregarCardsStats();
      if (currentTab === 'painel-lista') await carregarRecebimentos(currentPage);
      if (currentTab === 'painel-graficos') await carregarGraficosFluxo();
      if (currentTab === 'painel-inadimplencia') await carregarInadimplencias();
    } else {
      showToast(res.message || 'Erro ao registrar pagamento.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

window.estornarLançamento = async function(pagamentoId, valor) {
  if (confirm(`Deseja realmente ESTORNAR o lançamento de pagamento no valor de ${formatCurrency(valor)}?\nEsta ação irá reverter o saldo em aberto e auditar o histórico de eventos.`)) {
    showLoader();
    try {
      const res = await api.post(`/api/recebimentos/${currentRecebimentoId}/estorno`, { pagamento_id: pagamentoId });
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload details modal
        verDetalhes(currentRecebimentoId);

        // Reload views/stats
        await carregarCardsStats();
        if (currentTab === 'painel-lista') await carregarRecebimentos(currentPage);
        if (currentTab === 'painel-graficos') await carregarGraficosFluxo();
        if (currentTab === 'painel-inadimplencia') await carregarInadimplencias();
      } else {
        showToast(res.message || 'Erro ao processar estorno.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão ao realizar estorno.', 'error');
    } finally {
      hideLoader();
    }
  }
};
