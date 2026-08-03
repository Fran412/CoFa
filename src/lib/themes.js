// Each theme is a full set of CSS custom property overrides applied to the
// customer-facing storefront and product pages. Themes are organized per
// business type so a gym never ends up with a ceremonial-cloth aesthetic
// meant for a retail perfume shop. "Basic" is shared across all business
// types since it's a neutral, professional default; Pro and Growth themes
// are specific to the merchant's own business type.
//
// All Pro-tier themes reuse the "stripe-band" signature structure, and all
// Growth-tier themes reuse the "etched-line" structure -- only colors and
// fonts change per business type, keeping the underlying CSS bounded while
// each theme still gets a distinct, grounded identity.

const BASIC = {
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
}

export const THEMES = {
  basic: BASIC,

  // Retail
  aso_oke: {
    name: 'Aso-Oke',
    description: 'Wine & brass, inspired by hand-woven ceremonial cloth',
    requiredTier: 'pro',
    businessType: 'retail',
    signatureClass: 'cofa-tag-edge--stripe',
    vars: {
      '--cofa-indigo': '#5C1A2E', '--cofa-indigo-dark': '#3E1120',
      '--cofa-cream': '#F6EEE3', '--cofa-cream-dim': '#ECE0CE', '--cofa-surface': '#FFFDF8',
      '--cofa-marigold': '#C9A227', '--cofa-marigold-dark': '#A88418',
      '--cofa-jade': '#1F5C4D', '--cofa-clay': '#8C3B28',
      '--cofa-ink': '#2A1A1E', '--cofa-ink-soft': '#6B5A5E', '--cofa-line': '#DCC9A8',
      '--font-display': "'Sora', sans-serif",
    },
  },
  calabash: {
    name: 'Calabash',
    description: 'Bronze on charcoal, inspired by etched gourd carving',
    requiredTier: 'growth',
    businessType: 'retail',
    signatureClass: 'cofa-tag-edge--etched',
    vars: {
      '--cofa-indigo': '#1C1712', '--cofa-indigo-dark': '#0F0C09',
      '--cofa-cream': '#1C1712', '--cofa-cream-dim': '#2A231C', '--cofa-surface': '#332B22',
      '--cofa-marigold': '#C98A3E', '--cofa-marigold-dark': '#A86F2E',
      '--cofa-jade': '#4C8C74', '--cofa-clay': '#A8452E',
      '--cofa-ink': '#EDE6DA', '--cofa-ink-soft': '#B3A996', '--cofa-line': '#3A322A',
      '--font-display': "'Manrope', sans-serif",
    },
  },

  // Food
  suya: {
    name: 'Suya',
    description: 'Smoky char & spice, inspired by grilled suya seasoning',
    requiredTier: 'pro',
    businessType: 'food',
    signatureClass: 'cofa-tag-edge--stripe',
    vars: {
      '--cofa-indigo': '#4A2E1E', '--cofa-indigo-dark': '#301D13',
      '--cofa-cream': '#FBF1E4', '--cofa-cream-dim': '#F1E3CE', '--cofa-surface': '#FFFFFF',
      '--cofa-marigold': '#D9762E', '--cofa-marigold-dark': '#B7601F',
      '--cofa-jade': '#5C6B3D', '--cofa-clay': '#8C3320',
      '--cofa-ink': '#2E2119', '--cofa-ink-soft': '#6B5C4E', '--cofa-line': '#E2CBA8',
      '--font-display': "'Poppins', sans-serif",
    },
  },
  jollof: {
    name: 'Jollof',
    description: 'Tomato red & gold on dark, inspired by Nigeria\'s iconic rice',
    requiredTier: 'growth',
    businessType: 'food',
    signatureClass: 'cofa-tag-edge--etched',
    vars: {
      '--cofa-indigo': '#8C2A1E', '--cofa-indigo-dark': '#5E1B13',
      '--cofa-cream': '#241511', '--cofa-cream-dim': '#331F18', '--cofa-surface': '#3D2820',
      '--cofa-marigold': '#E0A72E', '--cofa-marigold-dark': '#BE8A1F',
      '--cofa-jade': '#3F6B4A', '--cofa-clay': '#A8452E',
      '--cofa-ink': '#F3E9DC', '--cofa-ink-soft': '#C9B6A3', '--cofa-line': '#4A342A',
      '--font-display': "'Fraunces', serif",
    },
  },

  // Fitness
  green_white: {
    name: 'Green & White',
    description: 'Bold sports green & amber, inspired by national team colors',
    requiredTier: 'pro',
    businessType: 'fitness',
    signatureClass: 'cofa-tag-edge--stripe',
    vars: {
      '--cofa-indigo': '#1B7A3D', '--cofa-indigo-dark': '#125A2B',
      '--cofa-cream': '#FAFAFA', '--cofa-cream-dim': '#EFEFEF', '--cofa-surface': '#FFFFFF',
      '--cofa-marigold': '#F2B705', '--cofa-marigold-dark': '#CC9A04',
      '--cofa-jade': '#22242B', '--cofa-clay': '#B3492E',
      '--cofa-ink': '#1A1C20', '--cofa-ink-soft': '#5B5F6B', '--cofa-line': '#DDE2DD',
      '--font-display': "'Oswald', sans-serif",
    },
  },
  night_training: {
    name: 'Night Training',
    description: 'Charcoal & hi-vis lime, inspired by athletic training gear',
    requiredTier: 'growth',
    businessType: 'fitness',
    signatureClass: 'cofa-tag-edge--etched',
    vars: {
      '--cofa-indigo': '#16181C', '--cofa-indigo-dark': '#0A0B0D',
      '--cofa-cream': '#16181C', '--cofa-cream-dim': '#222529', '--cofa-surface': '#2A2E33',
      '--cofa-marigold': '#A8D62B', '--cofa-marigold-dark': '#8AB321',
      '--cofa-jade': '#1B7A3D', '--cofa-clay': '#C94F2E',
      '--cofa-ink': '#ECEDEF', '--cofa-ink-soft': '#9A9FA6', '--cofa-line': '#34383D',
      '--font-display': "'Bebas Neue', sans-serif",
    },
  },

  // Service
  benin_bronze: {
    name: 'Benin Bronze',
    description: 'Copper & black, inspired by historic bronze-casting craft',
    requiredTier: 'pro',
    businessType: 'service',
    signatureClass: 'cofa-tag-edge--stripe',
    vars: {
      '--cofa-indigo': '#7A4A21', '--cofa-indigo-dark': '#553113',
      '--cofa-cream': '#F5EFE6', '--cofa-cream-dim': '#EBE0CE', '--cofa-surface': '#FFFFFF',
      '--cofa-marigold': '#C9A227', '--cofa-marigold-dark': '#A88418',
      '--cofa-jade': '#2F6F5E', '--cofa-clay': '#8C3320',
      '--cofa-ink': '#1A1613', '--cofa-ink-soft': '#5F5850', '--cofa-line': '#DCCFB6',
      '--font-display': "'Work Sans', sans-serif",
    },
  },
  nsibidi: {
    name: 'Nsibidi',
    description: 'Indigo-black & graphic white, inspired by Igbo symbolic script',
    requiredTier: 'growth',
    businessType: 'service',
    signatureClass: 'cofa-tag-edge--etched',
    vars: {
      '--cofa-indigo': '#14141C', '--cofa-indigo-dark': '#0A0A0F',
      '--cofa-cream': '#14141C', '--cofa-cream-dim': '#1F1F29', '--cofa-surface': '#26262F',
      '--cofa-marigold': '#E8E6E0', '--cofa-marigold-dark': '#C4C2BC',
      '--cofa-jade': '#2F6F5E', '--cofa-clay': '#A83232',
      '--cofa-ink': '#E8E6E0', '--cofa-ink-soft': '#9B98A3', '--cofa-line': '#33333F',
      '--font-display': "'Big Shoulders Display', sans-serif",
    },
  },
}

const TIER_ORDER = ['basic', 'pro', 'growth']

// Returns the themes a merchant can actually pick from: Basic (always) plus
// the Pro/Growth themes matching their own business type.
export function getThemeCatalog(businessType) {
  return Object.entries(THEMES).filter(
    ([key, theme]) => key === 'basic' || theme.businessType === businessType
  )
}

export function isThemeUnlocked(themeKey, effectiveTierKey) {
  const theme = THEMES[themeKey]
  if (!theme) return false
  return TIER_ORDER.indexOf(effectiveTierKey) >= TIER_ORDER.indexOf(theme.requiredTier)
}

export function getThemeVars(themeKey) {
  const theme = THEMES[themeKey] || THEMES.basic
  return theme.vars
}
