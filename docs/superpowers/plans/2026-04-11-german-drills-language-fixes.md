# German Drills Language Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix ~50 German language errors, a modal verb distractor code bug, a UX issue, and 4 systematic pronoun generation bugs across all 5 drill decks.

**Architecture:** Each deck is a standalone HTML file stored as base64 in `german-drills.html`. Decoded copies exist in `_decoded_decks/`. We edit the decoded files, then re-encode and reassemble the main file.

**Tech Stack:** HTML/JS (vanilla), Node.js for base64 encoding, git for version control.

**Spec:** `docs/superpowers/specs/2026-04-11-german-drills-language-fixes-design.md`

---

### Task 1: Fix Past/Future deck (2 Swiss German spelling fixes)

**Files:**
- Modify: `_decoded_decks/past___future.html:133, 231`

- [ ] **Step 1: Fix "schliessen" → "schließen" on line 133**

```js
// Line 133: change inf:"schliessen" to inf:"schließen"
// Also update the rule text from "Irregular: ge+schloss+en (ie→o)" — this is correct, keep as-is
```

In `_decoded_decks/past___future.html`, replace:
```
{inf:"schliessen",p2:"geschlossen",
```
with:
```
{inf:"schließen",p2:"geschlossen",
```

- [ ] **Step 2: Fix "Fussball" → "Fußball" on line 231**

In `_decoded_decks/past___future.html`, replace:
```
Er _W_ Fussball _V_.
```
with:
```
Er _W_ Fußball _V_.
```

- [ ] **Step 3: Verify by searching for remaining Swiss spellings**

Run: `grep -n 'ss' _decoded_decks/past___future.html | grep -v 'dass\|muss\|wuss\|geschoss\|lass\|class\|cross'`

Confirm no other "ss" where "ß" is expected.

- [ ] **Step 4: Commit**

```bash
git add _decoded_decks/past___future.html
git commit -m "fix: correct Swiss German spellings in Past/Future deck (schließen, Fußball)"
```

---

### Task 2: Fix Vocabulary deck (2 placeholders, 1 malformed entry, 3 duplicates)

**Files:**
- Modify: `_decoded_decks/vocabulary.html:952, 1034, 1635, 1708, 1757, 1787, 1925, 2113, 2117`

Work bottom-to-top to avoid line drift.

- [ ] **Step 1: Remove duplicate Gegenstand at line 1635**

In `_decoded_decks/vocabulary.html`, delete this entire line:
```
['Gegenstand, -stände',0,1,'object/item',2,'Was ist dieser Gegenstand?'],
```
Keep line 2117 which has the full plural form and better translation.

- [ ] **Step 2: Remove duplicate Empfang at line 1925**

Delete this entire line:
```
['Empfang',0,1,'reception',0,'Der Empfang ist im Erdgeschoss.'],
```
Keep line 2113 which has the plural form.

- [ ] **Step 3: Remove duplicate Anschluss at line 1708**

Delete this entire line:
```
['Anschluss, -schlüsse',0,1,'connection',0,'Ich habe den Anschluss verpasst.'],
```
Keep line 952 (B1 version) which has the full plural.

- [ ] **Step 4: Fix placeholder "skip" on line 1787 (hartherzig)**

Replace:
```
['hartherzig',2,0,'hardhearted',1,'skip'],
```
with:
```
['hartherzig',2,0,'hardhearted',1,'Er ist ein hartherziger Mensch.'],
```

- [ ] **Step 5: Fix placeholder "skip" on line 1757 (vorbereiten)**

Replace:
```
['vorbereiten',1,0,'to prepare',0,'skip'],
```
with:
```
['vorbereiten',1,0,'to prepare',0,'Ich bereite das Essen vor.'],
```

- [ ] **Step 6: Remove malformed duplicate Lohn at line 1034**

Delete this entire line:
```
['Löhne (Pl.)/Lohn, Löhne',0,1,'wage',2,'Der Lohn ist fair.'],
```
Keep line 1958 `['Lohn, Löhne',0,1,'wage',1,...]` which is correct.

- [ ] **Step 7: Commit**

```bash
git add _decoded_decks/vocabulary.html
git commit -m "fix: remove duplicates, placeholders, and malformed entry in Vocabulary deck"
```

---

### Task 3: Fix Declension deck — data corrections (19 fixes)

**Files:**
- Modify: `_decoded_decks/declension.html:273, 284, 309, 379-381, 396-403, 406-411, 523, 530, 534, 538, 559`

Work bottom-to-top.

- [ ] **Step 1: Fix "He like" → "He likes" in reverseEx (lines 559, 534, 523)**

In `_decoded_decks/declension.html`, replace all 3 occurrences. Line 559:
```
en:'He like the small children'
```
→
```
en:'He likes the small children'
```

Line 534:
```
en:'He like the/a old house'
```
→
```
en:'He likes the/a old house'
```

