// Imóveis Módulo JavaScript Controller (Fase 06)

let currentPage = 1;
const limit = 10;
let currentFilters = { busca: '', status: '', tipo: '', proprietario: '' };
let currentImovelId = null; // Used for documents and gallery uploads
let userProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/imoveis') {
    initImoveis();
  }
});

// Format helpers
function formatCurrency(val) {
  if (val === null || val === undefined) return '-';
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed);
}

function formatDate(val) {
  if (!val) return '-';
  
  // Prevent UTC offset issues
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

async function initImoveis() {
  // 1. Get user profile and configure buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        const btnNew = document.getElementById('btn-novo-imovel');
        if (btnNew) btnNew.style.display = 'inline-flex';
        
        const galleryUploadForm = document.getElementById('gallery-upload-container');
        if (galleryUploadForm) galleryUploadForm.style.display = 'block';

        const docUploadForm = document.getElementById('document-upload-container');
        if (docUploadForm) docUploadForm.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile details:', err);
  }

  // 2. Populate owners dropdowns
  await popularProprietarios();

  // 3. Load initial list and cards stats
  await carregarImoveis(currentPage);
  await carregarCardsStats();

  // 4. Register Event Listeners
  setupEventListeners();
}

// Fetch and populate owners dropdown select
async function popularProprietarios() {
  try {
    const res = await api.get('/api/proprietarios?limit=1000&status=ativo');
    if (res.success && res.data) {
      const filterSelect = document.getElementById('filtro-proprietario');
      const formSelect = document.getElementById('proprietario_id');
      
      const options = res.data.map(p => `<option value="${p.id}">${p.nome_razao_social} (${p.codigo})</option>`).join('');
      
      if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Todos</option>' + options;
      }
      if (formSelect) {
        formSelect.innerHTML = '<option value="" disabled selected>Selecione um proprietário</option>' + options;
      }
    }
  } catch (err) {
    console.error('Error loading owners for dropdowns:', err);
  }
}

// Fetch and render statistics count cards
async function carregarCardsStats() {
  try {
    const res = await api.get('/api/imoveis/cards');
    if (res.success && res.data) {
      const stats = res.data;
      document.getElementById('card-total').textContent = stats.total;
      document.getElementById('card-disponiveis').textContent = stats.disponiveis;
      document.getElementById('card-alugados').textContent = stats.alugados;
      document.getElementById('card-reservados').textContent = stats.reservados;
      document.getElementById('card-manutencao').textContent = stats.manutencao;
    }
  } catch (err) {
    console.error('Error loading card stats:', err);
  }
}

