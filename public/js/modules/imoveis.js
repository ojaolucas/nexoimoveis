// Imóveis Módulo JavaScript Controller (Fase 06)

let currentPage = 1;
let limit = 10;
let currentFilters = { busca: '', status: '', tipo: '', proprietario: '' };
let currentImovelId = null; // Used for documents and gallery uploads
let userProfile = null;
let currentStep = 1;
let isEditMode = false;
let tempDocs = []; // Temporário para cadastro [{tipo: '...', arquivo: File}]
let tempPhotos = []; // Temporário para cadastro [File]

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
  await popularSelectLocatarios();

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
      
      const options = res.data.map(p => `<option value="${p.id}">${p.nome_razao_social}</option>`).join('');
      
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
      document.getElementById('modal-subtitle').textContent = 'Cadastre as informações completas para listar o imóvel no sistema.';
      
      // Hide preview container and dropzone preview class
      document.getElementById('preview-container').style.display = 'none';
      document.getElementById('img-preview').src = '';
      const dropzoneEl = document.getElementById('foto-principal-dropzone');
      if (dropzoneEl) dropzoneEl.classList.remove('has-preview');
      
      // Clear address fields
      ['cep', 'numero', 'complemento', 'bairro', 'cidade', 'estado'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
      });

      // Clear contract fields
      const contrFields = document.getElementById('vincular-contrato-fields');
      if (contrFields) contrFields.style.display = 'none';
      const fileListContrato = document.getElementById('contrato-pdf-file-list');
      if (fileListContrato) fileListContrato.innerHTML = '';
      const dropzoneContrato = document.getElementById('contrato-pdf-dropzone');
      if (dropzoneContrato) dropzoneContrato.classList.remove('has-preview');
      
      isEditMode = false;
      tempDocs = [];
      tempPhotos = [];
      lastSearchCep = '';
      renderTempPhotos();
      renderTempDocs();
      
      // Limpar Mapa
      const mapContainer = document.getElementById('imovel-mapa-container');
      if (mapContainer) {
        mapContainer.innerHTML = `<div id="mapa-placeholder-content" style="text-align: center; color: var(--color-text-muted);">
          <i class="fa-solid fa-map-location-dot" style="font-size: 24px; color: var(--color-primary); opacity: 0.5; margin-bottom: 4px; display: block; margin: 0 auto 6px auto;"></i>
          <span style="font-size: 10px;">Digite um endereço válido para ver o mapa</span>
        </div>`;
      }
      
      // Forçar placeholders limpos
      document.getElementById('tipo').selectedIndex = 0;
      document.getElementById('status').selectedIndex = 0;
      document.getElementById('mobiliado').selectedIndex = 0;
      document.getElementById('aceita_pet').selectedIndex = 0;
      document.getElementById('estado').selectedIndex = 0;
      
      modalForm.classList.add('active');
    });
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modalForm.classList.remove('active');
  });

  const btnCancelarModalImovel = document.getElementById('btn-cancelar-modal-imovel');
  if (btnCancelarModalImovel) {
    btnCancelarModalImovel.addEventListener('click', () => {
      document.getElementById('form-imovel').reset();
      modalForm.classList.remove('active');
    });
  }

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

  // Wizard navigation buttons
  const btnWizardPrev = document.getElementById('wizard-btn-prev');
  if (btnWizardPrev) {
    btnWizardPrev.addEventListener('click', () => {
      document.getElementById('modal-imovel').classList.remove('active');
    });
  }

  // Since we want the form to handle submit correctly, we'll intercept form submit:
  document.getElementById('form-imovel').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveImovel(e);
  });

  // Locatário select link change listener
  const selectVincular = document.getElementById('vincular_locatario_id');
  if (selectVincular) {
    selectVincular.addEventListener('change', (e) => {
      const fields = document.getElementById('vincular-contrato-fields');
      const showFields = e.target.value !== '';
      if (fields) fields.style.display = showFields ? 'block' : 'none';
      
      // Toggle required attributes for contract fields
      ['contrato_data_inicio', 'contrato_data_fim', 'contrato_valor_mensal', 'contrato_dia_vencimento'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          if (showFields) {
            input.setAttribute('required', 'required');
          } else {
            input.removeAttribute('required');
          }
        }
      });
    });
  }

  // Setup Gallery and Document Dropzones inside modal-imovel
  const galInput = document.getElementById('wizard-foto-arquivo');
  if (galInput) {
    galInput.addEventListener('change', (e) => {
      console.log('[Galeria Input] Change disparado! Arquivos selecionados:', e.target.files);
      if (e.target.files && e.target.files.length > 0) {
        handleGalleryFilesSelected(e.target.files);
      }
    });
  }

  const docInput = document.getElementById('wizard-doc-arquivo');
  if (docInput) {
    docInput.addEventListener('change', (e) => {
      console.log('[Documentos Input] Change disparado! Arquivos selecionados:', e.target.files);
      if (e.target.files && e.target.files.length > 0) {
        handleDocFilesSelected(e.target.files);
      }
    });
  }

  // Listener para buscar CEP automaticamente no Imóvel (ao digitar 8 números ou perder o foco)
  const cepInput = document.getElementById('cep');
  if (cepInput) {
    let lastSearchCep = '';
    const buscarCepImovel = async () => {
      const cep = cepInput.value.replace(/\D/g, '');
      if (cep.length === 8) {
        if (cep === lastSearchCep) return; // Evita disparos duplicados (input + blur)
        lastSearchCep = cep;
        try {
          const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await res.json();
          if (data && !data.erro) {
            document.getElementById('endereco').value = data.logradouro || '';
            document.getElementById('bairro').value = data.bairro || '';
            document.getElementById('cidade').value = data.localidade || '';
            document.getElementById('estado').value = data.uf || '';
            atualizarMapaDinamicamente();
            
            const numEl = document.getElementById('numero');
            if (numEl) numEl.focus();
            showToast('Endereço preenchido com sucesso a partir do CEP!', 'success');
          } else {
            showToast('CEP não encontrado.', 'warning');
          }
        } catch (err) {
          console.error(err);
          showToast('Erro ao buscar o CEP.', 'error');
        }
      }
    };
    cepInput.addEventListener('blur', buscarCepImovel);
    cepInput.addEventListener('input', buscarCepImovel);
    
    // Listener de clique no botão de lupa de CEP
    const btnBuscarCep = document.getElementById('btn-buscar-cep');
    if (btnBuscarCep) {
      btnBuscarCep.addEventListener('click', () => {
        // Ao clicar, força a busca ignorando a trava de CEP igual
        lastSearchCep = '';
        buscarCepImovel();
      });
    }
  }

  // Listeners para atualizar o mapa dinamicamente
  ['endereco', 'numero', 'bairro', 'cidade', 'estado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', atualizarMapaDinamicamente);
      el.addEventListener('blur', atualizarMapaDinamicamente);
    }
  });

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

  // Wizard Document Type selection change vencimento fields display toggle
  const wizardDocTipo = document.getElementById('wizard-doc-tipo');
  if (wizardDocTipo) {
    wizardDocTipo.addEventListener('change', (e) => {
      const isLegal = ['Alvará', 'AVCB', 'Seguro'].includes(e.target.value);
      document.getElementById('wizard-group-data-emissao').style.display = isLegal ? 'block' : 'none';
      document.getElementById('wizard-group-data-vencimento').style.display = isLegal ? 'block' : 'none';
    });
  }

  // Wizard Document Upload button click
  const btnWizardUploadDoc = document.getElementById('btn-wizard-upload-documento');
  if (btnWizardUploadDoc) {
    btnWizardUploadDoc.addEventListener('click', handleWizardUploadDocumento);
  }

  // Wizard Gallery upload button click
  const btnWizardUploadGal = document.getElementById('btn-wizard-upload-galeria');
  if (btnWizardUploadGal) {
    btnWizardUploadGal.addEventListener('click', handleWizardUploadGaleria);
  }

  // Toggle gallery upload form
  const btnToggleGal = document.getElementById('btn-toggle-upload-galeria');
  if (btnToggleGal) {
    btnToggleGal.addEventListener('click', () => {
      const container = document.getElementById('gallery-upload-container');
      if (container) {
        const isHidden = container.style.display === 'none';
        container.style.display = isHidden ? 'block' : 'none';
      }
    });
  }

  // Locatário linkage controls
  const btnAbrirLinkLoc = document.getElementById('btn-abrir-link-locatario');
  const btnCancelarLinkLoc = document.getElementById('btn-cancelar-link-locatario');
  const formLinkLoc = document.getElementById('form-link-locatario');

  if (btnAbrirLinkLoc) {
    btnAbrirLinkLoc.addEventListener('click', async () => {
      const container = document.getElementById('locatario-link-container');
      if (container) {
        container.style.display = 'block';
        await popularSelectLocatarios();
      }
    });
  }

  if (btnCancelarLinkLoc) {
    btnCancelarLinkLoc.addEventListener('click', () => {
      const container = document.getElementById('locatario-link-container');
      if (container) container.style.display = 'none';
    });
  }

  if (formLinkLoc) {
    formLinkLoc.addEventListener('submit', handleLinkLocatarioSubmit);
  }

  // Financeiro Sub-tabs switching
  const btnFinReceitas = document.getElementById('btn-fin-receitas');
  const btnFinDespesas = document.getElementById('btn-fin-despesas');

  if (btnFinReceitas && btnFinDespesas) {
    btnFinReceitas.addEventListener('click', () => {
      btnFinReceitas.classList.add('active');
      btnFinDespesas.classList.remove('active');
      document.getElementById('pane-fin-receitas').style.display = 'block';
      document.getElementById('pane-fin-despesas').style.display = 'none';
    });

    btnFinDespesas.addEventListener('click', () => {
      btnFinDespesas.classList.add('active');
      btnFinReceitas.classList.remove('active');
      document.getElementById('pane-fin-despesas').style.display = 'block';
      document.getElementById('pane-fin-receitas').style.display = 'none';
    });
  }

  // Setup Contrato PDF Dropzone
  const contratoInput = document.getElementById('contrato_pdf');
  const contratoDropzone = document.getElementById('contrato-pdf-dropzone');
  if (contratoInput && contratoDropzone) {
    contratoDropzone.addEventListener('click', (e) => {
      if (e.target !== contratoInput) {
        contratoInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      contratoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        contratoDropzone.style.borderColor = 'var(--color-primary)';
        contratoDropzone.style.backgroundColor = 'var(--color-primary-light)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      contratoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        contratoDropzone.style.borderColor = 'var(--color-border)';
        contratoDropzone.style.backgroundColor = 'var(--color-bg-base)';
      }, false);
    });

    contratoDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        contratoInput.files = files;
        const event = new Event('change', { bubbles: true });
        contratoInput.dispatchEvent(event);
      }
    }, false);

    contratoInput.addEventListener('change', (e) => {
      const fileList = document.getElementById('contrato-pdf-file-list');
      if (!fileList) return;

      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        // Validação de tamanho: PDF de no máximo 20MB
        if (file.size > 20 * 1024 * 1024) {
          showToast('O contrato em PDF deve possuir no máximo 20 MB.', 'error');
          contratoInput.value = '';
          fileList.innerHTML = '';
          contratoDropzone.classList.remove('has-preview');
          return;
        }

        contratoDropzone.classList.add('has-preview');
        fileList.innerHTML = `
          <div class="document-item animate-fade-in" style="padding: 8px 12px; margin-bottom: 8px; border: 1px solid var(--color-border); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="fi fi-rr-document" style="font-size: 16px; color: var(--color-info);"></i>
              <div>
                <strong style="font-size:12px; color:var(--color-text-main);">Contrato PDF Anexo</strong>
                <span style="font-size:10px; color:var(--color-text-muted); display:block;">${file.name}</span>
              </div>
            </div>
            <button type="button" id="btn-remover-contrato-temp" style="background:none; border:none; color:var(--color-error); font-size:14px; cursor:pointer;" title="Remover Documento"><i class="fa-solid fa-trash"></i></button>
          </div>
        `;

        document.getElementById('btn-remover-contrato-temp').addEventListener('click', () => {
          contratoInput.value = '';
          fileList.innerHTML = '';
          contratoDropzone.classList.remove('has-preview');
        });
      } else {
        fileList.innerHTML = '';
        contratoDropzone.classList.remove('has-preview');
      }
    });
  }
}

