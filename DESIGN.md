# DESIGN.md — RapidStats MY Design System

> A plain-text design system document (Stitch format) for AI coding agents.
> When fed to any AI agent, this document produces a consistent, production-quality
> UI for the RapidStats MY Malaysia Transit Dashboard.

---

## 1. Visual Theme & Atmosphere

**Product:** RapidStats MY — Malaysian public transit ridership dashboard
**Mood:** Cinematic dark, data-dense, honest, authoritative
**Density:** High information density with clear visual hierarchy
**Reference:** Dark-mode data observability dashboards (Grafana dark, Linear dark)

**Philosophy:**
- Dark surfaces reduce eye strain during extended data monitoring sessions
- Green accents signal "transit / GO" without implying false positivity or urgency
- Every data claim is attributed — source badges, confidence flags, freshness timestamps
- No fake "real-time" claims — data age is always visible in the status bar
- Glassmorphism adds perceived depth without heavy drop shadows
- CSS-only animations preserve 60fps performance (no JS animation libraries)

**Signature element:** CSS train animation — a 12-second looping silhouette that
passes horizontally through the hero section. Zero JavaScript, pure keyframes.
This is the brand's visual identity and must never be replaced with a GIF,
SVG animation, or JavaScript library.

---

## 2. Color Palette & Roles

### 2.1 Surface Tokens (Backgrounds)

| Token | Hex | Role | Where Used |
|-------|-----|------|------------|
| `--bg-base` | `#070e07` | Deepest background | Page shell, hero bottom fade |
| `--bg-surface-1` | `#0a120a` | Primary card background | Nav, status bar, summary stat cards |
| `--bg-surface-2` | `#1f2a1d` | Elevated surfaces | Ambient orbs, hover states |
| `--bg-surface-3` | `#2d3a2a` | Active / selected states | (Reserved for future active states) |
| `--bg-tooltip` | `#0f1a0d` | Tooltip / popover background | Chart tooltip, "Why the gap?" tooltip |
| `--bg-dropdown` | `#1a2418` | Dropdown / modal background | Status bar tooltip panel |

### 2.2 Accent Tokens (Brand & Transit)

| Token | Hex | Role | Where Used |
|-------|-----|------|------------|
| `--accent-heading` | `#336443` | Primary heading color | Ambient orbs, brand emphasis |
| `--accent-primary` | `#85AB8B` | Highlights, live indicators | Active nav, ping dots, CTA borders |
| `--accent-body` | `#6b7f68` | Subtitle / description text | Hero subtitle |
| `--accent-muted` | `#4b5b47` | Muted body text, chart axes | Recharts X/Y axis strokes |

### 2.3 Transit Line Tokens

| Token | Hex | Tailwind Equivalent | Line |
|-------|-----|---------------------|------|
| `--line-kajang` | `#fbbf24` | `amber-400` | MRT Kajang Line (SBK) |
| `--line-putrajaya` | `#38bdf8` | `sky-400` | MRT Putrajaya Line (SSP) |
| `--line-kelana-jaya` | `#a78bfa` | `violet-400` | LRT Kelana Jaya Line |
| `--line-ampang` | `#fb7185` | `rose-400` | LRT Ampang Line |
| `--line-monorail` | `#34d399` | `emerald-400` | Monorail Line |
| `--line-komuter` | `#2dd4bf` | `teal-400` | KTM Komuter |
| `--line-bus` | `#fb923c` | `orange-400` | RapidKL Bus (KL) |

### 2.4 Semantic / Status Tokens

| Token | Hex | Tailwind | Role |
|-------|-----|----------|------|
| `--status-holiday` | `#ef4444` | `red-400` | Confirmed holiday calendar dot |
| `--status-estimated` | `#f97316` | `orange-400` | Estimated date, stale data warning |
| `--status-friday` | `#facc15` | `yellow-400` | Friday calendar dot |
| `--status-weekend` | `#60a5fa` | `blue-400` | Weekend calendar dot |
| `--status-fresh` | `#85AB8B` | (accent) | Fresh data indicator |
| `--status-overdue` | `#ef4444` | `red-400` | Critical data delay |
| `--status-positive` | `#34d399` | `emerald-400` | Positive delta (ridership up) |
| `--status-negative` | `#ef4444` | `red-400` | Negative delta (ridership down) |

### 2.5 Opacity Tokens (White on dark)

