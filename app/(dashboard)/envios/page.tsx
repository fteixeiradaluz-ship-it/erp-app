'use client'

import React, { useState, useEffect } from 'react'
import styles from './envios.module.css'
import { getShippingSales, updateShippingStatus } from '@/app/actions/shippingActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function EnviosPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadSales()
  }, [dateFilter])

  const loadSales = async () => {
    setLoading(true)
    const start = new Date(dateFilter)
    start.setHours(0,0,0,0)
    const end = new Date(dateFilter)
    end.setHours(23,59,59,999)
    
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>📦 Gestão de Envios</h1>
          <p>Controle de Notas Fiscais, Etiquetas e Despacho</p>
        </div>
        <div className={styles.filters}>
          <label>Data da Venda:</label>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
            className={styles.dateInput}
          />
        </div>
      </header>

      <div className={styles.salesGrid}>
        {loading ? (
          <div className={styles.loading}>Carregando vendas...</div>
        ) : sales.length === 0 ? (
          <div className={styles.empty}>Nenhuma venda encontrada para esta data.</div>
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
    </div>
  )
}
