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
  const NEW_CARD_LIMIT = EngineCore.NEW_CARD_LIMIT;

  // The learning day is the local calendar day, not UTC (EngineCore.localDay).
  function today() { return EngineCore.localDay(new Date()); }
  function nowIso() { return new Date().toISOString(); }

  // Session logic lives in EngineCore so it is covered by tests/session.test.js;
  // this file only binds it to Storage and the DOM.
  function loadOrInitDeckState(deckId, deckDef) {
    return EngineCore.initDeckState(Storage.loadDeck(deckId), deckDef, today());
  }

  function getProgress(deckId) {
    return EngineCore.deckProgress(Storage.loadDeck(deckId));
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
    // Every deck takes part, opened before or not. initDeckState only creates
    // or refreshes the state object in memory; nothing is persisted until an
    // answer is committed, and that saves this same object.
    const statesById = {};
    for (const deckDef of window.DECKS) {
      statesById[deckDef.id] = loadOrInitDeckState(deckDef.id, deckDef);
    }
    return EngineCore.buildDailyReviewQueue(window.DECKS, statesById, t, { newCap: NEW_CARD_LIMIT, limit: 30 });
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
    // The queue carries the hydrated state object per deck; a deck opened for
    // the first time here has no Storage entry yet until an answer saves it.
    DRILL.state = entry.state;
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
    // Revoking synchronously can cancel the download in some browsers before
    // it has actually started reading the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        // importAll returns false for a well-formed JSON file that isn't a
        // backup (wrong version / shape); that used to pass silently as success.
        if (!Storage.importAll(backup)) { alert('That file is not a German Drills backup.'); return; }
        renderMenu();
      } catch (ex) {
        alert('Could not parse backup file.');
      } finally {
        // Always clear, including after Cancel - otherwise choosing the same
        // file again fires no change event and the button appears dead.
        evt.target.value = '';
      }
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
    const cap = Math.min(20, EngineCore.actionableCount(state, deckDef, today(), newToday, newCap));
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
    const view = EngineCore.hydratedStateView(DRILL.state, DRILL.deckDef);
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
      // EngineCore.buildChipPalette handles case-insensitive de-duplication (so
      // a sentence-initial answer "Nach" and its lowercase pool twin "nach"
      // don't both appear) and fair per-blank distribution under the cap.
      // uniformFirstCase then normalizes the display so a lone capitalized chip
      // doesn't silently flag the answer.
      // Seeded per showing (seenCount), not per item, so the distractor set
      // and layout change between appearances - the same as choice options.
      const chipSeed = EngineCore.hashCode(item.id + ':' + (state.seenCount || 0));
      const chipRaw = EngineCore.buildChipPalette(blanks, DRILL.deckDef.pools, chipSeed, 12);
      const chipsEl = el('div', { class: 'chips' });
      const chipList = EngineCore.uniformFirstCase(chipRaw);
      EngineCore.shuffleDeterministic(chipList, chipSeed + 1);
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
      if (!i.inp.value) {
        i.inp.value = word;
        chipEl.classList.add('used');
        // The attempt counts as aided only once a chip is actually used.
        // Setting this merely because chips were rendered graded every
        // scaffolded answer as aided, including ones typed out unaided.
        DRILL.usedScaffolding = true;
        return;
      }
    }
  }

  function submitCloze(item, inputs) {
    // One rule for every cloze (EngineCore.clozeMatches): primary answers with
    // their alts, or any acceptAny combo. Per-blank highlighting follows the
    // primary answers so the learner sees which slot was off; the verdict is
    // the whole-combo match.
    const values = inputs.map(i => i.inp.value);
    const allCorrect = EngineCore.clozeMatches(item, values);
    for (const { inp, blank, def } of inputs) {
      const slotOk = allCorrect || EngineCore.answersMatch(inp.value, def.answer, def.alts || []);
      blank.classList.add(slotOk ? 'correct' : 'wrong');
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
    const seed = EngineCore.hashCode(item.id + ':' + (DRILL.state.items[item.id].seenCount || 0));
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
    EngineCore.shuffleDeterministic(options, seed + 1);
    const labels = EngineCore.uniformFirstCase(options);
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

  function finalizeAttempt(item, correct, inputs) {
    if (DRILL.attemptedThisItem) return;
    DRILL.attemptedThisItem = true;
    const state = DRILL.state.items[item.id];
    // Decide "was this card new?" before any outcome is committed, and tally
    // it on BOTH paths below. Counting only correct answers let a new card
    // answered wrong move to box 1 without ever hitting the daily cap.
    const wasNew = EngineCore.isIntroduction(state);
    const noteIntroduction = () => {
      if (!wasNew) return;
      DRILL.newToday = (DRILL.newToday || 0) + 1;
      DRILL.state.sessionMeta.newToday = (DRILL.state.sessionMeta.newToday || 0) + 1;
    };
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
        // The learner is retyping the form shown above, so compare the joined
        // string against every accepted combo (same source of truth as the
        // initial check), not just acceptAny[0] or the primary.
        let ok;
        if (item.kind === 'cloze') {
          const typed = EngineCore.normalizeAnswer(corrInp.value);
          ok = EngineCore.clozeAcceptedCombos(item)
            .some(combo => EngineCore.normalizeAnswer(combo.join(' ')) === typed);
        } else {
          ok = EngineCore.normalizeAnswer(corrInp.value) === EngineCore.normalizeAnswer(correctText);
        }
        if (ok) {
          commitOutcome(item, 'wrong');
          noteIntroduction();
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
      commitOutcome(item, outcome);
      noteIntroduction();
      if (outcome === 'correct') DRILL.firstTryCorrect++;
      DRILL.advanced++;
      const advanceBtn = el('button', { class: 'btn-primary', onclick: () => nextItem(item) }, 'Next');
      body.appendChild(el('div', { class: 'drill-actions' }, advanceBtn));
      setTimeout(() => advanceBtn.focus(), 0);
    }
  }

  function commitOutcome(item, outcome) {
    const state = DRILL.state.items[item.id];
    const updated = EngineCore.srsUpdate(state, outcome);
    updated.due = EngineCore.addDays(today(), updated.interval);
    updated.lastSeen = nowIso();
    updated.seenCount = (state.seenCount || 0) + 1;
    DRILL.state.items[item.id] = updated;
    Storage.saveDeck(DRILL.deckId, DRILL.state);
  }

  var nextItem = function (prevItem) {
    if (DRILL.mixed) {
      DRILL.lastTopics = EngineCore.topicsOf(prevItem);
      DRILL.qIdx++;
      DRILL.sessionCount++;
      Storage.saveDeck(DRILL.deckId, DRILL.state);
      advanceMixed();
      return;
    }
    DRILL.sessionSeen.push(prevItem.id);
    DRILL.lastTopics = EngineCore.topicsOf(prevItem);
    DRILL.sessionCount++;
    Storage.saveDeck(DRILL.deckId, DRILL.state);
    advance();
  };

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
