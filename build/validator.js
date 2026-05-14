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

const MORPHOLOGY = (function () {
  const out = {};
  try {
    out.modals = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'morphology', 'modals.json'), 'utf8'));
    out.articles = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'morphology', 'articles.json'), 'utf8'));
  } catch (e) {}
  return out;
})();

function flattenModalForms() {
  const all = new Set();
  for (const lemma in (MORPHOLOGY.modals || {})) {
    for (const f of MORPHOLOGY.modals[lemma]) all.add(f);
  }
  return all;
}
const ALL_MODAL_FORMS = flattenModalForms();

const CATEGORY_MEMBERSHIP = {
  modal_verb_form: (s) => ALL_MODAL_FORMS.has(s),
  modal_lemma: (s) => (MORPHOLOGY.modals || {}).hasOwnProperty(s),
  definite_article: (s) => (MORPHOLOGY.articles && MORPHOLOGY.articles.definite || []).includes(s),
  indefinite_article: (s) => {
    const a = (MORPHOLOGY.articles || {});
    return (a.indefinite || []).includes(s) || (a.negative || []).includes(s);
  },
  noun_gender: (s) => ['der','die','das'].includes(s),
  adj_ending: (s) => (MORPHOLOGY.articles && MORPHOLOGY.articles.adj_endings || []).includes(s),
};