These are not CSS variables but a standardized set of `white/N` values used
throughout the codebase. AI agents must use these exact opacities — no others.

| Opacity | Token Name | Usage |
|---------|-----------|-------|
| `white/90` | `text-primary` | Card titles, section headings |
| `white/80` | `text-secondary` | Card subtitles, key info |
| `white/70` | `text-body` | Body text, chart labels, hover text |
| `white/60` | `text-muted` | Month nav, secondary values |
| `white/50` | `text-label` | Data labels, descriptive text |
| `white/40` | `text-caption` | Captions, descriptions, sub-labels |
| `white/30` | `text-hint` | Hints, placeholders, "no dot = weekday" |
| `white/25` | `text-metadata` | Footer text, source attribution |
| `white/20` | `text-faint` | Source lines, very muted links |
| `white/15` | `border-divider` | Separator dots (`·`), subtle dividers |
| `white/10` | `border-card` | **Default card border** — most common |
| `white/[0.06]` | `border-subtle` | Section dividers, footer top border |
| `white/[0.04]` | `border-faint` | Very subtle separators, progress bar bg |
| `white/[0.03]` | `border-barely` | Track lines in train animation |
| `white/5` | `bg-glass` | **Default glassmorphism card fill** |
| `white/15` | `border-elevated` | Hover state borders |

### 2.6 Color Rules

1. **Never use pure black** (`#000000`). Always use `--bg-base` (`#070e07`) as the darkest surface.
2. **All card borders** use `border border-white/10`. Never solid white borders.
3. **Glassmorphism formula:** `bg-white/5 backdrop-blur-md border border-white/10`
4. **Transit line colors** are reserved for their respective lines. Do not reuse `--line-kajang` for a generic "warning" state.
5. **Green accent** (`#85AB8B`) is for the brand and positive indicators only. It does NOT mean "real-time" or "live."
6. **Orange** is the universal warning color — estimated holidays, stale data, overdue dates.
7. **Red** is reserved for critical states — overdue >30 days, confirmed holidays, negative deltas.

---

## 3. Typography

### 3.1 Font Stack

```
Primary:  Geist Sans ( bundled with Next.js 16 ), fallback Inter
Tabular:  Geist Mono ( bundled with Next.js 16 ), fallback JetBrains Mono
System:   'Geist Sans', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif
```

**Tailwind integration:** The project uses `--font-geist-sans` and `--font-geist-mono`
CSS variables already declared in `globals.css` via `@theme inline`.

### 3.2 Type Scale

| Token | Size (px) | Weight | Line Height | Letter Spacing | Tailwind Classes | Usage |
|-------|-----------|--------|-------------|----------------|-----------------|-------|
| `display-xl` | 36–72 | 600 | 1.02 | -0.025em | `text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight` | Hero H1 |
| `heading-section` | 16 | 600 | 1.4 | 0 | `text-base font-semibold` | Section headers (Analytics, About) |
| `heading-card` | 14 | 600 | 1.4 | 0 | `text-sm font-semibold` | Card titles |
| `heading-card-sub` | 14 | 500 | 1.4 | 0 | `text-sm font-medium` | Card sub-titles (Date Comparison) |
| `body-sm` | 14 | 400 | 1.5 | 0 | `text-sm` | Body descriptions |
| `body-xs` | 12 | 400–500 | 1.5 | 0 | `text-xs font-medium` | Line labels, values |
| `label` | 11 | 500 | 1.3 | 0.01em | `text-[11px] font-medium` | Descriptions, fine print |
| `caption` | 10 | 600 | 1.2 | 0.05em | `text-[10px] font-semibold uppercase tracking-widest` | Uppercase labels, KPI labels |
| `caption-sm` | 10 | 400–500 | 1.4 | 0 | `text-[10px] font-medium` | Footer text, sub-text |
| `micro` | 9 | 500 | 1.2 | 0.05em | `text-[9px] font-medium uppercase tracking-[0.15em]` | Train loop label, source info |
| `tabular-xl` | 24–30 | 600 | 1.0 | -0.02em | `text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight` | KPI card values |
| `tabular-lg` | 18 | 600 | 1.0 | -0.02em | `text-lg font-semibold tabular-nums tracking-tight` | Summary stat values |
| `tabular-sm` | 12 | 500 | 1.0 | 0 | `text-xs tabular-nums font-medium` | Delta percentages, dates |
| `tabular-caption` | 10–11 | 500–600 | 1.0 | 0 | `text-[10px] sm:text-[11px] tabular-nums font-semibold` | Status bar dates |

