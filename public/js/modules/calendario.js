// public/js/modules/calendario.js

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed
let currentDay = new Date().getDate();
let activeView = 'mes'; // 'mes', 'semana', 'dia'
let activeEvents = [];

document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
});

async function initCalendar() {
  bindUiEvents();
  await loadImoveisFilter();
  await loadOverviewStats();
  await renderView();
}

function bindUiEvents() {
  // Navigation
  document.getElementById('btn-hoje').addEventListener('click', () => {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    currentDay = today.getDate();
    renderView();
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    navigate(-1);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    navigate(1);
  });

  // Views Toggle
  document.querySelectorAll('.calendar-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.calendar-view-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeView = e.target.getAttribute('data-view');
      renderView();
    });
  });

  // Filter Checkboxes & Selects
  const filters = ['chk-contratos', 'chk-recebimentos', 'chk-despesas', 'chk-manutencoes', 'filter-imovel'];
  filters.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        fetchAndRenderEvents();
      });
    }
  });

  // Modal close
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-fechar-modal').addEventListener('click', closeModal);
  
  // Close modal clicking outside
  const modal = document.getElementById('event-detail-modal');
  window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function navigate(direction) {
  if (activeView === 'mes') {
    currentMonth += direction;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    } else if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  } else if (activeView === 'semana') {
    const date = new Date(currentYear, currentMonth, currentDay);
    date.setDate(date.getDate() + (direction * 7));
    currentYear = date.getFullYear();
    currentMonth = date.getMonth();
    currentDay = date.getDate();
  } else if (activeView === 'dia') {
    const date = new Date(currentYear, currentMonth, currentDay);
    date.setDate(date.getDate() + direction);
    currentYear = date.getFullYear();
    currentMonth = date.getMonth();
    currentDay = date.getDate();
  }
  renderView();
}

