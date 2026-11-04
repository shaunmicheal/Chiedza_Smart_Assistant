import { roleNavigation } from '../data/navigation'
import RoleLayout from '../components/layout/RoleLayout'

function TeacherLayout() {
  return <RoleLayout config={roleNavigation.teacher} />
}

export default TeacherLayout
