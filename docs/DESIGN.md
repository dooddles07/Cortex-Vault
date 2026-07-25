# Design System

Token architecture for CortexVault. Three layers: **primitive** (raw values, no meaning) -> **semantic** (role, theme-aware) -> **component** (bound to one component's part+state). Components never reference primitives directly.

Scope of record: brand palette and glyph are fixed and extended here, not redefined. See [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) for personas, [FEATURES.md](FEATURES.md) for screen scope, [ARCHITECTURE.md](ARCHITECTURE.md) for stack.

Target: **WCAG 2.2 AA**. Every ratio in this document was computed, not estimated.

---

## 1. Design Direction

| Axis | Decision | Why |
|---|---|---|
| Style | Swiss/minimal structure + modern-dark depth | Product is dense, text-heavy, read-for-hours. Grid and whitespace do the work; ornament competes with content |
| Theme priority | Dark-primary for the app shell, light-primary for marketing/docs | Matches persona workflow (researcher/developer, long sessions); marketing needs light for legibility on cold traffic |
| Color use | Brand color is for *state and wayfinding*, never decoration | In a citation product, colored text implies meaning. Reserve indigo for interactive, cyan for AI-generated/retrieved |
| Density | Comfortable default, compact opt-in on tables and lists | Lawyer/researcher personas scan long result sets |
| Motion | Functional only. Every animation maps to a cause | Streaming, ingest, and retrieval are the only things that genuinely move |

### Semantic color meaning (product-specific, enforced)

| Color | Means | Never used for |
|---|---|---|
| **Cortex Indigo** | Interactive, user-initiated, primary action, focus | Status, AI output |
| **Recall Cyan** | AI-generated, retrieved, cited, streaming | Primary buttons (fails contrast with white), errors |
| **Indigo -> Cyan gradient** | The brand mark, and the capture->recall transformation | Anything with text on top (see 2.6) |
| Green / Amber / Red | Job status, quota, destructive | Brand expression |

---

## 2. Color

### 2.1 Brand anchors (fixed, do not alter)

| Name | Hex | HSL | Role in the system |
|---|---|---|---|
| Cortex Indigo | `#4C3AED` | `246 83% 58%` | `indigo-600` |
| Recall Cyan | `#22D3EE` | `188 86% 53%` | `cyan-400` |
| Void | `#0B0B14` | `240 29% 6%` | `neutral-950` |
| Paper | `#F7F7FB` | `240 33% 98%` | `neutral-25` |
| Ink | `#14131F` | `245 24% 10%` | `neutral-900` |
| Mist | `#8B8AA3` | `242 12% 59%` | `neutral-500` |

The six brand hexes are the anchor stops of four ramps. Everything else is interpolated at fixed hue so the family stays coherent.

### 2.2 Primitive ramps

**Indigo** — hue locked at 246. `600` is pinned to the exact brand hex.

| Step | Hex | | Step | Hex |
|---|---|---|---|---|
| 50 | `#F1F0FF` | | 500 | `#6555F1` |
| 100 | `#E3E0FF` | | **600** | **`#4C3AED`** |
| 200 | `#C9C3FE` | | 700 | `#311EDC` |
| 300 | `#A69DFB` | | 800 | `#2E20AC` |
| 400 | `#7D6FF6` | | 900 | `#2A2183` |
| | | | 950 | `#1B1551` |

**Cyan** — hue 188. `400` is the exact brand hex.

| Step | Hex | | Step | Hex |
|---|---|---|---|---|
| 50 | `#ECFEFF` | | 500 | `#06B6D4` |
| 100 | `#CFFAFE` | | 600 | `#0891B2` |
| 200 | `#A5F3FC` | | 700 | `#0E7490` |
| 300 | `#67E8F9` | | 800 | `#155E75` |
| **400** | **`#22D3EE`** | | 900 | `#164E63` |
| | | | 950 | `#083344` |

**Neutral** — cool violet-grey, hue 240-246. Not pure grey: it carries a trace of the brand hue so surfaces sit under indigo without clashing. Anchored to all four brand neutrals.

| Step | Hex | Anchor | | Step | Hex | Anchor |
|---|---|---|---|---|---|---|
| 0 | `#FFFFFF` | | | 500 | `#8B8AA3` | **Mist** |
| 25 | `#F8F8FC` | **Paper** | | 600 | `#6E6C89` | |
| 50 | `#F2F2F7` | | | 700 | `#4E4C67` | |
| 100 | `#EAEAF1` | | | 750 | `#343248` | |
| 200 | `#D6D6E1` | | | 800 | `#211F33` | |
| 300 | `#BAB9CA` | | | 900 | `#151320` | **Ink** |
| 400 | `#9F9EB3` | | | 950 | `#0B0B14` | **Void** |
| | | | | 1000 | `#05050A` | |

`neutral-750` exists because dark mode needs a hairline value between the 700 border and the 800 surface. `neutral-1000` is for OLED-deep scrims only, never a page background (avoids OLED smear on scroll).

**Status** — deliberately outside the brand hues so status never reads as brand.

| Role | Light | Dark | Light on Paper | Dark on Void |
|---|---|---|---|---|
| Success | `#15803D` | `#4ADE80` | 4.73:1 | 11.24:1 |
| Warning | `#B45309` | `#FBBF24` | 4.74:1 | 11.73:1 |
| Danger | `#DC2626` | `#F87171` | 4.56:1 | 7.08:1 |
| Info | `#0E7490` | `#22D3EE` | 5.06:1 | 10.84:1 |

### 2.3 Semantic tokens — Light

| Token | Value | Contrast vs `bg` | Verdict |
|---|---|---|---|
| `bg` | neutral-25 `#F8F8FC` | — | |
| `bg-subtle` | neutral-50 `#F2F2F7` | — | |
| `surface` | neutral-0 `#FFFFFF` | — | |
| `surface-raised` | neutral-0 `#FFFFFF` + shadow | — | |
| `surface-brand` | indigo-50 `#F1F0FF` | — | |
| `fg` | neutral-900 `#151320` | **17.30:1** | AAA |
| `fg-muted` | neutral-700 `#4E4C67` | **7.76:1** | AAA |
| `fg-subtle` | neutral-600 `#6E6C89` | **4.75:1** | AA |
| `fg-disabled` | neutral-400 `#9F9EB3` | 2.47:1 | disabled-exempt |
| `border` | neutral-200 `#D6D6E1` | decorative | exempt |
| `border-interactive` | neutral-500 `#8B8AA3` | **3.17:1** | AA (1.4.11) |
| `border-strong` | neutral-600 `#6E6C89` | 4.75:1 | AA |
| `primary` | indigo-600 `#4C3AED` | **6.32:1** | AA |
| `primary-hover` | indigo-700 `#311EDC` | 8.44:1 | AAA |
| `on-primary` | `#FFFFFF` | **6.70:1** on primary | AA |
| `accent` | cyan-400 `#22D3EE` | fill only | see 2.7 |
| `accent-fg` | cyan-700 `#0E7490` | **5.06:1** | AA |
| `on-accent` | cyan-950 `#083344` | **7.41:1** on accent | AAA |
| `ring` | indigo-600 `#4C3AED` | 6.32:1 | AA |

> **Rule L1 — Mist is not a light-mode text color.** Brand Mist `#8B8AA3` on Paper is **3.17:1**, below the 4.5:1 body-text floor. In light mode Mist is a *border and icon* token only. Light-mode secondary text is `fg-subtle` neutral-600 `#6E6C89` (4.75:1). Mist keeps its text role in dark mode, where it measures 5.84:1.

### 2.4 Semantic tokens — Dark

| Token | Value | Contrast vs `bg` | Verdict |
|---|---|---|---|
| `bg` | neutral-950 `#0B0B14` | — | |
| `bg-subtle` | neutral-1000 `#05050A` | — | scrim/inset only |
| `surface` | neutral-900 `#151320` | — | |
| `surface-raised` | neutral-800 `#211F33` | — | |
| `surface-brand` | indigo-950 `#1B1551` | — | |
| `fg` | neutral-50 `#F2F2F7` | **17.55:1** | AAA |
| `fg-muted` | neutral-300 `#BAB9CA` | **10.15:1** | AAA |
| `fg-subtle` | neutral-500 `#8B8AA3` (Mist) | **5.84:1** | AA |
| `fg-disabled` | neutral-600 `#6E6C89` | 3.89:1 | disabled-exempt |
| `border` | neutral-750 `#343248` | decorative | exempt |
| `border-interactive` | neutral-600 `#6E6C89` | **3.89:1** vs bg / **3.64:1** vs surface | AA (1.4.11) |
| `border-strong` | neutral-500 `#8B8AA3` | 5.84:1 | AA |
| `primary` | indigo-600 `#4C3AED` | fill | |
| `primary-fg` | indigo-400 `#7D6FF6` | **5.11:1** | AA |
| `primary-hover` | indigo-500 `#6555F1` | — | |
| `on-primary` | `#FFFFFF` | **6.70:1** on primary | AA |
| `accent` | cyan-400 `#22D3EE` | **10.84:1** | AAA |
| `accent-fg` | cyan-400 `#22D3EE` | 10.84:1 | AAA |
| `on-accent` | cyan-950 `#083344` | 7.41:1 on accent | AAA |
| `ring` | cyan-400 `#22D3EE` | **10.84:1** | AAA |

Dark mode swaps the focus ring from indigo to cyan: indigo-600 against Void reads at 2.4:1 and would fail the 3:1 non-text minimum for a focus indicator.

### 2.5 Tonal surfaces and the on-tint rule

Badges, citation chips and status pills sit on a **tint of their own hue**, not on the page background. Figma discards per-paint opacity once a colour variable is bound to that paint, and CSS `opacity` on a fill would fade the label with it — so the tint is a real token, never ad-hoc alpha.

| Token | Light | Dark |
|---|---|---|
| `tint-{tone}` | tone hue @ **12%** | tone hue @ **18%** |

Dark surfaces need the heavier alpha to read at the same perceived strength.

> **Rule T1 — a tint changes the background, so it changes the required foreground.** The ratios in 2.3 are measured against `bg`. Inside a tinted pill the background is `tone @ 12%` composited over the surface, which costs roughly 0.3–0.6 of a ratio point. Text on a tint therefore uses a dedicated `on-tint-*` token, verified against the **composited** colour.

| Token | Light | vs light tint | Dark | vs dark tint |
|---|---|---|---|---|
| `on-tint-success` | green-800 `#166534` | **6.06:1** | `#4ADE80` | **7.27:1** |
| `on-tint-warning` | amber-800 `#92400E` | **6.02:1** | `#FBBF24` | **7.47:1** |
| `on-tint-danger` | red-700 `#B91C1C` | **5.37:1** | `#F87171` | **5.08:1** |
| `on-tint-accent` | cyan-800 `#155E75` | **5.83:1** | `#22D3EE` | **7.07:1** |
| `on-tint-info` | cyan-800 `#155E75` | **5.83:1** | `#22D3EE` | **7.07:1** |
| `on-tint-brand` | indigo-600 `#4C3AED` | **5.54:1** | indigo-300 `#A69DFB` | **6.20:1** |
| `on-tint-neutral` | neutral-700 `#4E4C67` | **7.07:1** | neutral-400 `#9F9EB3` | **5.47:1** |

Accent and info are stepped to cyan-800 rather than cyan-700 because a tint composited over **Paper** is fractionally darker than over white — cyan-700 measures 4.54:1 over white but only **4.30:1** over Paper. Cyan-800 clears 4.5 on both, so one token is correct everywhere the chip can land.

### 2.6 Chart series

Four categorical series, validated with the `dataviz` six-check script (lightness band, chroma floor, adjacent CVD ΔE, normal-vision floor, contrast). All checks pass on light surface `#FFFFFF` and dark surface `#151320`. **Dark steps are selected from the ramps, not flipped** — the dark band (OKLCH L 0.48–0.67) is narrower and darker than the light band (0.43–0.77).

| Token | Light | Dark | Series |
|---|---|---|---|
| `chart-series-1` | indigo-600 `#4C3AED` | indigo-400 `#7D6FF6` | Documents |
| `chart-series-2` | amber-700 `#B45309` | amber-600 `#D97706` | Notes |
| `chart-series-3` | cyan-600 `#0891B2` | cyan-600 `#0891B2` | Bookmarks |
| `chart-series-4` | green-700 `#15803D` | green-600 `#16A34A` | Snippets |

Hues are assigned in this fixed order and never cycled; a fifth category folds into "Other" or becomes small multiples. Green↔cyan carry a low tritan ΔE, so both always ship with a legend and direct labels. Legend and value text wear ink tokens, never the series colour. Never a dual-axis chart.

### 2.7 On-accent rule

Cyan-400 with white text is **1.81:1**. It fails at every size.

- Solid cyan surface -> text must be `on-accent` cyan-950 `#083344` (7.41:1)
- Cyan as *text* on a light background -> step to cyan-700 `#0E7490` (5.06:1) or darker
- Cyan as text on dark -> cyan-400 is correct as-is (10.84:1)
- Cyan is never a primary-button fill. Primary is always indigo.

### 2.8 Gradient rule

Signature gradient: `linear-gradient(135deg, #4C3AED 0%, #22D3EE 100%)`.

White text over it, measured along the ramp:

| Position | Blend | White on it | Ink on it |
|---|---|---|---|
| 0% | `#4C3AED` | 6.70:1 | 2.77:1 |
| 25% | `#4261ED` | 5.04:1 | 3.64:1 |
| 50% | `#3887EE` | **3.58:1** | 5.14:1 |
| 75% | `#2DADEE` | **2.52:1** | 7.28:1 |
| 100% | `#22D3EE` | **1.81:1** | 10.17:1 |

> **Rule G1 — The gradient is a graphic token, not a text background.** Permitted: the glyph, progress/ingest bars, 1-2px accent hairlines, icon fills, decorative aura at low opacity, chart series. Forbidden: any surface that carries text.
>
> **Rule G2 — Gradient text uses the compressed ramp.** For gradient-filled headings, run `#4C3AED -> #7D6FF6` (indigo 600->400) or apply the full gradient only to display type at >=32px/700 where 3:1 large-text applies and verify per instance.
>
> **Rule G3 — Gradient CTAs need a floor.** If a gradient button is required, stop the ramp at 30% (`#4160ED`, 5.0:1 with white) or lay a `rgba(11,11,20,0.28)` scrim under the label.

---

## 3. Typography

Three roles, three families. Each earns its place; none is decorative.

| Role | Family | Used for | Weights |
|---|---|---|---|
| Display | **Plus Jakarta Sans** | Marketing headlines, page titles >=24px, the wordmark lockup | 700, 800 |
| UI / Body | **Inter** | Everything else: body, labels, buttons, tables, nav | 400, 500, 600 |
| Mono | **JetBrains Mono** | Code snippets, citation locators, IDs, tabular figures | 400, 500 |

Plus Jakarta Sans is chosen because it is the closest free match to the existing wordmark's geometry — it keeps typeset headings in the same voice as the fixed logo asset instead of fighting it. Inter carries the interface because it out-legibles PJS below 16px and ships true tabular numerals, which the usage meter, quota rows, and admin tables require.

**Loading budget.** PJS is subset to weights 700/800, latin, and only requested by routes that render display type. Inter loads as a variable subset (latin, wght 400-600) and is the only font in the critical path. JetBrains Mono is deferred and fetched on routes containing code or citation locators. All three use `font-display: swap` with a matched-metric fallback stack to hold layout.

```css
--font-display: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
--font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
```

### Type scale

Base 16px. Ratio ~1.2 at text sizes, widening to ~1.25 at display.

| Token | Size | Line-height | Tracking | Weight | Family | Use |
|---|---|---|---|---|---|---|
| `display-1` | 60 / 3.75rem | 1.05 | -0.03em | 800 | Display | Landing hero |
| `display-2` | 48 / 3rem | 1.08 | -0.025em | 800 | Display | Section hero |
| `h1` | 36 / 2.25rem | 1.15 | -0.02em | 700 | Display | Page title |
| `h2` | 28 / 1.75rem | 1.25 | -0.015em | 700 | Display | Section |
| `h3` | 22 / 1.375rem | 1.3 | -0.01em | 600 | Sans | Card / panel title |
| `h4` | 18 / 1.125rem | 1.4 | -0.005em | 600 | Sans | Sub-section |
| `body-lg` | 18 / 1.125rem | 1.6 | 0 | 400 | Sans | Marketing body, chat answer |
| `body` | 16 / 1rem | 1.6 | 0 | 400 | Sans | Default |
| `body-sm` | 14 / 0.875rem | 1.55 | 0 | 400 | Sans | Dense UI, table cells |
| `label` | 14 / 0.875rem | 1.4 | 0 | 500 | Sans | Form labels, buttons |
| `caption` | 12 / 0.75rem | 1.45 | 0.005em | 400 | Sans | Meta, timestamps |
| `overline` | 12 / 0.75rem | 1.33 | 0.06em | 600 | Sans | Uppercase section eyebrows |
| `code` | 13.6 / 0.85rem | 1.55 | 0 | 400 | Mono | Inline + block code |
| `citation` | 12 / 0.75rem | 1.4 | 0.01em | 500 | Mono | `[3]`, `p.14`, chunk refs |

**Rules.** Body text never below 14px, and never below 16px on mobile inputs (prevents iOS auto-zoom). Measure is capped at 68ch for prose and chat answers, 60ch on mobile. Tabular figures (`font-variant-numeric: tabular-nums`) are mandatory on the usage meter, quota rows, admin tables, job queue, and any live-updating count. Truncation is a last resort; prefer wrap, and any truncated string exposes its full value via title/tooltip.

---

## 4. Spacing, Sizing, Radius

**Spacing** — 4px base, single scale, no off-scale values.

| Token | px | | Token | px |
|---|---|---|---|---|
| `space-0` | 0 | | `space-6` | 24 |
| `space-1` | 4 | | `space-8` | 32 |
| `space-2` | 8 | | `space-10` | 40 |
| `space-3` | 12 | | `space-12` | 48 |
| `space-4` | 16 | | `space-16` | 64 |
| `space-5` | 20 | | `space-20` | 80 |
| | | | `space-24` | 96 |

Vertical rhythm tiers: intra-component 8 -> component 16 -> group 24 -> section 48 -> page section 80.

**Radius** — the glyph uses fully rounded stroke caps, so the radius family is soft.

| Token | px | Applied to |
|---|---|---|
| `radius-xs` | 4 | Tag chips, inline citation pills |
| `radius-sm` | 6 | Badges, small controls |
| `radius-md` | 8 | Buttons, inputs, select, menu items |
| `radius-lg` | 12 | Cards, panels, message bubbles |
| `radius-xl` | 16 | Dialogs, sheets, command palette |
| `radius-2xl` | 24 | Marketing feature cards, hero media |
| `radius-full` | 9999 | Avatars, status dots, pills |

**Control sizing** — every interactive control clears the 44px touch minimum on coarse pointers.

| Size | Height | Padding-x | Font | Use |
|---|---|---|---|---|
| `sm` | 32 | 12 | body-sm | Desktop-only dense toolbars; hit area padded to 44 |
| `md` | 40 | 16 | label | Default |
| `lg` | 48 | 20 | body | Primary CTA, mobile default |

On touch pointers `sm` is disallowed and `md` promotes to 44px minimum via a `@media (pointer: coarse)` override.

**Layout**

| Token | Value |
|---|---|
| Breakpoints | 375 / 640 / 768 / 1024 / 1280 / 1536 |
| Content max | 1280 (`max-w-7xl`) |
| Prose max | 68ch |
| Sidebar | 260 expanded / 64 collapsed |
| Source pane | 420 (desktop) / full-height sheet (mobile) |
| Chat column | 768 max |
| Gutter | 16 (mobile) / 24 (tablet) / 32 (desktop) |

**Z-index**

`base 0` · `sticky 10` · `header 20` · `drawer 30` · `overlay 40` · `modal 50` · `popover 60` · `toast 70` · `palette 80` · `tooltip 90`

---

## 5. Elevation

Light mode uses shadow. Dark mode uses **surface tint plus a hairline border** — shadows are close to invisible on Void, so depth is carried by luminance and edge.

| Level | Light | Dark | Used by |
|---|---|---|---|
| `e0` | none | `surface`, no border | Page background, flush regions |
| `e1` | `0 1px 2px rgb(20 19 31 / .06), 0 1px 3px rgb(20 19 31 / .04)` | `surface` + `1px border` | Cards, list rows, panels |
| `e2` | `0 4px 8px rgb(20 19 31 / .06), 0 2px 4px rgb(20 19 31 / .04)` | `surface-raised` + `1px border` | Dropdowns, popovers, citation cards |
| `e3` | `0 12px 24px rgb(20 19 31 / .10), 0 4px 8px rgb(20 19 31 / .06)` | `surface-raised` + `1px border-strong` | Dialogs, sheets |
| `e4` | `0 24px 48px rgb(20 19 31 / .16), 0 8px 16px rgb(20 19 31 / .08)` | `surface-raised` + `border-strong` + `0 0 0 1px rgb(76 58 237 / .2)` | Command palette |

Scrim for all overlays: `rgb(11 11 20 / .48)` light, `rgb(5 5 10 / .64)` dark, with `backdrop-filter: blur(4px)`. Blur signals dismissible-background, never decoration.

Focus ring is a single global token, never removed: `0 0 0 2px var(--bg), 0 0 0 4px var(--ring)`. The inner bg-colored ring guarantees the indicator survives on any surface.

---

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 100ms | State/color change, press |
| `duration-fast` | 160ms | Hover, tooltip, toggle |
| `duration-base` | 220ms | Dropdown, popover, tab |
| `duration-slow` | 320ms | Dialog, sheet, drawer |
| `duration-page` | 400ms | Route transition |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `ease-out` | `cubic-bezier(0, 0, 0, 1)` | Entering |
| `ease-in` | `cubic-bezier(0.3, 0, 1, 1)` | Exiting |
| `ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Modals, palette, sheets |
| `stagger` | 40ms | List/grid item entrance |

Exit runs at ~65% of enter duration. Only `transform` and `opacity` animate; width/height/top/left never do. Every animation is interruptible, and no animation blocks input. Under `prefers-reduced-motion: reduce` all transitions collapse to a 100ms opacity fade, the streaming cursor stops blinking, and progress bars switch from a moving sheen to a static determinate fill.

---

## 7. Component Tokens

Component tokens bind to semantic tokens only. Format: `--{component}-{part}-{state}`.

### Button

| Variant | Fill | Text | Border | Hover | Active | Disabled |
|---|---|---|---|---|---|---|
| `primary` | `primary` | `on-primary` | none | `primary-hover` | `primary-hover`, scale .98 | `fg-disabled` on `bg-subtle` |
| `secondary` | `surface` | `fg` | `border-interactive` | `bg-subtle` | `bg-subtle`, scale .98 | 0.5 opacity |
| `ghost` | transparent | `fg-muted` | none | `bg-subtle`, text `fg` | `bg-subtle` | 0.5 opacity |
| `accent` | `accent` | `on-accent` | none | cyan-500 | cyan-500, scale .98 | 0.5 opacity |
| `destructive` | `danger` | `#FFFFFF` | none | danger-dark | scale .98 | 0.5 opacity |
| `link` | none | `primary` (light) / `primary-fg` (dark) | none | underline | — | `fg-disabled` |

Loading state: label stays in place at 0 opacity to hold width, spinner centered on top, `aria-busy="true"`, pointer events off. Disabled buttons carry a real `disabled` attribute, never a class alone.

### Input / Textarea / Select

Rest `surface` + 1px `border-interactive`, radius-md, height per control size, 12px horizontal padding.
Hover `border-strong`. Focus `border` -> `primary` + focus ring. Error `border` -> `danger` + `aria-invalid` + message below the field in `danger`, announced via `role="alert"`. Disabled `bg-subtle`, `fg-disabled`, `cursor: not-allowed`. Read-only is visually distinct from disabled: normal text color, `border` steps to decorative, no focus ring on the field body.

Labels are always visible and never replaced by a placeholder. Helper text is persistent below complex fields. Validation fires on blur, not per keystroke.

### Card

`surface`, `radius-lg`, `e1`, 1px `border`, padding 20/24. Interactive cards add hover `surface-raised` (dark) or `e2` (light) and a focus ring on the whole card; the card exposes exactly one primary link for the accessible name.

### Dialog / Sheet

`surface-raised`, `radius-xl`, `e3`, max-w 560 default, scrim + blur behind. Enters with `ease-spring` at `duration-slow`, scale 0.96 -> 1 with opacity, origin at the trigger. Focus traps on open and returns to trigger on close. Escape and scrim-click both dismiss; a sheet with unsaved input confirms first. Mobile: bottom sheet, full width, `radius-xl` top corners only, swipe-down to dismiss with a visible grabber.

### Table

Header `bg-subtle`, `overline` type, sticky on scroll. Rows 48px comfortable / 36px compact, 1px `border` between, hover `bg-subtle`. Numeric columns are right-aligned with tabular figures. Sortable headers are real buttons carrying `aria-sort`. Selection uses a checkbox column plus a persistent bulk-action bar. Horizontal overflow scrolls inside its own container so the page body never scrolls sideways.

### Nav

Sidebar `surface`, 260/64px. Item 40px, `radius-md`, 12px padding, 20px icon + `label`. Active state is a 3px inset indigo bar plus `surface-brand` fill plus `fg` text and `aria-current="page"` — three signals, never colour alone. Collapsed rail shows icon only with a tooltip and keeps the accessible name.

Mobile: bottom bar, max 5 items, icon + label always, safe-area padding at the bottom inset.

### Badge

`radius-full`, height 22, padding 8, `caption` at weight 500. Tonal by default: status text on a 12%-opacity tint of its own hue. Status badges always pair an icon or a shape with the colour.

### Tabs

Underline style. Inactive `fg-subtle`, active `fg` with a 2px `primary` underline animated via `transform: scaleX` on the shared indicator. Roving tabindex, arrow-key navigation, `role="tablist"`.

### Product-specific

| Component | Spec |
|---|---|
| `CitationChip` | Inline superscript pill, `citation` type, `accent-fg` text on a cyan 10% tint, `radius-xs`, min 24x24 hit area padded to 44 on touch. Hover/focus opens the source popover. |
| `MessageBubble` | User: `surface-raised`, right-aligned, max 80% width. Assistant: no bubble, full column width, `body-lg`, so long cited answers read as a document rather than a chat blob. |
| `StreamingCursor` | 2px x 1em `accent` bar, 1s blink, stops under reduced-motion. |
| `SourcePreviewPane` | 420px right pane, `surface`, cited chunk highlighted with a cyan 16% tint plus a 2px left `accent` rule. |
| `UploadDropzone` | 2px dashed `border-interactive`, `radius-lg`, min-height 180. Drag-over: `surface-brand` fill, border -> `primary`. Always paired with a visible file-picker button; drag is never the only path. |
| `IngestProgress` | Stepper: Upload -> OCR -> Chunk -> Embed. Determinate gradient fill per stage; failed stage turns `danger` with an inline Retry. |
| `UsageMeter` | Track `bg-subtle`, fill gradient; crosses to `warning` at 80% and `danger` at 95%. Value is always printed as text next to the bar, never bar-only. |

---

## 8. CSS Variable Contract

Consumed by `packages/config` (Tailwind theme) and mirrored 1:1 into Figma variables.

```css
:root {
  /* ---- primitives ---- */
  --indigo-50:#F1F0FF; --indigo-100:#E3E0FF; --indigo-200:#C9C3FE; --indigo-300:#A69DFB;
  --indigo-400:#7D6FF6; --indigo-500:#6555F1; --indigo-600:#4C3AED; --indigo-700:#311EDC;
  --indigo-800:#2E20AC; --indigo-900:#2A2183; --indigo-950:#1B1551;

  --cyan-50:#ECFEFF; --cyan-100:#CFFAFE; --cyan-200:#A5F3FC; --cyan-300:#67E8F9;
  --cyan-400:#22D3EE; --cyan-500:#06B6D4; --cyan-600:#0891B2; --cyan-700:#0E7490;
  --cyan-800:#155E75; --cyan-900:#164E63; --cyan-950:#083344;

  --neutral-0:#FFFFFF; --neutral-25:#F8F8FC; --neutral-50:#F2F2F7; --neutral-100:#EAEAF1;
  --neutral-200:#D6D6E1; --neutral-300:#BAB9CA; --neutral-400:#9F9EB3; --neutral-500:#8B8AA3;
  --neutral-600:#6E6C89; --neutral-700:#4E4C67; --neutral-750:#343248; --neutral-800:#211F33;
  --neutral-900:#151320; --neutral-950:#0B0B14; --neutral-1000:#05050A;

  --gradient-brand: linear-gradient(135deg, var(--indigo-600) 0%, var(--cyan-400) 100%);
  --gradient-brand-safe: linear-gradient(135deg, var(--indigo-600) 0%, var(--indigo-400) 100%);

  /* ---- semantic: light ---- */
  --bg: var(--neutral-25);
  --bg-subtle: var(--neutral-50);
  --surface: var(--neutral-0);
  --surface-raised: var(--neutral-0);
  --surface-brand: var(--indigo-50);
  --fg: var(--neutral-900);
  --fg-muted: var(--neutral-700);
  --fg-subtle: var(--neutral-600);
  --fg-disabled: var(--neutral-400);
  --border: var(--neutral-200);
  --border-interactive: var(--neutral-500);
  --border-strong: var(--neutral-600);
  --primary: var(--indigo-600);
  --primary-hover: var(--indigo-700);
  --primary-fg: var(--indigo-600);
  --on-primary: #FFFFFF;
  --accent: var(--cyan-400);
  --accent-fg: var(--cyan-700);
  --on-accent: var(--cyan-950);
  --success: #15803D; --warning: #B45309; --danger: #DC2626; --info: var(--cyan-700);
  --ring: var(--indigo-600);
  --scrim: rgb(11 11 20 / .48);

  /* tonal fills — 12% in light */
  --tint-success: rgb(21 128 61 / .12);
  --tint-warning: rgb(180 83 9 / .12);
  --tint-danger:  rgb(220 38 38 / .12);
  --tint-info:    rgb(14 116 144 / .12);
  --tint-accent:  rgb(14 116 144 / .12);
  --tint-brand:   rgb(76 58 237 / .12);
  --tint-neutral: rgb(110 108 137 / .12);

  /* text on a tonal fill — verified against the composited tint, not --bg */
  --on-tint-success: #166534;
  --on-tint-warning: #92400E;
  --on-tint-danger:  #B91C1C;
  --on-tint-accent:  var(--cyan-800);
  --on-tint-info:    var(--cyan-800);
  --on-tint-brand:   var(--indigo-600);
  --on-tint-neutral: var(--neutral-700);

  --chart-series-1: var(--indigo-600);
  --chart-series-2: #B45309;
  --chart-series-3: var(--cyan-600);
  --chart-series-4: #15803D;
}

.dark, [data-theme="dark"] {
  --bg: var(--neutral-950);
  --bg-subtle: var(--neutral-1000);
  --surface: var(--neutral-900);
  --surface-raised: var(--neutral-800);
  --surface-brand: var(--indigo-950);
  --fg: var(--neutral-50);
  --fg-muted: var(--neutral-300);
  --fg-subtle: var(--neutral-500);
  --fg-disabled: var(--neutral-600);
  --border: var(--neutral-750);
  --border-interactive: var(--neutral-600);
  --border-strong: var(--neutral-500);
  --primary: var(--indigo-600);
  --primary-hover: var(--indigo-500);
  --primary-fg: var(--indigo-400);
  --on-primary: #FFFFFF;
  --accent: var(--cyan-400);
  --accent-fg: var(--cyan-400);
  --on-accent: var(--cyan-950);
  --success: #4ADE80; --warning: #FBBF24; --danger: #F87171; --info: var(--cyan-400);
  --ring: var(--cyan-400);
  --scrim: rgb(5 5 10 / .64);

  /* tonal fills — 18% in dark, so they read at the same perceived strength */
  --tint-success: rgb(74 222 128 / .18);
  --tint-warning: rgb(251 191 36 / .18);
  --tint-danger:  rgb(248 113 113 / .18);
  --tint-info:    rgb(34 211 238 / .18);
  --tint-accent:  rgb(34 211 238 / .18);
  --tint-brand:   rgb(125 111 246 / .18);
  --tint-neutral: rgb(139 138 163 / .18);

  --on-tint-success: #4ADE80;
  --on-tint-warning: #FBBF24;
  --on-tint-danger:  #F87171;
  --on-tint-accent:  var(--cyan-400);
  --on-tint-info:    var(--cyan-400);
  --on-tint-brand:   var(--indigo-300);
  --on-tint-neutral: var(--neutral-400);

  --chart-series-1: var(--indigo-400);
  --chart-series-2: #D97706;
  --chart-series-3: var(--cyan-600);
  --chart-series-4: #16A34A;
}
```

---

## 9. Enforcement Checklist

Gate for every screen before it leaves design (phase 6) and before it merges as code (phase 8).

- [ ] No raw hex in a component; semantic tokens only
- [ ] Mist is not used as light-mode text (Rule L1)
- [ ] No white text on cyan; no text on the full gradient (Rules 2.7, G1)
- [ ] Text on a tonal fill uses `on-tint-*`, verified against the composited tint (Rule T1)
- [ ] Chart palette re-validated with the `dataviz` six-check script after any series change
- [ ] Body text >=4.5:1, large text and UI boundaries >=3:1, verified per theme
- [ ] Focus ring present and visible on every interactive element in both themes
- [ ] Every touch target >=44x44 with >=8px separation
- [ ] Status is never conveyed by colour alone
- [ ] Empty, loading, and error states exist alongside the happy path
- [ ] `prefers-reduced-motion` honoured; only transform/opacity animate
- [ ] Tabular figures on every numeric column and live count
- [ ] No horizontal page scroll at 375px; wide content scrolls in its own container
- [ ] Heading levels sequential; landmarks present; skip link on every page
