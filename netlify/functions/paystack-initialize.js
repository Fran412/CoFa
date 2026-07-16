// Netlify Function: initializes a Paystack transaction, routed to the
// merchant's own subaccount so their customers pay them directly.
// Runs server-side only -- this is the one place the Paystack secret key is used.
// Requires env vars: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { email, amountKobo, metadata } = body

    if (!email || !amountKobo || !metadata?.merchantId) {
      return new Response(JSON.stringify({ error: 'email, amountKobo, and metadata.merchantId are required' }), { status: 400 })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('paystack_subaccount_code')
      .eq('id', metadata.merchantId)
      .single()

    if (merchantError || !merchant) {
      return new Response(JSON.stringify({ error: 'Merchant not found' }), { status: 404 })
    }

    // Never let a payment go through without a subaccount -- that would mean
    // the money lands in CoFa's account instead of the merchant's.
    if (!merchant.paystack_subaccount_code) {
      return new Response(JSON.stringify({ error: 'This seller has not set up online payments yet.' }), { status: 400 })
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        subaccount: merchant.paystack_subaccount_code,
        metadata: metadata || {},
      }),
    })

    const data = await paystackRes.json()

    if (!data.status) {
      return new Response(JSON.stringify({ error: data.message || 'Could not initialize payment' }), { status: 400 })
    }

    return new Response(
      JSON.stringify({
        access_code: data.data.access_code,
        reference: data.data.reference,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
