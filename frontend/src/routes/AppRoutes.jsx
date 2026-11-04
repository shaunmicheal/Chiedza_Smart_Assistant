import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import ParentLayout from '../layouts/ParentLayout'
import TeacherLayout from '../layouts/TeacherLayout'
import { pageDescriptions, roleNavigation } from '../data/navigation'
import DashboardPage from '../pages/admin/DashboardPage'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'

function roleRoutes(role, Layout) {
  const config = roleNavigation[role]
  const items = config.sections.flatMap((section) => section.items)

  return (
    <Route key={role} path={config.basePath.slice(1)} element={<Layout />}>
      <Route index element={<Navigate to="overview" replace />} />
      {items.map((item) => (
        <Route
          key={item.path}
          path={item.path.slice(config.basePath.length + 1)}
          element={
            item.overview && role === 'admin' ? (
              <DashboardPage />
            ) : (
              <PlaceholderPage page={{ ...item, description: pageDescriptions[item.path] }} />
            )
          }
        />
      ))}
    </Route>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/overview" replace />} />
      {roleRoutes('admin', AdminLayout)}
      {roleRoutes('teacher', TeacherLayout)}
      {roleRoutes('parent', ParentLayout)}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
