# Consistency Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unified feedback, Hard Mode parity, keyboard shortcuts, and in-deck progress bar to all 5 German drill decks.

**Architecture:** Each deck is a self-contained HTML file stored as base64 in german-drills.html. Decoded copies exist in `_decoded_decks/`. Each task modifies one decoded deck to add all 4 consistency features, then the final task re-encodes everything.

**Tech Stack:** HTML/CSS/JS (vanilla), Node.js for base64 encoding.

**Spec:** `docs/superpowers/specs/2026-04-12-consistency-improvements-design.md`

---

### Task 1: Add consistency features to Declension deck

**Files:**
- Modify: `_decoded_decks/declension.html`

This deck already has Hard Mode (`hardMode` variable, `toggleHardMode()` at ~line 714). It needs: unified feedback, keyboard shortcuts, and progress bar.

- [ ] **Step 1: Add progress bar CSS**

In the `<style>` block, add after the existing styles (before `</style>`):

```css
.session-bar{position:fixed;top:0;left:0;right:0;height:4px;background:#1e1e2e;z-index:999}
.session-fill{height:100%;background:#7f5af0;border-radius:0 2px 2px 0;transition:width 0.3s}
.session-label{position:fixed;top:6px;right:12px;font-size:10px;color:#555;font-family:'DM Mono',monospace;z-index:999}
```

- [ ] **Step 2: Add progress bar HTML**

At the very top of `<body>`, before any existing content, add:

```html
<div class="session-bar"><div class="session-fill" id="sessionFill"></div></div>
<div class="session-label" id="sessionLabel"></div>
```

- [ ] **Step 3: Add progress bar update function**

In the `<script>` block, add a function to update the progress bar. This deck tracks `cur` (current index) within category arrays. Add near the top of the script (after variable declarations):

```js
var sessionAnswered=0,sessionTotal=0;
function updateSessionBar(){
  var pct=sessionTotal>0?Math.round(sessionAnswered/sessionTotal*100):0;
  document.getElementById('sessionFill').style.width=pct+'%';
  document.getElementById('sessionLabel').textContent=sessionAnswered+' / '+sessionTotal;
}
```

Then find where `sessionTotal` should be set — when a category/round starts (in the function that initializes the question list), set `sessionTotal=<length of current question set>; sessionAnswered=0; updateSessionBar();`. And where answers are recorded (in the check functions like `checkMC`, `checkReverse`, `checkComboArt`), increment `sessionAnswered++; updateSessionBar();`.

- [ ] **Step 4: Enhance feedback with unified 3-layer pattern**

Find the `showFeedback(card)` function (~line 749). It currently shows the rule and answer. Enhance it to also show:
1. The full corrected sentence (already partially there)
2. The English translation
3. A similar example from the same case/gender

The function should build feedback HTML like:

```js
function showFeedback(card){
  // Layer 1: Full corrected sentence
  var sent = card.fullSent || card.sent.replace('_','<strong>'+card.a+'</strong>');
  var html = '<div class="fb-sentence">'+sent+'</div>';
  // Layer 2: English + Rule
  if(card.en) html += '<div class="fb-english">'+card.en+'</div>';
  html += '<div class="fb-rule">'+card.why+'</div>';
  // Layer 3: Similar example (find another card with same case+gender)
  var similar = findSimilar(card);
  if(similar){
    var simSent = similar.fullSent || similar.sent.replace('_', similar.a);
    html += '<div class="fb-similar">Similar: '+simSent+'</div>';
  }
  document.getElementById('feedback-box').innerHTML = html;
  document.getElementById('feedback-box').style.display = 'block';
}
```

Add a `findSimilar(card)` function that picks a random item from the same `realEx`/`variedEx`/`comboBase` array with matching `c` (case) and `g` (gender) but different index.

Add CSS for the feedback layers:

```css
.fb-sentence{font-size:16px;font-weight:600;color:#e0e0e0;margin-bottom:6px}
.fb-english{font-size:13px;color:#8b8fa3;font-style:italic;margin-bottom:8px}
.fb-rule{font-size:12px;color:#7f5af0;margin-bottom:8px;padding:6px 10px;background:#1a1a2e;border-radius:6px}
.fb-similar{font-size:12px;color:#666;border-top:1px solid #1e1e3a;padding-top:8px;margin-top:8px}
```

- [ ] **Step 5: Add keyboard shortcuts**

Add a global keydown listener at the bottom of the script:

