import { Languages } from 'lucide-react'

function MessagePreview({ english, shona }) {
  return (
    <div className="message-preview">
      <div className="message-preview-language">
        <Languages size={16} aria-hidden="true" />
        <strong>English</strong>
      </div>
      <p>{english}</p>
      <div className="message-preview-language">
        <strong>Shona</strong>
      </div>
      <p lang="sn">{shona}</p>
    </div>
  )
}

export default MessagePreview
