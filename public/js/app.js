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
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Deseja realmente sair do sistema?')) {
        try {
          const res = await api.post('/api/auth/logout');
          if (res.success) {
            window.location.href = '/login';
          }
        } catch (err) {
          console.error('Erro ao fazer logout:', err);
        }
      }
    });
  }
}