### 3.3 Typography Rules

1. **All numeric values** must use `tabular-nums` — no proportional digits anywhere.
   This ensures columns of numbers align vertically.
2. **Headings** use negative letter-spacing (`tracking-tight`) for visual density.
3. **Captions and micro text** use positive letter-spacing + `uppercase` for scannability.
4. **No bold on body text.** Weight 600 is reserved for headings and KPI values.
5. **Text color** always uses the opacity tokens from section 2.5. Never hardcode
   `text-[#6b7f68]` directly — use the semantic role.

---

## 4. Component Stylings

### 4.1 KPI Card

```
Container:
  background:   bg-white/5 (glassmorphism)
  border:       1px solid white/10
  border-radius: 16px (rounded-2xl)
  padding:      20px (p-5)
  shadow:       none — depth via border + backdrop-blur-md
  hover:        border-color transitions to white/15, translateY(-1px)

Layout:
  icon:         top-right, 16x16px, transit line color
  label:        caption token, white/50, uppercase
  value:        tabular-xl token, white, font-semibold
  delta:        DeltaBadge component — emerald/red/neutral
  "vs prior day": caption-sm token, white/30, native title tooltip
  source badge: micro token, orange-400/15 bg, orange-300/70 text, pill

Animation:
  entrance:     animate-fade-in-up, staggered 100ms per card
```

### 4.2 Summary Stat Card

```
Container:
  background:   bg-[var(--bg-surface-1)] (#0a120a)
  border:       1px solid white/[0.06]
  border-radius: 12px (rounded-xl)
  padding:      16px (px-4 py-3)
  shadow:       shadow-lg (subtle)

Layout:
  label:        caption token, white/40
  value:        tabular-lg token, white
  sub:          micro token, white/30
```

### 4.3 Data Status Bar

```
Container:
  background:   bg-[var(--bg-surface-1)]/70 + backdrop-blur-xl
  border:       1px solid white/[0.04] (bottom only)
  height:       ~40px
  padding:      0 16px (mobile) / 0 24px (tablet) / 0 40px (desktop)
  position:     fixed, below nav (z-20)

Items:
  icon:         CheckCircle2 (fresh, #85AB8B) or Clock (stale, orange-400)
  source label: caption-sm, white/40
  date:         tabular-caption, green (fresh) or orange-300 (stale)
  lag text:     micro token, white/25, "Data recorded Xd ago"
  separator:    invisible gap, no visible dot

Tooltip ("Why the gap?"):
  position:     absolute, top-full, right-aligned
  background:   bg-[var(--bg-dropdown)]/95 + backdrop-blur-xl
  border:       1px solid white/10
  border-radius: 12px (rounded-xl)
  padding:      16px (p-4)
```

### 4.4 Ridership Chart

```
Container:
  background:   bg-white/5 (glassmorphism)
  border:       1px solid white/10
  border-radius: 16px (rounded-2xl)
  padding:      24px (p-6)
  shadow:       shadow-lg

Header:
  title:        heading-card, white/90
  subtitle:     caption-sm, white/40
  legend:       inline, right-aligned, color dot + text-[10px] per line

Chart area:
  height:       288px mobile, 320px tablet+ (h-72 sm:h-80)
  grid:         stroke white/[0.04], dashed, no vertical lines
  X-axis:       --accent-muted (#4b5b47), 10px, MM/DD format, no tick line
  Y-axis:       --accent-muted (#4b5b47), 10px, auto-format (1.2M, 450k), no tick line

Strokes (Recharts Area):
  Total:        #85AB8B, strokeWidth 1.5, gradient fill (opacity 0.15 → 0)
  Kajang:       #fbbf24, strokeWidth 2, gradient fill (opacity 0.25 → 0)
  Putrajaya:    #38bdf8, strokeWidth 2, gradient fill (opacity 0.25 → 0)
  Dots:         none (dot={false})

Tooltip (CustomTooltip):
  background:   #0f1a0d/95 + backdrop-blur-md
  border:       1px solid white/10
  border-radius: 12px
  padding:      12px

Footer:
  left:         "Source: data.gov.my · CC-BY 4.0", caption-sm, white/30
  right:        "{data.length} days of data", caption-sm, white/30
  separator:    border-t border-white/5, pt-3
```

