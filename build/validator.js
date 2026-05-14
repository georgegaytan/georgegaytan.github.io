const path = require('node:path');
const fs = require('node:fs');

const CATEGORIES = (function () {
  try {
    const p = path.join(__dirname, '..', 'src', 'categories.json');
    return new Set(JSON.parse(fs.readFileSync(p, 'utf8')).categories);
  } catch (e) {
    return new Set();
  }
})();

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

function err(code, message, location) {
  return { severity: 'error', code, message, location };
}
function warn(code, message, location) {
  return { severity: 'warning', code, message, location };
}

function validateItem(item, deck) {
  const errs = [];
  const loc = `${deck.id}:${item.id}`;

  // C2: cloze placeholder match
  if (item.kind === 'cloze') {
    const blanks = item.blanks || [];
    const placeholders = (item.prompt || '').match(/\{(\d+)\}/g) || [];
    if (placeholders.length !== blanks.length) {
      errs.push(err('C2', `placeholder count (${placeholders.length}) ≠ blanks count (${blanks.length})`, loc));
    }
  }

  // C3: prompt contains answer (word-boundary aware; suppressed by allowEcho:true)
  const answersToCheck = item.kind === 'cloze'
    ? (item.blanks || []).map(b => b.answer).filter(a => a && a.length > 0)
    : (item.answer ? [item.answer] : []);
  if (!item.allowEcho && typeof item.prompt === 'string') {
    const context = item.prompt.replace(/\{\d+\}/g, ' ');
    for (const ans of answersToCheck) {
      const escaped = ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('(?:^|[^\\p{L}])' + escaped + '(?=$|[^\\p{L}])', 'iu');
      if (re.test(context)) {
        errs.push(err('C3', `prompt contains the answer "${ans}" as a whole word (set "allowEcho": true if intentional)`, loc));
      }
    }
  }

  // C4: topic snake_case
  const topics = item.kind === 'cloze'
    ? (item.blanks || []).map(b => b.topic).filter(Boolean)
    : item.topic ? [item.topic] : [];
  for (const t of topics) {
    if (!SNAKE_CASE.test(t)) {
      errs.push(err('C4', `topic "${t}" is not snake_case`, loc));
    }
  }

  return errs;
}

function validateDeck(deck) {
  const errs = [];
  for (const item of (deck.items || [])) {
    errs.push(...validateItem(item, deck));
  }
  return errs;
}

function validateDecks(decks) {
  const errs = [];
  const seenIds = new Map();
  for (const deck of decks) {
    for (const item of (deck.items || [])) {
      if (seenIds.has(item.id)) {
        errs.push(err('C1', `duplicate item id "${item.id}" (first in ${seenIds.get(item.id)})`, `${deck.id}:${item.id}`));
      } else {
        seenIds.set(item.id, deck.id);
      }
    }
    errs.push(...validateDeck(deck));
  }
  return errs;
}

module.exports = { validateDeck, validateDecks, _categories: CATEGORIES };
