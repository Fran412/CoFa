import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (loginError) {
      setError(loginError.message)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="cofa-page cofa-page--narrow" style={{ paddingTop: 64 }}>
      <Link to="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--cofa-indigo)', textDecoration: 'none' }}>
        CoFa
      </Link>
      <h1 style={{ fontSize: 28, color: 'var(--cofa-indigo)', margin: '20px 0 28px' }}>Log in</h1>

      <form onSubmit={handleSubmit}>
        <div className="cofa-field">
          <label className="cofa-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cofa-input"
          />
        </div>

        <div className="cofa-field">
          <label className="cofa-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="cofa-input"
          />
        </div>

        {error && <p className="cofa-error-text">{error}</p>}

        <button type="submit" disabled={loading} className="cofa-btn cofa-btn-primary" style={{ width: '100%', padding: 12, fontSize: 15 }}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14 }} className="cofa-muted">
        Don't have a store yet? <Link to="/signup">Create one</Link>
      </p>
    </div>
  )
}

export default Login
