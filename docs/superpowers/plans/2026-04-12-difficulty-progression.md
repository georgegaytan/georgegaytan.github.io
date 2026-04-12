# Difficulty Progression — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add progressive hint hiding to Declension and Past/Future decks so learners can't rely on visible hints instead of internalizing rules.

**Architecture:** Both decks already have mastery tracking (Declension uses catStats accuracy, Past/Future uses Leitner buckets 0-3). We add conditional hint visibility based on mastery level. Decoded decks are in `_decoded_decks/`.

**Tech Stack:** HTML/CSS/JS (vanilla), Node.js for base64 encoding.

---

### Task 1: Declension — progressive hint hiding

**Files:**
- Modify: `_decoded_decks/declension.html`

The Declension deck has a per-category accuracy tracker (`catStats`). The `shouldAutoHard()` function already checks if accuracy >= 80% after 10+ answers to auto-escalate to text input. We'll use the same approach for hint hiding.

**Current behavior:** The `render()` function always shows:
- Case label (line 859): "Accusative — Masculine"
- Article hint via `artHint(card)` (lines 887, 894): "der + ___" or "ein + ___"
- Why text (line 882, 891): "mit always takes dative"

**New behavior:**
- At low accuracy (< 70% or < 5 answers): Show everything (case label, article hint, why text)
- At medium accuracy (>= 70%, 5+ answers): Hide the article hint (force learner to remember "which article goes with dative masculine?")
- At high accuracy (>= 85%, 10+ answers): Also hide the "why" explanation text

- [ ] **Step 1: Add a `hintLevel()` function**

After `shouldAutoHard()` (~line 751), add:

```js
function hintLevel(card){
    var k=card.c+'_'+card.g+'_'+(card.t||card.cat);
    var s=catStats[k];
    if(!s)return 0;
    var total=s.c+s.w;
    if(total<5)return 0;
    var acc=s.c/total;
    if(acc>=0.85&&total>=10)return 2; // hide article hint + why
    if(acc>=0.70)return 1; // hide article hint
    return 0; // show everything
}
```

- [ ] **Step 2: Conditionally hide article hint in render()**

In `render()`, find where `artHint(card)` is used for `isReal` questions (~line 887):
```js
    var h=artHint(card);
    pEl.textContent='Fill in the adjective ending:';
    qEl.textContent=h?h+' + ___':'no article + ___';
```

Wrap in hint level check:
```js
    var hl=hintLevel(card);
    var h=artHint(card);
    pEl.textContent='Fill in the adjective ending:';
    if(hl>=1){
        qEl.textContent='___ + ___';qEl.className='question small';
    } else {
        qEl.textContent=h?h+' + ___':'no article + ___';qEl.className='question small';
    }
```

Do the same for the `isAdj` branch (~line 894):
```js
    var h2=artHint(card);
    pEl.textContent='What is the adjective ending?';
    if(hl>=1){
        qEl.textContent='___ + ___';qEl.className='question small';
    } else {
        qEl.textContent=h2?h2+' + ___':'no article + ___';qEl.className='question small';
    }
```

Note: `hl` was already computed above for `isReal` — but `isAdj` is a different branch. Compute `hl` once at the top of `render()` after getting the card:
```js
var card=deck[cur];
var hl=hintLevel(card);
```

- [ ] **Step 3: Conditionally hide "why" text at high accuracy**

In `render()`, find where the why text is shown (~line 882 for combo, ~line 891 for isReal):
```js
    if(card.why){wEl.textContent=card.why;wEl.style.display='block';}
```

Change to:
```js
    if(card.why&&hl<2){wEl.textContent=card.why;wEl.style.display='block';}
```

Apply this to all locations where `wEl` (why text) is shown.

- [ ] **Step 4: Add visual indicator when hints are hidden**

When hints are hidden, show a small subtle label so the user understands why they're not seeing the hint. After computing `hl` in `render()`, add:

```js
    // Show mastery indicator when hints are progressively hidden
    if(hl>=1){
        var ml=document.createElement('span');
        ml.className='retry-badge';
        ml.style.cssText='background:#1a2e1a;color:#4ade80;margin-left:6px';
        ml.textContent=hl>=2?'recall mode':'partial hints';
        sl.appendChild(ml);
    }
```

---

### Task 2: Past/Future — progressive hint hiding

**Files:**
- Modify: `_decoded_decks/past___future.html`

