# Polish Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual consistency (CSS normalization), progress dashboard with streaks, and export/import backup across all 5 drill decks and the wrapper menu.

**Architecture:** Each deck is a decoded HTML file in `_decoded_decks/`. Tasks 1-5 update each deck's CSS + add streak tracking. Task 6 updates the wrapper menu. Task 7 re-encodes and pushes.

**Tech Stack:** HTML/CSS/JS (vanilla), Node.js for base64 encoding.

**Spec:** `docs/superpowers/specs/2026-04-12-polish-improvements-design.md`

---

### Task 1: CSS normalization + streak tracking — Declension

**Files:**
- Modify: `_decoded_decks/declension.html`

- [ ] **Step 1: Normalize choice button CSS**

Read the file and find the CSS rules for `.option-btn` (the choice buttons). Update the properties to match the unified spec:

```css
/* Target properties for .option-btn */
padding: 14px 16px;
border: 1px solid #2a2a3a;
border-radius: 10px;
font-size: 16px;
background: #1e1e2e;
transition: all 0.15s;
```

For hover state: `border-color: #555;`

For correct state (`.option-btn.correct` or similar): `border-color: #4ade80; background: rgba(74,222,128,0.1);`

For wrong state: `border-color: #f87171; background: rgba(248,113,113,0.1);`

- [ ] **Step 2: Normalize text input (Hard Mode) CSS**

Find CSS for the hard mode text input. Update:

```css
padding: 12px 16px;
border: 2px solid #333;
border-radius: 8px;
font-size: 16px;
background: #1a1a2e;
```

Correct input: `border-color: #4ade80;`
Wrong input: `border-color: #f87171;`

- [ ] **Step 3: Normalize feedback container CSS**

Find the feedback container CSS (`.feedback-box` or similar). Update:

```css
padding: 16px;
background: #1a1a1a;
border-radius: 10px;
margin-top: 12px;
border: 1px solid #1e1e3a;
```

- [ ] **Step 4: Normalize next/advance button CSS**

Find the next/advance button CSS. Update:

```css
padding: 10px 24px;
border: none;
border-radius: 8px;
font-size: 14px;
font-weight: 600;
color: #fff;
background: #7f5af0; /* Declension accent */
cursor: pointer;
```

- [ ] **Step 5: Add streak tracking to init**

Find the script initialization point (where the deck first runs JS on load). Add this self-executing function early in the script:

```js
(function(){
  var SK='gd_stats_v2';
  var streaks=JSON.parse(localStorage.getItem('gd_streaks')||'{}');
  var today=new Date().toISOString().slice(0,10);
  var entry=streaks[SK]||{date:'',streak:0};
  if(entry.date!==today){
    var yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    entry.streak=(entry.date===yesterday)?entry.streak+1:1;
    entry.date=today;
  }
  streaks[SK]=entry;
  localStorage.setItem('gd_streaks',JSON.stringify(streaks));
})();
```

---

### Task 2: CSS normalization + streak tracking — Modal Verbs

**Files:**
- Modify: `_decoded_decks/modal_verbs.html`

- [ ] **Step 1: Normalize choice button CSS**

Find `.choice-btn` CSS. Update:

```css
padding: 14px 16px;
border: 1px solid #2a2a3a;
border-radius: 10px;
font-size: 16px;
background: #1e1e2e;
transition: all 0.15s;
```

Hover: `border-color: #555;`
Correct (`.correct-pick`): `border-color: #4ade80; background: rgba(74,222,128,0.1);`
Wrong (`.wrong-pick`): `border-color: #f87171; background: rgba(248,113,113,0.1);`
Reveal (`.reveal-correct`): keep existing green/blue per deck

- [ ] **Step 2: Normalize text input CSS**

Find `.type-input` CSS. Update:

```css
padding: 12px 16px;
border: 2px solid #333;
border-radius: 8px;
font-size: 16px;
background: #1a1a2e;
```

`.correct-input`: `border-color: #4ade80;`
`.wrong-input`: `border-color: #f87171;`

- [ ] **Step 3: Normalize feedback container CSS**

