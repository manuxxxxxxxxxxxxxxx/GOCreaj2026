---
name: "[SV]Go"
description: "Hyperlocal delivery marketplace for El Salvador — evolved blue, committed color strategy, Sora + Manrope type, custom line-icon system, orchestrated motion."
colors:
  primary: "#2563EB"
  primary-deep: "#1D4ED8"
  accent: "#EA580C"
  success: "#16A34A"
  destructive: "#DC2626"
  bg: "#F8FAFC"
  bg-alt: "#EEF3FB"
  surface: "#FFFFFF"
  surface-2: "#F1F5F9"
  text: "#0F172A"
  text-muted: "#475569"
  text-faint: "#94A3B8"
  border: "#E2E8F0"
  primary-dark: "#3B82F6"
  primary-deep-dark: "#60A5FA"
  accent-dark: "#FB923C"
  success-dark: "#34D399"
  destructive-dark: "#F87171"
  bg-dark: "#0F172A"
  bg-alt-dark: "#0B1220"
  surface-dark: "#1E293B"
  surface-2-dark: "#17233A"
  text-dark: "#F1F5F9"
  text-muted-dark: "#94A3B8"
  text-faint-dark: "#64748B"
  border-dark: "#334155"
typography:
  display:
    fontFamily: "Sora, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Sora, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-pill:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
---

## Overview

[SV]Go is a hyperlocal delivery marketplace for El Salvador (4 roles: Comprador, Vendedor, Repartidor, Admin) shipped as two codebases sharing one PHP/MySQL backend: a React + Vite web app (`apps/web/web`) and a React Native/Expo mobile app (`apps/mobile/frontend`). This system is an **evolution** of the existing brand blue (`#4A6D8C`), not a replacement — approved after a 16-question intake and a live HTML mockup reviewed with the user (dark/light toggle, both a Comprador mobile screen and a Vendedor web dashboard). Two rounds of feedback moved the direction to its final state: emoji iconography rejected outright in favor of a single custom line-icon set, typography reconsidered from Plus Jakarta Sans to Sora + Manrope, and the primary blue confirmed at its original saturation (`#2563EB` / `#3B82F6` dark) after a same-session darker variant was tried and rejected.

Color strategy is **Committed**: the primary blue owns 30–60% of each surface (headers, primary buttons, section fields), not a neutral base with a scattered accent. Both light and dark themes get equal design care — dark is not a secondary/fallback mode.

Web and mobile share brand (color, type, tone, icon grammar) but each follows its own platform convention: mobile uses bottom tabs, gesture-friendly touch targets, and native safe areas; web uses sidebar/table-dense dashboards and hover states. Web dashboards (Vendedor/Admin/Repartidor desktop) run dense; mobile runs spacious with larger touch targets.

## Colors

Committed strategy, evolved-blue anchor:

- **Primary** (`#2563EB` light / `#3B82F6` dark) — the dominant color. Headers, primary CTAs, active nav state, section backgrounds at page scale. Not a small accent — it should read as "this app is blue" at a glance.
- **Primary Deep** (`#1D4ED8` / `#60A5FA` dark) — pressed states, gradient partner for headers (`linear-gradient(135deg, primary, primary-deep)`).
- **Accent** (`#EA580C` / `#FB923C` dark) — warm orange, reserved for urgency/energy: "Entrega Express", live-tracking pin, primary marketing CTAs, offer badges. Never placed adjacent to primary in a way that competes for attention in the same zone.
- **Success** (`#16A34A` / `#34D399`) — confirmed/delivered states only.
- **Destructive** (`#DC2626` / `#F87171`) — errors, rejections, cancellations only.
- Neutrals carry a faint blue hue bias (`bg-alt: #EEF3FB` light, cool slate-blue darks) rather than pure gray — chosen to match the primary, not inherited from a template.

Dark mode is not an inversion: surfaces step from `bg` → `bg-alt` → `surface` → `surface-2`, same relationship as light, recalibrated for contrast rather than flipped 1:1.

## Typography

Two-family system, both self-hosted (no CDN font links — Google Fonts CDN is blocked by CSP in the artifact tooling used to prototype this; production apps should self-host the `.ttf`/`.woff2` files rather than link `fonts.googleapis.com`):

- **Sora** (700/800) — display and headings, all numerals (prices, KPIs, order numbers). Chosen over Plus Jakarta Sans (the first-round pick) for more geometric character; chosen over Inter/Space Grotesk because those read as the generic AI-default pairing. `font-variant-numeric: tabular-nums` on every numeral column.
- **Manrope** (400/500/600/700/800) — body text, UI labels, dense table content. Highly legible at small sizes, which matters for the dense web dashboards.

