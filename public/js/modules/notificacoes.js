// public/js/modules/notificacoes.js

let currentPage = 1;
const limitPerPage = 15;
let currentUser = null;
let currentFilters = {};
let selectedNotifId = null;

document.addEventListener('DOMContentLoaded', () => {
  initNotificacoes();
});

async function initNotificacoes() {
  await loadCurrentUser();
  bindEvents();
  await updateMetrics();
  await loadNotifications();
}

async function loadCurrentUser() {
  try {
    const res = await api.get('/api/auth/me');
    if (res.success && res.usuario) {
      currentUser = res.usuario;
    }
  } catch (err) {
    console.error('Erro ao obter usuário atual:', err);
  }
}

function bindEvents() {
  // Aplicar filtros
  document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
    currentPage = 1;
    loadFilters();
    loadNotifications();
  });

  // Limpar filtros
  document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-categoria').value = '';
    document.getElementById('filtro-prioridade').value = '';
    document.getElementById('filtro-status').value = 'Não Lida';
    document.getElementById('filtro-busca').value = '';
    document.getElementById('filtro-data-inicial').value = '';
    document.getElementById('filtro-data-final').value = '';
    
    currentPage = 1;
    loadFilters();
    loadNotifications();
  });

  // Marcar todas como lidas
  document.getElementById('btn-marcar-todas-lidas').addEventListener('click', handleMarkAllRead);

  // Paginação
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadNotifications();
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    currentPage++;
    loadNotifications();
  });

  // Modal
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-fechar-modal').addEventListener('click', closeModal);
  document.getElementById('btn-ir-registro-relacionado').addEventListener('click', handleOpenLink);

}

function loadFilters() {
  currentFilters = {
    categoria: document.getElementById('filtro-categoria').value,
    prioridade: document.getElementById('filtro-prioridade').value,
    status: document.getElementById('filtro-status').value,
    texto: document.getElementById('filtro-busca').value,
    data_inicio: document.getElementById('filtro-data-inicial').value,
    data_fim: document.getElementById('filtro-data-final').value
  };
}

async function updateMetrics() {
  try {
    const res = await api.get('/api/notificacoes/metricas');
    if (res.success && res.data) {
      document.getElementById('card-total').textContent = res.data.total;
      document.getElementById('card-nao-lidas').textContent = res.data.nao_lidas;
      document.getElementById('card-criticas').textContent = res.data.criticas;
      document.getElementById('card-hoje').textContent = res.data.hoje;
    }
  } catch (err) {
    console.error('Erro ao buscar métricas:', err);
  }
}

