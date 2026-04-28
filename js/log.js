// ─── Log Workout ──────────────────────────────────────────────────────────────
let currentLog = null;
let restTimerInterval = null;
let restTimerSeconds  = 0;

function renderLog(dateStr) {
  currentLogDate = dateStr;
  const existing = DB.getLogByDate(dateStr);
  currentLog = existing ? JSON.parse(JSON.stringify(existing)) : null;

  const hdr = document.getElementById('log-header');
  const content = document.getElementById('log-content');

  hdr.innerHTML = `
    <div class="log-date-bar">
      <span class="log-date-label">${formatDate(dateStr)}</span>
      ${currentLog ? `<button class="btn-danger-sm" onclick="deleteCurrentLog()">🗑 Borrar</button>` : ''}
    </div>`;

  if (!currentLog) {
    renderWorkoutTypeSelector(content);
  } else {
    renderLogEditor(content);
  }
}

function renderWorkoutTypeSelector(container) {
  const wts = DB.getWorkoutTypes();
  container.innerHTML = `
    <div class="section-label">¿Qué entrenaste hoy?</div>
    <div class="wt-selector">
      ${wts.map(wt => `
        <button class="wt-select-btn" style="border-color:${wt.color};color:${wt.color}"
                onclick="startLog('${wt.id}')">
          <span class="wts-dot" style="background:${wt.color}"></span>
          ${escapeHtml(wt.name)}
        </button>`).join('')}
    </div>
    <p class="empty-msg" style="margin-top:1rem">O <a href="#" onclick="showView('config')">configura tus rutinas</a> primero</p>`;
}

function startLog(workoutTypeId) {
  const wt = DB.getWorkoutType(workoutTypeId);
  if (!wt) return;
  const exercises = wt.exerciseIds
    .map(id => DB.getExercise(id))
    .filter(Boolean)
    .map(ex => ({ exerciseId: ex.id, sets: [newSet()] }));

  currentLog = {
    id: null,
    date: currentLogDate,
    workoutTypeId,
    notes: '',
    duration: '',
    exercises,
  };
  renderLogEditor(document.getElementById('log-content'));
  // Update delete button
  document.getElementById('log-header').innerHTML = `
    <div class="log-date-bar">
      <span class="log-date-label">${formatDate(currentLogDate)}</span>
    </div>`;
}

function newSet() {
  return { reps: '', weight: '', sensation: '', restSeconds: 90 };
}

function renderLogEditor(container) {
  if (!currentLog) return;
  const wt = DB.getWorkoutType(currentLog.workoutTypeId);

  container.innerHTML = `
    <div class="log-wt-bar" style="border-left:4px solid ${wt ? wt.color : '#666'}">
      <span style="color:${wt ? wt.color : '#aaa'}">${wt ? wt.name : 'Entreno'}</span>
      <div class="log-meta">
        <input type="number" id="log-duration" class="input-sm" placeholder="⏱ min" min="1" max="300"
               value="${currentLog.duration || ''}" oninput="currentLog.duration=this.value">
      </div>
    </div>

    <div id="exercises-container">
      ${currentLog.exercises.map((ex, exIdx) => renderExerciseBlock(ex, exIdx)).join('')}
    </div>

    <button class="btn-outline btn-block" onclick="addExerciseToLog()">+ Agregar ejercicio</button>

    <div class="log-notes">
      <label>Notas del entreno</label>
      <textarea id="log-notes-input" class="textarea-input" placeholder="¿Cómo te sentiste? ¿Algo destacable?"
                oninput="currentLog.notes=this.value">${escapeHtml(currentLog.notes)}</textarea>
    </div>

    <div class="rest-timer-bar" id="rest-timer-bar">
      <span>⏱ Descanso:</span>
      <span id="rest-timer-display">00:00</span>
      <button class="btn-sm" onclick="startRestTimer(60)">1min</button>
      <button class="btn-sm" onclick="startRestTimer(90)">90s</button>
      <button class="btn-sm" onclick="startRestTimer(120)">2min</button>
      <button class="btn-sm" onclick="startRestTimer(180)">3min</button>
      <button class="btn-sm btn-danger-sm" onclick="stopRestTimer()">✕</button>
    </div>

    <button class="btn-primary btn-block btn-save" onclick="saveCurrentLog()">💾 Guardar entreno</button>`;
}

