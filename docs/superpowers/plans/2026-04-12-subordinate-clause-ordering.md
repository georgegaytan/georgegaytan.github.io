# Subordinate Clause Word Ordering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sentence construction exercise to the Declension deck where learners arrange word chunks into correct German subordinate clause word order (verb-final, separable verb rejoining, modal+infinitive order).

**Architecture:** New data array `wordOrderEx` with sentence data, new `cat:'wordorder'` type, new `renderWordOrder()` function for click-to-order UI, integrated into `buildGame()` mixed practice. Reuses existing `#options` div for chip layout and `#combo-sent` for the fixed clause prefix.

**Tech Stack:** HTML/CSS/JS (vanilla), Node.js for base64 encoding.

---

### Task 1: Add word order data and rendering

**Files:**
- Modify: `_decoded_decks/declension.html`

This is one large task because the data, CSS, rendering, and checking logic are all tightly coupled. Read the entire file first to understand the existing patterns (`render()`, `buildGame()`, `tag()`, `recordStat()`, `showFeedback()`, `doAdvance()`).

- [ ] **Step 1: Add CSS for word-order chips**

In the `<style>` block, add after existing styles:

```css
.wo-prefix{font-size:16px;color:#888;margin-bottom:8px;font-style:italic}
.wo-slots{display:flex;flex-wrap:wrap;gap:6px;min-height:44px;padding:10px;background:#16162a;border:2px dashed #2a2a3a;border-radius:10px;margin-bottom:12px}
.wo-slots.correct{border-color:#4ade80;background:rgba(74,222,128,0.05)}
.wo-slots.wrong{border-color:#f87171;background:rgba(248,113,113,0.05)}
.wo-chip{padding:8px 14px;border-radius:8px;font-size:15px;font-weight:500;cursor:pointer;transition:all 0.15s;user-select:none;-webkit-user-select:none}
.wo-chip.available{background:#1e1e2e;border:1px solid #2a2a3a;color:#e0e0e0}
.wo-chip.available:hover{border-color:#555}
.wo-chip.placed{background:#7f5af015;border:1px solid #7f5af0;color:#7f5af0}
.wo-chip.placed:hover{opacity:0.7}
.wo-check-btn{margin-top:10px;padding:10px 24px;border:none;border-radius:8px;font-size:14px;font-weight:600;color:#fff;background:#7f5af0;cursor:pointer}
.wo-check-btn:disabled{background:#2a2a2a;color:#555;cursor:default}
```

- [ ] **Step 2: Add word order sentence data**

After the existing `reverseEx` array (and before the pool/function declarations), add:

