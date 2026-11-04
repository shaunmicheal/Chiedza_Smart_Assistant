function Avatar({ initials, size = 'regular', variant = '' }) {
  return (
    <span className={`avatar ${size === 'small' ? 'small' : ''} ${variant}`}>
      {initials}
    </span>
  )
}

export default Avatar
