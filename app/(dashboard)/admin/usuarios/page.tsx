'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styles from './usuarios.module.css'
import { getUsers, upsertUser, deleteUser } from '@/app/actions/userActions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'SECRETARY' | 'SELLER'>('ALL')

  const DEFAULT_PERMISSIONS: Record<string, string> = {
    ADMIN: 'dashboard,pos,agenda,envios,relatorios,clientes,fornecedores,estoque,precificacao,financeiro,contas-pagar,logs,usuarios,configuracoes',
    SECRETARY: 'dashboard,pos,agenda,relatorios,clientes',
    SELLER: 'dashboard,pos,envios,relatorios,clientes'
  }

  const modulesList = [
    { token: 'dashboard', label: '📊 Dashboard' },
    { token: 'pos', label: '🛒 Vendas (PDV)' },
    { token: 'agenda', label: '📅 Agenda & Consultas' },
    { token: 'envios', label: '📦 Envios e Logística' },
    { token: 'relatorios', label: '📈 Relatórios e DRE' },
    { token: 'clientes', label: '👥 Clientes & Prontuários' },
    { token: 'fornecedores', label: '🏭 Fornecedores' },
    { token: 'estoque', label: '📦 Estoque de Produtos' },
    { token: 'precificacao', label: '🧮 Precificação Inteligente' },
    { token: 'financeiro', label: '💰 Financeiro (Caixa/Bancos)' },
    { token: 'contas-pagar', label: '💸 Contas a Pagar' },
    { token: 'logs', label: '📜 Logs do Sistema' },
    { token: 'usuarios', label: '🛡️ Gestão de Equipe (RH)' },
    { token: 'configuracoes', label: '⚙️ Configurações Globais' },
  ]

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SELLER',
    commissionPercent: '' as string | number,
    cpf: '',
    phone: '',
    salary: '' as string | number,
    admissionDate: '',
    position: '',
    permissions: 'dashboard,pos,envios,relatorios,clientes'
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const res = await getUsers()
    if (res.success) {
      setUsers(res.users || [])
    }
    setLoading(false)
  }

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        commissionPercent: user.commissionPercent ?? '',
        cpf: user.cpf || '',
        phone: user.phone || '',
        salary: user.salary ?? '',
        admissionDate: user.admissionDate ? new Date(user.admissionDate).toISOString().split('T')[0] : '',
        position: user.position || '',
        permissions: user.permissions || DEFAULT_PERMISSIONS[user.role] || ''
      })
    } else {
      setEditingUser(null)
      setFormData({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'SELLER', 
        commissionPercent: '',
        cpf: '',
        phone: '',
        salary: '',
        admissionDate: new Date().toISOString().split('T')[0],
        position: '',
        permissions: DEFAULT_PERMISSIONS.SELLER
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload = {
      ...formData,
      id: editingUser?.id,
      commissionPercent: formData.commissionPercent !== '' ? parseFloat(formData.commissionPercent.toString()) : null,
      salary: formData.salary !== '' ? parseFloat(formData.salary.toString()) : null,
      admissionDate: formData.admissionDate || null,
    }

    const res = await upsertUser(payload)
    if (res.success) {
      setIsModalOpen(false)
      load()
    } else {
      alert(res.error)
    }
  }

  const togglePermission = (token: string) => {
    const currentList = formData.permissions ? formData.permissions.split(',').filter(Boolean) : []
    let newList: string[]
    if (currentList.includes(token)) {
      newList = currentList.filter(t => t !== token)
    } else {
      newList = [...currentList, token]
    }
    setFormData({ ...formData, permissions: newList.join(',') })
  }

  const selectAllPermissions = () => {
    const allTokens = modulesList.map(m => m.token).join(',')
    setFormData({ ...formData, permissions: allTokens })
  }

  const clearAllPermissions = () => {
    setFormData({ ...formData, permissions: '' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o colaborador "${name}"?`)) {
      const res = await deleteUser(id)
      if (res.success) load()
      else alert(res.error)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalSalary = 0
    let totalCommissions = 0
    let commissionCount = 0
    let adminsCount = 0

    users.forEach(u => {
      if (u.role === 'ADMIN') adminsCount++
      if (u.salary) totalSalary += Number(u.salary)
      if (u.commissionPercent) {
        totalCommissions += Number(u.commissionPercent)
        commissionCount++
      }
    })

    const avgCommission = commissionCount > 0 ? totalCommissions / commissionCount : 0

    return {
      totalUsers: users.length,
      adminsCount,
      totalSalary,
      avgCommission
    }
  }, [users])

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase()
        const nameMatch = u.name?.toLowerCase().includes(term)
        const emailMatch = u.email?.toLowerCase().includes(term)
        const posMatch = u.position?.toLowerCase().includes(term)
        const cpfMatch = u.cpf?.toLowerCase().includes(term)
        const phoneMatch = u.phone?.toLowerCase().includes(term)
        return nameMatch || emailMatch || posMatch || cpfMatch || phoneMatch
      }

      return true
    })
  }, [users, roleFilter, searchTerm])

  if (loading && users.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
        <p style={{ fontWeight: 600 }}>Carregando equipe e permissões...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <span>👥 Gestão de Equipe & Permissões (RH)</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Controle de colaboradores, cargos, remunerações, comissões e níveis granulares de acesso.
          </p>
        </div>

        <Button onClick={() => handleOpenModal()}>
          + Novo Funcionário
        </Button>
      </header>

      {/* ── Executive KPI Summary Grid ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Total de Colaboradores</span>
            <span className={styles.kpiIcon}>👥</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valGold}`}>
            {kpis.totalUsers}
          </div>
          <span className={styles.kpiSub}>Membros cadastrados na equipe</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Gestão & Administradores</span>
            <span className={styles.kpiIcon}>🛡️</span>
          </div>
          <div className={styles.kpiValue}>
            {kpis.adminsCount}
          </div>
          <span className={styles.kpiSub}>Com acesso total ao sistema</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Folha Salarial Base</span>
            <span className={styles.kpiIcon}>💼</span>
          </div>
          <div className={styles.kpiValue}>
            {formatCurrency(kpis.totalSalary)}
          </div>
          <span className={styles.kpiSub}>Soma dos salários fixos da equipe</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Comissão Média</span>
            <span className={styles.kpiIcon}>🏷️</span>
          </div>
          <div className={styles.kpiValue}>
            {kpis.avgCommission.toFixed(1)}%
          </div>
          <span className={styles.kpiSub}>Taxa média de repasse sobre vendas</span>
        </div>
      </div>

      {/* ── Control Bar: Search + Role Filter Pills ──────────── */}
      <div className={styles.controlCard}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input 
            type="text"
            placeholder="Buscar por nome, cargo, e-mail ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.roleFilterGroup}>
          <button
            type="button"
            className={`${styles.roleFilterBtn} ${roleFilter === 'ALL' ? styles.roleFilterActive : ''}`}
            onClick={() => setRoleFilter('ALL')}
          >
            Todos ({users.length})
          </button>
          <button
            type="button"
            className={`${styles.roleFilterBtn} ${roleFilter === 'ADMIN' ? styles.roleFilterActive : ''}`}
            onClick={() => setRoleFilter('ADMIN')}
          >
            🛡️ Administradores ({users.filter(u => u.role === 'ADMIN').length})
          </button>
          <button
            type="button"
            className={`${styles.roleFilterBtn} ${roleFilter === 'SECRETARY' ? styles.roleFilterActive : ''}`}
            onClick={() => setRoleFilter('SECRETARY')}
          >
            📋 Secretárias ({users.filter(u => u.role === 'SECRETARY').length})
          </button>
          <button
            type="button"
            className={`${styles.roleFilterBtn} ${roleFilter === 'SELLER' ? styles.roleFilterActive : ''}`}
            onClick={() => setRoleFilter('SELLER')}
          >
            👤 Vendedores ({users.filter(u => u.role === 'SELLER').length})
          </button>
        </div>
      </div>

      {/* ── Table: Equipe & Colaboradores ─────────────────────── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Colaborador / Função</th>
              <th>Contato</th>
              <th>CPF</th>
              <th>Perfil de Acesso</th>
              <th>Salário Base</th>
              <th>Comissão</th>
              <th>Admissão</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>👥</div>
                  <p style={{ fontWeight: 600 }}>Nenhum colaborador encontrado.</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                    Tente ajustar os termos de pesquisa ou o filtro de perfil.
                  </p>
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar}>
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <span className={styles.userName}>{u.name}</span>
                        <span className={styles.userPosition}>{u.position || 'Profissional'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.84rem' }}>
                      <span style={{ color: 'var(--foreground)' }}>{u.email}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{u.phone || '---'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {u.cpf || '---'}
                  </td>
                  <td>
                    <span className={`${styles.roleBadge} ${u.role === 'ADMIN' ? styles.roleAdmin : (u.role === 'SECRETARY' ? styles.roleSecretary : styles.roleSeller)}`}>
                      {u.role === 'ADMIN' ? '🛡️ ADMIN' : (u.role === 'SECRETARY' ? '📋 SECRETÁRIA' : '👤 VENDEDOR')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                    {u.salary ? formatCurrency(u.salary) : '---'}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--gold-hover)' }}>
                    {u.commissionPercent ? `${u.commissionPercent}%` : '---'}
                  </td>
                  <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {u.admissionDate ? new Date(u.admissionDate).toLocaleDateString('pt-BR') : '---'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        type="button"
                        className={styles.actionBtn} 
                        onClick={() => handleOpenModal(u)}
                        title="Editar colaborador e permissões"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        type="button"
                        className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                        onClick={() => handleDelete(u.id, u.name)}
                        title="Excluir colaborador"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Novo / Editar Colaborador ─────────────────── */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>
                {editingUser ? `Editar Colaborador: ${editingUser.name}` : 'Cadastrar Novo Colaborador'}
              </h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.formGrid}>
                  <Input 
                    label="Nome Completo" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Dra. Mariana Silva"
                  />
                  <Input 
                    label="Cargo / Função" 
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    placeholder="Ex: Dermatologista, Biomédica, Recepcionista"
                  />
                  <Input 
                    label="E-mail de Acesso" 
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@dermae.com.br"
                  />
                  <Input 
                    label="Telefone / WhatsApp" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                  <Input 
                    label="CPF" 
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                  />
                  <Input 
                    label="Data de Admissão" 
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                  />
                  <Input 
                    label="Salário Base (R$)" 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  />
                  <Input 
                    label="Comissão de Atendimento (%)"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="Ex: 10"
                    value={formData.commissionPercent}
                    onChange={(e) => setFormData({...formData, commissionPercent: e.target.value})}
                  />
                </div>

                <div className={styles.formGrid}>
                  <Input 
                    label={editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso"}
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                  />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Perfil de Acesso Padrão
                    </label>
                    <select 
                      className={styles.select}
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value
                        setFormData({
                          ...formData,
                          role: newRole,
                          permissions: DEFAULT_PERMISSIONS[newRole] || ''
                        })
                      }}
                    >
                      <option value="SELLER">👤 Vendedor (PDV, Clientes e Envios)</option>
                      <option value="SECRETARY">📋 Secretária (Agenda, PDV e Clientes)</option>
                      <option value="ADMIN">🛡️ Administrador (Acesso Gerencial Total)</option>
                    </select>
                    
                    <div className={styles.roleDescription}>
                      {formData.role === 'ADMIN' && (
                        <span>🛡️ <strong>Admin:</strong> Acesso irrestrito a financeiro, estoque, logs, RH e configurações.</span>
                      )}
                      {formData.role === 'SECRETARY' && (
                        <span>📋 <strong>Secretária:</strong> Foco em recepção, agendamento de consultas e faturamento no caixa.</span>
                      )}
                      {formData.role === 'SELLER' && (
                        <span>👤 <strong>Vendedor:</strong> Foco em vendas de produtos, atendimento a clientes e envios.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permissões Granulares Personalizadas */}
                <div className={styles.permissionsBox}>
                  <div className={styles.permissionsHeader}>
                    <span className={styles.permissionsTitle}>
                      🔑 Matriz de Permissões de Acesso aos Módulos
                    </span>
                    <div className={styles.permissionsActions}>
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className={styles.permToggleBtn}
                      >
                        ✓ Selecionar Todos
                      </button>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        className={styles.permToggleBtn}
                      >
                        ✕ Limpar
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Marque os módulos específicos aos quais este colaborador terá acesso ao fazer login.
                  </p>

                  <div className={styles.permissionsGrid}>
                    {modulesList.map(mod => {
                      const isChecked = formData.permissions.split(',').filter(Boolean).includes(mod.token)
                      return (
                        <label 
                          key={mod.token} 
                          className={`${styles.permissionItem} ${isChecked ? styles.permissionChecked : ''}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => togglePermission(mod.token)}
                            style={{ 
                              accentColor: 'var(--gold-primary)',
                              cursor: 'pointer',
                              width: '15px',
                              height: '15px'
                            }}
                          />
                          <span>{mod.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingUser ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