Find `.feedback` CSS. Update base properties (keep `.correct-fb`/`.wrong-fb` tinted variants):

```css
padding: 16px;
background: #1a1a1a;
border-radius: 10px;
margin-top: 12px;
border: 1px solid #1e1e3a;
```

- [ ] **Step 4: Normalize next button CSS**

Find `.next-btn` CSS. Update:

```css
padding: 10px 24px;
border: none;
border-radius: 8px;
font-size: 14px;
font-weight: 600;
color: #fff;
background: #6366f1; /* Modal Verbs accent */
cursor: pointer;
```

- [ ] **Step 5: Add streak tracking**

Add to init (early in script):

```js
(function(){
  var SK='modal-verb-srs';
  var streaks=JSON.parse(localStorage.getItem('gd_streaks')||'{}');
  var today=new Date().toISOString().slice(0,10);
  var entry=streaks[SK]||{date:'',streak:0};
  if(entry.date!==today){
    var yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    entry.streak=(entry.date===yesterday)?entry.streak+1:1;
    entry.date=today;
  }
  streaks[SK]=entry;
  localStorage.setItem('gd_streaks',JSON.stringify(streaks));
})();
```

---

### Task 3: CSS normalization + streak tracking — Past/Future

**Files:**
- Modify: `_decoded_decks/past___future.html`

Same pattern as Tasks 1-2. Normalize:
- `.opt-btn`: padding 14px 16px, border 1px solid #2a2a3a, border-radius 10px, font-size 16px, background #1e1e2e
- `.opt-btn.correct`: border-color #4ade80
- `.opt-btn.wrong`: border-color #f87171
- Text input (if exists): padding 12px 16px, border 2px solid #333, border-radius 8px, correct #4ade80, wrong #f87171
- Feedback container: padding 16px, background #1a1a1a, border-radius 10px, border 1px solid #1e1e3a
- Next button: padding 10px 24px, border none, border-radius 8px, font-size 14px, font-weight 600, background #5fa8e0 (Past/Future accent)

- [ ] **Step 1: Read file and normalize all CSS properties as described above**

- [ ] **Step 2: Add streak tracking**

```js
(function(){
  var SK='germanDrill_pastfuture_v1';
  var streaks=JSON.parse(localStorage.getItem('gd_streaks')||'{}');
  var today=new Date().toISOString().slice(0,10);
  var entry=streaks[SK]||{date:'',streak:0};
  if(entry.date!==today){
    var yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    entry.streak=(entry.date===yesterday)?entry.streak+1:1;
    entry.date=today;
  }
  streaks[SK]=entry;
  localStorage.setItem('gd_streaks',JSON.stringify(streaks));
})();
```

---

### Task 4: CSS normalization + streak tracking — Pronouns

**Files:**
- Modify: `_decoded_decks/pronouns.html`

Same pattern. Normalize:
- `.opt`: padding 14px 16px, border 1px solid #2a2a3a, border-radius 10px, font-size 16px, background #1e1e2e
- `.opt.correct`: border-color #4ade80
- `.opt.wrong`: border-color #f87171
- `.type-input`: padding 12px 16px, border 2px solid #333, border-radius 8px, correct #4ade80, wrong #f87171
- Feedback: padding 16px, background #1a1a1a, border-radius 10px, border 1px solid #1e1e3a
- Next button: background #c9a84c (Pronouns accent)

- [ ] **Step 1: Read file and normalize all CSS properties**

- [ ] **Step 2: Add streak tracking**

```js
(function(){
  var SK='germanDrill_pronouns_v1';
  var streaks=JSON.parse(localStorage.getItem('gd_streaks')||'{}');
  var today=new Date().toISOString().slice(0,10);
  var entry=streaks[SK]||{date:'',streak:0};
  if(entry.date!==today){
    var yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    entry.streak=(entry.date===yesterday)?entry.streak+1:1;
    entry.date=today;
  }
  streaks[SK]=entry;
  localStorage.setItem('gd_streaks',JSON.stringify(streaks));
})();
```

---

### Task 5: CSS normalization + streak tracking — Vocabulary

**Files:**
- Modify: `_decoded_decks/vocabulary.html`

