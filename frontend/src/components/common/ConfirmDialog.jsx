import { useEffect, useRef } from 'react'

function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel, busy = false }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll('button:not(:disabled)')
    const firstButton = focusable?.[0]
    const lastButton = focusable?.[focusable.length - 1]
    firstButton?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onCancel()
      if (event.key === 'Tab' && focusable?.length) {
        if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault()
          lastButton?.focus()
        } else if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault()
          firstButton?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [busy, onCancel])

  return (
    <div className="dialog-backdrop">
      <section
        className="confirm-dialog"
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmDialog
