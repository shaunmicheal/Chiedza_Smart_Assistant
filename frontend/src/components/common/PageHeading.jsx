function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children && <div className="page-heading-actions">{children}</div>}
    </div>
  )
}

export default PageHeading