```js
var wordOrderEx = [
  // === Type 1: Verb-final (dass/weil/wenn) ===
  {prefix:"Nico sagt, dass",chunks:["er","jeden Tag","Deutsch","lernt"],correct:"er jeden Tag Deutsch lernt",en:"Nico says that he learns German every day.",rule:"dass → verb goes to end",conj:"dass"},
  {prefix:"Ich bleibe zu Hause, weil",chunks:["ich","heute","krank","bin"],correct:"ich heute krank bin",en:"I'm staying home because I'm sick today.",rule:"weil → verb goes to end",conj:"weil"},
  {prefix:"Er fragt, ob",chunks:["du","morgen","Zeit","hast"],correct:"du morgen Zeit hast",en:"He asks if you have time tomorrow.",rule:"ob → verb goes to end",conj:"ob"},
  {prefix:"Sie sagt, dass",chunks:["wir","am Samstag","nach Berlin","fahren"],correct:"wir am Samstag nach Berlin fahren",en:"She says that we're going to Berlin on Saturday.",rule:"dass → verb goes to end",conj:"dass"},
  {prefix:"Ich weiß, dass",chunks:["er","sehr gut","Gitarre","spielt"],correct:"er sehr gut Gitarre spielt",en:"I know that he plays guitar very well.",rule:"dass → verb goes to end",conj:"dass"},
  {prefix:"Wir gehen nicht raus, weil",chunks:["es","draußen","stark","regnet"],correct:"es draußen stark regnet",en:"We don't go outside because it's raining heavily.",rule:"weil → verb goes to end",conj:"weil"},
  {prefix:"Ich bin froh, wenn",chunks:["du","mich","morgen","besuchst"],correct:"du mich morgen besuchst",en:"I'm happy when you visit me tomorrow.",rule:"wenn → verb goes to end",conj:"wenn"},
  {prefix:"Er erzählt, dass",chunks:["sie","in München","gewohnt","hat"],correct:"sie in München gewohnt hat",en:"He says that she lived in Munich.",rule:"dass → auxiliary goes to end (Perfekt)",conj:"dass"},
  {prefix:"Ich bin müde, weil",chunks:["ich","gestern","nicht gut","geschlafen","habe"],correct:"ich gestern nicht gut geschlafen habe",en:"I'm tired because I didn't sleep well yesterday.",rule:"weil → auxiliary goes to end (Perfekt)",conj:"weil"},
  {prefix:"Sie ist glücklich, weil",chunks:["sie","die Prüfung","bestanden","hat"],correct:"sie die Prüfung bestanden hat",en:"She's happy because she passed the exam.",rule:"weil → auxiliary goes to end (Perfekt)",conj:"weil"},

  // === Type 2: Separable verbs rejoin ===
  {prefix:"Ich bin müde, weil",chunks:["ich","jeden Tag","früh","aufstehe"],correct:"ich jeden Tag früh aufstehe",en:"I'm tired because I get up early every day.",rule:"weil + separable verb → prefix rejoins (auf+stehe)",conj:"weil"},
  {prefix:"Er sagt, dass",chunks:["der Zug","um 8 Uhr","abfährt"],correct:"der Zug um 8 Uhr abfährt",en:"He says that the train departs at 8.",rule:"dass + separable verb → prefix rejoins (ab+fährt)",conj:"dass"},
  {prefix:"Sie fragt, ob",chunks:["du","heute Abend","mitkommst"],correct:"du heute Abend mitkommst",en:"She asks if you're coming along tonight.",rule:"ob + separable verb → prefix rejoins (mit+kommst)",conj:"ob"},
  {prefix:"Ich weiß, dass",chunks:["er","immer","spät","einschläft"],correct:"er immer spät einschläft",en:"I know that he always falls asleep late.",rule:"dass + separable verb → prefix rejoins (ein+schläft)",conj:"dass"},
  {prefix:"Es ist schön, wenn",chunks:["die Sonne","am Morgen","aufgeht"],correct:"die Sonne am Morgen aufgeht",en:"It's nice when the sun rises in the morning.",rule:"wenn + separable verb → prefix rejoins (auf+geht)",conj:"wenn"},
  {prefix:"Er ist traurig, weil",chunks:["seine Freundin","nächste Woche","wegzieht"],correct:"seine Freundin nächste Woche wegzieht",en:"He's sad because his girlfriend is moving away next week.",rule:"weil + separable verb → prefix rejoins (weg+zieht)",conj:"weil"},
  {prefix:"Sie sagt, dass",chunks:["das Geschäft","um 9 Uhr","aufmacht"],correct:"das Geschäft um 9 Uhr aufmacht",en:"She says the shop opens at 9.",rule:"dass + separable verb → prefix rejoins (auf+macht)",conj:"dass"},

  // === Type 3: Modal + infinitive order ===
  {prefix:"Er sagt, dass",chunks:["er","heute","nicht","arbeiten","muss"],correct:"er heute nicht arbeiten muss",en:"He says that he doesn't have to work today.",rule:"dass + modal → infinitive before modal at end",conj:"dass"},
  {prefix:"Ich weiß, dass",chunks:["du","gut","schwimmen","kannst"],correct:"du gut schwimmen kannst",en:"I know that you can swim well.",rule:"dass + modal → infinitive before modal at end",conj:"dass"},
  {prefix:"Sie ist froh, weil",chunks:["sie","morgen","nicht","arbeiten","muss"],correct:"sie morgen nicht arbeiten muss",en:"She's happy because she doesn't have to work tomorrow.",rule:"weil + modal → infinitive before modal at end",conj:"weil"},
  {prefix:"Er fragt, ob",chunks:["ich","ihm","helfen","kann"],correct:"ich ihm helfen kann",en:"He asks if I can help him.",rule:"ob + modal → infinitive before modal at end",conj:"ob"},
  {prefix:"Ich bin froh, dass",chunks:["wir","endlich","nach Hause","gehen","dürfen"],correct:"wir endlich nach Hause gehen dürfen",en:"I'm glad that we're finally allowed to go home.",rule:"dass + modal → infinitive before modal at end",conj:"dass"},
  {prefix:"Sie sagt, dass",chunks:["er","Deutsch","lernen","will"],correct:"er Deutsch lernen will",en:"She says that he wants to learn German.",rule:"dass + modal → infinitive before modal at end",conj:"dass"},
  {prefix:"Ich verstehe, warum",chunks:["du","das","nicht","machen","willst"],correct:"du das nicht machen willst",en:"I understand why you don't want to do that.",rule:"warum + modal → infinitive before modal at end",conj:"warum"},
  {prefix:"Es ist wichtig, dass",chunks:["man","die Regeln","verstehen","kann"],correct:"man die Regeln verstehen kann",en:"It's important that one can understand the rules.",rule:"dass + modal → infinitive before modal at end",conj:"dass"}
];
```

