// ─── Charts ───────────────────────────────────────────────────────────────────
let weightChart = null;
let volumeChart = null;

function renderCharts() {
  const exercises = DB.getExercises();
  const sel = document.getElementById('chart-exercise-select');
  const currentVal = sel.value;

  const byGroup = {};
  exercises.forEach(ex => {
    if (!byGroup[ex.muscleGroup]) byGroup[ex.muscleGroup] = [];
    byGroup[ex.muscleGroup].push(ex);
  });

  sel.innerHTML = '<option value="">Seleccionar ejercicio...</option>' +
    Object.entries(byGroup).map(([group, exs]) =>
      `<optgroup label="${escapeHtml(group)}">
        ${exs.map(e => `<option value="${e.id}" ${e.id === currentVal ? 'selected' : ''}>${escapeHtml(e.name)}</option>`).join('')}
      </optgroup>`
    ).join('');

  sel.onchange = () => drawCharts(sel.value);

  if (currentVal) drawCharts(currentVal);
  else {
    document.getElementById('charts-content').innerHTML =
      '<p class="empty-msg" style="text-align:center;margin-top:2rem">Selecciona un ejercicio para ver su progresión</p>';
  }
}

function drawCharts(exerciseId) {
  if (!exerciseId) return;
  const history = DB.getExerciseHistory(exerciseId);
  const ex      = DB.getExercise(exerciseId);
  const content = document.getElementById('charts-content');

  if (!history.length) {
    content.innerHTML = '<p class="empty-msg" style="text-align:center;margin-top:2rem">Sin datos para este ejercicio todavía</p>';
    return;
  }

  const labels  = history.map(h => formatDate(h.date));
  const weights = history.map(h => h.maxWeight);
  const volumes = history.map(h => h.totalVolume);
  const rms     = history.map(h => h.best1RM);

  // Last session summary
  const last = history[history.length - 1];
  const best = history.reduce((b, h) => h.maxWeight > b.maxWeight ? h : b, history[0]);

  content.innerHTML = `
    <div class="chart-summary">
      <div class="cs-card">
        <div class="cs-val">${last.maxWeight}<small>kg</small></div>
        <div class="cs-label">Última sesión</div>
      </div>
      <div class="cs-card">
        <div class="cs-val">${best.maxWeight}<small>kg</small></div>
        <div class="cs-label">Récord peso</div>
      </div>
      <div class="cs-card">
        <div class="cs-val">${rms[rms.length-1]}<small>kg</small></div>
        <div class="cs-label">1RM estimado</div>
      </div>
      <div class="cs-card">
        <div class="cs-val">${history.length}</div>
        <div class="cs-label">Sesiones</div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Peso máximo por sesión (kg)</div>
      <canvas id="chart-weight"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">Volumen total por sesión (kg×reps)</div>
      <canvas id="chart-volume"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">1RM estimado (Epley)</div>
      <canvas id="chart-1rm"></canvas>
    </div>`;

  if (weightChart) { weightChart.destroy(); weightChart = null; }
  if (volumeChart) { volumeChart.destroy(); volumeChart = null; }

  const chartDefaults = {
    tension: 0.3,
    fill: true,
    pointBackgroundColor: '#FF6B35',
    pointRadius: 4,
    pointHoverRadius: 6,
  };

  const axisColor = '#666';
  const gridColor = '#2a2a2a';

  function makeChart(id, data, color, yLabel) {
    const ctx = document.getElementById(id);
    if (!ctx) return null;
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: color,
          backgroundColor: color + '22',
          ...chartDefaults,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: axisColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: axisColor }, grid: { color: gridColor },
               title: { display: true, text: yLabel, color: axisColor, font: { size: 11 } } }
        }
      }
    });
  }

  weightChart = makeChart('chart-weight', weights, '#FF6B35', 'kg');
  makeChart('chart-volume', volumes, '#2EC4B6', 'kg × reps');
  makeChart('chart-1rm', rms, '#9B5DE5', 'kg');
}

