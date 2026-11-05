import { parentSchoolMessages } from '../../data/mock/parentDashboard'
import DemoNotice from '../../components/common/DemoNotice'
import MessagePreview from '../../components/common/MessagePreview'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'

function MessagesPage() {
  return (
    <main className="content">
      <PageHeading eyebrow="In-app messages" title="Messages" description="Supportive school messages for your linked child." />
      <DemoNotice>English and Shona demonstration messages only. The school has not sent these messages.</DemoNotice>
      <div className="parent-messages-list">
        {parentSchoolMessages.map((message) => (
          <Panel eyebrow={message.time} title={message.title} key={message.title}>
            <MessagePreview english={message.english} shona={message.shona} />
          </Panel>
        ))}
      </div>
    </main>
  )
}

export default MessagesPage
