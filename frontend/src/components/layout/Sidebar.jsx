import { NavLink } from 'react-router-dom'
import ProfileSection from './ProfileSection'

function Sidebar({ config }) {
  return (
    <aside className="sidebar">
      <NavLink className="brand-block" to={config.overviewPath} aria-label="Chiedza Smart Assistant overview">
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
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{title}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <ProfileSection role={config.label} settingsPath={config.settingsPath} />
    </aside>
  )
}

export default Sidebar
