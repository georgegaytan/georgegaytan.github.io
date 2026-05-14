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
    const eligible = pool.filter(p => p !== answer);
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineCore;
  } else {
    global.EngineCore = EngineCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
