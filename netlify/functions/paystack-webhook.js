// Netlify Function: handles Paystack webhook events (renewals, failures,
// cancellations) so subscription status stays accurate over time, not just
// at the moment of first payment.
// Requires env vars: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Set this URL as your webhook endpoint in Paystack Dashboard -> Settings -> API Keys & Webhooks:
// https://YOUR-SITE.netlify.app/.netlify/functions/paystack-webhook

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()

  // Verify this request genuinely came from Paystack -- never trust an
  // unverified webhook, since the endpoint is publicly reachable.
  const signature = req.headers.get('x-paystack-signature')
  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const customerCode = event.data?.customer?.customer_code

  try {
    if (event.event === 'charge.success' && event.data?.plan?.plan_code) {
      // A subscription renewal (or the very first payment) succeeded.
      if (customerCode) {
        await supabase
          .from('merchants')
          .update({ subscription_status: 'active' })
          .eq('paystack_customer_code', customerCode)
      }
    } else if (event.event === 'invoice.payment_failed') {
      // A renewal charge failed -- mark as past_due rather than cutting
      // access immediately, since Paystack will retry automatically.
      if (customerCode) {
        await supabase
          .from('merchants')
          .update({ subscription_status: 'past_due' })
          .eq('paystack_customer_code', customerCode)
      }
    } else if (event.event === 'subscription.disable') {
      // All retries failed, or the merchant cancelled -- access should
      // revert to Basic-level behavior (enforced by checking status, not tier).
      if (customerCode) {
        await supabase
          .from('merchants')
          .update({ subscription_status: 'cancelled' })
          .eq('paystack_customer_code', customerCode)
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    // Still return 200 so Paystack doesn't endlessly retry a broken payload,
    // but log-worthy in a real system with proper logging in place.
    return new Response('Error handled: ' + err.message, { status: 200 })
  }
}
