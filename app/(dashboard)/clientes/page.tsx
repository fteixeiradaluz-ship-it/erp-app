'use client'

import React, { useState, useEffect } from 'react'
import styles from './clientes.module.css'
import { getCustomers, upsertCustomer, deleteCustomer } from '@/app/actions/customerActions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

export default function ClientesPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async (currentSearch?: string) => {
    setLoading(true)
    const res = await getCustomers(currentSearch)
    if (res.success) {
      setCustomers(res.customers)
    }
    setLoading(false)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)
    loadCustomers(value)
  }

  const openModal = (customer: any = null) => {
    if (customer) {
      setEditCustomer(customer)
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || ''
      })
    } else {
      setEditCustomer(null)
      setFormData({ name: '', email: '', phone: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await upsertCustomer({
      id: editCustomer?.id,
      ...formData
    })

    if (res.success) {
      setIsModalOpen(false)
      loadCustomers(search)
    } else {
      alert(res.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este cliente?')) {
      const res = await deleteCustomer(id)
      if (res.success) loadCustomers(search)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h1>👥 Gestão de Clientes</h1>
          <Link href="/clientes/reposicao" className={styles.crmLink}>
            🔍 Ver Clientes para Reposição (CRM)
          </Link>
        </div>
        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <Input 
              placeholder="Nome, e-mail ou telefone..." 
              value={search} 
              onChange={handleSearch}
            />
          </div>
          <Button onClick={() => openModal()}>+ Novo Cliente</Button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato</th>
              <th>Vendas Realizadas</th>
              <th>Última Compra</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Carregando...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Nenhum cliente cadastrado.</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className={styles.customerInfo}>
                    <h4>{c.name}</h4>
                    <span className={styles.subtitle}>ID: {c.id.slice(-6)}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.customerInfo}>
                    <p>{c.email || 'Sem e-mail'}</p>
                    <p>{c.phone || 'Sem telefone'}</p>
                  </div>
                </td>
                <td>
                  <span className={styles.statsBadge}>{c._count.sales} vendas</span>
                </td>
                <td>
                  {c.sales[0] ? new Date(c.sales[0].createdAt).toLocaleDateString() : 'Nunca comprou'}
                </td>
                <td className={styles.actions}>
                  <button className={styles.editBtn} onClick={() => openModal(c)}>✏️</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>🗑️</button>
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
                <h2 className={styles.modalTitle}>{editCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className={styles.formGrid}>
                    <Input 
                      label="Nome Completo" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
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
