import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { BUSINESS_TYPES, getLabels } from '../lib/businessTypes'
import { computeInsights, computeTrends } from '../lib/insights'

function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [error, setError] = useState('')

  // store settings form state
  const [showSettings, setShowSettings] = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [settingsStoreName, setSettingsStoreName] = useState('')
  const [settingsBusinessType, setSettingsBusinessType] = useState('retail')
  const [settingsDescription, setSettingsDescription] = useState('')
  const [settingsWhatsapp, setSettingsWhatsapp] = useState('')
  const [settingsLogoUrl, setSettingsLogoUrl] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  // product form state
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formTrackStock, setFormTrackStock] = useState(true)
  const [formDescription, setFormDescription] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState('')

  // CSV bulk upload state
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [csvFileName, setCsvFileName] = useState('')
  const [csvUploading, setCsvUploading] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (!merchant) return

    const channel = supabase
      .channel('orders-realtime-' + merchant.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `merchant_id=eq.${merchant.id}` },
        () => {
          setNewOrderAlert(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [merchant?.id])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/login')
      return
    }

    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (merchantError || !merchantData) {
      setError('Could not find your store. Please try logging in again.')
      setLoading(false)
      return
    }

    setMerchant(merchantData)
    setSettingsStoreName(merchantData.store_name || '')
    setSettingsBusinessType(merchantData.business_type || 'retail')
    setSettingsDescription(merchantData.description || '')
    setSettingsWhatsapp(merchantData.whatsapp_number || '')
    setSettingsLogoUrl(merchantData.logo_url || '')

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchantData.id)
      .order('created_at', { ascending: false })

    setProducts(productsData || [])

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', merchantData.id)
      .order('created_at', { ascending: false })

    setOrders(ordersData || [])

    if (ordersData && ordersData.length > 0) {
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', ordersData.map((o) => o.id))
      setOrderItems(itemsData || [])
    } else {
      setOrderItems([])
    }

    setLoading(false)
  }

  function validateRows(rawRows) {
    const rows = []
    const errors = []

    rawRows.forEach((row, idx) => {
      const name = String(row.name || '').trim()
      const priceRaw = String(row.price ?? '').trim()
      const price = parseFloat(priceRaw)
      const stockRaw = String(row.stock_quantity ?? '').trim()
      const stock = stockRaw === '' ? null : (parseInt(stockRaw, 10) || 0)
      const description = String(row.description || '').trim()
      const image_url = String(row.image_url || '').trim()
      const category = String(row.category || '').trim()

      if (!name || !priceRaw || isNaN(price)) {
        errors.push(`Row ${idx + 2}: missing or invalid name/price, skipped.`)
        return
      }

      rows.push({ name, price, stock_quantity: stock, description, image_url, category })
    })

    return { rows, errors }
  }

  function handleCsvFile(e) {
    const file = e.target.files[0]
    if (!file) return

    setCsvFileName(file.name)
    setCsvRows([])
    setCsvErrors([])

    const isExcel = /\.(xlsx|xls)$/i.test(file.name)

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[firstSheetName]
          const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          const { rows, errors } = validateRows(rawRows)
          setCsvRows(rows)
          setCsvErrors(errors)
        } catch (err) {
          setCsvErrors([`Could not read Excel file: ${err.message}`])
        }
      }
      reader.onerror = () => setCsvErrors(['Could not read the file.'])
      reader.readAsArrayBuffer(file)
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { rows, errors } = validateRows(results.data)
        setCsvRows(rows)
        setCsvErrors(errors)
      },
      error: (err) => {
        setCsvErrors([`Could not read file: ${err.message}`])
      },
    })
  }

  async function handleCsvUpload() {
    if (csvRows.length === 0) return

    setCsvUploading(true)

    const payload = csvRows.map((r) => ({ ...r, merchant_id: merchant.id }))

    const { error: insertError } = await supabase
      .from('products')
      .insert(payload)

    setCsvUploading(false)

    if (insertError) {
      setCsvErrors([`Upload failed: ${insertError.message}`])
      return
    }

    setShowCsvUpload(false)
    setCsvRows([])
    setCsvErrors([])
    setCsvFileName('')
    loadDashboard()
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setImageUploadError('')

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Image must be under 5MB.')
      return
    }

    setImageUploading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const ext = file.name.split('.').pop()
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file)

    if (uploadError) {
      setImageUploadError('Upload failed: ' + uploadError.message)
      setImageUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    setFormImageUrl(publicUrlData.publicUrl)
    setImageUploading(false)
  }

  function resetForm() {
    setEditingProduct(null)
    setFormName('')
    setFormPrice('')
    setFormStock('')
    setFormTrackStock(getLabels(merchant.business_type).trackStockDefault)
    setFormDescription('')
    setFormImageUrl('')
    setShowForm(false)
  }

  function startEdit(product) {
    setEditingProduct(product)
    setFormName(product.name)
    setFormPrice(product.price)
    setFormTrackStock(product.stock_quantity !== null)
    setFormStock(product.stock_quantity ?? '')
    setFormDescription(product.description || '')
    setFormImageUrl(product.image_url || '')
    setShowForm(true)
  }

  async function handleProductSubmit(e) {
    e.preventDefault()
    if (!formName || !formPrice) {
      alert(`Name and price are required.`)
      return
    }

    setFormSaving(true)

    const payload = {
      name: formName,
      price: parseFloat(formPrice),
      stock_quantity: formTrackStock ? (parseInt(formStock, 10) || 0) : null,
      description: formDescription,
      image_url: formImageUrl,
      merchant_id: merchant.id,
    }

    let result
    if (editingProduct) {
      result = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)
    } else {
      result = await supabase
        .from('products')
        .insert(payload)
    }

    setFormSaving(false)

    if (result.error) {
      alert(`Error saving ${labels.itemSingular.toLowerCase()}: ` + result.error.message)
      return
    }

    resetForm()
    loadDashboard()
  }

  async function handleDelete(productId) {
    if (!confirm(`Delete this ${labels.itemSingular.toLowerCase()}? This cannot be undone.`)) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      alert(`Error deleting ${labels.itemSingular.toLowerCase()}: ` + error.message)
      return
    }

    loadDashboard()
  }

  async function toggleActive(product) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)

    if (error) {
      alert(`Error updating ${labels.itemSingular.toLowerCase()}: ` + error.message)
      return
    }

    loadDashboard()
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      alert('Error updating order status: ' + error.message)
      return
    }

    loadDashboard()
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setImageUploadError('')

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Image must be under 5MB.')
      return
    }

    setImageUploading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const ext = file.name.split('.').pop()
    const path = `${session.user.id}/logo-${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file)

    if (uploadError) {
      setImageUploadError('Upload failed: ' + uploadError.message)
      setImageUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    setSettingsLogoUrl(publicUrlData.publicUrl)
    setImageUploading(false)
  }

  async function handleSettingsSubmit(e) {
    e.preventDefault()
    setSettingsError('')

    if (!settingsStoreName) {
      setSettingsError('Store name is required.')
      return
    }

    setSettingsSaving(true)

    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        store_name: settingsStoreName,
        business_type: settingsBusinessType,
        description: settingsDescription,
        whatsapp_number: settingsWhatsapp,
        logo_url: settingsLogoUrl,
      })
      .eq('id', merchant.id)

    setSettingsSaving(false)

    if (updateError) {
      setSettingsError(updateError.message)
      return
    }

    setShowSettings(false)
    loadDashboard()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return <div className="cofa-page">Loading your dashboard...</div>
  }

  if (error) {
    return <div className="cofa-page cofa-error-text">{error}</div>
  }

  const labels = getLabels(merchant.business_type)
  const insights = computeInsights(products, orders, orderItems, labels)
  const trends = computeTrends(orders)

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ background: 'var(--cofa-indigo)', color: 'var(--cofa-cream)', padding: '24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, opacity: 0.7, marginBottom: 4 }}>CoFa dashboard</div>
            <h1 style={{ fontSize: 26 }}>{merchant.store_name}</h1>
            <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 14 }}>
              <a href={`/store/${merchant.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cofa-marigold)' }}>
                cofa.store/{merchant.slug}
              </a>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowInsights((s) => !s)} className="cofa-btn cofa-btn-ghost" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--cofa-cream)' }}>
              {showInsights ? 'Hide insights' : 'Insights'}
            </button>
            <button onClick={() => setShowSettings((s) => !s)} className="cofa-btn cofa-btn-ghost" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--cofa-cream)' }}>
              {showSettings ? 'Close settings' : 'Store settings'}
            </button>
            <button onClick={handleLogout} className="cofa-btn cofa-btn-ghost" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--cofa-cream)' }}>
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="cofa-page">
        {newOrderAlert && (
          <div
            className="cofa-card"
            style={{ marginBottom: 24, borderColor: 'var(--cofa-jade)', background: 'rgba(47, 111, 94, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--cofa-jade)' }}>
              New order just came in.
            </p>
            <button
              onClick={() => { setNewOrderAlert(false); loadDashboard() }}
              className="cofa-btn cofa-btn-primary"
            >
              View order
            </button>
          </div>
        )}

        {!merchant.whatsapp_number && (
          <div
            className="cofa-card"
            style={{ marginBottom: 24, borderColor: 'var(--cofa-clay)', background: 'rgba(179, 73, 46, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
          >
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>Add your WhatsApp number</strong> — right now, customers have no way to reach you after ordering, and you won't be notified. Add it in Store settings.
            </p>
            <button onClick={() => setShowSettings(true)} className="cofa-btn cofa-btn-primary">
              Add WhatsApp number
            </button>
          </div>
        )}

        {showInsights && (
          <div className="cofa-card" style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16, color: 'var(--cofa-indigo)' }}>Insights</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div>
                <div className="cofa-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>Revenue collected</div>
                <div className="cofa-price" style={{ fontSize: 22 }}>NGN {insights.paidRevenue.toLocaleString()}</div>
                {insights.pendingCashRevenue > 0 && (
                  <div className="cofa-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    + NGN {insights.pendingCashRevenue.toLocaleString()} pending (pay on delivery)
                  </div>
                )}
              </div>
              <div>
                <div className="cofa-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>Total orders</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--cofa-indigo)' }}>{orders.length}</div>
              </div>
              <div>
                <div className="cofa-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>{labels.itemPlural}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--cofa-indigo)' }}>{products.length}</div>
              </div>
            </div>

            {trends.hasEnoughHistory && (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--cofa-cream-dim)' }}>
                <div>
                  <div className="cofa-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>
                    Revenue vs last week
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="cofa-price" style={{ fontSize: 18 }}>NGN {trends.thisWeekRevenue.toLocaleString()}</span>
                    {trends.revenueChangePct !== null && (
                      <span
                        className={`cofa-badge ${trends.revenueChangePct >= 0 ? 'cofa-badge--active' : 'cofa-badge--outofstock'}`}
                      >
                        {trends.revenueChangePct >= 0 ? 'up' : 'down'} {Math.abs(trends.revenueChangePct)}%
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="cofa-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>
                    Orders vs last week
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--cofa-indigo)' }}>{trends.thisWeekOrderCount}</span>
                    {trends.orderCountChangePct !== null && (
                      <span
                        className={`cofa-badge ${trends.orderCountChangePct >= 0 ? 'cofa-badge--active' : 'cofa-badge--outofstock'}`}
                      >
                        {trends.orderCountChangePct >= 0 ? 'up' : 'down'} {Math.abs(trends.orderCountChangePct)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {insights.advice.length > 0 && (
              <div style={{ marginBottom: insights.topSellers.length > 0 ? 20 : 0 }}>
                {insights.advice.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 0',
                      borderBottom: i < insights.advice.length - 1 ? '1px solid var(--cofa-cream-dim)' : 'none',
                    }}
                  >
                    <span
                      className={`cofa-badge ${
                        a.tone === 'warning' ? 'cofa-badge--outofstock' : a.tone === 'good' ? 'cofa-badge--active' : 'cofa-badge--hidden'
                      }`}
                      style={{ flexShrink: 0, marginTop: 2 }}
                    >
                      {a.tone === 'warning' ? '!' : a.tone === 'good' ? 'up' : 'i'}
                    </span>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{a.text}</p>
                  </div>
                ))}
              </div>
            )}

            {insights.topSellers.length > 0 && (
              <div>
                <div className="cofa-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>
                  Top sellers
                </div>
                {insights.topSellers.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
                    <span>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{p.unitsSold} sold</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showSettings && (
          <form onSubmit={handleSettingsSubmit} className="cofa-card" style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16, color: 'var(--cofa-indigo)' }}>Store settings</h3>

            <div className="cofa-field">
              <label className="cofa-label">Store name</label>
              <input value={settingsStoreName} onChange={(e) => setSettingsStoreName(e.target.value)} className="cofa-input" />
            </div>

            <div className="cofa-field">
              <label className="cofa-label">Business type</label>
              <select
                value={settingsBusinessType}
                onChange={(e) => setSettingsBusinessType(e.target.value)}
                className="cofa-input"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <small className="cofa-muted" style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
                Changes how your catalogue is labeled (e.g. "Menu" vs "Products").
              </small>
            </div>

            <div className="cofa-field">
              <label className="cofa-label">Description</label>
              <textarea
                value={settingsDescription}
                onChange={(e) => setSettingsDescription(e.target.value)}
                placeholder="Tell customers what your store is about"
                rows={3}
                className="cofa-textarea"
              />
            </div>

            <div className="cofa-field">
              <label className="cofa-label">WhatsApp number</label>
              <input
                value={settingsWhatsapp}
                onChange={(e) => setSettingsWhatsapp(e.target.value)}
                placeholder="e.g. 080XXXXXXXX"
                className="cofa-input"
              />
              <small className="cofa-muted" style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
                Customers can message you directly after ordering.
              </small>
            </div>

            <div className="cofa-field">
              <label className="cofa-label">Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ marginBottom: 8 }} />
              {imageUploading && <p className="cofa-muted" style={{ fontSize: 13, margin: '4px 0' }}>Uploading...</p>}
              {imageUploadError && <p className="cofa-error-text" style={{ fontSize: 13 }}>{imageUploadError}</p>}
              {settingsLogoUrl && (
                <img src={settingsLogoUrl} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '50%', display: 'block', marginTop: 4 }} />
              )}
              <label className="cofa-label" style={{ marginTop: 12 }}>Or paste a logo URL</label>
              <input
                value={settingsLogoUrl}
                onChange={(e) => setSettingsLogoUrl(e.target.value)}
                placeholder="https://..."
                className="cofa-input"
              />
            </div>

            {settingsError && <p className="cofa-error-text">{settingsError}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={settingsSaving} className="cofa-btn cofa-btn-primary">
                {settingsSaving ? 'Saving...' : 'Save settings'}
              </button>
              <button type="button" onClick={() => setShowSettings(false)} className="cofa-btn cofa-btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ color: 'var(--cofa-indigo)' }}>{labels.catalogueLabel} ({products.length})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCsvUpload((s) => !s)} className="cofa-btn cofa-btn-ghost">
              {showCsvUpload ? 'Close upload' : 'Upload catalogue'}
            </button>
            <button onClick={() => { resetForm(); setShowForm(true) }} className="cofa-btn cofa-btn-accent">
              + Add {labels.itemSingular.toLowerCase()}
            </button>
          </div>
        </div>

        {showCsvUpload && (
          <div className="cofa-card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 8, color: 'var(--cofa-indigo)' }}>Upload your catalogue</h3>
            <p className="cofa-muted" style={{ fontSize: 14 }}>
              Upload a CSV or Excel file with columns: <code>name, price, stock_quantity, description, image_url, category</code>.
              Only <code>name</code> and <code>price</code> are required.
            </p>

            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCsvFile} style={{ marginBottom: 12 }} />

            {csvErrors.length > 0 && (
              <div className="cofa-error-text" style={{ fontSize: 14 }}>
                {csvErrors.map((err, i) => <div key={i}>{err}</div>)}
              </div>
            )}

            {csvRows.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>
                  {csvFileName}: {csvRows.length} {csvRows.length === 1 ? labels.itemSingular.toLowerCase() : labels.itemPlural.toLowerCase()} ready to upload
                </p>
                <div className="cofa-table-scroll" style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--cofa-line)', borderRadius: 8, fontSize: 13 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--cofa-line)' }}>
                        <th style={{ padding: 8 }}>Name</th>
                        <th style={{ padding: 8 }}>Price</th>
                        <th style={{ padding: 8 }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 20).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--cofa-cream-dim)' }}>
                          <td style={{ padding: 8 }}>{r.name}</td>
                          <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>{r.price}</td>
                          <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>{r.stock_quantity === null ? 'unlimited' : r.stock_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 20 && (
                    <div className="cofa-muted" style={{ padding: 8 }}>...and {csvRows.length - 20} more</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCsvUpload}
                disabled={csvRows.length === 0 || csvUploading}
                className="cofa-btn cofa-btn-primary"
              >
                {csvUploading ? 'Uploading...' : `Upload ${csvRows.length || ''} ${labels.itemPlural.toLowerCase()}`}
              </button>
              <button
                type="button"
                onClick={() => { setShowCsvUpload(false); setCsvRows([]); setCsvErrors([]); setCsvFileName('') }}
                className="cofa-btn cofa-btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleProductSubmit} className="cofa-card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, color: 'var(--cofa-indigo)' }}>{editingProduct ? `Edit ${labels.itemSingular.toLowerCase()}` : `New ${labels.itemSingular.toLowerCase()}`}</h3>

            <div className="cofa-field">
              <label className="cofa-label">Name</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} className="cofa-input" />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="cofa-field">
              <div style={{ flex: 1 }}>
                <label className="cofa-label">Price (NGN)</label>
                <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="cofa-input" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="cofa-label">{labels.stockLabel}</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13 }} className="cofa-muted">
                  <input
                    type="checkbox"
                    checked={formTrackStock}
                    onChange={(e) => setFormTrackStock(e.target.checked)}
                  />
                  Track a limited quantity
                </label>
                {formTrackStock ? (
                  <input type="number" value={formStock} onChange={(e) => setFormStock(e.target.value)} className="cofa-input" />
                ) : (
                  <div className="cofa-muted" style={{ fontSize: 13, padding: '10px 0' }}>Always available</div>
                )}
              </div>
            </div>

            <div className="cofa-field">
              <label className="cofa-label">{labels.itemSingular} photo</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginBottom: 8 }} />
              {imageUploading && <p className="cofa-muted" style={{ fontSize: 13, margin: '4px 0' }}>Uploading...</p>}
              {imageUploadError && <p className="cofa-error-text" style={{ fontSize: 13 }}>{imageUploadError}</p>}
              {formImageUrl && (
                <img src={formImageUrl} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, display: 'block', marginTop: 4 }} />
              )}
              <label className="cofa-label" style={{ marginTop: 12 }}>Or paste an image URL</label>
              <input value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://..." className="cofa-input" />
            </div>

            <div className="cofa-field">
              <label className="cofa-label">Description</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} className="cofa-textarea" />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={formSaving} className="cofa-btn cofa-btn-primary">
                {formSaving ? 'Saving...' : editingProduct ? 'Save changes' : `Add ${labels.itemSingular.toLowerCase()}`}
              </button>
              <button type="button" onClick={resetForm} className="cofa-btn cofa-btn-ghost">Cancel</button>
            </div>
          </form>
        )}

        {products.length === 0 ? (
          <p className="cofa-muted">No {labels.itemPlural.toLowerCase()} yet. Add your first one above.</p>
        ) : (
          <div style={{ marginBottom: 40 }}>
            {products.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--cofa-line)', padding: '14px 0', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong>{p.name}</strong> — <span className="cofa-price">NGN {Number(p.price).toLocaleString()}</span>
                  <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`cofa-badge ${p.is_active ? 'cofa-badge--active' : 'cofa-badge--hidden'}`}>
                      {p.is_active ? 'Active' : 'Hidden'}
                    </span>
                    <span className="cofa-muted" style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                      {p.stock_quantity === null ? 'Always available' : `Stock: ${p.stock_quantity}`}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleActive(p)} className="cofa-btn cofa-btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}>
                    {p.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => startEdit(p)} className="cofa-btn cofa-btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="cofa-btn cofa-btn-danger" style={{ padding: '6px 12px', fontSize: 13 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ color: 'var(--cofa-indigo)', marginBottom: 16 }}>Orders ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="cofa-muted">No orders yet.</p>
        ) : (
          <div>
            {orders.map((o) => (
              <div key={o.id} style={{ borderBottom: '1px solid var(--cofa-line)', padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong>{o.customer_name}</strong> — <span className="cofa-price">NGN {Number(o.total_amount).toLocaleString()}</span>
                  <div className="cofa-muted" style={{ fontSize: 13, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{o.customer_phone}</span>
                    <span className={`cofa-badge ${o.payment_status === 'paid' ? 'cofa-badge--active' : 'cofa-badge--hidden'}`}>
                      {o.payment_status === 'paid' ? 'Paid online' : 'Pay on delivery'}
                    </span>
                  </div>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                  className="cofa-input"
                  style={{ width: 'auto', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '6px 10px' }}
                >
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
