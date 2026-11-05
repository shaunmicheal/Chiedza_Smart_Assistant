import { UserRound } from 'lucide-react'
import { linkedChildDemo } from '../../data/mock/parentDashboard'
import DemoNotice from '../../components/common/DemoNotice'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import Avatar from '../../components/common/Avatar'

function ChildrenPage() {
  return (
    <main className="content">
      <PageHeading eyebrow="Parent / guardian view" title="My children" description="This area is reserved for children linked to the guardian account." />
      <DemoNotice>Demonstration profile only. In the future, linked-child information must come from the authenticated account and backend relationship.</DemoNotice>
      <Panel eyebrow="Linked child · demo" title="Child profile">
        <div className="linked-child-summary">
          <Avatar initials={linkedChildDemo.initials} />
          <div className="linked-child-details">
            <strong>{linkedChildDemo.name}</strong>
            <span>{linkedChildDemo.className} · {linkedChildDemo.relation}</span>
          </div>
          <UserRound size={20} aria-hidden="true" />
        </div>
      </Panel>
    </main>
  )
}

export default ChildrenPage
