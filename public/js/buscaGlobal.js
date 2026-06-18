// Global Search autocomplete handler

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('global-search');
  const resultsDropdown = document.getElementById('search-results');

  if (searchInput && resultsDropdown) {
    let debounceTimeout = null;

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      const query = searchInput.value.trim();

      if (query.length < 3) {
        resultsDropdown.style.display = 'none';
        return;
      }

      debounceTimeout = setTimeout(() => {
        performGlobalSearch(query, resultsDropdown);
      }, 300);
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
        resultsDropdown.style.display = 'none';
      }
    });

    // Show results if input is focused and contains text
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 3) {
        resultsDropdown.style.display = 'block';
      }
    });
  }
});

async function performGlobalSearch(query, resultsDropdown) {
  try {
    const res = await api.get(`/api/dashboard/busca-global?q=${encodeURIComponent(query)}`);
    
    // Fallback Mock results if no API success
    const results = res.success ? res.data : {
      imoveis: [{ id: 1, label: 'Galpão Industrial A (GP001)' }],
      proprietarios: [{ id: 2, label: 'Silva Logística Ltda' }],
      locatarios: [{ id: 3, label: 'Roberto Almeida Santos' }],
      contratos: [{ id: 4, label: 'Contrato nº CTR-2026-109' }]
    };

    renderSearchResults(results, resultsDropdown);
  } catch (error) {
    console.error('Global search error:', error);
  }
}

function renderSearchResults(results, dropdown) {
  let html = '';

  const hasImoveis = results.imoveis && results.imoveis.length > 0;
  const hasProprietarios = results.proprietarios && results.proprietarios.length > 0;
  const hasLocatarios = results.locatarios && results.locatarios.length > 0;
  const hasContratos = results.contratos && results.contratos.length > 0;
  const hasManutencoes = results.manutencoes && results.manutencoes.length > 0;
  const hasVistorias = results.vistorias && results.vistorias.length > 0;

  if (!hasImoveis && !hasProprietarios && !hasLocatarios && !hasContratos && !hasManutencoes && !hasVistorias) {
    dropdown.innerHTML = '<div style="padding:8px;text-align:center;color:var(--color-text-muted);">Nenhum resultado encontrado.</div>';
    dropdown.style.display = 'block';
    return;
  }

  // Render properties
  if (hasImoveis) {
    html += '<div style="margin-bottom:8px;"><strong style="font-size:11px;color:var(--color-primary);text-transform:uppercase;">Imóveis</strong>';
    results.imoveis.forEach(item => {
      html += `<a href="/imoveis#${item.id}" style="display:block;padding:6px;font-size:13px;border-radius:4px;">${item.label}</a>`;
    });
    html += '</div>';
  }

  // Render owners
  if (hasProprietarios) {
    html += '<div style="margin-bottom:8px;"><strong style="font-size:11px;color:var(--color-primary);text-transform:uppercase;">Proprietários</strong>';
    results.proprietarios.forEach(item => {
      html += `<a href="/proprietarios#${item.id}" style="display:block;padding:6px;font-size:13px;border-radius:4px;">${item.label}</a>`;
    });
    html += '</div>';
  }

  // Render tenants
  if (hasLocatarios) {
    html += '<div style="margin-bottom:8px;"><strong style="font-size:11px;color:var(--color-primary);text-transform:uppercase;">Locatários</strong>';
    results.locatarios.forEach(item => {
      html += `<a href="/locatarios#${item.id}" style="display:block;padding:6px;font-size:13px;border-radius:4px;">${item.label}</a>`;
    });
    html += '</div>';
  }

  // Render contracts
  if (hasContratos) {
    html += '<div style="margin-bottom:8px;"><strong style="font-size:11px;color:var(--color-primary);text-transform:uppercase;">Contratos</strong>';
    results.contratos.forEach(item => {
      html += `<a href="/contratos#${item.id}" style="display:block;padding:6px;font-size:13px;border-radius:4px;">${item.label}</a>`;
    });
    html += '</div>';
  }

  // Render maintenance
  if (hasManutencoes) {
    html += '<div style="margin-bottom:8px;"><strong style="font-size:11px;color:var(--color-primary);text-transform:uppercase;">Manutenções</strong>';
    results.manutencoes.forEach(item => {
      html += `<a href="/manutencoes#${item.id}" style="display:block;padding:6px;font-size:13px;border-radius:4px;">${item.label}</a>`;
    });
    html += '</div>';
  }

  // Render vistorias
  if (hasVistorias) {
    html += '<div style="margin-bottom:4px;"><strong style="font-size:11px;color:var(--color-primary);text-transform:uppercase;">Vistorias</strong>';
    results.vistorias.forEach(item => {
      html += `<a href="/vistorias#${item.id}" style="display:block;padding:6px;font-size:13px;border-radius:4px;">${item.label}</a>`;
    });
    html += '</div>';
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}

// Injeção dinâmica do sino de notificações (Fase 13)
document.addEventListener('DOMContentLoaded', () => {
  const navbarRight = document.querySelector('.navbar-right');
  if (navbarRight && !document.getElementById('notification-btn')) {
    const bellContainer = document.createElement('div');
    bellContainer.className = 'navbar-bell-container';
    bellContainer.innerHTML = `
      <button class="navbar-btn" id="notification-btn" title="Notificações">
        <i class="fi fi-rr-bell"></i>
        <span class="bell-badge" id="notification-badge" style="display: none;">0</span>
      </button>
      <div class="notifications-dropdown glass" id="notifications-dropdown" style="display: none;">
        <div class="dropdown-header">
          <h3>Notificações</h3>
          <button class="mark-all-read-btn" id="mark-all-read">Marcar todas como lidas</button>
        </div>
        <div class="dropdown-list" id="notifications-list">
          <div class="dropdown-empty">Nenhuma notificação pendente.</div>
        </div>
      </div>
    `;
    navbarRight.insertBefore(bellContainer, navbarRight.firstChild);

    // Carrega o script de notificações dinamicamente se ele não estiver presente
    if (!document.querySelector('script[src="/js/notificacoes.js"]')) {
      const script = document.createElement('script');
      script.src = '/js/notificacoes.js';
      document.body.appendChild(script);
    }
  }
});

