import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLabels } from '../lib/businessTypes'
import { loadPaystackScript } from '../lib/paystack'

function ProductPage() {
  const { slug, productId } = useParams()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [merchant, setMerchant] = useState(null)
  const [product, setProduct] = useState(null)

  const [quantity, setQuantity] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [placing, setPlacing] = useState(false)
  const [payingOnline, setPayingOnline] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [paidOnline, setPaidOnline] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [slug, productId])

  async function loadProduct() {
    setLoading(true)
    setNotFound(false)

    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('slug', slug)
      .single()

    if (merchantError || !merchantData) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setMerchant(merchantData)

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('merchant_id', merchantData.id)
      .eq('is_active', true)
      .single()

    if (productError || !productData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setProduct(productData)
    setLoading(false)
  }

  function validateOrderForm() {
    if (!customerName || !customerPhone) {
      setOrderError('Name and phone number are required.')
      return false
    }
    if (quantity < 1) {
      setOrderError('Quantity must be at least 1.')
      return false
    }
    if (product.stock_quantity > 0 && quantity > product.stock_quantity) {
      setOrderError(`Only ${product.stock_quantity} in stock.`)
      return false
    }
    return true
  }

  async function handlePayOnline() {
    setOrderError('')

    if (!customerEmail) {
      setOrderError('Email is required to pay online.')
      return
    }
    if (!validateOrderForm()) return

    setPayingOnline(true)

    try {
      await loadPaystackScript()

      const amountKobo = Math.round(product.price * quantity * 100)

      const initRes = await fetch('/.netlify/functions/paystack-initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          amountKobo,
          metadata: { productId: product.id, merchantId: merchant.id, quantity },
        }),
      })
      const initData = await initRes.json()

      if (!initRes.ok || !initData.access_code) {
        setOrderError(initData.error || 'Could not start payment. Please try again.')
        setPayingOnline(false)
        return
      }

      const popup = new window.PaystackPop()
      popup.resumeTransaction(initData.access_code, {
        onSuccess: async (response) => {
          const verifyRes = await fetch('/.netlify/functions/paystack-verify-and-fulfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: response.reference,
              productId: product.id,
              quantity,
              merchantId: merchant.id,
              customerName,
              customerPhone,
              customerAddress,
            }),
          })
          const verifyData = await verifyRes.json()

          setPayingOnline(false)

          if (!verifyRes.ok || !verifyData.success) {
            setOrderError(verifyData.error || 'Payment could not be confirmed. Please contact the seller with your payment reference: ' + response.reference)
            return
          }

          setPaidOnline(true)
          setOrderPlaced(true)
        },
        onCancel: () => {
          setPayingOnline(false)
        },
        onError: (err) => {
          setPayingOnline(false)
          setOrderError('Payment failed: ' + (err?.message || 'please try again.'))
        },
      })
    } catch (err) {
      setPayingOnline(false)
      setOrderError(err.message)
    }
  }

  async function handlePlaceOrder(e) {
    e.preventDefault()
    setOrderError('')

    if (!validateOrderForm()) return

    setPlacing(true)

    const totalAmount = product.price * quantity
    const newOrderId = crypto.randomUUID()

    const { error: orderInsertError } = await supabase
      .from('orders')
      .insert({
        id: newOrderId,
        merchant_id: merchant.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'unpaid',
        payment_method: 'cash',
      })

    if (orderInsertError) {
      setOrderError('Could not place order. Please try again.')
      setPlacing(false)
      return
    }

    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: newOrderId,
        product_id: product.id,
        quantity,
        price_at_purchase: product.price,
      })

    if (itemError) {
      setPlacing(false)
      setOrderError('Order created but there was an issue recording the item. Please contact the seller.')
      return
    }

    const { data: stockOk, error: stockError } = await supabase.rpc('decrement_product_stock', {
      p_product_id: product.id,
      p_quantity: quantity,
    })

    setPlacing(false)

    if (stockError) {
      setOrderError('Order placed, but stock could not be updated. Please contact the seller.')
      setOrderPlaced(true)
      return
    }

    if (!stockOk) {
      setOrderError('Sorry, that item just sold out. Please contact the seller to confirm availability before paying.')
      setOrderPlaced(true)
      return
    }

    setOrderPlaced(true)
  }

  if (loading) {
    return <div className="cofa-page" style={{ textAlign: 'center' }}>Loading product...</div>
  }

  if (notFound) {
    return (
      <div className="cofa-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h1 style={{ color: 'var(--cofa-indigo)', marginBottom: 8 }}>Product not found</h1>
        <Link to={`/store/${slug}`}>Back to store</Link>
      </div>
    )
  }

  const outOfStock = product.stock_quantity === 0
  const labels = getLabels(merchant.business_type)

  return (
    <div className="cofa-page" style={{ maxWidth: 640 }}>
      <Link to={`/store/${slug}`} className="cofa-muted" style={{ display: 'inline-block', marginBottom: 20, fontSize: 14, textDecoration: 'none' }}>
        &larr; Back to {merchant.store_name}
      </Link>

      <div className="cofa-tag-edge" />
      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#ffffff', marginBottom: 20, overflow: 'hidden', borderRadius: '0 0 10px 10px', border: '1px solid var(--cofa-line)', borderTop: 'none' }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cofa-ink-soft)' }}>
            No image
          </div>
        )}
      </div>

      <h1 style={{ fontSize: 24, marginBottom: 6, color: 'var(--cofa-indigo)' }}>{product.name}</h1>
      <div className="cofa-price" style={{ fontSize: 20, marginBottom: 8 }}>NGN {Number(product.price).toLocaleString()}</div>

      {outOfStock ? (
        <span className="cofa-badge cofa-badge--outofstock" style={{ marginBottom: 16, display: 'inline-block' }}>Out of stock</span>
      ) : product.stock_quantity !== null ? (
        <div className="cofa-muted" style={{ marginBottom: 16, fontSize: 14 }}>{product.stock_quantity} available</div>
      ) : null}

      {product.description && (
        <p style={{ color: 'var(--cofa-ink)', marginBottom: 24, lineHeight: 1.6 }}>{product.description}</p>
      )}

      {outOfStock ? null : orderPlaced ? (
        <div className="cofa-card">
          <h3 style={{ color: 'var(--cofa-jade)', marginBottom: 10 }}>
            {paidOnline ? 'Payment successful' : labels.orderVerb === 'booking' ? 'Booking request sent' : 'Order placed'}
          </h3>
          <p style={{ margin: 0, marginBottom: merchant.whatsapp_number ? 16 : 0, lineHeight: 1.6 }}>
            {paidOnline
              ? `Thanks, ${customerName}. Your payment for ${quantity}x ${product.name} was successful and your order has been sent to ${merchant.store_name}.`
              : `Thanks, ${customerName}. Your ${labels.orderVerb} for ${quantity}x ${product.name} has been recorded.`}
          </p>
          {merchant.whatsapp_number ? (
            <>
              <p style={{ margin: '0 0 12px 0', lineHeight: 1.6 }}>
                For the fastest response, send this to {merchant.store_name} on WhatsApp now:
              </p>
              <a
                href={`https://wa.me/${merchant.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hi, I just placed ${labels.orderVerb === 'booking' ? 'a booking request' : 'an order'} for ${quantity}x ${product.name} on your CoFa store (${customerName}, ${customerPhone}). Please confirm.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="cofa-btn cofa-btn-accent"
                style={{ display: 'inline-block', textDecoration: 'none', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}
              >
                Message {merchant.store_name} on WhatsApp
              </a>
            </>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.6 }} className="cofa-muted">
              This seller hasn't added a WhatsApp number yet, so they may not see your {labels.orderVerb} right away.
              Your details have still been recorded.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handlePlaceOrder} className="cofa-card">
          <h3 style={{ marginBottom: 16, color: 'var(--cofa-indigo)' }}>
            {labels.orderVerb === 'booking' ? 'Request a booking' : 'Place an order'}
          </h3>

          <div className="cofa-field">
            <label className="cofa-label">Quantity</label>
            <input
              type="number"
              min={1}
              max={product.stock_quantity || undefined}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="cofa-input"
              style={{ width: 100 }}
            />
          </div>

          <div className="cofa-field">
            <label className="cofa-label">Your name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="cofa-input" />
          </div>

          <div className="cofa-field">
            <label className="cofa-label">Phone number</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="cofa-input" />
          </div>

          <div className="cofa-field">
            <label className="cofa-label">Email (only needed if paying online)</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="cofa-input" />
          </div>

          <div className="cofa-field">
            <label className="cofa-label">{labels.addressLabel}</label>
            <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} className="cofa-textarea" />
          </div>

          <div className="cofa-price" style={{ fontSize: 17, marginBottom: 16 }}>
            Total: NGN {(product.price * quantity).toLocaleString()}
          </div>

          {orderError && <p className="cofa-error-text">{orderError}</p>}

          <button
            type="button"
            onClick={handlePayOnline}
            disabled={payingOnline || placing}
            className="cofa-btn cofa-btn-primary"
            style={{ width: '100%', padding: 12, fontSize: 15, marginBottom: 10 }}
          >
            {payingOnline ? 'Processing payment...' : 'Pay now with Paystack'}
          </button>

          <button type="submit" disabled={placing || payingOnline} className="cofa-btn cofa-btn-accent" style={{ width: '100%', padding: 12, fontSize: 15 }}>
            {placing
              ? (labels.orderVerb === 'booking' ? 'Sending request...' : 'Placing order...')
              : (labels.orderVerb === 'booking' ? 'Send booking request' : `${labels.orderVerb === 'booking' ? 'Book' : 'Order'} now, pay on delivery`)}
          </button>
        </form>
      )}
    </div>
  )
}

export default ProductPage