Line 523:
```
en:'He like the/a blue book'
```
→
```
en:'He likes the/a blue book'
```

- [ ] **Step 2: Fix "dunkelem" → "dunklem" (line 538) and "dunkeles" → "dunkles" (line 530)**

Line 538:
```
fullSent:'nach dunkelem Haus'
```
→
```
fullSent:'nach dunklem Haus'
```

Line 530:
```
fullSent:'dunkeles Haus ist da'
```
→
```
fullSent:'dunkles Haus ist da'
```

- [ ] **Step 3: Fix "siehen" → "sehen" (lines 406, 408, 410, 411)**

Replace all instances of `siehen` with `sehen` in the `why` field. Use replace-all since "siehen" appears nowhere else legitimately:

Lines 406, 408, 410, 411 all have:
```
why:'siehen takes a direct object
```
→
```
why:'sehen takes a direct object
```

- [ ] **Step 4: Fix verb conjugation in weil-clauses (lines 396, 398, 399, 403)**

Line 403 (ich ... kommt → komme):
```
sent:'..., weil ich von dem stark_ Bier kommt'
```
→
```
sent:'..., weil ich von dem stark_ Bier komme'
```

Line 399 (ich ... kommt → komme):
```
sent:'..., weil ich von der stark_ Katze kommt'
```
→
```
sent:'..., weil ich von der stark_ Katze komme'
```

Line 398 (wir ... kommt → kommen):
```
sent:'..., weil wir bei dem stark_ Tisch kommt'
```
→
```
sent:'..., weil wir bei dem stark_ Tisch kommen'
```

Line 396 (wir ... kommt → kommen):
```
sent:'..., weil wir bei dem frisch_ Hund kommt'
```
→
```
sent:'..., weil wir bei dem frisch_ Hund kommen'
```

- [ ] **Step 5: Fix dative plural -n on nouns (lines 379, 380, 381)**

Line 381:
```
before:'vor',adj:'alt',after:'Häuser'
```
→
```
before:'vor',adj:'alt',after:'Häusern'
```

Line 380:
```
before:'bei',adj:'alt',after:'Kinder'
```
→
```
before:'bei',adj:'alt',after:'Kindern'
```

Line 379:
```
before:'aus',adj:'wichtig',after:'Bücher'
```
→
```
before:'aus',adj:'wichtig',after:'Büchern'
```

- [ ] **Step 6: Fix "He like" → "He likes" in realEx (lines 309, 284, 273)**

Line 309:
```
en:'He like the small children'
```
→
```
en:'He likes the small children'
```

Line 284:
```
en:'He like the/a old house'
```
→
```
en:'He likes the/a old house'
```

Line 273:
```
en:'He like the/a blue book'
```
→
```
en:'He likes the/a blue book'
```

- [ ] **Step 7: Commit**

```bash
git add _decoded_decks/declension.html
git commit -m "fix: correct verb conjugation, spelling, dative plurals, and translations in Declension deck"
```

---

### Task 4: Fix Declension deck — nonsensical sentences (~22 fixes)

**Files:**
- Modify: `_decoded_decks/declension.html:384-432, 590`

All changes are in the `variedEx`, subordinate clause, and `kein` sections, plus one in `reverseEx`. Work bottom-to-top.

- [ ] **Step 1: Fix reverseEx line 590**

```
fullSent:'aus der jungen Frau'
```
→
```
fullSent:'aus der jungen Stadt'
```
Also update `en:`:
```
en:'from the/a young woman'
```
→
```
en:'from the/a young city'
```

- [ ] **Step 2: Fix kein section (lines 424-430)**

Line 430:
```
sent:'Er hat kein schnell_ Bier',adj:'schnell',why:'haben takes direct object → accusative (kein = same endings as ein)',en:'He has no fast beer'
```
→
```
sent:'Er hat kein kalt_ Bier',adj:'kalt',why:'haben takes direct object → accusative (kein = same endings as ein)',en:'He has no cold beer'
```

Line 428:
```
sent:'Er hat keine schnell_ Jacke',adj:'schnell',why:'haben takes direct object → accusative (kein = same endings as ein)',en:'He has no fast jacket'
```
→
```
sent:'Er hat keine warm_ Jacke',adj:'warm',why:'haben takes direct object → accusative (kein = same endings as ein)',en:'He has no warm jacket'
```

Line 427:
```
sent:'Er hat keine süß_ Frau',adj:'süß',why:'haben takes direct object → accusative (kein = same endings as ein)',en:'He has no sweet woman'
```
→
```
sent:'Er hat keine neue Tasche',adj:'neu',why:'haben takes direct object → accusative (kein = same endings as ein)',en:'He has no new bag'
```
Wait — the `sent` field uses a `_` placeholder for the ending. So it should be:
```
sent:'Er hat keine neu_ Tasche',adj:'neu',why:'haben takes direct object → accusative (kein = same endings as ein)',en:'He has no new bag'
```

