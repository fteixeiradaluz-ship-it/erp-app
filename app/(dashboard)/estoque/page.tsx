'use client'

import React, { useState, useEffect } from 'react'
import styles from './estoque.module.css'
import { getProducts, upsertProduct, deleteProduct } from '@/app/actions/productActions'
import { getSuppliers } from '@/app/actions/supplierActions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

export default function EstoquePage() {
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    cost: '',
    stock: '',
    supplierId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (currentSearch?: string) => {
    setLoading(true)
    const [prodRes, suppRes] = await Promise.all([
      getProducts(currentSearch),
      getSuppliers()
    ])
    if (prodRes.success) setProducts(prodRes.products)
    if (suppRes.success) setSuppliers(suppRes.suppliers)
    setLoading(false)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
    loadData(value)
  }

  const openModal = (product: any = null) => {
    if (product) {
      setEditProduct(product)
      setFormData({
        name: product.name,
        price: product.price.toString(),
        cost: product.cost.toString(),
        stock: product.stock.toString(),
        supplierId: product.supplierId || ''
      })
    } else {
      setEditProduct(null)
      setFormData({ name: '', price: '', cost: '', stock: '', supplierId: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await upsertProduct({
      id: editProduct?.id,
      name: formData.name,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stock: parseInt(formData.stock),
      supplierId: formData.supplierId || undefined
    })

    if (res.success) {
      setIsModalOpen(false)
      loadData(search)
    } else {
      alert(res.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      const res = await deleteProduct(id)
      if (res.success) {
        loadData(search)
      } else {
        alert(res.error)
      }
    }
  }

  const getStockClass = (stock: number) => {
    if (stock <= 0) return styles.stockEmpty
    if (stock <= 5) return styles.stockCritical
    if (stock <= 10) return styles.stockLow
    return styles.stockNormal
  }

  const filteredProducts = showLowStockOnly 
    ? products.filter(p => p.stock <= 10) 
    : products

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📦 Gestão de Estoque</h1>
        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <Input 
              placeholder="Buscar produto..." 
              value={search} 
              onChange={handleSearch}
            />
          </div>
          <label className={styles.filterToggle}>
            <input 
              type="checkbox" 
              checked={showLowStockOnly} 
              onChange={(e) => setShowLowStockOnly(e.target.checked)} 
            />
            ⚠️ Apenas Estoque Baixo
          </label>
          <Button onClick={() => openModal()}>+ Novo Produto</Button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Custo</th>
              <th>Venda</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>Carregando...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>Nenhum produto encontrado.</td></tr>
            ) : filteredProducts.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{formatCurrency(p.cost)}</td>
                <td style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>{formatCurrency(p.price)}</td>
                <td>{p.stock}</td>
                <td>
                  <span className={`${styles.stockBadge} ${getStockClass(p.stock)}`}>
                    {p.stock <= 0 ? 'Esgotado' : p.stock <= 5 ? 'CRÍTICO' : p.stock <= 10 ? 'Baixo' : 'Em Dia'}
                  </span>
                </td>
                <td className={styles.actions}>
                  <button className={styles.editBtn} onClick={() => openModal(p)}>✏️</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(p.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card className={styles.modalCard}>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>{editProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input 
                      label="Nome do Produto" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                    <div className={styles.formGrid}>
                      <Input 
                        label="Custo (R$)" 
                        type="number" 
                        step="0.01" 
                        required 
                        value={formData.cost}
                        onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      />
                      <Input 
                        label="Venda (R$)" 
                        type="number" 
                        step="0.01" 
                        required 
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                    <Input 
                      label="Estoque Inicial" 
                      type="number" 
                      required 
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.85rem', color: '#ccc' }}>Fornecedor</label>
                      <select 
                        style={{
                          width: '100%',
                          padding: '0.8rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(0, 0, 0, 0.5)',
                          color: '#fff',
                        }}
                        value={formData.supplierId}
                        onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                      >
                        <option value="">-- Selecione um Fornecedor --</option>
                        {suppliers.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className={styles.formFooter}>
                      <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                      <Button type="submit">Salvar</Button>
                    </div>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
