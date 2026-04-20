'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'
import { logoutAction } from '@/app/actions/authActions'

export default function Sidebar({ role, logo }: { role: string, logo?: string | null }) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await logoutAction()
    window.location.href = '/login'
  }

  const allItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
    { label: 'Vendas (PDV)', path: '/pos', icon: '🛒', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
    { label: 'Relatórios', path: '/relatorios', icon: '📈', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
    { label: 'Consultas', path: '/consultas', icon: '🩺', allowedRoles: ['ADMIN', 'SECRETARY'] },
    { label: 'Clientes', path: '/clientes', icon: '👥', allowedRoles: ['ADMIN', 'SELLER', 'SECRETARY'] },
    { label: 'Fornecedores', path: '/fornecedores', icon: '🏭', allowedRoles: ['ADMIN'] },
    { label: 'Estoque', path: '/estoque', icon: '📦', allowedRoles: ['ADMIN'] },
    { label: 'Precificação', path: '/precificacao', icon: '🧮', allowedRoles: ['ADMIN'] },
    { label: 'Financeiro', path: '/financeiro', icon: '💰', allowedRoles: ['ADMIN'] },
    { label: 'Contas a Pagar', path: '/contas-pagar', icon: '💸', allowedRoles: ['ADMIN'] },
    { label: 'Usuários', path: '/admin/usuarios', icon: '🛡️', allowedRoles: ['ADMIN'] },
    { label: 'Configurações', path: '/configuracoes', icon: '⚙️', allowedRoles: ['ADMIN'] },
  ]

  const navItems = allItems.filter(item => item.allowedRoles.includes(role))

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        {logo ? (
          <img src={logo} alt="Logo" className={styles.logoImg} style={{ maxHeight: '40px', maxWidth: '100%', objectFit: 'contain' }} />
        ) : (
          <>
            <span className={styles.erpText}>ERP</span> <span className={styles.premiumText}>PREMIUM</span>
          </>
        )}
      </div>
      
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`${styles.navItem} ${pathname.startsWith(item.path) ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          🚪 Sair
        </button>
      </div>
    </aside>
  )
}
