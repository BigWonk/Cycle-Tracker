(function () {
  const API = '/api';
  const state = {
    token: localStorage.getItem('bloom_token') || null,
    user: null,
    entries: {},
    stats: {},
    companions: [],
    following: [],
    authMode: 'login', // 'login' | 'register'
    authError: '',
    view: 'home',
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    loaded: false
  };

  const SYMPTOM_OPTS = ['Cramps','Headache','Bloating','Fatigue','Mood swings','Tender breasts','Acne','Backache','Nausea','Cravings'];

  const TIPS = {
    menstrual: [
      {ico:'💤', t:'Sleeping', s:'Vuzmojno e da se namali serotonina v mozuka, koito kontrolira nastroenieto i spaneto(tuiche ne e dobra ideq da sedish do 3 vecherta).'},
      {ico:'🚶‍♀️', t:'No natovarvane', s:'Ne e mnogo hubavo da se natovarvash vuv fitnesa zaradi hormonite(tuiche ne probvai 40 kila na lejanka pls).'},
      {ico:'🥬', t:'Jelqzo-rich foods', s:'Qj neshta s poveche jelqzo(spanak, pileshko, riba ton i drugi), zashtoto gubish mnogo kruv.'},
      {ico:'😰', t:'Hormoni', s:'Estrogena i progesterona sa super niski v momenta, koeto te kara da si malko... cranky.'}
    ],
    follicular: [
      {ico:'🏃‍♀️', t:'Good time da trenirash', s:'Uvelichila ti se e mnogo energiqta tuiche probvai da ne skipvash uprajneniq vuv fitnesa.'},
      {ico:'🧠', t:'Sharper mozuk', s:'Estrogena ti e visok, tuiche mojesh da se fokusirash mnogo po-dobre(i da ne me pitash kakvo shte nosish za fitnes).'},
      {ico:'🥗', t:'Foody', s:'Qj kvoto te kefi i si nabavqi malko poveche protein(trqbda da hitvash golla).'},
      {ico:'🎸', t:'Start neshto da pravish', s:'Motivaciqta ti e dosta visoka, tuiche mojesh da nauchish neshto na kitarata(znam che ppc ne q pipash).'}
    ],
    ovulation: [
      {ico:'✨', t:'Peak energy', s:'Okay VECHE moje da probvash da izbutash 40 ot lejankata(believe in urself abebq).'},
      {ico:'💧', t:'Stay hydrated', s:'Shte ti se pie baq voda zatova si q nabavqi(i ne pii mnogo redbulli).'},
      {ico:'🗣️', t:'Samochustvieto is high', s:'A good time da mi kazvash che sum laino po 30 puti na den.'},
      {ico:'🕷️', t:'Super sili', s:'Zaradi uvelichenieto v testosterona i estrogena mojesh da poluchish sharper senses(omg spidey sense).'}
    ],
    luteal: [
      {ico:'🍫', t:'Balance cravings', s:'Sega shte ti se qde baq sladko tuiche probvai da qdesh nqkvi neshta s magnesii(primerno dark chocolate).'},
      {ico:'🛁', t:'Po-rano lqgai', s:'PMS symptomite se podobrqvat ako si lqgash rano(tuiche ne doom scrolvai).'},
      {ico:'🌯', t:'Calorie burn', s:'Zaradi hormonite ti, v momenta gubish po okolo 250-350 bonus calorii(zatova iskash da pravish hapvanki).'},
      {ico:'🕯️', t:'Chillaxxx', s:'Energiqta ti stava vse po-zle i po-zle, tuiche ne se natovarvai tolkova.'}
    ]
  };

  function todayStr(){ return fmt(new Date()); }
  function fmt(d){
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function parseDate(s){ const [y,m,dd]=s.split('-').map(Number); return new Date(y,m-1,dd); }
  function addDays(dateStr,n){ const d=parseDate(dateStr); d.setDate(d.getDate()+n); return fmt(d); }
  function niceDate(s){ return s ? parseDate(s).toLocaleDateString(undefined,{month:'short',day:'numeric'}) : ''; }
  function niceDateLong(s){ return s ? parseDate(s).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}): ''; }
  function phaseName(p){ return {menstrual:'Menstrual phase', follicular:'Follicular phase', ovulation:'Ovulation window', luteal:'Luteal phase'}[p] || 'Getting to know your cycle'; }

  // ---------------- API helper ----------------
  async function api(path, opts = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
    const res = await fetch(API + path, Object.assign({}, opts, { headers }));
    let body = null;
    try { body = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      const err = new Error((body && body.error) || 'Request failed');
      err.status = res.status;
      throw err;
    }
    return body;
  }

  function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('bloom_token');
    render();
  }

  // ---------------- data loading ----------------
  async function loadAll() {
    if (!state.token) { state.loaded = true; render(); return; }
    try {
      const me = await api('/auth/me');
      state.user = me.user;
      const [entriesRes, statsRes, companionsRes, followingRes] = await Promise.all([
        api('/entries'),
        api('/entries/meta/predictions'),
        api('/profile/companions'),
        api('/circle')
      ]);
      state.entries = entriesRes.entries;
      state.stats = statsRes.stats;
      state.companions = companionsRes.companions;
      state.following = followingRes.following;
    } catch (e) {
      if (e.status === 401) logout();
    }
    state.loaded = true;
    render();
  }

  async function refreshStatsAndCircle() {
    const [statsRes, followingRes] = await Promise.all([
      api('/entries/meta/predictions'),
      api('/circle')
    ]);
    state.stats = statsRes.stats;
    state.following = followingRes.following;
  }

  // ---------------- render root ----------------
  function render() {
    const app = document.getElementById('app');
    if (!state.loaded) { app.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#c96f95;font-family:'Fraunces',serif;">✿ loading bloom…</div>`; return; }
    if (!state.token || !state.user) { app.innerHTML = authHtml(); attachAuth(); return; }
    app.innerHTML = shellHtml();
    attachShell();
  }

  function logoSvg(size = 50) {
    return `<img src="./CatImages/IMG_20260824_225813_670.jpg" alt="Bloom logo" width="${size}" height="${size}" style="display:block; border-radius:50%; object-fit:cover; margin-left:10px;" />`;
  }

  function flowerSvg(phase) {
    const addresses = { menstrual: './CatImages/IMG_20260824_225753_594.jpg', follicular: './CatImages/IMG_20260824_225757_712.jpg', ovulation: './CatImages/IMG_20260824_225800_214.jpg', luteal: './CatImages/IMG_20260824_225755_627.jpg' };
    const c = addresses[phase] || '#e5a3bd';
    const petals = phase === 'menstrual' ? 3 : phase === 'follicular' ? 5 : phase === 'ovulation' ? 7 : 5;
    let petalEls = '';
    for (let i = 0; i < petals; i++) {
      const angle = (360 / petals) * i;
      petalEls += `<ellipse cx="90" cy="55" rx="16" ry="30" fill="${c}" opacity="0.88" transform="rotate(${angle} 90 90)"/>`;
    }
    if(!phase) return `<svg viewBox="0 0 180 180" width="180" height="180"><circle cx="90" cy="90" r="80" fill="#e5a3bd" opacity="0.88"/></svg>`;
    return `<img src="${addresses[phase]}" alt="${phase}" width="${180}" height="${180}" style="display:block; border-radius:50%; object-fit:cover;" />`;
  }

  // ---------------- auth screens ----------------
  function authHtml() {
    const isLogin = state.authMode === 'login';
    return `
    <div class="topbar" style="justify-content:center;">
      <div class="brand">${logoSvg()}<span class="brand-name">Ellie's super cool cycle tracker</span></div>
    </div>
    <div class="setup-shell">
      
      <img src = "./CatImages/IMG_20260824_225804_186.jpg" height="100" width="100"></img>
      <h1 style="font-size:1.5rem;margin-top:10px;">${isLogin ? 'Zdrasti ne pak, a otnovo' : 'Suzdai si account'}</h1>
      <p class="muted" style="margin:8px 0 20px 0;">${isLogin ? 'Logni se za da si vidish cikula duhh' : 'Naj-qkoto mqsto da si trackvash cikula'}</p>
      ${state.authError ? `<div class="error-msg">${state.authError}</div>` : ''}
      ${!isLogin ? `<div class="field"><label>Name</label><input id="a-name" type="text" placeholder="Your name(Ellie)" /></div>` : ''}
      <div class="field"><label>Email</label><input id="a-email" type="email" placeholder="abebq@example.com" /></div>
      <div class="field"><label>Password</label><input id="a-password" type="password" placeholder="Minimum 8 simvola" /></div>
      ${!isLogin ? `
      <div class="row-2">
        <div class="field"><label>Typical cycle length</label><input id="a-cycle" type="number" min="18" max="60" value="28" /></div>
        <div class="field"><label>Typical period length</label><input id="a-period" type="number" min="1" max="14" value="5" /></div>
      </div>
      <div class="field"><label>First day of last period</label><input id="a-last" type="date" /></div>
      ` : ''}
      <button class="btn btn-primary" id="a-submit">${isLogin ? 'Log in' : 'Create account'}</button>
      <div class="switch-line">
        ${isLogin ? `New here? <button id="a-switch">Create an account</button>` : `Already have an account? <button id="a-switch">Log in</button>`}
      </div>
    </div>`;
  }

  function attachAuth() {
    document.getElementById('a-switch').onclick = () => {
      state.authMode = state.authMode === 'login' ? 'register' : 'login';
      state.authError = '';
      render();
    };
    document.getElementById('a-submit').onclick = async () => {
      const email = document.getElementById('a-email').value.trim();
      const password = document.getElementById('a-password').value;
      const btn = document.getElementById('a-submit');
      btn.disabled = true;
      state.authError = '';
      try {
        let result;
        if (state.authMode === 'login') {
          result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        } else {
          const name = document.getElementById('a-name').value.trim();
          const avgCycleLength = document.getElementById('a-cycle').value;
          const avgPeriodLength = document.getElementById('a-period').value;
          const lastPeriodStart = document.getElementById('a-last').value || null;
          result = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, avgCycleLength, avgPeriodLength, lastPeriodStart }) });
        }
        state.token = result.token;
        state.user = result.user;
        localStorage.setItem('bloom_token', state.token);
        await loadAll();
      } catch (e) {
        state.authError = e.message || 'Something went wrong.';
        render();
      } finally {
        btn.disabled = false;
      }
    };
  }

  // ---------------- main shell ----------------
  function shellHtml() {
    const initials = (state.user.name || '?').slice(0, 1).toUpperCase();
    return `
    <div class="topbar">
      <div class="brand">${logoSvg()}<span class="brand-name">Ellie's super cool cycle tracker</span></div>
      <div class="profile-chip" id="logout-chip"><span class="avatar">${initials}</span>${state.user.name} · Log out</div>
    </div>
    <div class="main">
      <div class="tabbar">
        <button data-tab="home" class="${state.view === 'home' ? 'active' : ''}">Today</button>
        <button data-tab="calendar" class="${state.view === 'calendar' ? 'active' : ''}">Calendar</button>
        <button data-tab="insights" class="${state.view === 'insights' ? 'active' : ''}">Insights</button>
      </div>
      <div id="tab-content">${tabContent()}</div>
    </div>`;
  }

  function tabContent() {
    if (state.view === 'home') return homeHtml();
    if (state.view === 'calendar') return calendarHtml();
    if (state.view === 'insights') return insightsHtml();
    return '';
  }

  function homeHtml() {
    const stats = state.stats || {};
    const tips = TIPS[stats.phase] || TIPS.follicular;
    const dayEntry = state.entries[todayStr()] || { flow: null, symptoms: [], note: '' };
    return `
    <div class="grid-2">
      <div>
        <div class="card flower-card">
          <div class="flower-stage">${flowerSvg(stats.dayInCycle ? stats.phase : null)}</div>
          <div class="phase-label">${stats.dayInCycle ? phaseName(stats.phase) : 'Log your last period to begin'}</div>
          ${stats.dayInCycle ? `<div class="phase-day">Day ${stats.dayInCycle} of your cycle</div>` : ''}
          ${stats.dayInCycle ? `<span class="phase-tag">${stats.phase}</span>` : ''}
          ${stats.predictedNext ? `<div class="predict-line">Next period predicted<br/><b>${niceDateLong(stats.predictedNext)}</b></div>` : ''}
        </div>
        <div class="card section-gap">
          <div class="eyebrow">Today · ${niceDateLong(todayStr())}</div>
          <h3 style="margin-top:6px;">Log today</h3>
          <div class="muted" style="margin-top:4px;">Flow</div>
          <div class="flow-row" id="flow-row">
            ${['none','light','gore-dolu','dying'].map(f => `<div class="flow-opt ${(dayEntry.flow||'none')===f?'on':''}" data-flow="${f}">${f[0].toUpperCase()+f.slice(1)}</div>`).join('')}
          </div>
          <div class="muted" style="margin-top:14px;">Symptoms</div>
          <div class="chip-group" id="symptom-chips">
            ${SYMPTOM_OPTS.map(s => `<div class="chip ${dayEntry.symptoms && dayEntry.symptoms.includes(s) ? 'on' : ''}" data-symptom="${s}">${s}</div>`).join('')}
          </div>
          <div class="muted" style="margin-top:14px;">Notes</div>
          <textarea id="note-box" placeholder="How are you feeling today?">${dayEntry.note || ''}</textarea>
          <button class="btn btn-primary" id="save-today" style="margin-top:14px;">Save today's entry</button>
        </div>
      </div>
      <div class="card">
        <div class="eyebrow">Suggested for you</div>
        <h3 style="margin-top:6px;">${phaseName(stats.dayInCycle ? stats.phase : 'follicular')}</h3>
        ${tips.map(t => `<div class="tip-item"><div class="tip-ico">${t.ico}</div><div><b>${t.t}</b><span>${t.s}</span></div></div>`).join('')}
      </div>
    </div>`;
  }

  function calendarHtml() {
    const stats = state.stats || {};
    const y = state.calYear, m = state.calMonth;
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    let cells = '';
    ['S','M','T','W','T','F','S'].forEach(d => cells += `<div class="cal-dow">${d}</div>`);
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-day empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = fmt(new Date(y, m, day));
      const entry = state.entries[ds];
      let cls = 'cal-day';
      if (ds === todayStr()) cls += ' today';
      if (entry && entry.flow) cls += ' period';
      if (stats.predictedNext && ds >= stats.predictedNext && ds < addDays(stats.predictedNext, stats.avgPeriod || 5)) cls += ' predicted';
      if (stats.fertileStart && ds >= stats.fertileStart && ds <= stats.fertileEnd) cls += ' fertile';
      cells += `<div class="${cls}" data-date="${ds}">${day}${entry && entry.symptoms && entry.symptoms.length ? '<div class="dot"></div>' : ''}</div>`;
    }
    return `
    <div class="card">
      <div class="cal-head">
        <h3>${monthLabel}</h3>
        <div class="cal-nav"><div class="icon-btn" id="cal-prev">‹</div><div class="icon-btn" id="cal-next">›</div></div>
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="legend">
        <span><span class="swatch" style="background:linear-gradient(135deg,var(--rose),var(--rose-deep));"></span>Logged period</span>
        <span><span class="swatch" style="background:var(--blush);border:1px dashed var(--rose);"></span>Predicted period</span>
        <span><span class="swatch" style="border:2px solid var(--sage);"></span>Fertile window</span>
      </div>
      <p class="muted" style="margin-top:10px;">Tap any day to log flow, symptoms, and notes for that date.</p>
    </div>`;
  }

  function insightsHtml() {
    const stats = state.stats || {};
    const starts = stats.starts || [];
    const cycles = [];
    for (let i = 1; i < starts.length; i++) {
      cycles.push({ from: starts[i - 1], to: starts[i], len: Math.round((parseDate(starts[i]) - parseDate(starts[i - 1])) / 86400000) });
    }
    return `
    <div class="grid-2">
      <div class="card">
        <div class="eyebrow">Cycle overview</div>
        <h3 style="margin-top:6px;">Your patterns</h3>
        <div style="display:flex;gap:18px;margin-top:16px;">
          <div><div style="font-family:'Fraunces',serif;font-size:1.7rem;color:var(--rose-deep);">${stats.avgCycle ?? '—'}</div><div class="muted">avg cycle days</div></div>
          <div><div style="font-family:'Fraunces',serif;font-size:1.7rem;color:var(--rose-deep);">${stats.avgPeriod ?? '—'}</div><div class="muted">avg period days</div></div>
          <div><div style="font-family:'Fraunces',serif;font-size:1.7rem;color:var(--rose-deep);">${starts.length}</div><div class="muted">periods logged</div></div>
        </div>
        ${stats.predictedNext ? `<div class="predict-line">Predicted ovulation<br/><b>${niceDate(stats.ovulationDate)}</b></div>` : ''}
      </div>
      <div class="card">
        <div class="eyebrow">History</div>
        <h3 style="margin-top:6px;">Recent cycles</h3>
        ${cycles.length ? cycles.slice(-5).reverse().map(c => `<div class="tip-item"><div class="tip-ico">📅</div><div><b>${niceDate(c.from)} → ${niceDate(c.to)}</b><span>${c.len} day cycle</span></div></div>`).join('') : `<div class="empty-state">Log at least two periods to see cycle history here.</div>`}
      </div>
    </div>`;
  }

  function circleHtml() {
    const code = state.user.circleCode;
    return `
    <div class="grid-2">
      <div class="card">
        <div class="eyebrow">Your circle</div>
        <h3 style="margin-top:6px;">Partners & children</h3>
        <p class="muted" style="margin-top:6px;">Keep a personal note of who you're tracking alongside — this list is just for you.</p>
        <div id="people-list">
          ${state.companions.length ? state.companions.map((p, idx) => `
            <div class="person-row">
              <div class="person-avatar">${p.name.slice(0,1).toUpperCase()}</div>
              <div class="person-meta" style="flex:1;"><b>${p.name}</b><span>${p.relation}</span></div>
              <button class="btn btn-ghost btn-sm" data-remove="${idx}">Remove</button>
            </div>`).join('') : `<div class="empty-state">No one added yet.</div>`}
        </div>
        <div class="section-gap">
          <div class="row-2">
            <div class="field"><label>Name</label><input id="p-name" placeholder="e.g. Alex" /></div>
            <div class="field"><label>Relation</label><input id="p-relation" placeholder="Partner / Child / Friend" /></div>
          </div>
          <button class="btn btn-soft" id="p-add">Add person</button>
        </div>
      </div>
      <div class="card">
        <div class="eyebrow">Share your overview</div>
        <h3 style="margin-top:6px;">Your invite code</h3>
        <p class="muted" style="margin-top:6px;">Share this code so a partner can follow your current phase and predicted dates from their own bloom account. It never reveals symptoms or notes.</p>
        <div class="code-box"><div class="code">${code}</div></div>
        <div class="section-gap" style="border-top:1px solid var(--line);padding-top:16px;">
          <h3>Follow someone else</h3>
          <p class="muted" style="margin-top:6px;">Enter a code someone shared with you to see their current phase.</p>
          <div class="row-2">
            <div class="field" style="flex:2;"><input id="join-code" placeholder="ABC123" /></div>
            <button class="btn btn-soft" id="join-btn" style="flex:1;">Follow</button>
          </div>
          <div id="joined-list">
            ${state.following.length ? state.following.map(f => `
              <div class="person-row">
                <div class="person-avatar">${(f.name || '?').slice(0,1).toUpperCase()}</div>
                <div class="person-meta"><b>${f.name}</b><span>${f.phase ? phaseName(f.phase) + ' · day ' + f.dayInCycle : 'No data yet'}${f.predictedNext ? ' · next period ' + niceDate(f.predictedNext) : ''}</span></div>
              </div>`).join('') : `<div class="empty-state">Not following anyone yet.</div>`}
          </div>
        </div>
      </div>
    </div>`;
  }

  // ---------------- interactions ----------------
  function attachShell() {
    document.getElementById('logout-chip').onclick = logout;
    document.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { state.view = b.dataset.tab; render(); }; });
    if (state.view === 'home') attachHome();
    if (state.view === 'calendar') attachCalendar();
    if (state.view === 'circle') attachCircle();
  }

  function attachHome() {
    const today = todayStr();
    let chosenFlow = (state.entries[today] || {}).flow || 'none';
    const chosenSymptoms = new Set((state.entries[today] || {}).symptoms || []);
    document.querySelectorAll('#flow-row .flow-opt').forEach(el => {
      el.onclick = () => {
        chosenFlow = el.dataset.flow;
        document.querySelectorAll('#flow-row .flow-opt').forEach(x => x.classList.remove('on'));
        el.classList.add('on');
      };
    });
    document.querySelectorAll('#symptom-chips .chip').forEach(el => {
      el.onclick = () => {
        const s = el.dataset.symptom;
        if (chosenSymptoms.has(s)) { chosenSymptoms.delete(s); el.classList.remove('on'); }
        else { chosenSymptoms.add(s); el.classList.add('on'); }
      };
    });
    document.getElementById('save-today').onclick = async () => {
      const note = document.getElementById('note-box').value;
      const btn = document.getElementById('save-today');
      btn.disabled = true;
      try {
        await api('/entries/' + today, {
          method: 'PUT',
          body: JSON.stringify({ flow: chosenFlow === 'none' ? null : chosenFlow, symptoms: Array.from(chosenSymptoms), note })
        });
        state.entries[today] = { flow: chosenFlow === 'none' ? null : chosenFlow, symptoms: Array.from(chosenSymptoms), note };
        await refreshStatsAndCircle();
        render();
      } finally {
        btn.disabled = false;
      }
    };
  }

  function attachCalendar() {
    document.getElementById('cal-prev').onclick = () => { state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; } render(); };
    document.getElementById('cal-next').onclick = () => { state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; } render(); };
    document.querySelectorAll('.cal-day[data-date]').forEach(el => { el.onclick = () => openDayEditor(el.dataset.date); });
  }

  function openDayEditor(dateStr) {
    const entry = state.entries[dateStr] || { flow: null, symptoms: [], note: '' };
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="card modal-card">
        <div class="eyebrow">Edit day</div>
        <h3 style="margin-top:4px;">${niceDateLong(dateStr)}</h3>
        <div class="muted" style="margin-top:12px;">Flow</div>
        <div class="flow-row" id="ed-flow">${['none','light','gore-dolu','dying'].map(f => `<div class="flow-opt ${(entry.flow||'none')===f?'on':''}" data-flow="${f}">${f[0].toUpperCase()+f.slice(1)}</div>`).join('')}</div>
        <div class="muted" style="margin-top:14px;">Symptoms</div>
        <div class="chip-group" id="ed-symptoms">${SYMPTOM_OPTS.map(s => `<div class="chip ${entry.symptoms && entry.symptoms.includes(s) ? 'on' : ''}" data-symptom="${s}">${s}</div>`).join('')}</div>
        <div class="muted" style="margin-top:14px;">Notes</div>
        <textarea id="ed-note">${entry.note || ''}</textarea>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button class="btn btn-ghost" id="ed-cancel" style="flex:1;">Cancel</button>
          <button class="btn btn-primary" id="ed-save" style="flex:1;">Save</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    let ef = entry.flow || 'none';
    const es = new Set(entry.symptoms || []);
    overlay.querySelectorAll('#ed-flow .flow-opt').forEach(el => { el.onclick = () => { ef = el.dataset.flow; overlay.querySelectorAll('#ed-flow .flow-opt').forEach(x => x.classList.remove('on')); el.classList.add('on'); }; });
    overlay.querySelectorAll('#ed-symptoms .chip').forEach(el => { el.onclick = () => { const s = el.dataset.symptom; if (es.has(s)) { es.delete(s); el.classList.remove('on'); } else { es.add(s); el.classList.add('on'); } }; });
    overlay.querySelector('#ed-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#ed-save').onclick = async () => {
      const note = overlay.querySelector('#ed-note').value;
      await api('/entries/' + dateStr, { method: 'PUT', body: JSON.stringify({ flow: ef === 'none' ? null : ef, symptoms: Array.from(es), note }) });
      state.entries[dateStr] = { flow: ef === 'none' ? null : ef, symptoms: Array.from(es), note };
      await refreshStatsAndCircle();
      overlay.remove();
      render();
    };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  function attachCircle() {
    document.getElementById('p-add').onclick = async () => {
      const name = document.getElementById('p-name').value.trim();
      const relation = document.getElementById('p-relation').value.trim() || 'Companion';
      if (!name) return;
      const res = await api('/profile/companions', { method: 'POST', body: JSON.stringify({ name, relation }) });
      state.companions = res.companions;
      render();
    };
    document.querySelectorAll('[data-remove]').forEach(b => {
      b.onclick = async () => {
        const res = await api('/profile/companions/' + b.dataset.remove, { method: 'DELETE' });
        state.companions = res.companions;
        render();
      };
    });
    document.getElementById('join-btn').onclick = async () => {
      const code = document.getElementById('join-code').value.trim();
      if (!code) return;
      try {
        await api('/circle/follow', { method: 'POST', body: JSON.stringify({ code }) });
        const followingRes = await api('/circle');
        state.following = followingRes.following;
        render();
      } catch (e) {
        alert(e.message);
      }
    };
  }

  loadAll();
})();
