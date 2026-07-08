// Pessoas Módulo JavaScript Controller (Fase 04 e 05)

let currentPessoasTab = 'proprietarios';
let propCurrentPage = 1;
let locCurrentPage = 1;
const limit = 10;

let propFilters = { busca: '', status: '', tipo: '' };
let locFilters = { busca: '', status: '', tipo: '' };

let currentProprietarioId = null;
let currentLocatarioId = null;
let userProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === '/pessoas') {
    initPessoas();
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

async function initPessoas() {
  // 1. Get user role and configure view buttons
  try {
    const resMe = await api.get('/api/auth/me');
    if (resMe.success && resMe.usuario) {
      userProfile = resMe.usuario.perfil;
      
      // Update sidebar footer
      document.getElementById('sidebar-user-name').textContent = resMe.usuario.nome;
      document.getElementById('sidebar-user-role').textContent = userProfile.charAt(0).toUpperCase() + userProfile.slice(1);
      
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        document.getElementById('btn-novo-registro').style.display = 'inline-flex';
        document.getElementById('prop-document-upload-container').style.display = 'block';
        document.getElementById('loc-document-upload-container').style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Failed to get user profile details:', err);
  }

  // 2. Load initial list data
  await carregarProprietarios(propCurrentPage);
  await carregarLocatarios(locCurrentPage);

  // 3. Register Event Listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Main Tab Navigation between Proprietários and Locatários
  document.querySelectorAll('[data-pessoas-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchMainTab(btn.getAttribute('data-pessoas-tab'));
    });
  });

  // Proprietários Filters
  document.getElementById('prop-btn-filtrar').addEventListener('click', () => {
    propFilters.busca = document.getElementById('prop-filtro-busca').value.trim();
    propFilters.tipo = document.getElementById('prop-filtro-tipo').value;
    propFilters.status = document.getElementById('prop-filtro-status').value;
    propCurrentPage = 1;
    carregarProprietarios(propCurrentPage);
  });

  document.getElementById('prop-btn-limpar').addEventListener('click', () => {
    document.getElementById('prop-filtro-busca').value = '';
    document.getElementById('prop-filtro-tipo').value = '';
    document.getElementById('prop-filtro-status').value = '';
    propFilters = { busca: '', status: '', tipo: '' };
    propCurrentPage = 1;
    carregarProprietarios(propCurrentPage);
  });

  // Locatários Filters
  document.getElementById('loc-btn-filtrar').addEventListener('click', () => {
    locFilters.busca = document.getElementById('loc-filtro-busca').value.trim();
    locFilters.tipo = document.getElementById('loc-filtro-tipo').value;
    locFilters.status = document.getElementById('loc-filtro-status').value;
    locCurrentPage = 1;
    carregarLocatarios(locCurrentPage);
  });

  document.getElementById('loc-btn-limpar').addEventListener('click', () => {
    document.getElementById('loc-filtro-busca').value = '';
    document.getElementById('loc-filtro-tipo').value = '';
    document.getElementById('loc-filtro-status').value = '';
    locFilters = { busca: '', status: '', tipo: '' };
    locCurrentPage = 1;
    carregarLocatarios(locCurrentPage);
  });

  // Pagination Proprietários
  document.getElementById('prop-btn-prev').addEventListener('click', () => {
    if (propCurrentPage > 1) {
      propCurrentPage--;
      carregarProprietarios(propCurrentPage);
    }
  });

  document.getElementById('prop-btn-next').addEventListener('click', () => {
    propCurrentPage++;
    carregarProprietarios(propCurrentPage);
  });

  // Pagination Locatários
  document.getElementById('loc-btn-prev').addEventListener('click', () => {
    if (locCurrentPage > 1) {
      locCurrentPage--;
      carregarLocatarios(locCurrentPage);
    }
  });

  document.getElementById('loc-btn-next').addEventListener('click', () => {
    locCurrentPage++;
    carregarLocatarios(locCurrentPage);
  });

  // General exports (maps to current active tab)
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    if (currentPessoasTab === 'proprietarios') {
      const query = new URLSearchParams(propFilters).toString();
      window.location.href = `/api/proprietarios/exportar/excel?${query}`;
    } else {
      const query = new URLSearchParams(locFilters).toString();
      window.location.href = `/api/locatarios/exportar/excel?${query}`;
    }
  });

  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    if (currentPessoasTab === 'proprietarios') {
      const query = new URLSearchParams(propFilters).toString();
      window.open(`/api/proprietarios/exportar/pdf?${query}`, '_blank');
    } else {
      const query = new URLSearchParams(locFilters).toString();
      window.open(`/api/locatarios/exportar/pdf?${query}`, '_blank');
    }
  });

  // Novo Registro Button (dynamic for active tab)
  document.getElementById('btn-novo-registro').addEventListener('click', () => {
    if (currentPessoasTab === 'proprietarios') {
      abrirNovoProprietario();
    } else {
      abrirNovoLocatario();
    }
  });

  // Form Type Person Switches
  document.getElementById('prop-tipo_pessoa').addEventListener('change', (e) => {
    switchPropTipoPessoa(e.target.value);
  });

  document.getElementById('loc-tipo_pessoa').addEventListener('change', (e) => {
    switchLocTipoPessoa(e.target.value);
  });

  // Modal forms closures
  document.getElementById('prop-btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-proprietario').classList.remove('active');
  });
  document.getElementById('loc-btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-locatario').classList.remove('active');
  });

  // Wizard navigation buttons for Proprietários
  document.getElementById('prop-wizard-btn-prev').addEventListener('click', () => {
    if (propCurrentStep === 1) {
      document.getElementById('modal-proprietario').classList.remove('active');
    } else {
      goToPropStep(propCurrentStep - 1);
    }
  });

  document.getElementById('prop-wizard-btn-next').addEventListener('click', () => {
    if (propCurrentStep < 5) {
      if (validatePropStep(propCurrentStep)) {
        goToPropStep(propCurrentStep + 1);
      }
    }
  });

  // Intercept form submit or click next for Proprietários
  document.getElementById('form-proprietario').addEventListener('submit', (e) => {
    e.preventDefault();
    if (propCurrentStep < 5) {
      if (validatePropStep(propCurrentStep)) {
        goToPropStep(propCurrentStep + 1);
      }
    } else {
      handleSaveProprietario(e);
    }
  });

  // Wizard sidebar steps navigation click for Proprietários
  document.querySelectorAll('#modal-proprietario .wizard-step').forEach(stepEl => {
    stepEl.addEventListener('click', () => {
      const target = parseInt(stepEl.getAttribute('data-step-target'));
      if (target === propCurrentStep) return;
      
      if (target > propCurrentStep) {
        // Validate intermediate steps
        let tempStep = propCurrentStep;
        while (tempStep < target) {
          if (!validatePropStep(tempStep)) return;
          tempStep++;
        }
      }
      
      goToPropStep(target);
    });
  });

  // Wizard navigation buttons for Locatários
  document.getElementById('loc-wizard-btn-prev').addEventListener('click', () => {
    if (locCurrentStep === 1) {
      document.getElementById('modal-locatario').classList.remove('active');
    } else {
      goToLocStep(locCurrentStep - 1);
    }
  });

  document.getElementById('loc-wizard-btn-next').addEventListener('click', () => {
    if (locCurrentStep < 5) {
      if (validateLocStep(locCurrentStep)) {
        goToLocStep(locCurrentStep + 1);
      }
    }
  });

  // Intercept form submit or click next for Locatários
  document.getElementById('form-locatario').addEventListener('submit', (e) => {
    e.preventDefault();
    if (locCurrentStep < 5) {
      if (validateLocStep(locCurrentStep)) {
        goToLocStep(locCurrentStep + 1);
      }
    } else {
      handleSaveLocatario(e);
    }
  });

  // Wizard sidebar steps navigation click for Locatários
  document.querySelectorAll('#modal-locatario .wizard-step').forEach(stepEl => {
    stepEl.addEventListener('click', () => {
      const target = parseInt(stepEl.getAttribute('data-step-target'));
      if (target === locCurrentStep) return;
      
      if (target > locCurrentStep) {
        // Validate intermediate steps
        let tempStep = locCurrentStep;
        while (tempStep < target) {
          if (!validateLocStep(tempStep)) return;
          tempStep++;
        }
      }
      
      goToLocStep(target);
    });
  });

  // Details Modal tab switches
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId.startsWith('prop-')) {
        switchPropDetailTab(tabId);
      } else {
        switchLocDetailTab(tabId);
      }
    });
  });

  document.getElementById('prop-btn-close-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes-proprietario').classList.remove('active');
  });
  document.getElementById('prop-btn-fechar-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes-proprietario').classList.remove('active');
  });
  document.getElementById('loc-btn-close-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes-locatario').classList.remove('active');
  });
  document.getElementById('loc-btn-fechar-detalhes').addEventListener('click', () => {
    document.getElementById('modal-detalhes-locatario').classList.remove('active');
  });

  // Document attachments forms
  document.getElementById('prop-form-upload-documento').addEventListener('submit', handleUploadPropDocumento);
  document.getElementById('loc-form-upload-documento').addEventListener('submit', handleUploadLocDocumento);

  // Wizard document upload form actions
  const btnPropWizardUpload = document.getElementById('btn-prop-wizard-upload');
  if (btnPropWizardUpload) {
    btnPropWizardUpload.addEventListener('click', handlePropWizardUpload);
  }
  const btnLocWizardUpload = document.getElementById('btn-loc-wizard-upload');
  if (btnLocWizardUpload) {
    btnLocWizardUpload.addEventListener('click', handleLocWizardUpload);
  }
}

