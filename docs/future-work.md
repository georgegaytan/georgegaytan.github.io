# Future work

Ideas captured during sessions, not yet planned.

## Past-Future scaffolding pools

C20 (added 2026-05-14) currently fires 32 warnings on `decks/past-future.json`: every cloze item is 2-blank (auxiliary + participle) with no `scaffoldPool`, so at box 0/1 the chip palette shows exactly the 2 correct chips — better than chameleon's 1-chip case but still trivially solvable by elimination once the user knows German has 2 slots. Fix by:

- Adding `present_aux_sein_haben` and `future_aux_werden` pools to `decks/past-future.json` (drawing from `src/morphology/` if a relevant table exists, or creating one).
- Adding a `participles_common` pool (or reusing `partizip_2` category) with the participle lemmas already used by the deck.
- Setting `scaffoldPool` on each blank: slot 1 → the relevant aux pool, slot 2 → participles.
- Re-run `node build/build.js` until C20 prints 0 warnings.

This is content authoring, not engine work. Defer until we hear a user complaint matching the same anti-pattern, since the chameleon fix is the urgent one.