function renderExerciseBlock(ex, exIdx) {
  const exercise = DB.getExercise(ex.exerciseId);
  const name = exercise ? exercise.name : 'Ejercicio desconocido';
  const group = exercise ? exercise.muscleGroup : '';

  const history    = DB.getExerciseHistory(ex.exerciseId);
  const lastSession = history.length ? history[history.length - 1] : null;
  let prevHint = '';
  if (lastSession && lastSession.sets.length) {
    const setsStr = lastSession.sets
      .filter(s => s.weight || s.reps)
      .map(s => `${s.weight || 0}kg×${s.reps || 0}`)
      .join(' · ');
    prevHint = `<span class="prev-hint">Última vez (${formatDate(lastSession.date)}): ${setsStr}</span>`;
  }

  return `
    <div class="exercise-block" id="ex-block-${exIdx}">
      <div class="ex-header">
        <div class="ex-title">
          <span class="ex-name">${escapeHtml(name)}</span>
          <span class="ex-group">${escapeHtml(group)}</span>
          ${prevHint}
        </div>
        <div class="ex-move-btns">
          <button class="btn-icon-sm" onclick="moveExercise(${exIdx},-1)" ${exIdx === 0 ? 'disabled' : ''} title="Subir">↑</button>
          <button class="btn-icon-sm" onclick="moveExercise(${exIdx}, 1)" ${exIdx === currentLog.exercises.length - 1 ? 'disabled' : ''} title="Bajar">↓</button>
          <button class="btn-icon-sm danger" onclick="removeExerciseFromLog(${exIdx})">✕</button>
        </div>
      </div>

      <div class="sets-table">
        <div class="sets-head">
          <span>Serie</span><span>Peso (kg)</span><span>Reps</span><span>Sensación</span><span>Desc(s)</span><span></span>
        </div>
        <div id="sets-${exIdx}">
          ${ex.sets.map((set, si) => renderSetRow(exIdx, si, set)).join('')}
        </div>
      </div>
      <button class="btn-add-set" onclick="addSet(${exIdx})">+ Serie</button>
    </div>`;
}

function renderSetRow(exIdx, setIdx, set) {
  const sensOpts = SENSATIONS.map((s, i) =>
    `<option value="${i}" ${set.sensation == i ? 'selected' : ''}>${s}</option>`
  ).join('');

  return `
    <div class="set-row" id="set-${exIdx}-${setIdx}">
      <span class="set-num">${setIdx + 1}</span>
      <input type="number" class="set-input" placeholder="0" min="0" step="0.5"
             value="${set.weight}"
             oninput="updateSet(${exIdx},${setIdx},'weight',this.value)">
      <input type="number" class="set-input" placeholder="0" min="0" max="999"
             value="${set.reps}"
             oninput="updateSet(${exIdx},${setIdx},'reps',this.value)">
      <select class="set-select" onchange="updateSet(${exIdx},${setIdx},'sensation',this.value)">
        <option value="">-</option>${sensOpts}
      </select>
      <input type="number" class="set-input set-rest" placeholder="90" min="0" max="600"
             value="${set.restSeconds}"
             oninput="updateSet(${exIdx},${setIdx},'restSeconds',this.value);startRestTimer(parseInt(this.value))">
      <button class="btn-icon-sm" onclick="removeSet(${exIdx},${setIdx})">✕</button>
    </div>`;
}

function updateSet(exIdx, setIdx, field, value) {
  if (!currentLog) return;
  currentLog.exercises[exIdx].sets[setIdx][field] = value;
}

function addSet(exIdx) {
  if (!currentLog) return;
  const sets = currentLog.exercises[exIdx].sets;
  const last = sets[sets.length - 1] || newSet();
  sets.push({ ...last, sensation: '' });
  const container = document.getElementById('sets-' + exIdx);
  const si = sets.length - 1;
  container.insertAdjacentHTML('beforeend', renderSetRow(exIdx, si, sets[si]));
}

