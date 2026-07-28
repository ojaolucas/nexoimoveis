// NexoMoveis - Core Application UI Handler

document.addEventListener('DOMContentLoaded', () => {
  initLayout();
  checkSession();
  initGlobalEvents();
});

/**
 * Initializes layout events (sidebar toggling, responsive overlays)
 */
function initLayout() {
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const appLayout = document.querySelector('.app-layout');

  if (menuToggle && sidebar && appLayout) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.innerWidth >= 1200) {
        appLayout.classList.toggle('sidebar-collapsed');
      } else {
        appLayout.classList.toggle('sidebar-active');
      }
    });

    // Close responsive sidebar when clicking outside of it on smaller screens
    document.addEventListener('click', (e) => {
      if (window.innerWidth < 1200 && appLayout.classList.contains('sidebar-active')) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
          appLayout.classList.remove('sidebar-active');
        }
      }
    });
  }
}

/**
 * Checks if a user session is active and updates sidebar details
 */
async function checkSession() {
  // Prevent calling on login page
  if (window.location.pathname === '/login') return;

  try {
    const response = await api.get('/api/auth/me');
    if (response.success && response.usuario) {
      updateSidebarUserInfo(response.usuario);
    } else {
      // If session check fails, api helper redirects automatically, but let's double check
      window.location.href = '/login';
    }
  } catch (err) {
    console.error('Failed checking session:', err);
  }
}

/**
 * Updates sidebar DOM elements with actual user profiles
 */
function updateSidebarUserInfo(user) {
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarRole = document.getElementById('sidebar-user-role');
  const navbarName = document.getElementById('navbar-user-name');

  if (sidebarName) sidebarName.textContent = user.nome;
  if (sidebarRole) sidebarRole.textContent = user.perfil;
  if (navbarName) navbarName.textContent = user.nome;
}

/**
 * Bind global interface triggers (e.g. Logout)
 */
function initGlobalEvents() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      exibirModalConfirmacaoLogout();
    });
  }
}

function exibirModalConfirmacaoLogout() {
  // Evitar duplicações
  if (document.getElementById('modal-confirm-logout')) return;

  const modalHtml = `
    <div id="modal-confirm-logout" class="modal active" style="z-index: 9999;">
      <div class="modal-content glass" style="max-width: 400px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; border: 1px solid var(--color-border); border-radius: var(--border-radius-lg); box-shadow: var(--shadow-lg); background-color: var(--color-bg-card);">
        <div style="background-color: var(--color-error-light); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <i class="fi fi-rr-sign-out-alt" style="font-size: 26px; color: var(--color-error);"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--color-text-main);">Confirmar Saída</h3>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: var(--color-text-muted); line-height: 1.5;">Deseja realmente encerrar a sua sessão e sair do sistema?</p>
        </div>
        <div style="display: flex; width: 100%; gap: 12px; margin-top: 8px;">
          <button id="btn-logout-cancel" class="btn btn-secondary" style="flex: 1; height: 40px; background-color: transparent; border: 1px solid var(--color-border); color: var(--color-text-main); font-weight: 600;">
            Cancelar
          </button>
          <button id="btn-logout-confirm" class="btn" style="flex: 1; height: 40px; background-color: var(--color-error); border: none; color: #ffffff; font-weight: 600; cursor: pointer; border-radius: var(--border-radius-md); transition: opacity var(--transition-fast);">
            Sair
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('modal-confirm-logout');
  const btnCancel = document.getElementById('btn-logout-cancel');
  const btnConfirm = document.getElementById('btn-logout-confirm');

  // Adicionar efeito de hover suave no botão de sair
  btnConfirm.addEventListener('mouseenter', () => btnConfirm.style.opacity = '0.9');
  btnConfirm.addEventListener('mouseleave', () => btnConfirm.style.opacity = '1');

  const fecharModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 200); // tempo de transição
  };

  btnCancel.addEventListener('click', fecharModal);

  // Fechar também se clicar fora da modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) fecharModal();
  });

  btnConfirm.addEventListener('click', async () => {
    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Saindo...';
    try {
      const res = await api.post('/api/auth/logout');
      if (res.success) {
        window.location.href = '/login';
      } else {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
      window.location.href = '/login';
    }
  });
}
