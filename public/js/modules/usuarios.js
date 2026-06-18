// Client-side Users Management module

let currentPage = 1;
const limitPerPage = 10;
let userProfile = 'consulta'; // Default fallback

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/usuarios')) {
    initUsuarios();
  }
});

async function initUsuarios() {
  showLoader();
  try {
    // 1. Fetch current logged-in user profile to adjust permissions
    const sessionRes = await api.get('/api/auth/me');
    if (sessionRes.success && sessionRes.usuario) {
      userProfile = sessionRes.usuario.perfil;
      adjustUIForPermissions();
    }

    // 2. Load users list
    await loadUsuariosList(currentPage);

    // 3. Bind UI events
    bindEvents();
  } catch (error) {
    console.error('Error initializing users module:', error);
  } finally {
    hideLoader();
  }
}

/**
 * Hides or shows buttons based on current user permissions
 */
function adjustUIForPermissions() {
  const btnNovo = document.getElementById('btn-novo-usuario');
  if (userProfile === 'administrador') {
    if (btnNovo) btnNovo.style.display = 'inline-flex';
  } else {
    if (btnNovo) btnNovo.style.display = 'none';
  }
}

/**
 * Load users from API and render table
 */
async function loadUsuariosList(page = 1) {
  currentPage = page;
  
  const res = await api.get(`/api/usuarios?page=${page}&limit=${limitPerPage}`);
  
  const tbody = document.getElementById('usuarios-list-body');
  if (!res.success || !res.data) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--color-error);">${res.message || 'Erro ao carregar.'}</td></tr>`;
    return;
  }

  const users = res.data;
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--color-text-muted);">Nenhum usuário cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    // Determine profile badge class
    let badgeClass = 'badge-cons';
    if (user.perfil === 'administrador') badgeClass = 'badge-admin';
    if (user.perfil === 'operacional') badgeClass = 'badge-oper';

    // Format CPF (CPF stored cleaned, format for display: 000.000.000-00)
    let formattedCpf = user.cpf;
    if (user.cpf && user.cpf.length === 11) {
      formattedCpf = user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Actions rendering based on permissions
    let actionsHtml = '-';
    if (userProfile === 'administrador') {
      actionsHtml = `
        <div class="table-actions">
          <button class="btn-action btn-action-primary" onclick="openEditModal('${user.id}')" title="Editar Usuário">
            <i class="fi fi-rr-edit"></i>
          </button>
          <button class="btn-action" onclick="openResetPasswordModal('${user.id}')" title="Redefinir Senha">
            <i class="fi fi-rr-key"></i>
          </button>
          <button class="btn-action btn-action-danger" onclick="excluirUsuario('${user.id}', '${user.nome}')" title="Excluir Usuário">
            <i class="fi fi-rr-trash"></i>
          </button>
        </div>
      `;
    }

    return `
      <tr>
        <td style="font-weight:600; color:var(--color-text-main);">${user.nome}</td>
        <td>${formattedCpf}</td>
        <td>${user.email}</td>
        <td><span class="badge ${badgeClass}">${user.perfil}</span></td>
        <td><span class="badge ${user.status === 'ativo' ? 'badge-ativo' : 'badge-inativo'}">${user.status}</span></td>
        <td style="text-align: right; padding-right: 24px;">${actionsHtml}</td>
      </tr>
    `;
  }).join('');

  // Update pagination indicators
  const total = res.pagination.total;
  const pages = res.pagination.pages;
  document.getElementById('pagination-info').textContent = `Mostrando ${users.length} de ${total} registros (Página ${page} de ${pages})`;

  // Enable/disable page buttons
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');

  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= pages;
}

/**
 * Bind modal buttons and forms
 */
function bindEvents() {
  const btnNovo = document.getElementById('btn-novo-usuario');
  const modal = document.getElementById('modal-usuario');
  const form = document.getElementById('form-usuario');
  const btnClose = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancelar-modal');

  // Open creation modal
  if (btnNovo && modal) {
    btnNovo.addEventListener('click', () => {
      form.reset();
      document.getElementById('user-id').value = '';
      document.getElementById('modal-title').textContent = 'Novo Usuário';
      document.getElementById('password-group').style.display = 'flex';
      document.getElementById('senha').required = true;
      document.getElementById('status').value = 'ativo';
      document.getElementById('btn-salvar-usuario').textContent = 'Cadastrar';
      modal.classList.add('active');
    });
  }

  // Close creation modal
  const closeModal = () => { if (modal) modal.classList.remove('active'); };
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  // Submit User form (Create / Update)
  if (form) {
    form.addEventListener('submit', handleUserFormSubmit);
  }

  // Bind pagination clicks
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) loadUsuariosList(currentPage - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      loadUsuariosList(currentPage + 1);
    });
  }

  // Password reset modal close triggers
  const resetModal = document.getElementById('modal-reset-senha');
  const closeResetBtn = document.getElementById('btn-close-reset-modal');
  const cancelResetBtn = document.getElementById('btn-cancelar-reset-modal');
  const resetForm = document.getElementById('form-reset-senha');

  const closeResetModal = () => { if (resetModal) resetModal.classList.remove('active'); };
  if (closeResetBtn) closeResetBtn.addEventListener('click', closeResetModal);
  if (cancelResetBtn) cancelResetBtn.addEventListener('click', closeResetModal);

  if (resetForm) {
    resetForm.addEventListener('submit', handleResetPasswordFormSubmit);
  }
}

