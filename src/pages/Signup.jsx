import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BUSINESS_TYPES } from '../lib/businessTypes'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function Signup() {
  const navigate = useNavigate()
  const [storeName, setStoreName] = useState('')
  const [businessType, setBusinessType] = useState('retail')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!storeName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const slug = slugify(storeName)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setError('Something went wrong creating your account. Please try again.')
      setLoading(false)
      return
    }

    const { error: merchantError } = await supabase
      .from('merchants')
      .insert({ user_id: userId, store_name: storeName, slug, business_type: businessType })

    setLoading(false)

    if (merchantError) {
      if (merchantError.code === '23505') {
        setError('That store name is already taken. Please choose another.')
      } else {
        setError(merchantError.message)
      }
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="cofa-page cofa-page--narrow" style={{ paddingTop: 64 }}>
      <Link to="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--cofa-indigo)', textDecoration: 'none' }}>
        CoFa
      </Link>
      <h1 style={{ fontSize: 28, color: 'var(--cofa-indigo)', margin: '20px 0 4px' }}>Create your store</h1>
      <p className="cofa-muted" style={{ marginBottom: 28, fontSize: 15 }}>Free to set up. Live in minutes.</p>

      <form onSubmit={handleSubmit}>
        <div className="cofa-field">
          <label className="cofa-label">Store name</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
                        className="cofa-input"
          />
          {storeName && (
            <small className="cofa-muted" style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              your link: /store/{slugify(storeName)}
            </small>
          )}
        </div>

        <div className="cofa-field">
          <label className="cofa-label">What kind of business?</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="cofa-input"
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="cofa-field">
          <label className="cofa-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="cofa-input"
          />
        </div>

        <div className="cofa-field">
          <label className="cofa-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="cofa-input"
          />
        </div>

        {error && <p className="cofa-error-text">{error}</p>}

        <button type="submit" disabled={loading} className="cofa-btn cofa-btn-accent" style={{ width: '100%', padding: 12, fontSize: 15 }}>
          {loading ? 'Creating store...' : 'Create store'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14 }} className="cofa-muted">
        Already have a store? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}

export default Signup
