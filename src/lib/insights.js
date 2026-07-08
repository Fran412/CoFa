// Computes deterministic business insights from a merchant's own data.
// No external API calls -- pure calculation over what's already loaded.

export function computeTrends(orders) {
  const activeOrders = orders.filter((o) => o.status !== 'cancelled')

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const thisWeek = activeOrders.filter((o) => new Date(o.created_at) >= sevenDaysAgo)
  const lastWeek = activeOrders.filter((o) => {
    const d = new Date(o.created_at)
    return d >= fourteenDaysAgo && d < sevenDaysAgo
  })

  const thisWeekRevenue = thisWeek.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const lastWeekRevenue = lastWeek.reduce((sum, o) => sum + Number(o.total_amount), 0)

  function pctChange(current, previous) {
    if (previous === 0) return current > 0 ? null : 0 // null = "new activity, no baseline"
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    thisWeekRevenue,
    lastWeekRevenue,
    revenueChangePct: pctChange(thisWeekRevenue, lastWeekRevenue),
    thisWeekOrderCount: thisWeek.length,
    lastWeekOrderCount: lastWeek.length,
    orderCountChangePct: pctChange(thisWeek.length, lastWeek.length),
    hasEnoughHistory: activeOrders.some((o) => new Date(o.created_at) < fourteenDaysAgo),
  }
}

export function computeInsights(products, orders, orderItems, labels) {
  const activeOrders = orders.filter((o) => o.status !== 'cancelled')
  const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const paidRevenue = activeOrders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0)
  const pendingCashRevenue = totalRevenue - paidRevenue

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  // quantity sold per product
  const soldByProduct = {}
  orderItems.forEach((item) => {
    soldByProduct[item.product_id] = (soldByProduct[item.product_id] || 0) + item.quantity
  })

  const productsWithSales = products.map((p) => ({
    ...p,
    unitsSold: soldByProduct[p.id] || 0,
  }))

  const topSellers = [...productsWithSales]
    .filter((p) => p.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 3)

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const neverSold = productsWithSales.filter(
    (p) => p.unitsSold === 0 && p.is_active && new Date(p.created_at) < sevenDaysAgo
  )

  const lowStock = products.filter(
    (p) => p.is_active && p.stock_quantity !== null && p.stock_quantity > 0 && p.stock_quantity <= 3
  )

  const outOfStock = products.filter(
    (p) => p.is_active && p.stock_quantity === 0
  )

  const pendingCount = statusCounts.pending || 0

  // Build plain-language advice bullets from the above
  const advice = []

  if (outOfStock.length > 0) {
    advice.push({
      tone: 'warning',
      text: `${outOfStock.length} ${outOfStock.length === 1 ? labels.itemSingular.toLowerCase() : labels.itemPlural.toLowerCase()} ${outOfStock.length === 1 ? 'is' : 'are'} out of stock and still visible on your store. Restock or hide them so customers don't order something you can't fulfil.`,
    })
  }

  if (lowStock.length > 0) {
    advice.push({
      tone: 'warning',
      text: `${lowStock.length} ${lowStock.length === 1 ? labels.itemSingular.toLowerCase() : labels.itemPlural.toLowerCase()} ${lowStock.length === 1 ? 'has' : 'have'} 3 or fewer left in stock: ${lowStock.map((p) => p.name).join(', ')}. Worth restocking soon.`,
    })
  }

  if (pendingCount > 0) {
    advice.push({
      tone: 'info',
      text: `You have ${pendingCount} pending order${pendingCount === 1 ? '' : 's'} waiting on confirmation. Following up quickly builds customer trust.`,
    })
  }

  if (topSellers.length > 0) {
    advice.push({
      tone: 'good',
      text: `Your best seller is "${topSellers[0].name}" with ${topSellers[0].unitsSold} sold. Make sure it stays in stock.`,
    })
  }

  if (neverSold.length > 0) {
    advice.push({
      tone: 'info',
      text: `${neverSold.length} ${neverSold.length === 1 ? labels.itemSingular.toLowerCase() : labels.itemPlural.toLowerCase()} listed over a week ago ${neverSold.length === 1 ? 'has' : 'have'} no sales yet: ${neverSold.slice(0, 3).map((p) => p.name).join(', ')}${neverSold.length > 3 ? ', and others' : ''}. Consider a better photo, a lower price, or promoting it directly to customers.`,
    })
  }

  if (products.length === 0) {
    advice.push({
      tone: 'info',
      text: `You haven't added any ${labels.itemPlural.toLowerCase()} yet. Add your first one, or upload a catalogue, to start getting orders.`,
    })
  } else if (orders.length === 0) {
    advice.push({
      tone: 'info',
      text: `No orders yet. Share your store link with customers on WhatsApp or social media to get your first one.`,
    })
  }

  return {
    totalRevenue,
    paidRevenue,
    pendingCashRevenue,
    statusCounts,
    topSellers,
    neverSold,
    lowStock,
    outOfStock,
    advice,
  }
}
