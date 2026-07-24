// Manutenções Módulo JavaScript Controller (Fase 10)

let currentPage = 1;
let limit = 10;
let currentFilters = { status: '', imovel: '', tipo: '', data_inicial: '', data_final: '', busca: '' };
let currentManutencaoId = null;
let userProfile = null;
let allImoveis = [];
let currentTab = 'painel-lista'; // 'painel-lista', 'painel-graficos'

// Chart.js instances to prevent duplication warnings
let tiposChart = null;
let custosMesesChart = null;
let statusPieChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/manutencoes') {
    initManutencoes();
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

async function initManutencoes() {
  // 1. Get user profile and configure buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        const btnNew = document.getElementById('btn-nova-manutencao');
        if (btnNew) btnNew.style.display = 'inline-flex';
        
        const uploadForm = document.getElementById('anexo-upload-container');
        if (uploadForm) uploadForm.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile:', err);
  }

  // 2. Fetch options
  await carregarOpcoes();

  // 3. Load initial list and stats
  await carregarManutencoes(currentPage);
  await carregarCardsStats();

  // 4. Register Event Listeners
  setupEventListeners();

  // 5. Check hash for direct detailed view (Global Search redirect)
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const directId = hash.substring(1);
    verDetalhes(directId);
  }
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
    const res = await api.get('/api/manutencoes/stats');
    if (res.success && res.data) {
      const stats = res.data;
      document.getElementById('card-total-manutencoes').textContent = stats.total_manutencoes;
      document.getElementById('card-planejadas').textContent = stats.planejadas;
      document.getElementById('card-em-andamento').textContent = stats.em_andamento;
      document.getElementById('card-concluidas').textContent = stats.concluidas;
      document.getElementById('card-custo-total').textContent = formatCurrency(stats.valor_real);
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function carregarManutencoes(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/manutencoes?${query}`);
    const tbody = document.getElementById('manutencoes-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">Nenhuma manutenção encontrada.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(m => {
      const prevVal = formatDate(m.data_prevista);
      const valPrev = formatCurrency(m.valor_previsto);

      let badgeClass = 'badge-planejada';
      if (m.status === 'Em Andamento') badgeClass = 'badge-em-andamento';
      if (m.status === 'Concluída') badgeClass = 'badge-concluida';
      if (m.status === 'Cancelada') badgeClass = 'badge-cancelada';

      let actions = `<button onclick="verDetalhes('${m.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i> Ficha</button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        if (m.status !== 'Concluída' && m.status !== 'Cancelada') {
          actions += `<button onclick="editarManutencao('${m.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i> Editar</button>`;
          actions += `<button onclick="abrirConclusao('${m.id}', ${m.valor_previsto})" class="btn btn-primary btn-icon" style="margin-left: 6px;" title="Concluir"><i class="fi fi-rr-checkbox"></i> Concluir</button>`;
        }
      }
      
      if (userProfile === 'administrador') {
        if (m.status !== 'Concluída' && m.status !== 'Cancelada') {
          actions += `<button onclick="cancelarManutencao('${m.id}', '${m.codigo}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Cancelar"><i class="fi fi-rr-ban"></i> Cancelar</button>`;
        }
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${m.codigo}</strong></td>
          <td>${m.imovel_nome || 'Nenhum'}</td>
          <td><strong>${m.tipo}</strong></td>
          <td>${m.titulo}</td>
          <td>${m.responsavel}</td>
          <td>${prevVal}</td>
          <td>${valPrev}</td>
          <td><span class="badge ${badgeClass}">${m.status}</span></td>
          <td style="text-align: right; padding-right: 24px;">
            <div class="action-btn-group">${actions}</div>
          </td>
        </tr>
      `;
    }).join('');

    // Render pagination dynamically
    const footerElement = document.querySelector('.table-footer');
    window.renderPagination({
      footerElement: footerElement,
      pagination: {
        total: res.pagination.total,
        page: page,
        limit: limit,
        pages: res.pagination.pages
      },
      onPageChange: (newPage) => {
        currentPage = newPage;
        carregarManutencoes(currentPage);
      },
      onLimitChange: (newLimit) => {
        limit = newLimit;
        currentPage = 1;
        carregarManutencoes(currentPage);
      }
    });
  } catch (err) {
    console.error('Error loading maintenance:', err);
    showToast('Erro ao obter manutenções.', 'error');
  } finally {
    hideLoader();
  }
}

async function carregarGraficosManutencoes() {
  showLoader();
  try {
    const res = await api.get('/api/manutencoes/graficos');
    if (!res.success || !res.data) {
      showToast('Erro ao obter dados analíticos.', 'error');
      return;
    }

    const { tipos, meses, status } = res.data;

    renderTiposChart(tipos);
    renderMesesChart(meses);
    renderStatusChart(status);
  } catch (err) {
    console.error('Error loading charts:', err);
    showToast('Erro ao gerar gráficos.', 'error');
  } finally {
    hideLoader();
  }
}

function renderTiposChart(tipos) {
  if (tiposChart) tiposChart.destroy();
  const ctx = document.getElementById('chart-tipos').getContext('2d');
  tiposChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tipos.labels,
      datasets: [{
        data: tipos.valores,
        backgroundColor: ['#0F52BA', '#478C27', '#DC2626', '#F59E0B', '#6366F1'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'var(--color-text-main)' }
        }
      }
    }
  });
}

function renderMesesChart(meses) {
  if (custosMesesChart) custosMesesChart.destroy();
  const ctx = document.getElementById('chart-custos-meses').getContext('2d');
  custosMesesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses.labels,
      datasets: [{
        label: 'Custo Total Concluído',
        data: meses.valores,
        backgroundColor: 'rgba(15, 82, 186, 0.7)',
        borderColor: '#0F52BA',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: 'var(--color-text-muted)' }, grid: { display: false } },
        y: { ticks: { color: 'var(--color-text-muted)' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderStatusChart(status) {
  if (statusPieChart) statusPieChart.destroy();
  const ctx = document.getElementById('chart-status-pie').getContext('2d');
  statusPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: status.labels,
      datasets: [{
        data: status.valores,
        backgroundColor: ['#F59E0B', '#10B981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: 'var(--color-text-main)' }
        }
      }
    }
  });
}

function setupEventListeners() {
  // Tabs switching
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchMainTab(target);
    });
  });

  // Filter Actions
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    currentFilters.imovel = document.getElementById('filtro-imovel').value;
    currentFilters.tipo = document.getElementById('filtro-tipo').value;
    currentFilters.status = document.getElementById('filtro-status').value;
    currentFilters.busca = document.getElementById('filtro-busca').value.trim();
    currentFilters.data_inicial = document.getElementById('filtro-data-inicial').value;
    currentFilters.data_final = document.getElementById('filtro-data-final').value;
    currentPage = 1;
    carregarManutencoes(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-imovel').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-data-inicial').value = '';
    document.getElementById('filtro-data-final').value = '';
    
    currentFilters = { status: '', imovel: '', tipo: '', data_inicial: '', data_final: '', busca: '' };
    currentPage = 1;
    carregarManutencoes(currentPage);
  });

  // Export actions
  document.getElementById('btn-exportar-csv').addEventListener('click', () => {
    const reportType = document.getElementById('filtro-tipo-relatorio').value;
    const query = new URLSearchParams({
      tipo: reportType,
      ...currentFilters
    }).toString();
    window.location.href = `/api/manutencoes/exportar/excel?${query}`;
  });

  document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
    const reportType = document.getElementById('filtro-tipo-relatorio').value;
    const query = new URLSearchParams({
      tipo: reportType,
      ...currentFilters
    }).toString();
    window.open(`/api/manutencoes/exportar/pdf?${query}`, '_blank');
  });

  // Creation modal toggles
  const modalForm = document.getElementById('modal-manutencao');
  const btnNew = document.getElementById('btn-nova-manutencao');

  if (btnNew) {
    btnNew.addEventListener('click', () => {
      document.getElementById('form-manutencao').reset();
      document.getElementById('manutencao-id').value = '';
      document.getElementById('manutencao-codigo').value = '';
      document.getElementById('modal-title').textContent = 'Nova Manutenção';
      
      // Default solicitacao date to today
      document.getElementById('data_solicitacao').value = new Date().toISOString().split('T')[0];
      
      // Reset form lock values
      document.getElementById('imovel_id').disabled = false;
      document.getElementById('status').innerHTML = `
        <option value="Planejada">Planejada</option>
        <option value="Em Andamento">Em Andamento</option>
      `;

      goToStep(1);
      modalForm.classList.add('active');
    });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => modalForm.classList.remove('active'));

  // Wizard navigation buttons for Manutenção
  document.getElementById('wizard-btn-prev').addEventListener('click', () => {
    if (currentStep === 1) {
      document.getElementById('modal-manutencao').classList.remove('active');
    } else {
      goToStep(currentStep - 1);
    }
  });

  document.getElementById('wizard-btn-next').addEventListener('click', () => {
    if (currentStep < 4) {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      }
    }
  });

  // Intercept form submit or click next for Manutenção
  document.getElementById('form-manutencao').addEventListener('submit', (e) => {
    e.preventDefault();
    if (currentStep < 4) {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      }
    } else {
      handleSaveManutencao(e);
    }
  });

  // Wizard sidebar steps navigation click for Manutenção
  document.querySelectorAll('#modal-manutencao .wizard-step').forEach(stepEl => {
    stepEl.addEventListener('click', () => {
      const target = parseInt(stepEl.getAttribute('data-step-target'));
      if (target === currentStep) return;
      
      if (target > currentStep) {
        // Validate intermediate steps
        let tempStep = currentStep;
        while (tempStep < target) {
          if (!validateStep(tempStep)) return;
          tempStep++;
        }
      }
      
      goToStep(target);
    });
  });

  // Conclusion modal toggles
  const modalConcluir = document.getElementById('modal-concluir');
  document.getElementById('btn-close-concluir').addEventListener('click', () => modalConcluir.classList.remove('active'));
  document.getElementById('btn-cancelar-concluir').addEventListener('click', () => modalConcluir.classList.remove('active'));
  document.getElementById('form-concluir').addEventListener('submit', handleConcluirManutencao);

  // Ficha / Details Modal toggles
  const modalDet = document.getElementById('modal-detalhes');
  document.getElementById('btn-close-detalhes').addEventListener('click', () => modalDet.classList.remove('active'));
  document.getElementById('btn-fechar-detalhes').addEventListener('click', () => modalDet.classList.remove('active'));

  // Tab switching inside detailed Ficha
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchDetailTab(target);
    });
  });

  // Attachment upload form submit
  document.getElementById('form-upload-anexo').addEventListener('submit', handleUploadAnexo);

  // Wizard attachment upload button
  const btnWizardUploadAnexo = document.getElementById('btn-manut-wizard-upload');
  if (btnWizardUploadAnexo) {
    btnWizardUploadAnexo.addEventListener('click', handleWizardUploadAnexo);
  }
}

function switchMainTab(target) {
  currentTab = target;
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === target);
  });
  
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === target);
  });

  if (target === 'painel-graficos') {
    carregarGraficosManutencoes();
  }
}

function switchDetailTab(target) {
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === target);
  });

  document.querySelectorAll('.modal-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === `tab-${target}`);
  });
}

// Creation / Edit handler
async function handleSaveManutencao(e) {
  e.preventDefault();
  const id = document.getElementById('manutencao-id').value;
  const isEdit = !!id;

  const data = {
    imovel_id: document.getElementById('imovel_id').value,
    tipo: document.getElementById('tipo').value,
    titulo: document.getElementById('titulo').value.trim(),
    descricao: document.getElementById('descricao').value.trim(),
    data_solicitacao: document.getElementById('data_solicitacao').value,
    data_prevista: document.getElementById('data_prevista').value || null,
    data_inicio: document.getElementById('data_inicio').value || null,
    responsavel: document.getElementById('responsavel').value.trim(),
    valor_previsto: parseFloat(document.getElementById('valor_previsto').value) || 0,
    status: document.getElementById('status').value,
    fornecedor_nome: document.getElementById('fornecedor_nome').value.trim() || null,
    fornecedor_telefone: document.getElementById('fornecedor_telefone').value.trim() || null,
    fornecedor_email: document.getElementById('fornecedor_email').value.trim() || null,
    fornecedor_observacoes: document.getElementById('fornecedor_observacoes').value.trim() || null
  };

  showLoader();
  try {
    let res;
    if (isEdit) {
      res = await api.put(`/api/manutencoes/${id}`, data);
    } else {
      res = await api.post('/api/manutencoes', data);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-manutencao').classList.remove('active');
      carregarManutencoes(currentPage);
      carregarCardsStats();
      if (currentTab === 'painel-graficos') carregarGraficosManutencoes();
    } else {
      showToast(res.message || 'Erro ao processar requisição.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de rede.', 'error');
  } finally {
    hideLoader();
  }
}

// Edit details populate
window.editarManutencao = async function(id) {
  try {
    const res = await api.get(`/api/manutencoes/${id}`);
    if (res.success && res.data) {
      const m = res.data;
      
      document.getElementById('manutencao-id').value = m.id;
      document.getElementById('manutencao-codigo').value = m.codigo;
      document.getElementById('imovel_id').value = m.imovel_id;
      document.getElementById('imovel_id').disabled = true; // Lock property modification

      document.getElementById('tipo').value = m.tipo;
      document.getElementById('titulo').value = m.titulo;
      document.getElementById('descricao').value = m.descricao;
      
      document.getElementById('data_solicitacao').value = m.data_solicitacao ? m.data_solicitacao.split('T')[0] : '';
      document.getElementById('data_prevista').value = m.data_prevista ? m.data_prevista.split('T')[0] : '';
      document.getElementById('data_inicio').value = m.data_inicio ? m.data_inicio.split('T')[0] : '';
      
      document.getElementById('responsavel').value = m.responsavel;
      document.getElementById('valor_previsto').value = m.valor_previsto;
      
      // Populate fornecedor
      document.getElementById('fornecedor_nome').value = m.fornecedor_nome || '';
      document.getElementById('fornecedor_telefone').value = m.fornecedor_telefone || '';
      document.getElementById('fornecedor_email').value = m.fornecedor_email || '';
      document.getElementById('fornecedor_observacoes').value = m.fornecedor_observacoes || '';

      const statusSelect = document.getElementById('status');
      statusSelect.innerHTML = `
        <option value="Planejada">Planejada</option>
        <option value="Em Andamento">Em Andamento</option>
        <option value="Concluída">Concluída</option>
        <option value="Cancelada" disabled>Cancelada (Use o botão cancelar)</option>
      `;
      statusSelect.value = m.status;

      document.getElementById('modal-title').textContent = `Editar Manutenção - ${m.codigo}`;
      currentManutencaoId = m.id;
      renderWizardAnexos(m.anexos || []);
      goToStep(1);
      document.getElementById('modal-manutencao').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar dados da manutenção.', 'error');
  }
};

// Cancel maintenance trigger
window.cancelarManutencao = async function(id, codigo) {
  const confirmar = await confirmarAcao('Cancelar Manutenção', `Deseja realmente CANCELAR a manutenção "${codigo}"?\nEsta ação registrará um log permanente e atualizará o status para Cancelada.`, 'Cancelar', 'Voltar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.patch(`/api/manutencoes/${id}/cancelar`);
      if (res.success) {
        showToast('Manutenção cancelada com sucesso.', 'success');
        carregarManutencoes(currentPage);
        carregarCardsStats();
        if (currentTab === 'painel-graficos') carregarGraficosManutencoes();
      } else {
        showToast(res.message || 'Erro ao cancelar.', 'error');
      }
    } catch (err) {
      showToast('Erro de rede.', 'error');
    } finally {
      hideLoader();
    }
  }
};

// Open conclusion modal
window.abrirConclusao = function(id, valorPrevisto) {
  document.getElementById('form-concluir').reset();
  document.getElementById('concluir-id').value = id;
  document.getElementById('data_conclusao').value = new Date().toISOString().split('T')[0];
  document.getElementById('valor_real').value = valorPrevisto; // Autofill with estimated budget
  document.getElementById('modal-concluir').classList.add('active');
};

// Handle conclusion submit
async function handleConcluirManutencao(e) {
  e.preventDefault();
  const id = document.getElementById('concluir-id').value;

  const data = {
    data_conclusao: document.getElementById('data_conclusao').value,
    valor_real: parseFloat(document.getElementById('valor_real').value) || 0,
    observacoes: document.getElementById('observacoes').value.trim()
  };

  showLoader();
  try {
    const res = await api.patch(`/api/manutencoes/${id}/concluir`, data);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-concluir').classList.remove('active');
      carregarManutencoes(currentPage);
      carregarCardsStats();
      if (currentTab === 'painel-graficos') carregarGraficosManutencoes();
    } else {
      showToast(res.message || 'Erro ao concluir.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de rede.', 'error');
  } finally {
    hideLoader();
  }
}

// Detailed Ficha modal
window.verDetalhes = async function(id) {
  try {
    const res = await api.get(`/api/manutencoes/${id}`);
    if (res.success && res.data) {
      const m = res.data;
      currentManutencaoId = m.id;

      // Update Header info
      document.getElementById('detalhes-header-codigo').textContent = m.codigo;
      document.getElementById('detalhes-header-titulo').textContent = m.titulo;

      const badgeStatus = document.getElementById('detalhes-badge-status');
      badgeStatus.textContent = m.status;
      
      let badgeClass = 'badge-planejada';
      if (m.status === 'Em Andamento') badgeClass = 'badge-em-andamento';
      if (m.status === 'Concluída') badgeClass = 'badge-concluida';
      if (m.status === 'Cancelada') badgeClass = 'badge-cancelada';
      badgeStatus.className = `badge ${badgeClass}`;

      // Tab: Dados Gerais
      document.getElementById('det-imovel').textContent = `${m.imovel_nome} (${m.imovel_codigo})`;
      document.getElementById('det-tipo').textContent = m.tipo;
      document.getElementById('det-responsavel').textContent = m.responsavel;
      document.getElementById('det-descricao').textContent = m.descricao;

      document.getElementById('det-data-solic').textContent = formatDate(m.data_solicitacao);
      document.getElementById('det-data-prev').textContent = formatDate(m.data_prevista);
      document.getElementById('det-data-inicio').textContent = formatDate(m.data_inicio);
      document.getElementById('det-data-concl').textContent = formatDate(m.data_conclusao);

      document.getElementById('det-valor-prev').textContent = formatCurrency(m.valor_previsto);
      document.getElementById('det-valor-real').textContent = formatCurrency(m.valor_real);
      
      const vReal = parseFloat(m.valor_real) || 0;
      const vPrev = parseFloat(m.valor_previsto) || 0;
      const diff = vReal - vPrev;
      const detDiff = document.getElementById('det-diferenca');
      if (diff === 0) {
        detDiff.textContent = 'Sem divergência';
        detDiff.style.color = 'var(--color-text-main)';
      } else if (diff > 0) {
        detDiff.textContent = `+ ${formatCurrency(diff)} (Acima do Orçado)`;
        detDiff.style.color = 'var(--color-error)';
      } else {
        detDiff.textContent = `- ${formatCurrency(Math.abs(diff))} (Abaixo do Orçado)`;
        detDiff.style.color = 'var(--color-success)';
      }

      document.getElementById('det-forn-nome').textContent = m.fornecedor_nome || 'Nenhum cadastrado';
      document.getElementById('det-forn-tel').textContent = m.fornecedor_telefone || 'Nenhum';
      document.getElementById('det-forn-email').textContent = m.fornecedor_email || 'Nenhum';
      document.getElementById('det-forn-obs').textContent = m.fornecedor_observacoes || 'Nenhuma observação de fornecedor.';
      document.getElementById('det-observacoes').textContent = m.observacoes || 'Nenhuma observação de fechamento registrada.';

      // Tab: Anexos
      document.getElementById('det-anexo-count').textContent = m.anexos ? m.anexos.length : 0;
      renderAnexos(m.anexos);

      // Tab: Timeline
      renderTimeline(m.timeline);

      // Select default tab and open
      switchDetailTab('det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    console.error('Error fetching details:', err);
    showToast('Erro ao obter dados detalhados da manutenção.', 'error');
  }
};

function renderAnexos(anexos) {
  const container = document.getElementById('det-anexos-list');
  if (!anexos || anexos.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum anexo encontrado.</div>`;
    return;
  }

  container.innerHTML = anexos.map(a => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button onclick="removerAnexo('${a.id}')" style="background:none; border:none; color:var(--color-error); font-size:16px; cursor:pointer;" title="Remover Anexo"><i class="fi fi-rr-trash"></i></button>`;
    }

    const dateVal = formatDate(a.criado_em);

    return `
      <div class="document-item animate-fade-in">
        <div class="document-info">
          <i class="fi fi-rr-document-signed document-icon"></i>
          <div>
            <strong style="font-size:13px; color:var(--color-text-main); display:block;">${a.tipo_anexo}</strong>
            <span style="font-size:11px; color:var(--color-text-muted);">${a.nome_arquivo} • Enviado em ${dateVal}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <a href="${a.caminho_arquivo}" target="_blank" class="btn btn-secondary btn-icon" style="height:32px; width:32px;" title="Visualizar"><i class="fi fi-rr-download"></i></a>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join('');
}