async function loadNotifications() {
  const tbody = document.getElementById('notificacoes-list-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;"><div class="spinner spinner-primary" style="margin:0 auto;"></div></td></tr>';

  loadFilters();

  let url = `/api/notificacoes?page=${currentPage}&limit=${limitPerPage}`;
  Object.keys(currentFilters).forEach(key => {
    if (currentFilters[key]) {
      url += `&${key}=${encodeURIComponent(currentFilters[key])}`;
    }
  });

  try {
    const res = await api.get(url);
    if (res.success && res.data) {
      renderTable(res.data);
      updatePagination(res.total);
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--color-error);">Erro ao carregar dados.</td></tr>';
    }
  } catch (err) {
    console.error('Erro ao carregar notificações:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--color-error);">Erro na requisição.</td></tr>';
  }
}

function renderTable(rows) {
  const tbody = document.getElementById('notificacoes-list-body');
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--color-text-muted);">Nenhuma notificação encontrada.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(n => {
    const dt = new Date(n.created_at);
    const dataStr = dt.toLocaleDateString('pt-BR');
    const horaStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Permissão para arquivar: apenas administradores e operacionais
    const canArchive = currentUser && (currentUser.perfil === 'administrador' || currentUser.perfil === 'operacional');
    const isArquivada = n.status === 'Arquivada';
    const isLida = n.status === 'Lida';

    return `
      <tr class="${n.status === 'Não Lida' ? 'row-unread' : ''}">
        <td>${dataStr} às ${horaStr}</td>
        <td><strong>${n.categoria}</strong></td>
        <td>${n.titulo}</td>
        <td><span class="priority-badge priority-${n.prioridade}">${n.prioridade}</span></td>
        <td><span class="badge badge-${n.status.toLowerCase().replace(' ', '-')}">${n.status}</span></td>
        <td style="text-align: right; padding-right: 24px;">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="viewNotification('${n.id}')" title="Visualizar Detalhes"><i class="fi fi-rr-eye"></i> Ver</button>
            ${!isLida && !isArquivada ? `<button class="btn btn-primary btn-sm" onclick="markAsRead('${n.id}')" title="Marcar como Lida"><i class="fi fi-rr-check"></i></button>` : ''}
            ${canArchive && !isArquivada ? `<button class="btn btn-danger btn-sm" onclick="archiveNotification('${n.id}')" title="Arquivar"><i class="fi fi-rr-box-alt"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updatePagination(total) {
  const totalPages = Math.ceil(total / limitPerPage);
  const start = total === 0 ? 0 : (currentPage - 1) * limitPerPage + 1;
  const end = Math.min(currentPage * limitPerPage, total);

  document.getElementById('pagination-info').textContent = `Mostrando ${start} a ${end} de ${total} registros`;
  
  document.getElementById('btn-prev-page').disabled = currentPage <= 1;
  document.getElementById('btn-next-page').disabled = currentPage >= totalPages || totalPages === 0;
}

async function viewNotification(id) {
  selectedNotifId = id;
  const modal = document.getElementById('notif-detail-modal');
  modal.classList.add('active');

  // Loader
  document.getElementById('det-titulo').textContent = 'Carregando...';
  document.getElementById('det-descricao').textContent = '';
  document.getElementById('det-categoria').textContent = '';
  document.getElementById('det-prioridade').innerHTML = '';
  document.getElementById('det-status').innerHTML = '';
  document.getElementById('det-data-hora').textContent = '';
  document.getElementById('row-lida-em').style.display = 'none';
  document.getElementById('row-usuario').style.display = 'none';
  
  try {
    const res = await api.get(`/api/notificacoes/${id}`);
    if (res.success && res.data) {
      const n = res.data;
      
      const dt = new Date(n.created_at);
      const dataStr = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      document.getElementById('det-titulo').textContent = n.titulo;
      document.getElementById('det-descricao').textContent = n.descricao;
      document.getElementById('det-categoria').textContent = n.categoria;
      document.getElementById('det-prioridade').innerHTML = `<span class="priority-badge priority-${n.prioridade}">${n.prioridade}</span>`;
      document.getElementById('det-status').innerHTML = `<span class="badge badge-${n.status.toLowerCase().replace(' ', '-')}">${n.status}</span>`;
      document.getElementById('det-data-hora').textContent = dataStr;

      if (n.status === 'Lida' && n.lida_em) {
        const dtLida = new Date(n.lida_em);
        document.getElementById('det-lida-em').textContent = dtLida.toLocaleDateString('pt-BR') + ' às ' + dtLida.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('row-lida-em').style.display = 'flex';
      }

      if (n.usuario_nome) {
        document.getElementById('det-usuario').textContent = `${n.usuario_nome} (${n.perfil || '-'})`;
        document.getElementById('row-usuario').style.display = 'flex';
      }

      const btnIrRegistro = document.getElementById('btn-ir-registro-relacionado');
      if (n.entidade && n.registro_id) {
        btnIrRegistro.style.display = 'inline-flex';
      } else {
        btnIrRegistro.style.display = 'none';
      }

      // Se abrir um não lida, marcar ela como lida no servidor de forma silenciosa para atualizar tabela no fechar
      if (n.status === 'Não Lida') {
        await api.patch(`/api/notificacoes/${id}/lida`);
        await updateMetrics();
      }

    } else {
      document.getElementById('det-titulo').textContent = 'Erro ao carregar detalhes.';
    }
  } catch (err) {
    console.error('Erro ao detalhar notificação:', err);
    document.getElementById('det-titulo').textContent = 'Erro de comunicação.';
  }
}

async function markAsRead(id) {
  try {
    const res = await api.patch(`/api/notificacoes/${id}/lida`);
    if (res.success) {
      showToast('Notificação marcada como lida.', 'success');
      await updateMetrics();
      await loadNotifications();
      // Atualizar o badge do sino do header se estiver na tela
      if (typeof updateBadgeCount === 'function') updateBadgeCount();
    }
  } catch (err) {
    console.error('Erro ao ler notificação:', err);
    showToast('Erro ao ler notificação.', 'error');
  }
}

async function archiveNotification(id) {
  if (!confirm('Deseja realmente arquivar esta notificação?')) return;
  try {
    const res = await api.patch(`/api/notificacoes/${id}/arquivar`);
    if (res.success) {
      showToast('Notificação arquivada com sucesso.', 'success');
      await updateMetrics();
      await loadNotifications();
      if (typeof updateBadgeCount === 'function') updateBadgeCount();
    }
  } catch (err) {
    console.error('Erro ao arquivar notificação:', err);
    showToast('Erro ao arquivar notificação.', 'error');
  }
}

async function handleMarkAllRead() {
  if (!confirm('Deseja marcar todas as suas notificações como lidas?')) return;
  try {
    const res = await api.patch('/api/notificacoes/lidas');
    if (res.success) {
      showToast('Todas as notificações foram marcadas como lidas.', 'success');
      await updateMetrics();
      await loadNotifications();
      if (typeof updateBadgeCount === 'function') updateBadgeCount();
    }
  } catch (err) {
    console.error('Erro ao ler todas:', err);
    showToast('Erro ao processar.', 'error');
  }
}

async function handleOpenLink() {
  if (!selectedNotifId) return;
  try {
    const res = await api.get(`/api/notificacoes/${selectedNotifId}/abrir`);
    if (res.success && res.url) {
      closeModal();
      window.open(res.url, '_blank');
    } else {
      showToast('Não foi possível abrir o link do registro relacionado.', 'warning');
    }
  } catch (err) {
    console.error('Erro ao abrir link do registro:', err);
  }
}

function closeModal() {
  document.getElementById('notif-detail-modal').classList.remove('active');
  loadNotifications(); // Recarrega para refletir as marcadas como lida na tabela
}
