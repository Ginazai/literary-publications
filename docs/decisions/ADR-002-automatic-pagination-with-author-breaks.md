# ADR-002: Paginate automatically in the browser, with optional author-defined breaks

## Status
Accepted

## Date
2026-10-30 (recorded retroactively; this corrects the earlier "author-defined pages" idea in the original decision document)

## Context
The reader shows an essay as fixed-size book pages. The same text takes a different amount of space on a 390 px phone and on a desktop, and page boxes clip their overflow. Pages fixed by the author would cut text off on some screens.

## Decision
The reader measures the text into pages for the current viewport. An author can force a new page by writing `<!-- pagebreak -->` on its own line in the post; `renderBody` converts it to a marker element that the paginator removes and never draws.

Implementation split:
- `frontend/src/lib/pack.ts` is pure (no DOM): greedy page packing, forced breaks, optional splitting of an item that does not fit. It has unit tests.
- `frontend/src/lib/paginate.ts` supplies the DOM measuring callback and splits long paragraphs **by word**, keeping inline markup such as `<em>`.
- `frontend/src/components/BookReader.tsx` waits for the fonts to load, then paginates. It repaginates only when the viewport **width** changes by more than 40 px (rotation), not when a phone's URL bar changes the height, and it keeps the reading position proportionally.

## Alternatives Considered

### Author-defined pages only
- Pros: full compositional control.
- Cons: boundaries cannot adapt to screen size, so text is clipped or pages are mostly empty.
- Rejected.

### Pure automatic pagination with no author control
- Pros: simplest for the author.
- Cons: no way to place a deliberate break (for example before a section or at the end of a poem).
- Rejected in favour of keeping `<!-- pagebreak -->` as an escape hatch.

## Consequences
- Page numbers depend on viewport width and fonts; a "page 7" link means nothing across devices. Reading progress is shown as "Page n of N" for the current layout only.
- Pagination runs on the main thread by cloning and measuring blocks, which is fine for essays but would need review for very long texts.
- The DOM half (`paginate.ts`) has no automated tests; only `pack.ts` does.
