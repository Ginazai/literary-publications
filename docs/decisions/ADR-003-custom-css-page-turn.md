# ADR-003: Turn pages with custom CSS instead of StPageFlip

## Status
Accepted. Supersedes the StPageFlip choice in the original `docs/technology-decision.md`.

## Date
2026-10-30 (recorded retroactively)

## Context
The original plan used StPageFlip (the `page-flip` package) for page folding, dragging and touch gestures. During development it was removed. `tasks/plan.md` records the reasons: it caused layout collapse, scroll jumps and an abrupt page vanish. It was already flagged as barely maintained.

## Decision
Implement the page turn in `BookReader.tsx` and `styles.css`:
- Two stacked `.page` elements inside a fixed-size `.stage`. The leaf is hinged on its left edge and rotates away (`turn-out` / `turn-in`, 0.7 s) over a fading shade.
- Previous/next round buttons, left/right arrow keys, and a horizontal swipe (more than 50 px and clearly more horizontal than vertical).
- With `prefers-reduced-motion: reduce` the page changes with no animation.
- A 1 s timer guarantees a turn always finishes even if `animationend` never fires.
- A plain-text view (`Show plain text`) is always available as a non-animated alternative.

## Alternatives Considered

### Keep StPageFlip behind `BookReader` with plain text as fallback
- Pros: physical drag-to-fold feel, two-page spreads.
- Cons: the observed layout and scroll problems, and an unmaintained dependency.
- Rejected.

### No animation, just swap pages
- Pros: simplest and most robust.
- Cons: loses the one memorable element of the design.
- Rejected, but it is the behaviour under reduced motion.

## Consequences
- The reader is a **single page at every width** (page width is capped at 440 px, height is 1.42 × width). The two-page desktop spread in the original plan was not built.
- The turn is triggered by a gesture, not dragged; the page does not follow the finger.
- No third-party page-flip dependency. `frontend/src/page-flip.d.ts` is a leftover type declaration for the removed package and can be deleted.
- A two-page spread or drag-to-turn would need new work, and should get its own ADR.
