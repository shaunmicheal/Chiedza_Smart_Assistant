import { roleNavigation } from '../data/navigation'
import RoleLayout from '../components/layout/RoleLayout'

function ParentLayout() {
  return <RoleLayout config={roleNavigation.parent} />
}

export default ParentLayout