```js
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT')return; // don't capture when typing
  var key=e.key;
  // Number keys 1-4 for multiple choice
  if(!hardMode && key>='1' && key<='4'){
    var btns=document.querySelectorAll('.opt-btn:not([disabled]),.mc-btn:not([disabled])');
    var idx=parseInt(key)-1;
    if(idx<btns.length && !btns[idx].disabled) btns[idx].click();
  }
  // Enter to advance
  if(key==='Enter'){
    var nextBtn=document.querySelector('.next-btn:not([style*="display:none"]),.advance-btn:not([style*="display:none"])');
    if(nextBtn) nextBtn.click();
  }
  // H to toggle hard mode
  if(key==='h'||key==='H'){
    toggleHardMode();
  }
});
```

Also add `data-key` attributes to choice buttons during rendering for visual hints. In the rendering functions (`renderMC` etc.), after creating each button, add:

```js
btn.setAttribute('data-key', String(i+1));
```

And add CSS for the key hints:

```css
[data-key]{position:relative}
[data-key]::before{content:attr(data-key);position:absolute;top:3px;left:6px;font-size:10px;color:#555;font-family:monospace}
```

- [ ] **Step 6: Verify and test**

Open `_decoded_decks/declension.html` directly in a browser. Verify:
1. Progress bar appears at top and updates as you answer
2. Feedback shows all 3 layers (sentence, rule, similar example)
3. Keys 1-4 select choices, Enter advances, H toggles Hard Mode
4. Key hints show on choice buttons

---

### Task 2: Add consistency features to Modal Verbs deck

**Files:**
- Modify: `_decoded_decks/modal_verbs.html`

This deck already has Hard Mode (`hardMode` variable, checkbox at line 100). It needs: enhanced feedback (already close — add similar example), keyboard shortcuts, and progress bar.

- [ ] **Step 1: Add progress bar CSS + HTML**

In the `<style>` block, add:

```css
.session-bar{position:fixed;top:0;left:0;right:0;height:4px;background:#1e1e2e;z-index:999}
.session-fill{height:100%;background:#6366f1;border-radius:0 2px 2px 0;transition:width 0.3s}
.session-label{position:fixed;top:6px;right:12px;font-size:10px;color:#555;font-family:monospace;z-index:999}
```

At the top of `<body>`, add:

```html
<div class="session-bar"><div class="session-fill" id="sessionFill"></div></div>
<div class="session-label" id="sessionLabel"></div>
```

- [ ] **Step 2: Add progress bar tracking**

Add variables and update function. The modal verbs deck uses `sessionQueue` array and processes items via `nextCard()`. Add:

```js
var sessionSize=0;
function updateSessionBar(){
  var done=sessionSize-sessionQueue.length;
  var pct=sessionSize>0?Math.round(done/sessionSize*100):0;
  document.getElementById('sessionFill').style.width=pct+'%';
  document.getElementById('sessionLabel').textContent=done+' / '+sessionSize;
}
```

In `startSession()` (where `sessionQueue` is built), after the queue is populated, add:

```js
sessionSize=sessionQueue.length;
updateSessionBar();
```

In `nextCard()`, after shifting from queue, add `updateSessionBar();`.

- [ ] **Step 3: Enhance feedback with similar example**

In `revealFeedback()` (~line 512), after the existing feedback HTML (full sentence, English, explanation, conjugation note), add a similar example. Find another BANK item with the same `inf` (modal verb) but different index:

```js
// After existing fbHtml building, before setting innerHTML:
var simIdx=-1;
for(var s=0;s<BANK.length;s++){
  if(s!==currentIdx && BANK[s][3]===inf){simIdx=s;break;}
}
if(simIdx>=0){
  var simQ=BANK[simIdx];
  var simSent=simQ[0].replace('___',simQ[2]);
  fbHtml+='<div class="fb-similar">Similar: '+esc(simSent)+'</div>';
}
```

Add CSS:

```css
.fb-similar{font-size:12px;color:#666;border-top:1px solid #1e1e3a;padding-top:8px;margin-top:8px}
```

- [ ] **Step 4: Add keyboard shortcuts**

Add at the bottom of the script (before the closing `</script>`):

```js
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT')return;
  var key=e.key;
  if(!hardMode && !answered && key>='1' && key<='4'){
    var btns=document.querySelectorAll('.choice-btn:not([disabled])');
    var idx=parseInt(key)-1;
    if(idx<btns.length) btns[idx].click();
  }
  if(key==='Enter'){
    if(answered){
      var nb=document.getElementById('nextBtn');
      if(nb&&nb.style.display!=='none') nb.click();
    } else if(hardMode){
      submitTyped();
    }
  }
  if((key==='h'||key==='H') && e.target.tagName!=='INPUT'){
    var cb=document.getElementById('hardMode');
    cb.checked=!cb.checked;
    hardMode=cb.checked;
  }
});
```

