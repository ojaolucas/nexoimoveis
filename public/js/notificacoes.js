// Notification Bell and Dropdown Handlers (Fase 15)

document.addEventListener('DOMContentLoaded', () => {
  const notificationBtn = document.getElementById('notification-btn');
  const dropdown = document.getElementById('notifications-dropdown');
  const markAllRead = document.getElementById('mark-all-read');

  if (notificationBtn && dropdown) {
    // Toggle dropdown
    notificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      if (dropdown.style.display === 'block') {
        loadNotifications();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!notificationBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Mark all read
    if (markAllRead) {
      markAllRead.addEventListener('click', handleMarkAllRead);
    }

    // Initial badge count check
    updateBadgeCount();
  }
});

async function updateBadgeCount() {
  try {
    const res = await api.get('/api/notificacoes/contador');
    const badge = document.getElementById('notification-badge');
    
    const count = res.success ? res.total : 0;
    
    if (count > 0 && badge) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else if (badge) {
      badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking badge count:', error);
  }
}

async function loadNotifications() {
  const listContainer = document.getElementById('notifications-list');
  listContainer.innerHTML = '<div style="text-align:center;padding:12px;"><div class="spinner spinner-primary" style="margin:0 auto;"></div></div>';

  try {
    const res = await api.get('/api/notificacoes/nao-lidas');
    const notifications = res.success ? res.data : [];

    if (!notifications || notifications.length === 0) {
      listContainer.innerHTML = '<div class="dropdown-empty">Nenhuma notificação pendente.</div>';
      return;
    }

    listContainer.innerHTML = notifications.map(notif => `
      <div class="notification-item nao-lida" style="padding:10px; border-bottom:1px solid var(--color-border); display:flex; flex-direction:column; gap:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:12px; color: var(--color-text-main);">${notif.titulo}</strong>
          <button onclick="markNotificationRead('${notif.id}')" style="font-size:10px; color:var(--color-primary); font-weight:600; border:none; background:none; cursor:pointer;">Marcar lida</button>
        </div>
        <p style="font-size:12px; margin:0; color:var(--color-text-muted);">${notif.descricao}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
          <span class="priority-badge priority-${notif.prioridade}" style="font-size:9px; padding:1px 4px; border-radius:3px;">${notif.prioridade}</span>
          <span style="font-size:9px; color:var(--color-text-muted);">${new Date(notif.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    listContainer.innerHTML = '<div class="dropdown-empty">Erro ao carregar notificações.</div>';
  }
}

async function markNotificationRead(id) {
  try {
    const res = await api.patch(`/api/notificacoes/${id}/lida`);
    if (res.success) {
      showToast('Notificação marcada como lida.', 'success');
      loadNotifications();
      updateBadgeCount();
      
      // Se estiver na tela principal de notificações, recarregar a tabela
      if (window.location.pathname === '/notificacoes' && typeof loadNotificationsTable === 'function') {
        loadNotificationsTable();
      }
    }
  } catch (error) {
    console.error('Error marking read:', error);
  }
}

async function handleMarkAllRead() {
  try {
    const res = await api.patch('/api/notificacoes/lidas');
    if (res.success) {
      showToast('Todas as notificações lidas.', 'success');
      loadNotifications();
      updateBadgeCount();
      
      if (window.location.pathname === '/notificacoes' && typeof loadNotificationsTable === 'function') {
        loadNotificationsTable();
      }
    }
  } catch (error) {
    console.error('Error marking all read:', error);
  }
}