Same pattern. Normalize:
- `.opt`: padding 14px 16px, border 1px solid #2a2a3a, border-radius 10px, font-size 16px, background #1e1e2e
- `.opt.correct`: border-color #4ade80
- `.opt.wrong`: border-color #f87171
- Feedback (`.fb`): padding 16px, background #1a1a1a, border-radius 10px, border 1px solid #1e1e3a
- Next/advance button: background #4ade80 (Vocabulary accent)

- [ ] **Step 1: Read file and normalize all CSS properties**

- [ ] **Step 2: Add streak tracking**

```js
(function(){
  var SK='vocabDrill_v1';
  var streaks=JSON.parse(localStorage.getItem('gd_streaks')||'{}');
  var today=new Date().toISOString().slice(0,10);
  var entry=streaks[SK]||{date:'',streak:0};
  if(entry.date!==today){
    var yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    entry.streak=(entry.date===yesterday)?entry.streak+1:1;
    entry.date=today;
  }
  streaks[SK]=entry;
  localStorage.setItem('gd_streaks',JSON.stringify(streaks));
})();
```

---

### Task 6: Wrapper — Progress Dashboard + Export/Import

**Files:**
- Modify: `german-drills.html` (the wrapper, lines 1-165 — only the non-base64 parts)

- [ ] **Step 1: Add CSS for backup buttons and streak badges**

In the `<style>` block (before `</style>` at line 37), add:

```css
.backup-row{display:flex;gap:8px;justify-content:center;margin-top:24px}
.backup-btn{font-family:'DM Mono',monospace;font-size:11px;color:#555;border:1px solid #333;background:transparent;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.15s}
.backup-btn:hover{border-color:#555;color:#888}
.restore-msg{text-align:center;color:#4ade80;font-size:12px;font-family:'DM Mono',monospace;margin-top:8px;opacity:0;transition:opacity 0.3s}
.restore-msg.show{opacity:1}
.streak-badge{display:inline-block;font-size:10px;color:#facc15;font-family:'DM Mono',monospace;margin-left:6px}
```

- [ ] **Step 2: Add backup buttons and hidden file input to HTML**

After the `<div class="deck-list" id="deckList"></div>` (line 44), add:

```html
  <div class="backup-row">
    <button class="backup-btn" onclick="exportProgress()">↓ Export</button>
    <button class="backup-btn" onclick="importProgress()">↑ Import</button>
  </div>
  <div class="restore-msg" id="restoreMsg"></div>
  <input type="file" id="importFile" accept=".json" style="display:none" onchange="handleImport(this)">
```

- [ ] **Step 3: Add getOverallStats() function**

In the `<script>` block, after `getProgress()` and before `buildMenu()`, add:

```js
function getOverallStats(){
  var pcts=[],weakest=null,weakPct=101;
  for(var i=0;i<DECKS.length;i++){
    var p=getProgress(DECKS[i]);
    if(p){
      pcts.push(p.pct);
      if(p.pct<weakPct){weakPct=p.pct;weakest=DECKS[i].name;}
    }
  }
  if(!pcts.length)return null;
  var sum=0;for(var j=0;j<pcts.length;j++)sum+=pcts[j];
  return{overallPct:Math.round(sum/pcts.length),weakestName:weakest,deckCount:pcts.length};
}

function getStreak(storeKey){
  try{
    var streaks=JSON.parse(localStorage.getItem('gd_streaks')||'{}');
    var entry=streaks[storeKey];
    if(!entry)return 0;
    var today=new Date().toISOString().slice(0,10);
    var yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    if(entry.date===today||entry.date===yesterday)return entry.streak;
    return 0;
  }catch(e){return 0;}
}
```

- [ ] **Step 4: Update buildMenu() with dashboard + streaks**

Replace the existing `buildMenu()` function with:

