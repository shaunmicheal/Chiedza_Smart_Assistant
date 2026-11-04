import {
  Activity,
  Bell,
  BookOpen,
  CalendarCheck2,
  Home,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

export const roleNavigation = {
  admin: {
    label: 'Administrator',
    basePath: '/admin',
    overviewPath: '/admin/overview',
    notificationsPath: '/admin/early-warnings',
    settingsPath: '/admin/settings',
    sections: [
      {
        label: 'School',
        items: [
          { title: 'Overview', path: '/admin/overview', icon: Home, overview: true },
          { title: 'Attendance', path: '/admin/attendance', icon: CalendarCheck2 },
          { title: 'Assessments', path: '/admin/assessments', icon: BookOpen },
          { title: 'Learners', path: '/admin/learners', icon: Users },
        ],
      },
      {
        label: 'Support',
        items: [
          { title: 'Early warnings', path: '/admin/early-warnings', icon: ShieldCheck },
          { title: 'Parent communication', path: '/admin/parent-communication', icon: MessageSquareText },
        ],
      },
      {
        label: 'Manage',
        items: [{ title: 'Settings', path: '/admin/settings', icon: Settings }],
      },
    ],
  },
  teacher: {
    label: 'Teacher',
    basePath: '/teacher',
    overviewPath: '/teacher/overview',
    notificationsPath: '/teacher/early-warnings',
    sections: [
      {
        label: 'Teaching',
        items: [
          { title: 'Overview', path: '/teacher/overview', icon: Home, overview: true },
          { title: 'Assigned classes', path: '/teacher/classes', icon: Users },
          { title: 'Attendance', path: '/teacher/attendance', icon: CalendarCheck2 },
          { title: 'Assessments', path: '/teacher/assessments', icon: BookOpen },
        ],
      },
      {
        label: 'Support',
        items: [
          { title: 'Early warnings', path: '/teacher/early-warnings', icon: ShieldCheck },
          { title: 'Parent communication', path: '/teacher/parent-communication', icon: MessageSquareText },
        ],
      },
    ],
  },
  parent: {
    label: 'Parent / Guardian',
    basePath: '/parent',
    overviewPath: '/parent/overview',
    notificationsPath: '/parent/notifications',
    sections: [
      {
        label: 'My school',
        items: [
          { title: 'Overview', path: '/parent/overview', icon: Home, overview: true },
          { title: 'My children', path: '/parent/children', icon: Users },
          { title: 'Attendance', path: '/parent/attendance', icon: CalendarCheck2 },
          { title: 'Academic progress', path: '/parent/progress', icon: Activity },
        ],
      },
      {
        label: 'Communication',
        items: [
          { title: 'Messages', path: '/parent/messages', icon: MessageSquareText },
          { title: 'Notifications', path: '/parent/notifications', icon: Bell },
        ],
      },
    ],
  },
}

export const allRolePages = Object.values(roleNavigation).flatMap((role) =>
  role.sections.flatMap((section) => section.items),
)

export const pageDescriptions = {
  '/admin/attendance': 'Monitor and review learner attendance.',
  '/admin/assessments': 'Record assessment results and follow progress over time.',
  '/admin/learners': 'Review learner information relevant to attendance and learning progress.',
  '/admin/early-warnings': 'Review patterns of repeated absences and declining marks.',
  '/admin/parent-communication': 'Prepare supportive parent messages in English and Shona.',
  '/admin/settings': 'Configure school workspace preferences.',
  '/teacher/classes': 'View the classes assigned to this teacher.',
  '/teacher/attendance': 'Record and review attendance for assigned classes.',
  '/teacher/assessments': 'Record assessments and review learner progress.',
  '/teacher/early-warnings': 'Review attendance and assessment patterns that may need support.',
  '/teacher/parent-communication': 'Prepare supportive parent messages in English and Shona.',
  '/parent/children': 'View learners linked to this parent or guardian account.',
  '/parent/attendance': 'Review attendance information for linked learners.',
  '/parent/progress': 'Review academic progress for linked learners.',
  '/parent/messages': 'Read school messages in English or Shona.',
  '/parent/notifications': 'Review school updates relevant to linked learners.',
}
