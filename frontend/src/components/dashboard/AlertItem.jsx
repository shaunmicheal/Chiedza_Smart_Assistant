import { CircleAlert } from 'lucide-react'

function AlertItem({ title, detail, level, time }) {
  return (
    <li className="alert-item">
      <span className={`alert-badge ${level}`}>
        <CircleAlert size={14} aria-hidden="true" />
      </span>
      <span className="alert-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      <time>{time}</time>
    </li>
  )
}

export default AlertItem
