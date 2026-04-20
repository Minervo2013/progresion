// ─── Calendar ─────────────────────────────────────────────────────────────────
let calYear, calMonth;

function renderCalendar() {
  const now = new Date();
  if (calYear === undefined) { calYear = now.getFullYear(); calMonth = now.getMonth(); }

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('calendar-month').textContent = `${monthNames[calMonth]} ${calYear}`;

  const logs    = DB.getLogs();
  const logMap  = {};
  logs.forEach(l => { logMap[l.date] = l; });

  const first   = new Date(calYear, calMonth, 1).getDay();
  const days    = new Date(calYear, calMonth + 1, 0).getDate();
  const today   = todayStr();

  const grid = document.getElementById('calendar-grid');
  const dayLabels = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  let html = dayLabels.map(d => `<div class="cal-header">${d}</div>`).join('');

  for (let i = 0; i < first; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= days; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const log = logMap[dateStr];
    const wt  = log ? DB.getWorkoutType(log.workoutTypeId) : null;
    const isToday = dateStr === today;
    const isFuture = dateStr > today;

    html += `
      <div class="cal-day ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${log ? 'has-log' : ''}"
           onclick="${isFuture ? '' : `showView('log',{date:'${dateStr}'})`}"
           style="${wt ? `--wt-color:${wt.color}` : ''}">
        <span class="cal-num">${d}</span>
        ${wt ? `<span class="cal-dot" style="background:${wt.color}"></span>` : ''}
        ${log ? `<span class="cal-label" style="color:${wt ? wt.color : '#aaa'}">${wt ? wt.name : ''}</span>` : ''}
      </div>`;
  }

  grid.innerHTML = html;

  document.getElementById('prev-month').onclick = () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  };
  document.getElementById('next-month').onclick = () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  };
}
