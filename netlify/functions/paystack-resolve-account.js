// Netlify Function: resolves a bank account number to its registered name,
// so merchants can confirm they typed it correctly before it's saved.
// Requires env var: PAYSTACK_SECRET_KEY

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { accountNumber, bankCode } = await req.json()

    if (!accountNumber || !bankCode) {
      return new Response(JSON.stringify({ error: 'Account number and bank are required' }), { status: 400 })
    }

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    )
    const data = await res.json()

    if (!data.status) {
      return new Response(JSON.stringify({ error: data.message || 'Could not verify this account' }), { status: 400 })
    }

    return new Response(
      JSON.stringify({ accountName: data.data.account_name }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
