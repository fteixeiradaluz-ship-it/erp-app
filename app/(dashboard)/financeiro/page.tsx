'use client'

import React, { useState, useEffect } from 'react'
import styles from './financeiro.module.css'
import { getFinancialFlow, createManualTransaction, upsertBank } from '@/app/actions/financialActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

export default function FinanceiroPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

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

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const res = await getFinancialFlow()
    if (res.success) {
      setData(res)
      if (res.banks.length > 0 && !txForm.bankId) {
        setTxForm(prev => ({ ...prev, bankId: res.banks[0].id }))
      }
    }
    setLoading(false)
  }

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await createManualTransaction({
      ...txForm as any,
      amount: parseFloat(txForm.amount)
    })
    if (res.success) {
      setIsTxModalOpen(false)
      load()
    } else {
      alert(res.error)
    }
  }

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await upsertBank({
      name: bankForm.name,
      balance: parseFloat(bankForm.balance)
    })
    if (res.success) {
      setIsBankModalOpen(false)
      load()
    } else {
      alert(res.error)
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados financeiros...</div>

  const { transactions, banks } = data

  return (
    <div className={styles.container}>
      <header className={styles.formHeader}>
        <h1>💰 Gestão Financeira</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" onClick={() => setIsBankModalOpen(true)}>+ Novo Banco</Button>
          <Button onClick={() => setIsTxModalOpen(true)}>+ Nova Transação</Button>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Lado Esquerdo: Bancos */}
        <div className={styles.column}>
          <h2 className={styles.sectionTitle}>Minhas Contas</h2>
          {banks.map((bank: any) => (
            <Card key={bank.id} className={styles.bankCard}>
              <div className={styles.bankInfo}>
                <span className={styles.bankName}>🏦 {bank.name}</span>
                <span className={styles.bankBalance}>{formatCurrency(bank.balance)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                {bank._count.transactions} transações registradas
              </div>
            </Card>
          ))}
        </div>

        {/* Lado Direito: Fluxo de Caixa */}
        <div className={styles.column}>
          <h2 className={styles.sectionTitle}>Fluxo de Caixa (Últimas 50)</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Banco</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center' }}>Nenhuma transação encontrada.</td></tr>
                ) : transactions.map((t: any) => (
                  <tr key={t.id}>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>{t.description}</td>
                    <td>{t.bank.name}</td>
                    <td className={t.type === 'INCOME' ? styles.income : styles.expense}>
                      {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                    </td>
                    <td>
                      <span className={t.status === 'PAID' ? styles.statusPaid : styles.statusPending}>
                        {t.status === 'PAID' ? '● PAGO' : '○ PENDENTE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modais */}
      {isTxModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>Nova Transação</h2>
                <form onSubmit={handleTxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#ccc' }}>Tipo</label>
                    <select 
                      className={styles.select}
                      value={txForm.type}
                      onChange={(e) => setTxForm({...txForm, type: e.target.value})}
                    >
                      <option value="INCOME">Receita (+)</option>
                      <option value="EXPENSE">Despesa (-)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#ccc' }}>Banco de Origem/Destino</label>
                    <select 
                      className={styles.select}
                      value={txForm.bankId}
                      onChange={(e) => setTxForm({...txForm, bankId: e.target.value})}
                    >
                      {banks.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <Input 
                    label="Descrição" 
                    required 
                    value={txForm.description}
                    onChange={(e) => setTxForm({...txForm, description: e.target.value})}
                  />
                  <Input 
                    label="Valor (R$)" 
                    type="number" 
                    step="0.01" 
                    required 
                    value={txForm.amount}
                    onChange={(e) => setTxForm({...txForm, amount: e.target.value})}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#ccc' }}>Status Atual</label>
                    <select 
                      className={styles.select}
                      value={txForm.status}
                      onChange={(e) => setTxForm({...txForm, status: e.target.value})}
                    >
                      <option value="PAID">Pago / Recebido</option>
                      <option value="PENDING">Pendente / Agendado</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={() => setIsTxModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Confirmar</Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}

      {isBankModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>Novo Banco</h2>
                <form onSubmit={handleBankSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input 
                    label="Nome do Banco / Conta" 
                    required 
                    value={bankForm.name}
                    onChange={(e) => setBankForm({...bankForm, name: e.target.value})}
                  />
                  <Input 
                    label="Saldo Inicial (R$)" 
                    type="number" 
                    step="0.01" 
                    required 
                    value={bankForm.balance}
                    onChange={(e) => setBankForm({...bankForm, balance: e.target.value})}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={() => setIsBankModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar Banco</Button>
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