Line 425:
```
sent:'Er hat keinen kalt_ Tisch',adj:'kalt',...,en:'He has no cold table'
```
→
```
sent:'Er hat keinen alt_ Tisch',adj:'alt',...,en:'He has no old table'
```

Line 424:
```
sent:'Er hat keinen neu_ Mann',adj:'neu',...,en:'He has no new man'
```
→
```
sent:'Er hat keinen neu_ Tisch',adj:'neu',...,en:'He has no new table'
```
Wait — line 425 is already Tisch. Let's use a different noun. Change to:
```
sent:'Er hat keinen neu_ Computer',adj:'neu',...,en:'He has no new computer'
```

- [ ] **Step 3: Fix wenn section (lines 420, 422)**

Line 422:
```
sent:'Wenn das lecker_ Haus da ist, ...',adj:'lecker',...,en:'When the tasty house is there, ...'
```
→
```
sent:'Wenn das schön_ Haus da ist, ...',adj:'schön',...,en:'When the beautiful house is there, ...'
```

Line 420:
```
sent:'Wenn das schnell_ Buch da ist, ...',adj:'schnell',...,en:'When the fast book is there, ...'
```
→
```
sent:'Wenn das neu_ Buch da ist, ...',adj:'neu',...,en:'When the new book is there, ...'
```

- [ ] **Step 4: Fix dass section (lines 406, 409, 411, 413)**

Line 413:
```
sent:'Ich glaube, dass er das nett_ Haus braucht',adj:'nett',...,en:'I think that he needs the nice house'
```
→
```
sent:'Ich glaube, dass er das schön_ Haus braucht',adj:'schön',...,en:'I think that he needs the beautiful house'
```

Line 411:
```
sent:'Ich glaube, dass er das lecker_ Buch sieht',adj:'lecker',why:'siehen takes...',en:'I think that he sees the tasty book'
```
→
```
sent:'Ich glaube, dass er das interessant_ Buch sieht',adj:'interessant',why:'sehen takes a direct object → accusative (dass clause)',en:'I think that he sees the interesting book'
```
(Note: also fixes the "siehen" typo in `why` — should already be fixed from Task 3 Step 3, but verify.)

Line 409:
```
sent:'Ich glaube, dass er die kalt_ Frau braucht',adj:'kalt',...,en:'I think that he needs the cold woman'
```
→
```
sent:'Ich glaube, dass er die alt_ Frau sieht',adj:'alt',...,en:'I think that he sees the old woman'
```

Line 406:
```
sent:'Ich glaube, dass er den frisch_ Mann sieht',adj:'frisch',why:'siehen takes...',en:'I think that he sees the fresh man'
```
→
```
sent:'Ich glaube, dass er den alt_ Mann sieht',adj:'alt',why:'sehen takes a direct object → accusative (dass clause)',en:'I think that he sees the old man'
```

- [ ] **Step 5: Fix weil section semantic issues (line 396 already fixed verb, now fix noun)**

Line 400:
```
sent:'..., weil sie aus der rot_ Frau kommt',...,en:'..., because she is from the red woman'
```
→
```
sent:'..., weil sie aus der rot_ Tasche kommt',...,en:'..., because she comes from the red bag'
```

Line 396 (already fixed verb in Task 3, now fix adjective):
```
sent:'..., weil wir bei dem frisch_ Hund kommen'
```
→
```
sent:'..., weil wir bei dem freundlich_ Hund kommen'
```
Also update `adj:'frisch'` → `adj:'freundlich'` and `en:` accordingly.

- [ ] **Step 6: Fix variedEx section (lines 384-395)**

Line 395:
```
sent:'Kaufst du das billig_ Kind?',adj:'billig',...,en:'Do you buy the cheap child?'
```
→
```
sent:'Kaufst du das billig_ Buch?',adj:'billig',...,en:'Do you buy the cheap book?'
```

Line 393:
```
sent:'Kaufst du das schnell_ Bier?',adj:'schnell',...,en:'Do you buy the fast beer?'
```
→
```
sent:'Kaufst du das kalt_ Bier?',adj:'kalt',...,en:'Do you buy the cold beer?'
```

Line 392:
```
sent:'Siehst du das kalt_ Buch?',adj:'kalt',...,en:'Do you see the cold book?'
```
→
```
sent:'Siehst du das klein_ Buch?',adj:'klein',...,en:'Do you see the small book?'
```

Line 391:
```
sent:'Siehst du die jung_ Suppe?',adj:'jung',...,en:'Do you see the young soup?'
```
→
```
sent:'Siehst du die heiß_ Suppe?',adj:'heiß',...,en:'Do you see the hot soup?'
```

