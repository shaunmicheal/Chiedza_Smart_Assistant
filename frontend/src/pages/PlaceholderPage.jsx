import { FileText } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'

function PlaceholderPage({ page }) {
  return (
    <main className="content">
      <PageHeading
        eyebrow="Page foundation"
        title={page.title}
        description={page.description}
      />
      <section className="panel placeholder-panel" aria-label={`${page.title} page status`}>
        <div className="placeholder-icon">
          <FileText size={22} aria-hidden="true" />
        </div>
        <div>
          <h3>{page.title} workspace</h3>
          <p>
            This page is a frontend route foundation. Its workflow and school data will be added
            when the corresponding feature and backend integration are ready.
          </p>
        </div>
      </section>
    </main>
  )
}

export default PlaceholderPage
