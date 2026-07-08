export const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail / products' },
  { value: 'food', label: 'Food / restaurant' },
  { value: 'service', label: 'Services (salon, repairs, etc.)' },
  { value: 'fitness', label: 'Fitness / gym' },
]

const LABELS = {
  retail: {
    itemSingular: 'Product',
    itemPlural: 'Products',
    catalogueLabel: 'Products',
    stockLabel: 'Stock quantity',
    trackStockDefault: true,
    addressLabel: 'Delivery address (optional)',
    orderVerb: 'order',
  },
  food: {
    itemSingular: 'Menu item',
    itemPlural: 'Menu items',
    catalogueLabel: 'Menu',
    stockLabel: 'Daily quantity available',
    trackStockDefault: false,
    addressLabel: 'Delivery address (optional)',
    orderVerb: 'order',
  },
  service: {
    itemSingular: 'Service',
    itemPlural: 'Services',
    catalogueLabel: 'Services',
    stockLabel: 'Slots available',
    trackStockDefault: false,
    addressLabel: 'Notes / preferred date & time (optional)',
    orderVerb: 'booking',
  },
  fitness: {
    itemSingular: 'Class / plan',
    itemPlural: 'Classes & plans',
    catalogueLabel: 'Classes & plans',
    stockLabel: 'Spots available',
    trackStockDefault: false,
    addressLabel: 'Notes / preferred date & time (optional)',
    orderVerb: 'booking',
  },
}

export function getLabels(businessType) {
  return LABELS[businessType] || LABELS.retail
}