function renderTimeline(timeline) {
  const container = document.getElementById('det-timeline-list');
  if (!timeline || timeline.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum histórico encontrado.</div>`;
    return;
  }

  container.innerHTML = timeline.map(t => {
    const timeVal = new Date(t.data_hora).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const userTxt = t.usuario_nome ? `por ${t.usuario_nome}` : '';

    return `
      <div class="timeline-item animate-fade-in">
        <div class="timeline-time">${timeVal} ${userTxt}</div>
        <div class="timeline-title">${t.acao}</div>
        <p class="timeline-desc">${t.descricao}</p>
      </div>
    `;
  }).join('');
}

// Handle attachment upload
async function handleUploadAnexo(e) {
  e.preventDefault();
  if (!currentManutencaoId) return;

  const fileInput = document.getElementById('anexo-arquivo');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Por favor, selecione um arquivo.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const type = document.getElementById('anexo-tipo').value;
  const ext = file.name.split('.').pop().toLowerCase();

  // Validate format size limits
  if (ext === 'pdf' && file.size > 20 * 1024 * 1024) {
    showToast('O arquivo PDF excede o limite de 20 MB.', 'error');
    return;
  }
  if (['jpg', 'jpeg', 'png'].includes(ext) && file.size > 10 * 1024 * 1024) {
    showToast('A imagem excede o limite de 10 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_anexo', type);

  showLoader();
  try {
    const res = await api.post(`/api/manutencoes/${currentManutencaoId}/anexos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('form-upload-anexo').reset();
      
      // Reload details to update attachments list
      const updatedDet = await api.get(`/api/manutencoes/${currentManutencaoId}`);
      if (updatedDet.success && updatedDet.data) {
        document.getElementById('det-anexo-count').textContent = updatedDet.data.anexos ? updatedDet.data.anexos.length : 0;
        renderAnexos(updatedDet.data.anexos);
        renderTimeline(updatedDet.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao enviar arquivo.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

// Remove attachment
window.removerAnexo = async function(arquivoId) {
  if (!currentManutencaoId) return;

  const confirmar = await confirmarAcao('Excluir Anexo', 'Deseja realmente excluir este anexo permanentemente?', 'Excluir', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/manutencoes/${currentManutencaoId}/anexos/${arquivoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload details to update attachments list
        const updatedDet = await api.get(`/api/manutencoes/${currentManutencaoId}`);
        if (updatedDet.success && updatedDet.data) {
          document.getElementById('det-anexo-count').textContent = updatedDet.data.anexos ? updatedDet.data.anexos.length : 0;
          renderAnexos(updatedDet.data.anexos);
          renderTimeline(updatedDet.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover anexo.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};

// Wizard helper functions
function goToStep(step) {
  currentStep = step;
  
  if (step === 3) {
    const isEdit = document.getElementById('manutencao-id').value !== '';
    const ac = document.getElementById('manut-wizard-attachments-card');
    const ic = document.getElementById('manut-wizard-informative-card');
    if (ac) ac.style.display = isEdit ? 'block' : 'none';
    if (ic) ic.style.display = isEdit ? 'none' : 'block';
  }

  // Update step elements in sidebar
  document.querySelectorAll('#modal-manutencao .wizard-step').forEach(el => {
    const targetStep = parseInt(el.getAttribute('data-step-target'));
    el.classList.toggle('active', targetStep === step);
  });
  
  // Show active pane
  document.querySelectorAll('#modal-manutencao .wizard-pane').forEach(el => {
    el.style.display = el.getAttribute('id') === `wizard-pane-${step}` ? 'block' : 'none';
  });
  
  // Configure footer buttons
  const btnPrev = document.getElementById('wizard-btn-prev');
  const btnNext = document.getElementById('wizard-btn-next');
  
  if (step === 1) {
    btnPrev.textContent = 'Cancelar';
  } else {
    btnPrev.textContent = '← Voltar';
  }
  
  if (step < 4) {
    btnNext.type = 'button';
    btnNext.innerHTML = 'Próximo Passo <i class="fi fi-rr-arrow-right"></i>';
  } else {
    btnNext.type = 'submit';
    const isEdit = document.getElementById('manutencao-id').value !== '';
    btnNext.innerHTML = (isEdit ? 'Salvar Alterações' : 'Salvar Cadastro') + ' <i class="fi fi-rr-check"></i>';
    renderRevision();
  }
}

function validateStep(step) {
  const pane = document.getElementById(`wizard-pane-${step}`);
  if (!pane) return true;
  
  const inputs = pane.querySelectorAll('input, select, textarea');
  let valid = true;
  
  inputs.forEach(input => {
    // If the input is in a hidden group, skip validating
    let parent = input.parentElement;
    let isHidden = false;
    while (parent && parent !== pane) {
      if (parent.style.display === 'none') {
        isHidden = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (isHidden) return;

    if (!input.checkValidity()) {
      input.reportValidity();
      valid = false;
    }
  });
  
  return valid;
}

function renderRevision() {
  const container = document.getElementById('revisao-conteudo');
  if (!container) return;
  
  const imovelSelect = document.getElementById('imovel_id');
  const imovelName = imovelSelect.options[imovelSelect.selectedIndex]?.text || '-';
  const tipo = document.getElementById('tipo').value || '-';
  const status = document.getElementById('status').value || '-';
  const titulo = document.getElementById('titulo').value || '-';
  const descricao = document.getElementById('descricao').value || '-';
  const dataSolicitacao = formatDate(document.getElementById('data_solicitacao').value);
  const responsavel = document.getElementById('responsavel').value || '-';
  const valorPrevisto = formatCurrency(document.getElementById('valor_previsto').value);
  const dataPrevista = document.getElementById('data_prevista').value ? formatDate(document.getElementById('data_prevista').value) : 'Não informada';
  const dataInicio = document.getElementById('data_inicio').value ? formatDate(document.getElementById('data_inicio').value) : 'Não informada';
  
  const fornecedorNome = document.getElementById('fornecedor_nome').value || 'Não informado';
  const fornecedorTelefone = document.getElementById('fornecedor_telefone').value || 'Não informado';
  const fornecedorEmail = document.getElementById('fornecedor_email').value || 'Não informado';
  const fornecedorObs = document.getElementById('fornecedor_observacoes').value || 'Nenhuma';

  let html = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; font-size: 13px;">
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Imóvel</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${imovelName}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Tipo de Manutenção</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${tipo}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Status</span>
        <span class="badge badge-planejada" style="background:#FEF08A; color:#854D0E;">${status}</span>
      </div>
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Título</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${titulo}</span>
      </div>
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Descrição / Escopo</span>
        <span style="font-weight: 500; color: var(--color-text-main); white-space: pre-wrap;">${descricao}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Data de Solicitação</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${dataSolicitacao}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Responsável Interno</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${responsavel}</span>
      </div>
      
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px;">
        <h5 style="margin:0 0 8px 0; font-size:12px; font-weight:700; color:var(--color-primary); text-transform:uppercase;">Custos & Fornecedor</h5>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Valor Previsto (Orçado)</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${valorPrevisto}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Data Prevista</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${dataPrevista}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Data de Início Real</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${dataInicio}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Fornecedor</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${fornecedorNome}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Telefone Fornecedor</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${fornecedorTelefone}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">E-mail Fornecedor</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${fornecedorEmail}</span>
      </div>
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Observações do Fornecedor</span>
        <span style="font-weight: 500; color: var(--color-text-main);">${fornecedorObs}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// --- Manutenções Wizard Attachments Upload Logic ---

async function handleWizardUploadAnexo(e) {
  if (e) e.preventDefault();
  if (!currentManutencaoId) return;

  const fileInput = document.getElementById('manut-wizard-anexo-arquivo');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Por favor, selecione um arquivo.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const type = document.getElementById('manut-wizard-anexo-tipo').value;
  const ext = file.name.split('.').pop().toLowerCase();

  // Validate format size limits
  if (ext === 'pdf' && file.size > 20 * 1024 * 1024) {
    showToast('O arquivo PDF excede o limite de 20 MB.', 'error');
    return;
  }
  if (['jpg', 'jpeg', 'png'].includes(ext) && file.size > 10 * 1024 * 1024) {
    showToast('A imagem excede o limite de 10 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_anexo', type);

  showLoader();
  try {
    const res = await api.post(`/api/manutencoes/${currentManutencaoId}/anexos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';
      
      // Reload details to update attachments list
      const updatedDet = await api.get(`/api/manutencoes/${currentManutencaoId}`);
      if (updatedDet.success && updatedDet.data) {
        document.getElementById('det-anexo-count').textContent = updatedDet.data.anexos ? updatedDet.data.anexos.length : 0;
        renderWizardAnexos(updatedDet.data.anexos || []);
        renderAnexos(updatedDet.data.anexos || []);
        renderTimeline(updatedDet.data.timeline || []);
      }
    } else {
      showToast(res.message || 'Erro ao enviar arquivo.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

window.excluirAnexoWizard = async function(arquivoId) {
  if (!currentManutencaoId) return;

  const confirmar = await confirmarAcao('Excluir Anexo', 'Deseja realmente excluir este anexo permanentemente?', 'Excluir', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/manutencoes/${currentManutencaoId}/anexos/${arquivoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload details to update attachments list
        const updatedDet = await api.get(`/api/manutencoes/${currentManutencaoId}`);
        if (updatedDet.success && updatedDet.data) {
          document.getElementById('det-anexo-count').textContent = updatedDet.data.anexos ? updatedDet.data.anexos.length : 0;
          renderWizardAnexos(updatedDet.data.anexos || []);
          renderAnexos(updatedDet.data.anexos || []);
          renderTimeline(updatedDet.data.timeline || []);
        }
      } else {
        showToast(res.message || 'Erro ao remover anexo.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};

function renderWizardAnexos(anexos) {
  const container = document.getElementById('manut-wizard-attachments-list');
  if (!container) return;
  if (!anexos || anexos.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 16px;">
        <div class="empty-state-icon" style="font-size: 24px;">📄</div>
        <h5 class="empty-state-title" style="font-size: 13px;">Nenhum anexo encontrado</h5>
      </div>
    `;
    return;
  }

  container.innerHTML = anexos.map(a => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button type="button" onclick="excluirAnexoWizard('${a.id}')" style="background:none; border:none; color:var(--color-error); font-size:14px; cursor:pointer;" title="Remover Anexo"><i class="fi fi-rr-trash"></i></button>`;
    }
    const dateVal = formatDate(a.criado_em);

    return `
      <div class="document-item" style="padding: 8px 12px; margin-bottom: 8px; border: 1px solid var(--color-border); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fi fi-rr-document" style="font-size: 16px; color: var(--color-info);"></i>
          <div>
            <strong style="font-size:12px; color:var(--color-text-main);">${a.tipo_anexo}</strong>
            <span style="font-size:10px; color:var(--color-text-muted); display:block;">${a.nome_arquivo} • ${dateVal}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <a href="${a.caminho_arquivo}" target="_blank" class="btn btn-secondary btn-icon" style="height:28px; width:28px;" title="Download"><i class="fi fi-rr-download" style="font-size:12px;"></i></a>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join('');
}
