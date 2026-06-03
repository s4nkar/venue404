/**
 * Venue404 design tokens — JS/TS mirror of theme.css
 *
 * Use these when you need design values in code:
 * charts, canvas, inline styles, motion libraries, tests.
 *
 * Keep in sync with packages/ui/src/styles/theme.css
 */

export const colors = {
  brand:       '#2563eb',  // blue-600 — primary accent, CTAs, links
  brandHover:  '#1d4ed8',  // blue-700 — hover state
  sidebar:     '#09090b',  // zinc-950 — dark sidebar background
  sidebarBorder: 'rgba(39,39,42,0.6)', // zinc-800/60 — sidebar borders
  surface:     '#ffffff',  // white — cards, modals, inputs
  bg:          '#fafafa',  // zinc-50  — page background
  text:        '#18181b',  // zinc-900 — primary text
  textMuted:   '#71717a',  // zinc-500 — secondary text
  textSubtle:  '#a1a1aa',  // zinc-400 — placeholders, timestamps
  border:      '#e4e4e7',  // zinc-200 — default borders
  borderStrong:'#d4d4d8',  // zinc-300 — hover borders
} as const

export const accent = {
  blue:    { bg: '#eff6ff', icon: '#3b82f6', text: '#1d4ed8' },
  amber:   { bg: '#fffbeb', icon: '#f59e0b', text: '#b45309' },
  emerald: { bg: '#ecfdf5', icon: '#10b981', text: '#065f46' },
  violet:  { bg: '#f5f3ff', icon: '#8b5cf6', text: '#5b21b6' },
  rose:    { bg: '#fff1f2', icon: '#f43f5e', text: '#9f1239' },
} as const

export const easing = {
  outExpo:    'cubic-bezier(0.23, 1, 0.32, 1)',
  inOutExpo:  'cubic-bezier(0.77, 0, 0.175, 1)',
} as const

export const duration = {
  press:        150,  // ms — active:scale press feedback
  cardEnter:    400,  // ms — card mount animation
  cardStagger:   60,  // ms — delay between staggered cards
  pageEnter:    250,  // ms — page fade-in
} as const

export const layout = {
  sidebarWidth:  248,  // px
  topbarHeight:   60,  // px
} as const
