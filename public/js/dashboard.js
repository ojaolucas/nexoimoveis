// Dashboard visual handlers and database data loaders (Fase 03)

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/dashboard')) {
    initDashboard();
  }
});

let charts = {};
let despesasPendentes = [];

async function initDashboard() {
  showLoader();
  try {
    await Promise.all([
      loadResumoCards(),
      loadAlertasPanel(),
      loadMovimentacoesList(),
      loadDashboardCharts(),
      loadCentralPendencias()
    ]);
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  } finally {
    hideLoader();
  }
}

/**
 * Loads cards indicators from database
 */
async function loadResumoCards() {
  const res = await api.get('/api/dashboard/cards');
  
  // Use database values or default standard mockups if all are zero
  const data = res.success && res.data ? res.data : {
    total_imoveis: 0,
    alugados: 0,
    disponiveis: 0,
    contratos_ativos: 0,
    receita_prevista: 0.00,
    receita_recebida: 0.00,
    inadimplencia: 0.00,
    despesas_mes: 0.00
  };

  document.getElementById('val-total-imoveis').textContent = data.total_imoveis;
  document.getElementById('val-alugados').textContent = data.alugados;
  document.getElementById('val-disponiveis').textContent = data.disponiveis;
  document.getElementById('val-contratos-ativos').textContent = data.contratos_ativos;

  document.getElementById('val-receita-prevista').textContent = formatCurrency(data.receita_prevista);
  document.getElementById('val-receita-recebida').textContent = formatCurrency(data.receita_recebida);
  document.getElementById('val-inadimplencia').textContent = formatCurrency(data.inadimplencia);
  document.getElementById('val-despesas-mes').textContent = formatCurrency(data.despesas_mes);
}

/**
 * Loads alert list panel
 */
async function loadAlertasPanel() {
  const res = await api.get('/api/dashboard/alertas');
  const alertContainer = document.getElementById('dashboard-alerts');

  // Fallback if call fails
  const alerts = res.success && res.data ? res.data : [];

  if (alerts.length === 0) {
    alertContainer.innerHTML = '<div class="alert-item empty">Nenhum alerta prioritário pendente.</div>';
    return;
  }

  alertContainer.innerHTML = alerts.map(alert => {
    const isDanger = alert.type === 'danger';
    return `
      <div class="alert-item animate-fade-in" style="${isDanger ? 'border-left: 4px solid var(--color-error);' : 'border-left: 4px solid var(--color-warning);'}">
        <i class="fi ${isDanger ? 'fi-rr-exclamation-triangle text-error' : 'fi-rr-info text-warning'}"></i>
        <div style="flex:1;">
          <p style="color: var(--color-text-main); font-weight: 500; font-size:13px; margin:0;">${alert.text}</p>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Loads latest movements panel
 */
async function loadMovimentacoesList() {
  const res = await api.get('/api/dashboard/movimentacoes');
  const movContainer = document.getElementById('dashboard-movements');

  const movements = res.success && res.data ? res.data : [];

  if (movements.length === 0) {
    movContainer.innerHTML = '<div class="alert-item empty">Nenhuma movimentação registrada no momento.</div>';
    return;
  }

  movContainer.innerHTML = movements.map(mov => {
    // Determine icon and color based on entity type
    let iconClass = 'fi-rr-settings-sliders text-info';
    let label = 'Sistema';

    if (mov.tipo === 'contrato') {
      iconClass = 'fi-rr-document-signed text-primary';
      label = 'Contrato';
    } else if (mov.tipo === 'recebimento') {
      iconClass = 'fi-rr-money-bill-wave text-success';
      label = 'Faturamento';
    } else if (mov.tipo === 'despesa') {
      iconClass = 'fi-rr-wallet text-error';
      label = 'Despesa';
    } else if (mov.tipo === 'imovel') {
      iconClass = 'fi-rr-home text-info';
      label = 'Imóvel';
    }

    const dateVal = new Date(mov.data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="alert-item animate-fade-in" style="justify-content: space-between;">
        <div style="display:flex; align-items:center; gap:16px;">
          <i class="fi ${iconClass}"></i>
          <div>
            <strong style="font-size:11px; text-transform:uppercase; color:var(--color-text-muted);">${label}</strong>
            <p style="color: var(--color-text-main); font-weight: 500; font-size:13px; margin:0;">${mov.titulo}</p>
          </div>
        </div>
        <span style="font-size:12px; color:var(--color-text-muted);">${dateVal}</span>
      </div>
    `;
  }).join('');
}

