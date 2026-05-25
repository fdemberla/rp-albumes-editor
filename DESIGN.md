---
name: Editor de Metadatos
description: Professional photo metadata editor for studio photographers.
colors:
  studio-blue: "#2563eb"
  studio-blue-deep: "#1d4ed8"
  studio-blue-light: "#3b82f6"
  studio-blue-subtle: "#dbeafe"
  surface-light: "#f9fafb"
  surface-card: "#ffffff"
  surface-dark: "#111827"
  surface-card-dark: "#1f2937"
  surface-input-dark: "#374151"
  border-light: "#e5e7eb"
  border-mid: "#d1d5db"
  border-dark: "#4b5563"
  border-darker: "#374151"
  text-primary-light: "#111827"
  text-secondary-light: "#4b5563"
  text-muted: "#6b7280"
  text-primary-dark: "#f9fafb"
  text-secondary-dark: "#d1d5db"
  text-muted-dark: "#9ca3af"
  semantic-success: "#16a34a"
  semantic-success-bg: "#f0fdf4"
  semantic-danger: "#dc2626"
  semantic-danger-bg: "#fef2f2"
  semantic-info-bg: "#eff6ff"
  semantic-admin: "#9333ea"
  semantic-admin-bg: "#f3e8ff"
typography:
  headline:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.studio-blue}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.studio-blue-deep}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.sm}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.studio-blue}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.semantic-info-bg}"
    textColor: "{colors.studio-blue}"
    rounded: "{rounded.sm}"
  button-danger:
    backgroundColor: "{colors.semantic-danger}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  button-success:
    backgroundColor: "{colors.semantic-success}"
    textColor: "{colors.surface-card}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  badge:
    backgroundColor: "{colors.studio-blue-subtle}"
    textColor: "#1e40af"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-admin:
    backgroundColor: "{colors.semantic-admin-bg}"
    textColor: "#7e22ce"
    rounded: "{rounded.full}"
    padding: "2px 6px"
---

# Design System: Editor de Metadatos

## 1. Overview

**Creative North Star: "The Production Floor"**

Editor de Metadatos is built on the metaphor of a working production floor — an environment where every surface exists to facilitate the work, not narrate it. The design is calibrated for photographers processing hundreds of images: information density takes precedence over whitespace, form fields are the primary interface, and status indicators are always visible regardless of which screen the user is on. There is no dead space that exists for visual appeal alone.

Two themes operate simultaneously and with equal weight. The light surface (gray-50 page, white cards) reads cleanly under daylight in an editing suite. The dark surface (gray-900 background, gray-800 cards) is a first-class environment — built for color-calibrated studio monitors where ambient light is controlled. Both modes share identical structural hierarchy and spacing; only surface and contrast values differ. Dark mode is not an adapted afterthought; it was designed alongside light from the start.

Color is restrained to a single directive: Studio Blue carries all primary action. Every button that does something, every progress indicator that advances, every focus ring that confirms user attention uses this single hue. Semantic states (green for success, red for failure, purple for administration) are deployed once per context and nowhere decoratively. Gray handles all structure. The result is a UI where anything blue is actionable — a rule the eye learns in under a minute and navigates by instinct.

**Key Characteristics:**
- Dense but not cluttered: tight spacing in forms, breathing room in section headers
- Forms are the product: inputs and labels are first-class, always visible, tabbable in sequence
- Status is structural: DB and SFTP connection live in the header, not in modals or toast notifications
- Dark mode first-class: both themes built symmetrically, neither derived from the other
- Motion functional only: spinners, progress bars, slide-in panels — never decorative animation

## 2. Colors: The Studio Palette

The palette is built on a single decision: Studio Blue owns all intent, and everything else stays neutral.

### Primary

