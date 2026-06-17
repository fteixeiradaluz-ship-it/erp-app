'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'
import { logoutAction } from '@/app/actions/authActions'

export default function Sidebar({ role, permissions, logo, companyName, isOpen, onClose }: { role: string, permissions: string, logo?: string | null, companyName: string, isOpen?: boolean, onClose?: () => void }) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await logoutAction()
    window.location.href = '/login'
  }

  const allItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊', token: 'dashboard' },
    { label: 'Vendas (PDV)', path: '/pos', icon: '🛒', token: 'pos' },
    { label: 'Agenda', path: '/agenda', icon: '📅', token: 'agenda' },
    { label: 'Envios', path: '/envios', icon: '📦', token: 'envios' },
    { label: 'Relatórios', path: '/relatorios', icon: '📈', token: 'relatorios' },
    { label: 'Comissões', path: '/comissoes', icon: '💼', token: 'comissoes' },
    { label: 'Clientes', path: '/clientes', icon: '👥', token: 'clientes' },
    { label: 'Fornecedores', path: '/fornecedores', icon: '🏭', token: 'fornecedores' },
    { label: 'Estoque', path: '/estoque', icon: '📦', token: 'estoque' },
    { label: 'Precificação', path: '/precificacao', icon: '🧮', token: 'precificacao' },
    { label: 'Financeiro', path: '/financeiro', icon: '💰', token: 'financeiro' },
    { label: 'Contas a Pagar', path: '/contas-pagar', icon: '💸', token: 'contas-pagar' },
    { label: 'Logs do Sistema', path: '/admin/logs', icon: '📜', token: 'logs' },
    { label: 'Usuários', path: '/admin/usuarios', icon: '🛡️', token: 'usuarios' },
    { label: 'Configurações', path: '/configuracoes', icon: '⚙️', token: 'configuracoes' },
  ]

  let activePermissions = permissions || ''
  if (!activePermissions) {
    if (role === 'ADMIN') {
      activePermissions = 'dashboard,pos,agenda,envios,relatorios,comissoes,clientes,fornecedores,estoque,precificacao,financeiro,contas-pagar,logs,usuarios,configuracoes'
    } else if (role === 'SECRETARY') {
      activePermissions = 'dashboard,pos,agenda,relatorios,comissoes,clientes'
    } else {
      activePermissions = 'dashboard,pos,envios,relatorios,comissoes,clientes'
    }
  }

  const allowedTokens = activePermissions.split(',')
  const navItems = role === 'ADMIN' ? allItems : allItems.filter(item => allowedTokens.includes(item.token))

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose}></div>}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoWrapper}>
            {logo ? (
              <img src={logo} alt="Logo" className={styles.logoImg} />
            ) : (
              <span className={styles.companyNameText}>{companyName}</span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${styles.navItem} ${pathname.startsWith(item.path) ? styles.active : ''}`}
              onClick={onClose}
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
    </>
  )
}
