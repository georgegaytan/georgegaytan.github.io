(function (global) {
  const EngineCore = {};

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineCore;
  } else {
    global.EngineCore = EngineCore;
  }
})(typeof window !== 'undefined' ? window : globalThis);
