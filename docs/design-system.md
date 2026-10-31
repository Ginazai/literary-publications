# Design system

Based on the *Lamplighter Review* system (MagicPath export), evolved for this project.
Source of truth for tokens: `frontend/src/styles.css`.

## Principles
- **Lamplight on a desk.** Warm dark by default, a stone-and-bronze light theme, chosen by the system setting and overridden by the reader (stored in `localStorage`, applied before first paint in `index.html`).
- **One ground, one ink, one accent.** The accent is gold in the dark theme and bronze in the light one (same hue, darkened to pass contrast).
- **Two typefaces.** Cormorant Garamond for display, EB Garamond for text and interface. Both self-hosted through `@fontsource-variable`.
- **Controls are round, surfaces are square.** Icon buttons and the one call to action are fully round; the page, cover board and fields are square.
- **Structure from space and tone, not lines.** One gold rule, under the masthead. Everything else is separated by spacing or a step in tone. (The only other line is the underline on the search field.)
- **A ledger.** Side notes (date, reading time, plain-text switch) sit in a left zone (`--axis`); content hangs from that line. One column on phones.

## Tokens
| Role | Dark | Light |
|---|---|---|
| `--bg` ground | `#1A1714` | `#E7E3D7` |
| `--surface` (footer, hover, round buttons) | `#231E19` | `#DCD8CA` |
| `--board` (book cover) | `#33261F` | `#CBC5B1` |
| `--ink` running text | `#D8CBB2` (11.1:1) | `#232C1F` (11.3:1) |
| `--heading` | `#E8DCC3` | `#182014` |
| `--muted` bylines, excerpts | `#B8A98C` (7.7:1) | `#3F4A31` (7.3:1) |
| `--accent` | `#B69A62` (6.6:1) | `#74561A` (5.3:1) |
| `--paper` / `--paper-ink` (the page) | `#E9E1CC` / `#1F1A14` | `#F7F4EA` / `#1E241C` |

Type, as set in `styles.css`:
| Use | Size |
|---|---|
| Site body text | 17px / 1.6 (EB Garamond) |
| Interface text, links, nav, excerpts | 16–18px |
| Book page text | 18px / 1.55 |
| Book running head, folio | 13px italic, 14px |
| Plain-text view | 20px / 1.6 |
| Display headings (Cormorant Garamond) | fluid with `clamp()`: essay and lead titles about 36–72px, row titles 24–32px, brand name 36–56px, "Earlier essays" 32px |

Motion: `--ease` and `--ease-out` (custom cubic-béziers). Entrances and hover effects use transform and opacity; the one exception is the progress ribbon, which transitions `width`. The page turn is 0.7s. Everything is reduced to near-instant under `prefers-reduced-motion`, and the reader then changes pages without animating.

## Components
`Masthead` (full on home, slim bar on essays; contains `ThemeToggle`) · `Footer` · `Reveal` (staggered entrance when scrolled into view) · `BookReader` (cover board, page, running head, folio, round turn buttons, progress ribbon) live in `src/components/`. `Lead` (latest essay, one call to action), `Row`, `Meta`, `Notice` and `Skeleton` (loading placeholder) live in `src/App.tsx`. A skip link and the search field are part of the page layout.

## What changed from the Lamplighter, and why
| Change | Reason |
|---|---|
| Cormorant Garamond is now actually loaded; Cinzel dropped | The original imported only EB Garamond, so headings rendered in the browser's fallback serif. Cinzel was a third face. |
| Light theme: stone ground, bronze accent (was `#FFFDE8` + `#C9935A`/`#C07030`) | Gold labels were 2.6:1 and links 3.7:1 on the cream (AA needs 4.5:1), and cream + rust is the most recognisable generated palette. |
| Footer tagline colour raised | `#897C68` on `#1A1714` was 4.4:1. Three muted tones are now one. |
| Tiny tracked-caps labels (10–11px Cinzel) replaced by sentence-case italics at 16px+ | Unreadable at that size; the "Essay" eyebrow above the title carried no information and is gone. |
| Hairline rules reduced from about ten to one | The rule is the system's signature; used everywhere it stops meaning anything. Rows are separated by space and a tone step on hover. |
| Grain is a fixed layer behind the content, with per-theme speckle | It was applied to the header only, and its `screen` blend did nothing on the light theme. |
| System theme detection, persistence, no flash | The original always started dark and forgot the choice. |
| Nav shows only pages that exist | `#about` and `#rss` pointed nowhere. |
| Round 44px controls on a tone step, no outlines | Touch targets were 30px. |

## Known gaps
- `config.ts` still has the placeholder name `test` (see "Configuration" in `docs/architecture.md` for every place to change); the masthead is built to carry a real one (uppercase, wraps balanced).
- No About/Subscribe pages yet (T2 in `tasks/todo.md`), so the navigation has one entry.
- No text-size control; the book uses a fixed 18px page text (T5).
- No images: this is a text-first publication, and none of the design relies on them. Images inside an essay have not been tested with the pagination.
