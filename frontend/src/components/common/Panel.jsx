function Panel({ eyebrow, title, action, className = '', children }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <header className="panel-header compact-header">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h3>{title}</h3>
        </div>
        {action && <div className="panel-action">{action}</div>}
      </header>
      {children}
    </section>
  )
}

export default Panel
