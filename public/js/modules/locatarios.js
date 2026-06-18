// Locatários Módulo JavaScript Controller (Fase 05)

let currentPage = 1;
const limit = 10;
let currentFilters = { busca: '', status: '', tipo: '' };
let currentLocatarioId = null; // Used for documents upload reference
let userProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/locatarios') {
    initLocatarios();
  }
});

// Format helpers
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

function formatDate(val) {
  if (!val) return '-';
  
  // Prevent UTC offset issues from shifts
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

function formatCurrency(val) {
  if (val === null || val === undefined) return '-';
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed);
}

async function initLocatarios() {
  // 1. Get user role and config view buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        const btnNew = document.getElementById('btn-novo-locatario');
        if (btnNew) btnNew.style.display = 'inline-flex';
        
        const docUploadForm = document.getElementById('document-upload-container');
        if (docUploadForm) docUploadForm.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile details:', err);
  }

  // 2. Load list data
  await carregarLocatarios(currentPage);

  // 3. Register Event Listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Filters
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    currentFilters.busca = document.getElementById('filtro-busca').value.trim();
    currentFilters.tipo = document.getElementById('filtro-tipo').value;
    currentFilters.status = document.getElementById('filtro-status').value;
    currentPage = 1;
    carregarLocatarios(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-status').value = '';
    currentFilters = { busca: '', status: '', tipo: '' };
    currentPage = 1;
    carregarLocatarios(currentPage);
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      carregarLocatarios(currentPage);
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    carregarLocatarios(currentPage);
  });

  // Exports
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.location.href = `/api/locatarios/exportar/excel?${query}`;
  });

  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.open(`/api/locatarios/exportar/pdf?${query}`, '_blank');
  });

  // Modal open/close actions
  const modalForm = document.getElementById('modal-locatario');
  const btnNovo = document.getElementById('btn-novo-locatario');
  
  if (btnNovo) {
    btnNovo.addEventListener('click', () => {
      document.getElementById('form-locatario').reset();
      document.getElementById('loc-id').value = '';
      document.getElementById('modal-title').textContent = 'Novo Locatário';
      document.getElementById('btn-salvar-locatario').textContent = 'Cadastrar';
      document.getElementById('status').value = 'ativo';
      
      // Select default tab
      switchFormTab('dados-gerais');
      // Set type PF
      switchTipoPessoa('PF');
      
      modalForm.classList.add('active');
    });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modalForm.classList.remove('active');
  });
  document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
    modalForm.classList.remove('active');
  });

  // Form Switch tabs (General vs Observations)
  document.querySelectorAll('[data-form-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchFormTab(btn.getAttribute('data-form-tab'));
    });
  });

  // Switch inputs on Tipo Pessoa
  document.getElementById('tipo_pessoa').addEventListener('change', (e) => {
    switchTipoPessoa(e.target.value);
  });

  // Form Submit (Save/Update)
  document.getElementById('form-locatario').addEventListener('submit', handleSaveLocatario);

  // Details Modal tabs switching
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

  // Document Upload Form
  document.getElementById('form-upload-documento').addEventListener('submit', handleUploadDocumento);
}

// Switches form tab UI
function switchFormTab(tabId) {
  document.querySelectorAll('[data-form-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-form-tab') === tabId);
  });
  document.getElementById('form-dados-gerais').style.display = tabId === 'dados-gerais' ? 'block' : 'none';
  document.getElementById('form-observacoes-tab').style.display = tabId === 'observacoes-tab' ? 'block' : 'none';
}

// Switches detail modal tab UI
function switchDetailTab(tabId) {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('#modal-detalhes .tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === `tab-${tabId}`);
  });
}

