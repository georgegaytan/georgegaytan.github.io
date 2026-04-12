# German Drills — Consistency Improvements

## Summary

Unify the learning experience across all 5 drill decks so they feel like one cohesive app. Four features: unified feedback template, Hard Mode in all decks, keyboard shortcuts everywhere, and an in-deck progress bar.

All changes stay within the single offline HTML architecture (base64-encoded decks in german-drills.html).

## 1. Unified Feedback Template

Every deck shows the same three-layer feedback structure after each answer, backed by SLA research (metalinguistic feedback + noticing the gap + context anchoring):

**Layer 1 — Corrected sentence:** The full sentence with the correct answer filled in, plus English translation.

**Layer 2 — Brief rule:** One-line metalinguistic explanation of why the answer is correct.

**Layer 3 — Similar example:** One additional example from the same deck showing the same pattern in a different sentence. Pulled from existing question data (same case/gender, same verb pattern, same modal, etc.) — no new content needed.

### Per-deck changes:

- **Declension**: Has the rule already. Add: full corrected sentence display, English translation, and one cross-referenced example from the same case/gender/article-type.
- **Modal Verbs**: Has semantic explanation + full sentence already. Add: one similar example sentence using the same modal verb from the BANK array.
- **Past/Future**: Has construction rule already. Add: full corrected sentence display and one similar example with the same verb pattern (e.g., another irregular ge+X+en verb).
- **Pronouns**: Has case/gender info already. Add: full corrected sentence display and one similar example from the same pronoun category/case.
- **Vocabulary**: Has example sentence already. Add: brief usage note and one related word from the same CEFR level.

### Feedback HTML structure (consistent across all decks):

```html
<div class="feedback show correct-fb"> <!-- or wrong-fb -->
  <div class="full-sentence">✓ Ich helfe dem alten Mann.</div>
  <div class="english">I help the old man.</div>
  <div class="rule">mit/bei/von → Dative. Dative masculine: dem + -en ending</div>
  <div class="similar">Similar: Er spricht mit dem neuen Lehrer.</div>
</div>
```

### CSS classes (shared pattern, each deck implements with its own styling):

- `.full-sentence` — bold, larger text, shows the complete correct answer
- `.english` — muted color, italic, English translation
- `.rule` — small label style, the metalinguistic explanation
- `.similar` — muted, smaller, the context example

## 2. Hard Mode Parity

Add Hard Mode (text input instead of multiple choice) to Declension and Pronouns. Modal Verbs, Past/Future, and Vocabulary already have it.

### Declension Hard Mode:
- Toggle checkbox at top of deck, matching existing UI pattern
- In Hard Mode, user types the ending (e.g., "-en") or the article+ending combo depending on question type
- For realEx questions: type the adjective ending (e.g., "-en", "-e", "-es")
- For comboBase questions: type both article and ending (e.g., "dem -en")
- For reverseEx questions: identify case + gender (e.g., "Accusative Masculine") — keep as multiple choice even in Hard Mode since these are identification, not production
- Accept answers case-insensitively, trim whitespace
- Enter key submits

### Pronouns Hard Mode:
- Toggle checkbox at top of deck, matching existing UI pattern
- User types the pronoun form (e.g., "meinem", "dieser", "welchem") instead of picking from choice buttons
- Accept answers case-insensitively, trim whitespace
- Enter key submits

### UI pattern (matching existing decks):
```html
<label style="..."><input type="checkbox" id="hardMode"> Hard Mode</label>
```
Position: top-right area of the deck header, next to any existing controls.

## 3. Keyboard Shortcuts

Unified shortcut set across all 5 decks:

| Key | Action | When active |
|-----|--------|-------------|
| 1, 2, 3, 4 | Select choice option | Multiple-choice phase only |
| Enter | Submit answer / advance to next | Always (text input submit, or next question) |
| H | Toggle Hard Mode | Always |
| Escape | No action | Reserved (wrapper handles back navigation) |

### Implementation:
- Single `document.addEventListener('keydown', handler)` per deck
- Number keys only active during choice phase, disabled during feedback
- Guard against double-submission (check `answered` flag)
- Visual hints: small number labels ("1", "2", etc.) in the top-left corner of each choice button so users discover the shortcuts

### Visual hint CSS:
```css
.choice-btn::before { 
  content: attr(data-key); 
  position: absolute; top: 4px; left: 6px; 
  font-size: 10px; color: #555; font-family: monospace; 
}
```

Each choice button gets `data-key="1"`, `data-key="2"`, etc. during rendering.

## 4. In-Deck Progress Bar

Thin progress bar at the top of every deck showing session progress.

### Visual design:
- 4px height, full width, positioned at very top of the deck
- Background: #1e1e2e (dark, subtle)
- Fill color: deck's theme accent color (inherited from DECKS[].color in wrapper)
- Small right-aligned text label below: "12 / 30" format, monospace, muted

### Progress calculation per deck:
- **SRS decks** (Modal Verbs, Past/Future, Vocabulary): `items completed this session / session queue length`
- **Non-SRS decks** (Declension, Pronouns): `questions answered this session / total questions in current category or round`

### HTML structure:
```html
<div class="session-bar">
  <div class="session-fill" style="width: 40%"></div>
</div>
<div class="session-label">12 / 30</div>
```

### Behavior:
- Fills left-to-right as questions are answered
- Updates after each answer (before feedback phase)
- Resets when starting a new session or switching categories
- Stays visible during feedback

## Implementation Workflow

1. Decode all 5 decks from german-drills.html to temp files
2. Implement changes in each decoded deck file
3. Re-encode and reassemble german-drills.html
4. Delete temp files
5. Test in browser
6. Commit and push to main

## Constraints

- Single HTML file, works offline
- No external dependencies beyond Google Fonts (already loaded)
- Must not break existing localStorage progress data
- Each deck remains a self-contained HTML document (loaded via iframe srcdoc)
- Deck theme colors are defined in the wrapper DECKS array — progress bar color must be hardcoded per deck since decks don't receive props from wrapper
