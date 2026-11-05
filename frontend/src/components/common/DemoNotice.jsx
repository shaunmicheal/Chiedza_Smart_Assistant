import { Info } from 'lucide-react'

function DemoNotice({ children }) {
  return (
    <p className="demo-notice" role="note">
      <Info size={16} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export default DemoNotice