- [ ] **Step 3: Add `renderWordOrder()` function**

After the existing `renderComboOptions()` function, add:

```js
function renderWordOrder(card){
    var optEl=document.getElementById('options');
    optEl.innerHTML='';
    
    // Slots area (where placed chunks appear)
    var slotsDiv=document.createElement('div');
    slotsDiv.className='wo-slots';
    slotsDiv.id='wo-slots';
    optEl.appendChild(slotsDiv);
    
    // Available chunks (shuffled)
    var shuffled=shuffle(card.chunks.slice());
    var chipArea=document.createElement('div');
    chipArea.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:8px';
    chipArea.id='wo-chips';
    
    for(var i=0;i<shuffled.length;i++){
        var chip=document.createElement('div');
        chip.className='wo-chip available';
        chip.textContent=shuffled[i];
        chip.setAttribute('data-word',shuffled[i]);
        chip.onclick=(function(c){return function(){woToggle(c)}})(chip);
        chipArea.appendChild(chip);
    }
    optEl.appendChild(chipArea);
    
    // Check button
    var btn=document.createElement('button');
    btn.className='wo-check-btn';
    btn.id='wo-check';
    btn.textContent='Check order';
    btn.disabled=true;
    btn.onclick=function(){woCheck(card)};
    optEl.appendChild(btn);
}

var woPlaced=[];

function woToggle(chip){
    if(locked)return;
    var word=chip.getAttribute('data-word');
    var slots=document.getElementById('wo-slots');
    
    if(chip.className.indexOf('placed')>=0){
        // Remove from slots, put back in available
        chip.className='wo-chip available';
        var idx=woPlaced.indexOf(word);
        if(idx>=0)woPlaced.splice(idx,1);
        // Move chip back to chips area
        document.getElementById('wo-chips').appendChild(chip);
    } else {
        // Place in slots
        chip.className='wo-chip placed';
        woPlaced.push(word);
        slots.appendChild(chip);
    }
    
    // Enable check button when all chunks are placed
    var btn=document.getElementById('wo-check');
    if(btn)btn.disabled=(woPlaced.length!==deck[cur].chunks.length);
}

function woCheck(card){
    if(locked)return;
    locked=true;
    var userAnswer=woPlaced.join(' ');
    var correct=(userAnswer===card.correct);
    var slots=document.getElementById('wo-slots');
    
    if(correct){
        slots.className='wo-slots correct';
        cc++;
    } else {
        slots.className='wo-slots wrong';
        wc++;
        // Show correct order
        var corrDiv=document.createElement('div');
        corrDiv.style.cssText='margin-top:8px;color:#f87171;font-size:13px';
        corrDiv.innerHTML='Correct: <strong>'+card.prefix+' '+card.correct+'.</strong>';
        document.getElementById('options').appendChild(corrDiv);
        // Requeue for retry
        if(cur+3<deck.length){
            var retry={};for(var k in card)retry[k]=card[k];
            retry.isRetry=true;
            deck.splice(cur+3+Math.floor(Math.random()*4),0,retry);
        }
    }
    
    recordStat(card,correct);
    updateCatAccuracy(card,correct);
    document.getElementById('wo-check').style.display='none';
    document.getElementById('wo-chips').style.display='none';
    
    // Show feedback using existing system
    showFeedback(card);
    updateStats();
}
```

- [ ] **Step 4: Integrate into `render()` function**