/**
 * Loads and renders the 4 dashboard charts in parallel
 */
async function loadDashboardCharts() {
  const [resRecDesp, resOcup, resInad, resContr] = await Promise.all([
    api.get('/api/dashboard/receita-despesa'),
    api.get('/api/dashboard/ocupacao'),
    api.get('/api/dashboard/inadimplencia'),
    api.get('/api/dashboard/contratos')
  ]);

  const theme = document.documentElement.getAttribute('data-theme');
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#E5E7EB';
  const textColor = isDark ? '#94A3B8' : '#6B7280';

  // 1. Receitas x Despesas (Bar Chart)
  if (resRecDesp.success && resRecDesp.data) {
    renderReceitaDespesa(resRecDesp.data, gridColor, textColor);
  }

  // 2. Ocupação (Doughnut Chart)
  if (resOcup.success && resOcup.data) {
    renderOcupacao(resOcup.data, isDark, textColor);
  }

  // 3. Inadimplência (Line Chart)
  if (resInad.success && resInad.data) {
    renderInadimplencia(resInad.data, gridColor, textColor);
  }

  // 4. Distribuição de Contratos (Pie Chart)
  if (resContr.success && resContr.data) {
    renderContratos(resContr.data, isDark, textColor);
  }
}

function renderReceitaDespesa(data, gridColor, textColor) {
  const ctx = document.getElementById('chart-receitas-despesas').getContext('2d');
  if (charts.receitaDespesa) charts.receitaDespesa.destroy();

  charts.receitaDespesa = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Receitas (R$)',
          data: data.receitas,
          backgroundColor: '#478C27',
          borderRadius: 4,
        },
        {
          label: 'Despesas (R$)',
          data: data.despesas,
          backgroundColor: '#DC2626',
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { grid: { color: 'transparent' }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });
}

function renderOcupacao(data, isDark, textColor) {
  const ctx = document.getElementById('chart-ocupacao').getContext('2d');
  if (charts.ocupacao) charts.ocupacao.destroy();

  charts.ocupacao = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.valores,
        backgroundColor: ['#16A34A', '#2563EB', '#F59E0B', '#DC2626'],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#1E293B' : '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, padding: 15 }
        }
      }
    }
  });
}

function renderInadimplencia(data, gridColor, textColor) {
  const ctx = document.getElementById('chart-inadimplencia').getContext('2d');
  if (charts.inadimplencia) charts.inadimplencia.destroy();

  charts.inadimplencia = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Valor Inadimplente (R$)',
        data: data.valores,
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        fill: true,
        tension: 0.3,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { grid: { color: 'transparent' }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });
}

