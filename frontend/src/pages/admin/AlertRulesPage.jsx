import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { demoNotice } from '../../data/mock/operations'
import DemoNotice from '../../components/common/DemoNotice'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'

function AlertRulesPage() {
  const [absenceDays, setAbsenceDays] = useState('3')
  const [declinePoints, setDeclinePoints] = useState('15')
  const [enabled, setEnabled] = useState(true)
  const [feedback, setFeedback] = useState('')

  function submitRules(event) {
    event.preventDefault()
    setFeedback('Rule settings updated in this page only. They are not applied to school data.')
  }

  return (
    <main className="content">
      <PageHeading eyebrow="Administrator configuration" title="Alert rules" description="Review example thresholds for attendance and assessment warning patterns." />
      <DemoNotice>{demoNotice} Settings are local page state and do not change a live alert service.</DemoNotice>
      {feedback && <p className="form-feedback" role="status">{feedback}</p>}
      <Panel eyebrow="Early-warning configuration · demo" title="Threshold examples">
        <form className="form-grid alert-rules-form" onSubmit={submitRules}>
          <label className="rule-toggle">
            <span><strong>Enable demonstration alert rules</strong><small>Toggle the local example configuration.</small></span>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          </label>
          <FormField id="absence-threshold" label="Repeated absence threshold" hint="Example number of absences used to flag a pattern.">
            <input id="absence-threshold" type="number" min="1" max="20" value={absenceDays} onChange={(event) => setAbsenceDays(event.target.value)} required disabled={!enabled} />
          </FormField>
          <FormField id="decline-threshold" label="Assessment decline threshold" hint="Example percentage-point decrease between assessments.">
            <input id="decline-threshold" type="number" min="1" max="100" value={declinePoints} onChange={(event) => setDeclinePoints(event.target.value)} required disabled={!enabled} />
          </FormField>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={!enabled}>
              <SlidersHorizontal size={16} aria-hidden="true" /> Apply locally
            </button>
          </div>
        </form>
      </Panel>
    </main>
  )
}

export default AlertRulesPage
