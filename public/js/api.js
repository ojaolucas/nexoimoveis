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
