(function (global) {
  const EngineCore = {};

  const EASE_FLOOR = 1.3;
  const EASE_DROP_ON_LAPSE = 0.15;
  const AIDED_INTERVAL_MULTIPLIER = 0.5;

  function srsUpdate(item, outcome) {
    const next = { box: item.box, ease: item.ease, interval: item.interval, lapses: item.lapses };
    if (outcome === 'correct') {
      next.box = item.box + 1;
      next.interval = item.interval === 0
        ? 1
        : Math.max(1, Math.round(item.interval * item.ease));
    } else if (outcome === 'correct-aided') {
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineCore;
  } else {
    global.EngineCore = EngineCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
