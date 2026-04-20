// ─── Config ───────────────────────────────────────────────────────────────────
const COLORS = ['#FF6B35','#FF9F1C','#2EC4B6','#9B5DE5','#e74c3c','#3498db','#2ecc71','#e91e63','#00bcd4','#ff5722'];

function renderConfig() {
  renderWorkoutTypes();
  renderExercisesList();
  renderApiKeyInput();

  document.getElementById('add-workout-type').onclick = () => openWorkoutTypeModal();
  document.getElementById('add-exercise').onclick     = () => openExerciseModal();
  document.getElementById('search-exercisedb').onclick = () => openExerciseDBSearch();
}

function renderApiKeyInput() {
  const container = document.getElementById('api-key-section');
  if (!container) return;
  const saved = EDBAPI.getKey();
  container.innerHTML = `
    <div class="api-key-bar">
      <input type="password" id="rapid-api-key" class="text-input" style="flex:1;font-size:.8rem"
             placeholder="RapidAPI Key (ExerciseDB)" value="${escapeHtml(saved)}">
      <button class="btn-outline" onclick="saveApiKey()" style="white-space:nowrap">Guardar</button>
    </div>
    ${saved ? '<span style="font-size:.72rem;color:var(--teal)">✓ API key configurada</span>' : '<span style="font-size:.72rem;color:var(--text2)">Sin API key — <a href="https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb" target="_blank">obtener gratis</a></span>'}`;
}

function saveApiKey() {
  const input = document.getElementById('rapid-api-key');
  if (!input) return;
  EDBAPI.setKey(input.value);
  showToast('API key guardada');
  renderApiKeyInput();
}

// ─── Workout Types ────────────────────────────────────────────────────────────
function renderWorkoutTypes() {
  const wts = DB.getWorkoutTypes();
  const container = document.getElementById('workout-types-list');
  if (!wts.length) {
    container.innerHTML = '<p class="empty-msg">No hay rutinas configuradas</p>';
    return;
  }
  container.innerHTML = wts.map(wt => `
    <div class="config-item">
      <div class="ci-left">
        <div class="wt-dot-lg" style="background:${wt.color}"></div>
        <div>
          <div class="ci-name">${escapeHtml(wt.name)}</div>
          <div class="ci-sub">${wt.exerciseIds.length} ejercicios</div>
        </div>
      </div>
      <div class="ci-actions">
        <button class="btn-icon-sm" onclick="openWorkoutTypeModal('${wt.id}')">✏️</button>
        <button class="btn-icon-sm danger" onclick="confirmDeleteWT('${wt.id}')">🗑</button>
      </div>
    </div>`).join('');
}

