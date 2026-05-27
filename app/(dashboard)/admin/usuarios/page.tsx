'use client'

import React, { useState, useEffect } from 'react'
import styles from './usuarios.module.css'
import { getUsers, upsertUser, deleteUser } from '@/app/actions/userActions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const DEFAULT_PERMISSIONS: Record<string, string> = {
    ADMIN: 'dashboard,pos,agenda,envios,relatorios,clientes,fornecedores,estoque,precificacao,financeiro,contas-pagar,logs,usuarios,configuracoes',
    SECRETARY: 'dashboard,pos,agenda,relatorios,clientes',
    SELLER: 'dashboard,pos,envios,relatorios,clientes'
  }

  const modulesList = [
    { token: 'dashboard', label: '📊 Dashboard' },
    { token: 'pos', label: '🛒 Vendas (PDV)' },
    { token: 'agenda', label: '📅 Agenda' },
    { token: 'envios', label: '📦 Envios e Logística' },
    { token: 'relatorios', label: '📈 Relatórios' },
    { token: 'clientes', label: '👥 Clientes e Prontuários' },
    { token: 'fornecedores', label: '🏭 Fornecedores' },
    { token: 'estoque', label: '📦 Estoque' },
    { token: 'precificacao', label: '🧮 Precificação' },
    { token: 'financeiro', label: '💰 Financeiro (Caixa)' },
    { token: 'contas-pagar', label: '💸 Contas a Pagar' },
    { token: 'logs', label: '📜 Logs do Sistema' },
    { token: 'usuarios', label: '🛡️ Gestão de Equipe (RH)' },
    { token: 'configuracoes', label: '⚙️ Configurações' },
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
    const res = await getUsers()
    if (res.success) {
      setUsers(res.users)
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
        admissionDate: '',
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
      commissionPercent: formData.commissionPercent ? parseFloat(formData.commissionPercent.toString()) : null,
      salary: formData.salary ? parseFloat(formData.salary.toString()) : null,
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
    const currentList = formData.permissions ? formData.permissions.split(',') : []
    let newList
    if (currentList.includes(token)) {
      newList = currentList.filter(t => t !== token)
    } else {
      newList = [...currentList, token]
    }
    setFormData({ ...formData, permissions: newList.join(',') })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      const res = await deleteUser(id)
      if (res.success) load()
      else alert(res.error)
    }
  }

  if (loading && users.length === 0) return <div style={{ padding: '2rem' }}>Carregando usuários...</div>

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>👥 Gestão de Equipe (RH)</h1>
        <Button onClick={() => handleOpenModal()}>+ Novo Funcionário</Button>
      </header>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Funcante / Cargo</th>
              <th>Contato</th>
              <th>CPF</th>
              <th>Perfil</th>
              <th>Salário Base</th>
              <th>Admissão</th>
              <th style={{ textAlign: 'right' }}>Gerenciamento</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>{u.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{u.position || '---'}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                    <span>{u.email}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{u.phone || '---'}</span>
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem', color: '#666' }}>{u.cpf || '---'}</td>
                <td>
                  <span className={`${styles.roleBadge} ${u.role === 'ADMIN' ? styles.roleAdmin : (u.role === 'SECRETARY' ? styles.roleSecretary : styles.roleSeller)}`}>
                    {u.role === 'ADMIN' ? '🛡️ ADMIN' : (u.role === 'SECRETARY' ? '📋 SECRETARIA' : '👤 VENDEDOR')}
                  </span>
                </td>
                <td style={{ fontWeight: '600' }}>{u.salary ? `R$ ${u.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}</td>
                <td style={{ fontSize: '0.85rem' }}>{u.admissionDate ? new Date(u.admissionDate).toLocaleDateString() : '---'}</td>
                <td className={styles.actions}>
                  <Button variant="secondary" onClick={() => handleOpenModal(u)}>✏️ Editar</Button>
                  <Button variant="danger" onClick={() => handleDelete(u.id)}>🗑️</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className={styles.formGrid}>
                    <Input 
                      label="Nome Completo" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                    <Input 
                      label="Cargo / Função" 
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                    />
                    <Input 
                      label="E-mail" 
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <Input 
                      label="Telefone" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                    <Input 
                      label="CPF" 
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
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
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    />
                    <Input 
                      label="Comissão (%)"
                      type="number"
                      step="0.1"
                      placeholder="Padrão"
                      value={formData.commissionPercent}
                      onChange={(e) => setFormData({...formData, commissionPercent: e.target.value})}
                    />
                  </div>

                  <div className={styles.formGrid}>
                    <Input 
                      label={editingUser ? "Nova Senha (opcional)" : "Senha de Acesso"}
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Perfil de Acesso</label>
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
                        <option value="SELLER">Vendedor (PDV e Clientes)</option>
                        <option value="SECRETARY">Secretária (Agenda, PDV e Clientes)</option>
                        <option value="ADMIN">Administrador (Gerencial Total)</option>
                      </select>
                      <div className={styles.roleDescription}>
                        {formData.role === 'ADMIN' && (
                          <p>✅ Acesso Total: Financeiro, Estoque, Logs, Usuários, Configurações e Relatórios.</p>
                        )}
                        {formData.role === 'SECRETARY' && (
                          <p>✅ Acesso: Agenda, PDV, Clientes e Relatórios de Consultas.</p>
                        )}
                        {formData.role === 'SELLER' && (
                          <p>✅ Acesso: PDV, Clientes, Envios e Relatórios de Vendas.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid de Permissões Personalizadas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--gold-primary)' }}>
                      🔑 Permissões de Acesso Personalizadas
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Marque ou desmarque os módulos que este usuário poderá visualizar e gerenciar. Ao mudar o perfil acima, as permissões serão redefinidas para o padrão do perfil, mas você pode personalizá-las livremente.
                    </p>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                      gap: '0.6rem', 
                      padding: '1rem', 
                      background: 'rgba(212,175,55,0.03)', 
                      border: '1px solid var(--border-gold)', 
                      borderRadius: '8px',
                      maxHeight: '260px',
                      overflowY: 'auto'
                    }}>
                      {modulesList.map(mod => {
                        const isChecked = formData.permissions.split(',').includes(mod.token)
                        return (
                          <label key={mod.token} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.6rem', 
                            fontSize: '0.85rem', 
                            cursor: 'pointer', 
                            padding: '0.4rem 0.6rem', 
                            borderRadius: '6px', 
                            background: isChecked ? 'rgba(212,175,55,0.06)' : 'transparent',
                            border: `1px solid ${isChecked ? 'rgba(212,175,55,0.15)' : 'transparent'}`,
                            transition: 'all 0.15s' 
                          }}>
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
                            <span style={{ color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isChecked ? '600' : 'normal' }}>
                              {mod.label}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar Usuário</Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