// Switch between main screen tabs (Proprietários / Locatários)
function switchMainTab(tabId) {
  currentPessoasTab = tabId;
  
  document.querySelectorAll('[data-pessoas-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-pessoas-tab') === tabId);
  });

  document.getElementById('pane-proprietarios').style.display = tabId === 'proprietarios' ? 'block' : 'none';
  document.getElementById('pane-locatarios').style.display = tabId === 'locatarios' ? 'block' : 'none';

  const btnNovo = document.getElementById('btn-novo-registro');
  if (tabId === 'proprietarios') {
    btnNovo.innerHTML = '<i class="fi fi-rr-add"></i> Novo Proprietário';
    document.getElementById('page-title').textContent = 'Gestão de Pessoas';
    document.getElementById('page-subtitle').textContent = 'Gerencie proprietários de forma unificada.';
  } else {
    btnNovo.innerHTML = '<i class="fi fi-rr-add"></i> Novo Locatário';
    document.getElementById('page-title').textContent = 'Gestão de Pessoas';
    document.getElementById('page-subtitle').textContent = 'Gerencie inquilinos, valide documentações cadastrais e consulte históricos.';
  }
}

// Wizard step navigation controls
let propCurrentStep = 1;
let locCurrentStep = 1;

function goToPropStep(step) {
  propCurrentStep = step;
  
  if (step === 3) {
    const isEdit = document.getElementById('prop-id').value !== '';
    const dc = document.getElementById('prop-wizard-documents-card');
    const ic = document.getElementById('prop-wizard-informative-card');
    if (dc) dc.style.display = isEdit ? 'block' : 'none';
    if (ic) ic.style.display = isEdit ? 'none' : 'block';
  }

  // Update step elements in sidebar
  document.querySelectorAll('#modal-proprietario .wizard-step').forEach(el => {
    const targetStep = parseInt(el.getAttribute('data-step-target'));
    el.classList.toggle('active', targetStep === step);
  });
  
  // Show active pane
  document.querySelectorAll('#modal-proprietario .wizard-pane').forEach(el => {
    el.style.display = el.getAttribute('id') === `prop-wizard-pane-${step}` ? 'block' : 'none';
  });
  
  // Configure footer buttons
  const btnPrev = document.getElementById('prop-wizard-btn-prev');
  const btnNext = document.getElementById('prop-wizard-btn-next');
  
  if (step === 1) {
    btnPrev.textContent = 'Cancelar';
  } else {
    btnPrev.textContent = '← Voltar';
  }
  
  if (step < 5) {
    btnNext.type = 'button';
    btnNext.innerHTML = 'Próximo Passo <i class="fi fi-rr-arrow-right"></i>';
  } else {
    btnNext.type = 'submit';
    const isEdit = document.getElementById('prop-id').value !== '';
    btnNext.innerHTML = (isEdit ? 'Salvar Alterações' : 'Salvar Cadastro') + ' <i class="fi fi-rr-check"></i>';
    renderPropRevision();
  }
}

