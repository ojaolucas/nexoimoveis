// Vistorias Módulo JavaScript Controller (Fase 11)

let currentPage = 1;
const limit = 10;
let currentFilters = { status: '', imovel: '', tipo: '', responsavel: '', data_inicial: '', data_final: '', busca: '' };
let currentVistoriaId = null;
let userProfile = null;
let allImoveis = [];
let currentTab = 'painel-lista'; // 'painel-lista', 'painel-graficos'

// Core variables for current loaded inspection to prevent PUT overwrite bugs
let currentVistoriaTipo = '';
let currentVistoriaData = '';
let currentVistoriaResponsavel = '';
let currentVistoriaStatus = '';
let currentContratoId = null;

// Chart.js instances
let tiposChart = null;
let mesesChart = null;
let condicoesChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/vistorias') {
    initVistorias();
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

async function initVistorias() {
  // 1. Get user profile and configure buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        const btnNew = document.getElementById('btn-nova-vistoria');
        if (btnNew) btnNew.style.display = 'inline-flex';
        
        const uploadForm = document.getElementById('foto-upload-container');
        if (uploadForm) uploadForm.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile:', err);
  }

  // 2. Fetch options
  await carregarOpcoes();

  // 3. Load initial list and stats
  await carregarVistorias(currentPage);
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
    const res = await api.get('/api/vistorias/stats');
    if (res.success && res.data) {
      const stats = res.data;
      document.getElementById('card-total-vistorias').textContent = stats.total_vistorias;
      document.getElementById('card-entradas').textContent = stats.entradas;
      document.getElementById('card-saidas').textContent = stats.saidas;
      document.getElementById('card-pendentes').textContent = stats.pendentes;
      document.getElementById('card-concluidas').textContent = stats.concluidas;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function carregarVistorias(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/vistorias?${query}`);
    const tbody = document.getElementById('vistorias-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">Nenhuma vistoria encontrada.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(v => {
      const dateVal = formatDate(v.data_vistoria);
      
      let badgeClass = 'badge-pendente';
      if (v.status === 'Em Andamento') badgeClass = 'badge-em-andamento';
      if (v.status === 'Concluída') badgeClass = 'badge-concluida';
      if (v.status === 'Cancelada') badgeClass = 'badge-cancelada';

      let actions = `<button onclick="verDetalhes('${v.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i> Ficha</button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        if (v.status !== 'Concluída' && v.status !== 'Cancelada') {
          actions += `<button onclick="editarVistoria('${v.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i> Editar</button>`;
        }
      }
      
      if (userProfile === 'administrador') {
        if (v.status !== 'Concluída' && v.status !== 'Cancelada') {
          actions += `<button onclick="cancelarVistoria('${v.id}', '${v.codigo}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Cancelar"><i class="fi fi-rr-ban"></i> Cancelar</button>`;
        }
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${v.codigo}</strong></td>
          <td>${v.imovel_nome || 'Nenhum'}</td>
          <td><strong>${v.tipo}</strong></td>
          <td>${dateVal}</td>
          <td>${v.responsavel}</td>
          <td><span class="badge ${badgeClass}">${v.status}</span></td>
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
    console.error('Error loading vistorias:', err);
    showToast('Erro ao obter vistorias.', 'error');
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

async function carregarGraficosVistorias() {
  showLoader();
  try {
    const res = await api.get('/api/vistorias/graficos');
    if (!res.success || !res.data) {
      showToast('Erro ao obter dados analíticos.', 'error');
      return;
    }

    const { tipos, meses, condicoes } = res.data;

    renderTiposChart(tipos);
    renderMesesChart(meses);
    renderCondicoesChart(condicoes);
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
        backgroundColor: ['#0F52BA', '#478C27', '#F59E0B', '#DC2626'],
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
  if (mesesChart) mesesChart.destroy();
  const ctx = document.getElementById('chart-meses').getContext('2d');
  mesesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses.labels,
      datasets: [{
        label: 'Vistorias Concluídas',
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

function renderCondicoesChart(condicoes) {
  if (condicoesChart) condicoesChart.destroy();
  const ctx = document.getElementById('chart-condicoes').getContext('2d');
  condicoesChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: condicoes.labels,
      datasets: [{
        data: condicoes.valores,
        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#7C3AED'],
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
    carregarVistorias(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-imovel').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-data-inicial').value = '';
    document.getElementById('filtro-data-final').value = '';
    
    currentFilters = { status: '', imovel: '', tipo: '', responsavel: '', data_inicial: '', data_final: '', busca: '' };
    currentPage = 1;
    carregarVistorias(currentPage);
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      carregarVistorias(currentPage);
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    carregarVistorias(currentPage);
  });

  // Export actions
  document.getElementById('btn-exportar-csv').addEventListener('click', () => {
    const reportType = document.getElementById('filtro-tipo-relatorio').value;
    const query = new URLSearchParams({
      tipo: reportType,
      ...currentFilters
    }).toString();
    window.location.href = `/api/vistorias/exportar/excel?${query}`;
  });

  document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
    const reportType = document.getElementById('filtro-tipo-relatorio').value;
    const query = new URLSearchParams({
      tipo: reportType,
      ...currentFilters
    }).toString();
    window.open(`/api/vistorias/exportar/pdf?${query}`, '_blank');
  });

  // Creation modal toggles
  const modalForm = document.getElementById('modal-vistoria');
  const btnNew = document.getElementById('btn-nova-vistoria');

  if (btnNew) {
    btnNew.addEventListener('click', () => {
      document.getElementById('form-vistoria').reset();
      document.getElementById('vistoria-id').value = '';
      document.getElementById('modal-title').textContent = 'Nova Vistoria';
      document.getElementById('btn-salvar-vistoria').textContent = 'Cadastrar';
      
      // Default vistoria date to today
      document.getElementById('data_vistoria').value = new Date().toISOString().split('T')[0];
      
      // Reset form lock values
      document.getElementById('imovel_id').disabled = false;
      document.getElementById('contrato_id').innerHTML = '<option value="">Nenhum Contrato</option>';
      document.getElementById('status').innerHTML = `
        <option value="Pendente">Pendente</option>
        <option value="Em Andamento">Em Andamento</option>
      `;

      modalForm.classList.add('active');
    });
  }

  // Load contracts dynamic handler
  const formImovel = document.getElementById('imovel_id');
  if (formImovel) {
    formImovel.addEventListener('change', async (e) => {
      const selectedImovelId = e.target.value;
      await popularContratos(selectedImovelId);
    });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => modalForm.classList.remove('active'));
  document.getElementById('btn-cancelar-modal').addEventListener('click', () => modalForm.classList.remove('active'));

  // Save/Update Form Handler
  document.getElementById('form-vistoria').addEventListener('submit', handleSaveVistoria);

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

  // General photo upload form submit
  document.getElementById('form-upload-foto').addEventListener('submit', handleUploadFotoGeral);

  // Zoom close handler
  const zoomOverlay = document.getElementById('zoom-overlay');
  document.getElementById('btn-close-zoom').addEventListener('click', () => zoomOverlay.classList.remove('active'));
  zoomOverlay.addEventListener('click', (e) => {
    if (e.target === zoomOverlay) {
      zoomOverlay.classList.remove('active');
    }
  });

  // Direct conclusion button handler
  document.getElementById('btn-concluir-vistoria-direta').addEventListener('click', async () => {
    if (confirm('Deseja realmente marcar este laudo de vistoria como Concluído?\nEsta ação é permanente e bloqueia novas alterações.')) {
      showLoader();
      try {
        const res = await api.patch(`/api/vistorias/${currentVistoriaId}/concluir`, {});
        if (res.success) {
          showToast('Vistoria concluída com sucesso.', 'success');
          // Reload detailed window
          await verDetalhes(currentVistoriaId);
          // Reload listings
          carregarVistorias(currentPage);
          carregarCardsStats();
        } else {
          showToast(res.message || 'Erro ao concluir.', 'error');
        }
      } catch (err) {
        showToast('Erro ao concluir.', 'error');
      } finally {
        hideLoader();
      }
    }
  });
}

async function popularContratos(imovelId) {
  const contratoSelect = document.getElementById('contrato_id');
  contratoSelect.innerHTML = '<option value="">Nenhum Contrato</option>';
  
  if (!imovelId) return;

  try {
    const res = await api.get(`/api/contratos?limit=1000&imovel=${imovelId}`);
    if (res.success && res.data) {
      contratoSelect.innerHTML = '<option value="">Nenhum Contrato</option>' + 
        res.data.map(c => `<option value="${c.id}">Contrato nº ${c.numero_contrato} (${c.locatario_nome})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading contracts choice dropdown:', err);
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
    carregarGraficosVistorias();
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

// Save/Update Handler
async function handleSaveVistoria(e) {
  e.preventDefault();
  const id = document.getElementById('vistoria-id').value;
  const isEdit = !!id;

  const data = {
    imovel_id: document.getElementById('imovel_id').value,
    contrato_id: document.getElementById('contrato_id').value || null,
    tipo: document.getElementById('tipo').value,
    data_vistoria: document.getElementById('data_vistoria').value,
    responsavel: document.getElementById('responsavel').value.trim(),
    status: document.getElementById('status').value,
    observacoes_gerais: document.getElementById('observacoes_gerais').value.trim() || null
  };

  showLoader();
  try {
    let res;
    if (isEdit) {
      res = await api.put(`/api/vistorias/${id}`, data);
    } else {
      res = await api.post('/api/vistorias', data);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-vistoria').classList.remove('active');
      carregarVistorias(currentPage);
      carregarCardsStats();
      if (currentTab === 'painel-graficos') carregarGraficosVistorias();
    } else {
      showToast(res.message || 'Erro ao processar requisição.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de rede.', 'error');
  } finally {
    hideLoader();
  }
}

// Edit handler
window.editarVistoria = async function(id) {
  try {
    const res = await api.get(`/api/vistorias/${id}`);
    if (res.success && res.data) {
      const v = res.data;
      
      document.getElementById('vistoria-id').value = v.id;
      document.getElementById('imovel_id').value = v.imovel_id;
      document.getElementById('imovel_id').disabled = true; // Lock property modification

      // Load contracts list for the locked property
      await popularContratos(v.imovel_id);
      document.getElementById('contrato_id').value = v.contrato_id || '';

      document.getElementById('tipo').value = v.tipo;
      document.getElementById('data_vistoria').value = v.data_vistoria ? v.data_vistoria.split('T')[0] : '';
      document.getElementById('responsavel').value = v.responsavel;
      document.getElementById('observacoes_gerais').value = v.observacoes_gerais || '';

      const statusSelect = document.getElementById('status');
      statusSelect.innerHTML = `
        <option value="Pendente">Pendente</option>
        <option value="Em Andamento">Em Andamento</option>
        <option value="Concluída">Concluída</option>
        <option value="Cancelada" disabled>Cancelada (Use o botão cancelar)</option>
      `;
      statusSelect.value = v.status;

      document.getElementById('modal-title').textContent = `Editar Vistoria - ${v.codigo}`;
      document.getElementById('btn-salvar-vistoria').textContent = 'Salvar Alterações';

      document.getElementById('modal-vistoria').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar dados da vistoria.', 'error');
  }
};

// Cancel vistoria trigger (Admin Only)
window.cancelarVistoria = async function(id, codigo) {
  if (confirm(`Deseja realmente CANCELAR a vistoria "${codigo}"?\nEsta ação registrará um log permanente e atualizará o status para Cancelada.`)) {
    showLoader();
    try {
      const res = await api.patch(`/api/vistorias/${id}/cancelar`);
      if (res.success) {
        showToast('Vistoria cancelada com sucesso.', 'success');
        carregarVistorias(currentPage);
        carregarCardsStats();
        if (currentTab === 'painel-graficos') carregarGraficosVistorias();
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

// Detailed Ficha modal
window.verDetalhes = async function(id) {
  try {
    const res = await api.get(`/api/vistorias/${id}`);
    if (res.success && res.data) {
      const v = res.data;
      currentVistoriaId = v.id;

      // Lock global details
      currentVistoriaTipo = v.tipo;
      currentVistoriaData = v.data_vistoria ? v.data_vistoria.split('T')[0] : '';
      currentVistoriaResponsavel = v.responsavel;
      currentVistoriaStatus = v.status;
      currentContratoId = v.contrato_id;

      // Update Header info
      document.getElementById('detalhes-header-codigo').textContent = v.codigo;
      document.getElementById('detalhes-header-tipo-titulo').textContent = `${v.tipo} - Vistoriador: ${v.responsavel}`;

      const badgeStatus = document.getElementById('detalhes-badge-status');
      badgeStatus.textContent = v.status;
      
      let badgeClass = 'badge-pendente';
      if (v.status === 'Em Andamento') badgeClass = 'badge-em-andamento';
      if (v.status === 'Concluída') badgeClass = 'badge-concluida';
      if (v.status === 'Cancelada') badgeClass = 'badge-cancelada';
      badgeStatus.className = `badge ${badgeClass}`;

      // Tab: Dados Gerais
      document.getElementById('det-imovel').textContent = `${v.imovel_nome} (${v.imovel_codigo})`;
      document.getElementById('det-tipo').textContent = v.tipo;
      document.getElementById('det-responsavel').textContent = v.responsavel;
      document.getElementById('det-data').textContent = formatDate(v.data_vistoria);
      document.getElementById('det-contrato').textContent = v.contrato_codigo ? `Contrato nº ${v.contrato_codigo}` : 'Nenhum contrato vinculado';
      document.getElementById('det-observacoes').textContent = v.observacoes_gerais || 'Nenhuma observação geral registrada.';

      // Manage upload forms display and conclusion buttons under status
      const conclPane = document.getElementById('conclusao-actions-pane');
      const uploadPane = document.getElementById('foto-upload-container');
      const isEditable = (v.status !== 'Concluída' && v.status !== 'Cancelada' && (userProfile === 'administrador' || userProfile === 'operacional'));

      if (isEditable) {
        conclPane.style.display = 'block';
        uploadPane.style.display = 'block';
      } else {
        conclPane.style.display = 'none';
        uploadPane.style.display = 'none';
      }

      // Tab: Checklist
      renderChecklist(v.itens, v.fotos, isEditable);

      // Tab: Galeria (Fotos Gerais e Principal)
      document.getElementById('det-anexo-count').textContent = v.fotos ? v.fotos.length : 0;
      renderGaleriaGeral(v.fotos, isEditable);

      // Tab: Timeline
      renderTimeline(v.timeline);

      // Select default tab and open
      switchDetailTab('det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    console.error('Error fetching detailed inspection:', err);
    showToast('Erro ao obter dados detalhados da vistoria.', 'error');
  }
};

function renderChecklist(itens, fotos, isEditable) {
  const container = document.getElementById('checklist-rows-container');
  if (!itens || itens.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--color-text-muted);">Checklist não inicializado.</div>';
    return;
  }

  container.innerHTML = itens.map(item => {
    // Group photos for this item
    const itemPhotos = fotos.filter(f => f.item_id === item.id);
    
    // Draw photos
    let photoGridHTML = '';
    if (itemPhotos.length > 0) {
      photoGridHTML = `<div class="checklist-img-grid">` + 
        itemPhotos.map(p => {
          let delBtn = '';
          if (isEditable) {
            delBtn = `<button type="button" class="checklist-img-delete" onclick="excluirFotoItem('${p.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>`;
          }
          return `
            <div class="checklist-img-item animate-fade-in">
              <img src="${p.caminho_arquivo}" class="zoomable" onclick="zoomImage(this.src)" alt="${item.item_nome}">
              ${delBtn}
            </div>
          `;
        }).join('') + `</div>`;
    }

    // Edit controls
    let saveControlHTML = '';
    let disabledAttr = 'disabled';
    if (isEditable) {
      disabledAttr = '';
      saveControlHTML = `
        <div style="text-align: right; margin-top: 10px;">
          <label class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; cursor:pointer; margin-right:8px;" title="Adicionar Foto">
            <i class="fi fi-rr-camera"></i> Foto
            <input type="file" style="display:none;" onchange="uploadFotoItem('${item.id}', this)">
          </label>
          <button type="button" class="btn btn-primary btn-sm" onclick="salvarChecklistItem('${item.id}', 'cond-${item.id}', 'obs-${item.id}')">
            Salvar Item
          </button>
        </div>
      `;
    }

    return `
      <div class="checklist-row animate-fade-in">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span class="checklist-item-title">${item.item_nome}</span>
          <div>
            <span class="cond-badge cond-${item.condicao.replace(' ', '-')}">${item.condicao}</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Condição</label>
            <select id="cond-${item.id}" class="form-control form-control-sm" ${disabledAttr}>
              <option value="Excelente" ${item.condicao === 'Excelente' ? 'selected' : ''}>Excelente</option>
              <option value="Bom" ${item.condicao === 'Bom' ? 'selected' : ''}>Bom</option>
              <option value="Regular" ${item.condicao === 'Regular' ? 'selected' : ''}>Regular</option>
              <option value="Ruim" ${item.condicao === 'Ruim' ? 'selected' : ''}>Ruim</option>
              <option value="Necessita Reparo" ${item.condicao === 'Necessita Reparo' ? 'selected' : ''}>Necessita Reparo</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:11px;">Observações</label>
            <input type="text" id="obs-${item.id}" class="form-control form-control-sm" value="${item.observacao || ''}" placeholder="Detalhes de danos, furos, etc." ${disabledAttr}>
          </div>
        </div>
        
        ${photoGridHTML}
        ${saveControlHTML}
      </div>
    `;
  }).join('');
}