function categoryCheck(category, value) {
  const checker = CATEGORY_MEMBERSHIP[category];
  if (!checker) return typeof value === 'string';
  return checker(value);
}

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

  // C13: non-empty answers (escape hatch: cloze with acceptAny covers blanks)
  const hasAcceptAny = item.kind === 'cloze' && Array.isArray(item.acceptAny) && item.acceptAny.length > 0;
  if (item.kind === 'cloze' && !hasAcceptAny) {
    for (let i = 0; i < (item.blanks || []).length; i++) {
      const a = item.blanks[i].answer;
      if (typeof a !== 'string' || a.length === 0) {
        errs.push(err('C13', `cloze blank ${i} has empty answer (set acceptAny if multiple combos are valid)`, loc));
      }
    }
  } else if (item.kind === 'text') {
    if (typeof item.answer !== 'string' || item.answer.length === 0) {
      errs.push(err('C13', `text answer is empty`, loc));
    }
  }
  if (hasAcceptAny) {
    const blanksLen = (item.blanks || []).length;
    for (let i = 0; i < item.acceptAny.length; i++) {
      const combo = item.acceptAny[i];
      if (!Array.isArray(combo) || combo.length !== blanksLen) {
        errs.push(err('C13', `acceptAny[${i}] must be an array of ${blanksLen} string(s)`, loc));
      }
    }
  }

  // C14: warn on missing common alts (position-aware for case-flip)
  function digraphVariant(ans) {
    const umlautMap = [['ä','ae'],['ö','oe'],['ü','ue'],['ß','ss'],['Ä','Ae'],['Ö','Oe'],['Ü','Ue']];
    let withDigraphs = ans;
    for (const [u, d] of umlautMap) withDigraphs = withDigraphs.split(u).join(d);
    return withDigraphs !== ans ? withDigraphs : null;
  }
  function caseFlippedFirst(ans) {
    if (!ans || !ans.length) return null;
    const flipped = (ans[0] === ans[0].toUpperCase())
      ? ans[0].toLowerCase() + ans.slice(1)
      : ans[0].toUpperCase() + ans.slice(1);
    return flipped !== ans ? flipped : null;
  }
  function isSentenceStart(prompt, blankIndex) {
    if (typeof prompt !== 'string') return false;
    const re = new RegExp('\\{' + blankIndex + '\\}');
    const m = prompt.match(re);
    if (!m) return false;
    const before = prompt.slice(0, m.index).replace(/\s+$/, '');
    return before === '' || /[.!?]$/.test(before);
  }

  function checkAlts(answer, alts, label, allowCaseFlip) {
    const have = new Set(alts || []);
    if (allowCaseFlip) {
      const flipped = caseFlippedFirst(answer);
      if (flipped && !have.has(flipped)) {
        errs.push(warn('C14', `${label} answer "${answer}" missing expected alt "${flipped}"`, loc));
      }
    }
    const digraph = digraphVariant(answer);
    if (digraph && !have.has(digraph)) {
      errs.push(warn('C14', `${label} answer "${answer}" missing expected alt "${digraph}"`, loc));
    }
  }

  if (item.kind === 'cloze') {
    for (let i = 0; i < (item.blanks || []).length; i++) {
      const atStart = isSentenceStart(item.prompt, i);
      checkAlts(item.blanks[i].answer || '', item.blanks[i].alts || [], `blank ${i}`, atStart);
    }
  } else if (item.kind === 'text') {
    checkAlts(item.answer || '', item.alts || [], 'text', true);
  }

  // C15: translation reminder on cloze
  if (item.kind === 'cloze' && !item.translation) {
    errs.push(warn('C15', `cloze item has no translation field`, loc));
  }

  // C19: scaffoldPool on cloze blanks must exist and contain the blank's answer
  if (item.kind === 'cloze') {
    const deckPools = deck.pools || {};
    for (let i = 0; i < (item.blanks || []).length; i++) {
      const b = item.blanks[i];
      if (b.scaffoldPool) {
        const p = deckPools[b.scaffoldPool];
        if (!p) {
          errs.push(err('C19', `blank ${i} scaffoldPool "${b.scaffoldPool}" not defined in deck.pools`, loc));
        } else if (b.answer) {
          // Case-insensitive membership: at sentence start the answer may be capitalized
          // while the pool holds the lemma form.
          const ansLower = b.answer.toLowerCase();
          const inPool = p.items.some(it => it.toLowerCase() === ansLower);
          if (!inPool) {
            errs.push(err('C19', `blank ${i} answer "${b.answer}" not in pool "${b.scaffoldPool}"`, loc));
          }
        }
      }
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
      // C18: close the Mode A back door — if every option matches an allowlisted
      // category, the author should have used Mode B with that pool instead.
      // Exemptions: <3 options (intrinsic binary), and the canonical noun_gender
      // pattern (options are exactly the 3 articles der/die/das).
      const NOUN_GENDER = ['der','die','das'];
      const isNounGenderPattern = item.options.length === 3
        && item.options.every(o => NOUN_GENDER.includes(o));
      if (item.options.length >= 3 && !isNounGenderPattern) {
        for (const cat of Object.keys(CATEGORY_MEMBERSHIP)) {
          if (cat === 'noun_gender') continue;
          let allMatch = true;
          for (const opt of item.options) {
            if (!categoryCheck(cat, opt)) { allMatch = false; break; }
          }
          if (allMatch) {
            errs.push(err('C18',
              `Mode A options all match category "${cat}" — convert to Mode B with a typed pool to prevent dead-distractor regressions`,
              loc));
            break;
          }
        }
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
        if (pool.category && CATEGORIES.has(pool.category)) {
          for (const entry of items) {
            if (!categoryCheck(pool.category, entry)) {
              errs.push(err('C12', `pool "${item.pool}" entry "${entry}" fails category check for "${pool.category}"`, loc));
            }
          }
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

const ARTICLE_GENDER_NOM = {
  'der': 'der', 'die': 'die', 'das': 'das',
  'eine': 'die', 'einen': 'der',
  'keine': 'die', 'keinen': 'der',
};

function collectGenderClaim(item, deck) {
  if (item.kind === 'choice') {
    const opts = item.options || (deck.pools && item.pool && deck.pools[item.pool] ? deck.pools[item.pool].items : null);
    const category = item.pool && deck.pools && deck.pools[item.pool] ? deck.pools[item.pool].category : null;
    const isGender = (opts && opts.length === 3 && opts.every(o => ['der','die','das'].includes(o)))
                  || category === 'noun_gender';
    if (isGender && typeof item.prompt === 'string') {
      const m = item.prompt.trim().match(/^([A-ZÄÖÜ][a-zäöüß]+)$/);
      if (m) return { lemma: m[1], gender: item.answer };
    }
  }
  if (item.kind === 'cloze' && Array.isArray(item.blanks)) {
    const prompt = item.prompt || '';
    for (let i = 0; i < item.blanks.length; i++) {
      const re = new RegExp('\\{' + i + '\\}\\s+([A-ZÄÖÜ][a-zäöüß]+)');
      const m = prompt.match(re);
      if (!m) continue;
      const noun = m[1];
      const ansLower = (item.blanks[i].answer || '').toLowerCase();
      const implied = ARTICLE_GENDER_NOM[ansLower];
      if (implied) return { lemma: noun, gender: implied };
    }
  }
  return null;
}

function validateDecks(decks) {
  const errs = [];
  const seenIds = new Map();
  const genderClaims = new Map();

  for (const deck of decks) {
    for (const item of (deck.items || [])) {
      if (seenIds.has(item.id)) {
        errs.push(err('C1', `duplicate item id "${item.id}" (first in ${seenIds.get(item.id)})`, `${deck.id}:${item.id}`));
      } else {
        seenIds.set(item.id, deck.id);
      }
      const claim = collectGenderClaim(item, deck);
      if (claim) {
        const prior = genderClaims.get(claim.lemma);
        if (prior && prior.gender !== claim.gender) {
          errs.push(err('C16', `gender disagreement for "${claim.lemma}": "${prior.gender}" (in ${prior.loc}) vs "${claim.gender}" (in ${deck.id}:${item.id})`, `${deck.id}:${item.id}`));
        } else if (!prior) {
          genderClaims.set(claim.lemma, { gender: claim.gender, loc: `${deck.id}:${item.id}` });
        }
      }
    }
    errs.push(...validateDeck(deck));
  }
  return errs;
}

module.exports = { validateDeck, validateDecks, _categories: CATEGORIES };
