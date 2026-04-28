import DashboardContainer from '@/components/DashboardContainer'
import { getSession } from '@/lib/session'
import { getSettings } from '@/app/actions/settingsActions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const role = session?.role || 'SELLER'
  
  const res = await getSettings()
  const logo = res.success ? res.settings.companyLogo : null
  const companyName = res.success ? res.settings.companyName : 'ERP Premium'

  return (
    <DashboardContainer role={role} logo={logo} companyName={companyName}>
      {children}
    </DashboardContainer>
  )
}
