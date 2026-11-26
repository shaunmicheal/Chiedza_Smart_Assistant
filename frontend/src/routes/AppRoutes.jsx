import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import ParentLayout from '../layouts/ParentLayout'
import TeacherLayout from '../layouts/TeacherLayout'
import PlatformLayout from '../layouts/PlatformLayout'
import { pageDescriptions, roleNavigation } from '../data/navigation'
import { platformNavigation } from '../data/platformNavigation'
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
const TeacherClassesPage = lazy(() => import('../pages/teacher/TeacherClassesPage'))
const ClassesPage = lazy(() => import('../pages/admin/ClassesPage'))
const ProfilePage = lazy(() => import('../pages/shared/ProfilePage'))
const AlertRulesPage = lazy(() => import('../pages/admin/AlertRulesPage'))
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage'))
const ParentManagementPage = lazy(() => import('../pages/admin/ParentManagementPage'))
const TeacherManagementPage = lazy(() => import('../pages/admin/TeacherManagementPage'))
const ChildrenPage = lazy(() => import('../pages/parent/ChildrenPage'))
const ParentAttendancePage = lazy(() => import('../pages/parent/AttendancePage'))
const ProgressPage = lazy(() => import('../pages/parent/ProgressPage'))
const MessagesPage = lazy(() => import('../pages/parent/MessagesPage'))
const ParentNotificationsPage = lazy(() => import('../pages/parent/NotificationsPage'))
const AdminNotificationsPage = lazy(() => import('../pages/admin/NotificationsPage'))
const TeacherNotificationsPage = lazy(() => import('../pages/teacher/NotificationsPage'))
const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const ActivationPage = lazy(() => import('../pages/auth/ActivationPage'))
const SchoolApplicationPage = lazy(() => import('../pages/auth/SchoolApplicationPage'))
const PlatformOverviewPage = lazy(() => import('../pages/PlatformOverviewPage'))
const PlatformApplicationsPage = lazy(() => import('../pages/PlatformApplicationsPage'))
const PlatformSchoolsPage = lazy(() => import('../pages/PlatformSchoolsPage'))
const PlatformSchoolDetailPage = lazy(() => import('../pages/PlatformSchoolDetailPage'))
const PlatformAdministratorsPage = lazy(() => import('../pages/PlatformAdministratorsPage'))
const PlatformSchoolAdministratorsPage = lazy(() => import('../pages/PlatformSchoolAdministratorsPage'))
const AdminActivationPage = lazy(() => import('../pages/auth/AdminActivationPage'))
const PasswordChangePage = lazy(() => import('../pages/auth/PasswordChangePage'))

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
  '/admin/teachers': [TeacherManagementPage],
  '/admin/classes': [ClassesPage],
  '/admin/learners': [DirectoryPage, { kind: 'learners' }],
  '/admin/parents': [ParentManagementPage],
  '/teacher/classes': [TeacherClassesPage],
  '/teacher/learners': [DirectoryPage, { kind: 'learners' }],
  '/admin/early-warnings': [EarlyWarningsPage],
  '/admin/notifications': [AdminNotificationsPage],
  '/teacher/early-warnings': [EarlyWarningsPage],
  '/teacher/notifications': [TeacherNotificationsPage],
  '/admin/attendance': [AttendancePage],
  '/teacher/attendance': [AttendancePage],
  '/admin/assessments': [AssessmentsPage],
  '/teacher/assessments': [AssessmentsPage],
  '/admin/parent-communication': [ParentCommunicationPage],
  '/teacher/parent-communication': [ParentCommunicationPage],
  '/admin/alert-rules': [AlertRulesPage],
  '/admin/settings': [SettingsPage],
  '/admin/profile': [ProfilePage],
  '/teacher/profile': [ProfilePage],
  '/teacher/settings': [ProfilePage],
  '/parent/profile': [ProfilePage],
  '/parent/settings': [ProfilePage],
  '/parent/children': [ChildrenPage],
  '/parent/attendance': [ParentAttendancePage],
  '/parent/progress': [ProgressPage],
  '/parent/messages': [MessagesPage],
  '/parent/notifications': [ParentNotificationsPage],
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

function PlatformRoutes() {
  const items = platformNavigation.sections.flatMap(
    (section) => section.items,
  )

  return (
    <Route
      path="platform"
      element={
        <ProtectedRoute platformRole="SUPER_ADMIN">
          <PlatformLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="overview" replace />} />

      {items.map((item) => (
        <Route
          key={item.path}
          path={item.path.slice('/platform/'.length)}
          element={
            item.path === '/platform/overview' ? (
              <PlatformOverviewPage />
            ) : item.path === '/platform/applications' ? (
              <PlatformApplicationsPage />
            ) : item.path === '/platform/schools' ? (
              <PlatformSchoolsPage />
            ) : item.path === '/platform/administrators' ? (
              <PlatformAdministratorsPage />
            ) : item.path === '/platform/profile' || item.path === '/platform/settings' ? (
              <ProfilePage role="platform" />
            ) : (
              <PlaceholderPage
                page={{
                  ...item,
                  description: item.overview
                    ? 'Monitor Chiedza and manage the schools using the platform.'
                    : `Manage ${item.title.toLowerCase()} across the Chiedza platform.`,
                }}
              />
            )
          }
        />
      ))}

      <Route
        path="schools/:schoolId"
        element={<PlatformSchoolDetailPage />}
      />
      <Route
        path="schools/:schoolId/administrators"
        element={<PlatformSchoolAdministratorsPage />}
      />
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

function getUserHome(user) {
  if (user?.platformRole === 'SUPER_ADMIN') {
    return '/platform/overview'
  }

  const role = user?.memberships?.[0]?.role
  return roleHome[role] || '/login'
}

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (!user) return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/password-change" replace />

  return <Navigate to={getUserHome(user)} replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<ActivationPage />} />
        <Route path="/admin-activate" element={<AdminActivationPage />} />
        <Route path="/apply" element={<SchoolApplicationPage />} />
        <Route
          path="/password-change"
          element={
            <ProtectedRoute allowPasswordChange>
              <PasswordChangePage />
            </ProtectedRoute>
          }
        />

        {roleRoutes('admin', AdminLayout)}
        {roleRoutes('teacher', TeacherLayout)}
        {roleRoutes('parent', ParentLayout)}
        {PlatformRoutes()}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