function removeSet(exIdx, setIdx) {
  if (!currentLog) return;
  const sets = currentLog.exercises[exIdx].sets;
  if (sets.length <= 1) return showToast('Debe haber al menos 1 serie', 'error');
  sets.splice(setIdx, 1);
  const container = document.getElementById('sets-' + exIdx);
  container.innerHTML = currentLog.exercises[exIdx].sets.map((s, i) => renderSetRow(exIdx, i, s)).join('');
}

function moveExercise(exIdx, dir) {
  if (!currentLog) return;
  const exs = currentLog.exercises;
  const newIdx = exIdx + dir;
  if (newIdx < 0 || newIdx >= exs.length) return;
  [exs[exIdx], exs[newIdx]] = [exs[newIdx], exs[exIdx]];
  renderLogEditor(document.getElementById('log-content'));
}

function removeExerciseFromLog(exIdx) {
  if (!currentLog) return;
  if (currentLog.exercises.length <= 1) return showToast('Debe haber al menos 1 ejercicio', 'error');
  currentLog.exercises.splice(exIdx, 1);
  renderLogEditor(document.getElementById('log-content'));
}

function addExerciseToLog() {
  const exercises = DB.getExercises();
  const used = currentLog.exercises.map(e => e.exerciseId);
  const available = exercises.filter(e => !used.includes(e.id));

  if (!available.length) return showToast('Ya tienes todos los ejercicios', 'info');

  const byGroup = {};
  available.forEach(ex => {
    if (!byGroup[ex.muscleGroup]) byGroup[ex.muscleGroup] = [];
    byGroup[ex.muscleGroup].push(ex);
  });

  const opts = Object.entries(byGroup).map(([group, exs]) =>
    `<optgroup label="${escapeHtml(group)}">
      ${exs.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}
    </optgroup>`
  ).join('');

  openModal('Agregar ejercicio', `
    <select id="add-ex-select" class="select-input full-width">
      <option value="">Seleccionar...</option>${opts}
    </select>
    <button class="btn-primary btn-block" style="margin-top:1rem" onclick="confirmAddExercise()">Agregar</button>
  `);
}

function confirmAddExercise() {
  const sel = document.getElementById('add-ex-select');
  if (!sel.value) return showToast('Selecciona un ejercicio', 'error');
  currentLog.exercises.push({ exerciseId: sel.value, sets: [newSet()] });
  closeModal();
  renderLogEditor(document.getElementById('log-content'));
}

function saveCurrentLog() {
  if (!currentLog) return;
  // Clean empty sets
  currentLog.exercises.forEach(ex => {
    ex.sets = ex.sets.filter(s => s.reps || s.weight);
    if (!ex.sets.length) ex.sets = [newSet()];
  });
  DB.saveLog(currentLog);
  currentLog = DB.getLogByDate(currentLogDate);
  showToast('¡Entreno guardado! 💪');
  renderLog(currentLogDate);
}

function deleteCurrentLog() {
  if (!currentLog || !currentLog.id) return;
  if (!confirm('¿Borrar este entreno?')) return;
  DB.deleteLog(currentLog.id);
  currentLog = null;
  showToast('Entreno eliminado', 'error');
  renderLog(currentLogDate);
}

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function startRestTimer(seconds) {
  stopRestTimer();
  restTimerSeconds = seconds;
  updateRestDisplay();
  restTimerInterval = setInterval(() => {
    restTimerSeconds--;
    updateRestDisplay();
    if (restTimerSeconds <= 0) {
      stopRestTimer();
      const bar = document.getElementById('rest-timer-bar');
      if (bar) bar.classList.add('timer-done');
      setTimeout(() => bar && bar.classList.remove('timer-done'), 2000);
    }
  }, 1000);
}

function stopRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  restTimerSeconds  = 0;
  updateRestDisplay();
}

function updateRestDisplay() {
  const el = document.getElementById('rest-timer-display');
  if (!el) return;
  const m = Math.floor(restTimerSeconds / 60);
  const s = restTimerSeconds % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.style.color = restTimerSeconds > 0 && restTimerSeconds <= 10 ? '#e74c3c' : '';
}
