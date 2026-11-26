import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import ProfileSection from './ProfileSection'

function Sidebar({ config, isOpen = false, onClose = () => {} }) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`} id="workspace-sidebar">
        <div className="mobile-sidebar-heading">
          <span>Menu</span>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <NavLink
          className="brand-block"
          to={config.overviewPath}
          aria-label="Chiedza Smart Assistant overview"
          onClick={onClose}
        >
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>
            <span className="brand-label">Chiedza</span>
            <span className="brand-name">Smart Assistant</span>
          </span>
        </NavLink>

        <nav className="nav-groups" aria-label={`${config.label} navigation`}>
          {config.sections.map((section) => (
            <div className="nav-group" key={section.label}>
              <p className="nav-section-label">{section.label}</p>
              {section.items.map(({ title, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{title}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <ProfileSection
          role={config.label}
          profilePath={config.profilePath}
          settingsPath={config.settingsPath}
        />
      </aside>
    </>
  )
}

export default Sidebar