function renderGaleriaGeral(fotos, isEditable) {
  const container = document.getElementById('det-galeria-fotos');
  // Filters principal and general photos
  const generalPhotos = fotos.filter(f => f.tipo_foto === 'Principal' || f.tipo_foto === 'Geral');

  if (generalPhotos.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); grid-column: span 4; padding:20px;">Nenhuma foto geral anexada.</div>`;
    return;
  }

  container.innerHTML = generalPhotos.map(p => {
    let deleteBtn = '';
    if (isEditable) {
      deleteBtn = `<button onclick="excluirFotoGeral('${p.id}')" class="gallery-photo-delete" style="position:absolute; top:4px; right:4px; background:rgba(220, 38, 38, 0.9); color:white; border:none; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Remover Foto"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>`;
    }
    return `
      <div class="gallery-photo-item animate-fade-in" style="position:relative; height:120px; border-radius:6px; overflow:hidden; border:1px solid var(--color-border);">
        <img src="${p.caminho_arquivo}" class="gallery-photo-img zoomable" onclick="zoomImage(this.src)" alt="${p.tipo_foto}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">
        <span style="position:absolute; bottom:4px; left:4px; background:rgba(0,0,0,0.6); color:white; font-size:10px; padding:2px 6px; border-radius:4px;">${p.tipo_foto}</span>
        ${deleteBtn}
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

// Save Checklist Item
window.salvarChecklistItem = async function(itemId, selectId, obsId) {
  const cond = document.getElementById(selectId).value;
  const obs = document.getElementById(obsId).value.trim();

  const payload = {
    tipo: currentVistoriaTipo,
    data_vistoria: currentVistoriaData,
    responsavel: currentVistoriaResponsavel,
    status: currentVistoriaStatus,
    contrato_id: currentContratoId,
    checklist: [{ id: itemId, condicao: cond, observacao: obs }]
  };

  showLoader();
  try {
    const res = await api.put(`/api/vistorias/${currentVistoriaId}`, payload);
    if (res.success) {
      showToast('Item do checklist atualizado com sucesso.', 'success');
      // Reload detailed modal
      const updatedDet = await api.get(`/api/vistorias/${currentVistoriaId}`);
      if (updatedDet.success && updatedDet.data) {
        renderChecklist(updatedDet.data.itens, updatedDet.data.fotos, true);
        renderTimeline(updatedDet.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao salvar item.', 'error');
    }
  } catch (err) {
    showToast('Erro ao atualizar checklist.', 'error');
  } finally {
    hideLoader();
  }
};

// Upload Photo for Item
window.uploadFotoItem = async function(itemId, inputElement) {
  if (!inputElement.files || inputElement.files.length === 0) return;

  const file = inputElement.files[0];
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (!['jpg', 'jpeg', 'png'].includes(ext)) {
    showToast('Apenas formatos JPG, JPEG e PNG são permitidos.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('A imagem excede o limite máximo de 10 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_foto', 'Item');
  formData.append('item_id', itemId);

  showLoader();
  try {
    const res = await api.post(`/api/vistorias/${currentVistoriaId}/fotos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      
      // Reload details to update
      const updatedDet = await api.get(`/api/vistorias/${currentVistoriaId}`);
      if (updatedDet.success && updatedDet.data) {
        renderChecklist(updatedDet.data.itens, updatedDet.data.fotos, true);
        renderTimeline(updatedDet.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao enviar foto.', 'error');
    }
  } catch (err) {
    showToast('Erro de rede ao enviar foto.', 'error');
  } finally {
    hideLoader();
  }
};

// Excluir Foto Item
window.excluirFotoItem = async function(fotoId) {
  if (confirm('Deseja realmente excluir esta foto do item?')) {
    showLoader();
    try {
      const res = await api.delete(`/api/vistorias/${currentVistoriaId}/fotos/${fotoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload details to update
        const updatedDet = await api.get(`/api/vistorias/${currentVistoriaId}`);
        if (updatedDet.success && updatedDet.data) {
          renderChecklist(updatedDet.data.itens, updatedDet.data.fotos, true);
          renderTimeline(updatedDet.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover foto.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};

// Upload Photo Geral/Principal
async function handleUploadFotoGeral(e) {
  e.preventDefault();
  if (!currentVistoriaId) return;

  const fileInput = document.getElementById('foto-arquivo');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Por favor, selecione um arquivo.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const type = document.getElementById('foto-tipo').value;
  const ext = file.name.split('.').pop().toLowerCase();

  if (!['jpg', 'jpeg', 'png'].includes(ext)) {
    showToast('Apenas formatos JPG, JPEG e PNG são permitidos.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('A imagem excede o limite máximo de 10 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_foto', type);

  showLoader();
  try {
    const res = await api.post(`/api/vistorias/${currentVistoriaId}/fotos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('form-upload-foto').reset();
      
      // Reload details to update gallery list
      const updatedDet = await api.get(`/api/vistorias/${currentVistoriaId}`);
      if (updatedDet.success && updatedDet.data) {
        document.getElementById('det-anexo-count').textContent = updatedDet.data.fotos ? updatedDet.data.fotos.length : 0;
        renderGaleriaGeral(updatedDet.data.fotos, true);
        renderTimeline(updatedDet.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao enviar arquivo.', 'error');
    }
  } catch (err) {
    showToast('Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

// Excluir Foto Geral
window.excluirFotoGeral = async function(fotoId) {
  if (confirm('Deseja realmente excluir esta foto da galeria?')) {
    showLoader();
    try {
      const res = await api.delete(`/api/vistorias/${currentVistoriaId}/fotos/${fotoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload details to update gallery list
        const updatedDet = await api.get(`/api/vistorias/${currentVistoriaId}`);
        if (updatedDet.success && updatedDet.data) {
          document.getElementById('det-anexo-count').textContent = updatedDet.data.fotos ? updatedDet.data.fotos.length : 0;
          renderGaleriaGeral(updatedDet.data.fotos, true);
          renderTimeline(updatedDet.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover foto.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};

// Zoom image overlay click
window.zoomImage = function(src) {
  const overlay = document.getElementById('zoom-overlay');
  const img = document.getElementById('zoom-img');
  img.src = src;
  overlay.classList.add('active');
};
