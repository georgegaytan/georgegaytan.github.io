(function (global) {
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs, ...children) => {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'style' && typeof attrs[k] === 'object') Object.assign(n.style, attrs[k]);
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n[k.toLowerCase()] = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  };

  let bannerDismissed = false; // session-only; reset on full page reload

  // Daily cap on how many brand-new cards a deck introduces per day. Keeps new
  // material from piling up faster than spaced repetition can consolidate it.
  const NEW_CARD_LIMIT = 15;

  function today() { return new Date().toISOString().slice(0, 10); }
  function nowIso() { return new Date().toISOString(); }

  function loadOrInitDeckState(deckId, deckDef) {
    let s = Storage.loadDeck(deckId);
    if (!s) {
      s = { deckId, version: 1, items: {}, sessionMeta: { todayCount: 0, newToday: 0, todayDate: today(), firstTryCorrectToday: 0 } };
    }
    for (const item of deckDef.items) {
      if (!s.items[item.id]) {
        s.items[item.id] = { box: 0, ease: 2.5, interval: 0, due: null, lapses: 0, lastSeen: null, seenCount: 0 };
      }
    }
    if (s.sessionMeta.todayDate !== today()) {
      s.sessionMeta = { todayCount: 0, newToday: 0, todayDate: today(), firstTryCorrectToday: 0 };
    }
    return s;
  }

  function topicsOf(itemDef) {
    if (itemDef.kind === 'cloze' && Array.isArray(itemDef.blanks)) {
      const set = new Set();
      for (const b of itemDef.blanks) if (b.topic) set.add(b.topic);
      return Array.from(set);
    }
    return itemDef.topic ? [itemDef.topic] : [];
  }

  function hydratedStateView(state, deckDef) {
    const items = {};
    for (const def of deckDef.items) {
      const s = state.items[def.id] || {};
      items[def.id] = Object.assign({}, s, { topics: topicsOf(def) });
    }
    return { items };
  }

  function getProgress(deckId) {
    const s = Storage.loadDeck(deckId);
    if (!s || !s.items) return null;
    const ids = Object.keys(s.items);
    if (ids.length === 0) return null;
    const mastered = ids.filter(id => s.items[id].box >= 4).length;
    return { pct: Math.round(mastered / ids.length * 100), label: `${mastered}/${ids.length} mastered` };
  }

  // ----- Menu -----
  function renderMenu() {
    const root = $('#root');
    root.innerHTML = '';
    const menu = el('div', { class: 'menu', id: 'menuScreen' },
      el('div', { class: 'logo' }, 'deutsch'),
      el('div', { class: 'title' }, 'German Drills'),
      el('div', { class: 'subtitle' }, `${window.DECKS.length} deck${window.DECKS.length === 1 ? '' : 's'} · tap to start`)
    );
    // The extr@ section is a standalone flashcard app, not a drill deck. It
    // sits above the deck list behind its own divider so it doesn't read as
    // one of them.
    if (window.ExtraVocab) {
      const s = window.ExtraVocab.menuSummary();
      menu.appendChild(el('button', { class: 'extra-entry', type: 'button', onclick: openExtraVocab },
        el('span', { class: 'mark' }, 'extr@'),
        el('span', { class: 'body' },
          el('div', { class: 'name' }, 'extr@ Vocab'),
          el('div', { class: 'desc' }, `${s.total} cards · ${window.ExtraVocab.EPISODES.length} episodes · ${s.due} due`)
        ),
        el('span', { class: 'go' }, '→')
      ));
      menu.appendChild(el('div', { class: 'menu-divider' }, 'drills'));
    }
    const list = el('div', { class: 'deck-list' });
    for (const d of window.DECKS) {
      const prog = getProgress(d.id);
      const card = el('div', { class: 'deck-card', onclick: () => openDeck(d.id) });
      card.appendChild(el('div', { class: 'accent', style: { background: d.color } }));
      card.appendChild(el('span', { class: 'icon' }, d.icon));
      card.appendChild(el('div', { class: 'name' }, d.name));
      card.appendChild(el('div', { class: 'desc' }, d.description));
      if (prog) {
        const bar = el('div', { class: 'progress-bar' });
        bar.appendChild(el('div', { class: 'progress-fill', style: { width: prog.pct + '%', background: d.color } }));
        card.appendChild(bar);
        card.appendChild(el('div', { class: 'progress-label' }, prog.label));
      }
      list.appendChild(card);
    }
    menu.appendChild(list);
    if (Storage.isDegraded && Storage.isDegraded() && !bannerDismissed) {
      const banner = el('div', { class: 'storage-banner', id: 'storageBanner' });
      banner.appendChild(el('div', { class: 'body' },
        'Your browser couldn’t open persistent storage. Progress in this session may not survive a reload. Use Export below to back up.'
      ));
      banner.appendChild(el('button', {
        class: 'close',
        'aria-label': 'Dismiss',
        onclick: () => { bannerDismissed = true; const b = document.getElementById('storageBanner'); if (b) b.classList.add('hidden'); },
      }, '×'));
      menu.appendChild(banner);
    }
    const backup = el('div', { class: 'backup-row' },
      el('button', { class: 'backup-btn', onclick: exportProgress }, '↓ Export'),
      el('button', { class: 'backup-btn', onclick: importProgress }, '↑ Import')
    );
    const dailyBtn = el('button', { class: 'btn-primary', style: { marginTop: '20px', width: '100%', maxWidth: '440px' }, onclick: openDailyReview }, 'Daily Review (cross-deck)');
    menu.appendChild(dailyBtn);
    menu.appendChild(backup);
    const fileInput = el('input', { type: 'file', id: 'importFile', accept: '.json', style: { display: 'none' }, onchange: handleImport });
    menu.appendChild(fileInput);
    root.appendChild(menu);
  }

  function openExtraVocab() {
    // Progress lives under its own storage key; refresh the menu on the way
    // out so the "due" count reflects the session that just happened.
    window.ExtraVocab.open(renderMenu);
  }

  // ----- Daily Review (cross-deck) -----
  function dailyReviewQueue() {
    const t = today();
    const NEW_CAP = NEW_CARD_LIMIT; // cross-deck cap on freshly-introduced cards per daily review
    const overdueOrLow = [];
    const fresh = [];
    for (const deckDef of window.DECKS) {
      const state = Storage.loadDeck(deckDef.id);
      if (!state || !state.items) continue;
      for (const itemDef of deckDef.items) {
        const s = state.items[itemDef.id];
        if (!s) continue;
        const seenToday = s.lastSeen && String(s.lastSeen).slice(0, 10) === t;
        const entry = { deckId: deckDef.id, deckDef, itemDef, state: s, dueDate: s.due || '', topics: topicsOf(itemDef) };
        if (s.box > 0 && s.due && s.due <= t) {
          overdueOrLow.push(entry);            // genuinely due
        } else if (s.box > 0 && s.box < 4 && !seenToday) {
          overdueOrLow.push(entry);            // struggling, not yet seen today
        } else if (s.box === 0) {
          fresh.push(entry);                   // never introduced
        }
      }
    }
    // Due/struggling first (oldest due first), then a capped slice of new cards
    // in random order so the same new cards don't always lead.
    overdueOrLow.sort((a, b) => a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);
    const allDue = overdueOrLow.concat(EngineCore.shuffle(fresh).slice(0, NEW_CAP));

    const queue = [];
    const remaining = allDue.slice();
    let lastDeck = null;
    let lastTopics = new Set();
    while (queue.length < 30 && remaining.length > 0) {
      let pickIdx = remaining.findIndex(c =>
        c.deckId !== lastDeck &&
        !c.topics.some(t => lastTopics.has(t))
      );
      if (pickIdx === -1) pickIdx = 0;
      const pick = remaining.splice(pickIdx, 1)[0];
      queue.push(pick);
      lastDeck = pick.deckId;
      lastTopics = new Set(pick.topics);
    }
    return queue;
  }

  function openDailyReview() {
    const queue = dailyReviewQueue();
    if (queue.length === 0) {
      alert('No items due today. Come back tomorrow.');
      return;
    }
    DRILL = {
      mixed: true,
      queue,
      qIdx: 0,
      sessionCount: 0,
      sessionCap: queue.length,
      firstTryCorrect: 0,
      advanced: 0,
      lapsed: 0,
      attemptedThisItem: false,
      usedScaffolding: false,
      lastTopics: [],
      sessionSeen: [],
    };
    enterDrillView();
    renderDrillMixed();
  }

  function renderDrillMixed() {
    const root = $('#root');
    root.innerHTML = '';
    const top = el('div', { class: 'drill-top' },
      el('button', { class: 'drill-back', onclick: closeDrill }, '← Menu'),
      el('div', { class: 'drill-progress' }, `Daily Review · ${DRILL.sessionCount + 1} / ${DRILL.sessionCap}`)
    );
    const body = el('div', { class: 'drill-body', id: 'drillBody' });
    root.appendChild(el('div', { class: 'drill active' }, top, body));
    advanceMixed();
  }

  function advanceMixed() {
    if (DRILL.qIdx >= DRILL.queue.length) return endSession();
    setProgress(`Daily Review · ${Math.min(DRILL.sessionCount + 1, DRILL.sessionCap)} / ${DRILL.sessionCap}`);
    const entry = DRILL.queue[DRILL.qIdx];
    DRILL.deckId = entry.deckId;
    DRILL.deckDef = entry.deckDef;
    DRILL.state = Storage.loadDeck(entry.deckId);
    DRILL.usedScaffolding = false;
    DRILL.attemptedThisItem = false;
    renderItem(entry.itemDef);
  }

  function exportProgress() {
    const backup = Storage.exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `german-drills-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function importProgress() { $('#importFile').click(); }
  function handleImport(evt) {
    const f = evt.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!confirm('Replace current progress with backup?')) return;
        Storage.importAll(backup);
        renderMenu();
      } catch (ex) { alert('Could not parse backup file.'); }
      evt.target.value = '';
    };
    r.readAsText(f);
  }

  // ----- Drill -----
  let DRILL = null;

  // Bug fix: the progress counter used to be written once at session start and
  // never updated. Refresh it on every item.
  function setProgress(text) {
    const p = document.querySelector('.drill-progress');
    if (p) p.textContent = text;
  }

  // Estimate how many items a single-deck session can actually serve today, so
  // the "/ N" denominator reflects reality (overdue + low-box-not-seen-today +
  // new up to the daily cap) instead of always claiming 20.
  function actionableCount(state, deckDef, t, newToday, newCap) {
    const view = hydratedStateView(state, deckDef).items;
    let overdue = 0, lowBox = 0, fresh = 0;
    for (const id in view) {
      const it = view[id];
      const seenToday = it.lastSeen && String(it.lastSeen).slice(0, 10) === t;
      if (it.due && it.due <= t && it.box > 0) overdue++;
      else if (it.box > 0 && it.box < 4 && !seenToday) lowBox++;
      else if (it.box === 0) fresh++;
    }
    const newAllowed = Math.max(0, newCap - newToday);
    return overdue + lowBox + Math.min(fresh, newAllowed);
  }

  function enterDrillView() {
    document.body.classList.add('drill-open');
    if (typeof history !== 'undefined' && history.pushState) {
      // Push a sentinel state so the browser back button returns to the menu
      // instead of leaving the site. popstate handler below catches it.
      history.pushState({ drill: true }, '', '#drill');
    }
  }

  function exitDrillView() {
    document.body.classList.remove('drill-open');
    // If we still have the drill state in history, pop it so a subsequent
    // back press doesn't fire popstate again on an already-closed drill.
    if (typeof history !== 'undefined' && history.state && history.state.drill) {
      history.back();
    }
  }

  function openDeck(deckId) {
    const deckDef = window.DECKS.find(d => d.id === deckId);
    const state = loadOrInitDeckState(deckId, deckDef);
    const newToday = state.sessionMeta.newToday || 0;
    const newCap = NEW_CARD_LIMIT;
    const cap = Math.min(20, actionableCount(state, deckDef, today(), newToday, newCap));
    DRILL = {
      deckId,
      deckDef,
      state,
      sessionSeen: [],
      sessionCount: 0,
      sessionCap: Math.max(1, cap),
      newToday,
      newCap,
      lastTopics: [],
      firstTryCorrect: 0,
      advanced: 0,
      lapsed: 0,
      currentItemId: null,
      attemptedThisItem: false,
      usedScaffolding: false,
    };
    enterDrillView();
    renderDrill();
  }

  function closeDrill() {
    DRILL = null;
    exitDrillView();
    renderMenu();
  }

  function renderDrill() {
    const root = $('#root');
    root.innerHTML = '';
    const top = el('div', { class: 'drill-top' },
      el('button', { class: 'drill-back', onclick: closeDrill }, '← Menu'),
      el('div', { class: 'drill-progress' }, `${DRILL.sessionCount + 1} / ${DRILL.sessionCap}`)
    );
    const body = el('div', { class: 'drill-body', id: 'drillBody' });
    const drill = el('div', { class: 'drill active' }, top, body);
    root.appendChild(drill);
    advance();
  }

  function advance() {
    if (DRILL.sessionCount >= DRILL.sessionCap) return endSession();
    const view = hydratedStateView(DRILL.state, DRILL.deckDef);
    const id = EngineCore.selectNextItem(view, today(), {
      sessionSeen: DRILL.sessionSeen,
      lastTopics: DRILL.lastTopics,
      newToday: DRILL.newToday,
      newCap: DRILL.newCap,
    });
    if (!id) return endSession();
    DRILL.currentItemId = id;
    DRILL.attemptedThisItem = false;
    DRILL.usedScaffolding = false;
    setProgress(`${Math.min(DRILL.sessionCount + 1, DRILL.sessionCap)} / ${DRILL.sessionCap}`);
    const itemDef = DRILL.deckDef.items.find(it => it.id === id);
    renderItem(itemDef);
  }

  function renderItem(item) {
    const body = $('#drillBody');
    body.innerHTML = '';
    const state = DRILL.state.items[item.id];
    if (item.kind === 'cloze') renderCloze(body, item, state);
    else if (item.kind === 'text') renderText(body, item, state);
    else if (item.kind === 'choice') renderChoice(body, item, state);
  }

  function renderCloze(body, item, state) {
    const blanks = item.blanks;
    const promptHtml = el('div', { class: 'prompt' });
    const inputs = [];
    const parts = item.prompt.split(/(\{\d+\})/g);
    for (const p of parts) {
      const m = p.match(/^\{(\d+)\}$/);
      if (m) {
        const i = +m[1];
        const blank = el('span', { class: 'blank' });
        const ansLen = (blanks[i].answer || '').length || 4;
        const inp = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', size: Math.max(4, ansLen + 2) });
        if (state.box <= 1) inp.placeholder = '_'.repeat(ansLen);
        else if (state.box === 2) inp.placeholder = (blanks[i].answer || '_')[0] + '_'.repeat(Math.max(0, ansLen - 1));
        else inp.placeholder = '';
        blank.appendChild(inp);
        inputs.push({ inp, blank, def: blanks[i] });
        promptHtml.appendChild(blank);
      } else {
        promptHtml.appendChild(document.createTextNode(p));
      }
    }
    body.appendChild(promptHtml);

    if (state.box <= 1) {
      // Build the chip palette with case-insensitive de-duplication so a
      // sentence-initial answer ("Nach") and its lowercase pool twin ("nach")
      // don't both appear, and uniform-case the display so the lone capitalized
      // chip doesn't silently flag the answer.
      const seen = new Set();
      const chipRaw = [];
      const addChip = (w) => {
        if (!w) return;
        const k = String(w).toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        chipRaw.push(w);
      };
      for (const b of blanks) addChip(b.answer);
      const deckPools = DRILL.deckDef.pools || {};
      for (const b of blanks) {
        if (b.scaffoldPool && deckPools[b.scaffoldPool]) {
          for (const e of deckPools[b.scaffoldPool].items) addChip(e);
        }
      }
      if (chipRaw.length > blanks.length) {
        DRILL.usedScaffolding = true;
      }
      const chipsEl = el('div', { class: 'chips' });
      const chipList = uniformFirstCase(chipRaw).slice(0, 12);
      shuffleDeterministic(chipList, hashCode(item.id));
      for (const w of chipList) {
        chipsEl.appendChild(el('div', { class: 'chip', onclick: (e) => fillFirstEmpty(inputs, w, e.target) }, w));
      }
      body.appendChild(chipsEl);
    }

    const submitBtn = el('button', { class: 'btn-primary', onclick: () => submitCloze(item, inputs) }, 'Check');
    body.appendChild(el('div', { class: 'drill-actions' }, submitBtn));

    setTimeout(() => inputs[0] && inputs[0].inp.focus(), 0);
  }

  function fillFirstEmpty(inputs, word, chipEl) {
    for (const i of inputs) {
      if (!i.inp.value) { i.inp.value = word; chipEl.classList.add('used'); return; }
    }
  }

  function submitCloze(item, inputs) {
    let allCorrect;
    if (Array.isArray(item.acceptAny) && item.acceptAny.length > 0) {
      const userValues = inputs.map(i => i.inp.value);
      allCorrect = item.acceptAny.some(combo =>
        combo.length === userValues.length &&
        combo.every((expected, i) => EngineCore.answersMatch(userValues[i], expected, []))
      );
      for (const { inp, blank } of inputs) {
        blank.classList.add(allCorrect ? 'correct' : 'wrong');
      }
    } else {
      allCorrect = true;
      for (const { inp, blank, def } of inputs) {
        const ok = EngineCore.answersMatch(inp.value, def.answer, def.alts || []);
        blank.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) allCorrect = false;
      }
    }
    finalizeAttempt(item, allCorrect, inputs);
  }

  function renderText(body, item, state) {
    body.appendChild(el('div', { class: 'prompt' }, item.prompt));
    const inp = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', class: 'blank filled', style: { fontSize: '18px', minWidth: '200px' } });
    body.appendChild(inp);
    const submit = el('button', { class: 'btn-primary', onclick: () => {
      const ok = EngineCore.answersMatch(inp.value, item.answer, item.alts || []);
      inp.classList.add(ok ? 'correct' : 'wrong');
      finalizeAttempt(item, ok, [{ inp, blank: inp, def: { answer: item.answer } }]);
    } }, 'Check');
    body.appendChild(el('div', { class: 'drill-actions' }, submit));
    setTimeout(() => inp.focus(), 0);
  }

  function renderChoice(body, item, state) {
    const promptHtml = el('div', { class: 'prompt' }, item.prompt);
    body.appendChild(promptHtml);
    const seed = hashCode(item.id + ':' + (DRILL.state.items[item.id].seenCount || 0));
    let options;
    if (Array.isArray(item.options)) {
      options = item.options.slice();
    } else {
      const pool = DRILL.deckDef.pools[item.pool].items;
      const distractors = EngineCore.selectDistractors(pool, item.answer, state.box, 3, seed);
      options = [item.answer].concat(distractors);
    }
    // Always shuffle (inline options used to keep their authored order, which put
    // the answer in a predictable slot — e.g. always first in the past/future deck).
    shuffleDeterministic(options, seed + 1);
    const labels = uniformFirstCase(options);
    const wrap = el('div', { class: 'choice-options' });
    let answerBtn = null;
    options.forEach((opt, i) => {
      const btn = el('button', { class: 'choice-btn', onclick: () => {
        const ok = opt === item.answer;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok && answerBtn) answerBtn.classList.add('correct');
        finalizeAttempt(item, ok, [{ inp: { value: opt }, blank: btn, def: { answer: item.answer } }]);
      } }, labels[i]);
      if (opt === item.answer) answerBtn = btn;
      wrap.appendChild(btn);
    });
    body.appendChild(wrap);
  }

  // If options disagree on first-letter case (e.g. one capitalized gloss among
  // lowercase ones), the odd one out silently flags the answer. Normalize the
  // display to a single first-letter case so casing carries no signal. The
  // underlying option values are untouched, so answer matching is unaffected.
  function uniformFirstCase(opts) {
    const isLetter = c => c && c.toLowerCase() !== c.toUpperCase();
    const firsts = opts.filter(o => o && o.length).map(o => o[0]);
    const anyUpper = firsts.some(c => isLetter(c) && c === c.toUpperCase());
    const anyLower = firsts.some(c => isLetter(c) && c === c.toLowerCase());
    if (anyUpper && anyLower) {
      return opts.map(o => (o && o.length) ? o[0].toLowerCase() + o.slice(1) : o);
    }
    return opts.slice();
  }

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function shuffleDeterministic(arr, seed) {
    let s = seed >>> 0;
    function r() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
  }

  function finalizeAttempt(item, correct, inputs) {
    if (DRILL.attemptedThisItem) return;
    DRILL.attemptedThisItem = true;
    const state = DRILL.state.items[item.id];
    const body = $('#drillBody');
    const fb = el('div', { class: 'feedback ' + (correct ? 'correct' : 'wrong') });
    if (correct) {
      fb.appendChild(el('div', null, 'Correct.'));
      if (item.translation) fb.appendChild(el('div', { class: 'translation' }, item.translation));
    } else {
      // Show the correct answer in the same format the user is asked to type
      // below (space-joined words/endings), rather than a "word / ending" slash
      // form that doesn't match the expected input.
      let correctForm;
      if (item.kind === 'cloze') {
        correctForm = (Array.isArray(item.acceptAny) && item.acceptAny.length > 0)
          ? item.acceptAny[0].join(' ')
          : item.blanks.map(b => b.answer).join(' ');
      } else {
        correctForm = item.answer;
      }
      fb.appendChild(el('div', null, 'Correct answer: '));
      fb.appendChild(el('div', { class: 'correct-form' }, correctForm));
      if (item.translation) fb.appendChild(el('div', { class: 'translation' }, item.translation));
    }
    if (item.explanation) fb.appendChild(el('div', { class: 'explanation' }, item.explanation));
    body.appendChild(fb);

    if (!correct) {
      const corrLabel = el('div', { style: { marginTop: '20px', color: '#aaa', fontSize: '14px' } }, 'Type the correct answer to continue:');
      body.appendChild(corrLabel);
      let correctText;
      if (item.kind === 'cloze') {
        if (Array.isArray(item.acceptAny) && item.acceptAny.length > 0) {
          correctText = item.acceptAny[0].join(' ');
        } else {
          correctText = item.blanks.map(b => b.answer).join(' ');
        }
      } else {
        correctText = item.answer;
      }
      const corrInp = el('input', { type: 'text', class: 'blank filled', autocomplete: 'off', spellcheck: 'false', style: { fontSize: '16px', marginTop: '8px', minWidth: '300px' } });
      body.appendChild(corrInp);
      const advanceBtn = el('button', { class: 'btn-primary', style: { marginTop: '12px' }, onclick: () => {
        let ok;
        if (item.kind === 'cloze' && Array.isArray(item.acceptAny) && item.acceptAny.length > 0) {
          const normalized = EngineCore.normalizeAnswer(corrInp.value);
          ok = item.acceptAny.some(combo => EngineCore.normalizeAnswer(combo.join(' ')) === normalized);
        } else {
          ok = EngineCore.normalizeAnswer(corrInp.value) === EngineCore.normalizeAnswer(correctText);
        }
        if (ok) {
          commitOutcome(item, 'wrong');
          DRILL.lapsed++;
          nextItem(item);
        } else {
          corrInp.classList.add('wrong');
          setTimeout(() => corrInp.classList.remove('wrong'), 600);
        }
      } }, 'Continue');
      body.appendChild(el('div', { class: 'drill-actions' }, advanceBtn));
      setTimeout(() => corrInp.focus(), 0);
    } else {
      const outcome = DRILL.usedScaffolding ? 'correct-aided' : 'correct';
      const wasNew = state.box === 0;
      commitOutcome(item, outcome);
      if (outcome === 'correct') DRILL.firstTryCorrect++;
      DRILL.advanced++;
      if (wasNew) {
        DRILL.newToday++;
        DRILL.state.sessionMeta.newToday = (DRILL.state.sessionMeta.newToday || 0) + 1;
      }
      const advanceBtn = el('button', { class: 'btn-primary', onclick: () => nextItem(item) }, 'Next');
      body.appendChild(el('div', { class: 'drill-actions' }, advanceBtn));
      setTimeout(() => advanceBtn.focus(), 0);
    }
  }

  function commitOutcome(item, outcome) {
    const state = DRILL.state.items[item.id];
    const updated = EngineCore.srsUpdate(state, outcome);
    updated.due = addDays(today(), updated.interval);
    updated.lastSeen = nowIso();
    updated.seenCount = (state.seenCount || 0) + 1;
    DRILL.state.items[item.id] = updated;
    Storage.saveDeck(DRILL.deckId, DRILL.state);
  }

  var nextItem = function (prevItem) {
    if (DRILL.mixed) {
      DRILL.lastTopics = topicsOf(prevItem);
      DRILL.qIdx++;
      DRILL.sessionCount++;
      Storage.saveDeck(DRILL.deckId, DRILL.state);
      advanceMixed();
      return;
    }
    DRILL.sessionSeen.push(prevItem.id);
    DRILL.lastTopics = topicsOf(prevItem);
    DRILL.sessionCount++;
    DRILL.state.sessionMeta.todayCount++;
    Storage.saveDeck(DRILL.deckId, DRILL.state);
    advance();
  };

  function addDays(yyyymmdd, days) {
    const d = new Date(yyyymmdd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function endSession() {
    const body = $('#drillBody');
    if (body) body.innerHTML = '';
    const newCap = DRILL.newCap || NEW_CARD_LIMIT;
    const capReached = !DRILL.mixed && (DRILL.newToday || 0) >= newCap;
    const note = (text) => el('div', {
      style: { marginTop: '16px', maxWidth: '340px', color: '#999', fontSize: '14px', lineHeight: '1.55' },
    }, text);

    if (DRILL.sessionCount === 0) {
      let headline, detail;
      if (DRILL.mixed) {
        headline = 'All caught up';
        detail = 'Nothing is due across your decks right now. New cards and due reviews show up here as they come up — check back later, or open a single deck to keep going.';
      } else if (capReached) {
        headline = 'Daily limit reached';
        detail = `You've already introduced today's ${newCap} new cards for this deck. The limit spaces new material out so it sticks instead of piling up. The cards you've studied will return for review on their scheduled days — come back tomorrow for ${newCap} more.`;
      } else {
        headline = 'Nothing due right now';
        detail = 'Everything you\u2019ve learned in this deck is scheduled for a later day. Check back when those cards come due.';
      }
      const empty = el('div', { class: 'session-end' },
        el('div', { class: 'stat-val' }, '✓'),
        el('div', { class: 'stat' }, headline),
        note(detail),
        el('button', { class: 'btn-primary', style: { marginTop: '24px' }, onclick: closeDrill }, 'Back to menu')
      );
      if (body) body.appendChild(empty);
      return;
    }
    const summary = el('div', { class: 'session-end' },
      el('div', { class: 'stat-val' }, String(DRILL.sessionCount)),
      el('div', { class: 'stat' }, 'items seen'),
      el('div', { class: 'stat-val' }, String(DRILL.firstTryCorrect)),
      el('div', { class: 'stat' }, 'first-try correct'),
      el('div', { class: 'stat-val' }, String(DRILL.advanced)),
      el('div', { class: 'stat' }, 'advanced'),
      el('div', { class: 'stat-val' }, String(DRILL.lapsed)),
      el('div', { class: 'stat' }, 'lapsed'),
      el('button', { class: 'btn-primary', style: { marginTop: '24px' }, onclick: closeDrill }, 'Back to menu')
    );
    if (capReached) {
      summary.insertBefore(
        note(`That's today's ${newCap} new cards for this deck. Come back tomorrow for ${newCap} more, and your studied cards will return for review when they're due.`),
        summary.lastChild
      );
    }
    if (body) body.appendChild(summary);
  }

  // ----- Boot -----
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      Storage.init()
        .catch(err => console.warn('[gd-storage] init degraded:', err))
        .finally(renderMenu);
    });
    // Browser back button: close any open drill instead of leaving the site.
    window.addEventListener('popstate', () => {
      if (DRILL) {
        DRILL = null;
        document.body.classList.remove('drill-open');
        renderMenu();
        return;
      }
      if (window.ExtraVocab) window.ExtraVocab.handlePop();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderMenu, openDeck, openDailyReview };
  } else {
    global.EngineUI = { renderMenu, openDeck, openDailyReview };
  }
})(typeof window !== 'undefined' ? window : globalThis);
