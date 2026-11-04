import Avatar from '../common/Avatar'
import StatusBadge from '../common/StatusBadge'

function LearnerSummaryRow({ name, className, risk, priority }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')

  return (
    <li className="learner-row">
      <div className="learner-info">
        <Avatar initials={initials} size="small" variant="alt" />
        <span>
          <strong>{name}</strong>
          <span>{className}</span>
        </span>
      </div>
      <span className="learner-risk">{risk}</span>
      <StatusBadge tone={priority.toLowerCase()} kind="priority">{priority}</StatusBadge>
    </li>
  )
}

export default LearnerSummaryRow
