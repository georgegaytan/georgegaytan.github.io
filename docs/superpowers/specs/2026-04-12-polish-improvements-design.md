# German Drills — Polish Improvements

## Summary

Three UX polish features: visual consistency across all 5 decks, an enhanced progress dashboard on the menu screen, and progress export/import for backup.

All changes stay within the single offline HTML architecture.

## 1. Visual Consistency

Normalize the shared visual properties across all 5 decks. Each deck keeps its own CSS class names but gets matching values for common elements. Body backgrounds and option layouts (grid vs flex) are intentionally NOT normalized — each deck keeps its ambient feel and layout.

### Unified color tokens:

| Token | Value | Used for |
|-------|-------|----------|
| Correct | #4ade80 | Correct answer highlight, correct choice border, correct text-input border |
| Wrong | #f87171 | Wrong answer highlight, wrong choice border, wrong text-input border |
| Feedback bg | #1a1a1a | Feedback container background |
| Feedback border | #1e1e3a | Feedback container border, dividers |
| Button bg | #1e1e2e | Choice button default background |
| Button border | #2a2a3a | Choice button default border |
| Button hover border | #555 | Choice button hover state |

Note: "Reveal correct" styling (showing the right answer when user got it wrong) is kept per-deck — some use green, some use blue. This is not normalized since it's a deliberate per-deck design choice.

Note: Modal Verbs' per-result feedback coloring (green-tinted bg for correct, red-tinted bg for wrong) is preserved — only the base feedback container properties are normalized.

### Unified button dimensions:

- Padding: 14px 16px
- Border: 1px solid #2a2a3a
- Border-radius: 10px
- Font-size: 16px
- Transition: all 0.15s

### Unified text input (Hard Mode) dimensions:

- Padding: 12px 16px
- Border: 2px solid #333
- Border-radius: 8px
- Font-size: 16px
- Background: #1a1a2e
- Correct border: #4ade80
- Wrong border: #f87171

### Unified feedback container:

- Padding: 16px
- Background: #1a1a1a
- Border-radius: 10px
- Margin-top: 12px
- Border: 1px solid #1e1e3a

### Unified next/advance button:

- Padding: 10px 24px
- Border: none
- Border-radius: 8px
- Font-size: 14px
- Font-weight: 600
- Color: #fff
- Background: each deck's accent color
- Cursor: pointer

### What is NOT normalized (intentionally preserved):

- Body background colors (each deck has its own ambient feel)
- Option layout (grid 2-col vs flex column — structural difference)
- Reveal-correct highlight color (green vs blue per deck)
- Modal Verbs correct-fb/wrong-fb tinted backgrounds
- Declension combo-blank and submit button styling (unique to that deck)

### Per-deck changes:

Each deck's CSS gets updated to match the unified values above. No JS changes — purely CSS normalization. The specific selectors vary per deck (`.opt-btn`, `.choice-btn`, `.opt`, `.option-btn`) but the property values become consistent.

## 2. Progress Dashboard

Enhance the menu screen (the wrapper HTML, not the individual decks) with richer progress information.

### Dynamic subtitle:

Replace the static `"5 decks · tap to start"` with a computed summary showing:
- Overall mastery percentage (simple average of `pct` values across decks with progress data)
- Weakest deck callout (the deck with the lowest `pct`, using `d.name` for display)
- Example: `"42% mastered · Declension needs work"` or `"5 decks · tap to start"` if no progress exists yet

### Streak badges on deck cards:

- Store streak data per deck in a new localStorage key: `gd_streaks`
- Format: `{"gd_stats_v2": {"date": "2026-04-12", "streak": 3}, "modal-verb-srs": {"date": "2026-04-11", "streak": 5}, ...}`
- Sub-keys use each deck's `storeKey` value (matching the existing DECKS array)
- Each deck updates its streak entry when a session starts:
  - If `date` is today: no change (already recorded)
  - If `date` is yesterday: increment `streak`, set `date` to today
  - Otherwise: reset `streak` to 1, set `date` to today
- Show a small badge on the deck card: "🔥 3" if streak >= 2 days
- No badge if streak is 0 or 1

### Implementation in wrapper:

