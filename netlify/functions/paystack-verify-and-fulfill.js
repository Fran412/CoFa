// Netlify Function: verifies a Paystack payment independently with Paystack's
// servers (never trusts the frontend callback alone), then writes the order
// using a service-role Supabase client so it bypasses normal customer RLS.
//
// Requires env vars: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body = await req.json()
    const { reference, productId, quantity, merchantId, customerName, customerPhone, customerAddress } = body

    if (!reference || !productId || !quantity || !merchantId || !customerName || !customerPhone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // 1. Independently verify the transaction with Paystack -- never trust
    // a success message coming only from the browser.
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const verifyData = await verifyRes.json()

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Payment was not successful' }), { status: 400 })
    }

    const paidAmountKobo = verifyData.data.amount

    // 2. Look up the real product price ourselves -- never trust a
    // client-supplied price, in case the request was tampered with.
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('merchant_id', merchantId)
      .single()

    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 })
    }

    const expectedKobo = Math.round(Number(product.price) * quantity * 100)

    if (paidAmountKobo !== expectedKobo) {
      return new Response(JSON.stringify({ error: 'Paid amount does not match order total' }), { status: 400 })
    }

    // 3. Payment is confirmed and the amount matches -- fulfill the order.
    const orderId = crypto.randomUUID()

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      merchant_id: merchantId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress || '',
      total_amount: product.price * quantity,
      status: 'pending',
      payment_status: 'paid',
      payment_method: 'paystack',
      payment_reference: reference,
    })

    if (orderError) {
      return new Response(JSON.stringify({ error: 'Payment succeeded but order could not be saved: ' + orderError.message }), { status: 500 })
    }

    await supabase.from('order_items').insert({
      order_id: orderId,
      product_id: productId,
      quantity,
      price_at_purchase: product.price,
    })

    // Try to decrement stock, but the order stands regardless since money
    // has already changed hands -- a stock miss here just needs the
    // merchant's attention, not a failed order.
    const { data: stockOk } = await supabase.rpc('decrement_product_stock', {
      p_product_id: productId,
      p_quantity: quantity,
    })

    return new Response(
      JSON.stringify({ success: true, orderId, stockDeducted: !!stockOk }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
