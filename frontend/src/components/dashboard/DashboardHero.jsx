import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

function DashboardHero() {
  return (
    <section className="hero-card">
      <div>
        <p className="eyebrow">Attendance and progress</p>
        <h2>Early signs are easier to act on when they are seen together.</h2>
        <p className="hero-copy">
          Review attendance patterns, assessment progress, and supportive family communication
          from one place.
        </p>
      </div>
      <div className="hero-actions">
        <Link className="secondary-button" to="/admin/early-warnings">
          <Sparkles size={16} aria-hidden="true" />
          Review early warnings
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <span className="hero-tag">Attendance · assessments · messages</span>
      </div>
    </section>
  )
}

export default DashboardHero