function validatePropStep(step) {
  const pane = document.getElementById(`prop-wizard-pane-${step}`);
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

function renderPropRevision() {
  const container = document.getElementById('prop-revisao-conteudo');
  if (!container) return;
  
  const tipo = document.getElementById('prop-tipo_pessoa').value;
  const status = document.getElementById('prop-status').value;
  const nome = document.getElementById('prop-nome_razao_social').value || '-';
  const fantasia = document.getElementById('prop-nome_fantasia').value || '-';
  const cpfCnpj = document.getElementById('prop-cpf_cnpj').value || '-';
  const rg = document.getElementById('prop-rg').value || '-';
  const rgOrgao = document.getElementById('prop-rg_orgao').value || '-';
  const rgUf = document.getElementById('prop-rg_uf').value || '-';
  const ie = document.getElementById('prop-inscricao_estadual').value || '-';
  const responsavel = document.getElementById('prop-responsavel').value || '-';
  const telefone = document.getElementById('prop-telefone').value || '-';
  const email = document.getElementById('prop-email').value || '-';
  const endereco = document.getElementById('prop-endereco').value || 'Não informado';
  
  const dataNasc = document.getElementById('prop-data_nascimento').value ? formatDate(document.getElementById('prop-data_nascimento').value) : 'Não informada';
  const genero = document.getElementById('prop-genero').value || 'Não informado';
  const nacionalidade = document.getElementById('prop-nacionalidade').value || '-';
  const estadoCivil = document.getElementById('prop-estado_civil').value || 'Não informado';
  const profissao = document.getElementById('prop-profissao').value || '-';
  const repNome = document.getElementById('prop-representante_nome').value || '-';
  const repCpf = document.getElementById('prop-representante_cpf').value || '-';
  
  const observacoes = document.getElementById('prop-observacoes').value || 'Nenhuma';

  let html = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; font-size: 13px;">
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Tipo de Pessoa</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Status</span>
        <span class="badge ${status === 'ativo' ? 'badge-ativo' : 'badge-inativo'}">${status}</span>
      </div>
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">${tipo === 'PF' ? 'Nome Completo' : 'Razão Social'}</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${nome}</span>
      </div>
  `;

  if (tipo === 'PJ') {
    html += `
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Nome Fantasia</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${fantasia}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">CNPJ</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${formatCpfCnpj(cpfCnpj)}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Inscrição Estadual</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${ie}</span>
      </div>
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Responsável PJ</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${responsavel}</span>
      </div>
    `;
  } else {
    html += `
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">CPF</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${formatCpfCnpj(cpfCnpj)}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">RG / Emissor</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${rg} ${rgOrgao}/${rgUf}</span>
      </div>
    `;
  }

  html += `
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Telefone</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${formatTelefone(telefone)}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">E-mail</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${email}</span>
      </div>
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Data de Nascimento</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${dataNasc}</span>
        </div>
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Gênero</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${genero}</span>
        </div>
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Nacionalidade</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${nacionalidade}</span>
        </div>
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Estado Civil</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${estadoCivil}</span>
        </div>
        <div style="grid-column: span 2;">
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Profissão</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${profissao}</span>
        </div>
      </div>
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Representante Legal</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${repNome}</span>
        </div>
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">CPF Representante</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${formatCpfCnpj(repCpf)}</span>
        </div>
      </div>
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Endereço Completo</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${endereco}</span>
      </div>
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Observações</span>
        <span style="font-weight: 500; color: var(--color-text-main);">${observacoes}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function goToLocStep(step) {
  locCurrentStep = step;
  
  if (step === 3) {
    const isEdit = document.getElementById('loc-id').value !== '';
    const dc = document.getElementById('loc-wizard-documents-card');
    const ic = document.getElementById('loc-wizard-informative-card');
    if (dc) dc.style.display = isEdit ? 'block' : 'none';
    if (ic) ic.style.display = isEdit ? 'none' : 'block';
  }

  // Update step elements in sidebar
  document.querySelectorAll('#modal-locatario .wizard-step').forEach(el => {
    const targetStep = parseInt(el.getAttribute('data-step-target'));
    el.classList.toggle('active', targetStep === step);
  });
  
  // Show active pane
  document.querySelectorAll('#modal-locatario .wizard-pane').forEach(el => {
    el.style.display = el.getAttribute('id') === `loc-wizard-pane-${step}` ? 'block' : 'none';
  });
  
  // Configure footer buttons
  const btnPrev = document.getElementById('loc-wizard-btn-prev');
  const btnNext = document.getElementById('loc-wizard-btn-next');
  
  if (step === 1) {
    btnPrev.textContent = 'Cancelar';
  } else {
    btnPrev.textContent = '← Voltar';
  }
  
  if (step < 5) {
    btnNext.type = 'button';
    btnNext.innerHTML = 'Próximo Passo <i class="fi fi-rr-arrow-right"></i>';
  } else {
    btnNext.type = 'submit';
    const isEdit = document.getElementById('loc-id').value !== '';
    btnNext.innerHTML = (isEdit ? 'Salvar Alterações' : 'Salvar Cadastro') + ' <i class="fi fi-rr-check"></i>';
    renderLocRevision();
  }
}

function validateLocStep(step) {
  const pane = document.getElementById(`loc-wizard-pane-${step}`);
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

function renderLocRevision() {
  const container = document.getElementById('loc-revisao-conteudo');
  if (!container) return;
  
  const tipo = document.getElementById('loc-tipo_pessoa').value;
  const status = document.getElementById('loc-status').value;
  const nome = document.getElementById('loc-nome_razao_social').value || '-';
  const fantasia = document.getElementById('loc-nome_fantasia').value || '-';
  const cpfCnpj = document.getElementById('loc-cpf_cnpj').value || '-';
  const rg = document.getElementById('loc-rg').value || '-';
  const rgOrgao = document.getElementById('loc-rg_orgao').value || '-';
  const rgUf = document.getElementById('loc-rg_uf').value || '-';
  const ie = document.getElementById('loc-inscricao_estadual').value || '-';
  const responsavel = document.getElementById('loc-responsavel').value || '-';
  const telefone = document.getElementById('loc-telefone').value || '-';
  const email = document.getElementById('loc-email').value || '-';
  const endereco = document.getElementById('loc-endereco').value || 'Não informado';
  
  const dataNasc = document.getElementById('loc-data_nascimento').value ? formatDate(document.getElementById('loc-data_nascimento').value) : 'Não informada';
  const genero = document.getElementById('loc-genero').value || 'Não informado';
  const nacionalidade = document.getElementById('loc-nacionalidade').value || '-';
  const estadoCivil = document.getElementById('loc-estado_civil').value || 'Não informado';
  const profissao = document.getElementById('loc-profissao').value || '-';
  
  const observacoes = document.getElementById('loc-observacoes').value || 'Nenhuma';

  let html = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; font-size: 13px;">
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Tipo de Pessoa</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Status</span>
        <span class="badge ${status === 'ativo' ? 'badge-ativo' : 'badge-inativo'}">${status}</span>
      </div>
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">${tipo === 'PF' ? 'Nome Completo' : 'Razão Social'}</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${nome}</span>
      </div>
  `;

  if (tipo === 'PJ') {
    html += `
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Nome Fantasia</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${fantasia}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">CNPJ</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${formatCpfCnpj(cpfCnpj)}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Inscrição Estadual</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${ie}</span>
      </div>
      <div style="grid-column: span 2;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Responsável PJ</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${responsavel}</span>
      </div>
    `;
  } else {
    html += `
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">CPF</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${formatCpfCnpj(cpfCnpj)}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">RG / Emissor</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${rg} ${rgOrgao}/${rgUf}</span>
      </div>
    `;
  }

  html += `
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Telefone</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${formatTelefone(telefone)}</span>
      </div>
      <div>
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">E-mail</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${email}</span>
      </div>
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Data de Nascimento</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${dataNasc}</span>
        </div>
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Gênero</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${genero}</span>
        </div>
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Nacionalidade</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${nacionalidade}</span>
        </div>
        <div>
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Estado Civil</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${estadoCivil}</span>
        </div>
        <div style="grid-column: span 2;">
          <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Profissão</span>
          <span style="font-weight: 600; color: var(--color-text-main);">${profissao}</span>
        </div>
      </div>
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Endereço Completo</span>
        <span style="font-weight: 600; color: var(--color-text-main);">${endereco}</span>
      </div>
      <div style="grid-column: span 2; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px;">
        <span style="display:block; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); font-weight:600;">Observações</span>
        <span style="font-weight: 500; color: var(--color-text-main);">${observacoes}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// Details modals tab switching
function switchPropDetailTab(tabId) {
  document.querySelectorAll('[data-tab^="prop-"]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('#modal-detalhes-proprietario .tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === `tab-${tabId}`);
  });
}

function switchLocDetailTab(tabId) {
  document.querySelectorAll('[data-tab^="loc-"]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('#modal-detalhes-locatario .tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === `tab-${tabId}`);
  });
}

// Form toggles based on Person Type
function switchPropTipoPessoa(type) {
  const labelNome = document.getElementById('prop-label-nome');
  const inputNome = document.getElementById('prop-nome_razao_social');
  const labelDoc = document.getElementById('prop-label-documento');
  const inputDoc = document.getElementById('prop-cpf_cnpj');
  
  const groupFantasia = document.getElementById('prop-group-fantasia');
  const groupRg = document.getElementById('prop-group-rg');
  const groupPjRow = document.getElementById('prop-group-pj-row');

  if (type === 'PF') {
    labelNome.textContent = 'Nome Completo';
    inputNome.placeholder = 'Nome do proprietário';
    labelDoc.textContent = 'CPF';
    inputDoc.placeholder = '000.000.000-00';
    groupFantasia.style.display = 'none';
    groupRg.style.display = 'grid';
    groupPjRow.style.display = 'none';
  } else {
    labelNome.textContent = 'Razão Social';
    inputNome.placeholder = 'Razão social da empresa';
    labelDoc.textContent = 'CNPJ';
    inputDoc.placeholder = '00.000.000/0000-00';
    groupFantasia.style.display = 'block';
    groupRg.style.display = 'none';
    groupPjRow.style.display = 'grid';
  }
}

function switchLocTipoPessoa(type) {
  const labelNome = document.getElementById('loc-label-nome');
  const inputNome = document.getElementById('loc-nome_razao_social');
  const labelDoc = document.getElementById('loc-label-documento');
  const inputDoc = document.getElementById('loc-cpf_cnpj');
  
  const groupFantasia = document.getElementById('loc-group-fantasia');
  const groupRg = document.getElementById('loc-group-rg');
  const groupPjRow = document.getElementById('loc-group-pj-row');

  if (type === 'PF') {
    labelNome.textContent = 'Nome Completo';
    inputNome.placeholder = 'Nome do locatário';
    labelDoc.textContent = 'CPF';
    inputDoc.placeholder = '000.000.000-00';
    groupFantasia.style.display = 'none';
    groupRg.style.display = 'grid';
    groupPjRow.style.display = 'none';
  } else {
    labelNome.textContent = 'Razão Social';
    inputNome.placeholder = 'Razão social da empresa';
    labelDoc.textContent = 'CNPJ';
    inputDoc.placeholder = '00.000.000/0000-00';
    groupFantasia.style.display = 'block';
    groupRg.style.display = 'none';
    groupPjRow.style.display = 'grid';
  }
}

// Add forms initialization
function abrirNovoProprietario() {
  document.getElementById('form-proprietario').reset();
  document.getElementById('prop-id').value = '';
  document.getElementById('prop-modal-title').textContent = 'Novo Proprietário';
  document.getElementById('prop-status').value = 'ativo';
  switchPropTipoPessoa('PF');
  goToPropStep(1);
  document.getElementById('modal-proprietario').classList.add('active');
}

function abrirNovoLocatario() {
  document.getElementById('form-locatario').reset();
  document.getElementById('loc-id').value = '';
  document.getElementById('loc-modal-title').textContent = 'Novo Locatário';
  document.getElementById('loc-status').value = 'ativo';
  switchLocTipoPessoa('PF');
  goToLocStep(1);
  document.getElementById('modal-locatario').classList.add('active');
}

// Load lists
async function carregarProprietarios(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...propFilters
    }).toString();

    const res = await api.get(`/api/proprietarios?${query}`);
    const tbody = document.getElementById('proprietarios-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">Nenhum proprietário encontrado.</td></tr>`;
      document.getElementById('prop-pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updatePropPaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(p => {
      const formattedDoc = formatCpfCnpj(p.cpf_cnpj);
      const formattedPhone = formatTelefone(p.telefone);
      const badgeClass = p.status === 'inativo' ? 'badge-inativo' : 'badge-ativo';
      const badgeText = p.status === 'inativo' ? 'Inativo' : 'Ativo';

      let actions = `<button onclick="verDetalhesProprietario('${p.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i></button>`;
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarProprietario('${p.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i></button>`;
      }
      if (userProfile === 'administrador') {
        actions += `<button onclick="excluirProprietario('${p.id}', '${p.nome_razao_social}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Excluir"><i class="fi fi-rr-trash"></i></button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${p.nome_razao_social}</strong></td>
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
    
    document.getElementById('prop-pagination-info').textContent = `Mostrando ${start} a ${end} de ${total} registros`;
    updatePropPaginationControls(pages, page);
  } catch (err) {
    console.error('Error loading owners:', err);
    showToast('Erro ao obter proprietários.', 'error');
  } finally {
    hideLoader();
  }
}

async function carregarLocatarios(page) {
  showLoader();
  try {
    const query = new URLSearchParams({
      page,
      limit,
      ...locFilters
    }).toString();

    const res = await api.get(`/api/locatarios?${query}`);
    const tbody = document.getElementById('locatarios-list-body');

    if (!res.success || !res.data || res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">Nenhum locatário encontrado.</td></tr>`;
      document.getElementById('loc-pagination-info').textContent = 'Mostrando 0 de 0 registros';
      updateLocPaginationControls(0, page);
      return;
    }

    tbody.innerHTML = res.data.map(l => {
      const formattedDoc = formatCpfCnpj(l.cpf_cnpj);
      const formattedPhone = formatTelefone(l.telefone);
      const badgeClass = l.status === 'inativo' ? 'badge-inativo' : 'badge-ativo';
      const badgeText = l.status === 'inativo' ? 'Inativo' : 'Ativo';

      let actions = `<button onclick="verDetalhesLocatario('${l.id}')" class="btn btn-secondary btn-icon" title="Ver Ficha"><i class="fi fi-rr-eye"></i></button>`;
      if (userProfile === 'administrador' || userProfile === 'operacional') {
        actions += `<button onclick="editarLocatario('${l.id}')" class="btn btn-secondary btn-icon" style="margin-left: 6px;" title="Editar"><i class="fi fi-rr-edit"></i></button>`;
      }
      if (userProfile === 'administrador') {
        actions += `<button onclick="excluirLocatario('${l.id}', '${l.nome_razao_social}')" class="btn btn-danger btn-icon" style="margin-left: 6px;" title="Excluir"><i class="fi fi-rr-trash"></i></button>`;
      }

      return `
        <tr class="animate-fade-in">
          <td><strong>${l.nome_razao_social}</strong></td>
          <td>${formattedDoc}</td>
          <td>${formattedPhone}</td>
          <td>${l.email}</td>
          <td style="text-align: center;">${l.qtd_contratos || 0}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td style="text-align: right; padding-right: 24px;">${actions}</td>
        </tr>
      `;
    }).join('');

    const total = res.pagination.total;
    const pages = res.pagination.pages;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    
    document.getElementById('loc-pagination-info').textContent = `Mostrando ${start} a ${end} de ${total} registros`;
    updateLocPaginationControls(pages, page);
  } catch (err) {
    console.error('Error loading tenants:', err);
    showToast('Erro ao obter locatários.', 'error');
  } finally {
    hideLoader();
  }
}

function updatePropPaginationControls(totalPages, activePage) {
  const btnPrev = document.getElementById('prop-btn-prev');
  const btnNext = document.getElementById('prop-btn-next');
  btnPrev.disabled = activePage <= 1;
  btnNext.disabled = activePage >= totalPages;
}

function updateLocPaginationControls(totalPages, activePage) {
  const btnPrev = document.getElementById('loc-btn-prev');
  const btnNext = document.getElementById('loc-btn-next');
  btnPrev.disabled = activePage <= 1;
  btnNext.disabled = activePage >= totalPages;
}

// Saves/Updates Owners
async function handleSaveProprietario(e) {
  e.preventDefault();
  const id = document.getElementById('prop-id').value;
  const novoStatus = document.getElementById('prop-status').value;
  
  const payload = {
    tipo_pessoa: document.getElementById('prop-tipo_pessoa').value,
    nome_razao_social: document.getElementById('prop-nome_razao_social').value,
    nome_fantasia: document.getElementById('prop-nome_fantasia').value,
    cpf_cnpj: document.getElementById('prop-cpf_cnpj').value,
    rg: document.getElementById('prop-rg').value,
    rg_orgao: document.getElementById('prop-rg_orgao').value,
    rg_uf: document.getElementById('prop-rg_uf').value,
    inscricao_estadual: document.getElementById('prop-inscricao_estadual').value,
    responsavel: document.getElementById('prop-responsavel').value,
    telefone: document.getElementById('prop-telefone').value,
    email: document.getElementById('prop-email').value,
    endereco: document.getElementById('prop-endereco').value,
    observacoes: document.getElementById('prop-observacoes').value,
    status: novoStatus,
    data_nascimento: document.getElementById('prop-data_nascimento').value || null,
    genero: document.getElementById('prop-genero').value,
    nacionalidade: document.getElementById('prop-nacionalidade').value,
    estado_civil: document.getElementById('prop-estado_civil').value,
    profissao: document.getElementById('prop-profissao').value,
    representante_nome: document.getElementById('prop-representante_nome').value,
    representante_cpf: document.getElementById('prop-representante_cpf').value
  };

  try {
    let res;
    if (id) {
      const statusRes = await api.patch(`/api/proprietarios/${id}/status`, { status: novoStatus });
      if (!statusRes.success) {
        showToast(statusRes.message || 'Erro ao atualizar status.', 'error');
        return;
      }
      res = await api.put(`/api/proprietarios/${id}`, payload);
    } else {
      res = await api.post('/api/proprietarios', payload);
    }

    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('modal-proprietario').classList.remove('active');
      carregarProprietarios(propCurrentPage);
    } else {
      showToast(res.message || 'Erro ao salvar proprietário.', 'error');
      if (id) carregarProprietarios(propCurrentPage);
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
    if (id) carregarProprietarios(propCurrentPage);
  }
}

// Saves/Updates Tenants
async function handleSaveLocatario(e) {
  e.preventDefault();
  const id = document.getElementById('loc-id').value;
  const novoStatus = document.getElementById('loc-status').value;
  
  const payload = {
    tipo_pessoa: document.getElementById('loc-tipo_pessoa').value,
    nome_razao_social: document.getElementById('loc-nome_razao_social').value,
    nome_fantasia: document.getElementById('loc-nome_fantasia').value,
    cpf_cnpj: document.getElementById('loc-cpf_cnpj').value,
    rg: document.getElementById('loc-rg').value,
    rg_orgao: document.getElementById('loc-rg_orgao').value,
    rg_uf: document.getElementById('loc-rg_uf').value,
    inscricao_estadual: document.getElementById('loc-inscricao_estadual').value,
    responsavel: document.getElementById('loc-responsavel').value,
    telefone: document.getElementById('loc-telefone').value,
    email: document.getElementById('loc-email').value,
    endereco: document.getElementById('loc-endereco').value,
    observacoes: document.getElementById('loc-observacoes').value,
    status: novoStatus,
    data_nascimento: document.getElementById('loc-data_nascimento').value || null,
    genero: document.getElementById('loc-genero').value,
    nacionalidade: document.getElementById('loc-nacionalidade').value,
    estado_civil: document.getElementById('loc-estado_civil').value,
    profissao: document.getElementById('loc-profissao').value
  };

  try {
    let res;
    if (id) {
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
      carregarLocatarios(locCurrentPage);
    } else {
      showToast(res.message || 'Erro ao salvar locatário.', 'error');
      if (id) carregarLocatarios(locCurrentPage);
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão.', 'error');
    if (id) carregarLocatarios(locCurrentPage);
  }
}

// Edit forms binders
window.editarProprietario = async function(id) {
  try {
    const res = await api.get(`/api/proprietarios/${id}`);
    if (res.success && res.data) {
      const p = res.data;
      
      document.getElementById('prop-id').value = p.id;
      document.getElementById('prop-tipo_pessoa').value = p.tipo_pessoa;
      switchPropTipoPessoa(p.tipo_pessoa);
      
      document.getElementById('prop-nome_razao_social').value = p.nome_razao_social;
      document.getElementById('prop-nome_fantasia').value = p.nome_fantasia || '';
      document.getElementById('prop-cpf_cnpj').value = p.cpf_cnpj;
      document.getElementById('prop-rg').value = p.rg || '';
      document.getElementById('prop-rg_orgao').value = p.rg_orgao || '';
      document.getElementById('prop-rg_uf').value = p.rg_uf || '';
      document.getElementById('prop-inscricao_estadual').value = p.inscricao_estadual || '';
      document.getElementById('prop-responsavel').value = p.responsavel || '';
      document.getElementById('prop-telefone').value = p.telefone;
      document.getElementById('prop-email').value = p.email;
      document.getElementById('prop-endereco').value = p.endereco || '';
      document.getElementById('prop-data_nascimento').value = p.data_nascimento ? p.data_nascimento.split('T')[0] : '';
      document.getElementById('prop-genero').value = p.genero || 'Não informado';
      document.getElementById('prop-nacionalidade').value = p.nacionalidade || '';
      document.getElementById('prop-estado_civil').value = p.estado_civil || 'Não informado';
      document.getElementById('prop-profissao').value = p.profissao || '';
      document.getElementById('prop-representante_nome').value = p.representante_nome || '';
      document.getElementById('prop-representante_cpf').value = formatCpfCnpj(p.representante_cpf || '');
      document.getElementById('prop-observacoes').value = p.observacoes || '';
      document.getElementById('prop-status').value = p.status;

      document.getElementById('prop-modal-title').textContent = 'Editar Proprietário';
      currentProprietarioId = p.id;
      renderPropWizardDocumentos(p.documentos || []);
      goToPropStep(1);
      document.getElementById('modal-proprietario').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao carregar proprietário.', 'error');
  }
};

window.editarLocatario = async function(id) {
  try {
    const res = await api.get(`/api/locatarios/${id}`);
    if (res.success && res.data) {
      const l = res.data;
      
      document.getElementById('loc-id').value = l.id;
      document.getElementById('loc-tipo_pessoa').value = l.tipo_pessoa;
      switchLocTipoPessoa(l.tipo_pessoa);
      
      document.getElementById('loc-nome_razao_social').value = l.nome_razao_social;
      document.getElementById('loc-nome_fantasia').value = l.nome_fantasia || '';
      document.getElementById('loc-cpf_cnpj').value = l.cpf_cnpj;
      document.getElementById('loc-rg').value = l.rg || '';
      document.getElementById('loc-rg_orgao').value = l.rg_orgao || '';
      document.getElementById('loc-rg_uf').value = l.rg_uf || '';
      document.getElementById('loc-inscricao_estadual').value = l.inscricao_estadual || '';
      document.getElementById('loc-responsavel').value = l.responsavel || '';
      document.getElementById('loc-telefone').value = l.telefone;
      document.getElementById('loc-email').value = l.email;
      document.getElementById('loc-endereco').value = l.endereco || '';
      document.getElementById('loc-data_nascimento').value = l.data_nascimento ? l.data_nascimento.split('T')[0] : '';
      document.getElementById('loc-genero').value = l.genero || 'Não informado';
      document.getElementById('loc-nacionalidade').value = l.nacionalidade || '';
      document.getElementById('loc-estado_civil').value = l.estado_civil || 'Não informado';
      document.getElementById('loc-profissao').value = l.profissao || '';
      document.getElementById('loc-observacoes').value = l.observacoes || '';
      document.getElementById('loc-status').value = l.status;

      document.getElementById('loc-modal-title').textContent = 'Editar Locatário';
      currentLocatarioId = l.id;
      renderLocWizardDocumentos(l.documentos || []);
      goToLocStep(1);
      document.getElementById('modal-locatario').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao carregar locatário.', 'error');
  }
};

window.excluirProprietario = async function(id, nome) {
  const confirmar = await confirmarAcao('Excluir Proprietário', `Deseja realmente excluir o proprietário "${nome}"? Esta ação é permanente.`, 'Excluir', 'Cancelar', true);
  if (confirmar) {
    try {
      const res = await api.delete(`/api/proprietarios/${id}`);
      if (res.success) {
        showToast('Proprietário excluído com sucesso.', 'success');
        carregarProprietarios(propCurrentPage);
      } else {
        showToast(res.message || 'Erro ao excluir.', 'error');
      }
    } catch (err) {
      showToast('Falha na exclusão.', 'error');
    }
  }
};

window.excluirLocatario = async function(id, nome) {
  const confirmar = await confirmarAcao('Excluir Locatário', `Deseja realmente excluir o locatário "${nome}"? Esta ação é permanente.`, 'Excluir', 'Cancelar', true);
  if (confirmar) {
    try {
      const res = await api.delete(`/api/locatarios/${id}`);
      if (res.success) {
        showToast('Locatário excluído com sucesso.', 'success');
        carregarLocatarios(locCurrentPage);
      } else {
        showToast(res.message || 'Erro ao excluir.', 'error');
      }
    } catch (err) {
      showToast('Falha na exclusão.', 'error');
    }
  }
};

// View Details Proprietários
window.verDetalhesProprietario = async function(id) {
  try {
    const res = await api.get(`/api/proprietarios/${id}`);
    if (res.success && res.data) {
      const p = res.data;
      currentProprietarioId = p.id;

      document.getElementById('prop-det-titulo').textContent = p.nome_razao_social;
      
      const badgeTipo = document.getElementById('prop-det-badge-tipo');
      badgeTipo.textContent = p.tipo_pessoa;
      badgeTipo.className = `badge ${p.tipo_pessoa === 'PF' ? 'badge-pf' : 'badge-pj'}`;

      const badgeStatus = document.getElementById('prop-det-badge-status');
      badgeStatus.textContent = p.status === 'ativo' ? 'Ativo' : 'Inativo';
      badgeStatus.className = `badge ${p.status === 'ativo' ? 'badge-ativo' : 'badge-inativo'}`;

      // Tab Dados Gerais
      document.getElementById('prop-det-documento').textContent = formatCpfCnpj(p.cpf_cnpj);
      document.getElementById('prop-det-telefone').textContent = formatTelefone(p.telefone);
      document.getElementById('prop-det-email').textContent = p.email;
      document.getElementById('prop-det-endereco').textContent = p.endereco || 'Não informado';
      document.getElementById('prop-det-observacoes').textContent = p.observacoes || 'Nenhuma observação interna.';

      const labelDoc = document.getElementById('prop-det-label-doc');
      labelDoc.textContent = p.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ';

      const containerRg = document.getElementById('prop-det-container-rg');
      const containerIe = document.getElementById('prop-det-container-ie');
      const containerResp = document.getElementById('prop-det-container-responsavel');

      if (p.tipo_pessoa === 'PF') {
        containerRg.style.display = 'block';
        containerIe.style.display = 'none';
        containerResp.style.display = 'none';
        const rgEmissorStr = `${p.rg || '-'}${p.rg_orgao ? ' ' + p.rg_orgao : ''}${p.rg_uf ? '/' + p.rg_uf : ''}`;
        document.getElementById('prop-det-rg').textContent = rgEmissorStr;
      } else {
        containerRg.style.display = 'none';
        containerIe.style.display = 'block';
        containerResp.style.display = 'block';
        document.getElementById('prop-det-ie').textContent = p.inscricao_estadual || '-';
        document.getElementById('prop-det-responsavel').textContent = p.responsavel || '-';
      }

      document.getElementById('prop-det-data-nascimento').textContent = p.data_nascimento ? formatDate(p.data_nascimento) : 'Não informada';
      document.getElementById('prop-det-genero').textContent = p.genero || 'Não informado';
      document.getElementById('prop-det-nacionalidade').textContent = p.nacionalidade || 'Não informada';
      document.getElementById('prop-det-estado-civil').textContent = p.estado_civil || 'Não informado';
      document.getElementById('prop-det-profissao').textContent = p.profissao || 'Não informada';
      document.getElementById('prop-det-representante-nome').textContent = p.representante_nome || 'Nenhum';
      document.getElementById('prop-det-representante-cpf').textContent = p.representante_cpf ? formatCpfCnpj(p.representante_cpf) : 'Nenhum';

      document.getElementById('prop-det-doc-count').textContent = p.documentos ? p.documentos.length : 0;
      document.getElementById('prop-det-imovel-count').textContent = p.imoveis ? p.imoveis.length : 0;

      // Render Sub-list templates
      renderPropDocumentos(p.documentos);
      renderPropImoveis(p.imoveis);
      renderPropTimeline(p.timeline);

      switchPropDetailTab('prop-det-gerais');
      document.getElementById('modal-detalhes-proprietario').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao carregar ficha do proprietário.', 'error');
  }
};

function renderPropDocumentos(docs) {
  const container = document.getElementById('prop-det-documentos-list');
  if (!docs || docs.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum documento anexado.</div>`;
    return;
  }

  container.innerHTML = docs.map(d => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button onclick="excluirPropDocumento('${d.id}')" style="background:none; border:none; color:var(--color-error); font-size:16px; cursor:pointer;" title="Remover Documento"><i class="fi fi-rr-trash"></i></button>`;
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

function renderPropImoveis(imoveis) {
  const tbody = document.getElementById('prop-det-imoveis-list-body');
  if (!imoveis || imoveis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum imóvel vinculado.</td></tr>`;
    return;
  }

  tbody.innerHTML = imoveis.map(i => {
    return `
      <tr>
        <td><strong>${i.nome}</strong></td>
        <td>${i.tipo}</td>
        <td><span class="badge ${i.status === 'Disponível' ? 'badge-ativo' : 'badge-pf'}">${i.status}</span></td>
        <td>${formatCurrency(i.valor_locacao)}</td>
      </tr>
    `;
  }).join('');
}

function renderPropTimeline(timeline) {
  const container = document.getElementById('prop-det-timeline-list');
  if (!timeline || timeline.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum histórico registrado.</div>`;
    return;
  }

  container.innerHTML = timeline.map(t => {
    return `
      <div class="timeline-item animate-fade-in">
        <div class="timeline-time">${formatDate(t.data_hora)} por <strong>${t.usuario_nome || 'Sistema'}</strong></div>
        <div class="timeline-title">${t.acao}</div>
        <p class="timeline-desc">${t.descricao}</p>
      </div>
    `;
  }).join('');
}

// View Details Locatários
window.verDetalhesLocatario = async function(id) {
  try {
    const res = await api.get(`/api/locatarios/${id}`);
    if (res.success && res.data) {
      const l = res.data;
      currentLocatarioId = l.id;

      document.getElementById('loc-det-titulo').textContent = l.nome_razao_social;
      
      const badgeTipo = document.getElementById('loc-det-badge-tipo');
      badgeTipo.textContent = l.tipo_pessoa;
      badgeTipo.className = `badge ${l.tipo_pessoa === 'PF' ? 'badge-pf' : 'badge-pj'}`;

      const badgeStatus = document.getElementById('loc-det-badge-status');
      badgeStatus.textContent = l.status === 'ativo' ? 'Ativo' : 'Inativo';
      badgeStatus.className = `badge ${l.status === 'ativo' ? 'badge-ativo' : 'badge-inativo'}`;

      // Tab Dados Gerais
      document.getElementById('loc-det-documento').textContent = formatCpfCnpj(l.cpf_cnpj);
      document.getElementById('loc-det-telefone').textContent = formatTelefone(l.telefone);
      document.getElementById('loc-det-email').textContent = l.email;
      document.getElementById('loc-det-endereco').textContent = l.endereco || 'Não informado';
      document.getElementById('loc-det-observacoes').textContent = l.observacoes || 'Nenhuma observação interna.';

      const labelDoc = document.getElementById('loc-det-label-doc');
      labelDoc.textContent = l.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ';

      const containerRg = document.getElementById('loc-det-container-rg');
      const containerIe = document.getElementById('loc-det-container-ie');
      const containerResp = document.getElementById('loc-det-container-responsavel');

      if (l.tipo_pessoa === 'PF') {
        containerRg.style.display = 'block';
        containerIe.style.display = 'none';
        containerResp.style.display = 'none';
        const rgEmissorStr = `${l.rg || '-'}${l.rg_orgao ? ' ' + l.rg_orgao : ''}${l.rg_uf ? '/' + l.rg_uf : ''}`;
        document.getElementById('loc-det-rg').textContent = rgEmissorStr;
      } else {
        containerRg.style.display = 'none';
        containerIe.style.display = 'block';
        containerResp.style.display = 'block';
        document.getElementById('loc-det-ie').textContent = l.inscricao_estadual || '-';
        document.getElementById('loc-det-responsavel').textContent = l.responsavel || '-';
      }

      document.getElementById('loc-det-data-nascimento').textContent = l.data_nascimento ? formatDate(l.data_nascimento) : 'Não informada';
      document.getElementById('loc-det-genero').textContent = l.genero || 'Não informado';
      document.getElementById('loc-det-nacionalidade').textContent = l.nacionalidade || 'Não informada';
      document.getElementById('loc-det-estado-civil').textContent = l.estado_civil || 'Não informado';
      document.getElementById('loc-det-profissao').textContent = l.profissao || 'Não informada';

      document.getElementById('loc-det-doc-count').textContent = l.documentos ? l.documentos.length : 0;
      document.getElementById('loc-det-contrato-count').textContent = l.contratos ? l.contratos.length : 0;
      document.getElementById('loc-det-imovel-count').textContent = l.imoveis ? l.imoveis.length : 0;
      document.getElementById('loc-det-recebimento-count').textContent = l.recebimentos ? l.recebimentos.length : 0;

      // Populate upload type selectors
      const select = document.getElementById('loc-doc-tipo');
      if (l.tipo_pessoa === 'PF') {
        select.innerHTML = `<option value="CPF">CPF</option><option value="RG">RG</option><option value="Comprovante de Endereço">Comprovante de Endereço</option><option value="Outros">Outros</option>`;
      } else {
        select.innerHTML = `<option value="CNPJ">CNPJ</option><option value="Contrato Social">Contrato Social</option><option value="Comprovante de Endereço">Comprovante de Endereço</option><option value="Outros">Outros</option>`;
      }

      // Render Sub-list templates
      renderLocDocumentos(l.documentos);
      renderLocContratos(l.contratos);
      renderLocImoveis(l.imoveis);
      renderLocRecebimentos(l.recebimentos);
      renderLocTimeline(l.timeline);

      switchLocDetailTab('loc-det-gerais');
      document.getElementById('modal-detalhes-locatario').classList.add('active');
    }
  } catch (err) {
    showToast('Erro ao carregar ficha do locatário.', 'error');
  }
};

function renderLocDocumentos(docs) {
  const container = document.getElementById('loc-det-documentos-list');
  if (!docs || docs.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum documento anexado.</div>`;
    return;
  }

  container.innerHTML = docs.map(d => {
    let deleteBtn = '';
    if (userProfile === 'administrador' || userProfile === 'operacional') {
      deleteBtn = `<button onclick="excluirLocDocumento('${d.id}')" style="background:none; border:none; color:var(--color-error); font-size:16px; cursor:pointer;" title="Remover Documento"><i class="fi fi-rr-trash"></i></button>`;
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

function renderLocContratos(contratos) {
  const tbody = document.getElementById('loc-det-contratos-list-body');
  if (!contratos || contratos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum contrato associado.</td></tr>`;
    return;
  }

  tbody.innerHTML = contratos.map(c => {
    return `
      <tr>
        <td><strong>${c.imovel_nome}</strong></td>
        <td>${formatDate(c.data_inicio)}</td>
        <td>${formatDate(c.data_fim)}</td>
        <td>${formatCurrency(c.valor_mensal)}</td>
        <td><span class="badge ${c.status === 'Ativo' ? 'badge-ativo' : 'badge-inativo'}">${c.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderLocImoveis(imoveis) {
  const tbody = document.getElementById('loc-det-imoveis-list-body');
  if (!imoveis || imoveis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhum imóvel vinculado.</td></tr>`;
    return;
  }

  tbody.innerHTML = imoveis.map(i => {
    return `
      <tr>
        <td><strong>${i.nome}</strong></td>
        <td>${i.tipo}</td>
        <td><span class="badge ${i.status === 'Disponível' ? 'badge-ativo' : 'badge-pf'}">${i.status}</span></td>
        <td>${formatCurrency(i.valor_locacao)}</td>
      </tr>
    `;
  }).join('');
}

function renderLocRecebimentos(recebimentos) {
  const tbody = document.getElementById('loc-det-recebimentos-list-body');
  if (!recebimentos || recebimentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhum recebimento registrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = recebimentos.map(r => {
    let badgeClass = 'badge-inativo';
    if (r.status === 'Pago') badgeClass = 'badge-ativo';
    if (r.status === 'Parcial') badgeClass = 'badge-pj';
    if (r.status === 'A Vencer') badgeClass = 'badge-pf';

    return `
      <tr>
        <td>${formatDate(r.competencia)}</td>
        <td>${formatDate(r.vencimento)}</td>
        <td>${formatCurrency(r.valor_previsto)}</td>
        <td>${r.valor_recebido ? formatCurrency(r.valor_recebido) : '-'}</td>
        <td><span class="badge ${badgeClass}">${r.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderLocTimeline(timeline) {
  const container = document.getElementById('loc-det-timeline-list');
  if (!timeline || timeline.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhum histórico registrado.</div>`;
    return;
  }

  container.innerHTML = timeline.map(t => {
    return `
      <div class="timeline-item animate-fade-in">
        <div class="timeline-time">${formatDate(t.data_hora)} por <strong>${t.usuario_nome || 'Sistema'}</strong></div>
        <div class="timeline-title">${t.acao}</div>
        <p class="timeline-desc">${t.descricao}</p>
      </div>
    `;
  }).join('');
}

// Upload documents actions
async function handleUploadPropDocumento(e) {
  e.preventDefault();
  const fileInput = document.getElementById('prop-doc-arquivo');
  const typeSelect = document.getElementById('prop-doc-tipo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_documento', typeSelect.value);

  showLoader();
  try {
    const res = await api.post(`/api/proprietarios/${currentProprietarioId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';
      const resDetails = await api.get(`/api/proprietarios/${currentProprietarioId}`);
      if (resDetails.success && resDetails.data) {
        document.getElementById('prop-det-doc-count').textContent = resDetails.data.documentos.length;
        renderPropDocumentos(resDetails.data.documentos);
        renderPropTimeline(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao anexar documento.', 'error');
    }
  } catch (err) {
    showToast('Falha no upload.', 'error');
  } finally {
    hideLoader();
  }
}

async function handleUploadLocDocumento(e) {
  e.preventDefault();
  const fileInput = document.getElementById('loc-doc-arquivo');
  const typeSelect = document.getElementById('loc-doc-tipo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_documento', typeSelect.value);

  showLoader();
  try {
    const res = await api.post(`/api/locatarios/${currentLocatarioId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';
      const resDetails = await api.get(`/api/locatarios/${currentLocatarioId}`);
      if (resDetails.success && resDetails.data) {
        document.getElementById('loc-det-doc-count').textContent = resDetails.data.documentos.length;
        renderLocDocumentos(resDetails.data.documentos);
        renderLocTimeline(resDetails.data.timeline);
      }
    } else {
      showToast(res.message || 'Erro ao anexar documento.', 'error');
    }
  } catch (err) {
    showToast('Falha no upload.', 'error');
  } finally {
    hideLoader();
  }
}

window.excluirPropDocumento = async function(docId) {
  const confirmar = await confirmarAcao('Remover Documento', 'Deseja realmente remover este documento?', 'Remover', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/proprietarios/documentos/${docId}`);
      if (res.success) {
        showToast(res.message, 'success');
        const resDetails = await api.get(`/api/proprietarios/${currentProprietarioId}`);
        if (resDetails.success && resDetails.data) {
          document.getElementById('prop-det-doc-count').textContent = resDetails.data.documentos.length;
          renderPropDocumentos(resDetails.data.documentos);
          renderPropTimeline(resDetails.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover.', 'error');
      }
    } catch (err) {
      showToast('Falha ao remover.', 'error');
    } finally {
      hideLoader();
    }
  }
};

window.excluirLocDocumento = async function(docId) {
  const confirmar = await confirmarAcao('Remover Documento', 'Deseja realmente remover este documento?', 'Remover', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/locatarios/documentos/${docId}`);
      if (res.success) {
        showToast(res.message, 'success');
        const resDetails = await api.get(`/api/locatarios/${currentLocatarioId}`);
        if (resDetails.success && resDetails.data) {
          document.getElementById('loc-det-doc-count').textContent = resDetails.data.documentos.length;
          renderLocDocumentos(resDetails.data.documentos);
          renderLocTimeline(resDetails.data.timeline);
        }
      } else {
        showToast(res.message || 'Erro ao remover.', 'error');
      }
    } catch (err) {
      showToast('Falha ao remover.', 'error');
    } finally {
      hideLoader();
    }
  }
};

// --- Pessoas Wizard Document Upload Logic ---

async function handlePropWizardUpload(e) {
  if (e) e.preventDefault();
  const fileInput = document.getElementById('prop-wizard-doc-arquivo');
  const typeSelect = document.getElementById('prop-wizard-doc-tipo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo para fazer upload.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_documento', typeSelect.value);

  showLoader();
  try {
    const res = await api.post(`/api/proprietarios/${currentProprietarioId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';
      const resDetails = await api.get(`/api/proprietarios/${currentProprietarioId}`);
      if (resDetails.success && resDetails.data) {
        renderPropWizardDocumentos(resDetails.data.documentos || []);
        renderPropDocumentos(resDetails.data.documentos || []);
        renderPropTimeline(resDetails.data.timeline || []);
      }
    } else {
      showToast(res.message || 'Erro ao anexar documento.', 'error');
    }
  } catch (err) {
    showToast('Falha no upload do documento.', 'error');
  } finally {
    hideLoader();
  }
}

async function handleLocWizardUpload(e) {
  if (e) e.preventDefault();
  const fileInput = document.getElementById('loc-wizard-doc-arquivo');
  const typeSelect = document.getElementById('loc-wizard-doc-tipo');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Escolha um arquivo para fazer upload.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('tipo_documento', typeSelect.value);

  showLoader();
  try {
    const res = await api.post(`/api/locatarios/${currentLocatarioId}/documentos`, formData, true);
    if (res.success) {
      showToast(res.message, 'success');
      fileInput.value = '';
      const resDetails = await api.get(`/api/locatarios/${currentLocatarioId}`);
      if (resDetails.success && resDetails.data) {
        renderLocWizardDocumentos(resDetails.data.documentos || []);
        renderLocDocumentos(resDetails.data.documentos || []);
        renderLocTimeline(resDetails.data.timeline || []);
      }
    } else {
      showToast(res.message || 'Erro ao anexar documento.', 'error');
    }
  } catch (err) {
    showToast('Falha no upload do documento.', 'error');
  } finally {
    hideLoader();
  }
}

window.excluirPropDocumentoWizard = async function(docId) {
  const confirmar = await confirmarAcao('Remover Documento', 'Deseja realmente remover este documento?', 'Remover', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/proprietarios/documentos/${docId}`);
      if (res.success) {
        showToast(res.message, 'success');
        const resDetails = await api.get(`/api/proprietarios/${currentProprietarioId}`);
        if (resDetails.success && resDetails.data) {
          renderPropWizardDocumentos(resDetails.data.documentos || []);
          renderPropDocumentos(resDetails.data.documentos || []);
          renderPropTimeline(resDetails.data.timeline || []);
        }
      } else {
        showToast(res.message || 'Erro ao remover.', 'error');
      }
    } catch (err) {
      showToast('Falha ao remover.', 'error');
    } finally {
      hideLoader();
    }
  }
};

window.excluirLocDocumentoWizard = async function(docId) {
  const confirmar = await confirmarAcao('Remover Documento', 'Deseja realmente remover este documento?', 'Remover', 'Cancelar', true);
  if (confirmar) {
    showLoader();
    try {
      const res = await api.delete(`/api/locatarios/documentos/${docId}`);
      if (res.success) {
        showToast(res.message, 'success');
        const resDetails = await api.get(`/api/locatarios/${currentLocatarioId}`);
        if (resDetails.success && resDetails.data) {
          renderLocWizardDocumentos(resDetails.data.documentos || []);
          renderLocDocumentos(resDetails.data.documentos || []);
          renderLocTimeline(resDetails.data.timeline || []);
        }
      } else {
        showToast(res.message || 'Erro ao remover.', 'error');
      }
    } catch (err) {
      showToast('Falha ao remover.', 'error');
    } finally {
      hideLoader();
    }
  }
};

function renderPropWizardDocumentos(docs) {
  const container = document.getElementById('prop-wizard-documents-list');
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
      deleteBtn = `<button type="button" onclick="excluirPropDocumentoWizard('${d.id}')" style="background:none; border:none; color:var(--color-error); font-size:14px; cursor:pointer;" title="Remover Documento"><i class="fi fi-rr-trash"></i></button>`;
    }
    const dateVal = formatDate(d.criado_em);

    return `
      <div class="document-item" style="padding: 8px 12px; margin-bottom: 8px; border: 1px solid var(--color-border); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fi fi-rr-document" style="font-size: 16px; color: var(--color-info);"></i>
          <div>
            <strong style="font-size:12px; color:var(--color-text-main);">${d.tipo_documento}</strong>
            <span style="font-size:10px; color:var(--color-text-muted); display:block;">${d.nome_arquivo} • ${dateVal}</span>
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

function renderLocWizardDocumentos(docs) {
  const container = document.getElementById('loc-wizard-documents-list');
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
      deleteBtn = `<button type="button" onclick="excluirLocDocumentoWizard('${d.id}')" style="background:none; border:none; color:var(--color-error); font-size:14px; cursor:pointer;" title="Remover Documento"><i class="fi fi-rr-trash"></i></button>`;
    }
    const dateVal = formatDate(d.criado_em);

    return `
      <div class="document-item" style="padding: 8px 12px; margin-bottom: 8px; border: 1px solid var(--color-border); border-radius: 6px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="fi fi-rr-document" style="font-size: 16px; color: var(--color-info);"></i>
          <div>
            <strong style="font-size:12px; color:var(--color-text-main);">${d.tipo_documento}</strong>
            <span style="font-size:10px; color:var(--color-text-muted); display:block;">${d.nome_arquivo} • ${dateVal}</span>
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
