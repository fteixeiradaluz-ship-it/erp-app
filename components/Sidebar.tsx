'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'
import { logoutAction } from '@/app/actions/authActions'

interface NavItem {
  label: string
  path: string
  icon: string
  allowedRoles: string[]
}

interface NavGroup {
  groupLabel: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    groupLabel: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: '📊', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
      { label: 'Agenda', path: '/agenda', icon: '🗓️', allowedRoles: ['ADMIN', 'SECRETARY'] },
      { label: 'Clientes & Pacientes', path: '/clientes', icon: '💆‍♀️', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
    ]
  },
  {
    groupLabel: 'Comercial',
    items: [
      { label: 'Vendas (PDV)', path: '/pos', icon: '✨', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
      { label: 'Orçamentos', path: '/orcamentos', icon: '📋', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
      { label: 'Relatórios', path: '/relatorios', icon: '📈', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
      { label: 'Envios', path: '/envios', icon: '📦', allowedRoles: ['ADMIN', 'SELLER'] },
    ]
  },
  {
    groupLabel: 'Operacional',
    items: [
      { label: 'Estoque & Produtos', path: '/estoque', icon: '🧴', allowedRoles: ['ADMIN'] },
      { label: 'Precificação', path: '/precificacao', icon: '🏷️', allowedRoles: ['ADMIN'] },
      { label: 'Fornecedores', path: '/fornecedores', icon: '🤝', allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupLabel: 'Financeiro',
    items: [
      { label: 'Fluxo de Caixa', path: '/financeiro', icon: '💰', allowedRoles: ['ADMIN'] },
      { label: 'Contas a Pagar', path: '/contas-pagar', icon: '💸', allowedRoles: ['ADMIN'] },
      { label: 'A Receber', path: '/financeiro/contas-receber', icon: '📥', allowedRoles: ['ADMIN'] },
    ]
  },
  {
    groupLabel: 'Administração',
    items: [
      { label: 'Usuários & Equipe', path: '/admin/usuarios', icon: '🛡️', allowedRoles: ['ADMIN'] },
      { label: 'Logs do Sistema', path: '/admin/logs', icon: '📜', allowedRoles: ['ADMIN'] },
      { label: 'Configurações', path: '/configuracoes', icon: '⚙️', allowedRoles: ['ADMIN'] },
    ]
  },
]

export default function Sidebar({ role, logo, companyName, isOpen, onClose }: {
  role: string
  logo?: string | null
  companyName: string
  isOpen?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await logoutAction()
    window.location.href = '/login'
  }

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose}></div>}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>

        {/* Header / Logo */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logoWrapper}>
            {logo ? (
              <img src={logo} alt="Logo" className={styles.logoImg} />
            ) : (
              <span className={styles.companyNameText}>{companyName}</span>
            )}
          </div>
          <span className={styles.sidebarTagline}>Instituto de Estética</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar menu">✕</button>
        </div>

        {/* Navigation grouped by section */}
        <nav className={styles.nav}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => item.allowedRoles.includes(role))
            if (visibleItems.length === 0) return null

            return (
              <div key={group.groupLabel}>
                <div className={styles.navSection}>
                  <span className={styles.navSectionLabel}>{group.groupLabel}</span>
                </div>
                {visibleItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`${styles.navItem} ${pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path)) ? styles.active : ''}`}
                    onClick={onClose}
                  >
                    <span className={styles.icon}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Footer Logout */}
        <div className={styles.footer}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            🚪 Sair do Sistema
          </button>
        </div>

      </aside>
    </>
  )
}
