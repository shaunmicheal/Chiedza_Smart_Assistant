import { roleNavigation } from '../data/navigation'
import RoleLayout from '../components/layout/RoleLayout'

function AdminLayout() {
  return <RoleLayout config={roleNavigation.admin} />
}

export default AdminLayout