### 4.5 Transit Breakdown (Line Breakdown)

```
Container:
  background:   bg-white/5 (glassmorphism)
  border:       1px solid white/10
  border-radius: 16px (rounded-2xl)
  padding:      20px mobile, 24px tablet+ (p-5 sm:p-6)
  shadow:       shadow-lg

Header:
  title:        heading-card, white/90, "Line Breakdown"
  subtitle:     caption-sm, white/40, "Latest day — {date}"

Per line:
  layout:       flex between — (dot + name) | (value + trend)
  dot:          6px circle, transit line color
  name:         body-xs, white/70 → white/90 on hover
  value:        body-xs, white, font-semibold, tabular-nums
  trend:        TrendIcon (3x) + delta %, emerald/red/white/30
  bar:          6px height, bg-white/[0.04] track, line color fill at 60% opacity

Footer:
  "Total Rail"  caption, white/30, uppercase
  total value   text-sm, white, font-semibold, tabular-nums
  separator:    border-t border-white/[0.06], pt-3
```

### 4.6 Calendar Picker

**Default month rule:** The calendar MUST open on the month of the latest data
point (e.g., April 2026 if `data[data.length-1].date` is `2026-04-30`).
Never default to the current calendar month — users must see data dates first.
Implementation: parent guards render until data loads, then passes
`defaultMonth={new Date(latest.date + 'T00:00:00')}` as a prop.

```
Container:
  background:   bg-white/5 (glassmorphism)
  border:       1px solid white/10
  border-radius: 16px (rounded-2xl)
  padding:      20px mobile, 24px tablet+ (p-4 sm:p-5)

Header:
  title:        heading-card-sub, white/80, "Date Comparison" + Calendar icon
  month nav:    prev/next ChevronLeft/Right, 12px buttons, rounded-lg
  month label:  body-xs, white/70, w-28 text-center, "MMMM yyyy"

Weekday headers:
  text:         caption, white/30, uppercase
  grid:         7-column, gap-1

Day cells:
  size:         32px × 32px (h-8 w-full)
  border-radius: 8px (rounded-lg)
  default:      text-white/70, hover bg-white/10 text-white
  today:        ring-1 ring-[#85AB8B]/60
  selected:     bg-[#85AB8B] text-[#070e07] shadow-lg shadow-[#85AB8B]/20

Holiday dots:
  size:         6px circle (w-1.5 h-1.5 rounded-full)
  position:     absolute, bottom-0.5, centered (left-1/2 -translate-x-1/2)
  confirmed:    bg-red-400
  estimated:    bg-orange-400
  friday:       bg-yellow-400
  weekend:      bg-blue-400
  weekday:      no dot

Warning pulse (estimated holidays):
  size:         8px (w-2 h-2)
  position:     absolute, -top-0.5, -right-0.5
  color:        bg-orange-500
  animation:    animate-pulse

Legend:
  layout:       flex wrap, gap-3
  items:        dot + caption-sm, white/40
  last item:    "· No dot = weekday", micro token, white/25

Comparison hint:
  selected × 2: text-xs, #85AB8B, font-medium
  selected × 1: caption-sm, white/30
  separator:    border-t border-white/[0.06], mt-3 pt-3
```

### 4.7 Train Animation Container

**CRITICAL: The CSS keyframe below is preserved VERBATIM. Do not modify the
animation name, duration, timing function, keyframe percentages, or transform
values. This is the brand's signature element.**

```css
@keyframes train-pass {
  0% {
    transform: translateX(110%);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateX(-110%);
    opacity: 0;
  }
}

.animate-train-pass {
  animation: train-pass 12s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
```

