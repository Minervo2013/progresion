// ─── Config ───────────────────────────────────────────────────────────────────
const COLORS = ['#FF6B35','#FF9F1C','#2EC4B6','#9B5DE5','#e74c3c','#3498db','#2ecc71','#e91e63','#00bcd4','#ff5722'];

function renderConfig() {
  renderWorkoutTypes();
  renderExercisesList();

  document.getElementById('add-workout-type').onclick = () => openWorkoutTypeModal();
  document.getElementById('add-exercise').onclick     = () => openExerciseModal();
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

let wtModalOrder = [];

function openWorkoutTypeModal(id = null) {
  const wt = id ? DB.getWorkoutType(id) : { id: null, name: '', color: COLORS[0], exerciseIds: [] };
  wtModalOrder = [...(wt.exerciseIds || [])];

  const colorOpts = COLORS.map(c => `
    <button type="button" class="color-btn ${wt.color === c ? 'selected' : ''}"
            style="background:${c}" data-color="${c}" onclick="selectWTColor(this,'${c}')"></button>`).join('');

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
      <label>Ejercicios seleccionados <span style="color:var(--text2);font-weight:400;font-size:.75rem">(arrastrá ↑↓ para ordenar)</span></label>
      <div id="wt-ex-ordered"></div>
      <label style="margin-top:.75rem;display:block">Agregar ejercicios</label>
      <div id="wt-ex-available" class="ex-checks"></div>
    </div>
    <button class="btn-primary btn-block" onclick="saveWorkoutTypeFromModal('${wt.id || ''}')">Guardar</button>
  `);

  renderWTExerciseLists();
}

function renderWTExerciseLists() {
  const exercises  = DB.getExercises();
  const orderedEl  = document.getElementById('wt-ex-ordered');
  const availableEl = document.getElementById('wt-ex-available');
  if (!orderedEl || !availableEl) return;

  // Ordered selected list
  if (!wtModalOrder.length) {
    orderedEl.innerHTML = '<p style="color:var(--text2);font-size:.8rem;padding:.4rem">Sin ejercicios — agregá desde abajo</p>';
  } else {
    orderedEl.innerHTML = wtModalOrder.map((exId, idx) => {
      const ex = exercises.find(e => e.id === exId);
      if (!ex) return '';
      return `
        <div class="wt-order-item">
          <span class="wt-order-num">${idx + 1}</span>
          <span class="wt-order-name">${escapeHtml(ex.name)}</span>
          <span style="font-size:.7rem;color:var(--text2)">${escapeHtml(ex.muscleGroup)}</span>
          <div class="wt-order-btns">
            <button class="btn-icon-sm" onclick="moveWTExercise(${idx},-1)" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn-icon-sm" onclick="moveWTExercise(${idx}, 1)" ${idx === wtModalOrder.length-1 ? 'disabled' : ''}>↓</button>
            <button class="btn-icon-sm danger" onclick="removeWTExercise('${exId}')">✕</button>
          </div>
        </div>`;
    }).join('');
  }

  // Available (not yet selected), grouped
  const unselected = exercises.filter(e => !wtModalOrder.includes(e.id));
  const byGroup = {};
  unselected.forEach(ex => {
    if (!byGroup[ex.muscleGroup]) byGroup[ex.muscleGroup] = [];
    byGroup[ex.muscleGroup].push(ex);
  });

  if (!unselected.length) {
    availableEl.innerHTML = '<p style="color:var(--text2);font-size:.8rem;padding:.4rem">Todos los ejercicios ya están incluidos</p>';
  } else {
    availableEl.innerHTML = Object.entries(byGroup).map(([group, exs]) => `
      <div class="ex-group-label">${escapeHtml(group)}</div>
      ${exs.map(ex => `
        <label class="check-item" onclick="addWTExercise('${ex.id}');return false">
          <span>+</span> ${escapeHtml(ex.name)}
        </label>`).join('')}
    `).join('');
  }
}

function moveWTExercise(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= wtModalOrder.length) return;
  [wtModalOrder[idx], wtModalOrder[newIdx]] = [wtModalOrder[newIdx], wtModalOrder[idx]];
  renderWTExerciseLists();
}

function removeWTExercise(exId) {
  wtModalOrder = wtModalOrder.filter(id => id !== exId);
  renderWTExerciseLists();
}

function addWTExercise(exId) {
  if (!wtModalOrder.includes(exId)) wtModalOrder.push(exId);
  renderWTExerciseLists();
}

function selectWTColor(btn, color) {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('wt-color').value = color;
}

function saveWorkoutTypeFromModal(id) {
  const name = document.getElementById('wt-name').value.trim();
  const color = document.getElementById('wt-color').value;
  const exerciseIds = [...wtModalOrder];

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
