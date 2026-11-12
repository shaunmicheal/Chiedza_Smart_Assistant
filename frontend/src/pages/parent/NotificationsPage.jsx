import { Bell } from 'lucide-react'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import EmptyState from '../../components/common/EmptyState'
import './ParentPortal.css'

function NotificationsPage() {
  return (
    <main className="content parent-portal">
      <PageHeading
        eyebrow="School updates"
        title="Notifications"
        description="A space for direct school notifications related to your linked learners."
      />
      <Panel eyebrow="Notifications" title="Your updates">
        <EmptyState
          title="Notifications are not available yet"
          description="The current system provides approved school messages in the Messages section. A separate notification service has not been added yet."
          icon={Bell}
        />
      </Panel>
    </main>
  )
}

export default NotificationsPage
