import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { demoClasses, demoLearners, demoNotice, demoTeachers } from '../../data/mock/operations'
import DemoNotice from '../../components/common/DemoNotice'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import PageHeading from '../../components/common/PageHeading'
import Panel from '../../components/common/Panel'
import StatusBadge from '../../components/common/StatusBadge'

const directoryConfig = {
  teachers: {
    title: 'Teachers',
    description: 'Review staff profiles and assigned classes in this school demonstration.',
    columns: ['Teacher', 'Email', 'Assigned classes', 'Status'],
    rows: demoTeachers,
    searchable: (item) => `${item.name} ${item.email} ${item.classes} ${item.status}`,
  },
  classes: {
    title: 'Assigned classes',
    description: 'Review classes available in this demonstration workspace.',
    columns: ['Class', 'Assigned teacher', 'Learners', 'Room'],
    rows: demoClasses,
    searchable: (item) => `${item.name} ${item.teacher} ${item.room}`,
  },
  learners: {
    title: 'Learners',
    description: 'Find learners and class summaries in the demonstration roster.',
    columns: ['Learner', 'Class', 'Guardian', 'Attendance summary'],
    rows: demoLearners,
    searchable: (item) => `${item.name} ${item.className} ${item.guardian}`,
  },
}

function DirectoryPage({ kind, role }) {
  const config = directoryConfig[kind]
  const isTeacher = role === 'teacher'
  const title = kind === 'classes' && !isTeacher ? 'Classes' : config.title
  const [search, setSearch] = useState('')
  const rows = useMemo(() => config.rows
    .filter((item) => !isTeacher || (
      kind === 'classes'
        ? ['Grade 4A', 'Grade 5B'].includes(item.name)
        : kind !== 'learners' || ['Grade 4A', 'Grade 5B'].includes(item.className)
    ))
    .filter((item) => config.searchable(item).toLowerCase().includes(search.trim().toLowerCase())),
  [config, isTeacher, kind, search])

  function cells(item) {
    if (kind === 'teachers') {
      return [
        <strong key="name">{item.name}</strong>,
        <span key="email">{item.email}</span>,
        <span key="classes">{item.classes}</span>,
        <StatusBadge key="status" tone="status-positive">{item.status}</StatusBadge>,
      ]
    }
    if (kind === 'classes') {
      return [
        <strong key="name">{item.name}</strong>,
        <span key="teacher">{item.teacher}</span>,
        <span key="learners">{item.learners}</span>,
        <span key="room">{item.room}</span>,
      ]
    }
    return [
      <strong key="name">{item.name}</strong>,
      <span key="class">{item.className}</span>,
      <span key="guardian">{item.guardian}</span>,
      <span key="attendance">{item.attendance}</span>,
    ]
  }

  return (
    <main className="content">
      <PageHeading
        eyebrow={isTeacher ? 'Assigned classes only' : 'School directory'}
        title={title}
        description={isTeacher ? `Only the demonstration learners and classes assigned to this teacher are shown. ${config.description}` : config.description}
      />
      <DemoNotice>{demoNotice} Directory entries are fictional and are not live staff or learner records.</DemoNotice>
      <Panel eyebrow={`${rows.length} demonstration records`} title={`${title} directory`}>
        <FormField id={`${kind}-search`} label={`Search ${config.title.toLowerCase()}`}>
          <div className="input-with-icon">
            <Search size={16} aria-hidden="true" />
            <input id={`${kind}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type to search" />
          </div>
        </FormField>
        {rows.length === 0 ? (
          <EmptyState title="No matching records" description="Try a different search term." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>{config.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id ?? item.email ?? item.name}>
                    {cells(item).map((cell, index) => <td key={config.columns[index]}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  )
}

export default DirectoryPage
