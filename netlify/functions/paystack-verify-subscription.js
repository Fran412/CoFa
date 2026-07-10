// Netlify Function: verifies a subscription payment independently with
// Paystack, then activates the merchant's tier using a service-role client.
// Requires env vars: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { reference, merchantId, tier } = body

    if (!reference || !merchantId || !tier) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const verifyData = await verifyRes.json()

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Payment was not successful' }), { status: 400 })
    }

    // Confirm the metadata matches what we expect, and that a plan was
    // actually attached to this transaction (guards against a tampered request).
    if (verifyData.data.metadata?.merchantId !== merchantId || verifyData.data.metadata?.tier !== tier) {
      return new Response(JSON.stringify({ error: 'Transaction does not match this request' }), { status: 400 })
    }

    const customerCode = verifyData.data.customer?.customer_code || null

    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        paystack_customer_code: customerCode,
      })
      .eq('id', merchantId)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Payment succeeded but could not update your account: ' + updateError.message }), { status: 500 })
    }

    return new Response(
      JSON.stringify({ success: true, tier }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
