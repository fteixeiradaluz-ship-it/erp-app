'use client'

import React, { useState, useEffect } from 'react'
import styles from '../clientes.module.css'
import { getOpenQuotationsCRM } from '@/app/actions/quotationActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [template, setTemplate] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await getOpenQuotationsCRM()
      if (res.success && res.quotations) {
        setLeads(res.quotations)
        setTemplate(res.template || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const formatWhatsAppMessage = (lead: any) => {
    if (!template) return ''
    
    const formattedValue = lead.totalAmount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
    
    return template
      .replaceAll('{nome}', lead.customer.name)
      .replaceAll('{valor}', formattedValue)
  }

  const handleWhatsAppClick = (lead: any) => {
    if (!lead.customer.phone) return alert('Cliente não possui telefone cadastrado!')
    const message = formatWhatsAppMessage(lead)
    const formattedPhone = lead.customer.phone.replace(/\D/g, '')
    
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
          <h1>🎯 CRM: Oportunidades e Leads</h1>
          <p className={styles.subtitle}>Clientes com orçamentos em aberto há mais de 3 dias sem conversão de compra.</p>
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
                <th>Data do Orçamento</th>
                <th>Itens do Interesse</th>
                <th>Valor Estimado</th>
                <th>Ação Recomendada</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Carregando leads pendentes...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Nenhum lead em aberto no momento. Todos os orçamentos foram fechados ou recusados!</td></tr>
              ) : leads.map((l) => {
                const leadDate = new Date(l.createdAt)
                const itemsList = l.items.map((i: any) => `${i.quantity}x ${i.description}`).join(', ')
                
                return (
                  <tr key={l.id}>
                    <td>
                      <div className={styles.customerInfo}>
                        <h4>{l.customer.name}</h4>
                        <span className={styles.riskBadge} style={{ background: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold-hover)' }}>INTERESSADO</span>
                      </div>
                    </td>
                    <td>{leadDate.toLocaleDateString('pt-BR')}</td>
                    <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={itemsList}>
                      {itemsList}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      R$ {l.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <Button onClick={() => handleWhatsAppClick(l)}>
                        💬 Cobrar via WhatsApp
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
