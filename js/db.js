const DB = (() => {
  const KEY = 'gymTrackerPro_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : defaults();
    } catch(e) { return defaults(); }
  }

  function persist(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function defaults() {
    return {
      workoutTypes: [
        { id: 'wt_torsoA', name: 'Torso A', color: '#FF6B35', exerciseIds: ['ex_1','ex_2','ex_3','ex_5','ex_9'] },
        { id: 'wt_torsoB', name: 'Torso B', color: '#FF9F1C', exerciseIds: ['ex_1','ex_6','ex_7','ex_8','ex_18'] },
        { id: 'wt_piernaA', name: 'Pierna A', color: '#2EC4B6', exerciseIds: ['ex_10','ex_11','ex_12','ex_13','ex_16'] },
        { id: 'wt_piernaB', name: 'Pierna B', color: '#9B5DE5', exerciseIds: ['ex_10','ex_14','ex_15','ex_16','ex_17'] },
      ],
      exercises: [
        { id: 'ex_1',  name: 'Press Banca',              muscleGroup: 'Pecho' },
        { id: 'ex_2',  name: 'Press Inclinado',           muscleGroup: 'Pecho' },
        { id: 'ex_3',  name: 'Aperturas Cable',           muscleGroup: 'Pecho' },
        { id: 'ex_4',  name: 'Fondos',                    muscleGroup: 'Pecho' },
        { id: 'ex_5',  name: 'Press Militar',             muscleGroup: 'Hombros' },
        { id: 'ex_6',  name: 'Dominadas',                 muscleGroup: 'Espalda' },
        { id: 'ex_7',  name: 'Remo con Barra',            muscleGroup: 'Espalda' },
        { id: 'ex_8',  name: 'Curl Bíceps Barra',         muscleGroup: 'Bíceps' },
        { id: 'ex_9',  name: 'Extensiones Tríceps',       muscleGroup: 'Tríceps' },
        { id: 'ex_10', name: 'Sentadilla',                muscleGroup: 'Cuádriceps' },
        { id: 'ex_11', name: 'Prensa de Pierna',          muscleGroup: 'Cuádriceps' },
        { id: 'ex_12', name: 'Extensión Cuádriceps',      muscleGroup: 'Cuádriceps' },
        { id: 'ex_13', name: 'Curl Femoral',              muscleGroup: 'Isquiotibiales' },
        { id: 'ex_14', name: 'Peso Muerto Rumano',        muscleGroup: 'Isquiotibiales' },
        { id: 'ex_15', name: 'Hip Thrust',                muscleGroup: 'Glúteos' },
        { id: 'ex_16', name: 'Gemelos de Pie',            muscleGroup: 'Pantorrillas' },
        { id: 'ex_17', name: 'Elevaciones Laterales',     muscleGroup: 'Hombros' },
        { id: 'ex_18', name: 'Face Pull',                 muscleGroup: 'Hombros' },
      ],
      logs: []
    };
  }

  return {
    uid,

    getWorkoutTypes: () => load().workoutTypes,
    getWorkoutType: (id) => load().workoutTypes.find(w => w.id === id) || null,

    saveWorkoutType(wt) {
      const data = load();
      if (!wt.id) wt.id = uid();
      const idx = data.workoutTypes.findIndex(w => w.id === wt.id);
      if (idx >= 0) data.workoutTypes[idx] = wt; else data.workoutTypes.push(wt);
      persist(data); return wt;
    },

    deleteWorkoutType(id) {
      const data = load();
      data.workoutTypes = data.workoutTypes.filter(w => w.id !== id);
      persist(data);
    },

    getExercises: () => load().exercises,
    getExercise: (id) => load().exercises.find(e => e.id === id) || null,

    saveExercise(ex) {
      const data = load();
      if (!ex.id) ex.id = uid();
      const idx = data.exercises.findIndex(e => e.id === ex.id);
      if (idx >= 0) data.exercises[idx] = ex; else data.exercises.push(ex);
      persist(data); return ex;
    },

    deleteExercise(id) {
      const data = load();
      data.exercises = data.exercises.filter(e => e.id !== id);
      data.workoutTypes.forEach(wt => { wt.exerciseIds = wt.exerciseIds.filter(eid => eid !== id); });
      persist(data);
    },

    getLogs: () => load().logs.sort((a, b) => b.date.localeCompare(a.date)),
    getLogByDate: (date) => load().logs.find(l => l.date === date) || null,

    saveLog(log) {
      const data = load();
      if (!log.id) log.id = uid();
      const idx = data.logs.findIndex(l => l.id === log.id);
      if (idx >= 0) data.logs[idx] = log; else data.logs.push(log);
      persist(data); return log;
    },

    deleteLog(id) {
      const data = load();
      data.logs = data.logs.filter(l => l.id !== id);
      persist(data);
    },

    getExerciseHistory(exerciseId) {
      return load().logs
        .filter(log => log.exercises.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(log => {
          const exEntry = log.exercises.find(e => e.exerciseId === exerciseId);
          const sets = exEntry ? exEntry.sets : [];
          const maxWeight = sets.length ? Math.max(...sets.map(s => parseFloat(s.weight) || 0)) : 0;
          const totalVolume = sets.reduce((sum, s) => sum + (parseFloat(s.weight)||0) * (parseInt(s.reps)||0), 0);
          const best1RM = sets.reduce((best, s) => {
            if (s.reps && s.weight) {
              const rm = parseFloat(s.weight) * (1 + parseInt(s.reps) / 30);
              return rm > best ? rm : best;
            }
            return best;
          }, 0);
          return { date: log.date, maxWeight, totalVolume, best1RM: Math.round(best1RM * 10) / 10, sets };
        });
    },

    getPRs() {
      const exercises = this.getExercises();
      const result = [];
      for (const ex of exercises) {
        const history = this.getExerciseHistory(ex.id);
        if (!history.length) continue;
        let bestWeight = { value: 0, date: '' };
        let bestVolume = { value: 0, date: '' };
        let best1RM    = { value: 0, date: '' };
        for (const h of history) {
          if (h.maxWeight   > bestWeight.value) bestWeight = { value: h.maxWeight,   date: h.date };
          if (h.totalVolume > bestVolume.value) bestVolume = { value: h.totalVolume, date: h.date };
          if (h.best1RM     > best1RM.value)    best1RM    = { value: h.best1RM,     date: h.date };
        }
        result.push({ exercise: ex, bestWeight, bestVolume, best1RM, sessions: history.length });
      }
      return result.filter(r => r.bestWeight.value > 0);
    },

    getStats() {
      const logs = load().logs;
      const now  = new Date();
      const sow  = new Date(now); sow.setDate(now.getDate() - now.getDay());
      const som  = new Date(now.getFullYear(), now.getMonth(), 1);
      const vol  = arr => arr.reduce((t, log) =>
        t + log.exercises.reduce((t2, ex) =>
          t2 + ex.sets.reduce((s, set) => s + (parseFloat(set.weight)||0)*(parseInt(set.reps)||0), 0), 0), 0);
      const wk = logs.filter(l => new Date(l.date) >= sow);
      const mo = logs.filter(l => new Date(l.date) >= som);
      return {
        total: logs.length,
        weekCount: wk.length,
        monthCount: mo.length,
        weekVolume: Math.round(vol(wk)),
        monthVolume: Math.round(vol(mo)),
      };
    }
  };
})();