// Toggles form inputs based on PF or PJ type
function switchTipoPessoa(type) {
  const labelNome = document.getElementById('label-nome');
  const inputNome = document.getElementById('nome_razao_social');
  const labelDocumento = document.getElementById('label-documento');
  const inputDocumento = document.getElementById('cpf_cnpj');
  
  const groupFantasia = document.getElementById('group-fantasia');
  const groupRg = document.getElementById('group-rg');
  const groupIe = document.getElementById('group-ie');
  const groupResponsavel = document.getElementById('group-responsavel');

  if (type === 'PF') {
    labelNome.textContent = 'Nome Completo';
    inputNome.placeholder = 'Insira o nome completo';
    labelDocumento.textContent = 'CPF';
    inputDocumento.placeholder = '000.000.000-00';
    
    groupFantasia.style.display = 'none';
    groupRg.style.display = 'block';
    groupIe.style.display = 'none';
    groupResponsavel.style.display = 'none';
    document.getElementById('responsavel').required = false;
  } else {
    labelNome.textContent = 'Razão Social';
    inputNome.placeholder = 'Razão Social da empresa';
    labelDocumento.textContent = 'CNPJ';
    inputDocumento.placeholder = '00.000.000/0000-00';
    
    groupFantasia.style.display = 'block';
    groupRg.style.display = 'none';
    groupIe.style.display = 'block';
    groupResponsavel.style.display = 'block';
    document.getElementById('responsavel').required = true;
  }
}

// Populate document type selector based on PF/PJ type
function popularTiposDocumento(tipoPessoa) {
  const select = document.getElementById('doc-tipo');
  if (!select) return;

  if (tipoPessoa === 'PF') {
    select.innerHTML = `
      <option value="CPF">CPF</option>
      <option value="RG">RG</option>
      <option value="Comprovante de Endereço">Comprovante de Endereço</option>
      <option value="Outros">Outros</option>
    `;
  } else {
    select.innerHTML = `
      <option value="CNPJ">CNPJ</option>
      <option value="Contrato Social">Contrato Social / Estatuto</option>
      <option value="Comprovante de Endereço">Comprovante de Endereço</option>
      <option value="Outros">Outros</option>
    `;
  }
}

