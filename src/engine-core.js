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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineCore;
  } else {
    global.EngineCore = EngineCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