// Wizard Helper Functions
function goToStep(step) {}

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

    // Skip validating contract fields if locatario is not selected
    if (step === 3) {
      const locatarioId = document.getElementById('vincular_locatario_id').value;
      if (!locatarioId && input.id !== 'vincular_locatario_id') {
        return;
      }
    }
    
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
  
  const nome = document.getElementById('nome').value || '-';
  const tipo = document.getElementById('tipo').value || '-';
  const status = document.getElementById('status').value || '-';
  const valorLocacao = document.getElementById('valor_locacao').value ? formatCurrency(document.getElementById('valor_locacao').value) : 'Não informado';
  const areaTotal = document.getElementById('area_total').value ? `${document.getElementById('area_total').value} m²` : 'Não informada';
  
  const ownerSelect = document.getElementById('proprietario_id');
  const ownerName = ownerSelect.options[ownerSelect.selectedIndex]?.text || 'Nenhum';
  
  const quartos = document.getElementById('quartos').value || '0';
  const banheiros = document.getElementById('banheiros').value || '0';
  const vagasGaragem = document.getElementById('vagas_garagem').value || '0';
  const mobiliado = document.getElementById('mobiliado').value || 'Não informado';
  const valorCondominio = document.getElementById('valor_condominio').value ? formatCurrency(document.getElementById('valor_condominio').value) : 'R$ 0,00';
  const aceitaPet = document.getElementById('aceita_pet').value || 'Não informado';
  
  const cep = document.getElementById('cep').value || '-';
  const endereco = document.getElementById('endereco').value || '-';
  const numero = document.getElementById('numero').value || '-';
  const complemento = document.getElementById('complemento').value || '-';
  const bairro = document.getElementById('bairro').value || '-';
  const cidade = document.getElementById('cidade').value || '-';
  const estado = document.getElementById('estado').value || '-';
  
  const tenantSelect = document.getElementById('vincular_locatario_id');
  const tenantName = tenantSelect.value ? (tenantSelect.options[tenantSelect.selectedIndex]?.text || 'Sim') : 'Nenhum';
  const contratoDataInicio = document.getElementById('contrato_data_inicio').value || '-';
  const contratoDataFim = document.getElementById('contrato_data_fim').value || '-';
  const contratoValorMensal = document.getElementById('contrato_valor_mensal').value ? formatCurrency(document.getElementById('contrato_valor_mensal').value) : '-';
  const contratoDiaVencimento = document.getElementById('contrato_dia_vencimento').value || '-';
  const contratoPdf = document.getElementById('contrato_pdf').files[0]?.name || 'Nenhum arquivo anexado';
  
  const photoFile = document.getElementById('foto_principal').files[0]?.name || (document.getElementById('img-preview').src ? 'Foto principal existente' : 'Nenhuma foto anexada');
  
  container.innerHTML = `
    <div class="revisao-secao" style="border-bottom: 1px dashed var(--color-border); padding-bottom: 12px;">
      <h4 style="font-size: 13px; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 8px; margin-top: 0;">Dados Básicos</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px;">
        <div><strong>Nome:</strong> ${nome}</div>
        <div><strong>Tipo:</strong> ${tipo}</div>
        <div><strong>Status:</strong> ${status}</div>
        <div><strong>Valor Locação:</strong> ${valorLocacao}</div>
        <div><strong>Área Total:</strong> ${areaTotal}</div>
        <div><strong>Proprietário:</strong> ${ownerName}</div>
        <div><strong>Quartos / Banheiros:</strong> ${quartos} Q / ${banheiros} B</div>
        <div><strong>Vagas de Garagem:</strong> ${vagasGaragem}</div>
        <div><strong>Mobiliado:</strong> ${mobiliado}</div>
        <div><strong>Condomínio:</strong> ${valorCondominio}</div>
        <div><strong>Aceita Pet:</strong> ${aceitaPet}</div>
      </div>
    </div>
    <div class="revisao-secao" style="border-bottom: 1px dashed var(--color-border); padding-bottom: 12px; margin-top: 12px;">
      <h4 style="font-size: 13px; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 8px; margin-top: 0;">Localização</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px;">
        <div><strong>CEP:</strong> ${cep}</div>
        <div><strong>Endereço:</strong> ${endereco}</div>
        <div><strong>Número:</strong> ${numero}</div>
        <div><strong>Complemento:</strong> ${complemento}</div>
        <div><strong>Bairro:</strong> ${bairro}</div>
        <div><strong>Cidade/UF:</strong> ${cidade}/${estado}</div>
      </div>
    </div>
    ${!isEditMode && tenantSelect.value ? `
    <div class="revisao-secao" style="border-bottom: 1px dashed var(--color-border); padding-bottom: 12px; margin-top: 12px;">
      <h4 style="font-size: 13px; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 8px; margin-top: 0;">Contrato Inicial</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px;">
        <div><strong>Locatário Vinculado:</strong> ${tenantName}</div>
        <div><strong>Início:</strong> ${formatDate(contratoDataInicio)}</div>
        <div><strong>Fim:</strong> ${formatDate(contratoDataFim)}</div>
        <div><strong>Valor Mensal:</strong> ${contratoValorMensal}</div>
        <div><strong>Dia Vencimento:</strong> ${contratoDiaVencimento}</div>
        <div><strong>PDF Anexo:</strong> ${contratoPdf}</div>
      </div>
    </div>
    ` : ''}
    <div class="revisao-secao" style="margin-top: 12px;">
      <h4 style="font-size: 13px; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 8px; margin-top: 0;">Mídias e Anexos</h4>
      <div style="font-size: 13px;">
        <strong>Foto Principal:</strong> ${photoFile}
      </div>
    </div>
  `;
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
      if (i.status === 'Em Manutenção') badgeClass = 'badge-manutencao';
      if (i.status === 'Inativo') badgeClass = 'badge-inativo';

      // Action buttons based on profile
      let actions = `<div class="table-actions">
        <button onclick="verDetalhes('${i.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i></button>`;
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarImovel('${i.id}')" class="btn btn-secondary btn-icon" title="Editar"><i class="fi fi-rr-edit"></i></button>`;
      }
      if (userProfile === 'administrador') {
        actions += `<button onclick="excluirImovel('${i.id}', '${i.nome}')" class="btn btn-danger btn-icon" title="Excluir"><i class="fi fi-rr-trash"></i></button>`;
      }
      actions += `</div>`;

      return `
        <tr class="animate-fade-in">
          <td>${i.nome}</td>
          <td>${i.tipo}</td>
          <td>${i.proprietario_nome || 'Nenhum'}</td>
          <td>${formattedVal}</td>
          <td><span class="badge ${badgeClass}">${i.status}</span></td>
          <td style="text-align: center;">${i.contratos_ativos || 0}</td>
          <td style="text-align: right; padding-right: 24px; width: 120px;">${actions}</td>
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
        carregarImoveis(currentPage);
      },
      onLimitChange: (newLimit) => {
        limit = newLimit;
        currentPage = 1;
        carregarImoveis(currentPage);
      }
    });
  } catch (err) {
    console.error('Error loading list:', err);
    showToast('Erro ao obter imóveis.', 'error');
  } finally {
    hideLoader();
  }
}

// Compose full address string from individual fields
function composeEnderecoCompleto() {
  const parts = [];
  const endereco = (document.getElementById('endereco').value || '').trim();
  const numero = (document.getElementById('numero').value || '').trim();
  const complemento = (document.getElementById('complemento').value || '').trim();
  const bairro = (document.getElementById('bairro').value || '').trim();
  const cidade = (document.getElementById('cidade').value || '').trim();
  const estado = (document.getElementById('estado').value || '').trim();
  const cep = (document.getElementById('cep').value || '').trim();

  if (endereco) parts.push(endereco);
  if (numero) parts.push(numero);
  if (complemento) parts.push(complemento);
  if (bairro) parts.push(bairro);
  if (cidade && estado) {
    parts.push(`${cidade}/${estado}`);
  } else if (cidade) {
    parts.push(cidade);
  } else if (estado) {
    parts.push(estado);
  }
  if (cep) parts.push(`CEP: ${cep}`);
  return parts.join(', ');
}

// Parse address string back into individual form fields
function parseEnderecoParaCampos(enderecoFull) {
  if (!enderecoFull) return;
  // Best-effort parse: set the main street field to the full string
  // Users can manually split when editing
  document.getElementById('endereco').value = enderecoFull;
  // Clear the auxiliary fields since we cannot reliably parse
  ['cep', 'numero', 'complemento', 'bairro', 'cidade', 'estado'].forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = '';
  });
}

// Save/Update handler
async function handleSaveImovel(e) {
  e.preventDefault();
  const id = document.getElementById('imovel-id').value;
  
  const formData = new FormData(document.getElementById('form-imovel'));

  // Compose the full address from individual fields and overwrite the endereco value
  const enderecoCompleto = composeEnderecoCompleto();
  formData.set('endereco', enderecoCompleto);

  // Remove auxiliary address fields that the backend doesn't expect
  ['cep', 'numero', 'complemento', 'bairro', 'cidade', 'estado'].forEach(f => formData.delete(f));

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
      const newId = id || res.data.id;
      
      // Upload das fotos temporárias
      if (tempPhotos.length > 0) {
        for (const file of tempPhotos) {
          const fileForm = new FormData();
          fileForm.append('arquivo', file);
          try {
            await api.post(`/api/imoveis/${newId}/fotos`, fileForm, true);
          } catch(err) {
            console.error('Erro no upload das fotos pós-cadastro:', err);
          }
        }
      }
      
      // Upload dos documentos temporários
      if (tempDocs.length > 0) {
        for (const doc of tempDocs) {
          const docForm = new FormData();
          docForm.append('arquivo', doc.arquivo);
          docForm.append('tipo_documento', doc.tipo);
          try {
            await api.post(`/api/imoveis/${newId}/documentos`, docForm, true);
          } catch(err) {
            console.error('Erro no upload dos documentos pós-cadastro:', err);
          }
        }
      }
      
      showToast(id ? 'Imóvel atualizado com sucesso.' : 'Imóvel cadastrado com sucesso e anexos enviados.', 'success');
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
      document.getElementById('tipo').value = i.tipo;
      document.getElementById('nome').value = i.nome;
      document.getElementById('proprietario_id').value = i.proprietario_id;
      document.getElementById('area_total').value = i.area_total;
      document.getElementById('valor_locacao').value = i.valor_locacao;
      document.getElementById('status').value = i.status;
      document.getElementById('observacoes').value = i.observacoes || '';
      document.getElementById('quartos').value = i.quartos || 0;
      document.getElementById('banheiros').value = i.banheiros || 0;
      document.getElementById('vagas_garagem').value = i.vagas_garagem || 0;
      document.getElementById('mobiliado').value = i.mobiliado || 'Não informado';
      document.getElementById('valor_condominio').value = i.valor_condominio || 0;
      document.getElementById('aceita_pet').value = i.aceita_pet || 'Não informado';

      // Parse address into individual fields
      parseEnderecoParaCampos(i.endereco);

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
      
      isEditMode = true;
      currentImovelId = i.id;
      const step3Tab = document.querySelector('#modal-imovel [data-step-target="3"]');
      if (step3Tab) step3Tab.style.display = 'none';
      
      tempDocs = [];
      tempPhotos = [];
      lastSearchCep = '';
      
      renderWizardDocumentos(i.documentos || []);
      renderWizardGaleria(i.fotos || []);
      atualizarMapaDinamicamente();
      
      document.getElementById('modal-imovel').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao buscar dados do imóvel.', 'error');
  }
};

// Excluir handler
window.excluirImovel = async function(id, nome) {
  const confirmar = await confirmarAcao('Excluir Imóvel', `Deseja realmente excluir o imóvel "${nome}"?\nEsta ação removerá definitivamente o imóvel do sistema. Se houver contratos ativos vinculados, a exclusão não será permitida.`, 'Excluir', 'Cancelar', true);
  if (confirmar) {
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

      // Find active contract from contracts array
      const activeContract = (i.contratos || []).find(c => c.status === 'Ativo');

      // 1. Header Information
      document.getElementById('detalhe-header-nome').textContent = i.nome;
      document.getElementById('det-header-codigo-badge').textContent = `ID: ${i.id}`;
      document.getElementById('det-header-endereco').textContent = i.endereco;
      document.getElementById('det-header-prop-nome').textContent = i.proprietario_nome || 'Nenhum';

      // Status Badge Setup
      const badgeStatus = document.getElementById('detalhe-badge-status');
      badgeStatus.textContent = i.status;
      let badgeClass = 'badge-disponivel';
      if (i.status === 'Alugado') badgeClass = 'badge-alugado';
      if (i.status === 'Reservado') badgeClass = 'badge-reservado';
      if (i.status === 'Manutenção' || i.status === 'Em Manutenção') badgeClass = 'badge-manutencao';
      if (i.status === 'Inativo') badgeClass = 'badge-inativo';
      badgeStatus.className = `badge ${badgeClass}`;

      // Shortcut Action buttons
      document.getElementById('btn-edit-imovel-shortcut').onclick = () => {
        document.getElementById('modal-detalhes').classList.remove('active');
        editarImovel(i.id);
      };

      const btnNewContract = document.getElementById('btn-new-contract-shortcut');
      if (btnNewContract) {
        btnNewContract.style.display = (userProfile === 'administrador' || userProfile === 'operacional') && !activeContract ? 'inline-flex' : 'none';
        btnNewContract.onclick = () => {
          switchDetailTab('det-locatarios');
          const container = document.getElementById('locatario-link-container');
          if (container) {
            container.style.display = 'block';
            popularSelectLocatarios();
          }
        };
      }

      // 2. Banner Section
      const bannerPhoto = document.getElementById('det-banner-photo');
      const bannerPlaceholder = document.getElementById('det-banner-photo-placeholder');
      if (bannerPhoto && bannerPlaceholder) {
        if (i.foto_principal) {
          bannerPhoto.src = i.foto_principal;
          bannerPhoto.style.display = 'block';
          bannerPlaceholder.style.display = 'none';
        } else {
          bannerPhoto.src = '';
          bannerPhoto.style.display = 'none';
          bannerPlaceholder.style.display = 'flex';
        }
      }
      document.getElementById('det-banner-category').textContent = i.tipo || 'Imóvel';
      document.getElementById('det-banner-nome').textContent = i.nome;
      document.getElementById('det-banner-address').textContent = i.endereco;
      document.getElementById('det-banner-area').textContent = `${i.area_total} m²`;
      document.getElementById('det-banner-preco').textContent = `${formatCurrency(i.valor_locacao)}/mês`;
      document.getElementById('det-banner-locatario').textContent = activeContract ? activeContract.locatario_nome : 'Nenhum locatário ativo';

      // 3. Tab: Dados Gerais
      document.getElementById('det-tipo').textContent = i.tipo;
      document.getElementById('det-area-total').textContent = `${i.area_total} m²`;
      document.getElementById('det-status').textContent = i.status;
      document.getElementById('det-valor-locacao').textContent = formatCurrency(i.valor_locacao);
      document.getElementById('det-valor-iptu').textContent = formatCurrency(i.valor_iptu || 0);
      document.getElementById('det-valor-condo').textContent = formatCurrency(i.valor_condominio || 0);
      document.getElementById('det-quartos-banheiros').textContent = `${i.quartos || 0} quartos / ${i.banheiros || 0} banheiros`;
      document.getElementById('det-vagas').textContent = i.vagas_garagem || 0;
      document.getElementById('det-mobiliado').textContent = i.mobiliado || 'Não informado';
      document.getElementById('det-pet').textContent = i.aceita_pet || 'Não informado';
      document.getElementById('det-observacoes').textContent = i.observacoes || 'Nenhuma observação cadastrada.';

      // 4. Sidebar Elements
      document.getElementById('det-sidebar-full-address').textContent = i.endereco;
      
      const propAvatar = document.getElementById('det-sidebar-prop-avatar');
      if (propAvatar) {
        propAvatar.textContent = (i.proprietario_nome || 'P').charAt(0).toUpperCase();
      }
      document.getElementById('det-sidebar-prop-nome').textContent = i.proprietario_nome || 'Nenhum';
      document.getElementById('det-sidebar-prop-doc').textContent = i.proprietario_cpf_cnpj || '-';
      document.getElementById('det-sidebar-prop-tel').textContent = i.proprietario_telefone || '-';
      document.getElementById('det-sidebar-prop-email').textContent = i.proprietario_email || '-';

      document.getElementById('det-cadastro').textContent = formatDate(i.criado_em);
      document.getElementById('det-atualizacao').textContent = formatDate(i.atualizado_em);

      // 5. Finance Calculations & Dashboard Setup
      const financeRecebido = i.recebimentos 
        ? i.recebimentos.filter(r => r.status === 'Pago').reduce((sum, r) => sum + parseFloat(r.valor_recebido || 0), 0)
        : 0;
      const financeAReceber = i.recebimentos
        ? i.recebimentos.filter(r => r.status !== 'Pago').reduce((sum, r) => sum + parseFloat(r.valor_previsto || 0), 0)
        : 0;
      const financeDespesas = i.despesas
        ? i.despesas.reduce((sum, d) => sum + parseFloat(d.valor || 0), 0)
        : 0;
      const financeSaldo = financeRecebido - financeDespesas;

      // Set KPI texts
      document.getElementById('det-fin-recebido').textContent = formatCurrency(financeRecebido);
      document.getElementById('det-fin-areceber').textContent = formatCurrency(financeAReceber);
      document.getElementById('det-fin-despesas-kpi').textContent = formatCurrency(financeDespesas);
      document.getElementById('det-fin-saldo').textContent = formatCurrency(financeSaldo);

      // Update Dashboard colors & values
      const saldoKpi = document.getElementById('det-fin-saldo').parentElement;
      if (saldoKpi) {
        saldoKpi.className = `exec-finance-kpi ${financeSaldo >= 0 ? 'success' : 'error'}`;
      }

      // 6. Stats Dashboard Cards & Navigation Badges
      const activeLocCount = i.contratos ? i.contratos.filter(c => c.status === 'Ativo').length : 0;

      document.getElementById('card-det-area').textContent = `${i.area_total} m²`;
      document.getElementById('card-det-locatarios').textContent = activeLocCount;
      document.getElementById('card-det-contratos').textContent = i.contratos ? i.contratos.length : 0;
      document.getElementById('card-det-recebimentos').textContent = formatCurrency(financeRecebido);
      document.getElementById('card-det-despesas').textContent = formatCurrency(financeDespesas);
      document.getElementById('card-det-documentos').textContent = i.documentos ? i.documentos.length : 0;

      document.getElementById('badge-det-locatarios').textContent = activeLocCount;
      document.getElementById('badge-det-contratos').textContent = i.contratos ? i.contratos.length : 0;
      document.getElementById('badge-det-documentos').textContent = i.documentos ? i.documentos.length : 0;
      document.getElementById('badge-det-fotos').textContent = i.fotos ? i.fotos.length : 0;
      document.getElementById('badge-det-manutencoes').textContent = i.manutencoes ? i.manutencoes.length : 0;

      // Toggle locatario buttons based on profile permissions
      const btnLinkLoc = document.getElementById('btn-abrir-link-locatario');
      if (btnLinkLoc) {
        btnLinkLoc.style.display = (userProfile === 'administrador' || userProfile === 'operacional') ? 'inline-flex' : 'none';
      }

      // Toggle upload button for gallery based on profile permissions
      const btnToggleGal = document.getElementById('btn-toggle-upload-galeria');
      if (btnToggleGal) {
        btnToggleGal.style.display = (userProfile === 'administrador' || userProfile === 'operacional') ? 'inline-flex' : 'none';
      }

      // Populate upload type options
      document.getElementById('doc-tipo').value = 'Escritura';
      toggleVencimentoFields('Escritura');

      // Clear input/toggle fields
      document.getElementById('doc-arquivo').value = '';
      document.getElementById('foto-arquivo').value = '';
      const linkageForm = document.getElementById('locatario-link-container');
      if (linkageForm) linkageForm.style.display = 'none';
      const galleryUploadContainer = document.getElementById('gallery-upload-container');
      if (galleryUploadContainer) galleryUploadContainer.style.display = 'none';

      // 7. Render Sub-resources content
      renderDetalheGaleria(i.fotos);
      renderDetalheDocumentos(i.documentos);
      renderDetalheLocatarios(i.contratos);
      renderDetalheContratos(i.contratos);
      renderDetalheRecebimentos(i.recebimentos);
      renderDetalheDespesas(i.despesas);
      renderDetalheManutencoes(i.manutencoes);
      renderDetalheTimeline(i.timeline);

      // Render mini OSM map
      const mapContainer = document.getElementById('minimap-container');
      if (mapContainer && i.endereco) {
        mapContainer.innerHTML = `<iframe src="https://maps.google.com/maps?q=${encodeURIComponent(i.endereco)}&t=&z=15&ie=UTF8&iwloc=&output=embed" width="100%" height="100%" style="border:0; border-radius:8px;"></iframe>`;
      }

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
    let addBtnHtml = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      addBtnHtml = `<button type="button" class="btn btn-primary" onclick="const form = document.getElementById('gallery-upload-container'); if(form) form.style.display = 'block'; form.scrollIntoView({behavior: 'smooth'});" style="margin-top: 8px;"><i class="fi fi-rr-add"></i> Adicionar Primeira Foto</button>`;
    }
    container.innerHTML = `
      <div class="empty-state-card animate-fade-in" style="grid-column: span 4;">
        <div class="empty-state-icon"><i class="fi fi-rr-picture"></i></div>
        <h5 class="empty-state-title">Nenhuma foto cadastrada</h5>
        <p class="empty-state-text">Adicione imagens para facilitar futuras consultas e vistorias do imóvel.</p>
        ${addBtnHtml}
      </div>
    `;
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
    let addBtnHtml = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      addBtnHtml = `<button type="button" class="btn btn-primary" onclick="const form = document.getElementById('document-upload-container'); if(form) form.style.display = 'block'; form.scrollIntoView({behavior: 'smooth'});" style="margin-top: 8px;"><i class="fi fi-rr-add"></i> Adicionar Documento</button>`;
    }
    container.innerHTML = `
      <div class="empty-state-card animate-fade-in">
        <div class="empty-state-icon" style="font-size: 38px;">📄</div>
        <h5 class="empty-state-title">Nenhum documento anexado</h5>
        <p class="empty-state-text">Adicione IPTU, Escritura, Alvarás e outros documentos importantes.</p>
        ${addBtnHtml}
      </div>
    `;
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

function renderDetalheLocatarios(contratos) {
  const tbody = document.getElementById('det-locatarios-list-body');
  if (!contratos || contratos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum locatário vinculado.</td></tr>';
    return;
  }

  tbody.innerHTML = contratos.map(c => {
    const formattedVal = formatCurrency(c.valor_mensal);
    const startVal = formatDate(c.data_inicio);
    const endVal = formatDate(c.data_fim);

    let badgeClass = 'badge-disponivel';
    if (c.status === 'Ativo') badgeClass = 'badge-disponivel';
    if (c.status === 'Encerrado' || c.status === 'Cancelado') badgeClass = 'badge-manutencao';

    let actionsHtml = '-';
    if (c.status === 'Ativo' && (userProfile === 'administrador' || userProfile === 'operacional')) {
      actionsHtml = `
        <button onclick="desvincularLocatario('${c.id}', '${c.locatario_nome}')" class="btn btn-danger btn-icon" style="height:32px; padding: 0 12px; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="Desvincular">
          <i class="fi fi-rr-ban"></i> Desvincular
        </button>
      `;
    }

    return `
      <tr>
        <td style="font-weight:600; color:var(--color-text-main);">${c.locatario_nome}</td>
        <td>${startVal}</td>
        <td>${endVal}</td>
        <td>${formattedVal}</td>
        <td><span class="badge ${badgeClass}">${c.status === 'Ativo' ? 'Ativo' : 'Histórico'}</span></td>
        <td style="text-align: right; padding-right: 24px;">${actionsHtml}</td>
      </tr>
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

    return `
      <tr>
        <td>${c.locatario_nome}</td>
        <td>${startVal}</td>
        <td>${endVal}</td>
        <td>${formattedVal}</td>
        <td><span class="badge ${badgeClass}">${c.status}</span></td>
        <td style="text-align: right; padding-right: 24px;">
          <a href="/imoveis" class="btn btn-secondary btn-icon" style="height:32px; padding: 0 12px; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="Abrir Contrato" onclick="event.preventDefault(); showToast('Para gerenciar o contrato, acesse a aba Locatários.', 'info');">
            <i class="fi fi-rr-eye"></i> Info
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDetalheRecebimentos(recebimentos) {
  const tbody = document.getElementById('det-recebimentos-list-body');
  if (!recebimentos || recebimentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum recebimento registrado.</td></tr>`;
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
    if (r.status === 'A Vencer') badgeClass = 'badge-reservado';

    return `
      <tr>
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhuma manutenção registrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = manutencoes.map(m => {
    const prevDate = formatDate(m.data_prevista);
    const valReal = formatCurrency(m.valor_real);
    
    let badgeClass = 'badge-disponivel';
    if (m.status === 'Planejada') badgeClass = 'badge-reservado';
    if (m.status === 'Em Andamento') badgeClass = 'badge-alugado';
    if (m.status === 'Concluída') badgeClass = 'badge-disponivel';
    if (m.status === 'Cancelada') badgeClass = 'badge-inativo';

    return `
      <tr>
        <td>${m.tipo}</td>
        <td>${m.titulo}</td>
        <td>${prevDate}</td>
        <td>${valReal}</td>
        <td><span class="badge ${badgeClass}">${m.status}</span></td>
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
  const confirmar = await confirmarAcao('Remover Documento', 'Deseja realmente remover este documento? Esta ação não pode ser desfeita.', 'Remover', 'Cancelar', true);
  if (confirmar) {
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
  const confirmar = await confirmarAcao('Remover Foto', 'Deseja realmente remover esta foto da galeria?', 'Remover', 'Cancelar', true);
  if (confirmar) {
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

// Popular Locatários dropdown
async function popularSelectLocatarios() {
  try {
    const res = await api.get('/api/locatarios?limit=1000&status=ativo');
    if (res.success && res.data) {
      const selectLink = document.getElementById('link-locatario-select');
      const selectVincular = document.getElementById('vincular_locatario_id');
      
      const options = res.data.map(l => `<option value="${l.id}">${l.nome_razao_social}</option>`).join('');
      
      if (selectLink) {
        selectLink.innerHTML = '<option value="" disabled selected>Selecione um locatário...</option>' + options;
      }
      if (selectVincular) {
        selectVincular.innerHTML = '<option value="" selected>Nenhum (Manter disponível)</option>' + options;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar locatários para vínculo:', error);
  }
}

// Vincular locatário submit handler
async function handleLinkLocatarioSubmit(e) {
  e.preventDefault();
  const locatarioId = document.getElementById('link-locatario-select').value;
  const valorMensal = document.getElementById('link-valor-mensal').value;
  const dataInicio = document.getElementById('link-data-inicio').value;
  const dataFim = document.getElementById('link-data-fim').value;
  const diaVencimento = document.getElementById('link-vencimento').value;

  if (!locatarioId || !valorMensal || !dataInicio || !dataFim || !diaVencimento) {
    showToast('Preencha todos os campos para vincular o locatário.', 'warning');
    return;
  }

  const payload = {
    numero_contrato: `CTR-${Date.now()}`,
    imovel_id: currentImovelId,
    locatario_id: locatarioId,
    data_inicio: dataInicio,
    data_fim: dataFim,
    valor_mensal: valorMensal,
    dia_vencimento: diaVencimento,
    caucao: 0,
    garantia: 'Caução',
    indice_reajuste: 'IPCA',
    observacoes: 'Vínculo gerado pela aba Locatários da Ficha do Imóvel.',
    status: 'Ativo'
  };

  showLoader();
  try {
    const res = await api.post('/api/contratos', payload);
    if (res.success) {
      showToast('Locatário vinculado com sucesso!', 'success');
      document.getElementById('locatario-link-container').style.display = 'none';
      document.getElementById('form-link-locatario').reset();

      // Reload details view and properties list
      await verDetalhes(currentImovelId);
      await carregarImoveis(currentPage);
    } else {
      showToast(res.message || 'Erro ao registrar vínculo.', 'error');
    }
  } catch (error) {
    showToast(error.message || 'Erro ao comunicar com o servidor.', 'error');
  } finally {
    hideLoader();
  }
}

// Desvincular locatário handler
window.desvincularLocatario = async function(contratoId, locatarioNome) {
  const confirmar = await confirmarAcao('Desvincular Locatário', `Deseja realmente desvincular o locatário "${locatarioNome}" deste imóvel?\nO contrato será marcado como encerrado e o imóvel voltará a ficar disponível.`, 'Desvincular', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.patch(`/api/contratos/${contratoId}/encerrar`);
      if (res.success) {
        showToast('Locatário desvinculado com sucesso.', 'success');
        await verDetalhes(currentImovelId);
        await carregarImoveis(currentPage);
      } else {
        showToast(res.message || 'Erro ao desvincular.', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão.', 'error');
    } finally {
      hideLoader();
    }
  }
};

// --- Wizard Upload and Delete Helpers ---

async function handleWizardUploadDocumento(e) {
  if (e) e.preventDefault();
  const fileInput = document.getElementById('wizard-doc-arquivo');
  const typeSelect = document.getElementById('wizard-doc-tipo');
  const inputEmissao = document.getElementById('wizard-doc-emissao');
  const inputVencimento = document.getElementById('wizard-doc-vencimento');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo para fazer upload.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const tipoDocumento = typeSelect.value;
  
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
  
  if (inputEmissao && inputEmissao.value) {
    formData.append('data_emissao', inputEmissao.value);
  }
  if (inputVencimento && inputVencimento.value) {
    formData.append('data_vencimento', inputVencimento.value);
  }

  showLoader();
  try {
    const res = await api.post(`/api/imoveis/${currentImovelId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      
      fileInput.value = '';
      if (inputEmissao) inputEmissao.value = '';
      if (inputVencimento) inputVencimento.value = '';
      
      // Reload documents and update lists
      const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
      if (resDetails.success && resDetails.data) {
        renderWizardDocumentos(resDetails.data.documentos);
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

async function handleWizardUploadGaleria(e) {
  if (e) e.preventDefault();
  const fileInput = document.getElementById('wizard-foto-arquivo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha uma imagem para a galeria.', 'error');
    return;
  }

  const file = fileInput.files[0];
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
      
      // Reload photos and update lists
      const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
      if (resDetails.success && resDetails.data) {
        renderWizardGaleria(resDetails.data.fotos);
        renderDetalheGaleria(resDetails.data.fotos);
        renderDetalheTimeline(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao carregar foto.', 'error');
    }
  } catch (err) {
    showToast('Falha no upload da foto.', 'error');
  } finally {
    hideLoader();
  }
}

window.excluirDocumentoWizard = async function(documentoId) {
  const confirmar = await confirmarAcao('Remover Documento', 'Deseja realmente remover este documento? Esta ação não pode ser desfeita.', 'Remover', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/imoveis/${currentImovelId}/documentos/${documentoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload documents and update lists
        const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
        if (resDetails.success && resDetails.data) {
          renderWizardDocumentos(resDetails.data.documentos);
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

window.excluirFotoWizard = async function(fotoId) {
  const confirmar = await confirmarAcao('Remover Foto', 'Deseja realmente remover esta foto da galeria?', 'Remover', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/imoveis/${currentImovelId}/fotos/${fotoId}`);
      if (res.success) {
        showToast(res.message, 'success');
        
        // Reload photos and update lists
        const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
        if (resDetails.success && resDetails.data) {
          renderWizardGaleria(resDetails.data.fotos);
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

function renderWizardDocumentos(docs) {
  const container = document.getElementById('wizard-det-documentos-list');
  if (!container) return;
  if (!docs || docs.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 16px;">
        <div class="empty-state-icon" style="font-size: 24px;">📄</div>
        <h5 class="empty-state-title" style="font-size: 13px;">Nenhum documento anexado</h5>
      </div>
    `;
    return;
  }

  container.innerHTML = docs.map(d => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button type="button" onclick="excluirDocumentoWizard('${d.id}')" style="background:none; border:none; color:var(--color-error); font-size:14px; cursor:pointer;" title="Remover Documento"><i class="fi fi-rr-trash"></i></button>`;
    }
    const dateVal = formatDate(d.criado_em);
    let datesInfo = '';
    if (d.data_emissao || d.data_vencimento) {
      const em = d.data_emissao ? formatDate(d.data_emissao) : 'Não inf.';
      const ven = d.data_vencimento ? formatDate(d.data_vencimento) : 'Não inf.';
      datesInfo = `<span style="display:block; font-size:10px; color:var(--color-text-muted); margin-top:2px;">Emissão: ${em} • Vencimento: ${ven}</span>`;
    }

    return `
      <div class="document-item" style="padding: 8px 12px; margin-bottom: 8px; border: 1px solid var(--color-border); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fi fi-rr-document" style="font-size: 16px; color: var(--color-info);"></i>
          <div>
            <strong style="font-size:12px; color:var(--color-text-main);">${d.tipo_documento}</strong>
            <span style="font-size:10px; color:var(--color-text-muted); display:block;">${d.nome_arquivo}</span>
            ${datesInfo}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <a href="${d.caminho_arquivo}" target="_blank" class="btn btn-secondary btn-icon" style="height:28px; width:28px;" title="Download"><i class="fi fi-rr-download" style="font-size:12px;"></i></a>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join('');
}

function renderWizardGaleria(fotos) {
  const container = document.getElementById('wizard-det-galeria-grid');
  if (!container) return;
  if (!fotos || fotos.length === 0) {
    container.innerHTML = `<div style="font-size: 12px; color: var(--color-text-muted); padding: 12px;">Nenhuma foto na galeria.</div>`;
    return;
  }

  container.innerHTML = fotos.map(f => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button type="button" class="delete-photo-btn" onclick="excluirFotoWizard('${f.id}')" style="position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.85); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;"><i class="fi fi-rr-trash" style="font-size:11px;"></i></button>`;
    }
    return `
      <div class="gallery-photo-item" style="position:relative; border-radius:6px; overflow:hidden; aspect-ratio:1; width:120px;">
        <img src="${f.caminho_arquivo}" style="width:100%; height:100%; object-fit:cover;" alt="Gallery photo">
        ${deleteBtn}
      </div>
    `;
  }).join('');
}

// Atualiza o iframe do OpenStreetMap de forma 100% nativa
function atualizarMapaDinamicamente() {
  const endereco = document.getElementById('endereco').value.trim();
  const numero = document.getElementById('numero').value.trim();
  const bairro = document.getElementById('bairro').value.trim();
  const cidade = document.getElementById('cidade').value.trim();
  const estado = document.getElementById('estado').value.trim();
  
  const container = document.getElementById('imovel-mapa-container');
  if (!container) return;
  
  if (endereco && cidade) {
    const enderecoCompleto = `${endereco}, ${numero ? numero + ' - ' : ''}${bairro ? bairro + ', ' : ''}${cidade} - ${estado}`;
    container.innerHTML = `<iframe src="https://maps.google.com/maps?q=${encodeURIComponent(enderecoCompleto)}&t=&z=15&ie=UTF8&iwloc=&output=embed" width="100%" height="100%" style="border:0; border-radius:8px;"></iframe>`;
  } else {
    container.innerHTML = `
      <div id="mapa-placeholder-content" style="text-align: center; color: var(--color-text-muted);">
        <i class="fa-solid fa-map-location-dot" style="font-size: 24px; color: var(--color-primary); opacity: 0.5; margin-bottom: 4px; display: block; margin: 0 auto 6px auto;"></i>
        <span style="font-size: 10px;">Digite um endereço válido para ver o mapa</span>
      </div>
    `;
  }
}

// Seleção de fotos da Galeria (modo criação vs edição)
async function handleGalleryFilesSelected(files) {
  console.log('[Galeria] handleGalleryFilesSelected iniciada para', files.length, 'arquivos. Modo Edição:', isEditMode);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp)$/.test(extension);
    if (!isImage) {
      showToast('Apenas imagens (JPG, JPEG, PNG, WEBP) são aceitas.', 'error');
      continue;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('A foto ultrapassa o limite de 10 MB.', 'error');
      continue;
    }
    
    if (isEditMode) {
      // Faz o upload direto imediato (modo antigo de edição)
      const formData = new FormData();
      formData.append('arquivo', file);
      showLoader();
      try {
        const res = await api.post(`/api/imoveis/${currentImovelId}/fotos`, formData, true);
        if (res.success) {
          showToast('Foto adicionada com sucesso!', 'success');
          const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
          if (resDetails.success && resDetails.data) {
            renderWizardGaleria(resDetails.data.fotos);
            renderDetalheGaleria(resDetails.data.fotos);
          }
        }
      } catch (err) {
        showToast('Erro no upload da foto.', 'error');
      } finally {
        hideLoader();
      }
    } else {
      // Adiciona na lista temporária para cadastro
      tempPhotos.push(file);
      console.log('[Galeria] Foto adicionada ao tempPhotos. Novo tamanho:', tempPhotos.length);
      renderTempPhotos();
    }
  }
}

// Seleção de documentos (modo criação vs edição)
async function handleDocFilesSelected(files) {
  const typeSelect = document.getElementById('wizard-doc-tipo');
  const tipo = typeSelect.value || 'Outros';
  console.log('[Documentos] handleDocFilesSelected iniciada. Tipo de documento:', tipo, '. Arquivos:', files.length, 'Modo Edição:', isEditMode);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp)$/.test(extension);
    if (isImage && file.size > 10 * 1024 * 1024) {
      showToast('Imagens devem possuir no máximo 10 MB.', 'error');
      continue;
    }
    if (extension === '.pdf' && file.size > 20 * 1024 * 1024) {
      showToast('PDFs devem possuir no máximo 20 MB.', 'error');
      continue;
    }
    
    if (isEditMode) {
      // Upload direto
      const formData = new FormData();
      formData.append('arquivo', file);
      formData.append('tipo_documento', tipo);
      showLoader();
      try {
        const res = await api.post(`/api/imoveis/${currentImovelId}/documentos`, formData, true);
        if (res.success) {
          showToast('Documento anexado!', 'success');
          const resDetails = await api.get(`/api/imoveis/${currentImovelId}`);
          if (resDetails.success && resDetails.data) {
            renderWizardDocumentos(resDetails.data.documentos);
            renderDetalheDocumentos(resDetails.data.documentos);
          }
        }
      } catch (err) {
        showToast('Erro no upload do documento.', 'error');
      } finally {
        hideLoader();
      }
    } else {
      // Armazena temporário
      tempDocs.push({ tipo: tipo, arquivo: file });
      console.log('[Documentos] Doc adicionado ao tempDocs. Novo tamanho:', tempDocs.length, 'Dados:', { tipo: tipo, arquivo: file });
      renderTempDocs();
    }
  }
}

// Renderizadores locais temporários (modo criação)
function renderTempPhotos() {
  const grid = document.getElementById('wizard-det-galeria-grid');
  console.log('[Galeria Render] Renderizando fotos temporárias. Container encontrado:', !!grid, 'Tamanho tempPhotos:', tempPhotos.length);
  if (!grid) return;
  if (tempPhotos.length === 0) {
    grid.innerHTML = `<div style="font-size: 11px; color: var(--color-text-muted); padding: 8px;">Nenhuma foto na galeria.</div>`;
    return;
  }
  grid.innerHTML = tempPhotos.map((file, idx) => {
    const objectURL = URL.createObjectURL(file);
    return `
      <div class="gallery-photo-item" style="position:relative; border-radius:6px; overflow:hidden; aspect-ratio:1; width:120px;">
        <img src="${objectURL}" style="width:100%; height:100%; object-fit:cover;" alt="Temp photo">
        <button type="button" class="delete-photo-btn" onclick="removeTempPhoto(${idx})" style="position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.85); color:#fff; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;"><i class="fa-solid fa-xmark" style="font-size:10px;"></i></button>
      </div>
    `;
  }).join('');
}

window.removeTempPhoto = function(idx) {
  tempPhotos.splice(idx, 1);
  renderTempPhotos();
};

function renderTempDocs() {
  const container = document.getElementById('wizard-det-documentos-list');
  console.log('[Documentos Render] Renderizando docs temporários. Container encontrado:', !!container, 'Tamanho tempDocs:', tempDocs.length);
  if (!container) return;
  if (tempDocs.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 16px;">
        <div class="empty-state-icon" style="font-size: 24px;">📄</div>
        <h5 class="empty-state-title" style="font-size: 13px;">Nenhum documento anexado</h5>
      </div>
    `;
    return;
  }
  container.innerHTML = tempDocs.map((doc, idx) => {
    return `
      <div class="document-item" style="padding: 8px 12px; margin-bottom: 8px; border: 1px solid var(--color-border); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fi fi-rr-document" style="font-size: 16px; color: var(--color-info);"></i>
          <div>
            <strong style="font-size:12px; color:var(--color-text-main);">${doc.tipo}</strong>
            <span style="font-size:10px; color:var(--color-text-muted); display:block;">${doc.arquivo.name}</span>
          </div>
        </div>
        <button type="button" onclick="removeTempDoc(${idx})" style="background:none; border:none; color:var(--color-error); font-size:14px; cursor:pointer;" title="Remover Documento"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }).join('');
}

window.removeTempDoc = function(idx) {
  tempDocs.splice(idx, 1);
  renderTempDocs();
};