Add `getOverallStats()` function that:
1. Calls `getProgress(d)` for each deck
2. Filters to decks with progress data
3. Computes simple average of `pct` values
4. Finds the deck with the lowest `pct`
5. Returns `{overallPct, weakestName, deckCount}`

Add `getStreak(storeKey)` function that:
1. Reads `gd_streaks` from localStorage
2. Returns the `streak` value for the given storeKey, or 0

Update `buildMenu()` to:
1. Call `getOverallStats()` and update the subtitle
2. Call `getStreak()` for each deck and add badge HTML to cards

### Streak tracking from decks:

Each deck writes to `gd_streaks` directly in localStorage when it initializes (the iframe has `allow-same-origin` and shares localStorage with the parent). Add to each deck's init:

```js
(function(){
  var SK='<deck_storeKey>';
  var streaks=JSON.parse(localStorage.getItem('gd_streaks')||'{}');
  var today=new Date().toISOString().slice(0,10);
  var entry=streaks[SK]||{date:'',streak:0};
  if(entry.date===today){/* already recorded */}
  else{
    var yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    entry.streak=(entry.date===yesterday)?entry.streak+1:1;
    entry.date=today;
  }
  streaks[SK]=entry;
  localStorage.setItem('gd_streaks',JSON.stringify(streaks));
})();
```

## 3. Progress Export/Import

Two utility buttons on the menu screen for backing up and restoring progress.

### Export button:

- Position: below the deck list, centered, small muted style
- On click:
  1. Read all 6 localStorage keys (5 deck keys + gd_streaks)
  2. Bundle into JSON: `{version:1, exported:<ISO timestamp>, data:{...}}`
  3. Create a Blob, generate object URL, trigger download via hidden `<a>` element
  4. Filename: `german-drills-backup-YYYY-MM-DD.json`

### Import button:

- Position: next to Export button, same style
- On click:
  1. Trigger hidden `<input type="file" accept=".json">`
  2. Read the selected file via FileReader
  3. Parse JSON, validate: must have `version` field equal to 1 and `data` key that is an object
  4. Show `confirm("This will replace your current progress. Continue?")` — abort if user cancels
  5. Whitelist: only write keys that match the 6 known localStorage keys (ignore any others in the file)
  6. For each whitelisted key in `data`, write to localStorage
  7. Call `buildMenu()` to refresh progress display
  8. Show brief inline confirmation: "Progress restored!" (fades after 2 seconds)
  9. If `version` is not 1, show alert: "Unsupported backup version" and abort

### Known localStorage keys (whitelist):

```
gd_stats_v2
modal-verb-srs
germanDrill_pastfuture_v1
germanDrill_pronouns_v1
vocabDrill_v1
gd_streaks
```

### UI style:

```html
<div class="backup-row">
  <button class="backup-btn" onclick="exportProgress()">↓ Export</button>
  <button class="backup-btn" onclick="importProgress()">↑ Import</button>
</div>
<input type="file" id="importFile" accept=".json" style="display:none">
```

CSS: monospace font, 11px, color #555, border 1px solid #333, background transparent, padding 6px 12px, border-radius 6px. Hover: border-color #555, color #888.

### Data format:

```json
{
  "version": 1,
  "exported": "2026-04-12T10:30:00Z",
  "data": {
    "gd_stats_v2": { ... },
    "modal-verb-srs": { ... },
    "germanDrill_pastfuture_v1": { ... },
    "germanDrill_pronouns_v1": { ... },
    "vocabDrill_v1": { ... },
    "gd_streaks": { ... }
  }
}
```

## Implementation Workflow

1. Decode all 5 decks
2. Update CSS in each deck for visual consistency + text input normalization
3. Add streak-tracking code to each deck's init
4. Update wrapper HTML (menu screen) for dashboard + export/import
5. Re-encode and reassemble
6. Test in browser
7. Commit and push to main

## Constraints

- Single HTML file, works offline
- No external dependencies beyond Google Fonts
- Must not break existing localStorage progress data
- Export format must be forward-compatible (version field for future changes)
- Streak tracking must not interfere with existing deck storage keys
- Import must whitelist keys and confirm before overwriting
