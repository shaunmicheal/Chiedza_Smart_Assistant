import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="content">
      <section className="panel not-found-panel">
        <p className="eyebrow">Page not found</p>
        <h1>This page is not available.</h1>
        <Link className="primary-button" to="/admin/overview">Return to overview</Link>
      </section>
    </main>
  )
}

export default NotFoundPage
