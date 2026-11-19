import { Link } from 'react-router-dom'

function AuthFrame({ eyebrow, title, description, children }) {
  return (
    <main className="auth-page">
      <header className="auth-brand">
        <Link className="brand-block" to="/" aria-label="Chiedza Smart Assistant home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>
            <span className="brand-label">Chiedza</span>
            <span className="brand-name">Smart Assistant</span>
          </span>
        </Link>
      </header>
      <section className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
      </section>
      <footer className="auth-footer">Chiedza Smart Assistant · Supporting learners together</footer>
    </main>
  )
}

export default AuthFrame
