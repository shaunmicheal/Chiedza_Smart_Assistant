import { useState } from 'react'
import { Bell, Languages, Save } from 'lucide-react'
import { demoNotice } from '../../data/mock/operations'
import DemoNotice from '../../components/common/DemoNotice'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'

function SettingsPage() {
  const [language, setLanguage] = useState('English and Shona')
  const [notifyOnAlerts, setNotifyOnAlerts] = useState(true)
  const [feedback, setFeedback] = useState('')

  return (
    <main className="content">
      <PageHeading eyebrow="School workspace" title="Settings" description="Manage local preferences for this demonstration interface." />
      <DemoNotice>{demoNotice} Preferences below are held only in this page state and are not saved.</DemoNotice>
      {feedback && <p className="form-feedback" role="status">{feedback}</p>}
      <Panel eyebrow="Communication preferences" title="Language and alerts">
        <div className="settings-options">
          <label className="settings-option">
            <span className="settings-option-icon"><Languages size={18} aria-hidden="true" /></span>
            <span><strong>Parent message languages</strong><small>Choose the language versions shown in the message workspace.</small></span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Parent message languages">
              <option>English and Shona</option>
              <option>English</option>
              <option>Shona</option>
            </select>
          </label>
          <label className="settings-option">
            <span className="settings-option-icon"><Bell size={18} aria-hidden="true" /></span>
            <span><strong>Early-warning notifications</strong><small>Local preference example for alert notifications.</small></span>
            <input type="checkbox" checked={notifyOnAlerts} onChange={(event) => setNotifyOnAlerts(event.target.checked)} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="primary-button" onClick={() => setFeedback('Preferences updated locally only. Nothing was saved to a school system.')}>
            <Save size={16} aria-hidden="true" /> Save preferences locally
          </button>
        </div>
      </Panel>
    </main>
  )
}

export default SettingsPage
