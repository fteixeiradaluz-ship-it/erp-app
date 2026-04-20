'use client'

import React, { useState, useEffect } from 'react'
import styles from './orcamentos.module.css'
import { getQuotations, createQuotation, updateQuotationStatus, convertQuotationToSale } from '@/app/actions/quotationActions'
import { getPOSData } from '@/app/actions/saleActions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function OrcamentosPage() {
  const [quotations, setQuotations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  // New Quotation State
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [validUntil, setValidUntil] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [qRes, posData] = await Promise.all([
      getQuotations(search),
      getPOSData()
    ])
    if (qRes.success) setQuotations(qRes.quotations)
    setProducts(posData.products)
    setCustomers(posData.customers)
    setLoading(false)
  }

  const addItem = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) return prev
      return [...prev, { productId: product.id, description: product.name, quantity: 1, price: product.price }]
    })
  }

  const updateItemQty = (productId: string, qty: number) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i))
  }

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  const handleCreate = async () => {
    if (!selectedCustomer || items.length === 0) return alert('Selecione cliente e itens')
    const res = await createQuotation({
      customerId: selectedCustomer,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      items: items.map(i => ({ description: i.description, quantity: i.quantity, price: i.price }))
    })
    if (res.success) {
      setIsModalOpen(false)
      setItems([])
      setSelectedCustomer('')
      loadData()
    } else {
      alert(res.error)
    }
  }

  const handleConvert = async (id: string) => {
    if (confirm('Deseja converter este orçamento em uma venda no PDV? Isso baixará o estoque.')) {
      const res = await convertQuotationToSale(id, 'A_VISTA') // Default for conversion
      if (res.success) {
        alert('Venda gerada com sucesso!')
        loadData()
      } else {
        alert(res.error)
      }
    }
  }

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📑 Orçamentos e Propostas</h1>
        <Button onClick={() => setIsModalOpen(true)}>+ Novo Orçamento</Button>
      </header>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID / Data</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{textAlign: 'right'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{textAlign: 'center'}}>Carregando...</td></tr>
            ) : quotations.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center'}}>Nenhum orçamento encontrado.</td></tr>
            ) : quotations.map(q => (
              <tr key={q.id}>
                <td>
                  <strong>#{q.id.slice(-6)}</strong>
                  <p style={{fontSize: '0.8rem', color: '#666'}}>{new Date(q.createdAt).toLocaleDateString()}</p>
                </td>
                <td>{q.customer.name}</td>
                <td>{q.items.length} itens</td>
                <td>R$ {q.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[q.status.toLowerCase()]}`}>
                    {q.status}
                  </span>
                </td>
                <td className={styles.actions}>
                  {q.status === 'OPEN' && (
                    <Button variant="primary" size="small" onClick={() => handleConvert(q.id)}>Converter em Venda</Button>
                  )}
                  <Button variant="secondary" size="small" onClick={() => updateQuotationStatus(q.id, 'REJECTED')}>Recusar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>Novo Orçamento</h2>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Cliente</label>
                    <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className={styles.select}>
                      <option value="">-- Selecione --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Validade (Opcional)</label>
                    <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                  </div>
                </div>

                <div className={styles.itemsSection}>
                  <div className={styles.productPicker}>
                    <label>Adicionar Itens</label>
                    <div className={styles.pickerGrid}>
                      {products.map(p => (
                        <button key={p.id} onClick={() => addItem(p)} className={styles.pickerBtn}>
                          {p.name} - R$ {p.price.toFixed(2)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.cart}>
                    <h4>Itens Selecionados</h4>
                    {items.map(i => (
                      <div key={i.productId} className={styles.cartItem}>
                        <span>{i.description}</span>
                        <div className={styles.qtyArea}>
                          <input type="number" value={i.quantity} onChange={e => updateItemQty(i.productId, parseInt(e.target.value))} />
                          <span>x R$ {i.price.toFixed(2)}</span>
                          <button onClick={() => removeItem(i.productId)}>✕</button>
                        </div>
                      </div>
                    ))}
                    {items.length > 0 && (
                      <div className={styles.totalRow}>
                        <strong>Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate}>Gerar Orçamento</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
