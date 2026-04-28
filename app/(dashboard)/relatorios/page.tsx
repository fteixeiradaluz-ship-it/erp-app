'use client'

import React, { useState, useEffect } from 'react'
import styles from './relatorios.module.css'
import { getSalesReport, getInventoryReport, getFinancialReport, getAppointmentsReport } from '@/app/actions/reportActions'
import { getSettings } from '@/app/actions/settingsActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

type TabType = 'sales' | 'inventory' | 'financial' | 'appointments' | 'shipping'

export default function RelatoriosPage() {
  const [role, setRole] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [globalCommission, setGlobalCommission] = useState(0)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sellerFilter, setSellerFilter] = useState('')

  useEffect(() => {
    async function detectRole() {
      const res = await getSalesReport()
      if (res && 'role' in res) setRole(res.role as string)
    }
    detectRole()
  }, [])

  useEffect(() => {
    if (!role) return
    load()
  }, [activeTab, startDate, endDate, role])

  async function load() {
    setLoading(true)

    if (activeTab === 'sales' && globalCommission === 0) {
      const settingsRes = await getSettings()
      if (settingsRes.success) {
        setGlobalCommission(settingsRes.settings.commissionPercentage || 0)
      }
    }

    let res: any
    if (activeTab === 'sales') res = await getSalesReport(startDate, endDate)
    else if (activeTab === 'inventory') res = await getInventoryReport()
    else if (activeTab === 'financial') res = await getFinancialReport(startDate, endDate)
    else if (activeTab === 'appointments') res = await getAppointmentsReport(startDate, endDate)
    else if (activeTab === 'shipping') {
      const { getShippingReport } = await import('@/app/actions/reportActions')
      res = await getShippingReport(startDate, endDate)
    }

    if (res?.success) {
      if (activeTab === 'sales') setData(res.sales)
      else if (activeTab === 'inventory') setData(res.products)
      else if (activeTab === 'financial') setData(res.transactions)
      else if (activeTab === 'appointments') setData(res.appointments)
      else if (activeTab === 'shipping') setData(res.shipments)
    } else {
      setData([])
    }
    setLoading(false)
  }

  const exportCSV = () => {
    if (data.length === 0) return alert('Sem dados para exportar')
    let csvContent = 'data:text/csv;charset=utf-8,'

    if (activeTab === 'sales') {
      csvContent += 'Data,Cliente,Itens,Vendedor,Metodo,Comissao,Total\n'
      const filtered = sellerFilter ? data.filter(s => s.user.name === sellerFilter) : data
      filtered.forEach((s: any) => {
        const comm = s.user.commissionPercent !== null ? s.user.commissionPercent : globalCommission
        const commVal = s.totalAmount * (comm / 100)
        const items = s.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(' | ')
        csvContent += `${new Date(s.createdAt).toLocaleDateString()},${s.customer.name},"${items}",${s.user.name},${s.paymentMethod},${commVal.toFixed(2)},${s.totalAmount}\n`
      })
    } else if (activeTab === 'inventory') {
      csvContent += 'Produto,Estoque,Custo,Venda,Fornecedor\n'
      data.forEach((p: any) => {
        csvContent += `${p.name},${p.stock},${p.cost},${p.price},${p.supplier?.name || '---'}\n`
      })
    } else if (activeTab === 'financial') {
      csvContent += 'Data,Descricao,Banco,Tipo,Valor\n'
      data.forEach((t: any) => {
        csvContent += `${new Date(t.createdAt).toLocaleDateString()},${t.description},${t.bank.name},${t.type},${t.amount}\n`
      })
    } else if (activeTab === 'appointments') {
      csvContent += 'Data,Hora,Cliente,Telefone,Status,Retorno\n'
      data.forEach((a: any) => {
        const dt = new Date(a.date)
        csvContent += `${dt.toLocaleDateString()},${dt.toLocaleTimeString()},${a.customer.name},${a.customer.phone || '---'},${a.status},${a.isReturn ? 'Sim' : 'Não'}\n`
      })
    } else if (activeTab === 'shipping') {
      csvContent += 'Data,Cliente,Telefone,Vendedor,NF,Etiqueta\n'
      data.forEach((s: any) => {
        csvContent += `${new Date(s.createdAt).toLocaleDateString()},${s.customer.name},${s.customer.phone || '---'},${s.user.name},${s.nfGenerated ? 'Sim' : 'Não'},${s.labelGenerated ? 'Sim' : 'Não'}\n`
      })
    }

    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `relatorio_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isAdmin = role === 'ADMIN'
  const isSecretary = role === 'SECRETARY'
  const isSeller = role === 'SELLER'

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📊 Central de Relatórios</h1>
        {role && (
          <span style={{
            fontSize: '0.75rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '99px',
            background: isAdmin ? 'var(--gold-light)' : 'rgba(2, 136, 209, 0.1)',
            color: isAdmin ? 'var(--gold-primary)' : 'var(--info)',
            border: `1px solid ${isAdmin ? 'var(--border-gold)' : 'rgba(2, 136, 209, 0.2)'}`,
            marginLeft: '1rem'
          }}>
            {isAdmin ? '🛡️ Visualização: ADMIN (Completa)' : isSecretary ? '📋 Visualização: Secretária' : '👤 Visualização: Minhas vendas'}
          </span>
        )}
      </header>

      <div className={styles.tabs}>
        <div
          className={`${styles.tab} ${activeTab === 'sales' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          🛒 {isAdmin ? 'Vendas (Todos)' : 'Minhas Vendas'}
        </div>

        {(isAdmin || isSeller) && (
          <div
            className={`${styles.tab} ${activeTab === 'shipping' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            📦 Envios Finalizados
          </div>
        )}

        {(isAdmin || isSecretary) && (
          <div
            className={`${styles.tab} ${activeTab === 'appointments' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📅 Agenda
          </div>
        )}

        {isAdmin && (
          <div
            className={`${styles.tab} ${activeTab === 'inventory' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Estoque
          </div>
        )}

        {isAdmin && (
          <div
            className={`${styles.tab} ${activeTab === 'financial' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('financial')}
          >
            💰 Financeiro
          </div>
        )}
      </div>

      <Card className={styles.filters}>
        <Input
          label="Data Início"
          type="date"
          disabled={activeTab === 'inventory'}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="Data Fim"
          type="date"
          disabled={activeTab === 'inventory'}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {activeTab === 'sales' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filtrar por Vendedor</label>
            <select
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)' }}
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
            >
              <option value="">Todos os vendedores</option>
              {Array.from(new Set(data.map(s => s.user?.name).filter(Boolean))).map((name: any) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        <Button variant="secondary" onClick={() => { setStartDate(''); setEndDate(''); setSellerFilter('') }}>
          Limpar Filtros
        </Button>
        <Button onClick={exportCSV}>📤 Exportar CSV</Button>
      </Card>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          {activeTab === 'sales' && (
            <>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Itens Comprados</th>
                  {isAdmin && <th>Vendedor</th>}
                  <th>Método</th>
                  <th>Minha Comissão</th>
                  {isAdmin && <th>Total Venda</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 7 : 5} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma venda encontrada.</td></tr>
                ) : data.filter(s => sellerFilter ? s.user.name === sellerFilter : true).map(s => {
                  const comm = s.user.commissionPercent !== null ? s.user.commissionPercent : globalCommission
                  const commVal = s.totalAmount * (comm / 100)
                  return (
                    <tr key={s.id}>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td>{s.customer.name}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                        {s.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(', ')}
                      </td>
                      {isAdmin && <td>{s.user.name} <span style={{ fontSize: '0.7em', color: '#888' }}>({comm}%)</span></td>}
                      <td>{s.paymentMethod}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatCurrency(commVal)}</td>
                      {isAdmin && <td style={{ fontWeight: 'bold', color: 'var(--gold-primary)' }}>{formatCurrency(s.totalAmount)}</td>}
                    </tr>
                  )
                })}

                {!loading && data.length > 0 && (
                  <tr style={{ background: 'rgba(212,175,55,0.08)', fontWeight: 'bold' }}>
                    <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'right', color: '#aaa' }}>
                      {sellerFilter ? `Total comissão de ${sellerFilter}:` : 'Total das minhas comissões:'}
                    </td>
                    <td style={{ color: 'var(--success)', fontSize: '1.05rem' }}>
                      {formatCurrency(
                        data
                          .filter(s => sellerFilter ? s.user.name === sellerFilter : true)
                          .reduce((acc, s) => {
                            const comm = s.user.commissionPercent !== null ? s.user.commissionPercent : globalCommission
                            return acc + s.totalAmount * (comm / 100)
                          }, 0)
                      )}
                    </td>
                    {isAdmin && <td></td>}
                  </tr>
                )}
              </tbody>
            </>
          )}

          {activeTab === 'shipping' && (
            <>
              <thead>
                <tr>
                  <th>Data Venda</th>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>Vendedor</th>
                  <th>Status Documentação</th>
                  <th>Status Envio</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum envio finalizado encontrado.</td></tr>
                ) : data.map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '600' }}>{s.customer.name}</td>
                    <td>{s.customer.phone || '---'}</td>
                    <td>{s.user.name}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem' }}>
                        {s.nfGenerated ? '✅ NF' : '❌ NF'} | {s.labelGenerated ? '✅ Etiqueta' : '❌ Etiqueta'}
                      </span>
                    </td>
                    <td><span style={{ color: 'var(--success)', fontWeight: 'bold' }}>🚚 ENVIADO</span></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === 'appointments' && (
            <>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Retorno?</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Nenhuma consulta no período.</td></tr>
                ) : data.map((a: any) => {
                  const dt = new Date(a.date)
                  const statusColor = a.status === 'COMPLETED' ? 'var(--success)' : a.status === 'CANCELLED' ? 'var(--error)' : 'var(--gold-primary)'
                  const statusLabel = a.status === 'COMPLETED' ? 'Realizada' : a.status === 'CANCELLED' ? 'Cancelada' : 'Agendada'
                  return (
                    <tr key={a.id}>
                      <td>{dt.toLocaleDateString()}</td>
                      <td>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ fontWeight: '600' }}>{a.customer.name}</td>
                      <td>{a.customer.phone || '---'}</td>
                      <td><span style={{ color: statusColor, fontWeight: 'bold' }}>{statusLabel}</span></td>
                      <td style={{ color: a.isReturn ? 'var(--info)' : 'var(--text-secondary)' }}>{a.isReturn ? '🔄 Sim' : 'Não'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Fornecedor</th>
                  <th>Custo</th>
                  <th>Preço Venda</th>
                  <th>Estoque</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.supplier?.name || '---'}</td>
                    <td>{formatCurrency(p.cost)}</td>
                    <td>{formatCurrency(p.price)}</td>
                    <td style={{ fontWeight: 'bold', color: p.stock <= 5 ? 'var(--error)' : 'inherit' }}>
                      {p.stock <= 5 ? `⚠️ ${p.stock}` : p.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === 'financial' && (
            <>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Banco</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma transação encontrada.</td></tr>
                ) : data.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>{t.description}</td>
                    <td>{t.bank.name}</td>
                    <td>{t.type === 'INCOME' ? 'Receita' : 'Despesa'}</td>
                    <td style={{ fontWeight: 'bold', color: t.type === 'INCOME' ? 'var(--success)' : 'var(--error)' }}>
                      {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </div>
  )
}