**Container environment (enhanceable):**
```
hero wrapper:  relative, overflow-hidden, height 300/340/360px (responsive)
base bg:       --bg-base

Platform glow:
  gradient:    to-top from #85AB8B/6 via-transparent to-transparent
  gradient:    to-bottom from #070e07/80 via-transparent to #070e07/60

Track bed:
  position:    absolute, bottom-8
  lines:       h-px, white/[0.03] to white/[0.12]
  ties:        60 flex-1 divs, h-px bg-white/[0.05], gap-[3px]
  rails:       h-px bg-white/[0.12] w-full

Train element:
  position:    absolute, bottom-16, centered
  wrapper:     relative, w-80, h-20, animate-train-pass
  headlight:   amber-400/25 blur, left side
  tail light:  red-400/15 blur, right side
  windows:     6 flex-1 amber-400/12 rects with border
  roof detail: amber-400/40 h-[2px], amber-400/15 h-[1px]
  body:        amber-400/12 gradient overlay, rounded-xl

Ping indicator:
  position:    absolute, bottom-5, left-5
  dot:         h-1.5 w-1.5, #85AB8B, animate-ping
  label:       micro token, #85AB8B/30, "Train Loop — 12s cycle"

Bottom fade:
  gradient:    to-top from #070e07 to-transparent, h-24
```

**Allowed enhancements:** Add ambient particle overlays, subtle platform
reflection, or parallax depth layers to the container. These must NOT
interfere with the train animation's performance or visual path.

### 4.8 About Section Cards

```
Container (per card):
  background:   bg-white/5 (glassmorphism)
  border:       1px solid white/10
  border-radius: 16px (rounded-2xl)
  padding:      20px mobile, 24px tablet+ (p-5 sm:p-6)

Icon badge:
  size:         36px × 36px (w-9 h-9)
  border-radius: 12px (rounded-xl)
  colors:       line-color/10 bg, line-color/20 border

Title:
  heading-card, white/90, mb-2

Body text:
  body-xs / label, white/50, leading-relaxed

Grid:
  3 columns on desktop (lg:grid-cols-3)
  2 columns on tablet (md:grid-cols-2)
  1 column on mobile
  gap: 20px (gap-5)

Animation:
  animate-fade-in-up, staggered 80ms per card, initial opacity-0
```

### 4.9 Data Integrity Banner

```
Background:   bg-orange-500/10
Border:       1px solid border-orange-500/20
Text:         text-orange-300, body-xs
Icon:         Activity, 16px, text-orange-400
Border-radius: 12px (rounded-xl)
Padding:      12px 16px (px-4 py-3)
Layout:       flex, icon + text, gap-3
```

### 4.10 Nav Bar

```
Container:
  position:     fixed, top-0, z-30
  background:   --bg-base/80 + backdrop-blur-xl (glassmorphism)
  border:       1px solid white/[0.04] (bottom)
  height:       60px mobile, 68px tablet+

Logo:
  icon:         Activity, 16px, #85AB8B
  text:         "RapidStats", body-xs, white/60
  superscript:  "MY", 8px, #85AB8B

Nav links (desktop):
  container:    pill, bg-white/5, border white/10, rounded-full
  link:         caption-sm, white/50 → white/90 on hover
  active:       white/90, border-bottom accent

Mobile hamburger:
  icon:         Menu/X, 20px, white/60
  drawer:       slide-down, bg-white/5, backdrop-blur-xl, border-t white/[0.06]
```

### 4.11 Footer

```
Position:       sticky to bottom via mt-auto on root flex container
Border:         border-t border-white/[0.06]
Padding:        24px 16px mobile, 24px 40px desktop (pt-6 pb-8)
Layout:         flex, items-center, justify-between, gap-3

Left:
  logo + name:  RapidStats (MY superscript), body-xs, white/40
  separator:    w-px h-3 bg-white/10
  tech:         "Built with Next.js 16 · Recharts · Tailwind CSS", micro, white/25

Right:
  license:      "Headline data: monthly audited · CC-BY 4.0 · data.gov.my", micro, white/25
  link:         "datagovmy-meta", micro, white/25 → white/50 hover

Animation:      animate-fade-in-up, delay 650ms
```

---

## 5. Layout Principles

### 5.1 Grid System

```
Base grid:     12-column (Tailwind lg:grid-cols-12)
Card gap:      20px (gap-5) mobile/tablet, 24px (gap-6) desktop (sm:)
Max-width:     1400px (max-w-[1400px]), centered with mx-auto
```

### 5.2 Page Padding

```
Mobile:        16px (px-4)
Tablet:        24px (px-6)
Desktop:       40px (px-10)
```

### 5.3 Section Spacing

```
Between major sections:  32px (pb-8 / pt-8)
Between card groups:     24px (mb-6)
Between cards in grid:   20–24px (gap-5 / gap-6)
Internal card padding:   20–24px (p-5 / sm:p-6)
```

### 5.4 Grid Layouts (by section)