async function loadImoveisFilter() {
  const select = document.getElementById('filter-imovel');
  if (!select) return;
  
  try {
    const res = await api.get('/api/imoveis?limit=100');
    if (res.success && res.data) {
      res.data.forEach(imovel => {
        const opt = document.createElement('option');
        opt.value = imovel.id;
        opt.textContent = imovel.nome;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Erro ao carregar imóveis:', err);
  }
}

async function loadOverviewStats() {
  try {
    const res = await api.get('/api/calendario');
    if (res.success && res.cards) {
      document.getElementById('card-hoje').textContent = res.cards.hoje;
      document.getElementById('card-semana').textContent = res.cards.semana;
      document.getElementById('card-mes').textContent = res.cards.mes;
      document.getElementById('card-atrasados').textContent = res.cards.atrasados;
    }
  } catch (err) {
    console.error('Erro ao carregar dados do dashboard do calendário:', err);
  }
}

async function renderView() {
  const container = document.getElementById('calendar-view-port');
  container.innerHTML = '<div style="text-align:center;padding:50px;"><div class="spinner spinner-primary" style="margin:0 auto;"></div></div>';

  const periodTitle = document.getElementById('calendar-period-title');
  const monthsStr = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  if (activeView === 'mes') {
    periodTitle.textContent = `${monthsStr[currentMonth]} de ${currentYear}`;
    await fetchAndRenderEvents();
  } 
  else if (activeView === 'semana') {
    // Calculo do periodo visivel da semana
    const current = new Date(currentYear, currentMonth, currentDay);
    const first = current.getDate() - current.getDay(); // Sunday
    const last = first + 6; // Saturday
    
    const startOfWeek = new Date(current.setDate(first));
    const endOfWeek = new Date(current.setDate(last));
    
    const fmtStart = startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const fmtEnd = endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    periodTitle.textContent = `${fmtStart} - ${fmtEnd}`;
    
    await fetchAndRenderEvents();
  } 
  else if (activeView === 'dia') {
    const current = new Date(currentYear, currentMonth, currentDay);
    periodTitle.textContent = current.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    await fetchAndRenderEvents();
  }
}

// Retorna os filtros ativos de checkboxes e select
function getActiveFilters() {
  const tipos = [];
  if (document.getElementById('chk-contratos').checked) tipos.push('Contrato');
  if (document.getElementById('chk-recebimentos').checked) tipos.push('Recebimento');
  if (document.getElementById('chk-despesas').checked) tipos.push('Despesa');
  if (document.getElementById('chk-manutencoes').checked) tipos.push('Manutencao');

  const imovelId = document.getElementById('filter-imovel').value;

  return {
    tipos,
    imovelId
  };
}

async function fetchAndRenderEvents() {
  const container = document.getElementById('calendar-view-port');
  const { tipos, imovelId } = getActiveFilters();
  
  if (tipos.length === 0) {
    renderEmptyGrid(container);
    return;
  }

  let startDate, endDate;

  if (activeView === 'mes') {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startOffset = firstDay.getDay(); // Domingos = 0
    const startGrid = new Date(currentYear, currentMonth, 1 - startOffset);
    
    const endGrid = new Date(currentYear, currentMonth + 1, 0);
    const endOffset = 6 - endGrid.getDay();
    const endGridLimit = new Date(currentYear, currentMonth + 1, endOffset);
    
    startDate = startGrid.toISOString().split('T')[0];
    endDate = endGridLimit.toISOString().split('T')[0];
  } 
  else if (activeView === 'semana') {
    const current = new Date(currentYear, currentMonth, currentDay);
    const first = current.getDate() - current.getDay();
    const startGrid = new Date(current.setDate(first));
    const endGrid = new Date(current.setDate(first + 6));
    
    startDate = startGrid.toISOString().split('T')[0];
    endDate = endGrid.toISOString().split('T')[0];
  } 
  else if (activeView === 'dia') {
    const current = new Date(currentYear, currentMonth, currentDay);
    startDate = current.toISOString().split('T')[0];
    endDate = current.toISOString().split('T')[0];
  }

  try {
    let url = `/api/calendario/eventos?start=${startDate}&end=${endDate}&tipo=${tipos.join(',')}&limit=300`;
    if (imovelId) url += `&imovelId=${imovelId}`;

    const res = await api.get(url);
    activeEvents = res.success ? res.eventos : [];
    
    if (activeView === 'mes') {
      renderMonthGrid(container);
    } else if (activeView === 'semana') {
      renderWeekGrid(container);
    } else if (activeView === 'dia') {
      renderDayView(container);
    }
  } catch (err) {
    console.error('Erro ao buscar eventos:', err);
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-error);">Erro ao carregar os eventos.</div>';
  }
}

function renderEmptyGrid(container) {
  if (activeView === 'mes') {
    renderMonthGrid(container, true);
  } else if (activeView === 'semana') {
    renderWeekGrid(container, true);
  } else if (activeView === 'dia') {
    container.innerHTML = '<div class="day-view-container"><div class="day-view-header">Sem eventos selecionados</div><div class="day-view-list"><div style="text-align:center;padding:40px;color:var(--color-text-muted);">Marque ao menos um tipo de evento no filtro lateral.</div></div></div>';
  }
}

function renderMonthGrid(container, empty = false) {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let html = '<div class="month-grid">';
  
  // Weekday Headers
  weekdays.forEach(day => {
    html += `<div class="weekday-header">${day}</div>`;
  });

  // Calculate day cells
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startOffset = firstDay.getDay(); // Days of previous month to show
  const totalCells = 42; // 6 rows of 7 days

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(currentYear, currentMonth, 1 - startOffset + i);
    const cellDateStr = cellDate.toISOString().split('T')[0];
    const isToday = cellDateStr === todayStr;
    const isOtherMonth = cellDate.getMonth() !== currentMonth;

    let dayClass = 'calendar-day';
    if (isToday) dayClass += ' today';
    if (isOtherMonth) dayClass += ' other-month';

    html += `
      <div class="${dayClass}" data-date="${cellDateStr}">
        <div class="day-number">${cellDate.getDate()}</div>
        <div class="day-events">`;

    if (!empty) {
      const dayEvents = getEventsForDate(cellDate);
      dayEvents.forEach(event => {
        html += `
          <div class="event-badge" style="background-color: ${event.cor};" onclick="showEventDetails(event, '${event.evento_id}')">
            ${event.tipo}: ${event.status || ''}
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderWeekGrid(container, empty = false) {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let html = '<div class="week-grid">';

  const current = new Date(currentYear, currentMonth, currentDay);
  const first = current.getDate() - current.getDay();

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 7; i++) {
    const cellDate = new Date(currentYear, currentMonth, first + i);
    const cellDateStr = cellDate.toISOString().split('T')[0];
    const isToday = cellDateStr === todayStr;

    let colClass = 'calendar-day-week';
    if (isToday) colClass += ' today';

    html += `
      <div class="${colClass}">
        <div class="weekday-header" style="border-bottom:none;padding-bottom:4px;">${weekdays[i]}</div>
        <div class="day-number" style="align-self:center; ${isToday ? 'background:var(--color-primary);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;' : ''}">${cellDate.getDate()}</div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:10px; flex-grow:1; overflow-y:auto;">
    `;

    if (!empty) {
      const dayEvents = getEventsForDate(cellDate);
      dayEvents.forEach(event => {
        html += `
          <div class="event-badge" style="background-color: ${event.cor}; white-space:normal;" onclick="showEventDetails(event, '${event.evento_id}')">
            <strong>${event.tipo}</strong><br>${event.status || ''}
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderDayView(container) {
  const targetDate = new Date(currentYear, currentMonth, currentDay);
  const dayEvents = getEventsForDate(targetDate);

  let html = `
    <div class="day-view-container">
      <div class="day-view-header">Eventos agendados para este dia: ${dayEvents.length}</div>
      <div class="day-view-list">
  `;

  if (dayEvents.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--color-text-muted);">Nenhum vencimento ou evento cadastrado para esta data.</div>';
  } else {
    dayEvents.forEach(event => {
      html += `
        <div class="day-view-item" onclick="showEventDetails(event, '${event.evento_id}')">
          <div class="day-view-item-color" style="background: ${event.cor}"></div>
          <div class="day-view-item-details">
            <div class="day-view-item-title">${event.tipo} — Status: ${event.status || 'Pendente'}</div>
            <div class="day-view-item-meta">
              <span>Período: ${new Date(event.data_inicio).toLocaleDateString('pt-BR')} até ${new Date(event.data_fim).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <i class="fi fi-rr-angle-right" style="color:var(--color-text-muted);"></i>
        </div>
      `;
    });
  }

  html += '  </div>\n</div>';
  container.innerHTML = html;
}

// Filtra a lista de eventos ativos para uma data específica
function getEventsForDate(date) {
  const targetStr = date.toISOString().split('T')[0];
  
  return activeEvents.filter(event => {
    // Formata datas de inicio e fim para strings no formato YYYY-MM-DD
    const startStr = new Date(event.data_inicio).toISOString().split('T')[0];
    const endStr = new Date(event.data_fim).toISOString().split('T')[0];
    
    // O evento cai neste dia se a data do dia está no intervalo
    return targetStr >= startStr && targetStr <= endStr;
  });
}

async function showEventDetails(e, id) {
  if (e) e.stopPropagation();
  
  const modal = document.getElementById('event-detail-modal');
  const body = document.getElementById('modal-event-body');
  const btnIrRegistro = document.getElementById('btn-ir-registro');

  body.innerHTML = '<div style="text-align:center;padding:20px;"><div class="spinner spinner-primary" style="margin:0 auto;"></div></div>';
  modal.classList.add('active');

  try {
    const res = await api.get(`/api/calendario/evento/${id}`);
    if (res.success && res.evento) {
      const ev = res.evento;
      
      const start = new Date(ev.data_inicio).toLocaleDateString('pt-BR');
      const end = new Date(ev.data_fim).toLocaleDateString('pt-BR');
      
      body.innerHTML = `
        <div class="event-info-row">
          <div class="event-info-label">Tipo de Evento:</div>
          <div class="event-info-value" style="font-weight:700; color:${ev.tipo === 'Despesa' ? '#ef4444' : ev.tipo === 'Recebimento' ? '#10b981' : '#3b82f6'};">
            ${ev.tipo}
          </div>
        </div>
        <div class="event-info-row">
          <div class="event-info-label">Status Atual:</div>
          <div class="event-info-value">
            <span class="badge" style="background:var(--color-primary-light); color:var(--color-primary); text-transform:capitalize;">${ev.status || 'Ativo'}</span>
          </div>
        </div>
        <div class="event-info-row">
          <div class="event-info-label">Data de Início:</div>
          <div class="event-info-value">${start}</div>
        </div>
        <div class="event-info-row">
          <div class="event-info-label">Data de Fim:</div>
          <div class="event-info-value">${end}</div>
        </div>
      `;
      
      if (ev.url_original) {
        btnIrRegistro.href = ev.url_original;
        btnIrRegistro.style.display = 'inline-block';
      } else {
        btnIrRegistro.style.display = 'none';
      }
    } else {
      body.innerHTML = '<div style="color:var(--color-error);">Erro ao obter detalhes do evento.</div>';
      btnIrRegistro.style.display = 'none';
    }
  } catch (err) {
    console.error('Erro ao buscar detalhes:', err);
    body.innerHTML = '<div style="color:var(--color-error);">Erro ao buscar informações do servidor.</div>';
    btnIrRegistro.style.display = 'none';
  }
}

function closeModal() {
  document.getElementById('event-detail-modal').classList.remove('active');
}
