import { Bell, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function ApplicationHeader({ config, title }) {
  return (
    <header className="topbar">
      <div className="header-title-wrap">
        <div className="crumbs" aria-label="Breadcrumb">
          <Link to={config.overviewPath}>Home</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{title}</span>
        </div>
        <h1>{title}</h1>
      </div>
      <div className="header-tools">
        <span className="header-context">Demonstration workspace</span>
        <Link className="icon-button" to={config.notificationsPath} aria-label="Open notifications">
          <Bell size={18} aria-hidden="true" />
        </Link>
      </div>
    </header>
  )
}

export default ApplicationHeader
