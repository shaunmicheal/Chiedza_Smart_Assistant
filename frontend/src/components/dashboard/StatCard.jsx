import {
  AlertTriangle,
  CalendarCheck2,
  GraduationCap,
  MessageSquareText,
  Users,
} from 'lucide-react'

const icons = {
  attendance: CalendarCheck2,
  risk: AlertTriangle,
  assessment: GraduationCap,
  messages: MessageSquareText,
  learners: Users,
}

function StatCard({ label, value, change, tone, icon }) {
  const Icon = icons[icon]

  return (
    <article className="stat-card">
      <div className="stat-topline">
        <div className={`icon-wrap ${tone}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <span className={`delta ${tone}`}>{change}</span>
      </div>
      <p className="stat-label">{label}</p>
      <h3>{value}</h3>
    </article>
  )
}

export default StatCard
