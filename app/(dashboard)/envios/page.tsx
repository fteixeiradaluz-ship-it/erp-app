'use client'

import React, { useState, useEffect } from 'react'
import styles from './envios.module.css'
import { getShippingSales, updateShippingStatus } from '@/app/actions/shippingActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function EnviosPage() {
  const [sales, setSales] = useState<any[]>([])
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMonth, setLoadingMonth] = useState(false)

  // Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [reportSales, setReportSales] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)

  // Calendar state
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  // Years from 2024 to 2035
  const years = Array.from({ length: 12 }, (_, i) => 2024 + i)

  useEffect(() => {
    loadMonthlySales()
  }, [currentYear, currentMonth])

  useEffect(() => {
    loadDailySales()
  }, [selectedDate])

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

  const loadMonthlySales = async () => {
    setLoadingMonth(true)
    const start = new Date(currentYear, currentMonth, 1)
    start.setHours(0,0,0,0)
    const end = new Date(currentYear, currentMonth + 1, 0)
    end.setHours(23,59,59,999)

    const res = await getShippingSales(start, end)
    if (res.success) setMonthlySales(res.sales)
    setLoadingMonth(false)
  }

  const loadDailySales = async () => {
    setLoading(true)
    const start = new Date(selectedDate)
    start.setHours(0,0,0,0)
    const end = new Date(selectedDate)
    end.setHours(23,59,59,999)

    const res = await getShippingSales(start, end)
    if (res.success) setSales(res.sales)
    setLoading(false)
  }

  const toggleStatus = async (saleId: string, field: string, currentValue: boolean) => {
    const res = await updateShippingStatus(saleId, { [field]: !currentValue })
    if (res.success) {
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, [field]: !currentValue } : s))
      // Also update monthlySales to keep dots and checkboxes synced
      setMonthlySales(prev => prev.map(s => s.id === saleId ? { ...s, [field]: !currentValue } : s))
    }
  }

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(prev => prev - 1)
    } else {
      setCurrentMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(prev => prev + 1)
    } else {
      setCurrentMonth(prev => prev + 1)
    }
  }

  // Calendar cells calculation
  const getCalendarCells = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const cells = []

    // Previous month cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = new Date(currentYear, currentMonth - 1, day)
      cells.push({ day, isCurrentMonth: false, date })
    }

    // Current month cells
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const date = new Date(currentYear, currentMonth, i)
      cells.push({ day: i, isCurrentMonth: true, date })
    }

    // Next month cells to fill 42 spaces
    const totalSlots = 42
    const remainingSlots = totalSlots - cells.length
    for (let i = 1; i <= remainingSlots; i++) {
      const date = new Date(currentYear, currentMonth + 1, i)
      cells.push({ day: i, isCurrentMonth: false, date })
    }

    return cells
  }

  const hasSalesOnDate = (cellDate: Date) => {
    return monthlySales.some(sale => {
      const saleDate = new Date(sale.createdAt)
      return saleDate.getDate() === cellDate.getDate() &&
             saleDate.getMonth() === cellDate.getMonth() &&
             saleDate.getFullYear() === cellDate.getFullYear()
    })
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear()
  }

  const formatDateString = (d: Date) => {
    return d.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const calendarCells = getCalendarCells()

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
        {/* COL 1: Calendar Side */}
        <aside className={styles.calendarArea}>
          <div className={styles.calendarCard}>
            <div className={styles.calendarHeader}>
              <button onClick={handlePrevMonth} className={styles.calendarNavBtn}>&lt;</button>
              
              <div className={styles.calendarSelectors}>
                <select 
                  value={currentMonth} 
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className={styles.calendarSelect}
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                
                <select 
                  value={currentYear} 
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className={styles.calendarSelect}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button onClick={handleNextMonth} className={styles.calendarNavBtn}>&gt;</button>
            </div>

            <div className={styles.weekdaysGrid}>
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            <div className={styles.daysGrid}>
              {calendarCells.map((cell, idx) => {
                const cellIsSelected = isSameDay(cell.date, selectedDate)
                const cellIsToday = isSameDay(cell.date, today)
                const cellHasSales = hasSalesOnDate(cell.date)

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.date)
                      // If user clicks a day in prev/next month, auto-adjust the view month
                      if (cell.date.getMonth() !== currentMonth) {
                        setCurrentMonth(cell.date.getMonth())
                        setCurrentYear(cell.date.getFullYear())
                      }
                    }}
                    className={`
                      ${styles.calendarCell} 
                      ${cell.isCurrentMonth ? styles.currentMonthDay : styles.otherMonthDay}
                      ${cellIsSelected ? styles.selectedDay : ''}
                      ${cellIsToday ? styles.today : ''}
                    `}
                  >
                    <span>{cell.day}</span>
                    {cellHasSales && <span className={styles.hasSalesDot}></span>}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* COL 2: Shipping List Side */}
        <main className={styles.listArea}>
          <h2 className={styles.selectedDateTitle}>
            📅 {formatDateString(selectedDate)}
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
