import { useState } from 'react'
import { Check } from 'lucide-react'
import { parentNotifications } from '../../data/mock/parentDashboard'
import DemoNotice from '../../components/common/DemoNotice'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import AlertItem from '../../components/dashboard/AlertItem'

function NotificationsPage() {
  const [readIds, setReadIds] = useState([])
  const unread = parentNotifications.filter((item) => !readIds.includes(item.title))

  return (
    <main className="content">
      <PageHeading eyebrow="Linked child · demo" title="Notifications" description="In-app school updates related to your linked child." />
      <DemoNotice>These are demonstration notifications only. No school updates have been sent to an account.</DemoNotice>
      <Panel
        eyebrow={`${unread.length} unread · demonstration`}
        title="Recent notifications"
        action={unread.length > 0 && (
          <button type="button" className="secondary-button" onClick={() => setReadIds(parentNotifications.map((item) => item.title))}>
            <Check size={16} aria-hidden="true" /> Mark all read
          </button>
        )}
      >
        <ul className="alert-list">
          {parentNotifications.map((notification) => (
            <AlertItem
              {...notification}
              key={notification.title}
              className={readIds.includes(notification.title) ? 'read' : ''}
              action={!readIds.includes(notification.title) && (
                <button className="link-button" type="button" onClick={() => setReadIds((current) => [...current, notification.title])}>
                  Mark read
                </button>
              )}
            />
          ))}
        </ul>
      </Panel>
    </main>
  )
}

export default NotificationsPage
