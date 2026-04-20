// ─── ExerciseDB API (RapidAPI) ────────────────────────────────────────────────
const EDBAPI = (() => {
  const STORAGE_KEY = 'gymTracker_rapidApiKey';
  const HOST = 'exercisedb.p.rapidapi.com';
  const BASE = 'https://exercisedb.p.rapidapi.com';

  const GROUP_MAP = {
    'chest':       'Pecho',
    'back':        'Espalda',
    'shoulders':   'Hombros',
    'upper arms':  'Bíceps',
    'lower arms':  'Antebrazos',
    'upper legs':  'Cuádriceps',
    'lower legs':  'Pantorrillas',
    'waist':       'Core',
    'cardio':      'Cardio',
    'neck':        'Hombros',
  };

  function mapGroup(bodyPart, target) {
    if (bodyPart === 'upper arms' && target && target.includes('triceps')) return 'Tríceps';
    if (bodyPart === 'upper legs' && target && (target.includes('hamstrings') || target.includes('glutes')))
      return target.includes('glutes') ? 'Glúteos' : 'Isquiotibiales';
    return GROUP_MAP[bodyPart] || 'Otro';
  }

  function getKey()      { return localStorage.getItem(STORAGE_KEY) || ''; }
  function setKey(k)     { localStorage.setItem(STORAGE_KEY, k.trim()); }
  function hasKey()      { return !!getKey(); }

  async function request(path) {
    if (!hasKey()) throw new Error('API key no configurada');
    const res = await fetch(BASE + path, {
      headers: {
        'X-RapidAPI-Key':  getKey(),
        'X-RapidAPI-Host': HOST,
      }
    });
    if (res.status === 403 || res.status === 401) throw new Error('API key inválida o sin permisos');
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  }

  return {
    getKey, setKey, hasKey,

    async getBodyParts() {
      return request('/exercises/bodyPartList');
    },

    async searchByName(name, limit = 15) {
      return request(`/exercises/name/${encodeURIComponent(name.toLowerCase())}?limit=${limit}&offset=0`);
    },

    async getByBodyPart(bodyPart, limit = 15) {
      return request(`/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}&offset=0`);
    },

    toLocalExercise(apiEx) {
      return {
        id:           null,
        name:         apiEx.name.charAt(0).toUpperCase() + apiEx.name.slice(1),
        muscleGroup:  mapGroup(apiEx.bodyPart, apiEx.target),
        gifUrl:       apiEx.gifUrl || '',
        equipment:    apiEx.equipment || '',
        target:       apiEx.target || '',
      };
    }
  };
})();

// ─── ExerciseDB Search Modal ──────────────────────────────────────────────────
let edbBodyParts = [];

async function openExerciseDBSearch() {
  if (!EDBAPI.hasKey()) {
    showToast('Configurá la API key primero', 'error');
    return;
  }

  openModal('Buscar en ExerciseDB', `
    <div class="edb-search-bar">
      <input type="text" id="edb-query" class="text-input" placeholder="Buscar por nombre...">
      <span style="color:var(--text2);font-size:.8rem;margin:0 .4rem">o</span>
      <select id="edb-bodypart" class="select-input">
        <option value="">Por grupo muscular...</option>
        ${edbBodyParts.map(bp => `<option value="${bp}">${bp}</option>`).join('')}
      </select>
    </div>
    <button class="btn-primary btn-block" style="margin:.75rem 0" onclick="runEDBSearch()">🔍 Buscar</button>
    <div id="edb-results"></div>
  `);

  if (!edbBodyParts.length) {
    try {
      edbBodyParts = await EDBAPI.getBodyParts();
      const sel = document.getElementById('edb-bodypart');
      if (sel) sel.innerHTML = '<option value="">Por grupo muscular...</option>' +
        edbBodyParts.map(bp => `<option value="${bp}">${bp}</option>`).join('');
    } catch(e) { /* silent */ }
  }
}

async function runEDBSearch() {
  const query    = document.getElementById('edb-query')?.value.trim();
  const bodypart = document.getElementById('edb-bodypart')?.value;
  const results  = document.getElementById('edb-results');
  if (!results) return;

  if (!query && !bodypart) {
    showToast('Ingresá un nombre o grupo muscular', 'error');
    return;
  }

  results.innerHTML = '<p class="empty-msg" style="text-align:center;padding:1rem">Buscando...</p>';

  try {
    let data;
    if (query) data = await EDBAPI.searchByName(query);
    else       data = await EDBAPI.getByBodyPart(bodypart);

    if (!data.length) {
      results.innerHTML = '<p class="empty-msg" style="text-align:center;padding:1rem">Sin resultados</p>';
      return;
    }

    const existing = DB.getExercises().map(e => e.name.toLowerCase());

    results.innerHTML = `
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:.5rem">${data.length} resultado(s)</div>
      ${data.map(ex => {
        const local   = EDBAPI.toLocalExercise(ex);
        const already = existing.includes(local.name.toLowerCase());
        return `
          <div class="edb-result-card">
            <img class="edb-gif" src="${ex.gifUrl}" alt="${escapeHtml(local.name)}" loading="lazy">
            <div class="edb-info">
              <div class="edb-name">${escapeHtml(local.name)}</div>
              <div class="edb-meta">
                <span class="edb-tag">${ex.bodyPart}</span>
                <span class="edb-tag">${ex.target}</span>
                <span class="edb-tag">${ex.equipment}</span>
              </div>
              <button class="btn-primary" style="margin-top:.4rem;padding:.3rem .8rem;font-size:.8rem"
                      ${already ? 'disabled style="opacity:.4;cursor:default"' : ''}
                      onclick="addFromEDB(${JSON.stringify(local).replace(/"/g,'&quot;')})">
                ${already ? '✓ Ya existe' : '+ Agregar'}
              </button>
            </div>
          </div>`;
      }).join('')}`;
  } catch(e) {
    results.innerHTML = `<p class="empty-msg" style="color:var(--danger);text-align:center;padding:1rem">Error: ${e.message}</p>`;
  }
}

function addFromEDB(ex) {
  DB.saveExercise(ex);
  showToast(`"${ex.name}" agregado`);
  renderExercisesList();
  // Re-run search to update "ya existe" state
  runEDBSearch();
}
