/**
 * CabinetPilot — Centralized Design Tokens
 *
 * Single source of truth for all design decisions.
 * Copy to src/lib/design-tokens.ts when bootstrapping the Next.js project.
 *
 * RULE: Never hardcode colors, fonts, spacing, or border radius in components.
 * Always import from this file.
 *
 * Usage:
 *   import { colors, fonts, spacing, radius } from '@/lib/design-tokens'
 *   style={{ color: colors.accent }}
 *   className={cn(`text-[${fonts.size.sm}]`, ...)}
 *
 * For Tailwind usage, prefer the Tailwind token names documented alongside each value.
 * These constants are the authoritative reference — Tailwind config must match them.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────
// Palette follows 60/30/10 rule:
//   60% dominant  → white / zinc-50
//   30% secondary → zinc-100 / zinc-200
//   10% accent    → indigo-600

export const colors = {
  // Dominant (60%)
  white:    '#ffffff',   // tw: white
  zinc50:   '#fafafa',   // tw: zinc-50  — page background, card bg

  // Secondary (30%)
  zinc100:  '#f4f4f5',   // tw: zinc-100 — left panel bg, input bg
  zinc200:  '#e4e4e7',   // tw: zinc-200 — dividers, borders, step connectors
  zinc300:  '#d4d4d8',   // tw: zinc-300 — hover borders
  zinc400:  '#a1a1aa',   // tw: zinc-400 — placeholder text, skip links, step labels
  zinc500:  '#71717a',   // tw: zinc-500 — subtitles, helper text
  zinc600:  '#52525b',   // tw: zinc-600 — secondary body text
  zinc700:  '#3f3f46',   // tw: zinc-700
  zinc900:  '#18181b',   // tw: zinc-900 — primary body text, headings

  // Accent (10%) — reserved for 5 specific uses only:
  //   1. Primary CTA button
  //   2. Active step circle
  //   3. Focus ring on form inputs
  //   4. Right-panel decorative gradient
  //   5. Link text in confirmation screen
  indigo50:  '#eef2ff',  // tw: indigo-50
  indigo100: '#e0e7ff',  // tw: indigo-100 — completed step circle fill
  indigo600: '#4f46e5',  // tw: indigo-600 — PRIMARY ACCENT
  indigo700: '#4338ca',  // tw: indigo-700 — accent hover state
  indigo900: '#312e81',  // tw: indigo-900 — right panel text

  // Semantic
  destructive: '#dc2626', // tw: red-600  — destructive actions only
  error:       '#ef4444', // tw: red-500  — input error borders
  success:     '#16a34a', // tw: green-600 — sync success, connection confirmed
} as const

export type Color = keyof typeof colors

// ─── Typography ──────────────────────────────────────────────────────────────
// Declared fonts: Cal Sans (display) + DM Sans (all UI text)
// Declared sizes: exactly 4 — sm, base, lg, xl
// Declared weights: exactly 2 — regular (400), semibold (600)

export const fonts = {
  family: {
    display: "'Cal Sans', 'DM Sans', system-ui, sans-serif",  // headings, hero text
    sans:    "'DM Sans', system-ui, sans-serif",              // all body + UI text
  },
  size: {
    sm:   '14px',  // tw: text-sm   — labels, helper text, skip links, step labels
    base: '16px',  // tw: text-base — body text, form values
    lg:   '22px',  // tw: text-[22px] — step headings, section titles
    xl:   '32px',  // tw: text-[32px] — display / hero (Cal Sans only)
  },
  weight: {
    regular:  400,  // tw: font-normal
    semibold: 600,  // tw: font-semibold
  },
  lineHeight: {
    tight:   1.1,  // display text
    snug:    1.2,  // headings
    normal:  1.4,  // labels
    relaxed: 1.5,  // body text
  },
} as const

// ─── Spacing ─────────────────────────────────────────────────────────────────
// Exceptions:
//   - Button height: 48px (exceeds WCAG 2.5.5 44px minimum)
//   - Step circles: 32px × 32px
//   - Wizard card padding: 40px

export const spacing = {
  xs:  '6px',   // tw: p-1.5 — icon gaps, inline padding
  sm:  '12px',  // tw: p-3   — compact spacing, input padding
  md:  '20px',  // tw: p-5   — default element spacing, form gaps
  lg:  '32px',  // tw: p-8   — section padding
  xl:  '40px',  // tw: p-10  — layout gaps
  '2xl': '64px', // tw: p-16  — major section breaks
  '3xl': '80px', // tw: p-20  — page-level vertical centering
} as const

export const sizes = {
  buttonHeight:   '48px',  // WCAG 2.5.5 compliant minimum touch target
  stepCircle:     '32px',  // step indicator circles (8 × 4 scale)
  avatarPreview:  '64px',  // profile photo preview
  loginPanelMax:  '360px', // login form content max-width
  wizardMax:      '520px', // onboarding wizard container max-width
  rightPanelMax:  '320px', // login right panel text max-width
} as const

// ─── Border Radius ────────────────────────────────────────────────────────────
// Single value throughout the app — no exceptions.

export const radius = {
  DEFAULT: '8px',   // tw: rounded-lg — used everywhere without exception
  sm:      '6px',   // tw: rounded-md — browser chrome, tab buttons (mockup only)
  full:    '9999px', // tw: rounded-full — avatars, step circles, badges
} as const

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',  // tw: shadow-sm — wizard cards, form panels
} as const

// ─── Breakpoints ─────────────────────────────────────────────────────────────
// Login split-screen collapses to single column below md.

export const breakpoints = {
  md: '768px',   // tw: md — right panel hidden below this
  lg: '1024px',  // tw: lg
  xl: '1280px',  // tw: xl — max browser chrome width
} as const

// ─── Gradients ───────────────────────────────────────────────────────────────
// Login right panel only — decorative, no semantic meaning.

export const gradients = {
  loginPanel: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
  // indigo-700 → violet-700 — rich deep blue-purple, white text on top
} as const

// ─── Interaction States ───────────────────────────────────────────────────────
// Reference values for consistent state styling.

export const states = {
  focusRing:   `0 0 0 2px ${colors.white}, 0 0 0 4px ${colors.indigo600}`,
  // tw: ring-2 ring-indigo-600 ring-offset-2
  disabledOpacity: 0.5,
  // tw: opacity-50 cursor-not-allowed
} as const

// ─── Convenience re-export ────────────────────────────────────────────────────

export const tokens = {
  colors,
  fonts,
  spacing,
  sizes,
  radius,
  shadows,
  breakpoints,
  gradients,
  states,
} as const

export default tokens
