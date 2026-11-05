import { CircleAlert } from 'lucide-react'

function AlertItem({ title, detail, level, time, action, className = '' }) {
  return (
    <li className={`alert-item ${className}`.trim()}>
      <span className={`alert-badge ${level}`}>
        <CircleAlert size={14} aria-hidden="true" />
      </span>
      <span className="alert-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      <time>{time}</time>
      {action && <span className="alert-item-action">{action}</span>}
    </li>
  )
}

export default AlertItem
