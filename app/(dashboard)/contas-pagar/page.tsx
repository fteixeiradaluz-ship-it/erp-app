"use client"

import React, { useState, useEffect } from 'react'
import styles from './contas.module.css'
import { getPendingPayables, createPayableInstallments, payTransaction, deleteTransaction } from '@/app/actions/financialActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

export default function ContasAPagarPage() {
  const [data, setData] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming' | 'future' | 'periodo'>('upcoming')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayable, setEditingPayable] = useState<any>(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [justification, setJustification] = useState('')

  // Filtro de período por padrão com os limites do mês corrente
  const getFirstDayOfMonth = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
  const getLastDayOfMonth = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  }

  const [filterStartDate, setFilterStartDate] = useState(getFirstDayOfMonth())
  const [filterEndDate, setFilterEndDate] = useState(getLastDayOfMonth())

  // Form State
  const [form, setForm] = useState({
    description: '',
    amount: '',
    bankId: '',
    installments: '1',
    firstDueDate: '',
    isRecurring: false
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const res = await getPendingPayables()
    if (res.success) {
      setData(res.transactions)
      setBanks(res.banks)
      if (res.banks.length > 0) {
        setForm(prev => ({ ...prev, bankId: res.banks[0].id }))
      }
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await createPayableInstallments({
      id: editingPayable?.id,
      description: form.description,
      amount: parseFloat(form.amount),
      bankId: form.bankId,
      installments: parseInt(form.installments, 10),
      firstDueDate: new Date(form.firstDueDate),
      isRecurring: form.isRecurring
    })

    if (res.success) {
      setIsModalOpen(false)
      setEditingPayable(null)
      load()
      setForm({ description: '', amount: '', bankId: banks[0]?.id || '', installments: '1', firstDueDate: '', isRecurring: false })
    } else {
      alert(res.error)
    }
  }

  const handlePay = async (id: string) => {
    if (confirm("Confirmar o pagamento e descontar do banco selecionado?")) {
      const res = await payTransaction(id)
      if (res.success) {
         load()
      } else {
         alert(res.error)
      }
    }
  }

  const handleDeleteClick = (t: any) => {
    setEditingPayable(t)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!justification) return alert('Por favor, insira uma justificativa.')
    const res = await deleteTransaction(editingPayable.id, justification)
    if (res.success) {
      setIsDeleteModalOpen(false)
      setJustification('')
      setEditingPayable(null)
      load()
    } else {
      alert(res.error)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const sevenDaysFromNow = new Date(today)
  sevenDaysFromNow.setDate(today.getDate() + 7)
  sevenDaysFromNow.setHours(23, 59, 59, 999)

  const filteredData = data.filter((t: any) => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    
    // Zera horas para comparação precisa
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const startRange = filterStartDate ? new Date(filterStartDate) : null
    const endRange = filterEndDate ? new Date(filterEndDate) : null
    if (startRange) startRange.setHours(0, 0, 0, 0)
    if (endRange) endRange.setHours(23, 59, 59, 999)

    if (activeTab === 'overdue') {
      return dDate < today
    } else if (activeTab === 'upcoming') {
      return dDate >= today && dDate <= sevenDaysFromNow
    } else if (activeTab === 'future') {
      return dDate > sevenDaysFromNow
    } else {
      // Período / Contas Mensais
      return (!startRange || dDate >= startRange) && (!endRange || dDate <= endRange)
    }
  })

  const overdueCount = data.filter(t => new Date(t.dueDate) < today).length
  const upcomingCount = data.filter(t => {
     const d = new Date(t.dueDate)
     return d >= today && d <= sevenDaysFromNow
  }).length

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando Contas...</div>

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>💸 Contas a Pagar</h1>
        <Button onClick={() => {
          setEditingPayable(null)
          setForm({ description: '', amount: '', bankId: banks[0]?.id || '', installments: '1', firstDueDate: '', isRecurring: false })
          setIsModalOpen(true)
        }}>+ Novo Lançamento</Button>
      </header>

      <div className={styles.tabs}>
        <div 
          className={`${styles.tab} ${activeTab === 'overdue' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('overdue')}
        >
          Atrasadas {overdueCount > 0 && <span className={styles.statusOverdue}>({overdueCount})</span>}
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'upcoming' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('upcoming')}
        >
          Próximas (7 dias) {upcomingCount > 0 && <span className={styles.statusWarning}>({upcomingCount})</span>}
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'future' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('future')}
        >
          Futuras
        </div>
        <div 
          className={`${styles.tab} ${activeTab === 'periodo' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('periodo')}
        >
          📅 Contas Mensais (Período)
        </div>
      </div>

      {activeTab === 'periodo' && (
        <div className={styles.dateFilterWrapper}>
          <div className={styles.dateInputGroup}>
            <label>De:</label>
            <input 
              type="date" 
              className={styles.dateField}
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label>Até:</label>
            <input 
              type="date" 
              className={styles.dateField}
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={() => {
            setFilterStartDate(getFirstDayOfMonth())
            setFilterEndDate(getLastDayOfMonth())
          }}>Este Mês</Button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Valor da Parcela</th>
              <th>Banco / Origem</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: "center"}}>Nenhuma conta nesta categoria.</td></tr>
            ) : (
              filteredData.map((t: any) => {
                const isOverdue = new Date(t.dueDate) < today
                return (
                  <tr key={t.id}>
                    <td className={isOverdue ? styles.statusOverdue : ''}>
                      {new Date(t.dueDate).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.description}</td>
                    <td style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>{formatCurrency(t.amount)}</td>
                    <td>{t.bank.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="secondary" onClick={() => {
                          setEditingPayable(t)
                          setForm({
                            description: t.description,
                            amount: t.amount.toString(),
                            bankId: t.bankId,
                            installments: '1',
                            firstDueDate: new Date(t.dueDate).toISOString().split('T')[0],
                            isRecurring: false
                          })
                          setIsModalOpen(true)
                        }}>✏️</Button>
                        <Button variant="secondary" onClick={() => handlePay(t.id)}>✅ Pagar</Button>
                        <Button variant="secondary" onClick={() => handleDeleteClick(t)} style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} title="Excluir">🗑️ Excluir</Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>{editingPayable ? 'Editar Conta' : 'Lançar Contas a Pagar'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input 
                    label="Descrição (Ex: Luz, Internet)" 
                    required 
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                  />
                  <Input 
                    label="Valor Total (R$)" 
                    type="number" 
                    step="0.01" 
                    required 
                    value={form.amount}
                    onChange={(e) => setForm({...form, amount: e.target.value})}
                  />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.2rem 0' }}>
                    <input 
                      type="checkbox"
                      id="isRecurring"
                      checked={form.isRecurring || false}
                      disabled={!!editingPayable}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          isRecurring: e.target.checked,
                          installments: e.target.checked ? '1' : form.installments
                        })
                      }}
                      style={{ accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
                    />
                    <label htmlFor="isRecurring" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      🔁 Despesa Fixa Recorrente (Criar cobrança mensal automática de 2 anos)
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Parcelado em</label>
                       <select 
                         style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)', opacity: form.isRecurring ? 0.5 : 1 }}
                         value={form.installments}
                         disabled={!!editingPayable || form.isRecurring}
                         onChange={(e) => setForm({...form, installments: e.target.value})}
                       >
                         {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i + 1}>{i + 1}x</option>
                         ))}
                       </select>
                     </div>
                     
                     <div style={{ flex: 1 }}>
                        <Input 
                          label="1º Vencimento" 
                          type="date" 
                          required 
                          value={form.firstDueDate}
                          onChange={(e) => setForm({...form, firstDueDate: e.target.value})}
                        />
                     </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pagar com (Banco Previsto)</label>
                    <select 
                       style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)' }}
                      value={form.bankId}
                      onChange={(e) => setForm({...form, bankId: e.target.value})}
                    >
                      {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {isDeleteModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2 style={{ color: '#f44336' }}>Confirmar Exclusão</h2>
                <p style={{ color: 'var(--foreground)' }}>Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.</p>
                <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--gold-primary)', fontWeight: '600' }}>Justificativa da Exclusão</label>
                  <textarea 
                    className={styles.justificationArea}
                    placeholder="Justifique a exclusão desta conta..."
                    required
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setJustification(''); setEditingPayable(null); }}>Cancelar</Button>
                  <Button style={{ backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: '600' }} onClick={handleConfirmDelete}>Confirmar Exclusão</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
