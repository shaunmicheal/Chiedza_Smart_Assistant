function StatusBadge({ children, tone, kind = 'status' }) {
  const className = kind === 'priority' ? 'priority-pill' : 'status-pill'
  return <span className={`${className} ${tone}`}>{children}</span>
}

export default StatusBadge
