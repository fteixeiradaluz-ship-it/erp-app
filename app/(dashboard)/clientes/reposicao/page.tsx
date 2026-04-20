'use client'

import React, { useState, useEffect } from 'react'
import styles from '../clientes.module.css'
import { getRetentionList } from '@/app/actions/customerActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ReposicaoPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await getRetentionList()
      if (res.success) {
        setCustomers(res.customers)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h1>🔍 CRM: Reposição de Clientes</h1>
          <p className={styles.subtitle}>Clientes que não compram há mais de 3 meses.</p>
        </div>
        <Link href="/clientes">
          <Button variant="secondary">← Voltar para Clientes</Button>
        </Link>
      </div>

      <Card>
        <div className={styles.tableWrapper} style={{ border: 'none' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Última Compra</th>
                <th>Dias sem Comprar</th>
                <th>Contato</th>
                <th>Ação Recomendada</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Analisando base de dados...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Excelente! Todos os seus clientes compraram recentemente.</td></tr>
              ) : customers.map((c) => {
                const lastSaleDate = c.sales[0] ? new Date(c.sales[0].createdAt) : new Date(c.createdAt)
                const daysDiff = Math.floor((Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
                
                return (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.customerInfo}>
                        <h4>{c.name}</h4>
                        <span className={styles.riskBadge}>EM RISCO</span>
                      </div>
                    </td>
                    <td>{lastSaleDate.toLocaleDateString()}</td>
                    <td style={{ color: '#f44336', fontWeight: 'bold' }}>{daysDiff} dias</td>
                    <td>{c.phone || c.email || 'Sem contato'}</td>
                    <td>
                      <Button onClick={() => window.open(`https://wa.me/${c.phone?.replace(/\D/g,'')}`, '_blank')}>
                        💬 Contatar WhatsApp
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.85rem' }}>
        * O critério de "Em Risco" é definido por clientes sem compras nos últimos 90 dias.
      </div>
    </div>
  )
}
