// Client side authentication handler

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogoutClick);
  }
});

async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const loginInput = document.getElementById('login').value.trim();
  const senhaInput = document.getElementById('senha').value;

  if (!loginInput || !senhaInput) {
    showToast('Por favor, preencha todos os campos.', 'warning');
    return;
  }

  showLoader();

  try {
    const response = await api.post('/api/auth/login', {
      login: loginInput,
      senha: senhaInput
    });

    if (response.success) {
      showToast('Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } else {
      showToast(response.message || 'Falha na autenticação.', 'error');
    }
  } catch (error) {
    showToast('Ocorreu um erro no servidor. Tente novamente.', 'error');
  } finally {
    hideLoader();
  }
}

async function handleLogoutClick(event) {
  event.preventDefault();

  if (!confirm('Deseja realmente sair do sistema?')) {
    return;
  }

  showLoader();

  try {
    const response = await api.post('/api/auth/logout');
    if (response.success) {
      showToast('Sessão encerrada com sucesso.', 'success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } else {
      showToast('Erro ao encerrar sessão.', 'error');
    }
  } catch (error) {
    showToast('Ocorreu um erro ao sair.', 'error');
  } finally {
    hideLoader();
  }
}
