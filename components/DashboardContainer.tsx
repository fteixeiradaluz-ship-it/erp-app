'use client'

import React, { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import styles from '@/app/(dashboard)/dashboard.module.css'

export default function DashboardContainer({ 
  children, 
  role, 
  logo,
  companyName
}: { 
  children: React.ReactNode, 
  role: string, 
  logo?: string | null,
  companyName: string
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className={styles.layout}>
      {/* Mobile Navbar */}
      <header className={styles.mobileNavbar}>
        <button 
          className={styles.menuBtn} 
          onClick={() => setIsSidebarOpen(true)}
        >
          ☰
        </button>
        <div className={styles.mobileLogo}>
          {logo ? (
            <img src={logo} alt="Logo" style={{ maxHeight: '30px' }} />
          ) : (
            <span>{companyName}</span>
          )}
        </div>
        <div style={{ width: '40px' }}></div> {/* Spacer */}
      </header>

      <Sidebar 
        role={role} 
        logo={logo} 
        companyName={companyName}
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <main className={`${styles.mainContent} ${isSidebarOpen ? styles.shifted : ''}`}>
        {children}
      </main>
    </div>
  )
}
