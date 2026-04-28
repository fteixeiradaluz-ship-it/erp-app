"use client"

import React, { useState, useEffect } from 'react'
import styles from './contas.module.css'
import { getPendingPayables, createPayableInstallments, payTransaction } from '@/app/actions/financialActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

export default function ContasAPagarPage() {
  const [data, setData] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming' | 'future'>('upcoming')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State
  const [form, setForm] = useState({
    description: '',
    amount: '',
    bankId: '',
    installments: '1',
    firstDueDate: ''
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
      description: form.description,
      amount: parseFloat(form.amount),
      bankId: form.bankId,
      installments: parseInt(form.installments, 10),
      firstDueDate: new Date(form.firstDueDate)
    })

    if (res.success) {
      setIsModalOpen(false)
      load()
      setForm({ description: '', amount: '', bankId: banks[0]?.id || '', installments: '1', firstDueDate: '' })
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const sevenDaysFromNow = new Date(today)
  sevenDaysFromNow.setDate(today.getDate() + 7)
  sevenDaysFromNow.setHours(23, 59, 59, 999)

  const filteredData = data.filter((t: any) => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    
    if (activeTab === 'overdue') {
      return d < today
    } else if (activeTab === 'upcoming') {
      return d >= today && d <= sevenDaysFromNow
    } else {
      return d > sevenDaysFromNow
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
        <Button onClick={() => setIsModalOpen(true)}>+ Novo Lançamento</Button>
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
      </div>

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
                      <Button variant="secondary" onClick={() => handlePay(t.id)}>✅ Pagar</Button>
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
                <h2>Lançar Contas a Pagar</h2>
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
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Parcelado em</label>
                       <select 
                         style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)' }}
                         value={form.installments}
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
    </div>
  )
}
