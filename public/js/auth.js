// Client side authentication handler

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  const btnToggle = document.getElementById('btn-toggle-password');
  const inputSenha = document.getElementById('senha');
  const iconToggle = document.getElementById('password-toggle-icon');

  if (btnToggle && inputSenha && iconToggle) {
    btnToggle.addEventListener('click', () => {
      const type = inputSenha.getAttribute('type') === 'password' ? 'text' : 'password';
      inputSenha.setAttribute('type', type);
      
      // Alternar classe do ícone
      if (type === 'text') {
        iconToggle.className = 'fi fi-rr-eye-crossed';
      } else {
        iconToggle.className = 'fi fi-rr-eye';
      }
    });
  }
});

async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const loginForm = event.target;
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  
  const loginInput = document.getElementById('login').value.trim();
  const senhaInput = document.getElementById('senha').value;

  if (!loginInput || !senhaInput) {
    showToast('Por favor, preencha todos os campos.', 'warning');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
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
    if (submitBtn) submitBtn.disabled = false;
    hideLoader();
  }
}


