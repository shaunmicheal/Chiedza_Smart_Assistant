import {
  Building2,
  ClipboardCheck,
  Home,
  Users,
  CircleUserRound,
  Settings,
} from 'lucide-react'

export const platformNavigation = {
  label: 'Platform administration',
  basePath: '/platform',
  overviewPath: '/platform/overview',
  profilePath: '/platform/profile',
  settingsPath: '/platform/settings',
  sections: [
    {
      label: 'Platform',
      items: [
        {
          title: 'Overview',
          path: '/platform/overview',
          icon: Home,
          overview: true,
        },
        {
          title: 'Schools',
          path: '/platform/schools',
          icon: Building2,
        },
        {
          title: 'Applications',
          path: '/platform/applications',
          icon: ClipboardCheck,
        },
      ],
    },
    {
      label: 'Management',
      items: [
        {
          title: 'School administrators',
          path: '/platform/administrators',
          icon: Users,
        },
      ],
    },
    {
      label: 'Account',
      items: [
        {
          title: 'Profile',
          path: '/platform/profile',
          icon: CircleUserRound,
        },
        {
          title: 'Settings',
          path: '/platform/settings',
          icon: Settings,
        },
      ],
    },
  ],
}
