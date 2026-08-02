// Each theme is a full set of CSS custom property overrides applied to the
// customer-facing storefront and product pages. Dashboard stays on the
// default Basic look, since it's merchant-only tooling, not the "website"
// being sold.

export const THEMES = {
  basic: {
    name: 'Basic',
    description: 'Indigo & marigold, inspired by adire dye cloth',
    requiredTier: 'basic',
    signatureClass: 'cofa-tag-edge',
    vars: {
      '--cofa-indigo': '#1E2A52',
      '--cofa-indigo-dark': '#141d3c',
      '--cofa-cream': '#FBF7EF',
      '--cofa-cream-dim': '#F2EBDD',
      '--cofa-surface': '#FFFFFF',
      '--cofa-marigold': '#E8A33D',
      '--cofa-marigold-dark': '#CC8A28',
      '--cofa-jade': '#2F6F5E',
      '--cofa-clay': '#B3492E',
      '--cofa-ink': '#21242B',
      '--cofa-ink-soft': '#5B5F6B',
      '--cofa-line': '#E4DCC9',
      '--font-display': "'Space Grotesk', sans-serif",
    },
  },
  aso_oke: {
    name: 'Aso-Oke',
    description: 'Wine & brass, inspired by hand-woven ceremonial cloth',
    requiredTier: 'pro',
    signatureClass: 'cofa-tag-edge--aso-oke',
    vars: {
      '--cofa-indigo': '#5C1A2E',
      '--cofa-indigo-dark': '#3E1120',
      '--cofa-cream': '#F6EEE3',
      '--cofa-cream-dim': '#ECE0CE',
      '--cofa-surface': '#FFFDF8',
      '--cofa-marigold': '#C9A227',
      '--cofa-marigold-dark': '#A88418',
      '--cofa-jade': '#1F5C4D',
      '--cofa-clay': '#8C3B28',
      '--cofa-ink': '#2A1A1E',
      '--cofa-ink-soft': '#6B5A5E',
      '--cofa-line': '#DCC9A8',
      '--font-display': "'Sora', sans-serif",
    },
  },
  calabash: {
    name: 'Calabash',
    description: 'Bronze on charcoal, inspired by etched gourd carving',
    requiredTier: 'growth',
    signatureClass: 'cofa-tag-edge--calabash',
    vars: {
      '--cofa-indigo': '#1C1712',
      '--cofa-indigo-dark': '#0F0C09',
      '--cofa-cream': '#1C1712',
      '--cofa-cream-dim': '#2A231C',
      '--cofa-surface': '#332B22',
      '--cofa-marigold': '#C98A3E',
      '--cofa-marigold-dark': '#A86F2E',
      '--cofa-jade': '#4C8C74',
      '--cofa-clay': '#A8452E',
      '--cofa-ink': '#EDE6DA',
      '--cofa-ink-soft': '#B3A996',
      '--cofa-line': '#3A322A',
      '--font-display': "'Manrope', sans-serif",
    },
  },
}

const TIER_ORDER = ['basic', 'pro', 'growth']

export function isThemeUnlocked(themeKey, effectiveTierKey) {
  const theme = THEMES[themeKey]
  if (!theme) return false
  return TIER_ORDER.indexOf(effectiveTierKey) >= TIER_ORDER.indexOf(theme.requiredTier)
}

export function getThemeVars(themeKey) {
  const theme = THEMES[themeKey] || THEMES.basic
  return theme.vars
}
