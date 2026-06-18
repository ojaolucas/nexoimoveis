// Contratos Módulo JavaScript Controller (Fase 07)

let currentPage = 1;
const limit = 10;
let currentFilters = { numero: '', status: '', imovel: '', locatario: '', data_inicio: '', data_fim: '' };
let currentContratoId = null;
let userProfile = null;
let allImoveis = [];
let allLocatarios = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/contratos') {
    initContratos();
  }
});

function formatCurrency(val) {
  if (val === null || val === undefined) return '-';
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return '-';
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

async function initContratos() {
  // 1. Get user profile and configure buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        const btnNew = document.getElementById('btn-novo-contrato');
        if (btnNew) btnNew.style.display = 'inline-flex';
        
        const docUploadForm = document.getElementById('document-upload-container');
        if (docUploadForm) docUploadForm.style.display = 'block';

        const actionButtons = document.getElementById('contrato-actions-container');
        if (actionButtons) actionButtons.style.display = 'flex';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile:', err);
  }

  // 2. Fetch data options
  await carregarOpcoes();

  // 3. Load initial list and stats
  await carregarContratos(currentPage);
  await carregarCardsStats();

  // 4. Register Event Listeners
  setupEventListeners();
}

async function carregarOpcoes() {
  try {
    const [resImoveis, resLocatarios] = await Promise.all([
      api.get('/api/imoveis?limit=1000&status='), // Load all active/inactive properties for filters
      api.get('/api/locatarios?limit=1000&status=ativo')
    ]);

    if (resImoveis.success && resImoveis.data) {
      allImoveis = resImoveis.data;
      const filtroImovel = document.getElementById('filtro-imovel');
      if (filtroImovel) {
        filtroImovel.innerHTML = '<option value="">Todos</option>' + 
          allImoveis.map(i => `<option value="${i.id}">${i.nome} (${i.codigo})</option>`).join('');
      }
    }

    if (resLocatarios.success && resLocatarios.data) {
      allLocatarios = resLocatarios.data;
      const filtroLocatario = document.getElementById('filtro-locatario');
      const formLocatario = document.getElementById('locatario_id');
      const formLocatarioRenov = document.getElementById('renov-garantia'); // just placeholder ref

      if (filtroLocatario) {
        filtroLocatario.innerHTML = '<option value="">Todos</option>' + 
          allLocatarios.map(l => `<option value="${l.id}">${l.nome_razao_social} (${l.codigo})</option>`).join('');
      }

      if (formLocatario) {
        formLocatario.innerHTML = '<option value="" disabled selected>Selecione um locatário</option>' + 
          allLocatarios.map(l => `<option value="${l.id}">${l.nome_razao_social} (${l.codigo})</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dropdown choices:', err);
  }
}

async function carregarCardsStats() {
  try {
    const res = await api.get('/api/contratos/cards');
    if (res.success && res.data) {
      const stats = res.data;
      document.getElementById('card-ativos').textContent = stats.ativos;
      document.getElementById('card-encerrados').textContent = stats.encerrados;
      document.getElementById('card-cancelados').textContent = stats.cancelados;
      document.getElementById('card-vencendo').textContent = stats.vencendo;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function carregarContratos(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/contratos?${query}`);
    const tbody = document.getElementById('contratos-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Nenhum contrato encontrado.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(c => {
      const startVal = formatDate(c.data_inicio);
      const endVal = formatDate(c.data_fim);
      const valVal = formatCurrency(c.valor_mensal);

      let badgeClass = 'badge-ativo';
      if (c.status === 'Encerrado') badgeClass = 'badge-encerrado';
      if (c.status === 'Cancelado') badgeClass = 'badge-cancelado';

      let actions = `<button onclick="verDetalhes('${c.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i></button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarContrato('${c.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i></button>`;
      }
      
      if (userProfile === 'administrador' && c.status === 'Ativo') {
        actions += `<button onclick="encerrarContrato('${c.id}', '${c.numero_contrato}')" class="btn btn-secondary btn-icon" style="margin-left: 6px; color:var(--color-text-muted);" title="Encerrar"><i class="fi fi-rr-ban"></i></button>`;
        actions += `<button onclick="cancelarContrato('${c.id}', '${c.numero_contrato}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Cancelar"><i class="fi fi-rr-trash"></i></button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${c.numero_contrato}</strong></td>
          <td>${c.imovel_nome || 'Nenhum'}</td>
          <td>${c.locatario_nome || 'Nenhum'}</td>
          <td>${startVal}</td>
          <td>${endVal}</td>
          <td>${valVal}</td>
          <td><span class="badge ${badgeClass}">${c.status}</span></td>
          <td style="text-align: right; padding-right: 24px;">${actions}</td>
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
    console.error('Error loading contracts:', err);
    showToast('Erro ao obter contratos.', 'error');
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

function setupEventListeners() {
  // Filters
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    currentFilters.numero = document.getElementById('filtro-numero').value.trim();
    currentFilters.imovel = document.getElementById('filtro-imovel').value;
    currentFilters.locatario = document.getElementById('filtro-locatario').value;
    currentFilters.status = document.getElementById('filtro-status').value;
    currentFilters.data_inicio = document.getElementById('filtro-data-inicio').value;
    currentFilters.data_fim = document.getElementById('filtro-data-fim').value;
    currentPage = 1;
    carregarContratos(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-numero').value = '';
    document.getElementById('filtro-imovel').value = '';
    document.getElementById('filtro-locatario').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    currentFilters = { numero: '', status: '', imovel: '', locatario: '', data_inicio: '', data_fim: '' };
    currentPage = 1;
    carregarContratos(currentPage);
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      carregarContratos(currentPage);
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    carregarContratos(currentPage);
  });

  // Exports
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.location.href = `/api/contratos/exportar/excel?${query}`;
  });

  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.open(`/api/contratos/exportar/pdf?${query}`, '_blank');
  });

  // Open Creation Modal
  const modalContrato = document.getElementById('modal-contrato');
  const btnNovo = document.getElementById('btn-novo-contrato');
  
  if (btnNovo) {
    btnNovo.addEventListener('click', () => {
      document.getElementById('form-contrato').reset();
      document.getElementById('contrato-id').value = '';
      document.getElementById('modal-title').textContent = 'Novo Contrato';
      document.getElementById('btn-salvar-contrato').textContent = 'Cadastrar';
      
      // Populate properties select: show ONLY Available ones
      const imovelSelect = document.getElementById('imovel_id');
      imovelSelect.innerHTML = '<option value="" disabled selected>Selecione um imóvel disponível</option>' +
        allImoveis.filter(i => i.status === 'Disponível').map(i => `<option value="${i.id}">${i.nome} (${i.codigo}) - R$ ${i.valor_locacao}</option>`).join('');

      // Status field defaults to Ativo and can be hidden/disabled on creation
      document.getElementById('status').value = 'Ativo';

      modalContrato.classList.add('active');
    });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modalContrato.classList.remove('active');
  });
  document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
    modalContrato.classList.remove('active');
  });

  // Form Submit
  document.getElementById('form-contrato').addEventListener('submit', handleSaveContrato);

  // Tab details switching
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchDetailTab(btn.getAttribute('data-tab'));
    });
  });

  document.getElementById('btn-close-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes').classList.remove('active');
  });
  document.getElementById('btn-fechar-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes').classList.remove('active');
  });

  // Document Upload Submit
  document.getElementById('form-upload-documento').addEventListener('submit', handleUploadDocumento);

  // Reajuste Modal open/close and trigger calculation
  document.getElementById('btn-abrir-reajustar').addEventListener('click', () => {
    const valAtualStr = document.getElementById('det-valor-mensal').textContent;
    // Extract numerical value
    const cleanVal = parseFloat(valAtualStr.replace(/[^0-9,-]/g, '').replace(',', '.'));
    
    document.getElementById('reajuste-valor-atual').value = valAtualStr;
    document.getElementById('reajuste-percentual').value = '';
    document.getElementById('reajuste-novo-valor').value = '';
    document.getElementById('reajuste-indice').value = 'IPCA';

    document.getElementById('modal-reajustar').classList.add('active');
  });

  document.getElementById('btn-close-reajustar').addEventListener('click', () => {
    document.getElementById('modal-reajustar').classList.remove('active');
  });
  document.getElementById('btn-cancelar-reajustar').addEventListener('click', () => {
    document.getElementById('modal-reajustar').classList.remove('active');
  });

  // Reajuste calculation triggers
  document.getElementById('reajuste-percentual').addEventListener('input', (e) => {
    const valAtualStr = document.getElementById('reajuste-valor-atual').value;
    const cleanVal = parseFloat(valAtualStr.replace(/[^0-9,-]/g, '').replace(',', '.'));
    const pct = parseFloat(e.target.value);
    
    if (!isNaN(cleanVal) && !isNaN(pct)) {
      const computed = cleanVal * (1 + pct / 100);
      document.getElementById('reajuste-novo-valor').value = computed.toFixed(2);
    } else {
      document.getElementById('reajuste-novo-valor').value = '';
    }
  });

  document.getElementById('form-reajustar').addEventListener('submit', handleReajustarContrato);

  // Renovacao Modal open/close
  document.getElementById('btn-abrir-renovar').addEventListener('click', () => {
    // Populate with contract details default values
    const valAtualStr = document.getElementById('det-valor-mensal').textContent;
    const cleanVal = parseFloat(valAtualStr.replace(/[^0-9,-]/g, '').replace(',', '.'));
    const venc = document.getElementById('det-dia-vencimento').textContent;
    const ind = document.getElementById('det-indice').textContent;
    const gar = document.getElementById('det-garantia').textContent;

    // Prefill dates
    document.getElementById('renov-data-inicio').value = '';
    document.getElementById('renov-data-fim').value = '';
    document.getElementById('renov-valor-mensal').value = cleanVal.toFixed(2);
    document.getElementById('renov-dia-vencimento').value = venc;
    document.getElementById('renov-caucao').value = '';
    document.getElementById('renov-garantia').value = gar;
    document.getElementById('renov-indice-reajuste').value = ind || 'IPCA';
    document.getElementById('renov-observacoes').value = '';

    document.getElementById('modal-renovar').classList.add('active');
  });

  document.getElementById('btn-close-renovar').addEventListener('click', () => {
    document.getElementById('modal-renovar').classList.remove('active');
  });
  document.getElementById('btn-cancelar-renovar').addEventListener('click', () => {
    document.getElementById('modal-renovar').classList.remove('active');
  });

  document.getElementById('form-renovar').addEventListener('submit', handleRenovarContrato);
}

function switchDetailTab(tabId) {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('#modal-detalhes .tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === `tab-${tabId}`);
  });
}

async function handleSaveContrato(e) {
  e.preventDefault();
  const id = document.getElementById('contrato-id').value;
  
  const payload = {
    numero_contrato: document.getElementById('numero_contrato').value.trim(),
    imovel_id: document.getElementById('imovel_id').value,
    locatario_id: document.getElementById('locatario_id').value,
    data_inicio: document.getElementById('data_inicio').value,
    data_fim: document.getElementById('data_fim').value,
    valor_mensal: document.getElementById('valor_mensal').value,
    dia_vencimento: document.getElementById('dia_vencimento').value,
    caucao: document.getElementById('caucao').value,
    garantia: document.getElementById('garantia').value,
    indice_reajuste: document.getElementById('indice_reajuste').value,
    observacoes: document.getElementById('observacoes').value.trim(),
    status: document.getElementById('status').value
  };

  showLoader();
  try {
    let res;
    if (id) {
      res = await api.put(`/api/contratos/${id}`, payload);
    } else {
      res = await api.post('/api/contratos', payload);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-contrato').classList.remove('active');
      carregarContratos(currentPage);
      carregarCardsStats();
      carregarOpcoes(); // reload properties availability
    } else {
      showToast(res.message || 'Erro ao salvar contrato.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
  } finally {
    hideLoader();
  }
}

window.editarContrato = async function(id) {
  try {
    const res = await api.get(`/api/contratos/${id}`);
    if (res.success && res.data) {
      const c = res.data;

      // Populate properties select: show ALL Available ones PLUS the current linked property
      const imovelSelect = document.getElementById('imovel_id');
      const availableImoveis = allImoveis.filter(i => i.status === 'Disponível' || i.id === c.imovel_id);
      
      imovelSelect.innerHTML = availableImoveis.map(i => `<option value="${i.id}">${i.nome} (${i.codigo}) - R$ ${i.valor_locacao}</option>`).join('');

      document.getElementById('contrato-id').value = c.id;
      document.getElementById('numero_contrato').value = c.numero_contrato;
      document.getElementById('imovel_id').value = c.imovel_id;
      document.getElementById('locatario_id').value = c.locatario_id;
      
      // format dates to yyyy-MM-dd
      document.getElementById('data_inicio').value = c.data_inicio.split('T')[0];
      document.getElementById('data_fim').value = c.data_fim.split('T')[0];
      
      document.getElementById('valor_mensal').value = c.valor_mensal;
      document.getElementById('dia_vencimento').value = c.dia_vencimento;
      document.getElementById('caucao').value = c.caucao || '';
      document.getElementById('garantia').value = c.garantia;
      document.getElementById('indice_reajuste').value = c.indice_reajuste;
      document.getElementById('observacoes').value = c.observacoes || '';
      document.getElementById('status').value = c.status;

      document.getElementById('modal-title').textContent = 'Editar Contrato';
      document.getElementById('btn-salvar-contrato').textContent = 'Salvar Alterações';
      document.getElementById('modal-contrato').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar contrato.', 'error');
  }
};

window.encerrarContrato = async function(id, numero) {
  if (confirm(`Deseja realmente encerrar o contrato nº "${numero}"?\nO imóvel será marcado como disponível e recebimentos futuros serão interrompidos.`)) {
    showLoader();
    try {
      const res = await api.patch(`/api/contratos/${id}/encerrar`);
      if (res.success) {
        showToast('Contrato encerrado com sucesso.', 'success');
        carregarContratos(currentPage);
        carregarCardsStats();
        carregarOpcoes();
      } else {
        showToast(res.message || 'Erro ao encerrar.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};

window.cancelarContrato = async function(id, numero) {
  if (confirm(`Deseja realmente CANCELAR o contrato nº "${numero}"?\nEsta ação é de auditoria e liberará o imóvel.`)) {
    showLoader();
    try {
      const res = await api.patch(`/api/contratos/${id}/cancelar`);
      if (res.success) {
        showToast('Contrato cancelado com sucesso.', 'success');
        carregarContratos(currentPage);
        carregarCardsStats();
        carregarOpcoes();
      } else {
        showToast(res.message || 'Erro ao cancelar.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};

window.verDetalhes = async function(id) {
  try {
    const res = await api.get(`/api/contratos/${id}`);
    if (res.success && res.data) {
      const c = res.data;
      currentContratoId = c.id;

      // Header info
      document.getElementById('detalhe-header-numero').textContent = `Contrato ${c.numero_contrato}`;
      
      const badgeStatus = document.getElementById('detalhe-badge-status');
      badgeStatus.textContent = c.status;
      badgeStatus.className = `badge badge-${c.status.toLowerCase()}`;

      // Tab: Dados Gerais
      document.getElementById('det-numero').textContent = c.numero_contrato;
      document.getElementById('det-inicio').textContent = formatDate(c.data_inicio);
      document.getElementById('det-fim').textContent = formatDate(c.data_fim);
      document.getElementById('det-valor-mensal').textContent = formatCurrency(c.valor_mensal);
      document.getElementById('det-dia-vencimento').textContent = c.dia_vencimento;
      document.getElementById('det-caucao').textContent = c.caucao ? formatCurrency(c.caucao) : 'Não informado';
      document.getElementById('det-garantia').textContent = c.garantia;
      document.getElementById('det-indice').textContent = c.indice_reajuste;
      document.getElementById('det-observacoes').textContent = c.observacoes || 'Nenhuma observação.';

      // Display renovate/readjust actions conditionally (only for actives, and admin/oper)
      const actionButtons = document.getElementById('contrato-actions-container');
      if (actionButtons) {
        const canAction = c.status === 'Ativo' && (userProfile === 'administrador' || userProfile === 'operacional');
        actionButtons.style.display = canAction ? 'flex' : 'none';
      }

      // Tab: Imóvel
      document.getElementById('det-imovel-codigo').textContent = c.imovel_codigo || '-';
      document.getElementById('det-imovel-tipo').textContent = c.imovel_tipo || '-';
      document.getElementById('det-imovel-nome').textContent = c.imovel_nome || '-';
      document.getElementById('det-imovel-endereco').textContent = c.imovel_endereco || '-';
      document.getElementById('det-imovel-proprietario').textContent = c.proprietario_nome || 'Imóvel Próprio / Nenhum';

      // Tab: Locatário
      document.getElementById('det-locatario-codigo').textContent = c.locatario_codigo || '-';
      document.getElementById('det-locatario-cpf-cnpj').textContent = c.locatario_cpf_cnpj || '-';
      document.getElementById('det-locatario-nome').textContent = c.locatario_nome || '-';
      document.getElementById('det-locatario-email').textContent = c.locatario_email || '-';
      document.getElementById('det-locatario-telefone').textContent = c.locatario_telefone || '-';

      // Tab Counters
      document.getElementById('det-recebimento-count').textContent = c.recebimentos ? c.recebimentos.length : 0;
      document.getElementById('det-reajuste-count').textContent = c.reajustes ? c.reajustes.length : 0;
      document.getElementById('det-renovacao-count').textContent = c.renovacoes ? c.renovacoes.length : 0;
      document.getElementById('det-doc-count').textContent = c.documentos ? c.documentos.length : 0;

      // Clear document inputs
      document.getElementById('doc-arquivo').value = '';
      document.getElementById('doc-tipo').value = 'Contrato Assinado';

      // Render Sub-resources lists
      renderRecebimentosList(c.recebimentos);
      renderReajustesList(c.reajustes);
      renderRenovacoesList(c.renovacoes);
      renderDocumentosList(c.documentos);
      renderTimelineList(c.timeline);

      // Show details modal
      switchDetailTab('det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao obter ficha de detalhes.', 'error');
  }
};

function renderRecebimentosList(recebimentos) {
  const tbody = document.getElementById('det-recebimentos-list-body');
  if (!recebimentos || recebimentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum recebimento gerado.</td></tr>`;
    return;
  }

  tbody.innerHTML = recebimentos.map(r => {
    const comp = formatDate(r.competencia).substring(3); // show MM/YYYY
    const venc = formatDate(r.vencimento);
    const prev = formatCurrency(r.valor_previsto);
    const rec = r.valor_recebido ? formatCurrency(r.valor_recebido) : '-';
    const pag = r.data_pagamento ? formatDate(r.data_pagamento) : '-';

    let badgeClass = 'badge-disponivel';
    if (r.status === 'Pago') badgeClass = 'badge-disponivel';
    if (r.status === 'Vencido') badgeClass = 'badge-manutencao';
    if (r.status === 'Parcial') badgeClass = 'badge-alugado';
    if (r.status === 'A Vencer') badgeClass = 'badge-disponivel';
    if (r.status === 'Cancelado') badgeClass = 'badge-inativo';

    return `
      <tr>
        <td>${comp}</td>
        <td>${venc}</td>
        <td>${prev}</td>
        <td>${rec}</td>
        <td>${pag}</td>
        <td><span class="badge ${badgeClass}">${r.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderReajustesList(reajustes) {
  const tbody = document.getElementById('det-reajustes-list-body');
  if (!reajustes || reajustes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum reajuste aplicado.</td></tr>`;
    return;
  }

  tbody.innerHTML = reajustes.map(r => {
    const dt = formatDate(r.data_reajuste);
    const ant = formatCurrency(r.valor_anterior);
    const nov = formatCurrency(r.novo_valor);
    return `
      <tr>
        <td>${dt}</td>
        <td><strong>${r.indice}</strong></td>
        <td>${r.percentual}%</td>
        <td>${ant}</td>
        <td>${nov}</td>
      </tr>
    `;
  }).join('');
}

function renderRenovacoesList(renovacoes) {
  const tbody = document.getElementById('det-renovacoes-list-body');
  if (!renovacoes || renovacoes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">Nenhuma renovação registrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = renovacoes.map(r => {
    const dt = formatDate(r.data_renovacao);
    return `
      <tr>
        <td><strong>${r.origem_numero || 'CTR-Antigo'}</strong></td>
        <td><strong>${r.destino_numero || 'CTR-Novo'}</strong></td>
        <td>${dt}</td>
      </tr>
    `;
  }).join('');
}

function renderDocumentosList(docs) {
  const container = document.getElementById('det-documentos-list');
  if (!docs || docs.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum documento anexado.</div>`;
    return;
  }

  container.innerHTML = docs.map(d => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button onclick="excluirDocumento('${d.id}')" style="background:none; border:none; color:var(--color-error); font-size:16px; cursor:pointer;" title="Remover Documento"><i class="fi fi-rr-trash"></i></button>`;
    }
    const env = formatDate(d.criado_em);

    return `
      <div class="document-item animate-fade-in">
        <div class="document-info">
          <i class="fi fi-rr-document-signed document-icon"></i>
          <div>
            <strong style="font-size:13px; color:var(--color-text-main); display:block;">${d.tipo_documento}</strong>
            <span style="font-size:11px; color:var(--color-text-muted);">${d.nome_arquivo} • Enviado em ${env}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <a href="${d.caminho_arquivo}" target="_blank" class="btn btn-secondary btn-icon" style="height:32px; width:32px;" title="Visualizar"><i class="fi fi-rr-download"></i></a>
          ${deleteBtn}
        </div>
      </div>
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

async function handleUploadDocumento(e) {
  e.preventDefault();
  const fileInput = document.getElementById('doc-arquivo');
  const typeSelect = document.getElementById('doc-tipo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo para fazer upload.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (extension !== '.pdf') {
    showToast('Apenas arquivos no formato PDF são permitidos.', 'error');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showToast('Limite excedido: PDFs devem possuir no máximo 20 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_documento', typeSelect.value);

  showLoader();
  try {
    const res = await api.post(`/api/contratos/${currentContratoId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';
      
      const resDetails = await api.get(`/api/contratos/${currentContratoId}`);
      if (resDetails.success && resDetails.data) {
        document.getElementById('det-doc-count').textContent = resDetails.data.documentos.length;
        renderDocumentosList(resDetails.data.documentos);
        renderTimelineList(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao anexar documento.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha no upload do documento.', 'error');
  } finally {
    hideLoader();
  }
}

window.excluirDocumento = async function(documentId) {
  if (confirm('Deseja realmente remover este anexo? Esta ação não pode ser desfeita.')) {
    showLoader();
    try {
      const res = await api.delete(`/api/contratos/${currentContratoId}/documentos/${documentId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        const resDetails = await api.get(`/api/contratos/${currentContratoId}`);
        if (resDetails.success && resDetails.data) {
          document.getElementById('det-doc-count').textContent = resDetails.data.documentos.length;
          renderDocumentosList(resDetails.data.documentos);
          renderTimelineList(resDetails.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover documento.', 'error');
      }
    } catch (err) {
      showToast('Falha na remoção do documento.', 'error');
    } finally {
      hideLoader();
    }
  }
};

async function handleReajustarContrato(e) {
  e.preventDefault();
  const payload = {
    indice: document.getElementById('reajuste-indice').value,
    percentual: document.getElementById('reajuste-percentual').value,
    novo_valor: document.getElementById('reajuste-novo-valor').value
  };

  showLoader();
  try {
    const res = await api.post(`/api/contratos/${currentContratoId}/reajustar`, payload);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-reajustar').classList.remove('active');
      
      // Reload details view
      verDetalhes(currentContratoId);
      carregarContratos(currentPage);
    } else {
      showToast(res.message || 'Erro ao aplicar reajuste.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha ao reajustar.', 'error');
  } finally {
    hideLoader();
  }
}

async function handleRenovarContrato(e) {
  e.preventDefault();
  
  const payload = {
    data_inicio: document.getElementById('renov-data-inicio').value,
    data_fim: document.getElementById('renov-data-fim').value,
    valor_mensal: document.getElementById('renov-valor-mensal').value,
    dia_vencimento: document.getElementById('renov-dia-vencimento').value,
    caucao: document.getElementById('renov-caucao').value,
    garantia: document.getElementById('renov-garantia').value,
    indice_reajuste: document.getElementById('renov-indice-reajuste').value,
    observacoes: document.getElementById('renov-observacoes').value.trim()
  };

  const start = new Date(payload.data_inicio);
  const end = new Date(payload.data_fim);
  if (start >= end) {
    showToast('A data de início deve ser anterior à data de término.', 'error');
    return;
  }

  showLoader();
  try {
    const res = await api.post(`/api/contratos/${currentContratoId}/renovar`, payload);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-renovar').classList.remove('active');
      document.getElementById('modal-detalhes').classList.remove('active');
      
      carregarContratos(currentPage);
      carregarCardsStats();
      carregarOpcoes();
    } else {
      showToast(res.message || 'Erro ao renovar contrato.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha ao renovar.', 'error');
  } finally {
    hideLoader();
  }
}
