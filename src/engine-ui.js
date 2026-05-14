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

  // ----- Daily Review (cross-deck) -----
  function dailyReviewQueue() {
    const t = today();
    const allDue = [];
    for (const deckDef of window.DECKS) {
      const state = Storage.loadDeck(deckDef.id);
      if (!state || !state.items) continue;
      for (const itemDef of deckDef.items) {
        const s = state.items[itemDef.id];
        if (!s || !s.due || s.box <= 0) continue;
        if (s.due <= t) {
          allDue.push({ deckId: deckDef.id, deckDef, itemDef, state: s, dueDate: s.due, topics: topicsOf(itemDef) });
        }
      }
    }
    allDue.sort((a, b) => a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);

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
    DRILL = {
      deckId,
      deckDef,
      state,
      sessionSeen: [],
      sessionCount: 0,
      sessionCap: 20,
      newToday: state.sessionMeta.newToday || 0,
      newCap: 5,
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
      const chipSet = new Set();
      for (const b of blanks) if (b.answer) chipSet.add(b.answer);
      const deckPools = DRILL.deckDef.pools || {};
      for (const b of blanks) {
        if (b.scaffoldPool && deckPools[b.scaffoldPool]) {
          for (const e of deckPools[b.scaffoldPool].items) chipSet.add(e);
        }
      }
      if (chipSet.size > blanks.length) {
        DRILL.usedScaffolding = true;
      }
      const chipsEl = el('div', { class: 'chips' });
      const chipList = Array.from(chipSet).slice(0, 12);
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
    let options;
    if (Array.isArray(item.options)) {
      options = item.options.slice();
    } else {
      const pool = DRILL.deckDef.pools[item.pool].items;
      const seed = hashCode(item.id + ':' + (DRILL.state.items[item.id].seenCount || 0));
      const distractors = EngineCore.selectDistractors(pool, item.answer, state.box, 3, seed);
      options = [item.answer].concat(distractors);
      shuffleDeterministic(options, seed + 1);
    }
    const wrap = el('div', { class: 'choice-options' });
    for (const opt of options) {
      const btn = el('button', { class: 'choice-btn', onclick: () => {
        const ok = opt === item.answer;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) {
          for (const b of wrap.children) if (b.textContent === item.answer) b.classList.add('correct');
        }
        finalizeAttempt(item, ok, [{ inp: { value: opt }, blank: btn, def: { answer: item.answer } }]);
      } }, opt);
      wrap.appendChild(btn);
    }
    body.appendChild(wrap);
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
      const correctForm = item.kind === 'cloze'
        ? item.blanks.map(b => b.answer).join(' / ')
        : item.answer;
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
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderMenu, openDeck, openDailyReview };
  } else {
    global.EngineUI = { renderMenu, openDeck, openDailyReview };
  }
})(typeof window !== 'undefined' ? window : globalThis);
