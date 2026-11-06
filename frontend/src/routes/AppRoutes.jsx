import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import ParentLayout from '../layouts/ParentLayout'
import TeacherLayout from '../layouts/TeacherLayout'
import { pageDescriptions, roleNavigation } from '../data/navigation'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { useAuth } from '../context/useAuth'

const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'))
const TeacherDashboardPage = lazy(() => import('../pages/teacher/TeacherDashboardPage'))
const ParentDashboardPage = lazy(() => import('../pages/parent/ParentDashboardPage'))
const EarlyWarningsPage = lazy(() => import('../pages/shared/EarlyWarningsPage'))
const AttendancePage = lazy(() => import('../pages/shared/AttendancePage'))
const AssessmentsPage = lazy(() => import('../pages/shared/AssessmentsPage'))
const ParentCommunicationPage = lazy(() => import('../pages/shared/ParentCommunicationPage'))
const DirectoryPage = lazy(() => import('../pages/shared/DirectoryPage'))
const ProfilePage = lazy(() => import('../pages/shared/ProfilePage'))
const AlertRulesPage = lazy(() => import('../pages/admin/AlertRulesPage'))
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage'))
const ChildrenPage = lazy(() => import('../pages/parent/ChildrenPage'))
const ParentAttendancePage = lazy(() => import('../pages/parent/AttendancePage'))
const ProgressPage = lazy(() => import('../pages/parent/ProgressPage'))
const MessagesPage = lazy(() => import('../pages/parent/MessagesPage'))
const NotificationsPage = lazy(() => import('../pages/parent/NotificationsPage'))
const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const ActivationPage = lazy(() => import('../pages/auth/ActivationPage'))

const overviewPages = {
  admin: DashboardPage,
  teacher: TeacherDashboardPage,
  parent: ParentDashboardPage,
}

const backendRoles = {
  admin: 'SCHOOL_ADMIN',
  teacher: 'TEACHER',
  parent: 'PARENT',
}

const roleHome = {
  SCHOOL_ADMIN: '/admin/overview',
  TEACHER: '/teacher/overview',
  PARENT: '/parent/overview',
}

const routePages = {
  '/admin/teachers': [DirectoryPage, { kind: 'teachers' }],
  '/admin/classes': [DirectoryPage, { kind: 'classes' }],
  '/admin/learners': [DirectoryPage, { kind: 'learners' }],
  '/teacher/classes': [DirectoryPage, { kind: 'classes' }],
  '/teacher/learners': [DirectoryPage, { kind: 'learners' }],
  '/admin/early-warnings': [EarlyWarningsPage],
  '/teacher/early-warnings': [EarlyWarningsPage],
  '/admin/attendance': [AttendancePage],
  '/teacher/attendance': [AttendancePage],
  '/admin/assessments': [AssessmentsPage],
  '/teacher/assessments': [AssessmentsPage],
  '/admin/parent-communication': [ParentCommunicationPage],
  '/teacher/parent-communication': [ParentCommunicationPage],
  '/admin/alert-rules': [AlertRulesPage],
  '/admin/settings': [SettingsPage],
  '/teacher/profile': [ProfilePage],
  '/parent/profile': [ProfilePage],
  '/parent/children': [ChildrenPage],
  '/parent/attendance': [ParentAttendancePage],
  '/parent/progress': [ProgressPage],
  '/parent/messages': [MessagesPage],
  '/parent/notifications': [NotificationsPage],
}

function roleRoutes(role, Layout) {
  const config = roleNavigation[role]
  const OverviewPage = overviewPages[role]
  const items = config.sections.flatMap((section) => section.items)

  return (
    <Route
      key={role}
      path={config.basePath.slice(1)}
      element={
        <ProtectedRoute role={backendRoles[role]}>
          <Layout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="overview" replace />} />

      {items.map((item) => {
        const [Page, pageProps = {}] = routePages[item.path] ?? []

        const Element = item.overview
          ? <OverviewPage />
          : Page
            ? <Page role={role} {...pageProps} />
            : <PlaceholderPage page={{ ...item, description: pageDescriptions[item.path] }} />

        return (
          <Route
            key={item.path}
            path={item.path.slice(config.basePath.length + 1)}
            element={Element}
          />
        )
      })}
    </Route>
  )
}

function LoadingPage() {
  return (
    <main className="route-loading" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>Loading Chiedza workspace…</span>
    </main>
  )
}

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (!user) return <Navigate to="/login" replace />

  const role = user.memberships?.[0]?.role
  return <Navigate to={roleHome[role] || '/login'} replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<ActivationPage />} />

        {roleRoutes('admin', AdminLayout)}
        {roleRoutes('teacher', TeacherLayout)}
        {roleRoutes('parent', ParentLayout)}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