function renderContratos(data, isDark, textColor) {
  const ctx = document.getElementById('chart-contratos').getContext('2d');
  if (charts.contratos) charts.contratos.destroy();

  charts.contratos = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.valores,
        backgroundColor: ['#16A34A', '#2563EB', '#DC2626'],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#1E293B' : '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, padding: 15 }
        }
      }
    }
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Re-render when switching theme modes
const observer = new MutationObserver(() => {
  if (window.location.pathname.includes('/dashboard')) {
    loadDashboardCharts();
  }
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

async function loadCentralPendencias() {
  try {
    const res = await api.get('/api/despesas?limit=1000');
    if (res.success && res.data) {
      // Filtrar apenas despesas não pagas (A Vencer ou Vencida) e não canceladas
      despesasPendentes = res.data.filter(d => d.status === 'A Vencer' || d.status === 'Vencido');
      
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      const umaSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
      const umMes = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

      let vencidas = 0;
      let semana = 0;
      let mes = 0;

      despesasPendentes.forEach(d => {
        const venc = new Date(d.vencimento);
        venc.setHours(0,0,0,0);

        if (d.status === 'Vencido' || venc < hoje) {
          vencidas++;
        } else if (venc >= hoje && venc <= umaSemana) {
          semana++;
        } else if (venc >= hoje && venc <= umMes) {
          mes++;
        }
      });

      document.getElementById('pendencias-vencidas').textContent = vencidas;
      document.getElementById('pendencias-semana').textContent = semana;
      document.getElementById('pendencias-mes').textContent = mes;
    }
  } catch (err) {
    console.error('Erro ao carregar Central de Pendências de despesas:', err);
  }
}

window.abrirModalPendencias = function(tipo) {
  const modal = document.getElementById('modal-pendencias');
  if (!modal) return;

  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const umaSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
  const umMes = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

  let titulo = 'Pendências Financeiras';
  let filtradas = [];

  if (tipo === 'vencidas') {
    titulo = 'Despesas Vencidas';
    filtradas = despesasPendentes.filter(d => d.status === 'Vencido' || new Date(d.vencimento) < hoje);
  } else if (tipo === 'semana') {
    titulo = 'Despesas que Vencem na Semana';
    filtradas = despesasPendentes.filter(d => {
      const venc = new Date(d.vencimento);
      venc.setHours(0,0,0,0);
      return d.status === 'A Vencer' && venc >= hoje && venc <= umaSemana;
    });
  } else if (tipo === 'mes') {
    titulo = 'Despesas que Vencem no Mês';
    filtradas = despesasPendentes.filter(d => {
      const venc = new Date(d.vencimento);
      venc.setHours(0,0,0,0);
      return d.status === 'A Vencer' && venc >= hoje && venc <= umMes;
    });
  } else {
    titulo = 'Todas as Pendências';
    filtradas = despesasPendentes;
  }

  document.getElementById('modal-pendencias-title').textContent = titulo;
  document.getElementById('modal-pendencias-count').textContent = filtradas.length;

  const tbody = document.getElementById('pendencias-list-body');
  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--color-text-muted);">Nenhuma pendência financeira encontrada.</td></tr>`;
  } else {
    tbody.innerHTML = filtradas.map(d => {
      const valor = formatCurrency(d.valor);
      const venc = new Date(d.vencimento).toLocaleDateString('pt-BR');
      
      return `
        <tr>
          <td><strong>${d.imovel_nome || 'Sem imóvel'}</strong></td>
          <td><span style="font-weight:600;">${d.categoria}</span></td>
          <td><span style="color:var(--color-primary); font-weight:700;">${valor}</span></td>
          <td>${venc}</td>
          <td>${d.responsavel}</td>
          <td style="text-align:center;">
            <a href="/despesas?id=${d.id}" class="btn btn-secondary btn-icon" style="height:28px; width:28px; font-size:12px; display:inline-flex; align-items:center; justify-content:center;" title="Visualizar no Financeiro"><i class="fa-solid fa-eye"></i></a>
          </td>
        </tr>
      `;
    }).join('');
  }

  modal.classList.add('active');
};

// Configuração de fechar a modal de pendências
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-pendencias');
  const btnClose = document.getElementById('btn-close-pendencias');
  const btnFechar = document.getElementById('btn-fechar-pendencias');

  if (btnClose) btnClose.addEventListener('click', () => modal.classList.remove('active'));
  if (btnFechar) btnFechar.addEventListener('click', () => modal.classList.remove('active'));
});