Line 390:
```
sent:'Kennst du die stark_ Jacke?',adj:'stark',...,en:'Do you know the strong jacket?'
```
→
```
sent:'Kennst du die warm_ Jacke?',adj:'warm',...,en:'Do you know the warm jacket?'
```

Line 389:
```
sent:'Kaufst du die nett_ Frau?',adj:'nett',...,en:'Do you buy the nice woman?'
```
→
```
sent:'Kennst du die nett_ Frau?',adj:'nett',...,en:'Do you know the nice woman?'
```
Also update `why:` from `'question with kaufen → direct object → accusative'` to `'question with kennen → direct object → accusative'`.

Line 385:
```
sent:'Kaufst du den rot_ Mann?',adj:'rot',...,en:'Do you buy the red man?'
```
→
```
sent:'Kaufst du den rot_ Mantel?',adj:'rot',...,en:'Do you buy the red coat?'
```

Line 384:
```
sent:'Hast du den kalt_ Hund?',adj:'kalt',...,en:'Do you have the cold dog?'
```
→
```
sent:'Hast du den klein_ Hund?',adj:'klein',...,en:'Do you have the small dog?'
```

- [ ] **Step 7: Commit**

```bash
git add _decoded_decks/declension.html
git commit -m "fix: replace ~22 nonsensical adjective-noun combinations in Declension deck"
```

---

### Task 5: Fix Modal Verbs deck — distractor bug + data fixes

**Files:**
- Modify: `_decoded_decks/modal_verbs.html:134, 425-428`

- [ ] **Step 1: Fix the distractor bug in showCard()**

The current code at line 426 calls `getDistractors(correct, inf)` which pulls same-verb conjugation forms from CONJ_POOL. The BANK entries at index [5] contain hand-crafted cross-verb distractors that are never used.

In `_decoded_decks/modal_verbs.html`, replace lines 425-429:
```js
  if(!hardMode){
    var distractorList=getDistractors(correct,inf);
    var choices=[correct];
    for(var d=0;d<distractorList.length;d++)choices.push(distractorList[d]);
    shuffle(choices);
```
with:
```js
  if(!hardMode){
    var choices=[correct];
    for(var d=0;d<distractors.length;d++)choices.push(distractors[d]);
    shuffle(choices);
```

This uses the `distractors` variable already destructured at line 409: `var sentence=q[0],correct=q[2],inf=q[3],tense=q[4],distractors=q[5];`

- [ ] **Step 2: Fix English translation on line 134**

Replace:
```
"Er ___ sehr reich sein. (possibility)","He could be very rich.","kann"
```
with:
```
"Er ___ sehr reich sein. (possibility)","He can be very rich.","kann"
```

- [ ] **Step 3: Commit**

```bash
git add _decoded_decks/modal_verbs.html
git commit -m "fix: use hand-crafted cross-verb distractors in Modal Verbs deck + fix English translation"
```

---

### Task 6: Fix Modal Verbs deck — reasoning UX (text input → chips)

**Files:**
- Modify: `_decoded_decks/modal_verbs.html:496-528`

- [ ] **Step 1: Add semantic category data to BANK entries**

Each BANK entry already has a verb (index [3]) which maps to a semantic category. We need a mapping. Add this after the `EXPLANATIONS` object (around line 302):

```js
var CATEGORIES={"können":"ability","müssen":"necessity","sollen":"recommendation","wollen":"desire","dürfen":"permission","mögen":"preference","möchten":"polite wish"};
```

- [ ] **Step 2: Replace showWhyPhase() with chip-based UI**

Replace lines 496-503:
```js
function showWhyPhase(isCorrect){
  var wa=document.getElementById("whyArea");
  wa.style.display="block";
  wa.innerHTML='<div class="why-prompt">'+(isCorrect?'✓ Correct!':'✗ Incorrect.')+' Why does this verb fit here?</div><input class="why-input" id="whyInput" type="text" placeholder="e.g. permission, ability, desire…"><div style="margin-top:8px"><button class="why-btn" onclick="revealFeedback()">Reveal</button><button class="why-skip" onclick="revealFeedback()">Skip</button></div>';
  var wi=document.getElementById("whyInput");
  wi.focus();
  wi.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();revealFeedback()}});
}
```
with:
```js
function showWhyPhase(isCorrect){
  var wa=document.getElementById("whyArea");
  wa.style.display="block";
  var cats=["ability","permission","necessity","desire","recommendation","preference","polite wish"];
  var html='<div class="why-prompt">'+(isCorrect?'✓ Correct!':'✗ Incorrect.')+' Why does this verb fit?</div><div class="why-chips">';
  for(var i=0;i<cats.length;i++) html+='<button class="why-chip" onclick="pickCategory(\''+cats[i]+'\')">'+cats[i]+'</button>';
  html+='</div><div style="margin-top:8px"><button class="why-skip" onclick="revealFeedback()">Skip</button></div>';
  wa.innerHTML=html;
}
function pickCategory(cat){
  var q=BANK[currentIdx];var inf=q[3];
  var correct=CATEGORIES[inf]||"";
  window._userCat=cat;
  window._catCorrect=(cat===correct);
  revealFeedback();
}
```

