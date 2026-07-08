import { Link } from 'react-router-dom'

function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cofa-cream)' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 32px',
        borderBottom: '1px solid var(--cofa-line)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--cofa-indigo)' }}>
          CoFa
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="cofa-btn cofa-btn-ghost">Log in</Link>
          <Link to="/signup" className="cofa-btn cofa-btn-primary">Create your store</Link>
        </div>
      </header>

      <section style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '96px 32px 64px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--cofa-jade)',
          background: 'rgba(47, 111, 94, 0.1)',
          padding: '4px 12px',
          borderRadius: 20,
          marginBottom: 24,
        }}>
          upload your catalogue &rarr; get a store
        </div>

        <h1 className="cofa-hero-title" style={{
          lineHeight: 1.1,
          color: 'var(--cofa-indigo)',
          marginBottom: 20,
        }}>
          Your price list is already a storefront. We just build it.
        </h1>

        <p style={{ fontSize: 18, color: 'var(--cofa-ink-soft)', marginBottom: 36, lineHeight: 1.6 }}>
          Add your products or upload a spreadsheet. CoFa turns them into a live store
          your customers can browse and order from, no design or code needed.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/signup" className="cofa-btn cofa-btn-accent" style={{ fontSize: 16, padding: '12px 28px' }}>
            Create your store
          </Link>
          <Link to="/login" className="cofa-btn cofa-btn-ghost" style={{ fontSize: 16, padding: '12px 28px' }}>
            Log in
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { label: 'Add products', body: 'One at a time, or upload your whole catalogue as a CSV or Excel file.' },
            { label: 'Get a live link', body: 'Your store renders instantly at your own cofa.store/your-name link.' },
            { label: 'Take orders', body: 'Customers order directly. You confirm and deliver, no middleman.' },
          ].map((step, i) => (
            <div key={i} className="cofa-card">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--cofa-marigold-dark)', fontSize: 13, marginBottom: 8 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 style={{ fontSize: 17, marginBottom: 8, color: 'var(--cofa-indigo)' }}>{step.label}</h3>
              <p className="cofa-muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Landing
