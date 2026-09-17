'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import styles from '@/app/(dashboard)/dashboard.module.css'

export default function DashboardContainer({ 
  children, 
  role, 
  permissions, 
  logo, 
  companyName 
}: { 
  children: React.ReactNode, 
  role: string, 
  permissions: string, 
  logo?: string | null, 
  companyName: string 
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [greeting, setGreeting] = useState('Olá')
  const [currentDateStr, setCurrentDateStr] = useState('')

  useEffect(() => {
    const now = new Date()
    const hours = now.getHours()
    if (hours >= 5 && hours < 12) setGreeting('☀️ Bom dia')
    else if (hours >= 12 && hours < 18) setGreeting('🌤️ Boa tarde')
    else setGreeting('🌙 Boa noite')

    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }
    const formatted = now.toLocaleDateString('pt-BR', options)
    // Capitalize first letter
    setCurrentDateStr(formatted.charAt(0).toUpperCase() + formatted.slice(1))
  }, [])

  return (
    <div className={styles.layout}>
      {/* Mobile Navbar */}
      <header className={styles.mobileNavbar}>
        <button 
          className={styles.menuBtn} 
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir Menu"
        >
          ☰
        </button>
        <div className={styles.mobileLogo}>
          {logo ? (
            <img src={logo} alt="Logo" style={{ maxHeight: '28px' }} />
          ) : (
            <span>DERMAE</span>
          )}
        </div>
        <div className={styles.mobileRoleBadge}>
          {role === 'ADMIN' ? '🛡️' : role === 'SECRETARY' ? '📋' : '👤'}
        </div>
      </header>

      {/* Sidebar Navigation */}
      <Sidebar 
        role={role} 
        permissions={permissions} 
        logo={logo} 
        companyName={companyName} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main App Content with Topbar */}
      <div className={`${styles.mainWrapper} ${isSidebarOpen ? styles.shifted : ''}`}>
        
        {/* Desktop Global Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.greetingText}>
              <span>{greeting},</span>
              <strong style={{ color: 'var(--foreground)' }}>
                {role === 'ADMIN' ? 'Gestor(a)' : role === 'SECRETARY' ? 'Recepção' : 'Profissional'}
              </strong>
            </div>
            <span className={styles.topbarDivider}>•</span>
            <span className={styles.dateText}>{currentDateStr}</span>
          </div>

          <div className={styles.topbarRight}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot}></span>
              <span>{companyName || 'DERMAE INSTITUTO'}</span>
            </div>

            <div className={styles.userRoleChip}>
              <span>{role === 'ADMIN' ? '🛡️ Administrador' : role === 'SECRETARY' ? '📋 Recepção / Agenda' : '👤 Profissional / Vendas'}</span>
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  )
}