function openWorkoutTypeModal(id = null) {
  const wt = id ? DB.getWorkoutType(id) : { id: null, name: '', color: COLORS[0], exerciseIds: [] };
  const exercises = DB.getExercises();

  const byGroup = {};
  exercises.forEach(ex => {
    if (!byGroup[ex.muscleGroup]) byGroup[ex.muscleGroup] = [];
    byGroup[ex.muscleGroup].push(ex);
  });

  const colorOpts = COLORS.map(c => `
    <button type="button" class="color-btn ${wt.color === c ? 'selected' : ''}"
            style="background:${c}" data-color="${c}" onclick="selectWTColor(this,'${c}')"></button>`).join('');

  const exChecks = Object.entries(byGroup).map(([group, exs]) => `
    <div class="ex-group-label">${escapeHtml(group)}</div>
    ${exs.map(ex => `
      <label class="check-item">
        <input type="checkbox" value="${ex.id}" ${wt.exerciseIds.includes(ex.id) ? 'checked' : ''}>
        ${escapeHtml(ex.name)}
      </label>`).join('')}
  `).join('');

  openModal(id ? 'Editar rutina' : 'Nueva rutina', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="wt-name" class="text-input" value="${escapeHtml(wt.name)}" placeholder="Ej: Torso A">
    </div>
    <div class="form-group">
      <label>Color</label>
      <div class="color-picker" id="wt-color-picker">${colorOpts}</div>
      <input type="hidden" id="wt-color" value="${wt.color}">
    </div>
    <div class="form-group">
      <label>Ejercicios</label>
      <div class="ex-checks">${exChecks}</div>
    </div>
    <button class="btn-primary btn-block" onclick="saveWorkoutTypeFromModal('${wt.id || ''}')">Guardar</button>
  `);
}

function selectWTColor(btn, color) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('wt-color').value = color;
}

function saveWorkoutTypeFromModal(id) {
  const name = document.getElementById('wt-name').value.trim();
  const color = document.getElementById('wt-color').value;
  const exerciseIds = [...document.querySelectorAll('.ex-checks input:checked')].map(cb => cb.value);

  if (!name) return showToast('El nombre es obligatorio', 'error');

  DB.saveWorkoutType({ id: id || null, name, color, exerciseIds });
  closeModal();
  renderWorkoutTypes();
  showToast('Rutina guardada');
}

function confirmDeleteWT(id) {
  const wt = DB.getWorkoutType(id);
  if (!confirm(`¿Eliminar la rutina "${wt ? wt.name : ''}"?`)) return;
  DB.deleteWorkoutType(id);
  renderWorkoutTypes();
  showToast('Rutina eliminada', 'error');
}

// ─── Exercises ────────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = ['Pecho','Espalda','Hombros','Bíceps','Tríceps','Cuádriceps',
                       'Isquiotibiales','Glúteos','Pantorrillas','Core','Cardio','Otro'];

function renderExercisesList() {
  const exercises = DB.getExercises();
  const container = document.getElementById('exercises-list');

  const byGroup = {};
  exercises.forEach(ex => {
    if (!byGroup[ex.muscleGroup]) byGroup[ex.muscleGroup] = [];
    byGroup[ex.muscleGroup].push(ex);
  });

  if (!exercises.length) {
    container.innerHTML = '<p class="empty-msg">No hay ejercicios configurados</p>';
    return;
  }

  container.innerHTML = Object.entries(byGroup).map(([group, exs]) => `
    <div class="ex-group-section">
      <div class="ex-group-title">${escapeHtml(group)}</div>
      ${exs.map(ex => `
        <div class="config-item">
          <div class="ci-left">
            <span class="ci-name">${escapeHtml(ex.name)}</span>
          </div>
          <div class="ci-actions">
            <button class="btn-icon-sm" onclick="openExerciseModal('${ex.id}')">✏️</button>
            <button class="btn-icon-sm danger" onclick="confirmDeleteEx('${ex.id}')">🗑</button>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function openExerciseModal(id = null) {
  const ex = id ? DB.getExercise(id) : { id: null, name: '', muscleGroup: MUSCLE_GROUPS[0] };
  const groupOpts = MUSCLE_GROUPS.map(g =>
    `<option value="${g}" ${ex.muscleGroup === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  openModal(id ? 'Editar ejercicio' : 'Nuevo ejercicio', `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="ex-name" class="text-input" value="${escapeHtml(ex.name)}" placeholder="Ej: Press Banca">
    </div>
    <div class="form-group">
      <label>Grupo muscular</label>
      <select id="ex-group" class="select-input full-width">${groupOpts}</select>
    </div>
    <button class="btn-primary btn-block" onclick="saveExerciseFromModal('${ex.id || ''}')">Guardar</button>
  `);
}

function saveExerciseFromModal(id) {
  const name        = document.getElementById('ex-name').value.trim();
  const muscleGroup = document.getElementById('ex-group').value;
  if (!name) return showToast('El nombre es obligatorio', 'error');
  DB.saveExercise({ id: id || null, name, muscleGroup });
  closeModal();
  renderExercisesList();
  showToast('Ejercicio guardado');
}

function confirmDeleteEx(id) {
  const ex = DB.getExercise(id);
  if (!confirm(`¿Eliminar "${ex ? ex.name : ''}"? Se quitará de todas las rutinas.`)) return;
  DB.deleteExercise(id);
  renderExercisesList();
  showToast('Ejercicio eliminado', 'error');
}
