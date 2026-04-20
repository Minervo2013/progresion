// ─── Shared constants ─────────────────────────────────────────────────────────
const SENSATIONS = ['😊 Fácil', '👍 Normal', '💪 Dura', '🔥 Al fallo'];

// ─── Navigation ───────────────────────────────────────────────────────────────
let currentView = 'dashboard';
let currentLogDate = null;

const viewTitles = {
  dashboard: 'GymTracker',
  calendar:  'Calendario',
  log:       'Registrar entreno',
  charts:    'Progresión',
  config:    'Configuración',
};

function showView(view, params = {}) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('view-' + view);
  if (!el) return;
  el.classList.add('active');
  currentView = view;

  const navBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active');

  document.getElementById('page-title').textContent = viewTitles[view] || view;

  const hdr = document.getElementById('header-actions');
  hdr.innerHTML = '';

  if (view === 'dashboard')  renderDashboard();
  if (view === 'calendar')   renderCalendar();
  if (view === 'log')        renderLog(params.date || todayStr());
  if (view === 'charts')  renderCharts();
  if (view === 'config')  renderConfig();
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onConfirm = null) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
  if (onConfirm) {
    const btn = document.getElementById('modal-confirm');
    if (btn) btn.onclick = () => { onConfirm(); closeModal(); };
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const today = todayStr();
  const [y, m, d] = today.split('-');
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const dayName = days[new Date(today).getDay()];

  document.getElementById('today-date').textContent = `${dayName} ${parseInt(d)} de ${months[parseInt(m)-1]}`;

  const log  = DB.getLogByDate(today);
  const wts  = DB.getWorkoutTypes();
  const card = document.getElementById('today-workout-card');

  if (log) {
    const wt = DB.getWorkoutType(log.workoutTypeId);
    const vol = log.exercises.reduce((t, ex) =>
      t + ex.sets.reduce((s, set) => s + (parseFloat(set.weight)||0)*(parseInt(set.reps)||0), 0), 0);
    card.innerHTML = `
      <div class="today-logged">
        <div class="wt-badge" style="background:${wt ? wt.color : '#666'}">${wt ? wt.name : 'Entreno'}</div>
        <div class="today-stats">
          <span>${log.exercises.length} ejercicios</span>
          <span>${Math.round(vol)} kg volumen</span>
        </div>
        <button class="btn-outline" onclick="showView('log',{date:'${today}'})">Ver / Editar</button>
      </div>`;
  } else {
    card.innerHTML = `
      <div class="today-empty">
        <p>No hay entreno registrado hoy</p>
        <button class="btn-primary" onclick="showView('log',{date:'${today}'})">+ Registrar entreno</button>
      </div>`;
  }

  const stats = DB.getStats();
  document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${stats.weekCount}</div>
      <div class="stat-label">Esta semana</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.monthCount}</div>
      <div class="stat-label">Este mes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.weekVolume}<small>kg</small></div>
      <div class="stat-label">Volumen semana</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.total}</div>
      <div class="stat-label">Total entrenos</div>
    </div>`;

  const recentLogs = DB.getLogs().slice(0, 5);
  const ra = document.getElementById('recent-activity');
  if (!recentLogs.length) {
    ra.innerHTML = '<p class="empty-msg">Aún no hay entrenamientos registrados</p>';
    return;
  }
  ra.innerHTML = recentLogs.map(log => {
    const wt  = DB.getWorkoutType(log.workoutTypeId);
    const vol = log.exercises.reduce((t, ex) =>
      t + ex.sets.reduce((s, set) => s + (parseFloat(set.weight)||0)*(parseInt(set.reps)||0), 0), 0);
    return `
      <div class="history-item" onclick="showView('log',{date:'${log.date}'})">
        <div class="hi-left">
          <div class="wt-dot" style="background:${wt ? wt.color : '#666'}"></div>
          <div>
            <div class="hi-name">${wt ? wt.name : 'Entreno'}</div>
            <div class="hi-date">${formatDate(log.date)}</div>
          </div>
        </div>
        <div class="hi-right">
          <div>${log.exercises.length} ejerc.</div>
          <div class="hi-vol">${Math.round(vol)} kg</div>
        </div>
      </div>`;
  }).join('');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav buttons
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Config tabs
  document.querySelectorAll('.config-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('config-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Progress tabs
  document.querySelectorAll('.progress-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.progress-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.progress-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('progress-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'charts') renderCharts();
      if (tab.dataset.tab === 'history') renderHistory();
      if (tab.dataset.tab === 'prs') renderPRs();
    });
  });

  showView('dashboard');
});