- [ ] **Step 3: Update revealFeedback() to show chip result**

Replace lines 505-529:
```js
function revealFeedback(){
  var q=BANK[currentIdx];
  var correct=q[2],sentence=q[0],eng=q[1],inf=q[3],conjNote=q[6];
  var explanation=EXPLANATIONS[inf]||"";
  var isCorrect=window._lastCorrect;
  var wi=document.getElementById("whyInput");
  var userWhy=wi?wi.value.trim():"";

  document.getElementById("whyArea").style.display="none";
  var fullSentence=sentence.replace("___",correct);
  var icon=isCorrect?"✓":"✗";
  var fbClass=isCorrect?"feedback show correct-fb":"feedback show wrong-fb";

  var fbHtml='<div class="full-sentence">'+icon+' '+esc(fullSentence)+'</div>';
  fbHtml+='<div class="english">'+esc(eng)+'</div>';
  fbHtml+='<div class="explanation">'+esc(explanation)+'</div>';
  fbHtml+='<div class="conjugation-note">'+esc(conjNote)+'</div>';
  if(userWhy) fbHtml+='<div class="your-why">Your reasoning: "'+esc(userWhy)+'"</div>';

  var fb=document.getElementById("feedback");
  fb.className=fbClass;
  fb.innerHTML=fbHtml;
  document.getElementById("nextBtn").style.display="inline-block";
  document.getElementById("nextBtn").focus();
}
```
with:
```js
function revealFeedback(){
  var q=BANK[currentIdx];
  var correct=q[2],sentence=q[0],eng=q[1],inf=q[3],conjNote=q[6];
  var explanation=EXPLANATIONS[inf]||"";
  var isCorrect=window._lastCorrect;
  var correctCat=CATEGORIES[inf]||"";
  var userCat=window._userCat||"";
  var catCorrect=window._catCorrect;
  window._userCat="";window._catCorrect=undefined;

  document.getElementById("whyArea").style.display="none";
  var fullSentence=sentence.replace("___",correct);
  var icon=isCorrect?"✓":"✗";
  var fbClass=isCorrect?"feedback show correct-fb":"feedback show wrong-fb";

  var fbHtml='<div class="full-sentence">'+icon+' '+esc(fullSentence)+'</div>';
  fbHtml+='<div class="english">'+esc(eng)+'</div>';
  fbHtml+='<div class="explanation">'+esc(explanation)+'</div>';
  fbHtml+='<div class="conjugation-note">'+esc(conjNote)+'</div>';
  if(userCat){
    var catIcon=catCorrect?"✓":"✗";
    fbHtml+='<div class="your-why" style="color:'+(catCorrect?'#4ade80':'#f87171')+'">'+catIcon+' Your reasoning: '+esc(userCat)+(catCorrect?'':' → '+esc(correctCat))+'</div>';
  }

  var fb=document.getElementById("feedback");
  fb.className=fbClass;
  fb.innerHTML=fbHtml;
  document.getElementById("nextBtn").style.display="inline-block";
  document.getElementById("nextBtn").focus();
}
```

- [ ] **Step 4: Add CSS for chips**

Find the existing `.why-input` style in the `<style>` block and add chip styles after it:

```css
.why-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.why-chip{padding:6px 12px;border:1px solid #333;border-radius:16px;background:#1e1e2e;color:#c8c8d8;font-size:13px;cursor:pointer;transition:all 0.15s}
.why-chip:hover{background:#2a2a4a;border-color:#555}
```

- [ ] **Step 5: Remove the now-unused `.why-input` and `.why-btn` CSS rules**

Delete:
```css
.why-input{...}
.why-btn{...}
```
(Find exact selectors in the style block and remove them.)

- [ ] **Step 6: Commit**

```bash
git add _decoded_decks/modal_verbs.html
git commit -m "feat: replace reasoning text input with clickable semantic category chips in Modal Verbs deck"
```

---

### Task 7: Fix Pronouns deck — personal pronoun verb conjugation

**Files:**
- Modify: `_decoded_decks/pronouns.html:199-224`

This is the most complex fix. The nominative templates use 3rd-person singular verbs for all pronouns. We need per-conjugation-group templates.

- [ ] **Step 1: Replace PRT.nom with per-group templates**

