import { Link } from 'react-router-dom'
import './AuthFrame.css'

function AuthFrame({ eyebrow, title, description, children }) {
  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="auth-brand-link" to="/" aria-label="Chiedza Smart Assistant home">
          <span className="auth-monogram" aria-hidden="true">ch</span>
          <span className="auth-brand-copy">
            <strong>Chiedza</strong>
            <span>Smart Assistant</span>
          </span>
        </Link>
        <span className="auth-topbar-note">A brighter way to support learning</span>
      </header>

      <div className="auth-layout">
        <aside className="auth-story">
          <img
            className="auth-story-photo"
            src="/images/chiedza-classroom.png"
            alt="A learner smiling in her classroom"
          />

          <div className="auth-story-content">
            <p className="auth-story-kicker">Learning grows together</p>
            <h2>
              Every learner
              <br />
              deserves a
              <br />
              <em>bright future.</em>
            </h2>
            <p className="auth-story-description">
              A thoughtful space for the people who teach, guide and care
              for every child's journey.
            </p>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            <div className="auth-heading">
              <p className="auth-eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p className="auth-description">{description}</p>
            </div>
            {children}
          </div>

          <p className="auth-panel-note">
            A little more support can make a world of difference.
          </p>
        </section>
      </div>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Chiedza Smart Assistant</span>
        <span>Supporting learners together</span>
      </footer>
    </main>
  )
}

export default AuthFrame
