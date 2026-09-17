'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styles from './contas.module.css'
import { 
  getPendingPayables, 
  createPayableInstallments, 
  payTransaction, 
  deleteTransaction 
} from '@/app/actions/financialActions'
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
  const [searchTerm, setSearchTerm] = useState('')

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
      setData(res.transactions || [])
      setBanks(res.banks || [])
      if (res.banks?.length > 0) {
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

  const handlePay = async (id: string, description: string) => {
    if (confirm(`Confirmar o pagamento de "${description}" e descontar do banco selecionado?`)) {
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

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  
  const sevenDaysFromNow = useMemo(() => {
    const d = new Date(today)
    d.setDate(today.getDate() + 7)
    d.setHours(23, 59, 59, 999)
    return d
  }, [today])

  // KPI Calculations
  const kpis = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    let overdueTotal = 0
    let overdueCount = 0
    let upcomingTotal = 0
    let upcomingCount = 0
    let monthTotal = 0
    let monthCount = 0
    let grandTotal = 0

    data.forEach((t: any) => {
      const amount = Number(t.amount) || 0
      grandTotal += amount

      if (t.dueDate) {
        const d = new Date(t.dueDate)
        const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

        if (dDate < today) {
          overdueTotal += amount
          overdueCount++
        } else if (dDate >= today && dDate <= sevenDaysFromNow) {
          upcomingTotal += amount
          upcomingCount++
        }

        if (d >= startOfMonth && d <= endOfMonth) {
          monthTotal += amount
          monthCount++
        }
      }
    })

    return {
      overdueTotal,
      overdueCount,
      upcomingTotal,
      upcomingCount,
      monthTotal,
      monthCount,
      grandTotal,
      grandCount: data.length
    }
  }, [data, today, sevenDaysFromNow])

  // Filtered Payables
  const filteredData = useMemo(() => {
    return data.filter((t: any) => {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const startRange = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null
      const endRange = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null

      // Tab match
      let matchesTab = false
      if (activeTab === 'overdue') {
        matchesTab = dDate < today
      } else if (activeTab === 'upcoming') {
        matchesTab = dDate >= today && dDate <= sevenDaysFromNow
      } else if (activeTab === 'future') {
        matchesTab = dDate > sevenDaysFromNow
      } else {
        // Periodo
        matchesTab = (!startRange || d >= startRange) && (!endRange || d <= endRange)
      }

      if (!matchesTab) return false

      // Search match
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase()
        const descMatch = t.description?.toLowerCase().includes(term)
        const bankMatch = t.bank?.name?.toLowerCase().includes(term)
        return descMatch || bankMatch
      }

      return true
    })
  }, [data, activeTab, filterStartDate, filterEndDate, searchTerm, today, sevenDaysFromNow])

  // Helper for Urgency Badge
  const getUrgencyBadge = (dueDateStr: string) => {
    const d = new Date(dueDateStr)
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diffTime = dDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const formattedDate = d.toLocaleDateString('pt-BR')

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays)
      return (
        <span className={styles.badgeOverdue} title={`Venceu em ${formattedDate}`}>
          ⚠️ {formattedDate} ({daysOverdue === 1 ? 'Venceu ontem' : `Venceu há ${daysOverdue} dias`})
        </span>
      )
    } else if (diffDays === 0) {
      return (
        <span className={styles.badgeUpcoming} title="Vence hoje!">
          ⚡ {formattedDate} (VENCE HOJE)
        </span>
      )
    } else if (diffDays === 1) {
      return (
        <span className={styles.badgeUpcoming} title="Vence amanhã">
          ⏳ {formattedDate} (Vence amanhã)
        </span>
      )
    } else if (diffDays <= 7) {
      return (
        <span className={styles.badgeUpcoming} title={`Vence em ${diffDays} dias`}>
          📅 {formattedDate} (Em {diffDays} dias)
        </span>
      )
    } else {
      return (
        <span className={styles.badgeFuture}>
          {formattedDate}
        </span>
      )
    }
  }

  if (loading && data.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💸</div>
        <p style={{ fontWeight: 600 }}>Carregando contas a pagar...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <span>💸 Gestão de Contas a Pagar</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Controle de obrigações financeiras, despesas fixas recorrentes, fornecedores e previsões de desembolso.
          </p>
        </div>

        <Button 
          onClick={() => {
            setEditingPayable(null)
            setForm({ 
              description: '', 
              amount: '', 
              bankId: banks[0]?.id || '', 
              installments: '1', 
              firstDueDate: today.toISOString().split('T')[0], 
              isRecurring: false 
            })
            setIsModalOpen(true)
          }}
        >
          + Novo Lançamento
        </Button>
      </header>

      {/* ── Executive KPI Summary Grid ────────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${kpis.overdueCount > 0 ? styles.kpiCardOverdue : ''}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Total em Atraso</span>
            <span className={styles.kpiIcon}>🚨</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valOverdue}`}>
            {formatCurrency(kpis.overdueTotal)}
          </div>
          <span className={styles.kpiSub}>
            {kpis.overdueCount === 0 ? 'Nenhuma conta em atraso' : `${kpis.overdueCount} ${kpis.overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}`}
          </span>
        </div>

        <div className={`${styles.kpiCard} ${kpis.upcomingCount > 0 ? styles.kpiCardUpcoming : ''}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Próximos 7 Dias</span>
            <span className={styles.kpiIcon}>⏳</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valUpcoming}`}>
            {formatCurrency(kpis.upcomingTotal)}
          </div>
          <span className={styles.kpiSub}>
            {kpis.upcomingCount} {kpis.upcomingCount === 1 ? 'compromisso a vencer' : 'compromissos a vencer'}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Compromissos do Mês</span>
            <span className={styles.kpiIcon}>📅</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valMonth}`}>
            {formatCurrency(kpis.monthTotal)}
          </div>
          <span className={styles.kpiSub}>
            {kpis.monthCount} {kpis.monthCount === 1 ? 'conta provisionada' : 'contas provisionadas'}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Total Geral Pendente</span>
            <span className={styles.kpiIcon}>💰</span>
          </div>
          <div className={styles.kpiValue}>
            {formatCurrency(kpis.grandTotal)}
          </div>
          <span className={styles.kpiSub}>
            {kpis.grandCount} parcelas/lançamentos cadastrados
          </span>
        </div>
      </div>

      {/* ── Controls: Tabs + Search + Period Filters ──────────── */}
      <div className={styles.controlCard}>
        <div className={styles.tabsRow}>
          
          {/* Abas de Navegação */}
          <div className={styles.tabs}>
            <button 
              type="button"
              className={`${styles.tab} ${activeTab === 'overdue' ? styles.activeTab : ''}`} 
              onClick={() => setActiveTab('overdue')}
            >
              <span>Atrasadas</span>
              {kpis.overdueCount > 0 && <span className={styles.tabBadgeOverdue}>{kpis.overdueCount}</span>}
            </button>
            <button 
              type="button"
              className={`${styles.tab} ${activeTab === 'upcoming' ? styles.activeTab : ''}`} 
              onClick={() => setActiveTab('upcoming')}
            >
              <span>Próximas (7 dias)</span>
              {kpis.upcomingCount > 0 && <span className={styles.tabBadgeUpcoming}>{kpis.upcomingCount}</span>}
            </button>
            <button 
              type="button"
              className={`${styles.tab} ${activeTab === 'future' ? styles.activeTab : ''}`} 
              onClick={() => setActiveTab('future')}
            >
              <span>Futuras</span>
            </button>
            <button 
              type="button"
              className={`${styles.tab} ${activeTab === 'periodo' ? styles.activeTab : ''}`} 
              onClick={() => setActiveTab('periodo')}
            >
              <span>📅 Contas Mensais (Período)</span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text"
              placeholder="Buscar por descrição, fornecedor ou banco..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Filtro de Datas Customizado da Aba Período */}
        {activeTab === 'periodo' && (
          <div className={styles.dateFilterWrapper}>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>De:</label>
              <input 
                type="date" 
                className={styles.dateField}
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className={styles.dateInputGroup}>
              <label className={styles.dateLabel}>Até:</label>
              <input 
                type="date" 
                className={styles.dateField}
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <Button 
              variant="secondary" 
              style={{ fontSize: '0.8rem' }}
              onClick={() => {
                setFilterStartDate(getFirstDayOfMonth())
                setFilterEndDate(getLastDayOfMonth())
              }}
            >
              Este Mês
            </Button>
          </div>
        )}
      </div>

      {/* ── Table: Listagem de Contas a Pagar ─────────────────── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status / Vencimento</th>
              <th>Descrição da Conta</th>
              <th>Valor a Pagar</th>
              <th>Conta Bancária Prevista</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>✨</div>
                  <p style={{ fontWeight: 600 }}>Nenhuma conta encontrada nesta categoria.</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                    Tudo em dia ou nenhum resultado correspondente aos filtros.
                  </p>
                </td>
              </tr>
            ) : (
              filteredData.map((t: any) => (
                <tr key={t.id}>
                  <td>
                    {getUrgencyBadge(t.dueDate)}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--foreground)' }}>{t.description}</strong>
                  </td>
                  <td className={styles.amountCell}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    🏦 {t.bank?.name || 'Não definido'}
                  </td>
                  <td>
                    <div className={styles.actionsCell} style={{ justifyContent: 'center' }}>
                      <button 
                        type="button"
                        className={styles.payBtn}
                        onClick={() => handlePay(t.id, t.description)}
                        title="Confirmar pagamento e liquidar"
                      >
                        ✓ Pagar
                      </button>
                      <button 
                        type="button"
                        className={styles.actionBtn}
                        title="Editar lançamento"
                        onClick={() => {
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
                        }}
                      >
                        ✏️
                      </button>
                      <button 
                        type="button"
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Excluir com auditoria"
                        onClick={() => handleDeleteClick(t)}
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

      {/* ── Modais ────────────────────────────────────────────── */}

      {/* Modal de Lançamento / Edição */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>
                {editingPayable ? 'Editar Conta a Pagar' : 'Lançar Nova Conta a Pagar'}
              </h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input 
                  label="Descrição da Despesa" 
                  required 
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Ex: Aluguel Clínica, Fornecedor Preenchedores, Energia"
                />

                <Input 
                  label="Valor da Despesa (R$)" 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  required 
                  value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  placeholder="0,00"
                />
                
                {!editingPayable && (
                  <div className={styles.recurringBox}>
                    <input 
                      type="checkbox"
                      id="isRecurring"
                      checked={form.isRecurring || false}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          isRecurring: e.target.checked,
                          installments: e.target.checked ? '1' : form.installments
                        })
                      }}
                      style={{ accentColor: 'var(--gold-primary)', cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="isRecurring" style={{ fontSize: '0.84rem', cursor: 'pointer', fontWeight: 600, color: 'var(--foreground)' }}>
                      🔁 <strong>Despesa Fixa Recorrente:</strong> Criar cobrança mensal automática para os próximos 2 anos.
                    </label>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label className={styles.modalLabel}>Parcelamento</label>
                    <select 
                      className={styles.select}
                      value={form.installments}
                      disabled={!!editingPayable || form.isRecurring}
                      onChange={(e) => setForm({...form, installments: e.target.value})}
                      style={{ opacity: form.isRecurring ? 0.5 : 1 }}
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}x {i === 0 ? '(À Vista)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Input 
                      label={form.installments === '1' ? 'Data de Vencimento' : '1º Vencimento'} 
                      type="date" 
                      required 
                      value={form.firstDueDate}
                      onChange={(e) => setForm({...form, firstDueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label className={styles.modalLabel}>Pagar com (Conta Prevista)</label>
                  <select 
                    className={styles.select}
                    value={form.bankId}
                    onChange={(e) => setForm({...form, bankId: e.target.value})}
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Saldo: {formatCurrency(b.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingPayable ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão com Auditoria */}
      {isDeleteModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle} style={{ color: 'var(--error)' }}>Confirmar Exclusão</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita e será gravada nos registros de auditoria.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label className={styles.modalLabel} style={{ color: 'var(--gold-hover)' }}>
                  Justificativa da Exclusão (Obrigatória)
                </label>
                <textarea 
                  className={styles.justificationArea}
                  placeholder="Justifique o motivo do cancelamento / exclusão desta conta..."
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setJustification(''); setEditingPayable(null); }}>
                  Cancelar
                </Button>
                <Button style={{ backgroundColor: 'var(--error)', color: '#fff' }} onClick={handleConfirmDelete}>
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
