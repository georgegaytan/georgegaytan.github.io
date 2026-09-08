(function (global) {
  const EngineCore = {};

  const EASE_FLOOR = 1.3;
  const EASE_START = 2.5;
  const EASE_DROP_ON_LAPSE = 0.15;
  // Unaided recall pays back some of what a lapse took, capped at the starting
  // ease. Without this, ease is a ratchet: every card you ever missed drifts to
  // the 1.3 floor and its intervals stay short forever, however well you go on
  // to know it. Aided recall deliberately earns no ease back.
  const EASE_GAIN_ON_RECALL = 0.1;
  const AIDED_INTERVAL_MULTIPLIER = 0.5;

  function srsUpdate(item, outcome) {
    const next = { box: item.box, ease: item.ease, interval: item.interval, lapses: item.lapses };
    if (outcome === 'correct') {
      next.box = item.box + 1;
      next.ease = Math.min(EASE_START, +(item.ease + EASE_GAIN_ON_RECALL).toFixed(2));
      next.interval = item.interval === 0
        ? 1
        : Math.max(1, Math.round(item.interval * item.ease));
    } else if (outcome === 'correct-aided') {
      // Aided recall still advances the box. It must: chips are shown at box
      // <= 1, so holding the box here made the ladder a closed loop - the card
      // could never reach box 2, never lose its chips, and never be mastered.
      // The halved interval is the penalty for needing the scaffold.
      next.box = item.box + 1;
      next.interval = item.interval === 0
        ? 1
        : Math.max(1, Math.round(item.interval * item.ease * AIDED_INTERVAL_MULTIPLIER));
    } else if (outcome === 'wrong') {
      next.box = 1;
      next.ease = Math.max(EASE_FLOOR, +(item.ease - EASE_DROP_ON_LAPSE).toFixed(2));
      next.interval = 1;
      next.lapses = item.lapses + 1;
    } else {
      throw new Error('unknown outcome: ' + outcome);
    }
    return next;
  }

  EngineCore.srsUpdate = srsUpdate;

  function normalizeAnswer(s, opts) {
    opts = opts || {};
    let out = String(s).trim().replace(/\s+/g, ' ');
    if (!opts.caseSensitive) out = out.toLowerCase();
    out = out
      .replace(/ae/g, 'ä')
      .replace(/oe/g, 'ö')
      .replace(/ue/g, 'ü')
      .replace(/ss/g, 'ß')
      .replace(/AE/g, 'Ä')
      .replace(/OE/g, 'Ö')
      .replace(/UE/g, 'Ü');
    return out;
  }

  function answersMatch(input, answer, alts, opts) {
    alts = alts || [];
    const candidates = [answer].concat(alts);
    const normalizedInput = normalizeAnswer(input, opts);
    for (const c of candidates) {
      if (normalizeAnswer(c, opts) === normalizedInput) return true;
    }
    return false;
  }

  EngineCore.normalizeAnswer = normalizeAnswer;
  EngineCore.answersMatch = answersMatch;

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const v0 = new Array(b.length + 1);
    const v1 = new Array(b.length + 1);
    for (let i = 0; i <= b.length; i++) v0[i] = i;
    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
    }
    return v1[b.length];
  }

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function selectDistractors(pool, answer, box, count, seed) {
    const ansKey = String(answer).toLowerCase();
    const eligible = pool.filter(p => String(p).toLowerCase() !== ansKey);
    if (eligible.length < count) {
      throw new Error('pool too small: need ' + count + ' distractors, have ' + eligible.length);
    }

    // Seed-derived tiebreaker keeps results deterministic but seed-varied.
    const rand = rng(seed);
    const tagged = eligible.map(p => ({ p, d: levenshtein(p, answer), tie: rand() }));

    let ranked;
    if (box >= 4) {
      // Adversarial: nearest first.
      ranked = tagged.slice().sort((a, b) => a.d - b.d || a.tie - b.tie);
    } else if (box <= 1) {
      // Easy: farthest first.
      ranked = tagged.slice().sort((a, b) => b.d - a.d || a.tie - b.tie);
    } else {
      // Middle: draw from the middle quartiles of the distance ranking,
      // then order by seed tiebreaker for variety across appearances.
      const byDist = tagged.slice().sort((a, b) => a.d - b.d || a.tie - b.tie);
      const start = Math.floor(byDist.length / 4);
      const end = Math.floor(byDist.length * 3 / 4);
      let mid = byDist.slice(start, end);
      if (mid.length < count) mid = byDist;
      mid.sort((a, b) => a.tie - b.tie);
      ranked = mid;
    }

    return ranked.slice(0, count).map(x => x.p);
  }

  EngineCore.selectDistractors = selectDistractors;
  EngineCore._levenshtein = levenshtein;

  // Fisher-Yates shuffle. rng defaults to Math.random so callers get fresh
  // variety each session; tests can pass a seeded rng for determinism.
  function shuffle(arr, rndFn) {
    const r = rndFn || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  EngineCore.shuffle = shuffle;

  function selectNextItem(deckState, today, options) {
    options = options || {};
    const sessionSeen = new Set(options.sessionSeen || []);
    const lastTopics = new Set(options.lastTopics || []);
    const newToday = options.newToday || 0;
    const newCap = options.newCap == null ? 5 : options.newCap;

    const items = deckState.items || {};
    const ids = Object.keys(items).filter(id => !sessionSeen.has(id));
    const rnd = options.rng || Math.random;

    function topicsDisjoint(id) {
      if (lastTopics.size === 0) return true;
      const ts = items[id].topics || [];
      for (const t of ts) if (lastTopics.has(t)) return false;
      return true;
    }

    // Each tier is shuffled before its priority sort so that items of equal
    // priority (same due date / same box / any new card) appear in a different
    // order every session instead of always following deck insertion order.
    // JS sort is stable, so the shuffle becomes the tiebreak.

    // Tier 1: overdue
    const overdue = shuffle(ids
      .filter(id => items[id].due && items[id].due <= today && items[id].box > 0), rnd)
      .sort((a, b) => items[a].due < items[b].due ? -1 : items[a].due > items[b].due ? 1 : 0);
    for (const id of overdue) if (topicsDisjoint(id)) return id;
    if (overdue.length) return overdue[0];

    // Tier 2: low-box not new, and not already seen today.
    // (The design calls this tier "low-box-not-seen-today". Previously the
    // "not seen today" part was enforced only via in-session sessionSeen, which
    // resets on every deck re-entry — so a card learned minutes ago, now due
    // tomorrow, would be served again the same day. lastSeen makes the
    // exclusion persist across sessions within the same day.)
    const lowBox = shuffle(ids
      .filter(id => items[id].box > 0 && items[id].box < 4)
      .filter(id => !(items[id].lastSeen && String(items[id].lastSeen).slice(0, 10) === today)), rnd)
      .sort((a, b) => items[a].box - items[b].box);
    for (const id of lowBox) if (topicsDisjoint(id)) return id;
    if (lowBox.length) return lowBox[0];

    // Tier 3: new (box 0), introduced in random order
    if (newToday < newCap) {
      const fresh = shuffle(ids.filter(id => items[id].box === 0), rnd);
      for (const id of fresh) if (topicsDisjoint(id)) return id;
      if (fresh.length) return fresh[0];
    }

    return null;
  }

  EngineCore.selectNextItem = selectNextItem;

  // Chip palette shown under a cloze at box 0/1.
  //
  // Two properties matter and neither is free:
  //   1. Every answer must survive the cap, so answers are seeded first.
  //   2. Each blank must get its own distractors. Taking the first N entries of
  //      the concatenated pools lets one large pool (say 15 participles) crowd
  //      out another blank's entirely, leaving that blank's answer as the only
  //      chip of its kind - trivially solvable, the exact failure the scaffold
  //      is meant to prevent. So pools are dealt round-robin, one chip per
  //      blank per round, until the cap is reached.
  // Each pool is shuffled with the item's seed first, so the distractors vary
  // per item instead of every item showing the same fixed prefix of the pool
  // (which a learner could game by picking the unfamiliar chip).
  function buildChipPalette(blanks, pools, seed, cap) {
    blanks = blanks || [];
    pools = pools || {};
    cap = cap == null ? 12 : cap;

    const seen = new Set();
    const chips = [];
    function add(w) {
      if (w == null || w === '') return false;
      const k = String(w).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      chips.push(w);
      return true;
    }

    for (const b of blanks) add(b.answer);

    const rand = rng(seed >>> 0);
    const queues = blanks.map(b => {
      const p = b.scaffoldPool && pools[b.scaffoldPool];
      return p && Array.isArray(p.items) ? shuffle(p.items.slice(), rand) : [];
    });

    let dealt = true;
    while (chips.length < cap && dealt) {
      dealt = false;
      for (const q of queues) {
        if (chips.length >= cap) break;
        // Draw until this queue yields one chip that isn't already shown.
        while (q.length && chips.length < cap) {
          dealt = true;
          if (add(q.shift())) break;
        }
      }
    }
    return chips;
  }

  EngineCore.buildChipPalette = buildChipPalette;

  // ---------------------------------------------------------------------------
  // Session logic lifted out of engine-ui so it can be tested without a DOM.
  // Everything below is pure: `today` is always passed in, never read from
  // the clock, and nothing here touches Storage.
  // ---------------------------------------------------------------------------

  const NEW_CARD_LIMIT = 15;
  EngineCore.NEW_CARD_LIMIT = NEW_CARD_LIMIT;

  // Calendar day in the *local* timezone, as 'YYYY-MM-DD'. The app used to
  // derive "today" from toISOString(), i.e. UTC, so the learning day rolled
  // over at 02:00 in Zurich and mid-afternoon on the US west coast - resetting
  // the new-card cap and un-marking "seen today" partway through a sitting.
  // Accepts a Date or anything Date can parse (the stored ISO lastSeen).
  function localDay(d) {
    const x = d instanceof Date ? d : new Date(d);
    if (isNaN(x.getTime())) return null;
    const m = x.getMonth() + 1, day = x.getDate();
    return x.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  EngineCore.localDay = localDay;

  // Pure calendar arithmetic on a 'YYYY-MM-DD' string; timezone-independent.
  function addDays(yyyymmdd, days) {
    const d = new Date(yyyymmdd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  EngineCore.addDays = addDays;

  function freshItemState() {
    return { box: 0, ease: EASE_START, interval: 0, due: null, lapses: 0, lastSeen: null, seenCount: 0 };
  }

  function freshSessionMeta(today) {
    return { todayCount: 0, newToday: 0, todayDate: today, firstTryCorrectToday: 0 };
  }

  // Bring a stored deck state up to date for `today`: create it if missing,
  // add entries for items authored since it was saved, and reset the daily
  // counters on a new day. Tolerates a state with no items/sessionMeta (an
  // imported or hand-edited backup) instead of throwing on first open.
  //
  // Mutates and returns `saved` when given one, because the caller keeps that
  // same object reference in Storage's map and saves it after each answer.
  function initDeckState(saved, deckDef, today) {
    const s = saved && typeof saved === 'object' ? saved : {};
    if (!s.deckId) s.deckId = deckDef.id;
    if (!s.version) s.version = 1;
    if (!s.items || typeof s.items !== 'object') s.items = {};
    for (const item of deckDef.items) {
      if (!s.items[item.id]) s.items[item.id] = freshItemState();
    }
    if (!s.sessionMeta || typeof s.sessionMeta !== 'object' || s.sessionMeta.todayDate !== today) {
      s.sessionMeta = freshSessionMeta(today);
    }
    return s;
  }
  EngineCore.initDeckState = initDeckState;

  function topicsOf(itemDef) {
    if (itemDef.kind === 'cloze' && Array.isArray(itemDef.blanks)) {
      const set = new Set();
      for (const b of itemDef.blanks) if (b.topic) set.add(b.topic);
      return Array.from(set);
    }
    return itemDef.topic ? [itemDef.topic] : [];
  }
  EngineCore.topicsOf = topicsOf;

  function hydratedStateView(state, deckDef) {
    const items = {};
    for (const def of deckDef.items) {
      const s = (state && state.items && state.items[def.id]) || {};
      items[def.id] = Object.assign({}, s, { topics: topicsOf(def) });
    }
    return { items };
  }
  EngineCore.hydratedStateView = hydratedStateView;

  function seenOn(itemState, today) {
    return !!(itemState && itemState.lastSeen && localDay(itemState.lastSeen) === today);
  }

  // A card is "introduced" the first time it leaves box 0 - whatever the
  // outcome. Counting only correct answers let wrong answers on new cards slip
  // past the daily cap: the card moved to box 1 but was never tallied, so a
  // learner who missed every new card could introduce an unlimited number.
  function isIntroduction(itemStateBefore) {
    return !!itemStateBefore && itemStateBefore.box === 0;
  }
  EngineCore.isIntroduction = isIntroduction;

  function deckProgress(state) {
    if (!state || !state.items) return null;
    const ids = Object.keys(state.items);
    if (ids.length === 0) return null;
    const mastered = ids.filter(id => state.items[id].box >= 4).length;
    return { mastered, total: ids.length, pct: Math.round(mastered / ids.length * 100), label: `${mastered}/${ids.length} mastered` };
  }
  EngineCore.deckProgress = deckProgress;

  // How many items a single-deck session can actually serve today: overdue +
  // low-box-not-seen-today + new up to the remaining daily allowance.
  function actionableCount(state, deckDef, today, newToday, newCap) {
    const view = hydratedStateView(state, deckDef).items;
    let overdue = 0, lowBox = 0, fresh = 0;
    for (const id in view) {
      const it = view[id];
      if (it.due && it.due <= today && it.box > 0) overdue++;
      else if (it.box > 0 && it.box < 4 && !seenOn(it, today)) lowBox++;
      else if (it.box === 0) fresh++;
    }
    const newAllowed = Math.max(0, newCap - newToday);
    return overdue + lowBox + Math.min(fresh, newAllowed);
  }
  EngineCore.actionableCount = actionableCount;

  // Cross-deck daily review. `statesById` must hold an (initDeckState'd) state
  // for every deck that should take part - a deck the learner has never opened
  // contributes its new cards like any other, which the old UI code silently
  // skipped, so a fresh install saw "No items due today".
  //
  // Due and struggling cards come first, oldest due first. New cards are
  // drawn per deck within that deck's remaining daily allowance (so a deck
  // drill plus a daily review can't introduce 30 from one deck), then capped
  // overall. The result is interleaved to avoid the same deck or topic twice
  // in a row wherever the pool allows it.
  function buildDailyReviewQueue(decks, statesById, today, opts) {
    opts = opts || {};
    const newCap = opts.newCap == null ? NEW_CARD_LIMIT : opts.newCap;
    const limit = opts.limit == null ? 30 : opts.limit;
    const rnd = opts.rng || Math.random;

    const due = [];
    const fresh = [];
    for (const deckDef of decks) {
      const state = statesById[deckDef.id];
      if (!state || !state.items) continue;
      const introduced = (state.sessionMeta && state.sessionMeta.newToday) || 0;
      const allowance = Math.max(0, newCap - introduced);
      const deckFresh = [];
      for (const itemDef of deckDef.items) {
        const s = state.items[itemDef.id];
        if (!s) continue;
        const entry = { deckId: deckDef.id, deckDef, itemDef, state, dueDate: s.due || '', topics: topicsOf(itemDef) };
        if (s.box > 0 && s.due && s.due <= today) due.push(entry);
        else if (s.box > 0 && s.box < 4 && !seenOn(s, today)) due.push(entry);
        else if (s.box === 0) deckFresh.push(entry);
      }
      Array.prototype.push.apply(fresh, shuffle(deckFresh, rnd).slice(0, allowance));
    }
    due.sort((a, b) => a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);
    const remaining = due.concat(shuffle(fresh, rnd).slice(0, newCap));

    const queue = [];
    let lastDeck = null;
    let lastTopics = new Set();
    while (queue.length < limit && remaining.length > 0) {
      let pickIdx = remaining.findIndex(c =>
        c.deckId !== lastDeck && !c.topics.some(t => lastTopics.has(t))
      );
      if (pickIdx === -1) pickIdx = 0;
      const pick = remaining.splice(pickIdx, 1)[0];
      queue.push(pick);
      lastDeck = pick.deckId;
      lastTopics = new Set(pick.topics);
    }
    return queue;
  }
  EngineCore.buildDailyReviewQueue = buildDailyReviewQueue;

  // Display helpers that decide what the learner sees - kept here so the
  // decisions are testable even though the rendering is not.

  // If options disagree on first-letter case (one capitalized gloss among
  // lowercase ones), the odd one out silently flags the answer. Normalize the
  // display to one case so casing carries no signal; values are untouched.
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
  EngineCore.uniformFirstCase = uniformFirstCase;

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  EngineCore.hashCode = hashCode;

  // In-place seeded Fisher-Yates; same generator as selectDistractors.
  function shuffleDeterministic(arr, seed) {
    return shuffle(arr, rng(seed >>> 0));
  }
  EngineCore.shuffleDeterministic = shuffleDeterministic;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineCore;
  } else {
    global.EngineCore = EngineCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