Replace the single `nom` array at line 200:
```js
 nom:[['$P kommt morgen.','$P is coming tomorrow.'],['$P ist müde.','$P is tired.'],['$P hat keine Zeit.','$P has no time.'],['$P arbeitet hier.','$P works here.'],['$P spricht Deutsch.','$P speaks German.'],['$P wohnt in Zürich.','$P lives in Zürich.'],['$P lernt schnell.','$P learns fast.'],['$P braucht Hilfe.','$P needs help.']],
```
with conjugation-aware templates indexed by pronoun group:
```js
 nom:{
  ich:[['$P komme morgen.','$P is coming tomorrow.'],['$P bin müde.','$P is tired.'],['$P habe keine Zeit.','$P has no time.'],['$P arbeite hier.','$P works here.'],['$P spreche Deutsch.','$P speaks German.'],['$P wohne in Zürich.','$P lives in Zürich.'],['$P lerne schnell.','$P learns fast.'],['$P brauche Hilfe.','$P needs help.']],
  du:[['$P kommst morgen.','$P is coming tomorrow.'],['$P bist müde.','$P is tired.'],['$P hast keine Zeit.','$P has no time.'],['$P arbeitest hier.','$P works here.'],['$P sprichst Deutsch.','$P speaks German.'],['$P wohnst in Zürich.','$P lives in Zürich.'],['$P lernst schnell.','$P learns fast.'],['$P brauchst Hilfe.','$P needs help.']],
  er:[['$P kommt morgen.','$P is coming tomorrow.'],['$P ist müde.','$P is tired.'],['$P hat keine Zeit.','$P has no time.'],['$P arbeitet hier.','$P works here.'],['$P spricht Deutsch.','$P speaks German.'],['$P wohnt in Zürich.','$P lives in Zürich.'],['$P lernt schnell.','$P learns fast.'],['$P braucht Hilfe.','$P needs help.']],
  wir:[['$P kommen morgen.','$P is coming tomorrow.'],['$P sind müde.','$P is tired.'],['$P haben keine Zeit.','$P has no time.'],['$P arbeiten hier.','$P works here.'],['$P sprechen Deutsch.','$P speaks German.'],['$P wohnen in Zürich.','$P lives in Zürich.'],['$P lernen schnell.','$P learns fast.'],['$P brauchen Hilfe.','$P needs help.']],
  ihr:[['$P kommt morgen.','$P is coming tomorrow.'],['$P seid müde.','$P is tired.'],['$P habt keine Zeit.','$P has no time.'],['$P arbeitet hier.','$P works here.'],['$P sprecht Deutsch.','$P speaks German.'],['$P wohnt in Zürich.','$P lives in Zürich.'],['$P lernt schnell.','$P learns fast.'],['$P braucht Hilfe.','$P needs help.']]
 },
```

- [ ] **Step 2: Add pronoun-to-group mapping**

After the PER array (after line 198), add:
```js
var PGRP={0:'ich',1:'du',2:'er',3:'er',4:'er',5:'wir',6:'ihr',7:'wir',8:'wir'};
```
This maps each PER index to a conjugation group: ich(0), du(1), er/sie/es(2-4), wir/sie-pl/Sie(5,7,8), ihr(6).

- [ ] **Step 3: Update bPers() to use per-group nominative templates**

In the `bPers()` function at line 221, the template selection currently does:
```js
  for(var t=0;t<3;t++){var ti=(i*3+t)%PRT[cs].length;
   b.push({cat:'pers',cas:cs,gen:'per',answer:a,wp:wp.slice(),
    sB:PRT[cs][ti][0].replace('$P','___'),sF:PRT[cs][ti][0].replace('$P',a),
    eng:PRT[cs][ti][1].replace('$P',ea),hint:PER[i].l+' + '+CL[cs]});}}}
```

Replace with:
```js
  for(var t=0;t<3;t++){
   var tmplArr=cs==='nom'?PRT.nom[PGRP[i]]:PRT[cs];
   var ti=(i*3+t)%tmplArr.length;
   b.push({cat:'pers',cas:cs,gen:'per',answer:a,wp:wp.slice(),
    sB:tmplArr[ti][0].replace('$P','___'),sF:tmplArr[ti][0].replace('$P',a),
    eng:tmplArr[ti][1].replace('$P',ea),hint:PER[i].l+' + '+CL[cs]});}}}
```

- [ ] **Step 4: Commit**

```bash
git add _decoded_decks/pronouns.html
git commit -m "fix: add per-pronoun verb conjugation for nominative personal pronoun drills"
```

---

### Task 8: Fix Pronouns deck — plural verb agreement, dative -n, jeder plural

**Files:**
- Modify: `_decoded_decks/pronouns.html:117-129, 234-242, 297-301, 355-361, 384-403`

- [ ] **Step 1: Add plural-specific nominative templates for possessive pronouns**

The possessive templates at line 118 (`PT.nom`) use singular verbs like "ist hier", "kommt bald". Add plural variants. After the existing `PT.nom` array (line 129), we need to restructure so plural sentences use correct verbs.

The cleanest approach: add a `PT.nomP` array for plural templates, then select it in `bPoss()` when `gn==='p'`.

