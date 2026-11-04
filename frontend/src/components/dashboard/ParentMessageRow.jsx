import Avatar from '../common/Avatar'
import StatusBadge from '../common/StatusBadge'

function ParentMessageRow({ name, status, tone }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')

  return (
    <li className="message-item">
      <div className="message-meta">
        <Avatar initials={initials} size="small" />
        <span>
          <strong>{name}</strong>
          <span>{status}</span>
        </span>
      </div>
      <StatusBadge tone={tone}>{status}</StatusBadge>
    </li>
  )
}

export default ParentMessageRow
