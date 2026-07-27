# UI / UX

Screen inventory, state matrix, motion specs and accessibility gate results for CortexVault.

Design tokens are in [DESIGN.md](DESIGN.md). Feature scope and priority are in [FEATURES.md](FEATURES.md). Personas are in [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md).

**Source files**

| Artifact | Location |
|---|---|
| Design system + screens | [CortexVault (Figma)](https://www.figma.com/design/A8WqKJK5Vk5nn2IlU9CupH/CortexVault) |
| Flow diagrams | [CortexVault Flows (FigJam)](https://www.figma.com/board/qYEaGcCw2fm7asnNxYkh65) |
| Build run id | `cv-ds-2026-07-25` |

---

## 1. Figma file map

| Section | Pages |
|---|---|
| Cover / Getting Started | Cover, Getting Started |
| Foundations | Color, Typography, Spacing & Radius, Elevation & Motion, Brand |
| Components | Button, Input, Card, Dialog, Table, Navigation, Badge, Tabs |
| Patterns | Patterns (product-specific molecules) |
| Screens | Marketing, Auth, Dashboard, Knowledge Base, Chat & Citations, Search & Palette, Settings, Admin & Analytics, System States, Mobile |
| Motion | Motion Specs |

---

## 2. Component inventory

### Base components — 9 sets, 66 variants

| Component | Variant axes | Count | Notes |
|---|---|---|---|
| `Button` | Variant × Size | 18 | 6 variants × sm/md/lg. Axes mirror the shadcn props; CSS states are not variants |
| `Input` | State × Size | 15 | Default / Focus / Error / Disabled / ReadOnly × sm/md/lg |
| `Badge` | Tone | 7 | Tonal fill + required status dot |
| `Table Row` | Type × Density | 8 | Header / Default / Hover / Selected × Comfortable 48 / Compact 36 |
| `Tab` | State | 4 | Indicator always occupies space so state changes never reflow |
| `Card` | Variant × State | 4 | Static / Interactive × Default / Hover / Focus |
| `Nav Item` | State | 4 | Default / Hover / Active / Collapsed |
| `Brand / Glyph` | Fill | 4 | Gradient / Primary / Mono / Inverse |
| `Dialog` | Variant | 2 | Desktop dialog / mobile bottom sheet |

### Product patterns

| Pattern | Variants | Purpose |
|---|---|---|
| `Citation Chip` | Default, Hover | Inline source reference; 44×44 tap target on touch |
| `Message` | User, Assistant | Assistant answers are unbubbled, full-column, `Body/Large` |
| `Usage Meter` | Normal, Warning, Critical | Quota; value always printed as text beside the bar |
| `Upload Dropzone` | Idle, DragOver, Error | Always paired with a visible file-picker button |
| `Ingest Progress` | Running, Failed, Complete | Upload → OCR → Chunk → Embed, per-stage retry |
| `Empty State` | Empty, NoResults, Error | Every list/table/result set ships all three |

---

## 3. Screen inventory + state matrix

`•` shipped · `—` not applicable · P0/P1 per [FEATURES.md](FEATURES.md).

| Domain | Screen | Priority | Default | Empty | Loading | Error | Mobile |
|---|---|---|---|---|---|---|---|
| Marketing | Landing (hero, differentiators, pricing) | P0 | • | — | — | — | responsive |
| Auth | Sign in | P0 | • | — | — | • validation | responsive |
| Auth | Sign up | P0 | • | — | — | • validation | responsive |
| Dashboard | Home | P0 | • | • first-run | • skeleton | via system | • |
| Knowledge Base | Folder tree + document table | P0 | • | • | — | • per-file | • |
| Knowledge Base | Ingesting | P0 | • | — | • per-stage | • OCR failed + retry | — |
| Chat | Streaming answer | P0 | • | • suggestions | • streaming cursor | via system | • |
| Chat | Citation source pane | P0 | • | — | — | — | • |
| Search | Results + filters | P0 | • | — | — | — | — |
| Search | No results | P0 | — | • | — | — | — |
| Search | Command palette (⌘K) | P0 | • | — | — | — | — |
| Settings | Profile / theme / plan | P0 | • | — | — | — | — |
| Settings | Delete confirmation | P0 | • | — | — | — | • sheet |
| Admin | Usage & analytics | P1 | • | — | — | • failed jobs | — |
| System | 404 | P0 | • | — | — | — | responsive |
| System | Server error (500) | P0 | • | — | — | — | responsive |
| System | Offline | P1 | • | — | — | — | responsive |

**26 frames audited.** Mobile frames at 375×812: Dashboard, Chat, Vault, Destructive sheet.

### State copy rules

- **Empty** names the action and offers it ("Upload your first document"), never a bare "No data".
- **NoResults** offers a way to widen the query and states how many filters are active.
- **Error** says what happened, reassures about data ("Your data is safe — nothing was lost"), and offers retry.
- **Partial failure** states what still works: a document whose OCR failed stays searchable by filename and metadata, per [ARCHITECTURE.md](ARCHITECTURE.md) failure handling.

---

## 4. Layout and navigation

| Surface | Desktop | Mobile |
|---|---|---|
| Primary nav | Sidebar 260px, collapses to a 64px icon rail | Bottom bar, 5 items max, icon + label always |
| Secondary nav | Folder tree in sidebar, tabs in page header | Horizontal filter chips |
| Search | ⌘K palette overlay + dedicated Search screen | Full-width field in the header |
| Citation source | 420px right pane | Full-height sheet |
| Chat column | 768px max | Full width, 16px gutters |

Active nav state carries **three** signals — 3px inset bar, `surface-brand` tint, Semi Bold text — plus `aria-current="page"`. Never colour alone.

Safe areas: mobile top bar reserves 48px for the status bar / notch; the bottom nav reserves 24px for the gesture bar.

---

## 5. Motion

Full keyframe tables live on the **Motion Specs** page in Figma. Summary:

| Flow | Key behaviour | Reduced-motion fallback |
|---|---|---|
| Chat token streaming | Tokens append as plain text — **no per-token animation** (it reflows every frame and destroys scroll). Only the 2px cursor blinks at 1s. Autoscroll follows only if the user is within 100px of the bottom | Static cursor bar, no blink |
| Command palette | Scrim 160ms; panel scale 0.96→1 + fade over 320ms `ease-spring` from the trigger origin; exit 200ms (65% of enter); active row changes background only, never transform | 100ms opacity fade, no scale or stagger |
| Upload / ingest | Determinate `scaleX` from `transform-origin: left`, paced to real progress (linear — must not lie about pace); indeterminate stages use a masked sheen, never a spinner | Sheen removed; static striped fill + text status |
| Page transitions | Enter 400ms `ease-standard` with `translateY 8px→0`; exit 260ms; direction encodes hierarchy; focus moves to the main landmark on route change | 100ms cross-fade, no translate |

Global rules: only `transform` and `opacity` animate; exits run at ~65% of enters; every animation is interruptible and none blocks input.

---

## 6. Accessibility gate — results

WCAG 2.2 AA, gated before any code was written. Contrast was **computed from resolved variable values in both modes**, not eyeballed — the audit walks every text node, resolves its fill through the variable alias chain, composites alpha against the nearest opaque ancestor fill, and applies the correct threshold for the node's size and weight.

**Final: 0 failures across 26 screens and 698 text nodes.**

### Defects the gate caught and forced fixes for

| # | Finding | Fix |
|---|---|---|
| 1 | **Text on tonal fills failed AA.** Status ratios in DESIGN.md were measured against the page background, but a badge puts that text on a 12% tint of its own hue — costing 0.3–0.6 of a ratio point. `Ready` 4.27:1, `Failed` 4.01:1, citation chips 4.30:1 | Added 7 `on-tint-*` tokens verified against the **composited** tint (see [DESIGN.md §2.5](DESIGN.md)) |
| 2 | Accent on-tint passed over white (4.54:1) but failed over Paper (4.30:1) | Stepped accent/info to cyan-800 — clears 4.5 on both surfaces, so one token is correct wherever the chip lands |
| 3 | `Overline` at 11px was below the legibility floor everywhere it appeared (18 instances) | Raised the token to 12px / 16px line-height / +6% tracking |
| 4 | Command palette active-row meta at 4.47:1 | Meta text on active rows stepped to `fg` |
| 5 | Mobile citation chips had a 16×20 tap target | Wrapped in 44×44 tap targets |
| 6 | Mobile composer used `Size=sm` (32px), which DESIGN.md disallows on touch | Promoted to `md`; mobile controls raised to 44px |
| 7 | Dialog Sheet footer buttons were 40px | Swapped to `Size=lg` (48px) at the component source, not per instance |

### Standing guarantees

- Body text ≥ 4.5:1; large text and UI boundaries ≥ 3:1; verified per theme
- Focus ring on every interactive element, both themes; dark mode swaps the ring to cyan because indigo-600 on Void is 2.4:1
- Touch targets ≥ 44×44 with ≥ 8px separation
- Status never conveyed by colour alone — badges pair a dot, nav pairs weight and an indicator bar
- Labels always visible; validation on blur; errors below the field with `role="alert"`
- Read-only visually distinct from disabled
- Sequential headings, landmark regions, skip link, focus moved to main on route change
- Tabular figures on every numeric column and live count
- No horizontal page scroll at 375px; wide tables scroll inside their own container

### Charts

The categorical palette is validated by the `dataviz` six-check script (lightness band, chroma floor, adjacent-pair CVD ΔE, normal-vision floor, contrast) against **both** surfaces. Dark steps are selected from the ramps, not flipped — the dark band (OKLCH L 0.48–0.67) is narrower and darker than light (0.43–0.77). Green↔cyan carry a low tritan ΔE, so both always ship with a legend plus direct labels. Legend text wears ink, never the series colour. No dual-axis charts.

---

## 7. Flows

[FigJam board](https://www.figma.com/board/qYEaGcCw2fm7asnNxYkh65):

1. **Capture → Ingest → Ask** — capture surfaces through storage, queue, the OCR branch (including the `failed_ocr` partial-index path), chunking, embedding, and the retrieval → re-rank → stream → citation-viewer loop. Mirrors [ARCHITECTURE.md](ARCHITECTURE.md).
2. **Onboarding** — sign-up method split, the email-verification gate on AI actions, first capture, first cited answer, and the quota nudge.
3. **Admin invite & permissions** — seat check, the four roles, invite token expiry and resend, workspace tenant scoping, and every branch that appends to `audit_logs`.

---

## 8. Implementation

P0 screens are built in `apps/web` per the [ARCHITECTURE.md](ARCHITECTURE.md) structure: Turborepo + pnpm workspaces, Next.js App Router, React 19, TypeScript, Tailwind v4.

| Route | Screen | File |
|---|---|---|
| `/` | Landing + pricing (dark) | `apps/web/app/page.tsx` |
| `/sign-in` | Auth | `apps/web/app/sign-in/page.tsx` |
| `/dashboard` | Home | `apps/web/app/dashboard/page.tsx` |
| `/vault` | Knowledge Base | `apps/web/app/vault/page.tsx` |
| `/chat` | Chat + citations | `apps/web/app/chat/page.tsx` |
| `/search` | Search + filters | `apps/web/app/search/page.tsx` |
| `/settings` | Settings + danger zone | `apps/web/app/settings/page.tsx` |
| `*` | 404 | `apps/web/app/not-found.tsx` |

Tokens live in `apps/web/app/tokens.css` — a direct transcription of [DESIGN.md](DESIGN.md) §8, mirrored 1:1 by the Figma variables. `globals.css` maps **only the semantic layer** into Tailwind's `@theme`, so components cannot reach a primitive.

### Figma → code pairing

Code Connect requires a Dev or Full seat on an **Organization or Enterprise** plan; this team is on Professional, so the `.figma.ts` templates could not be created. Two things carry the handoff in the meantime:

- All 194 Figma variables already have WEB `codeSyntax` set (`var(--fg-muted)` etc.), so Dev Mode emits the real CSS variable names on any plan.
- Every component set's description now ends with a `CODE:` line naming the implementing file and props.

| Figma component | Code |
|---|---|
| `Button` | `components/ui/button.tsx` — `variant`, `size`, `loading` |
| `Input` | `components/ui/input.tsx` — `<Field label size error helper readOnly>` |
| `Badge` | `components/ui/badge.tsx` — `tone` |
| `Card` | `components/ui/card.tsx` — `interactive` |
| `Nav Item` · `Usage Meter` | `components/app-shell.tsx` |
| `Table Row` · `Tab` | `app/vault/page.tsx` |
| `Citation Chip` · `Message` | `app/chat/page.tsx` |
| `Brand / Glyph` | `components/brand/glyph.tsx` |
| `Empty State` | `components/ui/states.tsx` (`EmptyState`, `Spinner`, `ErrorNote`), `components/ui/skeleton.tsx` |
| `Upload` | `components/upload-dropzone.tsx` (drag + picker), `components/upload-button.tsx` (header action) |
| `Dialog` · Sheet | `components/ui/dialog.tsx` — native `<dialog>`, `variant="auto" \| "dialog" \| "sheet"` |
| `Ingest Progress` | `components/ingest-progress.tsx` — `status`, `onRetry` |
| `SourcePreviewPane` | `components/citation-pane.tsx` — `source`, `onClose` |
| Command palette | `components/command-palette.tsx` — `useCommandPalette()` owns the Ctrl/Cmd K binding |
| `Tabs` (segmented) | `components/ui/segmented.tsx` — `segments`, `value`, `onChange` |
| Theme control | `lib/theme.tsx` (`ThemeProvider`, `ThemeScript`), `components/theme-toggle.tsx` |
| Motion constants | `lib/motion.ts` — `DURATION`, `EASE`, `SPRING`, `STAGGER`, `exitOf()` |

Converting to real Code Connect after a plan upgrade is mechanical: the variant axes were deliberately built to mirror the code props.

---

## 9. Browser verification

`tests/e2e/screens.spec.ts`, run across three projects — desktop 1440, tablet 768, and **Pixel 7** (a real device descriptor, so `pointer: coarse` actually applies and the 44px touch promotion is exercised rather than silently skipped).

**40 passed, 0 failed.**

Per route (8 routes × 3 viewports): no console or runtime errors, no horizontal page scroll, a `main` landmark and an `h1` present, plus a full-page screenshot. Cross-cutting: skip link is first in tab order and targets `#main`; focus ring resolves to a real `box-shadow`; every input has an associated visible label; numeric table cells compute `tabular-nums`; mobile controls clear 44px; dark mode resolves Void `#0b0b14` and a **cyan** focus ring rather than an inverted light palette.

### Defects browser verification caught

| # | Finding | Fix |
|---|---|---|
| 1 | **`tailwind-merge` silently dropped the type ramp.** It doesn't know custom utilities, so it classified `text-label` as a *colour* and removed it whenever `text-fg` followed in the same `cn()` call — nav labels rendered at 16px instead of 14px | Registered the ramp as a `font-size` class group via `extendTailwindMerge` in `lib/cn.ts` |
| 2 | Mobile header logo link was a 24px tap target | Wrapped to `size-11` with an `aria-label` |
| 3 | `favicon.ico` 404 on every page load | Added `app/icon.png` and `app/apple-icon.png` |
| 4 | Invalid HTML: `<a>` nested inside `<button>` on the 404 page | Replaced with styled `Link`s |

The first one is worth noting: it was invisible in code review and invisible in the build — only a computed-style assertion in a real browser exposed it, and it silently degraded every `cn()` call that combined a type utility with a text colour.

### Defects the design pass caught

| # | Finding | Fix |
|---|---|---|
| 1 | **Every `[--token]` utility was dead.** Tailwind v4 dropped the v3 shorthand that auto-wrapped `[--x]` in `var()`. 87 classes across 23 files compiled to nothing: no layout caps (content 1280, chat 768, sidebar 260, pane 420), no z-index scale, no duration or easing tokens, no scrim | Converted every one to the v4 `(--token)` form. Verified by computed style: `max-width` resolves to `1280px` and the app header to `z-index: 20` |
| 2 | `text-danger-fg` and `text-success-fg` were never mapped in `@theme`, so every error and success message rendered in inherited body colour | Pointed at the real `text-danger` / `text-success` tokens |
| 3 | Chat force-scrolled to the bottom on every token, yanking the viewport away from anyone reading back | Follows only when already within 100px of the bottom, per section 5 |
| 4 | The header search control and the Search screen's field shared the accessible name "Search your vault" | Header names the palette it opens; the field keeps the search name |
| 5 | The palette input never took focus — `showModal()` moves focus to the dialog after React's `autoFocus` has already fired | Explicit focus on open |
| 6 | `sticky top-16` on the vault table header resolved against its own scroll container, hiding the first row behind a 64px band | Offset dropped to `top-0` |
| 7 | The 420px citation pane covered the chat composer, and a right margin overflowed instead of narrowing (`w-full` resolves against the content box) | Padding on a wrapper, so the reading column clears the pane |
| 8 | `Button` laid its children out inline, so an icon plus a label wrapped to two lines | Label span is `inline-flex` |
| 9 | Trashing a document deleted with no confirmation and no error handling | Confirm dialog plus a toast on both outcomes |
| 10 | `forgot-password`, `reset-password` and `verify-email` had no `main` landmark, so the skip link targeted nothing | Shared `AuthLayout` supplies it to all five auth screens |

### Coverage gap the pass also closed

`screens.spec.ts` walks the routes unauthenticated, so `/dashboard`, `/vault`, `/chat`, `/search` and `/settings` all redirect to `/sign-in` — five of its eight routes were asserting against the sign-in page. `tests/e2e/interactions.spec.ts` stubs the API so the app shell is exercised for real, and adds the palette, theme persistence, dropzone, dialog and reduced-motion assertions. **69 passed, 0 failed** across the three projects.

---

## 10. Open items

- **Brand asset inconsistency.** `favicon.png` and `app-icon.png` carry a visibly different, heavier brain drawing than `icon.png` / `logo-primary.png`. The design system is built from the thin gradient mark used by the primary logo. Reconciling the set is brand work, not covered here.
- **Code Connect is blocked by plan tier** — needs a Dev/Full seat on Organization or Enterprise. Variable code syntax and component `CODE:` descriptions cover the handoff until then.
- P1/P2 screens stay Figma-only by scope: Version history, Sharing, Workspace members, Notifications, Audit log table, Saved searches.
- **The API has no chunk endpoint.** `SourcePreviewPane` gets `chunk_id`, `document_id` and `document_title` from a citation but no offsets, so a chat citation opens the whole document and says so. Search hits carry their own text, so those open with the retrieved excerpt highlighted. Closing this needs `GET /api/v1/chunks/{id}`.
- The `IngestProgress` stepper shows which stage a status has reached, not a percentage — the API reports one `ingest_status`, and a per-stage bar would be invented.
- Still not coded: per-screen empty/loading/error variants beyond what `states.tsx` and `skeleton.tsx` cover.
- Backend exists and is wired: this section originally described the design-only phase. The FastAPI service in `apps/server` now backs every P0 screen — see [ARCHITECTURE.md](ARCHITECTURE.md). The `packages/db` / `packages/ai` / `packages/auth` split never happened; that TypeScript-services plan was replaced by the standalone Python backend (see [TECH-STACK.md](TECH-STACK.md)).
- The glyph SVG is 47 KB (~15 KB gzipped) at IoU 0.926 against the source raster. A hand-drawn vector would be smaller and cleaner; this is the best a trace of a 295px PNG can do.