The Past/Future deck uses Leitner buckets (0-3). Currently the hint always shows the infinitive. We'll hide hints based on bucket level.

**Current behavior (`renderQuestion()`):**
- Partizip II questions (line 488): `hintStr = d.inf + " → ?"` — always shows infinitive
- Auxiliary questions (line 493): `hintStr = d.inf + " → haben oder sein?"` — always shows infinitive
- Futur I questions (line 499): `hintStr = d.subj + " + werden → ?"` — always shows subject

**New behavior:**
- Bucket 0 (new): Show full hint (infinitive, "haben oder sein?", subject)
- Bucket 1 (learning): Show abbreviated hint (just the question type, no infinitive)
- Bucket 2+ (familiar/mastered): Hide hint entirely

- [ ] **Step 1: Add bucket-conditional hints in renderQuestion()**

In `renderQuestion()`, find the Partizip II hint (~line 488):
```js
    hintStr=(d.p2===d.inf)?"Partizip II? (inseparable prefix)":(d.inf+" → ?");
```

Replace with:
```js
    if(item.bucket===0){
        hintStr=(d.p2===d.inf)?"Partizip II? (inseparable prefix)":(d.inf+" → ?");
    } else if(item.bucket===1){
        hintStr="Partizip II → ?";
    } else {
        hintStr="";
    }
```

Find the auxiliary hint (~line 493):
```js
    hintStr=d.inf+" → haben oder sein?";
```

Replace with:
```js
    if(item.bucket===0){
        hintStr=d.inf+" → haben oder sein?";
    } else if(item.bucket===1){
        hintStr="haben oder sein?";
    } else {
        hintStr="";
    }
```

Find the Futur I hint (~line 499):
```js
    hintStr=d.subj+" + werden → ?";
```

Replace with:
```js
    if(item.bucket===0){
        hintStr=d.subj+" + werden → ?";
    } else if(item.bucket===1){
        hintStr="werden → ?";
    } else {
        hintStr="";
    }
```

- [ ] **Step 2: Keep the bucket indicator but update format**

The bucket label (line 506-507) currently prepends to hintStr:
```js
    var bucketLabel=["●○○○","●●○○","●●●○","●●●●"][item.bucket]||"●○○○";
    hintStr=bucketLabel+" "+hintStr;
```

This is fine — when hintStr is empty, it'll just show the bucket dots. No change needed here.

- [ ] **Step 3: Show the infinitive in feedback for hidden-hint questions**

When the hint was hidden (bucket 1+), the feedback should reveal the infinitive so the learner can connect the Partizip II to its base form. In `showFeedback()`, the feedback already shows the rule (`d.r`), which includes the infinitive pattern. Verify this is sufficient.

If the infinitive is NOT shown in feedback, add it. Find where `fbRule` is set and ensure it includes the infinitive:

```js
// In showFeedback, after setting fbRule:
if(item.bucket>=1 && item.type!=="fut"){
    document.getElementById("fbRule").textContent += " ("+item.data.inf+")";
}
```

---

### Task 3: Re-encode and push

**Files:**
- Modify: `german-drills.html`
- Delete: `_decoded_decks/`

- [ ] **Step 1: Re-encode both decks**

```bash
node -e "
const fs=require('fs');
let html=fs.readFileSync('german-drills.html','utf8');
[{name:'Declension',file:'_decoded_decks/declension.html'},{name:'Past / Future',file:'_decoded_decks/past___future.html'}].forEach(d=>{
  const content=fs.readFileSync(d.file,'utf8');
  const b64=Buffer.from(content,'utf8').toString('base64');
  const escaped=d.name.replace(/\//g,'\\\\/');
  const pattern=new RegExp('(name:\"'+escaped+'\".*?b64:\")([^\"]+)(\")', 's');
  html=html.replace(pattern, '\$1'+b64+'\$3');
  console.log(d.name+': '+content.length+' bytes');
});
fs.writeFileSync('german-drills.html',html);
console.log('Done');
"
```

- [ ] **Step 2: Verify and clean up**

```bash
rm -rf _decoded_decks
```

- [ ] **Step 3: Commit and push**

```bash
git add german-drills.html docs/superpowers/plans/2026-04-12-difficulty-progression.md
git commit -m "feat: progressive hint hiding in Declension and Past/Future decks"
git push origin main
```
