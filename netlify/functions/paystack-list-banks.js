// Netlify Function: fetches the full, current list of Nigerian banks
// supported by Paystack, rather than relying on a hardcoded (and incomplete) list.
// Requires env var: PAYSTACK_SECRET_KEY

export default async (req) => {
  try {
    const res = await fetch('https://api.paystack.co/bank?country=nigeria&currency=NGN', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const data = await res.json()

    if (!data.status) {
      return new Response(JSON.stringify({ error: data.message || 'Could not load banks' }), { status: 400 })
    }

    const banks = data.data
      .map((b) => ({ name: b.name, code: b.code }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return new Response(
      JSON.stringify({ banks }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