In the `render()` function, after computing `var isReverse=card.cat==='reverse';`, add:

```js
    var isWordOrder=card.cat==='wordorder';
```

Then add a new branch in the if/else chain. Before the `else if(isCombo)` branch, add:

```js
    if(isWordOrder){
        pEl.textContent='Arrange the words in correct subordinate clause order:';
        qEl.style.display='none';
        cl.textContent='Subordinate clause \u2014 '+card.conj;cl.style.color='#7f5af0';
        var prefixEl=document.getElementById('combo-sent');
        prefixEl.innerHTML='<span class="wo-prefix">'+card.prefix+'</span>';
        prefixEl.style.display='block';
        if(card.rule&&hl<2){wEl.textContent=card.rule;wEl.style.display='block';}
        woPlaced=[];
        renderWordOrder(card);
    } else if(isReverse){
```

(This replaces the existing `if(isReverse){` with `if(isWordOrder){...} else if(isReverse){`.)

- [ ] **Step 5: Integrate into `buildGame()` function**

In `buildGame()`, add word order sentences to the mixed practice section. After the existing `m7` line and before `var mixed=shuffle(...)`:

```js
    var m8=tag(buildN(wordOrderEx,50),'Subordinate Clauses','wordorder');
```

Then update the mixed concat:

```js
    var mixed=shuffle(m1.concat(m2).concat(m3).concat(m4).concat(m5).concat(m6).concat(m7).concat(m8));
```

- [ ] **Step 6: Update `showFeedback()` to handle wordorder cards**

In `showFeedback()`, the function builds feedback HTML using `card.fullSent` or `card.sent`. Word order cards have neither — they have `card.prefix` + `card.correct`. Find where the corrected sentence is built and add a wordorder branch:

```js
    // At the start of feedback HTML building:
    var corrSent;
    if(card.cat==='wordorder'){
        corrSent=card.prefix+' '+card.correct+'.';
    } else {
        corrSent=card.fullSent||(card.sent?card.sent.replace(card.adj+'_',card.adj+card.a):card.a);
    }
```

Use `corrSent` wherever the full sentence is displayed in feedback. Also ensure `card.en` is used for the English line and `card.rule` for the rule line.

- [ ] **Step 7: Update `getPattern()` for wordorder type**

In `getPattern()`, add before the final `return ''`:

```js
    if(card.cat==='wordorder'){
        return card.conj+' clause \u2192 '+card.rule;
    }
```

- [ ] **Step 8: Update `recordStat()` key for wordorder**

The existing `recordStat()` uses `card.c+'_'+card.g+'_'+(card.t||card.cat)`. Word order cards don't have `c` or `g`. Add a guard:

```js
function recordStat(card,correct){
    var k;
    if(card.cat==='wordorder'){
        k='wordorder_'+card.conj;
    } else {
        k=card.c+'_'+card.g+'_'+(card.t||card.cat);
    }
    if(!catStats[k])catStats[k]={c:0,w:0};
    if(correct)catStats[k].c++;else catStats[k].w++;
    saveStats();
}
```

Similarly update `getWeakness()` and `hintLevel()` to handle the same key format.

---

### Task 2: Re-encode and push

**Files:**
- Modify: `german-drills.html`
- Delete: `_decoded_decks/`

- [ ] **Step 1: Re-encode**

```bash
node -e "
const fs=require('fs');
let html=fs.readFileSync('german-drills.html','utf8');
const content=fs.readFileSync('_decoded_decks/declension.html','utf8');
const b64=Buffer.from(content,'utf8').toString('base64');
const pattern=new RegExp('(name:\"Declension\".*?b64:\")([^\"]+)(\")', 's');
html=html.replace(pattern, '\$1'+b64+'\$3');
fs.writeFileSync('german-drills.html',html);
console.log('Done:',content.length,'bytes');
"
```

- [ ] **Step 2: Clean up, commit, push**

```bash
rm -rf _decoded_decks
git add german-drills.html docs/superpowers/plans/2026-04-12-subordinate-clause-ordering.md
git commit -m "feat: add subordinate clause word ordering exercise to Declension deck

Three patterns: verb-final (dass/weil/wenn), separable verb rejoining,
and modal+infinitive order. ~25 sentences with click-to-order chip UI."
git push origin main
```
