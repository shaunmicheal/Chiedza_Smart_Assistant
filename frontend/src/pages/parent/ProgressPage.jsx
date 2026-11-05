import { linkedChildAssessments, linkedChildDemo } from '../../data/mock/parentDashboard'
import DemoNotice from '../../components/common/DemoNotice'
import PageHeading from '../../components/common/PageHeading'
import { AssessmentChart } from '../../components/dashboard/DashboardCharts'

function ProgressPage() {
  return (
    <main className="content">
      <PageHeading eyebrow="Linked child" title="Academic progress" description={`Learning progress for ${linkedChildDemo.name} · ${linkedChildDemo.className}`} />
      <DemoNotice>Linked-child demonstration results only. Marks are examples and are not connected to a school system.</DemoNotice>
      <AssessmentChart
        data={linkedChildAssessments}
        eyebrow="Linked child · demo"
        title="Progress by learning area"
        ariaLabel={`Demonstration academic progress for ${linkedChildDemo.name}`}
      />
    </main>
  )
}

export default ProgressPage
