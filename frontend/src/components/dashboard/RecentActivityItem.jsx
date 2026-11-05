function RecentActivityItem({ title, detail, time }) {
  return (
    <li className="activity-item">
      <span className="activity-marker" aria-hidden="true" />
      <span className="activity-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      <time>{time}</time>
    </li>
  )
}

export default RecentActivityItem
