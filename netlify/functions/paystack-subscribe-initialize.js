// Netlify Function: initializes a Paystack subscription checkout.
// Requires env vars: PAYSTACK_SECRET_KEY, and one plan code per tier:
// PAYSTACK_PLAN_BASIC, PAYSTACK_PLAN_PRO, PAYSTACK_PLAN_GROWTH

const PLAN_CODES = {
  basic: process.env.PAYSTACK_PLAN_BASIC,
  pro: process.env.PAYSTACK_PLAN_PRO,
  growth: process.env.PAYSTACK_PLAN_GROWTH,
}

const TIER_PRICES_KOBO = {
  basic: 300000,
  pro: 1000000,
  growth: 2000000,
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { email, tier, merchantId } = body

    const planCode = PLAN_CODES[tier]
    if (!email || !tier || !merchantId || !planCode) {
      return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { status: 400 })
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: TIER_PRICES_KOBO[tier],
        plan: planCode,
        metadata: { merchantId, tier },
      }),
    })

    const data = await paystackRes.json()

    if (!data.status) {
      return new Response(JSON.stringify({ error: data.message || 'Could not start subscription' }), { status: 400 })
    }

    return new Response(
      JSON.stringify({ access_code: data.data.access_code, reference: data.data.reference }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