- **Studio Blue** (`#2563eb` / oklch(55% 0.21 263)): Primary buttons, progress bars, focus rings, links, active states. The single "do something" signal in the UI. Used at ≤15% of any given surface area.
- **Studio Blue Deep** (`#1d4ed8` / oklch(47% 0.20 264)): Hover state for Studio Blue surfaces. Never used as a default; only as a response to interaction.
- **Studio Blue Light** (`#3b82f6` / oklch(63% 0.20 263)): Color tags (blue), ring emphasis in dense UI contexts.
- **Studio Blue Subtle** (`#dbeafe`): Info alert backgrounds, badge backgrounds. Low-chroma wash; never the main event.

### Neutral

The gray stack is the backbone. It does not have a warm or cool bias beyond what Tailwind provides; it is a neutral working surface.

- **Surface Light** (`#f9fafb`): Main page background in light mode. One step above white; prevents card-on-page flatness.
- **Surface Card** (`#ffffff`): Card, panel, modal backgrounds in light mode.
- **Surface Dark** (`#111827`): Main page background in dark mode.
- **Surface Card Dark** (`#1f2937`): Card, panel backgrounds in dark mode.
- **Surface Input Dark** (`#374151`): Input and textarea backgrounds in dark mode.
- **Border Light** (`#e5e7eb`) / **Border Mid** (`#d1d5db`): Dividers, input borders in light mode.
- **Border Dark** (`#4b5563`) / **Border Darker** (`#374151`): Input borders and dividers in dark mode.
- **Text Primary Light** (`#111827`) / **Text Primary Dark** (`#f9fafb`): Headings and labels.
- **Text Secondary** (`#4b5563` light / `#d1d5db` dark): Supporting text, form field values.
- **Text Muted** (`#6b7280` light / `#9ca3af` dark): Disabled states, timestamps, tertiary context.

### Semantic

Semantic colors appear in contextual alerts, status badges, and action buttons only. Never decorative.

- **Semantic Success** (`#16a34a`): Save and upload actions, success indicators, connection status (SFTP connected, DB connected).
- **Semantic Danger** (`#dc2626`): Delete and remove actions, error states, connection failure indicators.
- **Semantic Admin** (`#9333ea`): Admin role badges and admin-exclusive actions only. Not a brand color.

### Named Rules

**The One Signal Rule.** Studio Blue is the only color that means "this is interactive and will do something." No other non-semantic color is used for interactive states. Its rarity is what makes it readable.

**The Semantic Quarantine Rule.** Green, red, and purple are reserved for their exact semantic roles. They do not appear as decorative accents, section headers, hover states, or visual interest on non-semantic elements.

## 3. Typography

**Body Font:** Roboto (300, 400, 500, 700) via Google Fonts, with `system-ui, sans-serif` fallback.
**Mono Font:** Geist Mono via Google Fonts, with `ui-monospace, monospace` fallback.

**Character:** Roboto's geometric clarity reads well at small sizes and survives rendering on lower-DPI monitors. Its 300–500 weight range allows precise hierarchy without bold text feeling aggressive in a dense form context. Geist Mono provides a neutral monospace voice for technical values (file paths, metadata strings) without the hacker connotations of fixed-width-everything.

### Hierarchy

- **Headline** (600, 1.5rem / 24px, 1.25 line-height): Section titles, album names, dialog headings. Sparingly used; one per screen region maximum.
- **Title** (500, 1.125rem / 18px, 1.4 line-height): Card titles, panel headings, subsection labels.
- **Body** (400, 0.875rem / 14px, 1.5 line-height): All form field values, descriptions, list content, status messages. Max line length 65–70ch.
- **Label** (500, 0.75rem / 12px, 0.01em letter-spacing): Form field labels, column headers, badge text, navigation labels.
- **Mono** (400, 0.75rem / 12px, 1.5 line-height): File paths, metadata technical values, code or ID strings.

### Named Rules

**The Weight-Before-Size Rule.** Hierarchy is achieved by weight shift (400→500→600) before size shift. Reaching for a larger size when a weight increase would suffice produces visual noise and breaks the compact rhythm of form-heavy screens.

