'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'
import { logoutAction } from '@/app/actions/authActions'

type NavItem = {
  label: string;
  path: string;
  icon: string;
  token: string;
}

type NavGroup = {
  title: string;
  items: NavItem[];
}

export default function Sidebar({ 
  role, 
  permissions, 
  logo, 
  companyName, 
  isOpen, 
  onClose 
}: { 
  role: string, 
  permissions: string, 
  logo?: string | null, 
  companyName: string, 
  isOpen?: boolean, 
  onClose?: () => void 
}) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await logoutAction()
    window.location.href = '/login'
  }

  const navGroups: NavGroup[] = [
    {
      title: 'Atendimento & Vendas',
      items: [
        { label: 'Vendas (PDV)', path: '/pos', icon: '🛒', token: 'pos' },
        { label: 'Agenda & Consultas', path: '/agenda', icon: '📅', token: 'agenda' },
        { label: 'Clientes & Prontuários', path: '/clientes', icon: '👥', token: 'clientes' },
        { label: 'Envios & Logística', path: '/envios', icon: '📦', token: 'envios' },
      ]
    },
    {
      title: 'Gestão & Performance',
      items: [
        { label: 'Dashboard Executivo', path: '/dashboard', icon: '📊', token: 'dashboard' },
        { label: 'Relatórios & DRE', path: '/relatorios', icon: '📈', token: 'relatorios' },
        { label: 'Comissões da Equipe', path: '/comissoes', icon: '💼', token: 'comissoes' },
        { label: 'Precificação Inteligente', path: '/precificacao', icon: '🧮', token: 'precificacao' },
      ]
    },
    {
      title: 'Controladoria & Suprimentos',
      items: [
        { label: 'Financeiro & Caixa', path: '/financeiro', icon: '💰', token: 'financeiro' },
        { label: 'Contas a Pagar', path: '/contas-pagar', icon: '💸', token: 'contas-pagar' },
        { label: 'Estoque de Produtos', path: '/estoque', icon: '📦', token: 'estoque' },
        { label: 'Fornecedores', path: '/fornecedores', icon: '🏭', token: 'fornecedores' },
      ]
    },
    {
      title: 'Governança & Sistema',
      items: [
        { label: 'Gestão de Equipe (RH)', path: '/admin/usuarios', icon: '🛡️', token: 'usuarios' },
        { label: 'Logs de Auditoria', path: '/admin/logs', icon: '📜', token: 'logs' },
        { label: 'Configurações Globais', path: '/configuracoes', icon: '⚙️', token: 'configuracoes' },
      ]
    }
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

  const allowedTokens = activePermissions.split(',').filter(Boolean)

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose}></div>}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        
        {/* ── Sidebar Brand Header ────────────────────────────── */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logoWrapper}>
            {logo ? (
              <img src={logo} alt={companyName} className={styles.logoImg} />
            ) : (
              <div className={styles.brandBadge}>
                <span className={styles.brandEmblem}>✨</span>
                <span className={styles.companyNameText}>DERMAE</span>
                <span className={styles.brandSub}>ESTÉTICA INTEGRATIVA</span>
              </div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar menu">✕</button>
        </div>
        
        {/* ── Grouped Navigation ──────────────────────────────── */}
        <nav className={styles.nav}>
          {navGroups.map((group) => {
            const visibleItems = role === 'ADMIN' 
              ? group.items 
              : group.items.filter(item => allowedTokens.includes(item.token))

            if (visibleItems.length === 0) return null

            return (
              <div key={group.title} className={styles.navGroup}>
                <span className={styles.groupTitle}>{group.title}</span>
                <div className={styles.groupItems}>
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
                    return (
                      <Link 
                        key={item.path} 
                        href={item.path}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        onClick={onClose}
                      >
                        <span className={styles.icon}>{item.icon}</span>
                        <span className={styles.label}>{item.label}</span>
                        {isActive && <span className={styles.activeIndicator}></span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* ── Sidebar Footer & User Profile ───────────────────── */}
        <div className={styles.footer}>
          <div className={styles.userProfileCard}>
            <div className={styles.avatarMini}>
              {role === 'ADMIN' ? 'AD' : role === 'SECRETARY' ? 'RC' : 'PR'}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {role === 'ADMIN' ? 'Administrador' : role === 'SECRETARY' ? 'Recepção' : 'Profissional'}
              </span>
              <span className={styles.userRole}>
                {role === 'ADMIN' ? 'Acesso Total' : 'Operador'}
              </span>
            </div>
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            🚪 Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  )
}