After line 129 (end of `PT.nom`), add:
```js
var PTP={
 nom:[
  ['$P $N sind hier.','$P $N are here.','A'],
  ['$P $N sind sehr gut.','$P $N are very good.','A'],
  ['Das sind $P $N.','Those are $P $N.','A'],
  ['Wo sind $P $N?','Where are $P $N?','A'],
  ['$P $N kommen bald.','$P $N are coming soon.','P'],
  ['$P $N sind nett.','$P $N are nice.','P'],
  ['$P $N funktionieren nicht.','$P $N don\'t work.','O'],
  ['$P $N sind neu.','$P $N are new.','O'],
  ['$P $N sehen toll aus.','$P $N look great.','A'],
  ['$P $N sind wichtig.','$P $N are important.','A']
 ]
};
```

Then in `bPoss()` (line 163), update the template source for nominative plural. Find:
```js
   for(var ti=0;ti<PT[cs].length;ti++){var ty=PT[cs][ti][2];if(ty==='P')tP.push(ti);else if(ty==='O')tO.push(ti);else tA.push(ti);}
```
Replace with:
```js
   var tmplSrc=(cs==='nom'&&gn==='p')?PTP.nom:PT[cs];
```
Wait — this is inside the `g` loop but `tP/tO/tA` are built outside the `g` loop. We need to restructure slightly. Actually looking at the code more carefully, line 166 builds `tP/tO/tA` before the `g` loop. We need to move this logic. Replace the inner block (lines 165-182):

```js
   for(var g=0;g<4;g++){var gn=GENDERS[g];
   var tmplSrc=(cs==='nom'&&gn==='p')?PTP.nom:PT[cs];
   var tP=[],tO=[],tA=[];
   for(var ti=0;ti<tmplSrc.length;ti++){var ty=tmplSrc[ti][2];if(ty==='P')tP.push(ti);else if(ty==='O')tO.push(ti);else tA.push(ti);}
   var a=pf(PP[i].s,cs,gn);var ep=EP[PP[i].s]||PP[i].s;
   var wp=[];for(var k=0;k<allF.length;k++){if(allF[k]!==a)wp.push(allF[k]);}
   for(var ni=0;ni<2;ni++){
    var pool,tmplSet;
    if(ni===0){pool=NP[gn];tmplSet=tP.concat(tA);}else{pool=NO[gn];tmplSet=tO.concat(tA);}
    if(!pool.length)pool=NN[gn];if(!tmplSet.length)tmplSet=tA;
    var nn=pool[(i*3+c*5+g*7+ni*11)%pool.length];
    var ti2=tmplSet[(i+c*3+g*2+ni)%tmplSet.length];
    var en=EN[gn][nn]||nn;
    b.push({cat:'poss',cas:cs,gen:gn,answer:a,wp:wp,
     sB:tmplSrc[ti2][0].replace('$P','___').replace('$N',nn),
     sF:tmplSrc[ti2][0].replace('$P',a).replace('$N',nn),
     eng:tmplSrc[ti2][1].replace('$P',ep).replace('$N',en),
     hint:PP[i].l+' + '+CL[cs]+' + '+GL[gn]});}}}}
```

(Key change: moved `tP/tO/tA` inside the `g` loop; select `tmplSrc` based on plural; use `tmplSrc` instead of `PT[cs]` for template lookup.)

- [ ] **Step 2: Add plural nominative templates for demonstrative, interrogative, and indefinite**

Same pattern. Add after `DT` definition (after line 242):
```js
var DTP={
 nom:[
  ['$P $N sind schön.','$P $N are beautiful.','A'],
  ['$P $N gefallen mir.','I like $P $N.','A'],
  ['$P $N sind nett.','$P $N are nice.','P'],
  ['$P $N funktionieren gut.','$P $N work well.','O'],
  ['$P $N kosten viel.','$P $N cost a lot.','O'],
  ['$P $N kommen heute.','$P $N are coming today.','P']
 ]
};
```

For interrogative (after line 301):
```js
var WTP={
 nom:[
  ['$P $N sind das?','Which $N are those?','A'],
  ['$P $N kommen zuerst?','Which $N come first?','A'],
  ['$P $N funktionieren?','Which $N work?','O'],
  ['$P $N sind nett?','Which $N are nice?','P']
 ]
};
```

For indefinite (after line 361):
```js
var ITP={
 nom:[
  ['$P $N sind anders.','$P $N are different.','A'],
  ['$P $N haben Vor- und Nachteile.','$P $N have pros and cons.','A'],
  ['$P $N zählen.','$P $N count.','A'],
  ['$P $N kommen zu spät.','$P $N come too late.','P'],
  ['$P $N sind kaputt.','$P $N are broken.','O']
 ]
};
```

Then update `bDem()`, `bInter()` (the welcher loop), and `bIndef()` to use the plural templates when `gn==='p'`, following the same pattern as Step 1.

- [ ] **Step 3: Add dative plural -n suffix function**

