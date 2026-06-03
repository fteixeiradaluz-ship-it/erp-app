'use client'

import React, { useState, useEffect } from 'react'
import styles from './envios.module.css'
import { getShippingSales, updateShippingStatus } from '@/app/actions/shippingActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function EnviosPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [reportSales, setReportSales] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)

  // Date range state
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [startDate, setStartDate] = useState<string>(todayStr)
  const [endDate, setEndDate] = useState<string>(todayStr)

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  // Years from 2024 to 2035
  const years = Array.from({ length: 12 }, (_, i) => 2024 + i)

  useEffect(() => {
    loadRangeSales()
  }, [startDate, endDate])

  useEffect(() => {
    if (isReportModalOpen) {
      loadReportSales()
    }
  }, [isReportModalOpen, reportStartDate, reportEndDate])

  const loadReportSales = async () => {
    setReportLoading(true)
    let start: Date | undefined = undefined
    let end: Date | undefined = undefined

    if (reportStartDate) {
      start = new Date(reportStartDate)
      start.setHours(0, 0, 0, 0)
    }
    if (reportEndDate) {
      end = new Date(reportEndDate)
      end.setHours(23, 59, 59, 999)
    }

    const res = await getShippingSales(start, end)
    if (res.success) {
      setReportSales(res.sales)
    }
    setReportLoading(false)
  }

  const loadRangeSales = async () => {
    setLoading(true)
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')
    const res = await getShippingSales(start, end)
    if (res.success) setSales(res.sales)
    setLoading(false)
  }

  const toggleStatus = async (saleId: string, field: string, currentValue: boolean) => {
    const res = await updateShippingStatus(saleId, { [field]: !currentValue })
    if (res.success) {
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, [field]: !currentValue } : s))
    }
  }

  // Format range label
  const formatDate = (str: string) => {
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
  }
  const isSameRange = startDate === endDate

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>📦 Gestão de Envios</h1>
          <p>Controle de Notas Fiscais, Etiquetas e Despacho</p>
        </div>
        <Button onClick={() => setIsReportModalOpen(true)}>📊 Gerar Relatório de Envios</Button>
      </header>

      <div className={styles.layoutGrid}>
        {/* COL 1: Date Range Picker */}
        <aside className={styles.calendarArea}>
          <div className={styles.calendarCard}>
            <div className={styles.rangeHeader}>
              <span className={styles.rangeIcon}>📅</span>
              <span className={styles.rangeTitle}>Filtrar por Período</span>
            </div>

            <div className={styles.rangeFields}>
              <div className={styles.rangeField}>
                <label className={styles.rangeLabel}>Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.rangeArrow}>→</div>

              <div className={styles.rangeField}>
                <label className={styles.rangeLabel}>Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            {/* Quick presets */}
            <div className={styles.presets}>
              <button
                className={styles.presetBtn}
                onClick={() => { setStartDate(todayStr); setEndDate(todayStr) }}
              >
                Hoje
              </button>
              <button
                className={styles.presetBtn}
                onClick={() => {
                  const d = new Date(today)
                  d.setDate(d.getDate() - 6)
                  setStartDate(d.toISOString().split('T')[0])
                  setEndDate(todayStr)
                }}
              >
                7 dias
              </button>
              <button
                className={styles.presetBtn}
                onClick={() => {
                  const d = new Date(today)
                  d.setDate(d.getDate() - 29)
                  setStartDate(d.toISOString().split('T')[0])
                  setEndDate(todayStr)
                }}
              >
                30 dias
              </button>
              <button
                className={styles.presetBtn}
                onClick={() => {
                  const first = new Date(today.getFullYear(), today.getMonth(), 1)
                  setStartDate(first.toISOString().split('T')[0])
                  setEndDate(todayStr)
                }}
              >
                Este mês
              </button>
            </div>

            {/* Summary badge */}
            <div className={styles.rangeSummary}>
              <span className={styles.rangeSummaryCount}>{loading ? '...' : sales.length}</span>
              <span className={styles.rangeSummaryLabel}>
                {sales.length === 1 ? 'envio encontrado' : 'envios encontrados'}
              </span>
            </div>
          </div>
        </aside>

        {/* COL 2: Shipping List Side */}
        <main className={styles.listArea}>
          <h2 className={styles.selectedDateTitle}>
            {isSameRange
              ? `📅 ${formatDate(startDate)}`
              : `📅 ${formatDate(startDate)} → ${formatDate(endDate)}`
            }
          </h2>

          <div className={styles.salesGrid}>
            {loading ? (
              <div className={styles.loading}>Carregando encomendas para este dia...</div>
            ) : sales.length === 0 ? (
              <div className={styles.empty}>
                Nenhuma venda encontrada para esta data. Navegue no calendário para escolher outra data.
              </div>
            ) : sales.map(sale => (
              <Card key={sale.id} className={`${styles.saleCard} ${sale.isSent ? styles.sent : ''}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.customerInfo}>
                    <h3>{sale.customer.name}</h3>
                    <span>CPF: {sale.customer.cpf || 'Não informado'}</span>
                  </div>
                  <div className={styles.saleBadge}>
                    #{sale.id.slice(-6).toUpperCase()}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.section}>
                    <h4>📍 Endereço de Entrega</h4>
                    <p>{sale.customer.address}, {sale.customer.number}</p>
                    <p>{sale.customer.neighborhood} - {sale.customer.city}</p>
                    {sale.customer.complement && <p><small>({sale.customer.complement})</small></p>}
                  </div>

                  <div className={styles.section}>
                    <h4>🛒 Produtos</h4>
                    <ul className={styles.productList}>
                      {sale.items.map((item: any) => (
                        <li key={item.id}>
                          {item.quantity}x {item.product.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {sale.customer.shippingNotes && (
                    <div className={styles.notes}>
                      <strong>📝 Obs. Envio:</strong>
                      <p>{sale.customer.shippingNotes}</p>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.checklist}>
                    <label className={styles.checkItem}>
                      <input 
                        type="checkbox" 
                        checked={sale.nfGenerated} 
                        onChange={() => toggleStatus(sale.id, 'nfGenerated', sale.nfGenerated)} 
                      />
                      NF Gerada
                    </label>
                    <label className={styles.checkItem}>
                      <input 
                        type="checkbox" 
                        checked={sale.labelGenerated} 
                        onChange={() => toggleStatus(sale.id, 'labelGenerated', sale.labelGenerated)} 
                      />
                      Etiqueta Gerada
                    </label>
                    <label className={styles.checkItem}>
                      <input 
                        type="checkbox" 
                        checked={sale.isSent} 
                        onChange={() => toggleStatus(sale.id, 'isSent', sale.isSent)} 
                      />
                      Enviado
                    </label>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>

      {isReportModalOpen && (
        <div className={styles.modalOverlay} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className={styles.reportModal} style={{
            background: 'var(--background)',
            border: '1px solid var(--border-gold)',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            padding: '1.5rem',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <h2 style={{ margin: 0, color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📊 Relatório Geral de Envios
              </h2>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {/* Filtros */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(212,175,55,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data Início</label>
                <input 
                  type="date" 
                  value={reportStartDate} 
                  onChange={(e) => setReportStartDate(e.target.value)}
                  style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data Fim</label>
                <input 
                  type="date" 
                  value={reportEndDate} 
                  onChange={(e) => setReportEndDate(e.target.value)}
                  style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status de Envio</label>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value as any)}
                  style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="all">Todos os Envios</option>
                  <option value="pending">⏳ Pendentes (Não Enviados)</option>
                  <option value="completed">🚚 Finalizados (Enviados)</option>
                </select>
              </div>
            </div>

            {/* Conteúdo da Tabela */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(212,175,55,0.06)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.8rem' }}>Data Venda</th>
                    <th style={{ padding: '0.8rem' }}>Cliente</th>
                    <th style={{ padding: '0.8rem' }}>Destinatário / Endereço</th>
                    <th style={{ padding: '0.8rem' }}>Produtos</th>
                    <th style={{ padding: '0.8rem' }}>Documentação</th>
                    <th style={{ padding: '0.8rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Carregando dados de envio...
                      </td>
                    </tr>
                  ) : reportSales.filter(sale => {
                    if (reportStatusFilter === 'pending') return !sale.isSent;
                    if (reportStatusFilter === 'completed') return sale.isSent;
                    return true;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        Nenhum envio encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    reportSales.filter(sale => {
                      if (reportStatusFilter === 'pending') return !sale.isSent;
                      if (reportStatusFilter === 'completed') return sale.isSent;
                      return true;
                    }).map(sale => {
                      return (
                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>
                            {sale.customer.name}
                            <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                              CPF: {sale.customer.cpf || 'Não informado'}
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                            <div>{sale.customer.address}, {sale.customer.number}</div>
                            <div style={{ fontSize: '0.75rem' }}>{sale.customer.neighborhood} - {sale.customer.city}</div>
                          </td>
                          <td style={{ padding: '0.8rem', fontSize: '0.8rem' }}>
                            <ul style={{ margin: 0, paddingLeft: '1rem', listStyleType: 'circle' }}>
                              {sale.items.map((i: any) => (
                                <li key={i.id}>{i.quantity}x {i.product.name}</li>
                              ))}
                            </ul>
                          </td>
                          <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: sale.nfGenerated ? 'rgba(46,125,50,0.1)' : 'rgba(211,47,47,0.1)', color: sale.nfGenerated ? 'var(--success)' : 'var(--error)', marginRight: '0.3rem' }}>
                              {sale.nfGenerated ? '✓ NF' : '✗ NF'}
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: sale.labelGenerated ? 'rgba(46,125,50,0.1)' : 'rgba(211,47,47,0.1)', color: sale.labelGenerated ? 'var(--success)' : 'var(--error)' }}>
                              {sale.labelGenerated ? '✓ Etiqueta' : '✗ Etiqueta'}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.3rem 0.6rem', 
                              borderRadius: '99px', 
                              fontWeight: 'bold',
                              background: sale.isSent ? 'rgba(46,125,50,0.1)' : 'rgba(230,81,0,0.1)', 
                              color: sale.isSent ? 'var(--success)' : 'var(--warning)' 
                            }}>
                              {sale.isSent ? '🚚 Enviado' : '⏳ Pendente'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé Ações */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                Total de encomendas: <span style={{ color: 'var(--gold-primary)' }}>
                  {reportSales.filter(sale => {
                    if (reportStatusFilter === 'pending') return !sale.isSent;
                    if (reportStatusFilter === 'completed') return sale.isSent;
                    return true;
                  }).length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>
                  Fechar
                </Button>
                <Button variant="secondary" onClick={() => {
                  const filtered = reportSales.filter(sale => {
                    if (reportStatusFilter === 'pending') return !sale.isSent;
                    if (reportStatusFilter === 'completed') return sale.isSent;
                    return true;
                  });
                  if (filtered.length === 0) return alert('Sem dados para exportar');
                  let csv = 'data:text/csv;charset=utf-8,';
                  csv += 'Data Venda,Cliente,CPF,Endereco,Bairro,Cidade,Produtos,NF Gerada,Etiqueta Gerada,Status\n';
                  filtered.forEach(sale => {
                    const productsStr = sale.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(' | ');
                    const addressStr = `"${sale.customer.address || ''}, ${sale.customer.number || ''}"`;
                    csv += `${new Date(sale.createdAt).toLocaleDateString('pt-BR')},${sale.customer.name},${sale.customer.cpf || ''},${addressStr},${sale.customer.neighborhood || ''},${sale.customer.city || ''},"${productsStr}",${sale.nfGenerated ? 'Sim' : 'Nao'},${sale.labelGenerated ? 'Sim' : 'Nao'},${sale.isSent ? 'Enviado' : 'Pendente'}\n`;
                  });
                  const link = document.createElement('a');
                  link.setAttribute('href', encodeURI(csv));
                  link.setAttribute('download', `relatorio_envios_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  📤 Exportar CSV
                </Button>
                <Button onClick={() => {
                  window.print();
                }}>
                  🖨️ Imprimir Relatório
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
