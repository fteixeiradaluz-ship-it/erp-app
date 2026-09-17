'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styles from './financeiro.module.css'
import { 
  getFinancialFlow, 
  createManualTransaction, 
  upsertBank, 
  updateTransaction, 
  deleteTransaction, 
  getCashFlowForecast 
} from '@/app/actions/financialActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'
import { parseBankStatement, bulkImportTransactions } from '@/app/actions/bankImportActions'
import { getAuditLogs } from '@/app/actions/auditActions'
import Link from 'next/link'

export default function FinanceiroPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  // Projection / Forecast states
  const [financeTab, setFinanceTab] = useState<'realized' | 'forecast'>('realized')
  const [forecastData, setForecastData] = useState<any[]>([])
  const [forecastBase, setForecastBase] = useState(0)
  const [forecastLoading, setForecastLoading] = useState(false)

  // Search & Type Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'PENDING'>('ALL')

  // Transaction Form State
  const [txForm, setTxForm] = useState({
    bankId: '',
    type: 'EXPENSE',
    amount: '',
    description: '',
    status: 'PAID'
  })

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    name: '',
    balance: ''
  })

  // Edit/Delete State
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [justification, setJustification] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importBankId, setImportBankId] = useState('')

  // Date range filter state
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate]     = useState<string>('')

  useEffect(() => {
    load(startDate, endDate)
  }, [startDate, endDate])

  // Initial load
  useEffect(() => { load('', '') }, [])

  async function load(start?: string, end?: string) {
    setLoading(true)
    const startObj = start ? new Date(start + 'T00:00:00') : undefined
    const endObj   = end   ? new Date(end   + 'T23:59:59') : undefined
    const res = await getFinancialFlow(startObj, endObj)
    if (res.success) {
      setData(res)
      if ((res as any).banks.length > 0) {
        if (!txForm.bankId) {
          setTxForm(prev => ({ ...prev, bankId: (res as any).banks[0].id }))
        }
        setImportBankId(prev => prev || (res as any).banks[0].id)
      }
    }
    
    setForecastLoading(true)
    const forecastRes = await getCashFlowForecast()
    if (forecastRes.success) {
      setForecastData((forecastRes as any).projection)
      setForecastBase((forecastRes as any).baseBalance)
    }
    setForecastLoading(false)
    setLoading(false)
  }

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await upsertBank({
      name: bankForm.name,
      balance: parseFloat(bankForm.balance)
    })
    if (res.success) {
      setIsBankModalOpen(false)
      load(startDate, endDate)
    } else {
      alert(res.error)
    }
  }

  const handleEditClick = (tx: any) => {
    setSelectedTx(tx)
    setTxForm({
      bankId: tx.bankId,
      type: tx.type,
      amount: tx.amount.toString(),
      description: tx.description,
      status: tx.status
    })
    setIsTxModalOpen(true)
  }

  const handleDeleteClick = (tx: any) => {
    setSelectedTx(tx)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!justification) return alert('Por favor, insira uma justificativa.')
    const res = await deleteTransaction(selectedTx.id, justification)
    if (res.success) {
      setIsDeleteModalOpen(false)
      setJustification('')
      load(startDate, endDate)
    } else {
      alert(res.error)
    }
  }

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTx && !justification) return alert('Por favor, insira uma justificativa.')
    
    let res;
    if (selectedTx) {
      res = await updateTransaction(selectedTx.id, {
        ...txForm as any,
        amount: parseFloat(txForm.amount)
      }, justification)
    } else {
      res = await createManualTransaction({
        ...txForm as any,
        amount: parseFloat(txForm.amount)
      })
    }

    if (res.success) {
      setIsTxModalOpen(false)
      setSelectedTx(null)
      setJustification('')
      load(startDate, endDate)
    } else {
      alert(res.error)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const bankIdToUse = importBankId || data?.banks?.[0]?.id
    if (!bankIdToUse) return alert('Por favor, selecione uma conta bancária primeiro.')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bankId', bankIdToUse)
    
    const res = await parseBankStatement(formData)
    if (res.success) {
      setImportPreview(res.transactions)
      setIsImportModalOpen(true)
    } else {
      alert(res.error)
    }
  }

  // Consolidated Financial Metrics (KPIs)
  const totalConsolidatedBalance = useMemo(() => {
    if (!data?.banks) return 0
    return data.banks.reduce((acc: number, b: any) => acc + (b.balance || 0), 0)
  }, [data?.banks])

  const periodMetrics = useMemo(() => {
    if (!data?.transactions) return { income: 0, expense: 0, net: 0, count: 0 }
    let income = 0
    let expense = 0
    data.transactions.forEach((t: any) => {
      if (t.type === 'INCOME') income += t.amount
      if (t.type === 'EXPENSE') expense += t.amount
    })
    return {
      income,
      expense,
      net: income - expense,
      count: data.transactions.length
    }
  }, [data?.transactions])

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return []
    return data.transactions.filter((t: any) => {
      // Type filter
      if (typeFilter === 'INCOME' && t.type !== 'INCOME') return false
      if (typeFilter === 'EXPENSE' && t.type !== 'EXPENSE') return false
      if (typeFilter === 'PENDING' && t.status !== 'PENDING') return false

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase()
        const descMatch = t.description?.toLowerCase().includes(term)
        const bankMatch = t.bank?.name?.toLowerCase().includes(term)
        return descMatch || bankMatch
      }

      return true
    })
  }, [data?.transactions, typeFilter, searchTerm])

  if (loading && !data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
        <p style={{ fontWeight: 600 }}>Carregando dados financeiros...</p>
      </div>
    )
  }

  const { banks = [] } = data || {}

  return (
    <div className={styles.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className={styles.formHeader}>
        <div>
          <h1 className={styles.headerTitle}>
            <span>💰 Gestão Financeira & Caixa</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Controle de fluxo de caixa realizado, contas bancárias, conciliação e projeção de liquidez.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/financeiro/contas-receber">
            <Button variant="secondary" style={{ fontSize: '0.82rem' }}>
              📥 Contas a Receber
            </Button>
          </Link>

          <Button 
            variant="secondary" 
            style={{ fontSize: '0.82rem' }}
            onClick={async () => {
              const res = await getAuditLogs()
              if (res.success) {
                setAuditLogs(res.logs)
                setIsLogModalOpen(true)
              }
            }}
          >
            📜 Auditoria
          </Button>

          {banks.length > 0 && (
            <select
              value={importBankId}
              onChange={(e) => setImportBankId(e.target.value)}
              className={styles.select}
              style={{ width: 'auto', padding: '0.5rem 0.8rem', fontSize: '0.82rem' }}
            >
              {banks.map((b: any) => (
                <option key={b.id} value={b.id}>Extrato: {b.name}</option>
              ))}
            </select>
          )}

          <label className={styles.actionBtn} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            📥 Importar Extrato (.OFX/.CSV)
            <input type="file" hidden accept=".ofx,.csv" onChange={handleImportFile} />
          </label>

          <Button 
            variant="secondary" 
            style={{ fontSize: '0.82rem' }}
            onClick={() => { setIsBankModalOpen(true); setBankForm({ name: '', balance: '' }); }}
          >
            + Conta
          </Button>

          <Button 
            style={{ fontSize: '0.82rem' }}
            onClick={() => { 
              setIsTxModalOpen(true); 
              setSelectedTx(null); 
              setTxForm({ bankId: banks[0]?.id || '', type: 'EXPENSE', amount: '', description: '', status: 'PAID' }); 
            }}
          >
            + Nova Transação
          </Button>
        </div>
      </header>

      {/* ── Executive KPI Summary Cards ───────────────────────── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Saldo Total Consolidado</span>
            <span className={styles.kpiIcon}>🏦</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valGold}`}>
            {formatCurrency(totalConsolidatedBalance)}
          </div>
          <span className={styles.kpiSub}>Disponível em {banks.length} contas bancárias</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Entradas no Período</span>
            <span className={styles.kpiIcon}>📈</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valIncome}`}>
            + {formatCurrency(periodMetrics.income)}
          </div>
          <span className={styles.kpiSub}>Receitas e faturamentos confirmados</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Saídas no Período</span>
            <span className={styles.kpiIcon}>📉</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valExpense}`}>
            - {formatCurrency(periodMetrics.expense)}
          </div>
          <span className={styles.kpiSub}>Despesas operacionais e custos pagos</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Resultado Operacional</span>
            <span className={styles.kpiIcon}>⚖️</span>
          </div>
          <div className={`${styles.kpiValue} ${periodMetrics.net >= 0 ? styles.valIncome : styles.valExpense}`}>
            {periodMetrics.net >= 0 ? '+' : ''} {formatCurrency(periodMetrics.net)}
          </div>
          <span className={styles.kpiSub}>
            {periodMetrics.net >= 0 ? 'Superávit no período filtrado' : 'Déficit no período filtrado'}
          </span>
        </div>
      </div>

      {/* ── Main 2-Column Grid Layout ─────────────────────────── */}
      <div className={styles.grid}>
        
        {/* ── Left Column: Contas Bancárias ───────────────────── */}
        <div className={styles.column}>
          <div className={styles.consolidatedCard}>
            <span className={styles.consolidatedLabel}>Patrimônio Líquido em Caixa</span>
            <span className={styles.consolidatedValue}>{formatCurrency(totalConsolidatedBalance)}</span>
          </div>

          <h2 className={styles.sectionTitle}>
            <span>Minhas Contas</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{banks.length} ativas</span>
          </h2>

          {banks.map((bank: any) => (
            <div key={bank.id} className={styles.bankCard}>
              <div className={styles.bankInfo}>
                <span className={styles.bankName}>🏦 {bank.name}</span>
                <span className={styles.bankBalance}>{formatCurrency(bank.balance)}</span>
              </div>
              <div className={styles.bankCount}>
                {bank._count?.transactions || 0} lançamentos registrados
              </div>
            </div>
          ))}

          {banks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhuma conta cadastrada. Clique em "+ Conta" acima.
            </div>
          )}
        </div>

        {/* ── Right Column: Fluxo de Caixa / Projeção ─────────── */}
        <div className={styles.column}>
          
          {/* Header com Alternância de Abas */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {financeTab === 'realized'
                ? (startDate && endDate
                    ? `📊 Extrato: ${startDate.split('-').reverse().join('/')} → ${endDate.split('-').reverse().join('/')}`
                    : '📊 Histórico de Transações')
                : '🔮 Projeção de Fluxo de Caixa (12 Meses)'}
            </h2>

            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--background)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <button 
                type="button"
                onClick={() => setFinanceTab('realized')} 
                className={`${styles.presetBtn} ${financeTab === 'realized' ? styles.presetBtnActive : ''}`}
              >
                Caixa Realizado
              </button>
              <button 
                type="button"
                onClick={() => setFinanceTab('forecast')} 
                className={`${styles.presetBtn} ${financeTab === 'forecast' ? styles.presetBtnActive : ''}`}
              >
                Projeção Futura (12M)
              </button>
            </div>
          </div>

          {financeTab === 'realized' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* ── Filter Bar: Datas, Presets & Busca ── */}
              <div className={styles.filterBarWrapper}>
                
                {/* Linha 1: Datepicker + Presets de Período */}
                <div className={styles.dateFilterRow}>
                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Data Início</label>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || todayStr}
                      onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(todayStr) }}
                      className={styles.dateInput}
                    />
                  </div>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingBottom: '0.5rem' }}>→</span>

                  <div className={styles.filterField}>
                    <label className={styles.filterLabel}>Data Fim</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={todayStr}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>

                  {/* Botões de Atalho */}
                  <div className={styles.presetGroup} style={{ paddingBottom: '0.1rem' }}>
                    {[
                      { label: 'Hoje', fn: () => { setStartDate(todayStr); setEndDate(todayStr) } },
                      { label: '7 dias', fn: () => { const d = new Date(today); d.setDate(d.getDate()-6); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr) } },
                      { label: '30 dias', fn: () => { const d = new Date(today); d.setDate(d.getDate()-29); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr) } },
                      { label: 'Este mês', fn: () => { const d = new Date(today.getFullYear(), today.getMonth(), 1); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr) } },
                      { label: 'Tudo', fn: () => { setStartDate(''); setEndDate('') } },
                    ].map(({ label, fn }) => {
                      const isActive = (label === 'Tudo' && !startDate && !endDate) ||
                                       (label === 'Hoje' && startDate === todayStr && endDate === todayStr)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={fn}
                          className={`${styles.presetBtn} ${isActive ? styles.presetBtnActive : ''}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Linha 2: Busca Rápida + Filtro por Tipo */}
                <div className={styles.searchFilterRow}>
                  <div className={styles.searchBox}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input 
                      type="text"
                      placeholder="Filtrar por descrição, conta ou detalhe..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className={styles.searchInput}
                    />
                  </div>

                  <div className={styles.typeFilterGroup}>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${typeFilter === 'ALL' ? styles.typeBtnActive : ''}`}
                      onClick={() => setTypeFilter('ALL')}
                    >
                      Todas ({filteredTransactions.length})
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${typeFilter === 'INCOME' ? styles.typeBtnActive : ''}`}
                      onClick={() => setTypeFilter('INCOME')}
                    >
                      🟢 Receitas
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${typeFilter === 'EXPENSE' ? styles.typeBtnActive : ''}`}
                      onClick={() => setTypeFilter('EXPENSE')}
                    >
                      🔴 Despesas
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${typeFilter === 'PENDING' ? styles.typeBtnActive : ''}`}
                      onClick={() => setTypeFilter('PENDING')}
                    >
                      🟡 Pendentes
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabela de Transações */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Conta / Banco</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🔍</div>
                          Nenhuma transação encontrada para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t: any) => (
                        <tr key={t.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                            {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td>
                            <strong style={{ color: 'var(--foreground)' }}>{t.description}</strong>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{t.bank?.name}</td>
                          <td className={t.type === 'INCOME' ? styles.income : styles.expense} style={{ whiteSpace: 'nowrap' }}>
                            {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                          </td>
                          <td>
                            <span className={t.status === 'PAID' ? styles.statusPaid : styles.statusPending}>
                              {t.status === 'PAID' ? '● PAGO' : '○ PENDENTE'}
                            </span>
                          </td>
                          <td className={styles.actionsCell}>
                            <button 
                              className={styles.actionBtn} 
                              title="Editar transação" 
                              onClick={() => handleEditClick(t)}
                            >
                              ✏️
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                              title="Excluir com auditoria" 
                              onClick={() => handleDeleteClick(t)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── Projeção Futura (12 Meses) ── */
            <div className={styles.tableWrapper}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--gold-50)' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  🔮 Projeta a liquidez financeira da clínica nos próximos 12 meses combinando o saldo consolidado atual (base: <strong>{formatCurrency(forecastBase)}</strong>) com faturamentos parcelados de cartões e despesas recorrentes provisionadas.
                </p>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mês de Referência</th>
                    <th>Receitas Previstas</th>
                    <th>Saídas Previstas</th>
                    <th>Fluxo Líquido</th>
                    <th>Saldo Projetado</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastLoading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Calculando projeção financeira...
                      </td>
                    </tr>
                  ) : forecastData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Sem dados de projeção para o período.
                      </td>
                    </tr>
                  ) : (
                    forecastData.map((row, idx) => {
                      const netFlowIsPositive = row.netFlow >= 0
                      const balanceIsPositive = row.projectedBalance >= 0
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{row.monthName}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>+ {formatCurrency(row.income)}</td>
                          <td style={{ color: 'var(--error)', fontWeight: 600 }}>- {formatCurrency(row.expense)}</td>
                          <td style={{ 
                            color: netFlowIsPositive ? 'var(--success)' : 'var(--error)', 
                            fontWeight: 700
                          }}>
                            {netFlowIsPositive ? '+' : '-'} {formatCurrency(Math.abs(row.netFlow))}
                          </td>
                          <td style={{ 
                            color: balanceIsPositive ? 'var(--gold-hover)' : 'var(--error)', 
                            fontWeight: 800,
                            fontSize: '0.95rem'
                          }}>
                            {formatCurrency(row.projectedBalance)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modais ────────────────────────────────────────────── */}
      
      {/* Modal de Transação (Nova / Editar) */}
      {isTxModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>{selectedTx ? 'Editar Transação' : 'Nova Transação'}</h2>
              
              <form onSubmit={handleSubmitTx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label className={styles.modalLabel}>Tipo de Transação</label>
                  <select 
                    className={styles.select}
                    value={txForm.type}
                    onChange={(e) => setTxForm({...txForm, type: e.target.value})}
                  >
                    <option value="INCOME">🟢 Receita / Entrada (+)</option>
                    <option value="EXPENSE">🔴 Despesa / Saída (-)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label className={styles.modalLabel}>Conta / Banco</label>
                  <select 
                    className={styles.select}
                    value={txForm.bankId}
                    onChange={(e) => setTxForm({...txForm, bankId: e.target.value})}
                  >
                    {banks.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name} (Saldo: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>

                <Input 
                  label="Descrição da Transação" 
                  required 
                  value={txForm.description}
                  onChange={(e) => setTxForm({...txForm, description: e.target.value})}
                  placeholder="Ex: Pagamento Fornecedor Toxina Botulínica"
                />

                <Input 
                  label="Valor (R$)" 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  required 
                  value={txForm.amount}
                  onChange={(e) => setTxForm({...txForm, amount: e.target.value})}
                  placeholder="0,00"
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label className={styles.modalLabel}>Status do Pagamento</label>
                  <select 
                    className={styles.select}
                    value={txForm.status}
                    onChange={(e) => setTxForm({...txForm, status: e.target.value})}
                  >
                    <option value="PAID">● Pago / Liquidado</option>
                    <option value="PENDING">○ Pendente / Agendado</option>
                  </select>
                </div>

                {selectedTx && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label className={styles.modalLabel} style={{ color: 'var(--gold-hover)' }}>
                      Justificativa da Alteração (Obrigatória para Auditoria)
                    </label>
                    <textarea 
                      className={styles.justificationArea}
                      placeholder="Descreva o motivo desta alteração..."
                      required
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <Button type="button" variant="secondary" onClick={() => { setIsTxModalOpen(false); setSelectedTx(null); setJustification(''); }}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {selectedTx ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Banco */}
      {isBankModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>Cadastrar Nova Conta Bancária</h2>
              
              <form onSubmit={handleBankSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input 
                  label="Nome da Conta / Banco" 
                  required 
                  value={bankForm.name}
                  onChange={(e) => setBankForm({...bankForm, name: e.target.value})}
                  placeholder="Ex: Itaú PJ, Nubank, Caixa Físico"
                />
                
                <Input 
                  label="Saldo Inicial (R$)" 
                  type="number" 
                  step="0.01" 
                  required 
                  value={bankForm.balance}
                  onChange={(e) => setBankForm({...bankForm, balance: e.target.value})}
                  placeholder="0,00"
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <Button type="button" variant="secondary" onClick={() => setIsBankModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Salvar Conta
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita e será registrada nos logs de auditoria.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label className={styles.modalLabel} style={{ color: 'var(--gold-hover)' }}>
                  Justificativa da Exclusão (Obrigatória)
                </label>
                <textarea 
                  className={styles.justificationArea}
                  placeholder="Justifique o motivo do estorno / exclusão..."
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setJustification(''); }}>
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

      {/* Modal de Importação de Extrato */}
      {isImportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '800px' }}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>Confirmar Importação de Extrato Bancário</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Selecione as transações identificadas no arquivo para conciliar ou lançar:
              </p>

              <select 
                className={styles.select}
                value={importBankId}
                onChange={(e) => setImportBankId(e.target.value)}
              >
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>Conta Destino: {b.name}</option>
                ))}
              </select>
              
              <div className={styles.tableWrapper} style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição no Extrato</th>
                      <th>Valor</th>
                      <th style={{ textAlign: 'center' }}>Ação Proposta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((item, idx) => (
                      <tr key={idx} style={{ background: item.reconcileWithId ? 'var(--gold-50)' : 'transparent' }}>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.description}</div>
                          {item.reconcileWithId && (
                            <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--gold-hover)', fontWeight: 'bold' }}>
                              🔗 Conciliar com: <span style={{ textDecoration: 'underline' }}>{item.reconcileWithDesc}</span>
                            </div>
                          )}
                        </td>
                        <td className={item.amount > 0 ? styles.income : styles.expense} style={{ whiteSpace: 'nowrap' }}>
                          {formatCurrency(item.amount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', justifyContent: 'center' }}>
                            <input 
                              type="checkbox" 
                              defaultChecked 
                              onChange={(e) => {
                                const newPreview = [...importPreview]
                                newPreview[idx].selected = e.target.checked
                                setImportPreview(newPreview)
                              }}
                            />
                            <span style={{ 
                              fontWeight: 'bold', 
                              color: item.reconcileWithId ? 'var(--gold-hover)' : 'inherit' 
                            }}>
                              {item.reconcileWithId ? 'Conciliar' : 'Lançar'}
                            </span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>Cancelar</Button>
                <Button 
                  disabled={importing}
                  onClick={async () => {
                    if (importPreview.filter(p => p.selected !== false).length === 0) return alert('Selecione ao menos uma transação.')
                    setImporting(true)
                    const selected = importPreview.filter(p => p.selected !== false)
                    const targetBankId = importBankId || banks[0]?.id
                    const res = await bulkImportTransactions({
                      bankId: targetBankId,
                      transactions: selected
                    })
                    setImporting(false)
                    if (res.success) {
                      setIsImportModalOpen(false)
                      setImportPreview([])
                      load(startDate, endDate)
                    } else {
                      alert(res.error)
                    }
                  }}
                >
                  {importing ? 'Importando...' : `Importar ${importPreview.filter(p => p.selected !== false).length} Transações`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Logs de Auditoria */}
      {isLogModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '850px' }}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>📜 Histórico de Auditoria Financeira</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Registro imutável de alterações manuais e exclusões realizadas no financeiro.
              </p>
              
              <div className={styles.tableWrapper} style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Usuário</th>
                      <th>Ação</th>
                      <th>Justificativa / Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum log encontrado.</td></tr>
                    ) : (
                      auditLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td style={{ fontWeight: 600 }}>{log.user?.name || 'Sistema'}</td>
                          <td>
                            <span className={styles.statsBadge} style={{ 
                              backgroundColor: log.action.includes('DELETE') ? 'var(--error-bg)' : 'var(--gold-100)',
                              color: log.action.includes('DELETE') ? 'var(--error)' : 'var(--gold-hover)',
                              border: `1px solid ${log.action.includes('DELETE') ? 'var(--error)' : 'var(--border-strong)'}`
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                            {log.details?.justification || JSON.stringify(log.details)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setIsLogModalOpen(false)}>Fechar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
