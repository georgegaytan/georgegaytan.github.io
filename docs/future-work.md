# Future work

Ideas captured during sessions, not yet planned.

## Post-answer explanations for every exercise

After landing the storage redesign (Option D), enhance every drill item — across all decks — with a brief post-answer explanation. Today, when the user answers, they see correctness + the canonical form + (for cloze) a translation. They don't get the *why*: which case, which rule, which lemma maps to which form, what the particle is doing in the sentence.

**Shape:**
- Add an optional `explanation` field to the item schema (string, ~1–2 short sentences). Show it after answer commit in the feedback panel, below the correct form and translation.
- Authoring pass per deck:
  - `declension` — name the case + trigger (e.g., "dative after *mit*; *der Mann* → *dem Mann*").
  - `chameleon` — point to the particle's syntactic role.
  - `modal-verbs` — name the modal lemma + person + tense.
  - `past-future` — name the auxiliary + participle pattern (or the tense and trigger).
  - `pronouns` — name the case + reference (subject/object/possessive).
  - `vocabulary` — gloss + optional mnemonic / collocation note.
  - `tricky-words` — clarify the particle's contrast vs. its close neighbors.
- Add a Layer 1 lint (C20?) that warns (not errors) when an item lacks `explanation`, so the field gradually fills in deck-by-deck without blocking the build.
- Snapshots include the explanation so changes are visible.

**Why this is its own follow-up, not part of Option D:**
- Pure content work — touches every deck JSON but no engine logic.
- Significant authoring time per item; best done deck-by-deck so each can ship independently.
- Storage redesign is plumbing that should land standalone for clean rollback.
