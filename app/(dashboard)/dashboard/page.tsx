'use client'

import React, { useState, useEffect } from 'react'
import styles from './dashboard.module.css'
import { getDashboardStats, getPendingPayables } from '@/app/actions/financialActions'
import { getAppointments } from '@/app/actions/appointmentActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/format'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([])
  const [payablesAlert, setPayablesAlert] = useState<{ overdue: number, upcoming: number }>({ overdue: 0, upcoming: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [res, apptRes, payablesRes] = await Promise.all([
        getDashboardStats(),
        getAppointments({
          startDate: new Date(),
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        }),
        getPendingPayables()
      ])
      
      if (res.success) {
        setData(res)
      }
      
      if (apptRes.success) {
        // Filter those within ~24h of from now, and only SCHEDULED
        const now = new Date()
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        
        const upcoming = apptRes.appointments.filter((a: any) => {
           const apptDate = new Date(a.date)
           return a.status === 'SCHEDULED' && apptDate >= now && apptDate <= oneDayFromNow
        })
        setUpcomingAppointments(upcoming)
      }

      if (payablesRes.success) {
        const today = new Date()
        today.setHours(0,0,0,0)
        const sevenDays = new Date(today)
        sevenDays.setDate(today.getDate() + 7)
        sevenDays.setHours(23,59,59,999)

        let overdue = 0
        let upcoming = 0
        payablesRes.transactions.forEach((t: any) => {
           const d = new Date(t.dueDate)
           if (d < today) overdue++
           else if (d >= today && d <= sevenDays) upcoming++
        })
        setPayablesAlert({ overdue, upcoming })
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados do dashboard...</div>

  const { stats, chartData, paymentMethodStats } = data
  const maxAmount = Math.max(...chartData.map((d: any) => d.amount), 100)

  // Donut Chart Calculation
  const paymentTotal = Object.values(paymentMethodStats || {}).reduce((a: any, b: any) => a + Number(b), 0) as number
  const circumference = 2 * Math.PI * 70
  
  let currentOffset = 0
  const donutSlices = Object.entries(paymentMethodStats || {}).map(([method, value], i) => {
    const percentage = paymentTotal > 0 ? (Number(value) / paymentTotal) : 0
    const dashArray = `${percentage * circumference} ${circumference}`
    const offset = currentOffset
    currentOffset -= (percentage * circumference)
    
    const colors: Record<string, string> = { 'PIX': '#4caf50', 'A_VISTA': 'var(--gold-primary)', 'CARTAO': '#2196f3' }
    const labels: Record<string, string> = { 'PIX': 'PIX', 'A_VISTA': 'Dinheiro', 'CARTAO': 'Cartão (A Receber)' }

    return { 
      method, 
      label: labels[method] || method, 
      value: Number(value), 
      dashArray, 
      offset, 
      color: colors[method] || '#888'
    }
  })

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📊 Visão Geral do Negócio</h1>
        <p style={{ color: '#888' }}>Confira os resultados dos últimos 30 dias.</p>
      </header>

      <section className={styles.statsGrid}>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Faturamento Bruto</span>
          <span className={styles.kpiValue} style={{ color: 'var(--gold-primary)' }}>
            {formatCurrency(stats.totalRevenue)}
          </span>
          <span className={styles.kpiTrend}>Ult. 30 dias</span>
        </Card>

        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Lucro Estimado</span>
          <span className={styles.kpiValue} style={{ color: '#4caf50' }}>
            {formatCurrency(stats.estProfit)}
          </span>
          <span className={styles.kpiTrend}>Volume de Vendas: {stats.saleCount}</span>
        </Card>

        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>A Receber (Cartão)</span>
          <span className={styles.kpiValue}>
            {formatCurrency(stats.pendingAmount)}
          </span>
          <span className={styles.kpiTrend}>Próximos 30 dias</span>
        </Card>

        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>A Pagar (Despesas)</span>
          <span className={styles.kpiValue} style={{ color: '#d97706' }}>
            {formatCurrency(stats.payableAmount)}
          </span>
          <span className={styles.kpiTrend}>Próximos 30 dias</span>
        </Card>
      </section>

      <section className={styles.chartsGrid}>
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Faturamento Diário</h3>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Resumo últimos 30 dias</span>
          </div>

          <div className={styles.chartContainer}>
            {chartData.length === 0 ? (
              <div className={styles.emptyState}>Sem dados de vendas para o período.</div>
            ) : (
              chartData.map((d: any, i: number) => {
                const heightPercentage = (d.amount / maxAmount) * 100
                const day = d.date.split('-')[2]
                
                return (
                  <div key={d.date} className={styles.barWrapper}>
                    <div className={styles.barTooltip}>
                      {new Date(d.date).toLocaleDateString('pt-BR')} <br/>
                      <strong>{formatCurrency(d.amount)}</strong>
                    </div>
                    <div 
                      className={styles.bar} 
                      style={{ height: `${Math.max(heightPercentage, 2)}%` }}
                    ></div>
                    {i % 5 === 0 && (
                      <span className={styles.axisLabel}>{day}/{d.date.split('-')[1]}</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Métodos de Pagamento</h3>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Distribuição de receita</span>
          </div>

          <div className={styles.donutSection}>
             <div className={styles.donutContainer}>
                <svg width="180" height="180" viewBox="0 0 180 180">
                   {donutSlices.map((slice) => (
                      <circle
                         key={slice.method}
                         cx="90" cy="90" r="70"
                         fill="transparent"
                         stroke={slice.color}
                         strokeWidth="20"
                         strokeDasharray={slice.dashArray}
                         strokeDashoffset={slice.offset}
                         transform="rotate(-90 90 90)"
                         style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                      />
                   ))}
                </svg>
                <div className={styles.donutCenter}>
                   <span className={styles.donutLabel}>Total</span>
                   <span className={styles.donutValue}>{formatCurrency(paymentTotal)}</span>
                </div>
             </div>

             <div className={styles.donutLegend}>
                {donutSlices.map(slice => (
                   <div key={slice.method} className={styles.legendItem}>
                      <span>
                         <span className={styles.legendColor} style={{ backgroundColor: slice.color }}></span>
                         {slice.label}
                      </span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(slice.value)}</span>
                   </div>
                ))}
             </div>
          </div>
        </Card>
      </section>

      <section className={styles.chartsGrid}>
         <Card className={styles.chartCard} style={{ background: 'rgba(255,255,255,0.02)' }}>
            <h3 className={styles.chartTitle} style={{ marginBottom: '1.5rem' }}>📢 Alertas do Sistema</h3>
            <div className={styles.alertsPanel}>
               {stats.lowStockCount > 0 && (
                  <div className={`${styles.alertItem} ${styles.alertCritical}`}>
                     <span className={styles.alertIcon}>⚠️</span>
                     <div className={styles.alertContent}>
                        <h4>Estoque Crítico</h4>
                        <p>Existem <strong>{stats.lowStockCount}</strong> produtos com estoque muito baixo.</p>
                     </div>
                     <Button variant="secondary" onClick={() => window.location.href='/estoque'} style={{marginLeft:'auto', fontSize:'0.75rem'}}>Ver</Button>
                  </div>
               )}
               
               {stats.pendingAmount > 0 && (
                  <div className={`${styles.alertItem} ${styles.alertWarning}`}>
                     <span className={styles.alertIcon}>⏳</span>
                     <div className={styles.alertContent}>
                        <h4>Receitas Pendentes</h4>
                        <p>Você tem <strong>{formatCurrency(stats.pendingAmount)}</strong> a receber em cartões.</p>
                     </div>
                     <Button variant="secondary" onClick={() => window.location.href='/financeiro'} style={{marginLeft:'auto', fontSize:'0.75rem'}}>Fluxo</Button>
                  </div>
               )}

               {upcomingAppointments.length > 0 && (
                  <div className={`${styles.alertItem}`} style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                     <span className={styles.alertIcon}>🩺</span>
                     <div className={styles.alertContent}>
                        <h4 style={{ color: '#0ea5e9' }}>Consultas Próximas (Em até 24h)</h4>
                        <p>Você tem <strong>{upcomingAppointments.length}</strong> consulta{upcomingAppointments.length !== 1 ? 's' : ''} agendada{upcomingAppointments.length !== 1 ? 's' : ''}.</p>
                     </div>
                     <Button variant="secondary" onClick={() => window.location.href='/consultas'} style={{marginLeft:'auto', fontSize:'0.75rem'}}>Ver Agenda</Button>
                  </div>
               )}

               {(payablesAlert.overdue > 0 || payablesAlert.upcoming > 0) && (
                  <div className={`${styles.alertItem}`} style={{ background: payablesAlert.overdue > 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)', border: `1px solid ${payablesAlert.overdue > 0 ? 'rgba(220, 38, 38, 0.3)' : 'rgba(217, 119, 6, 0.3)'}` }}>
                     <span className={styles.alertIcon}>💸</span>
                     <div className={styles.alertContent}>
                        <h4 style={{ color: payablesAlert.overdue > 0 ? '#dc2626' : '#d97706' }}>Lembrete de Contas a Pagar</h4>
                        {payablesAlert.overdue > 0 && <p>Você tem <strong>{payablesAlert.overdue}</strong> fatura(s) <strong>ATRASA(S)</strong>.</p>}
                        {payablesAlert.upcoming > 0 && <p>Você tem <strong>{payablesAlert.upcoming}</strong> fatura(s) vencendo nos próximos 7 dias.</p>}
                     </div>
                     <Button variant="secondary" onClick={() => window.location.href='/contas-pagar'} style={{marginLeft:'auto', fontSize:'0.75rem'}}>Ver Contas</Button>
                  </div>
               )}

               {stats.lowStockCount === 0 && stats.pendingAmount === 0 && upcomingAppointments.length === 0 && payablesAlert.overdue === 0 && payablesAlert.upcoming === 0 && (
                  <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Nenhum alerta pendente no momento.</p>
               )}
            </div>
         </Card>

         <Card style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, #ffffff 100%)', border: '1px solid var(--border-gold)' }}>
             <h3 style={{ color: 'var(--gold-primary)', marginBottom: '0.5rem' }}>💡 Resumo de Performance</h3>
             <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: '1.6' }}>
               Seu lucro bruto atual é de <strong>{formatCurrency(stats.totalRevenue - stats.estProfit)}</strong> nos últimos 30 dias. 
               A margem de lucro estimada está em <strong>{((stats.estProfit / (stats.totalRevenue || 1)) * 100).toFixed(1)}%</strong>. 
             </p>
             <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>
                   <strong>Dica:</strong> {stats.lowStockCount > 0 ? 'Reponha itens críticos para não perder vendas.' : 'Seu estoque está bem equilibrado.'}
                </p>
             </div>
         </Card>
      </section>
    </div>
  )
}
