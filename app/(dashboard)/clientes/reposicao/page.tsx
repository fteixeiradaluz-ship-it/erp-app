'use client'

import React, { useState, useEffect } from 'react'
import styles from '../clientes.module.css'
import { getRetentionList } from '@/app/actions/customerActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ReposicaoPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [template, setTemplate] = useState('')
  const [retentionDays, setRetentionDays] = useState(90)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await getRetentionList()
      if (res.success && res.customers) {
        setCustomers(res.customers)
        setTemplate(res.template || '')
        setRetentionDays(res.retentionDays || 90)
      }
      setLoading(false)
    }
    load()
  }, [])

  const formatWhatsAppMessage = (customer: any, daysDiff: number) => {
    if (!template) return '';
    
    // Obter o nome do último produto comprado
    const lastSale = customer.sales?.[0]
    const productName = lastSale?.items?.[0]?.product?.name || 'produtos/serviços'
    
    return template
      .replaceAll('{nome}', customer.name)
      .replaceAll('{dias}', daysDiff.toString())
      .replaceAll('{produto}', productName)
  }

  const handleWhatsAppClick = (customer: any, daysDiff: number) => {
    if (!customer.phone) return alert('Cliente não possui telefone cadastrado!')
    const message = formatWhatsAppMessage(customer, daysDiff)
    const formattedPhone = customer.phone.replace(/\D/g, '')
    
    // Adiciona o prefixo internacional 55 se o número for de celular brasileiro (9 dígitos + DDD) e não tiver prefixo
    let finalPhone = formattedPhone
    if (finalPhone.length === 10 || finalPhone.length === 11) {
      finalPhone = `55${finalPhone}`
    }
    
    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h1>🔍 CRM: Reposição de Clientes</h1>
          <p className={styles.subtitle}>Clientes que não compram há mais de {retentionDays} dias.</p>
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
                      <Button onClick={() => handleWhatsAppClick(c, daysDiff)}>
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
        * O critério de "Em Risco" é definido por clientes sem compras nos últimos {retentionDays} dias.
      </div>
    </div>
  )
}