Add `data-key` attributes during choice rendering. In `showCard()`, where choice buttons are built (~line 430), change the loop to add the attribute:

```js
for(var c=0;c<choices.length;c++) html+='<button class="choice-btn" data-key="'+(c+1)+'" data-val="'+esc(choices[c])+'" onclick="pickChoice(this)">'+esc(choices[c])+'</button>';
```

Add CSS for key hints:

```css
.choice-btn{position:relative}
.choice-btn::before{content:attr(data-key);position:absolute;top:3px;left:6px;font-size:10px;color:#555;font-family:monospace}
```

---

### Task 3: Add consistency features to Past/Future deck

**Files:**
- Modify: `_decoded_decks/past___future.html`

This deck already has Hard Mode (`hardModeOn`, checkbox #hardMode) and a progress bar. It needs: enhanced feedback (add similar example) and keyboard shortcuts.

- [ ] **Step 1: Enhance feedback with similar example**

Find `showFeedback(item, wasCorrect, chosen)` (~line 572). After the existing feedback HTML (sentence, rule, English), add a similar example. Find another item from the same data array with a similar pattern (e.g., same auxiliary or same Partizip II pattern):

```js
// After existing feedback rendering, before showing the feedback element:
var simItem=null;
for(var si=0;si<DATA.length;si++){
  if(DATA[si]!==item && DATA[si].aux===item.aux){simItem=DATA[si];break;}
}
if(simItem){
  var simSent=simItem.s.replace('_A_',simItem.af).replace('_P_',simItem.p2).replace('_W_','wird').replace('_V_',simItem.inf);
  fbHtml+='<div class="fb-similar">Similar: '+simSent+'</div>';
}
```

Add CSS:

```css
.fb-similar{font-size:12px;color:#666;border-top:1px solid #1e1e3a;padding-top:8px;margin-top:8px}
```

- [ ] **Step 2: Add keyboard shortcuts**

Add at the bottom of the script:

```js
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT')return;
  var key=e.key;
  if(!hardModeOn && key>='1' && key<='4'){
    var btns=document.querySelectorAll('.opt-btn:not([disabled])');
    var idx=parseInt(key)-1;
    if(idx<btns.length && !btns[idx].disabled) btns[idx].click();
  }
  if(key==='Enter'){
    var nb=document.querySelector('.next-btn');
    if(nb && nb.style.display!=='none') nb.click();
  }
  if(key==='h'||key==='H'){
    var cb=document.getElementById('hardMode');
    cb.checked=!cb.checked;
    hardModeOn=cb.checked;
    // Trigger the reset if needed
    cb.onchange();
  }
});
```

Add `data-key` attributes to choice buttons. In the rendering function where `opt-btn` buttons are created, add `data-key` attribute and corresponding CSS:

```css
.opt-btn{position:relative}
.opt-btn::before{content:attr(data-key);position:absolute;top:3px;left:6px;font-size:10px;color:#555;font-family:monospace}
```

- [ ] **Step 3: Ensure progress bar exists and is consistent**

This deck already has a progress bar. Verify it uses the session-progress pattern (items completed / session queue). If it tracks overall mastery instead, adjust to show session progress. Add the `.session-label` text ("X / Y") if missing.

---

### Task 4: Add consistency features to Pronouns deck

**Files:**
- Modify: `_decoded_decks/pronouns.html`

This deck has a basic Hard Mode toggle (`toggleHard()` at ~line 73). It needs: proper Hard Mode with text input, unified feedback, keyboard shortcuts, and progress bar.

- [ ] **Step 1: Add progress bar CSS + HTML**

In the `<style>` block, add:

```css
.session-bar{position:fixed;top:0;left:0;right:0;height:4px;background:#1e1e2e;z-index:999}
.session-fill{height:100%;background:#c9a84c;border-radius:0 2px 2px 0;transition:width 0.3s}
.session-label{position:fixed;top:6px;right:12px;font-size:10px;color:#555;font-family:monospace;z-index:999}
```

At the top of `<body>`, add:

```html
<div class="session-bar"><div class="session-fill" id="sessionFill"></div></div>
<div class="session-label" id="sessionLabel"></div>
```

- [ ] **Step 2: Add progress bar tracking**

The pronouns deck uses a `queue` array. Add tracking variables and update function:

```js
var sessionSize=0;
function updateSessionBar(){
  var done=sessionSize-queue.length;
  var pct=sessionSize>0?Math.round(done/sessionSize*100):0;
  document.getElementById('sessionFill').style.width=pct+'%';
  document.getElementById('sessionLabel').textContent=done+' / '+sessionSize;
}
```

Set `sessionSize=queue.length;updateSessionBar();` when a category starts. Call `updateSessionBar();` in the answer handler after recording the answer.

- [ ] **Step 3: Enhance Hard Mode with text input**

The current "Hard Mode" in Pronouns just changes the distractor pool (makes wrong answers harder to distinguish). It doesn't switch to text input. Upgrade it:

In the question rendering function (where choice buttons are created), add a conditional path:

```js
if(hard){
  // Text input mode
  var inp=document.createElement('input');
  inp.type='text';inp.className='type-input';inp.id='typeInput';
  inp.autocomplete='off';inp.spellcheck=false;
  inp.placeholder='Antwort eingeben…';
  choiceArea.appendChild(inp);
  inp.focus();
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      e.preventDefault();
      var val=inp.value.trim();
      if(!val)return;
      var isCorrect=val.toLowerCase()===q.answer.toLowerCase();
      inp.disabled=true;
      inp.className=isCorrect?'type-input correct-input':'type-input wrong-input';
      handleAnswer(isCorrect,q);
    }
  });
} else {
  // Existing multiple-choice rendering
}
```

Add CSS for the text input:

```css
.type-input{width:100%;padding:12px 16px;font-size:16px;border:2px solid #333;border-radius:8px;background:#1a1a2e;color:#e0e0e0;outline:none;font-family:inherit}
.type-input:focus{border-color:#c9a84c}
.correct-input{border-color:#4ade80!important;background:#0a2a1a}
.wrong-input{border-color:#f87171!important;background:#2a0a0a}
```

- [ ] **Step 4: Enhance feedback with unified 3-layer pattern**

In the `pick()` function (~line 600) or the new `handleAnswer()` function, replace the existing minimal feedback with the 3-layer pattern:

```js
function showUnifiedFeedback(q, isCorrect){
  var icon=isCorrect?'✓':'✗';
  var html='<div class="fb-sentence">'+icon+' '+q.sF+'</div>';
  html+='<div class="fb-english">'+q.eng+'</div>';
  html+='<div class="fb-rule">'+q.hint+'</div>';
  // Find similar: same cat and case
  var sim=null;
  for(var s=0;s<allItems.length;s++){
    if(allItems[s]!==q && allItems[s].cat===q.cat && allItems[s].cas===q.cas){sim=allItems[s];break;}
  }
  if(sim) html+='<div class="fb-similar">Similar: '+sim.sF+'</div>';
  document.getElementById('fb').innerHTML=html;
  document.getElementById('fb').style.display='block';
}
```

Add feedback CSS:

```css
.fb-sentence{font-size:16px;font-weight:600;color:#e0e0e0;margin-bottom:6px}
.fb-english{font-size:13px;color:#8b8fa3;font-style:italic;margin-bottom:8px}
.fb-rule{font-size:12px;color:#c9a84c;margin-bottom:8px;padding:6px 10px;background:#1a1a2e;border-radius:6px}
.fb-similar{font-size:12px;color:#666;border-top:1px solid #1e1e3a;padding-top:8px;margin-top:8px}
```

- [ ] **Step 5: Add keyboard shortcuts**

```js
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT')return;
  var key=e.key;
  if(!hard && key>='1' && key<='4'){
    var btns=document.querySelectorAll('.opt:not([disabled])');
    var idx=parseInt(key)-1;
    if(idx<btns.length) btns[idx].click();
  }
  if(key==='Enter'){
    var nb=document.querySelector('.next-btn,.nxt-btn');
    if(nb) nb.click();
  }
  if(key==='h'||key==='H'){
    toggleHard();
  }
});
```

Add `data-key` to choice buttons and CSS:

```css
.opt{position:relative}
.opt::before{content:attr(data-key);position:absolute;top:3px;left:6px;font-size:10px;color:#555;font-family:monospace}
```

---

### Task 5: Add consistency features to Vocabulary deck

**Files:**
- Modify: `_decoded_decks/vocabulary.html`

This deck already has Hard Mode (checkbox #hardMode). It needs: enhanced feedback (add rule layer + similar example), keyboard shortcuts, and progress bar verification.

- [ ] **Step 1: Verify/enhance progress bar**

This deck likely has a progress bar already. Verify it shows session progress (items done / session total). If it only shows mastery, add session tracking. If it already has session tracking, ensure the HTML/CSS matches the consistent pattern:

```css
.session-bar{position:fixed;top:0;left:0;right:0;height:4px;background:#1e1e2e;z-index:999}
.session-fill{height:100%;background:#4ade80;border-radius:0 2px 2px 0;transition:width 0.3s}
.session-label{position:fixed;top:6px;right:12px;font-size:10px;color:#555;font-family:monospace;z-index:999}
```

- [ ] **Step 2: Enhance feedback with rule layer + similar example**

In the `answer()` function (~line 2554), after showing the existing feedback (gender, word, translation, example sentence), add:

1. A brief usage/rule note (for nouns: gender reminder; for verbs: conjugation hint; for adjectives: common pairing)
2. A similar word from the same CEFR level

```js
// After existing feedback HTML:
// Add similar word from same level
var simWord=null;
for(var sw=0;sw<WORDS.length;sw++){
  if(sw!==curIdx && WORDS[sw][2]===item[2] && WORDS[sw][1]===item[1]){simWord=WORDS[sw];break;}
}
if(simWord){
  fbHtml+='<div class="fb-similar">Related: '+simWord[0]+' — '+simWord[3]+'</div>';
}
```

Add CSS:

```css
.fb-similar{font-size:12px;color:#666;border-top:1px solid #1e1e3a;padding-top:8px;margin-top:8px}
```

- [ ] **Step 3: Add keyboard shortcuts**

Add at the bottom of the script:

```js
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  var key=e.key;
  var isHard=document.getElementById('hardMode').checked;
  if(!isHard && !answered && key>='1' && key<='5'){
    var btns=document.querySelectorAll('.opt:not(.correct):not(.wrong)');
    var idx=parseInt(key)-1;
    if(idx<btns.length) btns[idx].click();
  }
  if(key==='Enter'){
    if(answered){
      nextQ();
    }
  }
  if(key==='h'||key==='H'){
    var cb=document.getElementById('hardMode');
    cb.checked=!cb.checked;
  }
});
```

Note: Vocabulary has up to 5 choices (not 4), so key range is 1-5.

Add `data-key` to choice options during rendering and CSS:

```css
.opt{position:relative}
.opt::before{content:attr(data-key);position:absolute;top:3px;left:6px;font-size:10px;color:#555;font-family:monospace}
```

---

### Task 6: Re-encode all decks and reassemble german-drills.html

**Files:**
- Modify: `german-drills.html`
- Delete: `_decoded_decks/`

- [ ] **Step 1: Round-trip verification**

```bash
node -e "
const fs=require('fs');
const orig=fs.readFileSync('german-drills.html','utf8');
const m=orig.match(/name:\"Past \\/ Future\".*?b64:\"([^\"]+)\"/s);
const decoded=Buffer.from(m[1],'base64').toString('utf8');
const reencoded=Buffer.from(decoded,'utf8').toString('base64');
console.log('Round-trip match:',m[1]===reencoded);
"
```

Expected: `Round-trip match: true`

- [ ] **Step 2: Re-encode all 5 decks**

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
  const escaped=d.name.replace(/\//g,'\\\\/');
  const pattern=new RegExp('(name:\"'+escaped+'\".*?b64:\")([^\"]+)(\")', 's');
  html=html.replace(pattern, '\$1'+b64+'\$3');
  console.log(d.name+': '+content.length+' bytes -> '+b64.length+' b64 chars');
}
fs.writeFileSync('german-drills.html',html);
console.log('Done. File size:',fs.statSync('german-drills.html').size);
"
```

- [ ] **Step 3: Verify re-encoded file**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('german-drills.html','utf8');
const m=[...html.matchAll(/name:\"([^\"]+)\".*?b64:\"([^\"]+)\"/gs)];
for(const d of m){
  const decoded=Buffer.from(d[2],'base64').toString('utf8');
  console.log(d[1]+': '+decoded.length+' bytes, umlauts: '+/[äöüÄÖÜß]/.test(decoded));
}
"
```

All 5 should decode correctly with umlauts.

- [ ] **Step 4: Delete temp directory**

```bash
rm -rf _decoded_decks
```

- [ ] **Step 5: Test in browser**

Open `german-drills.html` and verify for each deck:
1. Progress bar at top, updates as you answer
2. 3-layer feedback (sentence → rule → similar example)
3. Keyboard shortcuts (1-4 select, Enter advances, H toggles Hard Mode)
4. Hard Mode works in Declension and Pronouns (text input)
5. Key hints visible on choice buttons

- [ ] **Step 6: Commit and push**

```bash
git add german-drills.html
git commit -m "feat: add unified feedback, Hard Mode parity, keyboard shortcuts, and progress bar to all 5 decks"
git push origin main
```