function setupEventListeners() {
  // Filters
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    currentFilters.busca = document.getElementById('filtro-busca').value.trim();
    currentFilters.tipo = document.getElementById('filtro-tipo').value;
    currentFilters.status = document.getElementById('filtro-status').value;
    currentFilters.proprietario = document.getElementById('filtro-proprietario').value;
    currentPage = 1;
    carregarImoveis(currentPage);
  });

  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-proprietario').value = '';
    currentFilters = { busca: '', status: '', tipo: '', proprietario: '' };
    currentPage = 1;
    carregarImoveis(currentPage);
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      carregarImoveis(currentPage);
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    carregarImoveis(currentPage);
  });

  // Exports
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.location.href = `/api/imoveis/exportar/excel?${query}`;
  });

  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const query = new URLSearchParams(currentFilters).toString();
    window.open(`/api/imoveis/exportar/pdf?${query}`, '_blank');
  });

  // Modal open/close actions
  const modalForm = document.getElementById('modal-imovel');
  const btnNovo = document.getElementById('btn-novo-imovel');
  
  if (btnNovo) {
    btnNovo.addEventListener('click', () => {
      document.getElementById('form-imovel').reset();
      document.getElementById('imovel-id').value = '';
      document.getElementById('modal-title').textContent = 'Novo Imóvel';
      document.getElementById('btn-salvar-imovel').textContent = 'Cadastrar';
      
      // Hide preview container and dropzone preview class
      document.getElementById('preview-container').style.display = 'none';
      document.getElementById('img-preview').src = '';
      const dropzoneEl = document.getElementById('foto-principal-dropzone');
      if (dropzoneEl) dropzoneEl.classList.remove('has-preview');
      
      // Select default tab
      switchFormTab('dados-gerais');
      
      modalForm.classList.add('active');
    });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modalForm.classList.remove('active');
  });
  document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
    modalForm.classList.remove('active');
  });

  // Main photo input preview trigger
  const fileInputEl = document.getElementById('foto_principal');
  const dropzoneEl = document.getElementById('foto-principal-dropzone');

  if (fileInputEl) {
    fileInputEl.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const previewContainer = document.getElementById('preview-container');
      const previewImg = document.getElementById('img-preview');
      
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          previewContainer.style.display = 'block';
          if (dropzoneEl) dropzoneEl.classList.add('has-preview');
        };
        reader.readAsDataURL(file);
      } else {
        previewImg.src = '';
        previewContainer.style.display = 'none';
        if (dropzoneEl) dropzoneEl.classList.remove('has-preview');
      }
    });
  }

  // Interative Dropzone Click & Drag Event Listeners
  if (dropzoneEl && fileInputEl) {
    dropzoneEl.addEventListener('click', (e) => {
      // Avoid triggering multiple click events if user clicks directly on hidden input
      if (e.target !== fileInputEl) {
        fileInputEl.click();
      }
    });

    // Drag events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.style.borderColor = 'var(--color-primary)';
        dropzoneEl.style.backgroundColor = 'var(--color-primary-light)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.style.borderColor = 'var(--color-border)';
        dropzoneEl.style.backgroundColor = 'var(--color-bg-base)';
      }, false);
    });

    dropzoneEl.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        fileInputEl.files = files;
        // Trigger change event programmatically to render preview
        const event = new Event('change', { bubbles: true });
        fileInputEl.dispatchEvent(event);
      }
    }, false);
  }

  // Form Switch tabs (General vs Observations)
  document.querySelectorAll('[data-form-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchFormTab(btn.getAttribute('data-form-tab'));
    });
  });

  // Form Submit (Save/Update)
  document.getElementById('form-imovel').addEventListener('submit', handleSaveImovel);

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

  // Document Type selection change vencimento fields display toggle
  document.getElementById('doc-tipo').addEventListener('change', (e) => {
    toggleVencimentoFields(e.target.value);
  });

  // Document Upload Form
  document.getElementById('form-upload-documento').addEventListener('submit', handleUploadDocumento);

  // Gallery photo upload form
  document.getElementById('form-upload-galeria').addEventListener('submit', handleUploadFoto);
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

// Hides/Shows conditional vencimento dates based on document type
function toggleVencimentoFields(tipoDoc) {
  const groupEmissao = document.getElementById('group-data-emissao');
  const groupVencimento = document.getElementById('group-data-vencimento');
  const inputEmissao = document.getElementById('doc-emissao');
  const inputVencimento = document.getElementById('doc-vencimento');
  
  const hasVencimento = ['IPTU', 'Alvará', 'AVCB', 'Seguro'].includes(tipoDoc);
  
  if (hasVencimento) {
    groupEmissao.style.display = 'block';
    groupVencimento.style.display = 'block';
  } else {
    groupEmissao.style.display = 'none';
    groupVencimento.style.display = 'none';
    inputEmissao.value = '';
    inputVencimento.value = '';
  }
}

