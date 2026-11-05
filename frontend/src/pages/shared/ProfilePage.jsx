import { UserRound } from 'lucide-react'
import { demoNotice } from '../../data/mock/operations'
import { linkedChildDemo } from '../../data/mock/parentDashboard'
import DemoNotice from '../../components/common/DemoNotice'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import Avatar from '../../components/common/Avatar'

const profiles = {
  admin: { name: 'School administrator', context: 'School-wide demonstration workspace', initials: 'SA' },
  teacher: { name: 'Teacher account', context: 'Assigned classes: Grade 4A and Grade 5B · demo', initials: 'T' },
  parent: { name: 'Parent / guardian account', context: `${linkedChildDemo.name} · linked-child demo`, initials: 'PG' },
}

function ProfilePage({ role }) {
  const profile = profiles[role]

  return (
    <main className="content">
      <PageHeading eyebrow="Account" title="Profile" description="Review the profile context shown in this demonstration workspace." />
      <DemoNotice>{demoNotice} Profile information is illustrative and cannot be edited or authenticated here.</DemoNotice>
      <Panel eyebrow="Demonstration profile" title="Account summary">
        <div className="linked-child-summary">
          <Avatar initials={profile.initials} />
          <div className="linked-child-details">
            <strong>{profile.name}</strong>
            <span>{profile.context}</span>
          </div>
          <UserRound size={20} aria-hidden="true" />
        </div>
      </Panel>
    </main>
  )
}

export default ProfilePage
