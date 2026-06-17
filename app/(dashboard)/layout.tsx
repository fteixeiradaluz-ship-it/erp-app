import DashboardContainer from '@/components/DashboardContainer'
import { getSession } from '@/lib/session'
import { getSettings } from '@/app/actions/settingsActions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const role = session?.role || 'SELLER'
  const permissions = session?.permissions || ''
  
  const res = await getSettings()
  const logo = res.success ? res.settings.companyLogo : null
  const companyName = res.success && res.settings.companyName ? res.settings.companyName : 'DERMAE INSTITUTO DE ESTÉTICA INTEGRATIVA'

  return (
    <DashboardContainer role={role} permissions={permissions} logo={logo} companyName={companyName}>
      {children}
    </DashboardContainer>
  )
}
