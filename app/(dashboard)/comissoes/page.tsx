'use client'

import React, { useState, useEffect } from 'react'
import styles from './comissoes.module.css'
import { getCommissionsData, payTransaction } from '@/app/actions/financialActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/format'

export default function ComissoesPage() {
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  
  // Filter states
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

  if (loading && !data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando Portal de Comissões...</div>
  }

  const role = data?.role || 'SELLER'
  const isAdmin = role === 'ADMIN'

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSeller = sellerFilter ? t.userId === sellerFilter : true
    const matchesStatus = statusFilter === 'ALL' ? true : t.status === statusFilter
    return matchesSeller && matchesStatus
  })

  // Calculations for Stats Card
  const totalEarned = filteredTransactions.reduce((acc, t) => acc + t.amount, 0)
  const totalPaid = filteredTransactions.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0)
  const totalPending = filteredTransactions.filter(t => t.status === 'PENDING').reduce((acc, t) => acc + t.amount, 0)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>💼 Portal de Comissões e Repasses</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Acompanhe o faturamento, comissões acumuladas e status de repasses profissionais.
          </p>
        </div>
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
      </header>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <Card className={styles.statsCard}>
          <span className={styles.statsTitle}>Comissões Acumuladas</span>
          <span className={styles.statsValue}>{formatCurrency(totalEarned)}</span>
        </Card>
        <Card className={styles.statsCard}>
          <span className={styles.statsTitle} style={{ color: 'var(--success)' }}>Repasses Pagos</span>
          <span className={styles.statsValue} style={{ color: 'var(--success)' }}>{formatCurrency(totalPaid)}</span>
        </Card>
        <Card className={styles.statsCard}>
          <span className={styles.statsTitle} style={{ color: 'var(--gold-hover)' }}>Repasses Pendentes</span>
          <span className={styles.statsValue} style={{ color: 'var(--gold-hover)' }}>{formatCurrency(totalPending)}</span>
        </Card>
      </div>

      {/* Filters Form */}
      <Card className={styles.filters}>
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Vendedor</label>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Status do Repasse</label>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os status</option>
            <option value="PENDING">Pendentes</option>
            <option value="PAID">Pagos</option>
          </select>
        </div>

        <Button variant="secondary" onClick={() => { setSellerFilter(''); setStatusFilter('ALL') }}>
          Limpar Filtros
        </Button>
      </Card>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
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
                <td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Nenhum repasse de comissão encontrado para o filtro selecionado.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => (
                <tr key={t.id}>
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
    </div>
  )
}