/**
 * Handle form submit for creating or updating a user
 */
async function handleUserFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('user-id').value;
  const nome = document.getElementById('nome').value.trim();
  const cpf = document.getElementById('cpf').value.trim().replace(/\D/g, ''); // Clean digits only
  const email = document.getElementById('email').value.trim();
  const perfil = document.getElementById('perfil').value;
  const status = document.getElementById('status').value;
  
  const payload = { nome, cpf, email, perfil, status };

  showLoader();

  try {
    let result;
    if (id) {
      // Atualiza o status separadamente (rota PATCH não revalida CPF)
      const statusRes = await api.patch(`/api/usuarios/${id}/status`, { status });
      if (!statusRes.success) {
        showToast(statusRes.message || 'Erro ao atualizar status.', 'error');
        hideLoader();
        return;
      }
      // Update remaining data
      result = await api.put(`/api/usuarios/${id}`, payload);
    } else {
      // Create new
      payload.senha = document.getElementById('senha').value;
      result = await api.post('/api/usuarios', payload);
    }

    if (result.success) {
      showToast(id ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!', 'success');
      document.getElementById('modal-usuario').classList.remove('active');
      loadUsuariosList(currentPage);
    } else {
      showToast(result.message || 'Falha ao salvar usuário.', 'error');
      if (id) loadUsuariosList(currentPage);
    }
  } catch (err) {
    showToast('Erro de comunicação com o servidor.', 'error');
    if (id) loadUsuariosList(currentPage);
  } finally {
    hideLoader();
  }
}

/**
 * Open edit modal prefilled with user details
 */
window.openEditModal = async function(id) {
  showLoader();
  try {
    const res = await api.get(`/api/usuarios/${id}`);
    if (res.success && res.data) {
      const user = res.data;
      
      document.getElementById('user-id').value = user.id;
      document.getElementById('nome').value = user.nome;
      document.getElementById('cpf').value = user.cpf;
      document.getElementById('email').value = user.email;
      document.getElementById('perfil').value = user.perfil;
      document.getElementById('status').value = user.status;
      
      // Hide password field during editing
      document.getElementById('password-group').style.display = 'none';
      document.getElementById('senha').required = false;

      document.getElementById('modal-title').textContent = 'Editar Usuário';
      document.getElementById('btn-salvar-usuario').textContent = 'Salvar Alterações';
      document.getElementById('modal-usuario').classList.add('active');
    } else {
      showToast(res.message || 'Erro ao carregar detalhes do usuário.', 'error');
    }
  } catch (err) {
    showToast('Erro ao carregar detalhes.', 'error');
  } finally {
    hideLoader();
  }
};

/**
 * Open password reset modal
 */
window.openResetPasswordModal = function(id) {
  const resetModal = document.getElementById('modal-reset-senha');
  const form = document.getElementById('form-reset-senha');
  if (resetModal && form) {
    form.reset();
    document.getElementById('reset-user-id').value = id;
    resetModal.classList.add('active');
  }
};

/**
 * Submit password reset form
 */
async function handleResetPasswordFormSubmit(event) {
  event.preventDefault();
  
  const id = document.getElementById('reset-user-id').value;
  const novaSenha = document.getElementById('nova-senha').value;

  if (novaSenha.length < 8) {
    showToast('A senha deve conter no mínimo 8 caracteres.', 'warning');
    return;
  }

  showLoader();

  try {
    const res = await api.put(`/api/usuarios/${id}/resetar-senha`, { novaSenha });
    if (res.success) {
      showToast('Senha redefinida com sucesso!', 'success');
      document.getElementById('modal-reset-senha').classList.remove('active');
    } else {
      showToast(res.message || 'Erro ao redefinir senha.', 'error');
    }
  } catch (err) {
    showToast('Erro no servidor.', 'error');
  } finally {
    hideLoader();
  }
}

/**
 * Excluir usuario
 */
window.excluirUsuario = async function(id, nome) {
  if (!confirm(`Deseja realmente excluir o usuário "${nome}"? Esta ação é permanente.`)) {
    return;
  }

  showLoader();

  try {
    const res = await api.delete(`/api/usuarios/${id}`);
    if (res.success) {
      showToast('Usuário excluído com sucesso.', 'success');
      loadUsuariosList(currentPage);
    } else {
      showToast(res.message || 'Erro ao excluir usuário.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de comunicação.', 'error');
  } finally {
    hideLoader();
  }
};
