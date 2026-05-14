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

  // C5-C6: choice Mode A
  if (item.kind === 'choice') {
    const hasOpts = Array.isArray(item.options);
    const hasPool = typeof item.pool === 'string' && item.pool.length > 0;
    if (hasOpts === hasPool) {
      errs.push(err('C5', `choice item must have exactly one of "options" or "pool"`, loc));
    }
    if (hasOpts) {
      if (item.options.length < 2) {
        errs.push(err('C6', `choice options has <2 entries`, loc));
      }
      const dups = item.options.length !== new Set(item.options).size;
      if (dups) errs.push(err('C6', `choice options has duplicates`, loc));
      if (item.answer != null && !item.options.includes(item.answer)) {
        errs.push(err('C6', `choice answer "${item.answer}" not in options`, loc));
      }
    }
    if (hasPool) {
      const pools = deck.pools || {};
      const pool = pools[item.pool];
      if (!pool) {
        errs.push(err('C7', `pool "${item.pool}" not defined in deck.pools`, loc));
      } else {
        const items = pool.items || [];
        if (item.answer != null && !items.includes(item.answer)) {
          errs.push(err('C8', `answer "${item.answer}" not in pool "${item.pool}"`, loc));
        }
        if (items.length < 4) {
          errs.push(err('C9', `pool "${item.pool}" has ${items.length} entries; need ≥4`, loc));
        }
        if (items.length !== new Set(items).size) {
          errs.push(err('C10', `pool "${item.pool}" has duplicate entries`, loc));
        }
        if (!pool.category) {
          errs.push(err('C11', `pool "${item.pool}" is missing "category"`, loc));
        } else if (!CATEGORIES.has(pool.category)) {
          errs.push(err('C11', `pool "${item.pool}" category "${pool.category}" not in allowlist (src/categories.json)`, loc));
        }
      }
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