Add after the noun pools (after line 94):
```js
function datPl(noun){return(noun.slice(-1)==='n'||noun.slice(-1)==='s')?noun:noun+'n';}
```

Then in every function that builds dative sentences with plural nouns, wrap the noun through `datPl()`. This affects:
- `bPoss()` — when `cs==='dat'` and `gn==='p'`, use `datPl(nn)` instead of `nn`
- `bDem()` — same
- `bInter()` — same (welcher section)
- `bIndef()` — same (jeder/mancher and alle)

In each builder function, after `var nn=pool[...]`, add:
```js
    if(cs==='dat'&&gn==='p') nn=datPl(nn);
```

- [ ] **Step 4: Remove jeder plural forms**

In `bIndef()` at line 390, change the gender loop to skip plural for jeder:
```js
   for(var g=0;g<4;g++){var gn=GENDERS[g];
```
→
```js
   var gMax=(d===0)?3:4;
   for(var g=0;g<gMax;g++){var gn=GENDERS[g];
```

This limits `jeder` (d===0) to m/f/n, while `mancher` (d===1) keeps all 4 including plural.

- [ ] **Step 5: Commit**

```bash
git add _decoded_decks/pronouns.html
git commit -m "fix: plural verb agreement, dative plural -n suffix, and remove invalid jeder plural in Pronouns deck"
```

---

### Task 9: Re-encode all decks and reassemble german-drills.html

**Files:**
- Modify: `german-drills.html` (replace all 5 b64 values)
- Delete: `_decoded_decks/` directory

- [ ] **Step 1: Round-trip verification**

Before encoding fixed files, verify UTF-8 integrity with a round-trip test on an unmodified deck:

```bash
node -e "
const fs=require('fs');
const orig=fs.readFileSync('german-drills.html','utf8');
const m=orig.match(/name:\"Past \\/ Future\".*?b64:\"([^\"]+)\"/s);
const decoded=Buffer.from(m[1],'base64').toString('utf8');
const reencoded=Buffer.from(decoded,'utf8').toString('base64');
console.log('Match:',m[1]===reencoded);
"
```
Expected: `Match: true`

- [ ] **Step 2: Re-encode all 5 decks and replace b64 values**

```bash
node -e "
const fs=require('fs');
let html=fs.readFileSync('german-drills.html','utf8');
const decks=[
  {name:'Declension', file:'_decoded_decks/declension.html'},
  {name:'Modal Verbs', file:'_decoded_decks/modal_verbs.html'},
  {name:'Past / Future', file:'_decoded_decks/past___future.html'},
  {name:'Pronouns', file:'_decoded_decks/pronouns.html'},
  {name:'Vocabulary', file:'_decoded_decks/vocabulary.html'}
];
for(const d of decks){
  const content=fs.readFileSync(d.file,'utf8');
  const b64=Buffer.from(content,'utf8').toString('base64');
  // Replace the b64 value for this deck
  const pattern=new RegExp('(name:\"'+d.name.replace(/[\/]/g,'\\\\/')+'\".*?b64:\")([^\"]+)(\")', 's');
  html=html.replace(pattern, '\$1'+b64+'\$3');
  console.log(d.name+': encoded '+content.length+' bytes -> '+b64.length+' b64 chars');
}
fs.writeFileSync('german-drills.html',html);
console.log('Done. File size: '+fs.statSync('german-drills.html').size);
"
```

- [ ] **Step 3: Verify the re-encoded file**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('german-drills.html','utf8');
const m=[...html.matchAll(/name:\"([^\"]+)\".*?b64:\"([^\"]+)\"/gs)];
for(const d of m){
  const decoded=Buffer.from(d[2],'base64').toString('utf8');
  console.log(d[1]+': '+decoded.length+' bytes, has umlauts: '+/[äöüÄÖÜß]/.test(decoded));
}
"
```
All 5 should show `has umlauts: true`.

- [ ] **Step 4: Delete temp directory**

```bash
rm -rf _decoded_decks
```

- [ ] **Step 5: Test in browser**

Open `german-drills.html` in a browser and verify:
1. All 5 decks load without error
2. Declension: check a few of the fixed sentences appear correctly
3. Modal Verbs: verify choices show cross-verb distractors (not same-verb forms)
4. Modal Verbs: verify reasoning chips appear and validate correctly
5. Past/Future: verify "schließen" and "Fußball" display correctly
6. Pronouns: verify "ich komme morgen" (not "ich kommt morgen")
7. Vocabulary: verify no "skip" appears as example sentences

- [ ] **Step 6: Commit**

```bash
git add german-drills.html
git commit -m "build: re-encode all 5 drill decks with language fixes into german-drills.html"
```

- [ ] **Step 7: Verify clean git status**

```bash
git status
git log --oneline -10
```

Ensure `_decoded_decks/` is gone and only `german-drills.html` + docs are committed.
