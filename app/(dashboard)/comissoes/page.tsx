'use client'

import React, { useState, useEffect } from 'react'
import styles from './comissoes.module.css'
import { getCommissionsData, payTransaction, payCommissionsBatch } from '@/app/actions/financialActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/format'

export default function ComissoesPage() {
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  
  // Selection for Batch Payment
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchBankId, setBatchBankId] = useState('')
  const [batchPayDate, setBatchPayDate] = useState(new Date().toISOString().split('T')[0])
  const [submittingBatch, setSubmittingBatch] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sellerFilter, setSellerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL, PAID, PENDING

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const res = await getCommissionsData()
    if (res.success) {
      setData(res)
      setTransactions(res.transactions)
      if (res.banks && res.banks.length > 0 && !batchBankId) {
        setBatchBankId(res.banks[0].id)
      }
    } else {
      alert(res.error || 'Erro ao carregar dados de comissão')
    }
    setLoading(false)
  }

  const handlePay = async (id: string) => {
    if (!confirm('Deseja marcar este repasse de comissão como pago?')) return
    setPayingId(id)
    const res = await payTransaction(id)
    if (res.success) {
      alert('Repasse de comissão marcado como pago!')
      await load()
    } else {
      alert(res.error || 'Erro ao efetuar pagamento do repasse')
    }
    setPayingId(null)
  }

  const toggleSelectAll = () => {
    const pendingIds = filteredTransactions.filter(t => t.status === 'PENDING').map(t => t.id)
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingIds)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleBatchPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchBankId) return alert('Selecione a conta bancária de origem!')
    if (selectedIds.length === 0) return alert('Nenhum repasse selecionado!')

    setSubmittingBatch(true)
    const res = await payCommissionsBatch({
      transactionIds: selectedIds,
      bankId: batchBankId,
      payDate: batchPayDate
    })

    if (res.success) {
      alert(`${selectedIds.length} repasses de comissão foram liquidados com sucesso!`)
      setSelectedIds([])
      setIsBatchModalOpen(false)
      await load()
    } else {
      alert(res.error || 'Erro ao liquidar repasses em lote')
    }
    setSubmittingBatch(false)
  }

  if (loading && !data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando Portal de Comissões...</div>
  }

  const role = data?.role || 'SELLER'
  const isAdmin = role === 'ADMIN'

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSeller = sellerFilter ? t.userId === sellerFilter : true
    const matchesStatus = statusFilter === 'ALL' ? true : t.status === statusFilter
    const term = searchTerm.toLowerCase()
    const matchesSearch = !term ? true : (
      t.description?.toLowerCase().includes(term) ||
      t.user?.name?.toLowerCase().includes(term) ||
      t.sale?.customer?.name?.toLowerCase().includes(term) ||
      t.sale?.id?.toLowerCase().includes(term)
    )
    return matchesSeller && matchesStatus && matchesSearch
  })

  // Calculations for Stats Card
  const totalEarned = filteredTransactions.reduce((acc, t) => acc + t.amount, 0)
  const totalPaid = filteredTransactions.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0)
  const totalPending = filteredTransactions.filter(t => t.status === 'PENDING').reduce((acc, t) => acc + t.amount, 0)
  const pendingCount = filteredTransactions.filter(t => t.status === 'PENDING').length

  // Selected Amount Calculation
  const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id))
  const selectedTotalAmount = selectedTransactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>💼 Portal de Comissões & Repasses</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Acompanhamento de repasses profissionais, controle de liquidações e histórico de pagamentos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && selectedIds.length > 0 && (
            <Button onClick={() => setIsBatchModalOpen(true)} style={{ background: 'var(--success)' }}>
              ⚡ Liquidar Selecionadas ({selectedIds.length} - {formatCurrency(selectedTotalAmount)})
            </Button>
          )}
          <span style={{
            fontSize: '0.75rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '99px',
            background: isAdmin ? 'var(--gold-light)' : 'rgba(2, 136, 209, 0.1)',
            color: isAdmin ? 'var(--gold-primary)' : 'var(--info)',
            border: `1px solid ${isAdmin ? 'var(--border-gold)' : 'rgba(2, 136, 209, 0.2)'}`,
          }}>
            {isAdmin ? '🛡️ Visualização: ADMIN (Gestão de Repasses)' : '👤 Visualização: VENDEDOR (Minhas Comissões)'}
          </span>
        </div>
      </header>

      {/* ── Executive KPI Cards ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statsCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.statsTitle}>Comissões Acumuladas</span>
            <span className={styles.kpiIcon}>💼</span>
          </div>
          <span className={`${styles.statsValue} ${styles.valGold}`}>{formatCurrency(totalEarned)}</span>
          <span className={styles.kpiSub}>{filteredTransactions.length} lançamentos filtrados</span>
        </div>

        <div className={styles.statsCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.statsTitle} style={{ color: 'var(--success)' }}>Repasses Pagos</span>
            <span className={styles.kpiIcon}>✅</span>
          </div>
          <span className={`${styles.statsValue} ${styles.valPositive}`}>{formatCurrency(totalPaid)}</span>
          <span className={styles.kpiSub}>Valores quitados</span>
        </div>

        <div className={styles.statsCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.statsTitle} style={{ color: 'var(--gold-hover)' }}>Repasses Pendentes</span>
            <span className={styles.kpiIcon}>⏳</span>
          </div>
          <span className={`${styles.statsValue} ${styles.valPending}`}>{formatCurrency(totalPending)}</span>
          <span className={styles.kpiSub}>{pendingCount} repasse(s) a pagar</span>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <Card className={styles.filters}>
        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>🔍 Buscar Repasse</label>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por cliente, profissional, venda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '220px', flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Profissional / Vendedor</label>
              <select
                className={styles.select}
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
              >
                <option value="">Todos os profissionais</option>
                {data?.users?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Status</label>
            <div className={styles.statusPills}>
              <button
                type="button"
                className={`${styles.pill} ${statusFilter === 'ALL' ? styles.activePill : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`${styles.pill} ${statusFilter === 'PENDING' ? styles.activePill : ''}`}
                onClick={() => setStatusFilter('PENDING')}
              >
                ⏳ Pendentes
              </button>
              <button
                type="button"
                className={`${styles.pill} ${statusFilter === 'PAID' ? styles.activePill : ''}`}
                onClick={() => setStatusFilter('PAID')}
              >
                ✅ Pagos
              </button>
            </div>
          </div>

          <Button variant="secondary" onClick={() => { setSearchTerm(''); setSellerFilter(''); setStatusFilter('ALL'); setSelectedIds([]); }}>
            Limpar
          </Button>
        </div>
      </Card>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {isAdmin && (
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={pendingCount > 0 && selectedIds.length === pendingCount}
                    onChange={toggleSelectAll}
                    title="Selecionar todas as pendentes"
                  />
                </th>
              )}
              <th>Vencimento</th>
              <th>Descrição do Repasse</th>
              {isAdmin && <th>Profissional</th>}
              <th>Origem da Venda</th>
              <th>Valor do Repasse</th>
              <th>Status</th>
              {isAdmin && <th style={{ textAlign: 'center' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Nenhum repasse de comissão encontrado para o filtro selecionado.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => (
                <tr key={t.id} style={{ background: selectedIds.includes(t.id) ? 'rgba(212, 175, 55, 0.08)' : undefined }}>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      {t.status === 'PENDING' ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                        />
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '0.8rem' }}>✓</span>
                      )}
                    </td>
                  )}
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Sem data'}</td>
                  <td style={{ fontWeight: '600' }}>{t.description}</td>
                  {isAdmin && <td>{t.user?.name || 'Vendedor'}</td>}
                  <td>
                    {t.sale ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Venda #{t.sale.id.slice(0, 6)} ({t.sale.customer?.name || '---'}) - Total: {formatCurrency(t.sale.totalAmount)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#888' }}>Avulsa / Não vinculada</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 'bold', color: 'var(--error)' }}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td>
                    <span className={t.status === 'PAID' ? styles.statusPaid : styles.statusPending}>
                      {t.status === 'PAID' ? '● PAGO' : '○ PENDENTE'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      {t.status === 'PENDING' ? (
                        <button
                          className={styles.payBtn}
                          disabled={payingId === t.id}
                          onClick={() => handlePay(t.id)}
                        >
                          {payingId === t.id ? 'Processando...' : 'Pagar Repasse'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          Pago em {t.payDate ? new Date(t.payDate).toLocaleDateString() : '---'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Liquidação em Lote */}
      {isBatchModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
              ⚡ Liquidação de Comissões em Lote
            </h2>
            
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Quantidade Selecionada:</span>
                <strong>{selectedIds.length} repasse(s)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: 'var(--error)' }}>
                <span>Total a Liquidar:</span>
                <strong>{formatCurrency(selectedTotalAmount)}</strong>
              </div>
            </div>

            <form onSubmit={handleBatchPaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Conta Bancária de Débito (Saída do Dinheiro)
                </label>
                <select
                  value={batchBankId}
                  onChange={(e) => setBatchBankId(e.target.value)}
                  className={styles.select}
                  style={{ width: '100%' }}
                  required
                >
                  <option value="">-- Selecione o Banco --</option>
                  {data?.banks?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Saldo: {formatCurrency(b.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Data do Pagamento / Efetivação
                </label>
                <input
                  type="date"
                  value={batchPayDate}
                  onChange={(e) => setBatchPayDate(e.target.value)}
                  className={styles.select}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button type="button" variant="secondary" onClick={() => setIsBatchModalOpen(false)} style={{ flex: 1 }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submittingBatch} style={{ flex: 1, background: 'var(--success)' }}>
                  {submittingBatch ? 'Processando...' : 'Confirmar Baixa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
