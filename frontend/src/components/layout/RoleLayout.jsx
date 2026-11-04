import { useLocation, Outlet } from 'react-router-dom'
import ApplicationHeader from './ApplicationHeader'
import Sidebar from './Sidebar'

function RoleLayout({ config }) {
  const { pathname } = useLocation()
  const currentPage = config.sections
    .flatMap((section) => section.items)
    .find((item) => item.path === pathname)

  return (
    <div className="app-shell">
      <Sidebar config={config} />
      <div className="main-panel">
        <ApplicationHeader config={config} title={currentPage?.title ?? config.label} />
        <Outlet />
      </div>
    </div>
  )
}

export default RoleLayout
