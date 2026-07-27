// Global API communication utility

const api = {
  async request(method, url, data = null, isMultipart = false) {
    const options = {
      method,
      headers: {},
    };

    // For session authorization headers to work, credentials must be included
    options.credentials = 'include';

    if (data) {
      if (isMultipart) {
        options.body = data;
        // Browser sets Content-Type boundary automatically for FormData
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      // Check for auth failure
      if (response.status === 401) {
        showToast('Sessão expirada. Redirecionando para login...', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return { success: false, message: 'Não autorizado' };
      }

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao processar requisição');
      }

      return result;
    } catch (error) {
      console.error(`API Error [${method} ${url}]:`, error.message);
      showToast(error.message, 'error');
      return { success: false, message: error.message };
    }
  },

  get(url) { return this.request('GET', url); },
  post(url, data, isMultipart = false) { return this.request('POST', url, data, isMultipart); },
  put(url, data) { return this.request('PUT', url, data); },
  patch(url, data) { return this.request('PATCH', url, data); },
  delete(url) { return this.request('DELETE', url); }
};

// Global Toast notification utility
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  } else {
    // Check if there is already an identical toast to avoid duplicates
    const activeToasts = Array.from(container.querySelectorAll('.toast'));
    const isDuplicate = activeToasts.some(t => {
      const span = t.querySelector('span');
      return span && span.textContent === message && t.classList.contains(`toast-${type}`);
    });
    if (isDuplicate) return;
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Set icon based on type
  let iconClass = 'fi-rr-info';
  if (type === 'success') iconClass = 'fi-rr-check';
  if (type === 'error') iconClass = 'fi-rr-exclamation';
  if (type === 'warning') iconClass = 'fi-rr-warning';

  toast.innerHTML = `
    <i class="fi ${iconClass}"></i>
    <span>${message}</span>
    <span class="toast-close">&times;</span>
  `;

  // Append toast
  container.appendChild(toast);

  // Close event listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  // Auto remove toast after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Global Loading Spinner helpers
function showLoader(elementId = 'global-loader') {
  let loader = document.getElementById(elementId);
  if (!loader) {
    loader = document.createElement('div');
    loader.id = elementId;
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:99999;';
    loader.innerHTML = '<div class="spinner spinner-primary" style="width:50px;height:50px;border-width:5px;"></div>';
    document.body.appendChild(loader);
  }
}

function hideLoader(elementId = 'global-loader') {
  const loader = document.getElementById(elementId);
  if (loader) {
    loader.remove();
  }
}

// Global Custom Confirm dialog utility
window.confirmarAcao = function(titulo, texto, confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false) {
  return new Promise((resolve) => {
    // Create elements
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    
    // Choose icon and button classes
    const iconClass = isDanger ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-question';
    const btnConfirmClass = isDanger ? 'btn-danger' : 'btn-primary';
    const colorStyle = isDanger ? 'style="color: var(--color-error);"' : 'style="color: var(--color-warning);"';
    
    overlay.innerHTML = `
      <div class="confirm-modal-box">
        <div class="confirm-modal-header">
          <i class="${iconClass}" ${colorStyle}></i>
          <h3>${titulo}</h3>
        </div>
        <div class="confirm-modal-body">
          <p>${texto}</p>
        </div>
        <div class="confirm-modal-footer">
          <button class="btn btn-secondary confirm-cancel-btn" type="button" style="background: transparent; border: 1px solid var(--color-border); color: var(--color-text-main);">${cancelText}</button>
          <button class="btn ${btnConfirmClass} confirm-ok-btn" type="button">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Trigger animations
    setTimeout(() => {
      overlay.classList.add('active');
    }, 10);
    
    const cleanup = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
      }, 200);
      resolve(result);
    };
    
    overlay.querySelector('.confirm-cancel-btn').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.confirm-ok-btn').addEventListener('click', () => cleanup(true));
    
    // Close on clicking backdrop
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });
  });
};
