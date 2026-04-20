import React from 'react'
import Sidebar from '@/components/Sidebar'
import styles from './dashboard.module.css'

import { getSession } from '@/lib/auth'
import { getSettings } from '@/app/actions/settingsActions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const role = session?.role || 'SELLER'
  
  const res = await getSettings()
  const logo = res.success ? res.settings.companyLogo : null

  return (
    <div className={styles.layout}>
      <Sidebar role={role} logo={logo} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
