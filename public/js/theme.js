// Theme management: Light / Dark Mode
document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = localStorage.getItem('theme') || 'light';
  applyTheme(currentTheme);

  // Auto-bind theme toggle buttons if they exist
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  // Update toggle button icon/visuals if present
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    if (theme === 'dark') {
      themeIcon.className = 'fi fi-rr-sun'; // Sun icon for switching back to light mode
    } else {
      themeIcon.className = 'fi fi-rr-moon'; // Moon icon for switching to dark mode
    }
  }
}

// Global real-time input masks (CPF, CNPJ, Telefone, CEP)
document.addEventListener('input', (e) => {
  const target = e.target;
  if (!target || target.tagName !== 'INPUT') return;

  const id = target.id;
  if (!id) return;

  const val = target.value;
  const start = target.selectionStart;
  const beforeLength = val.length;

  const isDoc = (id.includes('cpf') || id.includes('cnpj') || id === 'cpf_cnpj') && !id.includes('filtro') && !id.includes('busca') && !id.includes('search');
  const isPhone = (id.includes('telefone') || id.includes('phone') || id === 'tel') && !id.includes('filtro') && !id.includes('busca') && !id.includes('search');
  const isCep = (id.includes('cep') || id.includes('postal')) && !id.includes('filtro') && !id.includes('busca') && !id.includes('search');

  let masked = '';

  if (isDoc) {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 14) clean = clean.slice(0, 14);
    
    if (clean.length <= 11) {
      // CPF: 000.000.000-00
      if (clean.length > 9) {
        masked = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      } else if (clean.length > 6) {
        masked = clean.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      } else if (clean.length > 3) {
        masked = clean.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      } else {
        masked = clean;
      }
    } else {
      // CNPJ: 00.000.000/0000-00
      if (clean.length > 12) {
        masked = clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
      } else if (clean.length > 8) {
        masked = clean.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
      } else if (clean.length > 5) {
        masked = clean.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
      } else if (clean.length > 2) {
        masked = clean.replace(/(\d{2})(\d{1,3})/, '$1.$2');
      } else {
        masked = clean;
      }
    }
  } else if (isPhone) {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);

    if (clean.length > 10) {
      // Celular: (00) 00000-0000
      masked = clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (clean.length > 6) {
      // Fixo: (00) 0000-0000
      masked = clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (clean.length > 2) {
      masked = clean.replace(/(\d{2})(\d{1,4})/, '($1) $2');
    } else if (clean.length > 0) {
      masked = `(${clean}`;
    }
  } else if (isCep) {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 8) clean = clean.slice(0, 8);

    if (clean.length > 5) {
      masked = clean.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    } else {
      masked = clean;
    }
  } else {
    return;
  }

  if (val !== masked) {
    target.value = masked;
    // Adjust cursor position to prevent jumping
    if (start === beforeLength) {
      target.selectionStart = target.selectionEnd = masked.length;
    } else {
      const diff = masked.length - beforeLength;
      target.selectionStart = target.selectionEnd = Math.max(0, start + diff);
    }
  }
});

// Global pagination rendering utility
window.renderPagination = function(options) {
  const {
    footerElement, // The .table-footer container element
    pagination,     // Pagination state: { total, page, limit, pages }
    onPageChange,  // Callback: function(newPage)
    onLimitChange  // Callback: function(newLimit)
  } = options;

  if (!footerElement) return;

  const { total, page, limit, pages } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // 1. Render main footer controls layout
  footerElement.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-muted);">
      <span>Mostrar:</span>
      <select class="records-limit-select" style="width: auto; height: 32px; padding: 0 8px; font-size: 13px; border-radius: 6px; border: 1px solid var(--color-border); background-color: var(--color-bg-card); color: var(--color-text-main); outline: none; cursor: pointer;">
        <option value="10" ${limit == 10 ? 'selected' : ''}>10 registros</option>
        <option value="25" ${limit == 25 ? 'selected' : ''}>25 registros</option>
        <option value="50" ${limit == 50 ? 'selected' : ''}>50 registros</option>
        <option value="100" ${limit == 100 ? 'selected' : ''}>100 registros</option>
        <option value="9999" ${limit == 9999 ? 'selected' : ''}>Todos</option>
      </select>
      <span>por página</span>
    </div>
    <span style="color: var(--color-text-muted); font-size:13px; font-weight: 500;">Mostrando ${start} a ${end} de ${total} registros</span>
    <div class="pagination-buttons" style="display: flex; align-items: center; gap: 4px;">
      <button type="button" class="btn btn-prev-page" style="height: 32px; width: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-bg-card); color: var(--color-text-muted); cursor: pointer;" ${page <= 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
        <i class="fi fi-rr-angle-left" style="font-size: 10px; pointer-events: none;"></i>
      </button>
      <div class="page-numbers-list" style="display: flex; gap: 4px;"></div>
      <button type="button" class="btn btn-next-page" style="height: 32px; width: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-bg-card); color: var(--color-text-muted); cursor: pointer;" ${page >= pages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
        <i class="fi fi-rr-angle-right" style="font-size: 10px; pointer-events: none;"></i>
      </button>
    </div>
  `;

  // 2. Render visible numeric page links
  const pageNumbersList = footerElement.querySelector('.page-numbers-list');
  if (pageNumbersList && pages > 0) {
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(pages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let p = startPage; p <= endPage; p++) {
      const isCurrent = p === page;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = p;
      btn.style.cssText = `
        height: 32px;
        min-width: 32px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        border: 1px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'};
        background-color: ${isCurrent ? 'var(--color-primary)' : 'var(--color-bg-card)'};
        color: ${isCurrent ? '#ffffff' : 'var(--color-text-muted)'};
        transition: all var(--transition-fast);
      `;
      if (!isCurrent) {
        btn.addEventListener('mouseenter', () => {
          btn.style.color = 'var(--color-text-main)';
          btn.style.borderColor = 'var(--color-text-muted)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.color = 'var(--color-text-muted)';
          btn.style.borderColor = 'var(--color-border)';
        });
        btn.addEventListener('click', () => onPageChange(p));
      }
      pageNumbersList.appendChild(btn);
    }
  }

  // 3. Register click events on previous & next buttons
  const btnPrev = footerElement.querySelector('.btn-prev-page');
  const btnNext = footerElement.querySelector('.btn-next-page');

  if (btnPrev && page > 1) {
    btnPrev.addEventListener('click', () => onPageChange(page - 1));
  }
  if (btnNext && page < pages) {
    btnNext.addEventListener('click', () => onPageChange(page + 1));
  }

  // 4. Register selection changes on records limit select dropdown
  const selectLimit = footerElement.querySelector('.records-limit-select');
  if (selectLimit && onLimitChange) {
    selectLimit.addEventListener('change', (e) => {
      const newLimit = parseInt(e.target.value, 10);
      onLimitChange(newLimit);
    });
  }
};
