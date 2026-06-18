// Proprietários Módulo JavaScript Controller (Fase 04)

let currentPage = 1;
const limit = 10;
let currentFilters = { busca: '', status: '', tipo: '' };
let currentProprietarioId = null; // Used for documents upload reference
let userProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/proprietarios') {
    initProprietarios();
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

async function initProprietarios() {
  // 1. Get user role and config view buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        const btnNew = document.getElementById('btn-novo-proprietario');
        if (btnNew) btnNew.style.display = 'inline-flex';
        
        const docUploadForm = document.getElementById('document-upload-container');
        if (docUploadForm) docUploadForm.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile details:', err);
  }

  // 2. Load list data
  await carregarProprietarios(currentPage);

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
    carregarProprietarios(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-status').value = '';
    currentFilters = { busca: '', status: '', tipo: '' };
    currentPage = 1;
    carregarProprietarios(currentPage);
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      carregarProprietarios(currentPage);
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    carregarProprietarios(currentPage);
  });

  // Exports
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.location.href = `/api/proprietarios/exportar/excel?${query}`;
  });

  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.open(`/api/proprietarios/exportar/pdf?${query}`, '_blank');
  });

  // Modal open/close actions
  const modalForm = document.getElementById('modal-proprietario');
  const btnNovo = document.getElementById('btn-novo-proprietario');
  
  if (btnNovo) {
    btnNovo.addEventListener('click', () => {
      document.getElementById('form-proprietario').reset();
      document.getElementById('prop-id').value = '';
      document.getElementById('modal-title').textContent = 'Novo Proprietário';
      document.getElementById('btn-salvar-proprietario').textContent = 'Cadastrar';
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
  document.getElementById('form-proprietario').addEventListener('submit', handleSaveProprietario);

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
  } else {
    labelNome.textContent = 'Razão Social';
    inputNome.placeholder = 'Razão Social da empresa';
    labelDocumento.textContent = 'CNPJ';
    inputDocumento.placeholder = '00.000.000/0000-00';
    
    groupFantasia.style.display = 'block';
    groupRg.style.display = 'none';
    groupIe.style.display = 'block';
    groupResponsavel.style.display = 'block';
  }
}

// Load List data
async function carregarProprietarios(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/proprietarios?${query}`);
    const tbody = document.getElementById('proprietarios-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Nenhum proprietário encontrado.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(p => {
      const formattedDoc = formatCpfCnpj(p.cpf_cnpj);
      const formattedPhone = formatTelefone(p.telefone);
      const isInactive = p.status === 'inativo';
      const badgeClass = isInactive ? 'badge-inativo' : 'badge-ativo';
      const badgeText = isInactive ? 'Inativo' : 'Ativo';

      // Action buttons based on profile
      let actions = `<button onclick="verDetalhes('${p.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i></button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarProprietario('${p.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i></button>`;
      }
      if (userProfile === 'administrador') {
        actions += `<button onclick="excluirProprietario('${p.id}', '${p.nome_razao_social}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Excluir"><i class="fi fi-rr-trash"></i></button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${p.codigo}</strong></td>
          <td>${p.nome_razao_social}</td>
          <td>${formattedDoc}</td>
          <td>${formattedPhone}</td>
          <td>${p.email}</td>
          <td style="text-align: center;">${p.qtd_imoveis || 0}</td>
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
    showToast('Erro ao obter proprietários.', 'error');
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
async function handleSaveProprietario(e) {
  e.preventDefault();
  const id = document.getElementById('prop-id').value;
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
      // Se for edição, atualiza o status separadamente (rota PATCH não revalida CPF/CNPJ)
      const statusRes = await api.patch(`/api/proprietarios/${id}/status`, { status: novoStatus });
      if (!statusRes.success) {
        showToast(statusRes.message || 'Erro ao atualizar status.', 'error');
        return;
      }
      // Atualiza demais dados via PUT
      res = await api.put(`/api/proprietarios/${id}`, payload);
    } else {
      res = await api.post('/api/proprietarios', payload);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-proprietario').classList.remove('active');
      carregarProprietarios(currentPage);
    } else {
      showToast(res.message || 'Erro ao salvar proprietário.', 'error');
      // Mesmo que o PUT falhe, o status já foi atualizado — recarregar para refletir
      if (id) carregarProprietarios(currentPage);
    }
  } catch (err) {
    showToast(err.message || 'Ocorreu um erro no cadastro.', 'error');
    if (id) carregarProprietarios(currentPage);
  }
}

// Edit handler
window.editarProprietario = async function(id) {
  try {
    const res = await api.get(`/api/proprietarios/${id}`);
    if (res.success && res.data) {
      const p = res.data;
      
      document.getElementById('prop-id').value = p.id;
      document.getElementById('codigo').value = p.codigo;
      document.getElementById('tipo_pessoa').value = p.tipo_pessoa;
      
      switchTipoPessoa(p.tipo_pessoa);
      
      document.getElementById('nome_razao_social').value = p.nome_razao_social;
      document.getElementById('nome_fantasia').value = p.nome_fantasia || '';
      document.getElementById('cpf_cnpj').value = p.cpf_cnpj;
      document.getElementById('rg').value = p.rg || '';
      document.getElementById('inscricao_estadual').value = p.inscricao_estadual || '';
      document.getElementById('responsavel').value = p.responsavel || '';
      document.getElementById('telefone').value = p.telefone;
      document.getElementById('email').value = p.email;
      document.getElementById('endereco').value = p.endereco || '';
      document.getElementById('observacoes').value = p.observacoes || '';
      document.getElementById('status').value = p.status;

      document.getElementById('modal-title').textContent = 'Editar Proprietário';
      document.getElementById('btn-salvar-proprietario').textContent = 'Salvar Alterações';
      
      switchFormTab('dados-gerais');
      document.getElementById('modal-proprietario').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar dados do proprietário.', 'error');
  }
};

// Excluir handler
window.excluirProprietario = async function(id, nome) {
  if (confirm(`Deseja realmente excluir o proprietário "${nome}"? Esta ação é permanente.`)) {
    try {
      const res = await api.delete(`/api/proprietarios/${id}`);
      if (res.success) {
        showToast('Proprietário excluído com sucesso.', 'success');
        carregarProprietarios(currentPage);
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
    const res = await api.get(`/api/proprietarios/${id}`);
    if (res.success && res.data) {
      const p = res.data;
      currentProprietarioId = p.id;

      // Populate details modal header
      document.getElementById('detalhe-titulo').textContent = p.nome_razao_social;
      
      const badgeTipo = document.getElementById('detalhe-badge-tipo');
      badgeTipo.textContent = p.tipo_pessoa;
      badgeTipo.className = `badge ${p.tipo_pessoa === 'PF' ? 'badge-pf' : 'badge-pj'}`;

      const badgeStatus = document.getElementById('detalhe-badge-status');
      badgeStatus.textContent = p.status === 'ativo' ? 'Ativo' : 'Inativo';
      badgeStatus.className = `badge ${p.status === 'ativo' ? 'badge-ativo' : 'badge-inativo'}`;

      // Populate Tab: Dados Gerais
      document.getElementById('det-codigo').textContent = p.codigo;
      document.getElementById('det-documento').textContent = formatCpfCnpj(p.cpf_cnpj);
      document.getElementById('det-telefone').textContent = formatTelefone(p.telefone);
      document.getElementById('det-email').textContent = p.email;
      document.getElementById('det-endereco').textContent = p.endereco || 'Não informado';
      document.getElementById('det-observacoes').textContent = p.observacoes || 'Nenhuma observação interna.';

      const labelDoc = document.getElementById('det-label-doc');
      labelDoc.textContent = p.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ';

      const containerRg = document.getElementById('det-container-rg');
      const containerIe = document.getElementById('det-container-ie');
      const containerResp = document.getElementById('det-container-responsavel');

      if (p.tipo_pessoa === 'PF') {
        containerRg.style.display = 'block';
        containerIe.style.display = 'none';
        containerResp.style.display = 'none';
        document.getElementById('det-rg').textContent = p.rg || '-';
      } else {
        containerRg.style.display = 'none';
        containerIe.style.display = 'block';
        containerResp.style.display = 'block';
        document.getElementById('det-ie').textContent = p.inscricao_estadual || '-';
        document.getElementById('det-responsavel').textContent = p.responsavel || '-';
      }

      // Populate counts on navigation tab labels
      document.getElementById('det-doc-count').textContent = p.documentos ? p.documentos.length : 0;
      document.getElementById('det-imovel-count').textContent = p.imoveis ? p.imoveis.length : 0;

      // Render Tab: Documentos
      renderDetalheDocumentos(p.documentos);

      // Render Tab: Imóveis
      renderDetalheImoveis(p.imoveis);

      // Render Tab: Timeline / Histórico
      renderDetalheTimeline(p.timeline);

      // Open details modal
      switchDetailTab('det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao carregar ficha do proprietário.', 'error');
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

    const dateVal = new Date(d.criado_em).toLocaleDateString('pt-BR');

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

function renderDetalheImoveis(imoveis) {
  const tbody = document.getElementById('det-imoveis-list-body');
  if (!imoveis || imoveis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum imóvel vinculado a este proprietário.</td></tr>`;
    return;
  }

  tbody.innerHTML = imoveis.map(i => {
    // Formatar moeda
    const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor_locacao);
    
    return `
      <tr>
        <td><strong>${i.codigo}</strong></td>
        <td>${i.nome}</td>
        <td>${i.tipo}</td>
        <td><span class="badge ${i.status === 'Disponível' ? 'badge-ativo' : 'badge-pf'}">${i.status}</span></td>
        <td>${formattedVal}</td>
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
    const res = await api.post(`/api/proprietarios/${currentProprietarioId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = ''; // clear file
      
      // Reload documents and update counters
      const resDetails = await api.get(`/api/proprietarios/${currentProprietarioId}`);
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
      const res = await api.delete(`/api/proprietarios/${currentProprietarioId}/documentos/${documentoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload documents and timeline
        const resDetails = await api.get(`/api/proprietarios/${currentProprietarioId}`);
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