// Load List data
async function carregarImoveis(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...currentFilters
    }).toString();

    const res = await api.get(`/api/imoveis?${query}`);
    const tbody = document.getElementById('imoveis-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Nenhum imóvel encontrado.</td></tr>`;
      document.getElementById('pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(i => {
      const formattedVal = formatCurrency(i.valor_locacao);
      const isInactive = i.status === 'Inativo';
      
      let badgeClass = 'badge-disponivel';
      if (i.status === 'Alugado') badgeClass = 'badge-alugado';
      if (i.status === 'Reservado') badgeClass = 'badge-reservado';
      if (i.status === 'Manutenção') badgeClass = 'badge-manutencao';
      if (i.status === 'Inativo') badgeClass = 'badge-inativo';

      // Action buttons based on profile
      let actions = `<button onclick="verDetalhes('${i.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i></button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarImovel('${i.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i></button>`;
      }
      if (userProfile === 'administrador') {
        actions += `<button onclick="excluirImovel('${i.id}', '${i.nome}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Excluir"><i class="fi fi-rr-trash"></i></button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${i.codigo}</strong></td>
          <td>${i.nome}</td>
          <td>${i.tipo}</td>
          <td>${i.proprietario_nome || 'Nenhum'}</td>
          <td>${formattedVal}</td>
          <td><span class="badge ${badgeClass}">${i.status}</span></td>
          <td style="text-align: center;">${i.contratos_ativos || 0}</td>
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
    showToast('Erro ao obter imóveis.', 'error');
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
async function handleSaveImovel(e) {
  e.preventDefault();
  const id = document.getElementById('imovel-id').value;
  
  const formData = new FormData(document.getElementById('form-imovel'));

  // Custom size validation for foto_principal
  const fileInput = document.getElementById('foto_principal');
  if (fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) {
      showToast('Limite excedido: Imagem principal deve possuir no máximo 10 MB.', 'error');
      return;
    }
  }

  showLoader();
  try {
    let res;
    if (id) {
      // Use raw request to support multipart PUT
      res = await api.request('PUT', `/api/imoveis/${id}`, formData, true);
    } else {
      res = await api.post('/api/imoveis', formData, true);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-imovel').classList.remove('active');
      carregarImoveis(currentPage);
      carregarCardsStats();
    } else {
      showToast(res.message || 'Erro ao salvar imóvel.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Ocorreu um erro no cadastro.', 'error');
  } finally {
    hideLoader();
  }
}

// Edit handler
window.editarImovel = async function(id) {
  try {
    const res = await api.get(`/api/imoveis/${id}`);
    if (res.success && res.data) {
      const i = res.data;
      
      document.getElementById('imovel-id').value = i.id;
      document.getElementById('codigo').value = i.codigo;
      document.getElementById('tipo').value = i.tipo;
      document.getElementById('nome').value = i.nome;
      document.getElementById('proprietario_id').value = i.proprietario_id;
      document.getElementById('area_total').value = i.area_total;
      document.getElementById('valor_locacao').value = i.valor_locacao;
      document.getElementById('status').value = i.status;
      document.getElementById('endereco').value = i.endereco;
      document.getElementById('observacoes').value = i.observacoes || '';

      const previewContainer = document.getElementById('preview-container');
      const previewImg = document.getElementById('img-preview');
      const dropzone = document.getElementById('foto-principal-dropzone');
      
      if (i.foto_principal) {
        previewImg.src = i.foto_principal;
        previewContainer.style.display = 'block';
        if (dropzone) dropzone.classList.add('has-preview');
      } else {
        previewImg.src = '';
        previewContainer.style.display = 'none';
        if (dropzone) dropzone.classList.remove('has-preview');
      }

      document.getElementById('modal-title').textContent = 'Editar Imóvel';
      document.getElementById('btn-salvar-imovel').textContent = 'Salvar Alterações';
      
      switchFormTab('dados-gerais');
      document.getElementById('modal-imovel').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar dados do imóvel.', 'error');
  }
};

// Excluir handler
window.excluirImovel = async function(id, nome) {
  if (confirm(`Deseja realmente excluir o imóvel "${nome}"?\nEsta ação removerá definitivamente o imóvel do sistema. Se houver contratos ativos vinculados, a exclusão não será permitida.`)) {
    try {
      const res = await api.delete(`/api/imoveis/${id}`);
      if (res.success) {
        showToast('Imóvel excluído com sucesso.', 'success');
        carregarImoveis(currentPage);
        carregarCardsStats();
      } else {
        showToast(res.message || 'Erro ao excluir.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Ocorreu um erro ao excluir.', 'error');
    }
  }
};

// View Details Ficha Completa
window.verDetalhes = async function(id) {
  try {
    const res = await api.get(`/api/imoveis/${id}`);
    if (res.success && res.data) {
      const i = res.data;
      currentImovelId = i.id;

      // Banner section header
      document.getElementById('detalhe-header-nome').textContent = i.nome;
      document.getElementById('det-banner-nome').textContent = i.nome;
      document.getElementById('det-banner-codigo').textContent = i.codigo;
      document.getElementById('det-banner-preco').textContent = `${formatCurrency(i.valor_locacao)} / mês`;
      
      const bannerFoto = document.getElementById('det-banner-foto');
      if (i.foto_principal) {
        bannerFoto.style.backgroundImage = `url('${i.foto_principal}')`;
      } else {
        bannerFoto.style.backgroundImage = "url('/img/avatar-default.png')";
      }

      const badgeStatus = document.getElementById('detalhe-badge-status');
      badgeStatus.textContent = i.status;
      
      let badgeClass = 'badge-disponivel';
      if (i.status === 'Alugado') badgeClass = 'badge-alugado';
      if (i.status === 'Reservado') badgeClass = 'badge-reservado';
      if (i.status === 'Manutenção') badgeClass = 'badge-manutencao';
      if (i.status === 'Inativo') badgeClass = 'badge-inativo';
      badgeStatus.className = `badge ${badgeClass}`;

      // Tab Dados Gerais
      document.getElementById('det-codigo').textContent = i.codigo;
      document.getElementById('det-tipo').textContent = i.tipo;
      document.getElementById('det-area').textContent = `${i.area_total} m²`;
      document.getElementById('det-proprietario').textContent = i.proprietario_nome || 'Nenhum';
      document.getElementById('det-endereco').textContent = i.endereco;
      document.getElementById('det-observacoes').textContent = i.observacoes || 'Nenhuma observação cadastrada.';

      // Tab Counts
      document.getElementById('det-doc-count').textContent = i.documentos ? i.documentos.length : 0;
      document.getElementById('det-contrato-count').textContent = i.contratos ? i.contratos.length : 0;
      document.getElementById('det-recebimento-count').textContent = i.recebimentos ? i.recebimentos.length : 0;
      document.getElementById('det-despesa-count').textContent = i.despesas ? i.despesas.length : 0;
      document.getElementById('det-manutencao-count').textContent = i.manutencoes ? i.manutencoes.length : 0;
      document.getElementById('det-vistoria-count').textContent = i.vistorias ? i.vistorias.length : 0;

      // Populate upload type options
      document.getElementById('doc-tipo').value = 'Escritura';
      toggleVencimentoFields('Escritura');

      // Clear input fields
      document.getElementById('doc-arquivo').value = '';
      document.getElementById('foto-arquivo').value = '';

      // Render Sub-resources content
      renderDetalheGaleria(i.fotos);
      renderDetalheDocumentos(i.documentos);
      renderDetalheContratos(i.contratos);
      renderDetalheRecebimentos(i.recebimentos);
      renderDetalheDespesas(i.despesas);
      renderDetalheManutencoes(i.manutencoes);
      renderDetalheVistorias(i.vistorias);
      renderDetalheTimeline(i.timeline);

      // Open details modal
      switchDetailTab('det-gerais');
      document.getElementById('modal-detalhes').classList.add('active');
    }
  } catch (err) {
    console.error('Error fetching imovel details:', err);
    showToast('Erro ao carregar ficha do imóvel.', 'error');
  }
};

// Render gallery photos grid in Details Modal
function renderDetalheGaleria(fotos) {
  const container = document.getElementById('det-galeria-grid');
  if (!fotos || fotos.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); grid-column:span 4; padding:20px;">Nenhuma foto na galeria.</div>`;
    return;
  }

  container.innerHTML = fotos.map(f => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button onclick="excluirFoto('${f.id}')" class="gallery-photo-delete" title="Remover Foto"><i class="fa-solid fa-trash"></i></button>`;
    }
    return `
      <div class="gallery-photo-item animate-fade-in">
        <img src="${f.caminho_arquivo}" class="gallery-photo-img" alt="Gallery photo">
        ${deleteBtn}
      </div>
    `;
  }).join('');
}

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
    
    // Check constraints vencimento info
    let datesInfo = '';
    if (d.data_emissao || d.data_vencimento) {
      const em = d.data_emissao ? formatDate(d.data_emissao) : 'Não inf.';
      const ven = d.data_vencimento ? formatDate(d.data_vencimento) : 'Não inf.';
      datesInfo = `<span style="display:block; font-size:11px; color:var(--color-text-muted); margin-top:2px;">Emissão: ${em} • Vencimento: <strong>${ven}</strong></span>`;
    }

    return `
      <div class="document-item animate-fade-in">
        <div class="document-info">
          <i class="fi fi-rr-document-signed document-icon"></i>
          <div>
            <strong style="font-size:13px; color:var(--color-text-main); display:block;">${d.tipo_documento}</strong>
            <span style="font-size:11px; color:var(--color-text-muted);">${d.nome_arquivo} • Enviado em ${dateVal}</span>
            ${datesInfo}
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
    
    let badgeClass = 'badge-disponivel';
    if (c.status === 'Ativo') badgeClass = 'badge-disponivel';
    if (c.status === 'Encerrado' || c.status === 'Cancelado') badgeClass = 'badge-manutencao';

    // Allow redirection/opening contract details if contract module exists
    const contractLink = `/contratos#${c.id}`;

    return `
      <tr>
        <td><strong><a href="${contractLink}" style="color:var(--color-primary); font-weight:700;">${c.numero_contrato}</a></strong></td>
        <td>${c.locatario_nome}</td>
        <td>${startVal}</td>
        <td>${endVal}</td>
        <td>${formattedVal}</td>
        <td><span class="badge ${badgeClass}">${c.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderDetalheRecebimentos(recebimentos) {
  const tbody = document.getElementById('det-recebimentos-list-body');
  if (!recebimentos || recebimentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum recebimento registrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = recebimentos.map(r => {
    const compVal = formatDate(r.competencia);
    const vencVal = formatDate(r.vencimento);
    const prevVal = formatCurrency(r.valor_previsto);
    const recVal = r.valor_recebido ? formatCurrency(r.valor_recebido) : '-';
    
    let badgeClass = 'badge-disponivel';
    if (r.status === 'Pago') badgeClass = 'badge-disponivel';
    if (r.status === 'Vencido') badgeClass = 'badge-manutencao';
    if (r.status === 'Parcial') badgeClass = 'badge-alugado';
    if (r.status === 'A Vencer') badgeClass = 'badge-disponivel';

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

function renderDetalheDespesas(despesas) {
  const tbody = document.getElementById('det-despesas-list-body');
  if (!despesas || despesas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhuma despesa cadastrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = despesas.map(d => {
    const val = formatCurrency(d.valor);
    const venc = formatDate(d.vencimento);
    
    let badgeClass = 'badge-disponivel';
    if (d.status === 'Pago') badgeClass = 'badge-disponivel';
    if (d.status === 'Vencido') badgeClass = 'badge-manutencao';
    if (d.status === 'A Vencer') badgeClass = 'badge-reservado';

    return `
      <tr>
        <td><strong>${d.categoria}</strong></td>
        <td>${d.responsavel}</td>
        <td>${val}</td>
        <td>${venc}</td>
        <td><span class="badge ${badgeClass}">${d.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderDetalheManutencoes(manutencoes) {
  const tbody = document.getElementById('det-manutencoes-list-body');
  if (!manutencoes || manutencoes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhuma manutenção registrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = manutencoes.map(m => {
    const prevDate = formatDate(m.data_prevista);
    const valReal = formatCurrency(m.valor_real);
    const maintenanceLink = `/manutencoes#${m.id}`;
    
    let badgeClass = 'badge-disponivel';
    if (m.status === 'Planejada') badgeClass = 'badge-reservado';
    if (m.status === 'Em Andamento') badgeClass = 'badge-alugado';
    if (m.status === 'Concluída') badgeClass = 'badge-disponivel';
    if (m.status === 'Cancelada') badgeClass = 'badge-inativo';

    return `
      <tr>
        <td><strong><a href="${maintenanceLink}" style="color:var(--color-primary); font-weight:700;">${m.codigo}</a></strong></td>
        <td>${m.tipo}</td>
        <td>${m.titulo}</td>
        <td>${prevDate}</td>
        <td>${valReal}</td>
        <td><span class="badge ${badgeClass}">${m.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderDetalheVistorias(vistorias) {
  const tbody = document.getElementById('det-vistorias-list-body');
  if (!vistorias || vistorias.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhuma vistoria registrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = vistorias.map(v => {
    const dataVal = formatDate(v.data_vistoria || v.data);
    
    let badgeClass = 'badge-planejada';
    if (v.status === 'Em Andamento') badgeClass = 'badge-em-andamento';
    if (v.status === 'Concluída') badgeClass = 'badge-concluida';
    if (v.status === 'Cancelada') badgeClass = 'badge-cancelada';

    return `
      <tr>
        <td><strong><a href="/vistorias#${v.id}" style="color:var(--color-primary); font-weight:700;">${dataVal}</a></strong></td>
        <td>${v.tipo}</td>
        <td><span class="badge ${badgeClass}">${v.status}</span></td>
        <td>${v.responsavel}</td>
      </tr>
    `;
  }).join('');
}

function renderDetalheTimeline(timeline) {
  const container = document.getElementById('det-timeline-list');
  if (!timeline || timeline.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum histórico estrutural.</div>`;
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
  const inputEmissao = document.getElementById('doc-emissao');
  const inputVencimento = document.getElementById('doc-vencimento');

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
  
  if (inputEmissao.value) {
    formData.append('data_emissao', inputEmissao.value);
  }
  if (inputVencimento.value) {
    formData.append('data_vencimento', inputVencimento.value);
  }

  showLoader();
  try {
    const res = await api.post(`/api/imoveis/${currentImovelId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      
      // Clear inputs
      fileInput.value = '';
      inputEmissao.value = '';
      inputVencimento.value = '';
      
      // Reload documents and update counters
      const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
      if (resDetails.success && resDetails.data) {
        document.getElementById('det-doc-count').textContent = resDetails.data.documentos.length;
        renderDetalheDocumentos(resDetails.data.documentos);
        renderDetalheTimeline(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao anexar arquivo.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha no upload do documento.', 'error');
  } finally {
    hideLoader();
  }
}

// Delete document handler
window.excluirDocumento = async function(documentoId) {
  if (confirm('Deseja realmente remover este documento? Esta ação não pode ser desfeita.')) {
    showLoader();
    try {
      const res = await api.delete(`/api/imoveis/${currentImovelId}/documentos/${documentoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload documents and timeline
        const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
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

// Upload photo handler
async function handleUploadFoto(e) {
  e.preventDefault();
  const fileInput = document.getElementById('foto-arquivo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha uma imagem para fazer upload.', 'error');
    return;
  }

  const file = fileInput.files[0];
  
  // Custom size validation before fetch: 10MB image
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const isImage = /\.(jpg|jpeg|png)$/.test(extension);
  if (!isImage) {
    showToast('Apenas formatos de imagem (JPG, JPEG, PNG) são aceitos.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('Limite excedido: Imagem de galeria deve possuir no máximo 10 MB.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('arquivo', file);

  showLoader();
  try {
    const res = await api.post(`/api/imoveis/${currentImovelId}/fotos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';
      
      // Reload photos and update timeline
      const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
      if (resDetails.success && resDetails.data) {
        renderDetalheGaleria(resDetails.data.fotos);
        renderDetalheTimeline(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao anexar foto.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha no upload da foto.', 'error');
  } finally {
    hideLoader();
  }
}

// Delete photo handler
window.excluirFoto = async function(fotoId) {
  if (confirm('Deseja realmente remover esta foto da galeria?')) {
    showLoader();
    try {
      const res = await api.delete(`/api/imoveis/${currentImovelId}/fotos/${fotoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload photos and timeline
        const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
        if (resDetails.success && resDetails.data) {
          renderDetalheGaleria(resDetails.data.fotos);
          renderDetalheTimeline(resDetails.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover foto.', 'error');
      }
    } catch (err) {
      showToast('Falha na remoção da foto.', 'error');
    } finally {
      hideLoader();
    }
  }
};
