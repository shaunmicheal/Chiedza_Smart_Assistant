import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ApplicationHeader from './ApplicationHeader'
import Sidebar from './Sidebar'

function RoleLayout({ config }) {
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const currentPage = config.sections
    .flatMap((section) => section.items)
    .find((item) => item.path === pathname)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  return (
    <div className="app-shell">
      <Sidebar
        config={config}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="main-panel">
        <ApplicationHeader
          config={config}
          title={currentPage?.title ?? config.label}
          onMenuToggle={() => setMobileMenuOpen((value) => !value)}
          menuOpen={mobileMenuOpen}
        />
        <Outlet />
      </div>
    </div>
  )
}

export default RoleLayout
