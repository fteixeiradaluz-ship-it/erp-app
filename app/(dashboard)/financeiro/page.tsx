'use client'

import React, { useState, useEffect } from 'react'
import styles from './financeiro.module.css'
import { getFinancialFlow, createManualTransaction, upsertBank, updateTransaction, deleteTransaction, getCashFlowForecast } from '@/app/actions/financialActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'
import { parseBankStatement, bulkImportTransactions } from '@/app/actions/bankImportActions'
import { getAuditLogs } from '@/app/actions/auditActions'

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

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const res = await getFinancialFlow()
    if (res.success) {
      setData(res)
      if (res.banks.length > 0) {
        if (!txForm.bankId) {
          setTxForm(prev => ({ ...prev, bankId: res.banks[0].id }))
        }
        setImportBankId(prev => prev || res.banks[0].id)
      }
    }
    
    // Carregar a projeção de fluxo de caixa futuro
    setForecastLoading(true)
    const forecastRes = await getCashFlowForecast()
    if (forecastRes.success) {
      setForecastData(forecastRes.projection)
      setForecastBase(forecastRes.baseBalance)
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
      load()
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
      load()
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
      load()
    } else {
      alert(res.error)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const bankIdToUse = importBankId || data.banks[0]?.id
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

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados financeiros...</div>

  const { transactions, banks } = data

  return (
    <div className={styles.container}>
      <header className={styles.formHeader}>
        <h1>💰 Gestão Financeira</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" onClick={async () => {
            const res = await getAuditLogs()
            if (res.success) {
              setAuditLogs(res.logs)
              setIsLogModalOpen(true)
            }
          }}>📜 Ver Histórico</Button>
          {banks.length > 0 && (
            <select
              value={importBankId}
              onChange={(e) => setImportBankId(e.target.value)}
              className={styles.select}
              style={{ width: 'auto', padding: '0.5rem 1rem', border: '1px solid var(--border-gold)', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              {banks.map((b: any) => (
                <option key={b.id} value={b.id}>Extrato: {b.name}</option>
              ))}
            </select>
          )}
          <label className={`${styles.actionBtn} ${styles.importBtn}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
            📥 Importar Extrato
            <input type="file" hidden accept=".ofx,.csv" onChange={handleImportFile} />
          </label>
          <Button variant="secondary" onClick={() => { setIsBankModalOpen(true); setBankForm({ name: '', balance: '' }); }}>+ Novo Banco</Button>
          <Button onClick={() => { setIsTxModalOpen(true); setSelectedTx(null); setTxForm({ bankId: banks[0]?.id || '', type: 'EXPENSE', amount: '', description: '', status: 'PAID' }); }}>+ Nova Transação</Button>
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

        {/* Lado Direito: Fluxo de Caixa Realizado ou Projetado */}
        <div className={styles.column}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '2px solid var(--border-gold)', paddingBottom: '0.6rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {financeTab === 'realized' ? '📊 Histórico Realizado (Últimas 50)' : '🔮 Projeção de Fluxo de Caixa (12 Meses)'}
            </h2>
            <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(212,175,55,0.03)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
              <button 
                onClick={() => setFinanceTab('realized')} 
                style={{ 
                  background: financeTab === 'realized' ? 'var(--gold-primary)' : 'transparent',
                  color: financeTab === 'realized' ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Caixa Realizado
              </button>
              <button 
                onClick={() => setFinanceTab('forecast')} 
                style={{ 
                  background: financeTab === 'forecast' ? 'var(--gold-primary)' : 'transparent',
                  color: financeTab === 'forecast' ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Projeção Futura
              </button>
            </div>
          </div>

          {financeTab === 'realized' ? (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Banco</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center' }}>Nenhuma transação encontrada.</td></tr>
                  ) : transactions.map((t: any) => (
                    <tr key={t.id} className={t.type === 'EXPENSE' ? styles.expenseRow : ''}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td>{t.description}</td>
                      <td>{t.bank.name}</td>
                      <td className={t.type === 'INCOME' ? styles.income : styles.expense} style={{ whiteSpace: 'nowrap' }}>
                        {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                      <td>
                        <span className={t.status === 'PAID' ? styles.statusPaid : styles.statusPending}>
                          {t.status === 'PAID' ? '● PAGO' : '○ PENDENTE'}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button className={`${styles.actionBtn} ${styles.editBtn}`} title="Editar" onClick={() => handleEditClick(t)}>✏️</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Excluir" onClick={() => handleDeleteClick(t)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                Projeta a liquidez futura da clínica nos próximos 12 meses. Combina o saldo bancário consolidado atual (base: <strong>{formatCurrency(forecastBase)}</strong>) com parcelas a receber de cartões e despesas recorrentes/repasses provisionados a vencer.
              </p>
              <table className={styles.table}>
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,0.06)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.8rem' }}>Mês de Referência</th>
                    <th style={{ padding: '0.8rem' }}>Receitas Previstas</th>
                    <th style={{ padding: '0.8rem' }}>Saídas Previstas</th>
                    <th style={{ padding: '0.8rem' }}>Fluxo Líquido</th>
                    <th style={{ padding: '0.8rem' }}>Saldo Final Projetado</th>
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
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                          <td style={{ fontWeight: 'bold', textTransform: 'capitalize', padding: '0.8rem' }}>{row.monthName}</td>
                          <td style={{ color: 'var(--success)', fontWeight: '600', padding: '0.8rem' }}>+ {formatCurrency(row.income)}</td>
                          <td style={{ color: 'var(--error)', fontWeight: '600', padding: '0.8rem' }}>- {formatCurrency(row.expense)}</td>
                          <td style={{ 
                            color: netFlowIsPositive ? 'var(--success)' : 'var(--error)', 
                            fontWeight: 'bold',
                            padding: '0.8rem'
                          }}>
                            {netFlowIsPositive ? '+' : '-'} {formatCurrency(Math.abs(row.netFlow))}
                          </td>
                          <td style={{ 
                            color: balanceIsPositive ? 'var(--gold-primary)' : 'var(--error)', 
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            padding: '0.8rem',
                            background: balanceIsPositive ? 'rgba(212,175,55,0.03)' : 'rgba(244,67,54,0.03)'
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

      {/* Modais */}
      {isTxModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>{selectedTx ? 'Editar Transação' : 'Nova Transação'}</h2>
                <form onSubmit={handleSubmitTx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    <label style={{ fontSize: '0.85rem', color: '#555' }}>Status Atual</label>
                    <select 
                      className={styles.select}
                      value={txForm.status}
                      onChange={(e) => setTxForm({...txForm, status: e.target.value})}
                    >
                      <option value="PAID">Pago / Recebido</option>
                      <option value="PENDING">Pendente / Agendado</option>
                    </select>
                  </div>

                  {selectedTx && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--gold-primary)', fontWeight: '600' }}>Justificativa da Alteração</label>
                      <textarea 
                        className={styles.justificationArea}
                        placeholder="Por que você está alterando esta transação?"
                        required
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={() => { setIsTxModalOpen(false); setSelectedTx(null); setJustification(''); }}>Cancelar</Button>
                    <Button type="submit">{selectedTx ? 'Salvar Alterações' : 'Confirmar'}</Button>
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

      {/* Modal de Exclusão */}
      {isDeleteModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2 style={{ color: '#f44336' }}>Confirmar Exclusão</h2>
                <p style={{ color: 'var(--foreground)' }}>Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
                <div style={{ margin: '1rem 0' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--gold-primary)', fontWeight: '600' }}>Justificativa da Exclusão</label>
                  <textarea 
                    className={styles.justificationArea}
                    placeholder="Justifique a exclusão desta transação..."
                    required
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setJustification(''); }}>Cancelar</Button>
                  <Button style={{ backgroundColor: '#f44336', color: '#fff' }} onClick={handleConfirmDelete}>Confirmar Exclusão</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal de Importação */}

      {isImportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '800px' }}>
            <Card>
              <div className={styles.modalContent}>
                <h2>Confirmar Importação de Extrato</h2>
                <p>Selecione as transações que deseja importar para o banco:</p>
                <select 
                  className={styles.select}
                  value={importBankId}
                  onChange={(e) => setImportBankId(e.target.value)}
                  style={{ marginBottom: '1rem' }}
                >
                  {banks.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                
                <div className={styles.tableWrapper} style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição Extrato</th>
                        <th>Valor</th>
                        <th>Ação Proposta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((item, idx) => (
                        <tr key={idx} style={{ background: item.reconcileWithId ? 'rgba(212, 175, 55, 0.05)' : 'transparent' }}>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td>
                            <div style={{ fontWeight: '600' }}>{item.description}</div>
                            {item.reconcileWithId && (
                              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--gold-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                🔗 Conciliar com: <span style={{ textDecoration: 'underline' }}>{item.reconcileWithDesc}</span>
                              </div>
                            )}
                          </td>
                          <td className={item.amount > 0 ? styles.income : styles.expense}>
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
                                color: item.reconcileWithId ? 'var(--gold-primary)' : 'inherit' 
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
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
                        load()
                      } else {
                        alert(res.error)
                      }
                    }}
                  >
                    {importing ? 'Importando...' : `Importar ${importPreview.filter(p => p.selected !== false).length} Transações`}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      {/* Modal de Logs de Auditoria */}
      {isLogModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '900px' }}>
            <Card>
              <div className={styles.modalContent}>
                <h2>📜 Histórico de Alterações e Auditoria</h2>
                <p>Registros de modificações críticas no sistema financeiro.</p>
                
                <div className={styles.tableWrapper} style={{ maxHeight: '500px', overflowY: 'auto' }}>
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
                            <td style={{ fontSize: '0.85rem' }}>{new Date(log.createdAt).toLocaleString()}</td>
                            <td style={{ fontWeight: '600' }}>{log.user.name}</td>
                            <td>
                              <span className={styles.statsBadge} style={{ 
                                backgroundColor: log.action.includes('DELETE') ? 'var(--error)' : 'var(--gold-primary)',
                                color: '#fff'
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {log.details?.justification || JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <Button variant="secondary" onClick={() => setIsLogModalOpen(false)}>Fechar</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
