'use client'

import React, { useState, useEffect } from 'react'
import styles from './relatorios.module.css'
import { getSalesReport, getInventoryReport, getFinancialReport, getAppointmentsReport } from '@/app/actions/reportActions'
import { getSettings } from '@/app/actions/settingsActions'
import { deleteSale } from '@/app/actions/saleActions'
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

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<TabType, string[]>>({
    sales: ['date', 'customer', 'items', 'seller', 'method', 'commission', 'total', 'actions'],
    inventory: ['product', 'supplier', 'cost', 'price', 'stock'],
    financial: ['date', 'description', 'bank', 'type', 'amount'],
    appointments: ['date', 'time', 'customer', 'phone', 'status', 'return'],
    shipping: ['date', 'customer', 'phone', 'seller', 'docs', 'status']
  })
  const [showColumnPicker, setShowColumnPicker] = useState(false)

  const columnsConfig: Record<TabType, { id: string, label: string }[]> = {
    sales: [
      { id: 'date', label: 'Data' },
      { id: 'customer', label: 'Cliente' },
      { id: 'items', label: 'Itens' },
      { id: 'seller', label: 'Vendedor' },
      { id: 'method', label: 'Método' },
      { id: 'commission', label: 'Comissão' },
      { id: 'total', label: 'Total' },
      { id: 'actions', label: 'Ações' }
    ],
    inventory: [
      { id: 'product', label: 'Produto' },
      { id: 'supplier', label: 'Fornecedor' },
      { id: 'cost', label: 'Custo' },
      { id: 'price', label: 'Preço' },
      { id: 'stock', label: 'Estoque' }
    ],
    financial: [
      { id: 'date', label: 'Data' },
      { id: 'description', label: 'Descrição' },
      { id: 'bank', label: 'Banco' },
      { id: 'type', label: 'Tipo' },
      { id: 'amount', label: 'Valor' }
    ],
    appointments: [
      { id: 'date', label: 'Data' },
      { id: 'time', label: 'Hora' },
      { id: 'customer', label: 'Cliente' },
      { id: 'phone', label: 'Telefone' },
      { id: 'status', label: 'Status' },
      { id: 'return', label: 'Retorno' }
    ],
    shipping: [
      { id: 'date', label: 'Data' },
      { id: 'customer', label: 'Cliente' },
      { id: 'phone', label: 'Telefone' },
      { id: 'seller', label: 'Vendedor' },
      { id: 'docs', label: 'Docs' },
      { id: 'status', label: 'Status' }
    ]
  }

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => {
      const current = prev[activeTab]
      if (current.includes(colId)) {
        return { ...prev, [activeTab]: current.filter(id => id !== colId) }
      } else {
        return { ...prev, [activeTab]: [...current, colId] }
      }
    })
  }

  const isColVisible = (colId: string) => visibleColumns[activeTab].includes(colId)

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showJustificationModal, setShowJustificationModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [justification, setJustification] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

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
      console.error("Load error:", res?.error)
      setData([])
      if (res?.error) alert(`Erro ao carregar dados: ${res.error}`)
    }
    setLoading(false)
  }

  async function handleDeleteSale() {
    if (!justification) return alert('Por favor, informe a justificativa.')
    setIsDeleting(true)
    const res = await deleteSale(selectedSale.id, justification)
    if (res.success) {
      alert('Venda excluída com sucesso.')
      setShowDeleteModal(false)
      setJustification('')
      load()
    } else {
      alert(res.error || 'Erro ao excluir venda.')
    }
    setIsDeleting(false)
  }

  const exportCSV = () => {
    if (data.length === 0) return alert('Sem dados para exportar')
    let csvContent = 'data:text/csv;charset=utf-8,'

    // Header based on visible columns
    const currentCols = columnsConfig[activeTab].filter(col => isColVisible(col.id))
    csvContent += currentCols.map(c => c.label).join(',') + '\n'

    data.forEach((item: any) => {
      const rowData: string[] = []
      
      currentCols.forEach(col => {
        if (activeTab === 'sales') {
          if (col.id === 'date') rowData.push(new Date(item.createdAt).toLocaleDateString())
          else if (col.id === 'customer') rowData.push(item.customer?.name || '---')
          else if (col.id === 'items') rowData.push(`"${item.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(' | ')}"`)
          else if (col.id === 'seller') rowData.push(item.user?.name || '---')
          else if (col.id === 'method') rowData.push(item.paymentMethod)
          else if (col.id === 'commission') {
             const comm = item.user.commissionPercent !== null ? item.user.commissionPercent : globalCommission
             rowData.push((item.totalAmount * (comm / 100)).toFixed(2))
          }
          else if (col.id === 'total') rowData.push(item.totalAmount.toString())
        }
        else if (activeTab === 'inventory') {
          if (col.id === 'product') rowData.push(item.name)
          else if (col.id === 'supplier') rowData.push(item.supplier?.name || '---')
          else if (col.id === 'cost') rowData.push(item.cost.toString())
          else if (col.id === 'price') rowData.push(item.price.toString())
          else if (col.id === 'stock') rowData.push(item.stock.toString())
        }
        else if (activeTab === 'financial') {
          if (col.id === 'date') rowData.push(new Date(item.createdAt).toLocaleDateString())
          else if (col.id === 'description') rowData.push(`"${item.description}"`)
          else if (col.id === 'bank') rowData.push(item.bank?.name || '---')
          else if (col.id === 'type') rowData.push(item.type)
          else if (col.id === 'amount') rowData.push(item.amount.toString())
        }
        else if (activeTab === 'appointments') {
          const dt = new Date(item.date)
          if (col.id === 'date') rowData.push(dt.toLocaleDateString())
          else if (col.id === 'time') rowData.push(dt.toLocaleTimeString())
          else if (col.id === 'customer') rowData.push(item.customer?.name || '---')
          else if (col.id === 'phone') rowData.push(item.customer?.phone || '---')
          else if (col.id === 'status') rowData.push(item.status)
          else if (col.id === 'return') rowData.push(item.isReturn ? 'Sim' : 'Não')
        }
        else if (activeTab === 'shipping') {
          if (col.id === 'date') rowData.push(new Date(item.createdAt).toLocaleDateString())
          else if (col.id === 'customer') rowData.push(item.customer?.name || '---')
          else if (col.id === 'phone') rowData.push(item.customer?.phone || '---')
          else if (col.id === 'seller') rowData.push(item.user?.name || '---')
          else if (col.id === 'docs') rowData.push(`${item.nfGenerated ? 'NF' : ''} ${item.labelGenerated ? 'Etiqueta' : ''}`)
          else if (col.id === 'status') rowData.push('ENVIADO')
        }
      })
      csvContent += rowData.join(',') + '\n'
    })

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
        <div style={{ position: 'relative' }}>
          <Button variant="secondary" onClick={() => setShowColumnPicker(!showColumnPicker)}>
            ⚙️ Colunas
          </Button>
          {showColumnPicker && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: '#fff',
              border: '1px solid var(--border-gold)',
              borderRadius: '8px',
              padding: '1rem',
              zIndex: 100,
              boxShadow: 'var(--shadow-md)',
              minWidth: '200px'
            }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', marginBottom: '0.8rem', borderBottom: '1px solid var(--background)', paddingBottom: '0.4rem' }}>
                Exibir Colunas
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                {columnsConfig[activeTab].map(col => (
                  <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isColVisible(col.id)} 
                      onChange={() => toggleColumn(col.id)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button onClick={exportCSV}>📤 Exportar CSV</Button>
      </Card>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          {activeTab === 'sales' && (
            <>
              <thead>
                <tr>
                  {isColVisible('date') && <th>Data</th>}
                  {isColVisible('customer') && <th>Cliente</th>}
                  {isColVisible('items') && <th>Itens Comprados</th>}
                  {isColVisible('seller') && isAdmin && <th>Vendedor</th>}
                  {isColVisible('method') && <th>Método</th>}
                  {isColVisible('commission') && <th>Minha Comissão</th>}
                  {isColVisible('total') && isAdmin && <th>Total Venda</th>}
                  {isColVisible('actions') && isAdmin && <th style={{ textAlign: 'center' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={visibleColumns.sales.length} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={visibleColumns.sales.length} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma venda encontrada.</td></tr>
                ) : data.filter(s => sellerFilter ? s.user.name === sellerFilter : true).map(s => {
                  const comm = s.user.commissionPercent !== null ? s.user.commissionPercent : globalCommission
                  const commVal = s.totalAmount * (comm / 100)
                  const isVoided = !!s.deletedAt

                  return (
                    <tr key={s.id} className={isVoided ? styles.voidedRow : ''}>
                      {isColVisible('date') && <td>{new Date(s.createdAt).toLocaleDateString()}</td>}
                      {isColVisible('customer') && (
                        <td>
                          {s.customer?.name || '---'}
                          {isVoided && <div style={{ fontSize: '0.7rem', color: '#ef4444', textDecoration: 'none' }}>ANULADA</div>}
                        </td>
                      )}
                      {isColVisible('items') && (
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                          {s.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(', ')}
                        </td>
                      )}
                      {isColVisible('seller') && isAdmin && <td>{s.user?.name || '---'} <span style={{ fontSize: '0.7em', color: '#888' }}>({comm}%)</span></td>}
                      {isColVisible('method') && <td>{s.paymentMethod}</td>}
                      {isColVisible('commission') && <td style={{ color: isVoided ? '#999' : 'var(--success)', fontWeight: 'bold' }}>{formatCurrency(commVal)}</td>}
                      {isColVisible('total') && isAdmin && <td style={{ fontWeight: 'bold', color: isVoided ? '#999' : 'var(--gold-primary)' }}>{formatCurrency(s.totalAmount)}</td>}
                      {isColVisible('actions') && isAdmin && (
                        <td className={styles.actionsCell} style={{ textAlign: 'center' }}>
                          {!isVoided ? (
                            <button 
                              className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                              title="Excluir Venda"
                              onClick={() => { setSelectedSale(s); setShowDeleteModal(true) }}
                            >
                              🗑️
                            </button>
                          ) : (
                            <button 
                              className={`${styles.actionBtn} ${styles.viewBtn}`} 
                              title="Ver Justificativa"
                              onClick={() => { setSelectedSale(s); setShowJustificationModal(true) }}
                            >
                              👁️
                            </button>
                          )}
                        </td>
                      )}
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
                          .filter(s => (sellerFilter ? s.user.name === sellerFilter : true) && !s.deletedAt)
                          .reduce((acc, s) => {
                            const comm = s.user.commissionPercent !== null ? s.user.commissionPercent : globalCommission
                            return acc + s.totalAmount * (comm / 100)
                          }, 0)
                      )}
                    </td>
                    {isAdmin && <td colSpan={2}></td>}
                  </tr>
                )}
              </tbody>
            </>
          )}

          {activeTab === 'shipping' && (
            <>
              <thead>
                <tr>
                  {isColVisible('date') && <th>Data Venda</th>}
                  {isColVisible('customer') && <th>Cliente</th>}
                  {isColVisible('phone') && <th>Telefone</th>}
                  {isColVisible('seller') && <th>Vendedor</th>}
                  {isColVisible('docs') && <th>Status Documentação</th>}
                  {isColVisible('status') && <th>Status Envio</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={visibleColumns.shipping.length} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={visibleColumns.shipping.length} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum envio finalizado encontrado.</td></tr>
                ) : data.map(s => (
                  <tr key={s.id}>
                    {isColVisible('date') && <td>{new Date(s.createdAt).toLocaleDateString()}</td>}
                    {isColVisible('customer') && <td style={{ fontWeight: '600' }}>{s.customer?.name || '---'}</td>}
                    {isColVisible('phone') && <td>{s.customer?.phone || '---'}</td>}
                    {isColVisible('seller') && <td>{s.user?.name || '---'}</td>}
                    {isColVisible('docs') && (
                      <td>
                        <span style={{ fontSize: '0.8rem' }}>
                          {s.nfGenerated ? '✅ NF' : '❌ NF'} | {s.labelGenerated ? '✅ Etiqueta' : '❌ Etiqueta'}
                        </span>
                      </td>
                    )}
                    {isColVisible('status') && <td><span style={{ color: 'var(--success)', fontWeight: 'bold' }}>🚚 ENVIADO</span></td>}
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === 'appointments' && (
            <>
              <thead>
                <tr>
                  {isColVisible('date') && <th>Data</th>}
                  {isColVisible('time') && <th>Hora</th>}
                  {isColVisible('customer') && <th>Cliente</th>}
                  {isColVisible('phone') && <th>Telefone</th>}
                  {isColVisible('status') && <th>Status</th>}
                  {isColVisible('return') && <th>Retorno?</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={visibleColumns.appointments.length} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={visibleColumns.appointments.length} style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Nenhuma consulta no período.</td></tr>
                ) : data.map((a: any) => {
                  const dt = new Date(a.date)
                  const statusColor = a.status === 'COMPLETED' ? 'var(--success)' : a.status === 'CANCELLED' ? 'var(--error)' : 'var(--gold-primary)'
                  const statusLabel = a.status === 'COMPLETED' ? 'Realizada' : a.status === 'CANCELLED' ? 'Cancelada' : 'Agendada'
                  return (
                    <tr key={a.id}>
                      {isColVisible('date') && <td>{dt.toLocaleDateString()}</td>}
                      {isColVisible('time') && <td>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>}
                      {isColVisible('customer') && <td style={{ fontWeight: '600' }}>{a.customer?.name || '---'}</td>}
                      {isColVisible('phone') && <td>{a.customer?.phone || '---'}</td>}
                      {isColVisible('status') && <td><span style={{ color: statusColor, fontWeight: 'bold' }}>{statusLabel}</span></td>}
                      {isColVisible('return') && <td style={{ color: a.isReturn ? 'var(--info)' : 'var(--text-secondary)' }}>{a.isReturn ? '🔄 Sim' : 'Não'}</td>}
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
                  {isColVisible('product') && <th>Produto</th>}
                  {isColVisible('supplier') && <th>Fornecedor</th>}
                  {isColVisible('cost') && <th>Custo</th>}
                  {isColVisible('price') && <th>Preço Venda</th>}
                  {isColVisible('stock') && <th>Estoque</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={visibleColumns.inventory.length} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.map(p => (
                  <tr key={p.id}>
                    {isColVisible('product') && <td>{p.name}</td>}
                    {isColVisible('supplier') && <td>{p.supplier?.name || '---'}</td>}
                    {isColVisible('cost') && <td>{formatCurrency(p.cost)}</td>}
                    {isColVisible('price') && <td>{formatCurrency(p.price)}</td>}
                    {isColVisible('stock') && (
                      <td style={{ fontWeight: 'bold', color: p.stock <= 5 ? 'var(--error)' : 'inherit' }}>
                        {p.stock <= 5 ? `⚠️ ${p.stock}` : p.stock}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === 'financial' && (
            <>
              <thead>
                <tr>
                  {isColVisible('date') && <th>Data</th>}
                  {isColVisible('description') && <th>Descrição</th>}
                  {isColVisible('bank') && <th>Banco</th>}
                  {isColVisible('type') && <th>Tipo</th>}
                  {isColVisible('amount') && <th>Valor</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={visibleColumns.financial.length} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={visibleColumns.financial.length} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma transação encontrada.</td></tr>
                ) : data.map(t => (
                  <tr key={t.id}>
                    {isColVisible('date') && <td>{new Date(t.createdAt).toLocaleDateString()}</td>}
                    {isColVisible('description') && <td>{t.description}</td>}
                    {isColVisible('bank') && <td>{t.bank?.name || '---'}</td>}
                    {isColVisible('type') && <td>{t.type === 'INCOME' ? 'Receita' : 'Despesa'}</td>}
                    {isColVisible('amount') && (
                      <td style={{ fontWeight: 'bold', color: t.type === 'INCOME' ? 'var(--success)' : 'var(--error)' }}>
                        {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>⚠️ Confirmar Exclusão</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
              Você está prestes a excluir a venda de <strong>{selectedSale?.customer.name}</strong> no valor de <strong>{formatCurrency(selectedSale?.totalAmount)}</strong>.
              <br/><br/>
              <strong>Esta ação irá:</strong>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Estornar o saldo no banco (se aplicável)</li>
                <li>Devolver os itens ao estoque</li>
                <li>Marcar a venda como anulada</li>
              </ul>
            </p>
            <Input 
              label="Justificativa (Obrigatório)"
              placeholder="Ex: Cliente desistiu da compra"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancelar</Button>
              <Button onClick={handleDeleteSale} disabled={isDeleting || !justification}>
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showJustificationModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>📄 Justificativa de Exclusão</h3>
            <p style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
              "{selectedSale?.deletionJustification || 'Sem justificativa informada.'}"
            </p>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.5rem' }}>
              Excluída em: {selectedSale?.deletedAt ? new Date(selectedSale.deletedAt).toLocaleString() : '---'}
            </div>
            <div className={styles.modalActions}>
              <Button onClick={() => setShowJustificationModal(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
