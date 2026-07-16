// Netlify Function: creates a Paystack subaccount so this merchant's
// customers pay them directly, minus CoFa's commission.
// Requires env vars: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// SECURITY: the merchant is identified from their own Supabase session
// token (sent as a Bearer token), never from a client-supplied merchantId --
// this prevents anyone from setting up bank details for a store they don't own.

import { createClient } from '@supabase/supabase-js'

const COFA_COMMISSION_PERCENT = 5

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 })
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('user_id', userData.user.id)
      .single()

    if (merchantError || !merchant) {
      return new Response(JSON.stringify({ error: 'No store found for this account' }), { status: 404 })
    }

    const { accountNumber, bankCode } = await req.json()
    if (!accountNumber || !bankCode) {
      return new Response(JSON.stringify({ error: 'Account number and bank are required' }), { status: 400 })
    }

    // Re-verify the account server-side rather than trusting a client-supplied name.
    const resolveRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    )
    const resolveData = await resolveRes.json()

    if (!resolveData.status) {
      return new Response(JSON.stringify({ error: 'Could not verify this account: ' + resolveData.message }), { status: 400 })
    }

    const accountName = resolveData.data.account_name

    const subaccountRes = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name: merchant.store_name,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: COFA_COMMISSION_PERCENT,
      }),
    })
    const subaccountData = await subaccountRes.json()

    if (!subaccountData.status) {
      return new Response(JSON.stringify({ error: subaccountData.message || 'Could not set up payouts' }), { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        paystack_subaccount_code: subaccountData.data.subaccount_code,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
      })
      .eq('id', merchant.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Subaccount created but could not save: ' + updateError.message }), { status: 500 })
    }

    return new Response(
      JSON.stringify({ success: true, accountName }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
