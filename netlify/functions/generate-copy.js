// Netlify Function: generates a tailored store tagline or product description
// using Claude, so auto-generated storefronts don't all read generically.
// Gated to Pro/Growth tiers since each call has a real API cost.
// Requires env vars: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'

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

    const isPaidTier = merchant.subscription_status === 'active' &&
      (merchant.subscription_tier === 'pro' || merchant.subscription_tier === 'growth')

    if (!isPaidTier) {
      return new Response(JSON.stringify({ error: 'AI copy suggestions require a Pro or Growth subscription.' }), { status: 403 })
    }

    const { mode, productName, productNames } = await req.json()

    let prompt
    if (mode === 'tagline') {
      const productList = (productNames || []).slice(0, 8).join(', ')
      prompt = `Write ONE short marketing tagline (under 12 words) for an online store called "${merchant.store_name}", a ${merchant.business_type} business.${productList ? ` Some of their products: ${productList}.` : ''} The tagline should feel specific to this store, not generic. Return ONLY the tagline text -- no quotes, no explanation, no extra text.`
    } else if (mode === 'product') {
      if (!productName) {
        return new Response(JSON.stringify({ error: 'productName is required' }), { status: 400 })
      }
      prompt = `Write a short, appealing product description (1-2 sentences, under 30 words) for "${productName}", sold by "${merchant.store_name}", a ${merchant.business_type} business. Return ONLY the description text -- no quotes, no explanation, no extra text.`
    } else {
      return new Response(JSON.stringify({ error: 'mode must be "tagline" or "product"' }), { status: 400 })
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const claudeData = await claudeRes.json()

    if (!claudeRes.ok) {
      return new Response(JSON.stringify({ error: claudeData.error?.message || 'Could not generate copy' }), { status: 500 })
    }

    const text = claudeData.content?.[0]?.text?.trim() || ''

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