// Load List data
async function carregarLocatarios(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/locatarios?${query}`);
    const tbody = document.getElementById('locatarios-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">Nenhum locatário encontrado.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(l => {
      const formattedDoc = formatCpfCnpj(l.cpf_cnpj);
      const formattedPhone = formatTelefone(l.telefone);
      const isInactive = l.status === 'inativo';
      const badgeClass = isInactive ? 'badge-inativo' : 'badge-ativo';
      const badgeText = isInactive ? 'Inativo' : 'Ativo';

      // Action buttons based on profile
      let actions = `<button onclick="verDetalhes('${l.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i></button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarLocatario('${l.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i></button>`;
      }
      if (userProfile === 'administrador') {
        actions += `<button onclick="excluirLocatario('${l.id}', '${l.nome_razao_social}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Excluir"><i class="fi fi-rr-trash"></i></button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${l.codigo}</strong></td>
          <td>${l.nome_razao_social}</td>
          <td>${formattedDoc}</td>
          <td>${formattedPhone}</td>
          <td>${l.email}</td>
          <td style="text-align: center;">${l.qtd_contratos || 0}</td>
          <td style="text-align: center;">${l.qtd_imoveis || 0}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
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
    console.error('Error loading list:', err);
    showToast('Erro ao obter locatários.', 'error');
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

// Save/Update handler
async function handleSaveLocatario(e) {
  e.preventDefault();
  const id = document.getElementById('loc-id').value;
  const novoStatus = document.getElementById('status').value;
  
  const payload = {
    tipo_pessoa: document.getElementById('tipo_pessoa').value,
    nome_razao_social: document.getElementById('nome_razao_social').value,
    nome_fantasia: document.getElementById('nome_fantasia').value,
    cpf_cnpj: document.getElementById('cpf_cnpj').value,
    rg: document.getElementById('rg').value,
    inscricao_estadual: document.getElementById('inscricao_estadual').value,
    responsavel: document.getElementById('responsavel').value,
    telefone: document.getElementById('telefone').value,
    email: document.getElementById('email').value,
    endereco: document.getElementById('endereco').value,
    observacoes: document.getElementById('observacoes').value,
    status: novoStatus,
  };

  try {
    let res;
    if (id) {
      // Atualiza o status separadamente (rota PATCH não revalida CPF/CNPJ)
      const statusRes = await api.patch(`/api/locatarios/${id}/status`, { status: novoStatus });
      if (!statusRes.success) {
        showToast(statusRes.message || 'Erro ao atualizar status.', 'error');
        return;
      }
      res = await api.put(`/api/locatarios/${id}`, payload);
    } else {
      res = await api.post('/api/locatarios', payload);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-locatario').classList.remove('active');
      carregarLocatarios(currentPage);
    } else {
      showToast(res.message || 'Erro ao salvar locatário.', 'error');
      if (id) carregarLocatarios(currentPage);
    }
  } catch (err) {
    showToast(err.message || 'Ocorreu um erro no cadastro.', 'error');
    if (id) carregarLocatarios(currentPage);
  }
}

// Edit handler
window.editarLocatario = async function(id) {
  try {
    const res = await api.get(`/api/locatarios/${id}`);
    if (res.success && res.data) {
      const l = res.data;
      
      document.getElementById('loc-id').value = l.id;
      document.getElementById('codigo').value = l.codigo;
      document.getElementById('tipo_pessoa').value = l.tipo_pessoa;
      
      switchTipoPessoa(l.tipo_pessoa);
      
      document.getElementById('nome_razao_social').value = l.nome_razao_social;
      document.getElementById('nome_fantasia').value = l.nome_fantasia || '';
      document.getElementById('cpf_cnpj').value = l.cpf_cnpj;
      document.getElementById('rg').value = l.rg || '';
      document.getElementById('inscricao_estadual').value = l.inscricao_estadual || '';
      document.getElementById('responsavel').value = l.responsavel || '';
      document.getElementById('telefone').value = l.telefone;
      document.getElementById('email').value = l.email;
      document.getElementById('endereco').value = l.endereco || '';
      document.getElementById('observacoes').value = l.observacoes || '';
      document.getElementById('status').value = l.status;

      document.getElementById('modal-title').textContent = 'Editar Locatário';
      document.getElementById('btn-salvar-locatario').textContent = 'Salvar Alterações';
      
      switchFormTab('dados-gerais');
      document.getElementById('modal-locatario').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar dados do locatário.', 'error');
  }
};

// Excluir handler
window.excluirLocatario = async function(id, nome) {
  if (confirm(`Deseja realmente excluir o locatário "${nome}"? Esta ação é permanente.`)) {
    try {
      const res = await api.delete(`/api/locatarios/${id}`);
      if (res.success) {
        showToast('Locatário excluído com sucesso.', 'success');
        carregarLocatarios(currentPage);
      } else {
        showToast(res.message || 'Erro ao excluir.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Ocorreu um erro de conexão.', 'error');
    }
  }
};

// View Details handler
window.verDetalhes = async function(id) {
  try {
    const res = await api.get(`/api/locatarios/${id}`);
    if (res.success && res.data) {
      const l = res.data;
      currentLocatarioId = l.id;

      // Populate details modal header
      document.getElementById('detalhe-titulo').textContent = l.nome_razao_social;
      
      const badgeTipo = document.getElementById('detalhe-badge-tipo');
      badgeTipo.textContent = l.tipo_pessoa;
      badgeTipo.className = `badge ${l.tipo_pessoa === 'PF' ? 'badge-pf' : 'badge-pj'}`;

      const badgeStatus = document.getElementById('detalhe-badge-status');
      badgeStatus.textContent = l.status === 'ativo' ? 'Ativo' : 'Inativo';
      badgeStatus.className = `badge ${l.status === 'ativo' ? 'badge-ativo' : 'badge-inativo'}`;

      // Populate Tab: Dados Gerais
      document.getElementById('det-codigo').textContent = l.codigo;
      document.getElementById('det-documento').textContent = formatCpfCnpj(l.cpf_cnpj);
      document.getElementById('det-telefone').textContent = formatTelefone(l.telefone);
      document.getElementById('det-email').textContent = l.email;
      document.getElementById('det-endereco').textContent = l.endereco || 'Não informado';
      document.getElementById('det-observacoes').textContent = l.observacoes || 'Nenhuma observação interna.';

      const labelDoc = document.getElementById('det-label-doc');
      labelDoc.textContent = l.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ';

      const containerRg = document.getElementById('det-container-rg');
      const containerIe = document.getElementById('det-container-ie');
      const containerResp = document.getElementById('det-container-responsavel');

      if (l.tipo_pessoa === 'PF') {
        containerRg.style.display = 'block';
        containerIe.style.display = 'none';
        containerResp.style.display = 'none';
        document.getElementById('det-rg').textContent = l.rg || '-';
      } else {
        containerRg.style.display = 'none';
        containerIe.style.display = 'block';
        containerResp.style.display = 'block';
        document.getElementById('det-ie').textContent = l.inscricao_estadual || '-';
        document.getElementById('det-responsavel').textContent = l.responsavel || '-';
      }

      // Populate counts on navigation tab labels
      document.getElementById('det-doc-count').textContent = l.documentos ? l.documentos.length : 0;
      document.getElementById('det-contrato-count').textContent = l.contratos ? l.contratos.length : 0;
      document.getElementById('det-imovel-count').textContent = l.imoveis ? l.imoveis.length : 0;
      document.getElementById('det-recebimento-count').textContent = l.recebimentos ? l.recebimentos.length : 0;

      // Populate document type options dynamically
      popularTiposDocumento(l.tipo_pessoa);

      // Render Sub Tabs Content
      renderDetalheDocumentos(l.documentos);
      renderDetalheContratos(l.contratos);
      renderDetalheImoveis(l.imoveis);
      renderDetalheRecebimentos(l.recebimentos);
      renderDetalheTimeline(l.timeline);

      // Open details modal
      switchDetailTab('det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    console.error('Error opening locatario details:', err);
    showToast('Erro ao carregar ficha do locatário.', 'error');
  }
};

function renderDetalheDocumentos(docs) {
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

    const dateVal = formatDate(d.criado_em);

    return `
      <div class="document-item animate-fade-in">
        <div class="document-info">
          <i class="fi fi-rr-document-signed document-icon"></i>
          <div>
            <strong style="font-size:13px; color:var(--color-text-main); display:block;">${d.tipo_documento}</strong>
            <span style="font-size:11px; color:var(--color-text-muted);">${d.nome_arquivo} • Enviado em ${dateVal}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <a href="${d.caminho_arquivo}" target="_blank" class="btn btn-secondary btn-icon" style="height:32px; width:32px;" title="Download"><i class="fi fi-rr-download"></i></a>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join('');
}