```
Hero:            full width, centered text, max-w-2xl
Summary Stats:   4 columns (grid-cols-2 sm:grid-cols-4), gap-3
KPI Cards:       4 columns (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4), gap-4
Main Chart Grid: 8-col chart + 4-col breakdown (lg:grid-cols-12)
Analytics Grid:  8-col table + 4-col calendar (lg:grid-cols-12)
About Grid:      3-col on desktop, 2-col tablet, 1-col mobile
```

### 5.5 Z-Index Hierarchy

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base content | z-0 | Cards, text, charts |
| Calendar tooltip | z-10 | Comparison hint within calendar |
| Status bar | z-20 | Fixed data freshness bar |
| Nav | z-30 | Fixed navigation |
| Modal/overlay | z-40 | "Why the gap?" tooltip, future modals |
| Toast | z-50 | Sonner toast notifications |

---

## 6. Depth & Elevation

**Design decision:** No drop shadows on cards. Depth is communicated through
background layering and border luminosity only.

### 6.1 Surface Hierarchy

| Level | Token | Background | Border | Usage |
|-------|-------|-----------|--------|-------|
| 0 (deepest) | `--bg-base` | `#070e07` | none | Page shell, hero |
| 1 (card) | `--bg-surface-1` | `#0a120a` | `white/10` | Stat cards, nav bg |
| 1 (glass) | n/a | `white/5` + `backdrop-blur-md` | `white/10` | KPI, chart, calendar |
| 2 (elevated) | `--bg-surface-2` | `#1f2a1d` | `white/15` | Hover states, orbs |
| 3 (active) | `--bg-surface-3` | `#2d3a2a` | `white/20` | Selected, pressed |

### 6.2 Ambient Effects

```
Gradient orbs:
  count:        3
  size:         300–600px circles
  filter:       blur-[100px] to blur-[140px]
  opacity:      0.08 to 0.30
  animation:    animate-pulse-glow, 5–6s cycle, staggered delays
  position:     fixed, inset-0, pointer-events-none
  colors:       #336443/20, #1f2a1d/30, #85AB8B/8
```

---

## 7. Do's and Don'ts

### Do

- Use `tabular-nums` for ALL numeric values — dates, ridership counts, percentages, delta values
- Show data source attribution on every metric (source badge, footer line)
- Flag uncertain dates with the warning triangle and orange color
- Preserve the CSS train animation keyframe and duration exactly as defined in section 4.7
- Use the standardized white/N opacity tokens from section 2.5 — do not invent new opacities
- Use `animate-fade-in-up` with staggered delays for card entrances
- Use glassmorphism (`bg-white/5 backdrop-blur-md border border-white/10`) for content cards
- Show "Data recorded Xd ago" timestamps for data freshness transparency
- Use `rounded-2xl` (16px) for all major card containers
- Use semantic color tokens from this document, never raw hex values in components

### Don't

- Add drop shadows to cards (use border luminosity and background layering)
- Use pure black (`#000000`) anywhere — always use `--bg-base`
- Claim "real-time" without a visible freshness timestamp
- Hardcode holiday dates — always fetch from the holiday API chain
- Introduce Framer Motion, GSAP, Lottie, or any JS animation library
- Modify the `train-pass` keyframe duration (12s), easing (cubic-bezier), or transform values
- Use indigo or blue as a primary accent color (blue is reserved for weekend dots and Putrajaya line only)
- Use `eslint-disable` comments to suppress lint rules
- Change the Recharts Area `dot={false}` setting (dots on the line chart would be noisy)
- Add border-radius values other than the standard set: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full`

---

## 8. Responsive Behavior

### 8.1 Breakpoints

| Breakpoint | Width | Columns | Key Changes |
|-----------|-------|---------|-------------|
| Mobile | < 640px | 1 | Stacked cards, hamburger nav, reduced chart height |
| Tablet (sm) | 640–1023px | 2 | 2-col KPIs, 2-col stats, visible nav links |
| Desktop (lg) | 1024–1279px | 12-grid | 8+4 layout for chart+breakdown, 8+4 for analytics |
| Wide (xl) | ≥ 1280px | 12-grid | Max 1400px container, wider chart area |

### 8.2 Component-Specific Responsive Rules

**Hero:**
- Mobile: h-[300px]
- Tablet: h-[340px] (sm:)
- Desktop: h-[360px] (md:)

**Nav:**
- Mobile: hamburger menu, 60px height
- Desktop: pill nav, 68px height (sm:)

**Status bar:**
- Mobile: source labels hidden, dates visible
- Tablet: full labels visible (sm:)

**Summary Stats:**
- Mobile: 2 columns (grid-cols-2)
- Tablet+: 4 columns (sm:grid-cols-4)

**KPI Cards:**
- Mobile: 1 column (grid-cols-1)
- Tablet: 2 columns (sm:grid-cols-2)
- Desktop: 4 columns (lg:grid-cols-4)

**Chart height:**
- Mobile: h-72 (288px)
- Tablet+: h-80 (320px) (sm:)

**KPI value font:**
- Mobile: text-2xl
- Tablet+: text-3xl (sm:)

**About grid:**
- Mobile: 1 column
- Tablet: 2 columns (md:grid-cols-2)
- Desktop: 3 columns (lg:grid-cols-3)

**Footer:**
- Mobile: stacked (flex-col)
- Tablet+: row (sm:flex-row)

---

## 9. Agent Prompt Guide

### 9.1 Quick Color Reference

```
Brand green (primary):    #85AB8B  — headings, active states, brand marks
Brand green (deep):       #336443  — ambient orbs, heading emphasis
Body text muted:          #4b5b47  — chart axes, very muted labels
Subtitle:                 #6b7f68  — hero subtitle

