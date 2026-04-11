# German Drills Language Fixes

## Summary

Comprehensive language error audit and fix across all 5 drill decks in `german-drills.html`. The file contains base64-encoded HTML for each deck. Workflow: decode -> fix -> re-encode -> reassemble.

## Fixes by Deck

### 1. Declension (~40 fixes)

**Data corrections:**
- Lines 396, 398: "kommt" -> "kommen" (wir subject)
- Lines 399, 403: "kommt" -> "komme" (ich subject)
- Lines 406, 408, 410, 411: "siehen" -> "sehen"
- Lines 273, 284, 309, 523, 534, 559: "He like" -> "He likes"
- Line 530: "dunkeles" -> "dunkles"; Line 538: "dunkelem" -> "dunklem"
- Lines 379-381: Add dative -n to plural nouns (Büchern, Kindern, Häusern)

**Nonsensical sentence replacements (~22):**

Original audit catches:
- "Kaufst du den roten Mann?" -> "den roten Mantel" (coat)
- "Kaufst du die nette Frau?" -> "Kennst du die nette Frau?"
- "die starke Jacke" -> "die warme Jacke"
- "die junge Suppe" -> "die heiße Suppe"
- "Kaufst du das billige Kind?" -> "das billige Buch"
- "bei dem frischen Hund" -> "bei dem freundlichen Hund"
- "das leckere Buch" -> "das interessante Buch"
- "das schnelle Buch" -> "das neue Buch"
- "das leckere Haus" -> "das schöne Haus"
- "das schnelle Bier" -> "das kalte Bier"
- "aus der roten Frau" -> "aus der roten Tasche"

Additional catches from code review:
- Line 384: "den kalten Hund" -> "den kleinen Hund"
- Line 392: "das kalte Buch" -> "das kleine Buch"
- Line 406: "den frischen Mann" -> "den alten Mann"
- Line 409: "die kalte Frau" -> "die alte Frau"
- Line 413: "das nette Haus" -> "das schöne Haus"
- Line 414: "der billige Hund" -> "der kleine Hund"
- Line 424: "keinen neuen Mann" -> "keinen neuen Tisch"
- Line 425: "keinen kalten Tisch" -> "keinen alten Tisch"
- Line 427: "keine süße Frau" -> "keine neue Tasche"
- Line 428: "keine schnelle Jacke" -> "keine warme Jacke"
- Line 430: "kein schnelles Bier" -> "kein kaltes Bier"
- Line 590: "aus der jungen Frau" -> "aus der jungen Stadt"

### 2. Modal Verbs (code bug + UX + data)

**Distractor bug fix:**
- `getDistractors()` currently pulls same-verb conjugation forms from CONJ_POOL
- Fix: in `showCard()`, read `q[5]` (the per-question distractors array from BANK entries, which contains forms from different modal verbs) as the primary distractor source
- Fall back to CONJ_POOL only when BANK distractors are insufficient

**Reasoning UX change (separate task, implement after bug fixes):**
- Replace free-text input in `showWhyPhase()` with clickable semantic-category chips
- Categories: ability, permission, necessity, desire, politeness, rumor/hearsay
- Validate user's selection against the question's semantic category
- Show correct/incorrect feedback

**Data fixes:**
- Fix English: "He could be very rich" -> "He can be very rich" (line 134)

### 3. Past/Future (2 fixes)

- Line 133: "schliessen" -> "schließen"
- Line 231: "Fussball" -> "Fußball"

### 4. Pronouns (4 systematic fixes)

**Verb conjugation for personal pronouns (nominative):**
- Create separate nominative template sets per pronoun conjugation group:
  - ich-forms: komme, bin, habe, arbeite, spreche, wohne, lerne, brauche
  - du-forms: kommst, bist, hast, arbeitest, sprichst, wohnst, lernst, brauchst
  - er/sie/es-forms: kommt, ist, hat, arbeitet, spricht, wohnt, lernt, braucht (existing)
  - wir/sie(pl)/Sie-forms: kommen, sind, haben, arbeiten, sprechen, wohnen, lernen, brauchen
  - ihr-forms: kommt, seid, habt, arbeitet, sprecht, wohnt, lernt, braucht

**Plural verb agreement (all non-personal categories):**
- Add plural-specific nominative templates using plural verbs (sind, kommen, funktionieren, gefallen, etc.)
- Select plural templates when gender === 'p'

**Dative plural -n suffix:**
- Add transformation function: if noun doesn't end in -n or -s, append -n in dative plural
- Apply in all dative plural sentence generation

**Remove jeder plural:**
- In `bIndef()`, when d === 0 (jeder), limit loop to g < 3 (m, f, n only), skip plural
- mancher (d === 1) keeps all 4 genders since "manche" (plural) is valid German

### 5. Vocabulary (6 fixes)

- Line 1757: Replace "skip" with "Ich bereite das Essen vor."
- Line 1787: Replace "skip" with "Er ist ein hartherziger Mensch."
- Line 1034: Remove malformed duplicate "Löhne (Pl.)/Lohn, Löhne" (line 1958 has correct version)
- Lines 952/1708: Remove duplicate Anschluss (keep B1 version at 952)
- Lines 1925/2113: Remove duplicate Empfang (keep B1 version at 2113)
- Lines 1635/2117: Remove duplicate Gegenstand (keep 2117 with full plural)

## Implementation Workflow

1. Make fixes in each `_decoded_decks/*.html` file, working bottom-to-top within each file to avoid line-number drift
2. Run round-trip encoding verification (decode -> re-encode -> decode -> diff) to confirm UTF-8 integrity
3. Re-encode each fixed file to base64
4. Replace the b64 values in `german-drills.html`
5. Delete `_decoded_decks/` temp directory
6. Test by opening in browser

## Risk

- Base64 re-encoding must preserve UTF-8 correctly (umlauts, ß)
- Line references from audit are approximate; verify each fix location before editing
- Pronouns verb conjugation fix is an architectural change — test by generating all personal pronoun questions and verifying each sentence