function renderDetalheContratos(contratos) {
  const tbody = document.getElementById('det-contratos-list-body');
  if (!contratos || contratos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum contrato ativo ou encerrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = contratos.map(c => {
    const formattedVal = formatCurrency(c.valor_mensal);
    const startVal = formatDate(c.data_inicio);
    const endVal = formatDate(c.data_fim);
    
    let badgeClass = 'badge-pf';
    if (c.status === 'Ativo') badgeClass = 'badge-ativo';
    if (c.status === 'Encerrado' || c.status === 'Cancelado') badgeClass = 'badge-inativo';

    return `
      <tr>
        <td><strong>${c.numero_contrato}</strong></td>
        <td>${c.imovel_nome}</td>
        <td>${startVal}</td>
        <td>${endVal}</td>
        <td>${formattedVal}</td>
        <td><span class="badge ${badgeClass}">${c.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderDetalheImoveis(imoveis) {
  const tbody = document.getElementById('det-imoveis-list-body');
  if (!imoveis || imoveis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum imóvel vinculado.</td></tr>`;
    return;
  }

  tbody.innerHTML = imoveis.map(i => {
    const formattedVal = formatCurrency(i.valor_locacao);
    
    let badgeClass = 'badge-pf';
    if (i.status === 'Disponível') badgeClass = 'badge-ativo';
    if (i.status === 'Alugado') badgeClass = 'badge-pf';
    if (i.status === 'Inativo') badgeClass = 'badge-inativo';

    return `
      <tr>
        <td><strong>${i.codigo}</strong></td>
        <td>${i.nome}</td>
        <td>${i.tipo}</td>
        <td><span class="badge ${badgeClass}">${i.status}</span></td>
        <td>${formattedVal}</td>
      </tr>
    `;
  }).join('');
}

function renderDetalheRecebimentos(recebimentos) {
  const tbody = document.getElementById('det-recebimentos-list-body');
  if (!recebimentos || recebimentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum recebimento de aluguel.</td></tr>`;
    return;
  }

  tbody.innerHTML = recebimentos.map(r => {
    const compVal = formatDate(r.competencia);
    const vencVal = formatDate(r.vencimento);
    const prevVal = formatCurrency(r.valor_previsto);
    const recVal = r.valor_recebido ? formatCurrency(r.valor_recebido) : '-';
    
    let badgeClass = 'badge-pf';
    if (r.status === 'Pago') badgeClass = 'badge-ativo';
    if (r.status === 'Vencido') badgeClass = 'badge-inativo';
    if (r.status === 'Parcial') badgeClass = 'badge-pj';
    if (r.status === 'A Vencer') badgeClass = 'badge-pf';

    return `
      <tr>
        <td><strong>${r.numero_contrato}</strong></td>
        <td>${compVal}</td>
        <td>${vencVal}</td>
        <td>${prevVal}</td>
        <td>${recVal}</td>
        <td><span class="badge ${badgeClass}">${r.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderDetalheTimeline(timeline) {
  const container = document.getElementById('det-timeline-list');
  if (!timeline || timeline.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum histórico registrado.</div>`;
    return;
  }

  container.innerHTML = timeline.map(t => {
    const dateVal = new Date(t.data_hora).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="timeline-item animate-fade-in">
        <div class="timeline-time">${dateVal} por <strong>${t.usuario_nome || 'Sistema'}</strong></div>
        <div class="timeline-title">${t.acao}</div>
        <p class="timeline-desc">${t.descricao}</p>
      </div>
    `;
  }).join('');
}

// Upload document handler
async function handleUploadDocumento(e) {
  e.preventDefault();
  const fileInput = document.getElementById('doc-arquivo');
  const typeSelect = document.getElementById('doc-tipo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo para fazer upload.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const tipoDocumento = typeSelect.value;
  
  // Custom size validation before fetch: 10MB image, 20MB PDF
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const isImage = /\.(jpg|jpeg|png)$/.test(extension);
  if (isImage && file.size > 10 * 1024 * 1024) {
    showToast('Limite excedido: Imagens devem possuir no máximo 10 MB.', 'error');
    return;
  }
  if (extension === '.pdf' && file.size > 20 * 1024 * 1024) {
    showToast('Limite excedido: PDFs devem possuir no máximo 20 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_documento', tipoDocumento);

  showLoader();
  try {
    const res = await api.post(`/api/locatarios/${currentLocatarioId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = ''; // clear file
      
      // Reload documents and update counters
      const resDetails = await api.get(`/api/locatarios/${currentLocatarioId}`);
      if (resDetails.success && resDetails.data) {
        document.getElementById('det-doc-count').textContent = resDetails.data.documentos.length;
        renderDetalheDocumentos(resDetails.data.documentos);
        renderDetalheTimeline(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao anexar arquivo.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha no upload do arquivo.', 'error');
  } finally {
    hideLoader();
  }
}

// Delete document handler
window.excluirDocumento = async function(documentoId) {
  if (confirm('Deseja realmente remover este documento? Esta ação não pode ser desfeita.')) {
    showLoader();
    try {
      const res = await api.delete(`/api/locatarios/${currentLocatarioId}/documentos/${documentoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload documents and timeline
        const resDetails = await api.get(`/api/locatarios/${currentLocatarioId}`);
        if (resDetails.success && resDetails.data) {
          document.getElementById('det-doc-count').textContent = resDetails.data.documentos.length;
          renderDetalheDocumentos(resDetails.data.documentos);
          renderDetalheTimeline(resDetails.data.timeline);
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