Never mix in a third family. Uppercase labels (section eyebrows, table headers, badges) get `letter-spacing: 0.04–0.07em` and the smallest weight that stays legible (usually 700, size ~0.68rem).

## Layout

- **Web dashboards (Vendedor/Admin/Repartidor desktop):** dense — KPI row, compact table rows (~44px), minimal padding, sidebar/tab navigation. Optimized for "see everything at once."
- **Mobile (Comprador/Vendedor/Repartidor):** spacious — 2-column product grid, generous touch targets (≥44px), bottom tab bar, one primary action per screen.
- **Comprador-facing surfaces** (Market/Home): product photography is large and protagonist — the image is the primary scanning cue.
- **Operational surfaces** (Vendedor/Admin panels): imagery is small/functional; data (price, status, buyer) leads.
- Coverage/business rule from PRODUCT.md still applies: never design an ordering flow that implies delivery outside an active-coverage municipio.

## Elevation & Depth

Two shadow tokens only — don't invent a third:

- `shadow`: `0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)` (light) — everyday cards, dropdowns.
- `shadow-lg`: heavier, used only for the phone-mockup-style presentation frame and hover-lifted cards — not for routine elements.

One deliberate 3D moment is reserved system-wide for **order confirmation only**: a small CSS 3D box (6 faces, `transform-style: preserve-3d`) that spins twice on entrance and settles front-facing with a checkmark badge. This is the system's single true 3D element — do not add 3D transforms elsewhere; that would dilute the one moment designed to earn it.

## Shapes

- Cards/panels: `16px` radius (`rounded.lg`).
- Buttons, inputs, category tiles: `10–12px` radius (`rounded.md`).
- Pills/badges/avatars: fully round (`rounded.pill`).
- Product-card image tiles: same `16px` as the card (no separate inner radius break).

## Components

- **Icons — one custom line-icon system, zero emoji.** Every icon in the product (search, location, categories, tab bar, status pills, order actions, delivery/bike marker) is drawn from a single 24×24 stroke set: `stroke-width: 1.9–2.4`, `stroke-linecap/linejoin: round`, `fill: none` except small solid accent dots. Outline by default; filled/colored background only on the active/selected state (nav tabs, active category). Never use an emoji character as a functional icon or status marker anywhere in the product — this was an explicit, emphatic rejection from the user, not a style preference to weigh against convenience.
- **Buttons:** primary = solid `primary` background, white text, `rounded.md`. Accent/CTA buttons (checkout, express, publish) = solid `accent`. Secondary = outline, `border` color, transparent background.
- **Status pills:** tinted background at ~15% of the semantic color (`color-mix(in srgb, var(--x) 15%, transparent)`), text in the full semantic color, a matching small icon, never emoji.
- **KPI/stat tiles:** label (icon + uppercase caption) → large Sora numeral (tabular figures) → small delta line, semantic-colored.
- **Order confirmation card:** 3D box (see Elevation & Depth) + order number in a `bg-alt` pill using `Sora 800` tabular numerals — this is a signature moment, give it its own visual weight, don't compress it into a generic toast.
- **Live tracking:** the only *looping* animation in the system is the tracking-pin pulse (`~2.2s ease-in-out`) — justified because it represents a live, ongoing state. No other element should loop indefinitely.

## Do's and Don'ts

- **Do** treat blue as dominant, not an accent — 30–60% coverage per screen, not a color that only shows up on buttons.
- **Do** keep dark and light at equal fidelity; never ship a component only styled for one theme.
- **Do** use the accent orange sparingly and with intent (urgency/CTA/live-status) — it loses meaning if it decorates everything.
- **Do** orchestrate animation as a small set of purposeful moments (entrance stagger once on load, card hover-tilt, order-confirm 3D box, tracking pulse, KPI count-up) rather than scattering effects; respect `prefers-reduced-motion` everywhere.
- **Don't** use emoji as UI iconography anywhere — not tab bars, not category chips, not status badges, not empty states. This is a hard rule from the client, already broken once and corrected; do not reintroduce it.
- **Don't** default to Inter or Space Grotesk out of habit — this system's committed pairing is Sora + Manrope.
- **Don't** add a second 3D-transformed element competing with the order-confirmation box; that moment is deliberately singular.
- **Don't** load fonts from `fonts.googleapis.com` in production code — self-host the files.