// ─── History ──────────────────────────────────────────────────────────────────
function renderHistory() {
  const logs     = DB.getLogs();
  const container = document.getElementById('history-list');

  if (!logs.length) {
    container.innerHTML = '<p class="empty-msg" style="text-align:center;margin-top:2rem">Sin entrenos registrados</p>';
    return;
  }

  container.innerHTML = logs.map(log => {
    const wt  = DB.getWorkoutType(log.workoutTypeId);
    const vol = log.exercises.reduce((t, ex) =>
      t + ex.sets.reduce((s, set) => s + (parseFloat(set.weight)||0)*(parseInt(set.reps)||0), 0), 0);
    const totalSets = log.exercises.reduce((t, ex) => t + ex.sets.length, 0);

    return `
      <div class="history-item" onclick="toggleHistoryDetail('${log.id}')">
        <div class="hi-left">
          <div class="wt-dot" style="background:${wt ? wt.color : '#666'}"></div>
          <div>
            <div class="hi-name">${wt ? escapeHtml(wt.name) : 'Entreno'}</div>
            <div class="hi-date">${formatDate(log.date)}</div>
          </div>
        </div>
        <div class="hi-right">
          <span>${log.exercises.length} ejerc. · ${totalSets} series</span>
          <span class="hi-vol">${Math.round(vol)} kg</span>
          <span class="hi-arrow" id="arrow-${log.id}">›</span>
        </div>
      </div>
      <div class="history-detail hidden" id="detail-${log.id}">
        ${log.exercises.map(ex => {
          const exInfo = DB.getExercise(ex.exerciseId);
          return `
            <div class="hd-exercise">
              <div class="hd-ex-name">${exInfo ? escapeHtml(exInfo.name) : 'Ejercicio'}</div>
              <div class="hd-sets">
                ${ex.sets.map((s, i) => `
                  <span class="hd-set">${i+1}: ${s.weight||0}kg × ${s.reps||0} ${s.sensation !== '' && s.sensation !== undefined ? SENSATIONS[s.sensation] || '' : ''}</span>
                `).join('')}
              </div>
            </div>`;
        }).join('')}
        ${log.notes ? `<div class="hd-notes">📝 ${escapeHtml(log.notes)}</div>` : ''}
        <div class="hd-actions">
          <button class="btn-outline" onclick="event.stopPropagation();showView('log',{date:'${log.date}'})">✏️ Editar</button>
        </div>
      </div>`;
  }).join('');
}

function toggleHistoryDetail(id) {
  const detail = document.getElementById('detail-' + id);
  const arrow  = document.getElementById('arrow-' + id);
  if (!detail) return;
  detail.classList.toggle('hidden');
  if (arrow) arrow.textContent = detail.classList.contains('hidden') ? '›' : '⌄';
}

// ─── PRs ──────────────────────────────────────────────────────────────────────
function renderPRs() {
  const prs = DB.getPRs();
  const container = document.getElementById('prs-list');

  if (!prs.length) {
    container.innerHTML = '<p class="empty-msg" style="text-align:center;margin-top:2rem">Registra entrenamientos para ver tus marcas personales</p>';
    return;
  }

  const byGroup = {};
  prs.forEach(pr => {
    const g = pr.exercise.muscleGroup;
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(pr);
  });

  container.innerHTML = Object.entries(byGroup).map(([group, items]) => `
    <div class="pr-group">
      <div class="pr-group-title">${escapeHtml(group)}</div>
      ${items.map(pr => `
        <div class="pr-card">
          <div class="pr-name">${escapeHtml(pr.exercise.name)}</div>
          <div class="pr-stats">
            <div class="pr-stat">
              <div class="pr-stat-val">${pr.bestWeight.value}<small>kg</small></div>
              <div class="pr-stat-label">Mejor peso</div>
              <div class="pr-stat-date">${formatDate(pr.bestWeight.date)}</div>
            </div>
            <div class="pr-stat">
              <div class="pr-stat-val">${pr.best1RM.value}<small>kg</small></div>
              <div class="pr-stat-label">1RM estimado</div>
              <div class="pr-stat-date">${formatDate(pr.best1RM.date)}</div>
            </div>
            <div class="pr-stat">
              <div class="pr-stat-val">${Math.round(pr.bestVolume.value)}<small>kg</small></div>
              <div class="pr-stat-label">Mejor volumen</div>
              <div class="pr-stat-date">${formatDate(pr.bestVolume.date)}</div>
            </div>
            <div class="pr-stat">
              <div class="pr-stat-val">${pr.sessions}</div>
              <div class="pr-stat-label">Sesiones</div>
            </div>
          </div>
        </div>`).join('')}
    </div>`).join('');
}