MRT Kajang:               #fbbf24  (amber-400)
MRT Putrajaya:            #38bdf8  (sky-400)
LRT Kelana Jaya:          #a78bfa  (violet-400)
LRT Ampang:               #fb7185  (rose-400)
Monorail:                 #34d399  (emerald-400)
KTM Komuter:              #2dd4bf  (teal-400)
Bus KL:                   #fb923c  (orange-400)

Confirmed holiday:        #ef4444  (red-400)
Estimated holiday:        #f97316  (orange-400)
Friday:                   #facc15  (yellow-400)
Weekend:                  #60a5fa  (blue-400)

Positive delta:           #34d399  (emerald-400)
Negative delta:           #ef4444  (red-400)
Overdue / stale:          #f97316  (orange-400)
```

### 9.2 Ready-to-Use Prompts

**Creating a new KPI card:**
> "Create a KPI card for [Line Name] with value [N], delta [±X.X]%, using the
> glassmorphism card style from section 4.1. The transit line color is
> [--line-token]. Include a 'headline audited' source badge and 'vs prior day'
> with native title tooltip showing the comparison date."

**Creating a chart:**
> "Build a Recharts AreaChart with gradient fills using --line-kajang (#fbbf24)
> and --line-putrajaya (#38bdf8) tokens. Use the CustomTooltip style from
> section 4.4. Chart background is glassmorphism. Grid lines are white/[0.04],
> dashed, vertical=false."

**Creating a calendar:**
> "Style a calendar picker with confirmed holiday dots (red-400), estimated dots
> (orange-400), Friday dots (yellow-400), and weekend dots (blue-400). Selected
> day uses --accent-primary (#85AB8B) fill with dark text. See section 4.6."

**Enhancing the train container:**
> "Add ambient visual effects to the train animation container (section 4.7).
> You may add gradient overlays, subtle particle layers, or platform reflections.
> Do NOT modify the train-pass keyframe, its duration (12s), or its easing
> function. The .animate-train-pass class and @keyframes train-pass block are
> immutable."

**Creating an About card:**
> "Create an About section card using the glassmorphism style from section 4.8.
> Include a 36px icon badge with the relevant color, heading-card title,
> and label/body text. The card should animate in with fade-in-up and 80ms
> stagger delay."

### 9.3 Token Application Rules

1. **Always** use `var(--token-name)` in CSS custom properties — never hardcode
   hex values directly in component className strings.
2. **Exception:** Tailwind utility classes like `text-amber-400` or `bg-sky-400`
   are acceptable for transit line colors since they map 1:1 to the tokens.
3. **White opacity:** Use the standardized set from section 2.5. If a needed
   opacity is not listed, use the nearest available one.
4. **Border radius:** Only use `rounded-lg` (8px), `rounded-xl` (12px),
   `rounded-2xl` (16px), or `rounded-full`. No other values.
5. **Spacing:** Follow the 4px base unit. Common values: 4, 8, 12, 16, 20, 24,
   32, 40px. Use Tailwind spacing scale (p-1 through p-10, gap-1 through gap-10).
6. **Animation delays:** Use multiples of 80–100ms for staggered entrances.
   First card: 0ms or 100ms. Each subsequent card: +100ms.

---

## Appendix A: Existing Animations (Immutable)

These animations are defined in `globals.css` and used throughout the dashboard.
Do not rename, modify durations, or change easing functions.

| Name | Duration | Easing | Iteration | Usage |
|------|----------|--------|-----------|-------|
| `fadeInUp` | 0.7s | `cubic-bezier(0.22, 1, 0.36, 1)` | once (forwards) | Card entrances |
| `pulse-glow` | 6s | `ease-in-out` | infinite | Ambient orbs |
| `train-pass` | **12s** | `cubic-bezier(0.22, 1, 0.36, 1)` | infinite | Train animation |
| `shimmer` | 3s | `ease-in-out` | infinite | Loading shimmer |

**Note:** `train-pass` and `pulse-glow` differ slightly from the prompt's suggested
values (prompt says 5s for pulse-glow, code uses 6s). The codebase values are
canonical — use what's in `globals.css`.

---

## Appendix B: Migration Map (Token → Existing File)

| File | Current Pattern | Token Replacement |
|------|----------------|-------------------|
| `globals.css` | No custom tokens | Add `:root { --bg-base: #070e07; ... }` block |
| `page.tsx` | `bg-[#070e07]` | `bg-[var(--bg-base)]` |
| `page.tsx` | `bg-[#0a120a]/80` | `bg-[var(--bg-surface-1)]/80` |
| `page.tsx` | `text-[#85AB8B]` | `text-[var(--accent-primary)]` |
| `page.tsx` | `text-[#6b7f68]` | `text-[var(--accent-body)]` |
| `kpi-cards.tsx` | `bg-amber-400/10` | Keep as Tailwind utility (1:1 mapped) |
| `ridership-chart.tsx` | `stroke="#85AB8B"` | `stroke="var(--accent-primary)"` |
| `ridership-chart.tsx` | `stroke="#fbbf24"` | `stroke="var(--line-kajang)"` |
| `ridership-chart.tsx` | `stroke="#38bdf8"` | `stroke="var(--line-putrajaya)"` |
| `ridership-chart.tsx` | `stroke="#4b5b47"` | `stroke="var(--accent-muted)"` |
| `calendar-picker.tsx` | `bg-red-400` | `bg-[var(--status-holiday)]` |
| `calendar-picker.tsx` | `bg-orange-400` | `bg-[var(--status-estimated)]` |
| `calendar-picker.tsx` | `bg-yellow-400` | `bg-[var(--status-friday)]` |
| `calendar-picker.tsx` | `bg-blue-400` | `bg-[var(--status-weekend)]` |
| `data-status-bar.tsx` | `text-[#85AB8B]` | `text-[var(--accent-primary)]` |
| `data-status-bar.tsx` | `bg-[#1a2418]/95` | `bg-[var(--bg-dropdown)]/95` |
| `cinematic-train.tsx` | `from-[#85AB8B]/6` | `from-[var(--accent-primary)]/6` |
| `cinematic-train.tsx` | `from-[#070e07]` | `from-[var(--bg-base)]` |
| `transit-breakdown.tsx` | `text-amber-400` | Keep as Tailwind utility (1:1 mapped) |

**Durability note:** The "Current Pattern" column uses search strings (e.g.,
`bg-[#070e07]`), not line numbers. Line numbers shift with every code change;
search strings remain stable across commits. When applying this map, use your
editor's find-and-replace with the exact pattern strings shown.

**Priority order:** (1) `globals.css` token declarations, (2) `ridership-chart.tsx`
Recharts strokes, (3) `calendar-picker.tsx` dot colors, (4) remaining files.

**Files with NO changes needed:**
- `analytics-table.tsx` — uses Tailwind utilities only
- `comparison-chart.tsx` — uses Recharts stroke from data
- `data-integrity-banner.tsx` — uses Tailwind utilities only
- `holidays/route.ts` — server-side, no UI tokens
- `use-analytics.ts` — logic only, no styling

---

*Document generated for RapidStats MY v1.0 — Malaysia Transit Dashboard*
*Format: Stitch/VoltAgent DESIGN.md specification*
*Last updated: 2026-05-24*
