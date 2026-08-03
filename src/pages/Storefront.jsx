import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getLabels } from '../lib/businessTypes'
import { getTierConfig, getEffectiveTierKey } from '../lib/subscriptionTiers'
import { getThemeVars, isThemeUnlocked, THEMES } from '../lib/themes'

function Storefront() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [merchant, setMerchant] = useState(null)
  const [products, setProducts] = useState([])

  useEffect(() => {
    loadStore()
  }, [slug])

  async function loadStore() {
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

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchantData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setProducts(productsData || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="cofa-page" style={{ textAlign: 'center' }}>Loading store...</div>
  }

  if (notFound) {
    return (
      <div className="cofa-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h1 style={{ color: 'var(--cofa-indigo)', marginBottom: 8 }}>Store not found</h1>
        <p className="cofa-muted">This store doesn't exist or the link is incorrect.</p>
      </div>
    )
  }

  const labels = getLabels(merchant.business_type)

  const effectiveThemeKey = isThemeUnlocked(merchant.theme, getEffectiveTierKey(merchant)) ? merchant.theme : 'basic'
  const themeVars = getThemeVars(effectiveThemeKey)
  const signatureClass = THEMES[effectiveThemeKey].signatureClass

  return (
    <div style={{ minHeight: '100vh', ...themeVars }}>
      <header style={{
        background: 'var(--cofa-indigo)',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 14px)',
        color: 'var(--cofa-cream)',
        padding: '48px 24px 56px',
        textAlign: 'center',
      }}>
        {merchant.logo_url && (
          <img
            src={merchant.logo_url}
            alt={merchant.store_name}
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%', marginBottom: 16, border: '3px solid var(--cofa-marigold)' }}
          />
        )}
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>{merchant.store_name}</h1>
        <p style={{ opacity: 0.85, maxWidth: 440, margin: '0 auto', lineHeight: 1.5 }}>
          {merchant.description || labels.tagline}
        </p>
        {merchant.whatsapp_number && (
          <a
            href={`https://wa.me/${merchant.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="cofa-btn cofa-btn-accent"
            style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none' }}
          >
            Chat on WhatsApp
          </a>
        )}
      </header>

      <div className="cofa-page">
        <h2 style={{ color: 'var(--cofa-indigo)', marginBottom: 20 }}>{labels.catalogueLabel}</h2>
        {products.length === 0 ? (
          <p className="cofa-muted" style={{ textAlign: 'center' }}>Nothing listed yet.</p>
        ) : (
          <div className="cofa-product-grid">
            {products.map((p) => (
              <Link
                key={p.id}
                to={`/store/${slug}/product/${p.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className={signatureClass} />
                <div style={{ border: '1px solid var(--cofa-line)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', background: 'var(--cofa-surface)' }}>
                  <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'var(--cofa-cream-dim)', overflow: 'hidden' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cofa-ink-soft)', fontSize: 13 }}>
                        No image
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                    <div className="cofa-price">NGN {Number(p.price).toLocaleString()}</div>
                    {p.stock_quantity === 0 && (
                      <span className="cofa-badge cofa-badge--outofstock" style={{ marginTop: 6, display: 'inline-block' }}>
                        Out of stock
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {getTierConfig(merchant).showFooterBranding && (
          <footer style={{ textAlign: 'center', marginTop: 56, paddingTop: 20, borderTop: '1px solid var(--cofa-line)' }}>
            <span className="cofa-muted" style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Powered by CoFa</span>
          </footer>
        )}
      </div>
    </div>
  )
}

export default Storefront
