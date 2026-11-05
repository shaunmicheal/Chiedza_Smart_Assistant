import { Inbox } from 'lucide-react'

function EmptyState({ title, description, icon: Icon = Inbox }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state-icon"><Icon size={20} aria-hidden="true" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  )
}

export default EmptyState
