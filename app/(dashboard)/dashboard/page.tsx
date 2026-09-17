'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './dashboard.module.css'
import { getDashboardStats, getPendingPayables } from '@/app/actions/financialActions'
import { getAppointments } from '@/app/actions/appointmentActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Skeleton width="280px" height="32px" style={{ marginBottom: '8px' }} />
            <Skeleton width="400px" height="18px" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Skeleton width="120px" height="38px" borderRadius="8px" />
            <Skeleton width="120px" height="38px" borderRadius="8px" />
          </div>
        </div>

        <div className={styles.statsGrid} style={{ marginTop: '1.5rem' }}>
          <Skeleton height="120px" borderRadius="12px" />
          <Skeleton height="120px" borderRadius="12px" />
          <Skeleton height="120px" borderRadius="12px" />
          <Skeleton height="120px" borderRadius="12px" />
        </div>

        <div className={styles.chartsGrid} style={{ marginTop: '1.5rem' }}>
          <Skeleton height="320px" borderRadius="12px" />
          <Skeleton height="320px" borderRadius="12px" />
        </div>
      </div>
    )
  }

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
    
    const colors: Record<string, string> = { 'PIX': '#10b981', 'A_VISTA': 'var(--gold-primary)', 'CARTAO': '#3b82f6', 'DEBITO': '#8b5cf6', 'MULTIPLO': '#f59e0b' }
    const labels: Record<string, string> = { 'PIX': 'PIX', 'A_VISTA': 'Dinheiro', 'CARTAO': 'Cartão Crédito', 'DEBITO': 'Cartão Débito', 'MULTIPLO': 'Dividido' }

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
        <div>
          <h1>📊 Visão Geral do Negócio</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Acompanhamento em tempo real de faturamento, fluxo e operações.</p>
        </div>

        {/* Quick Action Shortcuts */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link href="/pos">
            <Button style={{ background: 'var(--gold-gradient)', color: '#fff', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              🛒 Nova Venda
            </Button>
          </Link>
          <Link href="/agenda">
            <Button variant="secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              📅 Agendamento
            </Button>
          </Link>
          <Link href="/financeiro">
            <Button variant="secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              💰 Lançamento
            </Button>
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <section className={styles.statsGrid}>
        <Card className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.kpiLabel}>Faturamento Bruto</span>
            <Badge variant="gold">30 Dias</Badge>
          </div>
          <span className={styles.kpiValue} style={{ color: 'var(--gold-primary)' }}>
            {formatCurrency(stats.totalRevenue)}
          </span>
          <span className={styles.kpiTrend}>Volume: {stats.saleCount} vendas</span>
        </Card>

        <Card className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.kpiLabel}>Lucro Estimado</span>
            <Badge variant="success">Margem Líquida</Badge>
          </div>
          <span className={styles.kpiValue} style={{ color: 'var(--success)' }}>
            {formatCurrency(stats.estProfit)}
          </span>
          <span className={styles.kpiTrend}>Margem: {((stats.estProfit / (stats.totalRevenue || 1)) * 100).toFixed(1)}%</span>
        </Card>

        <Card className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.kpiLabel}>A Receber (Cartão)</span>
            <Badge variant="info">Previsão</Badge>
          </div>
          <span className={styles.kpiValue}>
            {formatCurrency(stats.pendingAmount)}
          </span>
          <span className={styles.kpiTrend}>Próximos 30 dias</span>
        </Card>

        <Card className={styles.kpiCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.kpiLabel}>A Pagar (Despesas)</span>
            <Badge variant="warning">Compromissos</Badge>
          </div>
          <span className={styles.kpiValue} style={{ color: 'var(--warning)' }}>
            {formatCurrency(stats.payableAmount)}
          </span>
          <span className={styles.kpiTrend}>Próximos 30 dias</span>
        </Card>
      </section>

      {/* Charts Section */}
      <section className={styles.chartsGrid}>
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Faturamento Diário</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Evolução dos últimos 30 dias</span>
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
                      style={{ height: `${Math.max(heightPercentage, 3)}%` }}
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
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Distribuição da receita faturada</span>
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

      {/* System Alerts and Performance */}
      <section className={styles.chartsGrid}>
         <Card className={styles.chartCard}>
            <h3 className={styles.chartTitle} style={{ marginBottom: '1.2rem' }}>📢 Painel de Alertas Operacionais</h3>
            <div className={styles.alertsPanel}>
               {stats.lowStockCount > 0 && (
                  <div className={`${styles.alertItem} ${styles.alertCritical}`}>
                     <span className={styles.alertIcon}>⚠️</span>
                     <div className={styles.alertContent}>
                        <h4>Estoque de Segurança</h4>
                        <p>Existem <strong>{stats.lowStockCount}</strong> produtos abaixo da quantidade mínima.</p>
                     </div>
                     <Link href="/estoque" style={{ marginLeft: 'auto' }}>
                       <Button variant="secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Ver Estoque</Button>
                     </Link>
                  </div>
               )}
               
               {stats.pendingAmount > 0 && (
                  <div className={`${styles.alertItem} ${styles.alertWarning}`}>
                     <span className={styles.alertIcon}>⏳</span>
                     <div className={styles.alertContent}>
                        <h4>Receitas a Compensar</h4>
                        <p>Total de <strong>{formatCurrency(stats.pendingAmount)}</strong> a compensar no cartão.</p>
                     </div>
                     <Link href="/financeiro" style={{ marginLeft: 'auto' }}>
                       <Button variant="secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Fluxo</Button>
                     </Link>
                  </div>
               )}

               {upcomingAppointments.length > 0 && (
                  <div className={`${styles.alertItem}`} style={{ background: 'rgba(26, 92, 115, 0.08)', border: '1px solid rgba(26, 92, 115, 0.25)' }}>
                     <span className={styles.alertIcon}>🩺</span>
                     <div className={styles.alertContent}>
                        <h4 style={{ color: 'var(--info)' }}>Atendimentos em até 24 Horas</h4>
                        <p>Você tem <strong>{upcomingAppointments.length}</strong> consulta(s) agendada(s) para breve.</p>
                     </div>
                     <Link href="/agenda" style={{ marginLeft: 'auto' }}>
                       <Button variant="secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Agenda</Button>
                     </Link>
                  </div>
               )}

               {(payablesAlert.overdue > 0 || payablesAlert.upcoming > 0) && (
                  <div className={`${styles.alertItem}`} style={{ background: payablesAlert.overdue > 0 ? 'rgba(165, 24, 62, 0.08)' : 'rgba(176, 92, 0, 0.08)', border: `1px solid ${payablesAlert.overdue > 0 ? 'rgba(165, 24, 62, 0.25)' : 'rgba(176, 92, 0, 0.25)'}` }}>
                     <span className={styles.alertIcon}>💸</span>
                     <div className={styles.alertContent}>
                        <h4 style={{ color: payablesAlert.overdue > 0 ? 'var(--error)' : 'var(--warning)' }}>Vencimentos a Pagar</h4>
                        {payablesAlert.overdue > 0 && <p>Atenção: <strong>{payablesAlert.overdue}</strong> conta(s) <strong>VENCIDA(S)</strong>.</p>}
                        {payablesAlert.upcoming > 0 && <p><strong>{payablesAlert.upcoming}</strong> fatura(s) vencendo nos próximos 7 dias.</p>}
                     </div>
                     <Link href="/contas-pagar" style={{ marginLeft: 'auto' }}>
                       <Button variant="secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>Ver Contas</Button>
                     </Link>
                  </div>
               )}

               {stats.lowStockCount === 0 && stats.pendingAmount === 0 && upcomingAppointments.length === 0 && payablesAlert.overdue === 0 && payablesAlert.upcoming === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                    Tudo em dia! Nenhum alerta crítico pendente.
                  </p>
               )}
            </div>
         </Card>

         <Card style={{ background: 'linear-gradient(135deg, rgba(197,168,92,0.12) 0%, #ffffff 100%)', border: '1px solid var(--border-gold)' }}>
             <h3 style={{ color: 'var(--gold-primary)', marginBottom: '0.75rem' }}>💡 Indicadores Gerenciais</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
               Faturamento Líquido acumulado de <strong>{formatCurrency(stats.totalRevenue)}</strong> com lucro estimado em <strong>{formatCurrency(stats.estProfit)}</strong>.
             </p>
             <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                   <strong>Status do Estoque:</strong> {stats.lowStockCount > 0 ? 'Reponha itens no estoque de segurança para garantir atendimento contínuo.' : 'Estoque equilibrado.'}
                </p>
             </div>
         </Card>
      </section>
    </div>
  )
}
