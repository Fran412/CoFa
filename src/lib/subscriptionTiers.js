export const TIERS = {
  basic: { name: 'Basic', price: 3000, maxProducts: 20, showFooterBranding: true },
  pro: { name: 'Pro', price: 10000, maxProducts: Infinity, showFooterBranding: false },
  growth: { name: 'Growth', price: 20000, maxProducts: Infinity, showFooterBranding: false },
}

// A merchant who isn't currently paying (never subscribed, payment failed,
// or cancelled) gets Basic-level behavior regardless of which tier they
// last selected -- "active" is the only status that unlocks Pro/Growth perks.
export function getEffectiveTierKey(merchant) {
  if (merchant.subscription_status !== 'active') return 'basic'
  return merchant.subscription_tier || 'basic'
}

export function getTierConfig(merchant) {
  return TIERS[getEffectiveTierKey(merchant)]
}
