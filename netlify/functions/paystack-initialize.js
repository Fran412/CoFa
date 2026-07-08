// Netlify Function: initializes a Paystack transaction.
// Runs server-side only -- this is the one place the Paystack secret key is used.
// Requires env var: PAYSTACK_SECRET_KEY

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { email, amountKobo, metadata } = body

    if (!email || !amountKobo) {
      return new Response(JSON.stringify({ error: 'email and amountKobo are required' }), { status: 400 })
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