**The Label Always Visible Rule.** Form field labels are always visible — never placeholder-only, never floating without a visible resting state. EXIF forms are the product; labels must be readable without interacting with the field.

## 4. Elevation

The system is flat by default. Surfaces carry no depth treatment at rest. Elevation is expressed through two mechanisms: background tint steps (gray-50 → white → gray-100 for nested panels) and ambient shadows on containers that need explicit separation from the page surface.

### Shadow Vocabulary

- **Ambient Low** (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Cards, panels, the header bar. The standard container shadow. Signals "this is a bounded surface" without competing with content.
- **Ambient Mid** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Card hover state. Appears as a response to interaction; never the default state of a card.
- **Ambient High** (`0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): Modals and dialogs. The strongest shadow in the vocabulary; marks a blocking surface that demands attention.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover elevation, focus, modal overlay) or to define a bounded container against the page. Side-stripe borders as decorative accent are prohibited; use background tint or full borders instead.

## 5. Components

### Buttons

Buttons are functional and unambiguous. Shape is consistent; color signals intent.

- **Shape:** 6px radius (Tailwind `rounded-md`) across all variants
- **Primary:** Studio Blue fill (`#2563eb`), white text, `font-medium`, `px-4 py-2` (medium) or `px-5 py-2.5` (large). Hover to Studio Blue Deep (`#1d4ed8`). Disabled at 50% opacity.
- **Secondary / Outlined:** Transparent fill, Studio Blue text and border (`border-blue-300` light / `border-blue-600` dark). Hover to `blue-50` / `blue-900/20`. Same border-radius as primary.
- **Danger:** Semantic Danger fill (`#dc2626`), white text. Same shape. Hover to `red-700`.
- **Success:** Semantic Success fill (`#16a34a`), white text. Used for upload and save-to-storage actions.
- **Ghost / Icon:** Transparent, gray icon, `p-1.5` or `p-2`. Hover to `gray-100` / `gray-700`. Used for close buttons, inline editing triggers, toolbar actions.
- **Focus:** `ring-2 ring-blue-500 ring-offset-2` via Tailwind focus-visible utility. Keyboard navigable throughout.
- **Transition:** `transition-colors duration-150` — color only, never size or position.

### Cards / Panels

- **Corner Style:** 8px radius (`rounded-lg`)
- **Background:** `surface-card` in light / `surface-card-dark` in dark
- **Shadow:** Ambient Low at rest; Ambient Mid on hover for interactive cards
- **Border:** None by default. `border border-gray-200 dark:border-gray-700` used when a card is in an already-shadowed context (nested panel) to add separation without double shadow.
- **Internal Padding:** `p-4` (standard), `p-6` (large/dialog)
- **Nesting:** No nested cards. If a panel within a panel is needed, separate it with a background tint step, not another shadow.

### Inputs / Fields

- **Style:** 1px stroke (`border-gray-300` / `border-gray-600`), white/gray-700 fill, `rounded-md`
- **Padding:** `px-3 py-2` (standard), `px-3 py-1.5` (compact/dense forms)
- **Focus:** `ring-2 ring-blue-500 focus:border-transparent`. The border disappears; the ring provides full visual replacement.
- **Error:** Border shifts to `border-red-500`. Error message appears below in `text-xs text-red-600`.
- **Disabled:** `opacity-50 cursor-not-allowed`. Background does not change.
- **Textarea:** Same treatment as text input. `resize-y` only; horizontal resize disabled in form contexts.

### Badges / Chips

- **Info Badge:** `bg-blue-100/bg-blue-900` tint, `text-blue-800/text-blue-200`, `rounded-full`, `text-xs font-medium`, `px-2 py-0.5`
- **Admin Badge:** `bg-purple-100/bg-purple-900/40` tint, `text-purple-700/text-purple-300`, same shape
- **Count Badge:** Absolute-positioned over an icon, `rounded-full`, `text-xs`, `bg-blue-600 text-white`
- **Color Tag Chip:** Colored solid pill (`bg-{color}-500`), white text, `rounded-full`, `text-xs font-medium`. Compact mode shows dot only with `aria-label` and `aria-pressed`.

### Alert / Status Boxes

- **Info:** `bg-blue-50/bg-blue-900/20` fill, `border border-blue-200/border-blue-800`, `rounded-md`, `p-3`
- **Error:** `bg-red-50/bg-red-900/20` fill, `border border-red-200/border-red-800`
- **Success:** `bg-green-50/bg-green-900/20` fill, `border border-green-200/border-green-800`
- **Icon + text layout:** `flex items-start gap-2`. Icon is `w-4 h-4 shrink-0 mt-0.5`.

### Navigation / Header

- **Background:** `bg-white dark:bg-gray-800`, `shadow` (Ambient Low)
- **Height:** `py-3` with `px-4` container — approximately 48px total
- **Content:** App title (left, `font-medium text-sm`), status indicators (right via `ServerStatus`), user info (right)
- **Status indicators:** Icon + text label inline. Status is always visible; never collapsed to icon-only.

### Progress Bar

- **Track:** `bg-blue-200 dark:bg-blue-800`, `rounded-full`, `h-2.5`
- **Fill:** `bg-blue-600` (in progress), `bg-green-500` (complete). Transitions via `transition-all duration-300`.
- **Staging:** Upload progress shows filename above, `current/total` count below. Stage label (`Preparando`, `Subiendo`, `Procesando`) in `text-xs text-blue-700`.

## 6. Do's and Don'ts

### Do:

- **Do** use Studio Blue (`#2563eb`) as the single interactive signal. If it's blue, it does something.
- **Do** show DB and SFTP connection status persistently in the header — never behind a click or in a modal.
- **Do** label all form fields visibly at rest, even in dense/compact layouts.
- **Do** keep button border-radius at 6px (`rounded-md`) across all variants for visual consistency.
- **Do** use `transition-colors duration-150` for hover states — color only, not size or transform.
- **Do** pair dark mode values symmetrically: every light surface has a designed dark counterpart, not an inverted default.
- **Do** use `motion-reduce:animate-none` on all CSS animations (`animate-spin`, `animate-pulse`) to respect the OS accessibility setting.
- **Do** apply `aria-label` and `aria-pressed` to color tag buttons — color alone is never sufficient identification.
- **Do** use `rounded-full` for badges and status pills; `rounded-md` for buttons and inputs; `rounded-lg` for cards and panels.
- **Do** use Tailwind's `bg-linear-to-*` for functional overlays on photos (gradient overlays for readability). These are structural, not decorative.

### Don't:

- **Don't** use gradient hero sections, large rounded CTAs, testimonial-style cards, or any pattern from SaaS marketing aesthetics. This is a production tool for professionals, not a conversion landing page.
- **Don't** build with heavy enterprise gray: uniform hairline-bordered tables, indistinguishable panel backgrounds, IBM-flat color schemes. The system should breathe.
- **Don't** use green-on-black, monospace for interface text, or any visual element that reads as a terminal or hacker aesthetic. Geist Mono is for metadata values only.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, or callouts. Replace with a background tint, full border, or a leading icon.
- **Don't** apply `background-clip: text` with a gradient for decorative text. Use a single solid color; emphasize with weight or size.
- **Don't** use glassmorphism (`backdrop-blur` + semi-transparent backgrounds) as a default card style. It is reserved for photo overlays in `PhotoViewer`.
- **Don't** render the hero-metric pattern (big number, small label, gradient accent) anywhere in the UI. It is a SaaS dashboard cliché and incompatible with this tool's register.
- **Don't** put identical icon+heading+text cards in a repeating grid without additional hierarchy or information density.
- **Don't** use `flex-shrink-0` — use `shrink-0` (Tailwind v4).
- **Don't** use `bg-gradient-to-*` — use `bg-linear-to-*` (Tailwind v4).
- **Don't** use arbitrary sizes like `text-[10px]` — use the type scale (`text-xs`).
