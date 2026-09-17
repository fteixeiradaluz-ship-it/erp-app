'use client'

import React, { useState, useEffect } from 'react'
import styles from './fornecedores.module.css'
import { getSuppliers, upsertSupplier, deleteSupplier, getSupplierStockReport } from '@/app/actions/supplierActions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  
  const [isRestockOpen, setIsRestockOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [restockItems, setRestockItems] = useState<any[]>([])
  const [restockLoading, setRestockLoading] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    load()
  }, [search])

  async function load() {
    const res = await getSuppliers(search)
    if (res.success) {
      setSuppliers(res.suppliers)
    }
    setLoading(false)
  }

  const handleOpenModal = (supplier?: any) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        name: supplier.name,
        cnpj: supplier.cnpj || '',
        email: supplier.email || '',
        phone: supplier.phone || ''
      })
    } else {
      setEditingSupplier(null)
      setFormData({ name: '', cnpj: '', email: '', phone: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await upsertSupplier({ ...formData, id: editingSupplier?.id })
    if (res.success) {
      setIsModalOpen(false)
      load()
    } else {
      alert(res.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      const res = await deleteSupplier(id)
      if (res.success) load()
    }
  }

  const handleOpenRestock = async (supplier: any) => {
    setSelectedSupplier(supplier)
    setIsRestockOpen(true)
    setRestockLoading(true)
    const res = await getSupplierStockReport(supplier.id)
    if (res.success) {
      setRestockItems(res.products)
    }
    setRestockLoading(false)
  }

  const handleExportOrder = () => {
    if (!selectedSupplier) return
    const content = `PEDIDO DE COMPRA - ${selectedSupplier.name}\n` +
      `Data: ${new Date().toLocaleDateString()}\n\n` +
      `Produtos Necessários:\n` +
      restockItems.map(item => `- ${item.name} (Atual: ${item.stock})`).join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Pedido_${selectedSupplier.name.replace(/\s+/g, '_')}.txt`
    link.click()
  }

  if (loading && suppliers.length === 0) return <div style={{ padding: '2rem' }}>Carregando fornecedores...</div>

  const totalSuppliers = suppliers.length
  const totalProductsLinked = suppliers.reduce((sum, s) => sum + (s._count?.products || 0), 0)
  const withDirectContact = suppliers.filter(s => !!s.phone || !!s.email).length

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>🏭 Gestão de Fornecedores & Suprimentos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Cadastro de parceiros industriais, reposição de estoque e gestão de compras.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Novo Fornecedor</Button>
      </header>

      {/* ── Executive KPI Cards ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Fornecedores Ativos</span>
            <span className={styles.kpiIcon}>🏭</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valGold}`}>
            {totalSuppliers}
          </div>
          <span className={styles.kpiSub}>Parceiros comerciais cadastrados</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Produtos Vinculados</span>
            <span className={styles.kpiIcon}>📦</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valPrimary}`}>
            {totalProductsLinked}
          </div>
          <span className={styles.kpiSub}>Itens fornecidos em catálogo</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Contato Rápido</span>
            <span className={styles.kpiIcon}>📞</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valPositive}`}>
            {withDirectContact}
          </div>
          <span className={styles.kpiSub}>Com WhatsApp ou E-mail ativo</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <Input 
            placeholder="Buscar por nome, razão social ou CNPJ..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="secondary" onClick={() => load()}>🔍 Buscar</Button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Razão Social / Nome</th>
              <th>CNPJ / CPF</th>
              <th>Contato & WhatsApp</th>
              <th>E-mail</th>
              <th>Produtos Vinc.</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum fornecedor encontrado.</td></tr>
            ) : suppliers.map(s => {
              const cleanPhone = s.phone ? s.phone.replace(/\D/g, '') : ''
              const waUrl = cleanPhone 
                ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá, tudo bem? Aqui é da Clínica DERMAE sobre reposição de pedidos.`)}`
                : null

              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: '600' }}>{s.name}</td>
                  <td>{s.cnpj || '---'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{s.phone || '---'}</span>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.waBadge}
                          title="Falar no WhatsApp"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    {s.email ? (
                      <a href={`mailto:${s.email}`} className={styles.emailLink} title="Enviar e-mail">
                        ✉️ {s.email}
                      </a>
                    ) : (
                      '---'
                    )}
                  </td>
                  <td>
                    <span className={styles.prodBadge}>{s._count?.products || 0} itens</span>
                  </td>
                  <td className={styles.actions} style={{ justifyContent: 'center' }}>
                    <Button variant="secondary" onClick={() => handleOpenRestock(s)} title="Verificar Estoque & Repor">
                      🛒 Repor
                    </Button>
                    <button className={styles.editBtn} title="Editar" onClick={() => handleOpenModal(s)}>✏️</button>
                    <button className={styles.deleteBtn} title="Excluir" onClick={() => handleDelete(s.id)}>🗑️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input 
                    label="Razão Social / Nome" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <Input 
                    label="CNPJ / CPF" 
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                  />
                  <Input 
                    label="E-mail" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                  <Input 
                    label="Telefone / WhatsApp" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}

      {isRestockOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.restockModal}`}>
            <Card>
              <div className={styles.modalContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>📦 Reposição: {selectedSupplier?.name}</h2>
                  <Button variant="secondary" onClick={() => setIsRestockOpen(false)}>X</Button>
                </div>

                {restockLoading ? (
                  <p>Gerando relatório de estoque...</p>
                ) : restockItems.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>🎉 Todos os produtos deste fornecedor estão com estoque em dia (acima de 10 unidades).</p>
                    <Button onClick={() => setIsRestockOpen(false)} style={{ marginTop: '1rem' }}>Sair</Button>
                  </div>
                ) : (
                  <div className={styles.restockList}>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                      Os seguintes produtos estão abaixo do limite de segurança (10 unidades):
                    </p>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Estoque Atual</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restockItems.map(item => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.stock}</td>
                            <td>
                              <span style={{ color: item.stock <= 5 ? 'var(--error)' : 'var(--warning)', fontWeight: '600' }}>
                                {item.stock <= 5 ? 'CRÍTICO' : 'BAIXO'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                      <Button variant="secondary" onClick={() => setIsRestockOpen(false)}>Voltar</Button>
                      <Button onClick={handleExportOrder}>📥 Exportar Pedido (.txt)</Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