```js
function buildMenu(){
  // Update subtitle with overall stats
  var stats=getOverallStats();
  var sub=document.getElementById("subtitle");
  if(stats){
    sub.textContent=stats.overallPct+"% mastered · "+stats.weakestName+" needs work";
  } else {
    sub.textContent="5 decks · tap to start";
  }

  var list=document.getElementById("deckList");
  list.innerHTML="";
  for(var i=0;i<DECKS.length;i++){
    var d=DECKS[i];
    var prog=getProgress(d);
    var streak=getStreak(d.storeKey);
    var card=document.createElement("div");
    card.className="deck-card";
    card.onclick=(function(idx){return function(){openDeck(idx)}})(i);
    var progHtml="";
    if(prog){
      progHtml='<div class="progress-bar"><div class="progress-fill" style="width:'+prog.pct+'%;background:'+d.color+'"></div></div>'
        +'<div class="progress-label">'+prog.label+'</div>';
    }
    var streakHtml="";
    if(streak>=2) streakHtml='<span class="streak-badge">🔥 '+streak+'</span>';
    card.innerHTML='<div class="accent" style="background:linear-gradient(90deg,'+d.color+','+d.color+'aa)"></div>'
      +'<span class="icon">'+d.icon+'</span>'
      +'<div class="name">'+d.name+streakHtml+'</div>'
      +'<div class="desc">'+d.desc+'</div>'
      +'<span class="badge" style="background:'+d.color+'15;color:'+d.color+'">'+d.badge+'</span>'
      +progHtml;
    list.appendChild(card);
  }
}
```

- [ ] **Step 5: Add export function**

```js
var KNOWN_KEYS=['gd_stats_v2','modal-verb-srs','germanDrill_pastfuture_v1','germanDrill_pronouns_v1','vocabDrill_v1','gd_streaks'];

function exportProgress(){
  var data={};
  for(var i=0;i<KNOWN_KEYS.length;i++){
    var raw=localStorage.getItem(KNOWN_KEYS[i]);
    if(raw){try{data[KNOWN_KEYS[i]]=JSON.parse(raw);}catch(e){}}
  }
  var backup={version:1,exported:new Date().toISOString(),data:data};
  var blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='german-drills-backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 6: Add import function**

```js
function importProgress(){
  document.getElementById('importFile').click();
}

function handleImport(input){
  var file=input.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var backup=JSON.parse(e.target.result);
      if(!backup.version||!backup.data||typeof backup.data!=='object'){
        alert('Invalid backup file.');return;
      }
      if(backup.version!==1){
        alert('Unsupported backup version: '+backup.version);return;
      }
      if(!confirm('This will replace your current progress. Continue?'))return;
      for(var i=0;i<KNOWN_KEYS.length;i++){
        if(backup.data[KNOWN_KEYS[i]]!==undefined){
          localStorage.setItem(KNOWN_KEYS[i],JSON.stringify(backup.data[KNOWN_KEYS[i]]));
        }
      }
      buildMenu();
      var msg=document.getElementById('restoreMsg');
      msg.textContent='Progress restored!';
      msg.className='restore-msg show';
      setTimeout(function(){msg.className='restore-msg';},2000);
    }catch(ex){
      alert('Error reading backup file.');
    }
    input.value='';
  };
  reader.readAsText(file);
}
```

---

### Task 7: Re-encode all decks, commit, and push

**Files:**
- Modify: `german-drills.html`
- Delete: `_decoded_decks/`

- [ ] **Step 1: Re-encode all 5 decks**

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

- [ ] **Step 2: Verify**

```bash
node -e "const fs=require('fs');const html=fs.readFileSync('german-drills.html','utf8');const m=[...html.matchAll(/name:\"([^\"]+)\".*?b64:\"([^\"]+)\"/gs)];for(const d of m){const decoded=Buffer.from(d[2],'base64').toString('utf8');console.log(d[1]+': '+decoded.length+' bytes, umlauts: '+/[äöüÄÖÜß]/.test(decoded));}"
```

- [ ] **Step 3: Clean up, commit, push**

```bash
rm -rf _decoded_decks
git add german-drills.html docs/superpowers/specs/2026-04-12-polish-improvements-design.md docs/superpowers/plans/2026-04-12-polish-improvements.md
git commit -m "feat: visual consistency, progress dashboard with streaks, and export/import backup"
git push origin main
```
