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
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [editCustomer, setEditCustomer] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    shippingNotes: ''
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
        cpf: customer.cpf || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        number: customer.number || '',
        complement: customer.complement || '',
        neighborhood: customer.neighborhood || '',
        city: customer.city || '',
        shippingNotes: customer.shippingNotes || ''
      })
    } else {
      setEditCustomer(null)
      setFormData({ 
        name: '', 
        cpf: '', 
        email: '', 
        phone: '', 
        address: '', 
        number: '', 
        complement: '', 
        neighborhood: '', 
        city: '', 
        shippingNotes: '' 
      })
    }
    setIsModalOpen(true)
  }

  const openDetail = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDetailOpen(true)
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
              placeholder="Nome, CPF, e-mail ou telefone..." 
              value={search} 
              onChange={handleSearch}
            />
            <Button variant="secondary" onClick={() => loadCustomers(search)}>🔍 Buscar</Button>
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
              <th>Localização</th>
              <th>Vendas</th>
              <th>Última Compra</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>Carregando...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>Nenhum cliente cadastrado.</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className={styles.customerInfo}>
                    <h4>{c.name}</h4>
                    <span className={styles.subtitle}>{c.cpf || 'Sem CPF'}</span>
                  </div>
                </td>
                <td>
                  <div className={styles.customerInfo}>
                    <p>{c.email || 'Sem e-mail'}</p>
                    <p>{c.phone || 'Sem telefone'}</p>
                  </div>
                </td>
                <td>
                  <p style={{fontSize: '0.85rem', color: '#666'}}>
                    {c.city ? `${c.city} - ${c.neighborhood || ''}` : 'Não informado'}
                  </p>
                </td>
                <td>
                  <span className={styles.statsBadge}>{c._count.sales} vendas</span>
                </td>
                <td>
                  {c.sales[0] ? new Date(c.sales[0].createdAt).toLocaleDateString() : 'Nunca comprou'}
                </td>
                <td className={styles.actions}>
                  <button className={styles.editBtn} title="Ver Detalhes" onClick={() => openDetail(c)}>👁️</button>
                  <button className={styles.editBtn} title="Editar" onClick={() => openModal(c)}>✏️</button>
                  <button className={styles.deleteBtn} title="Excluir" onClick={() => handleDelete(c.id)}>🗑️</button>
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
                      label="CPF" 
                      value={formData.cpf}
                      onChange={(e) => setFormData({...formData, cpf: e.target.value})}
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
                    
                    <Input 
                      label="Logradouro (Rua/Av)" 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                    <Input 
                      label="Número" 
                      value={formData.number}
                      onChange={(e) => setFormData({...formData, number: e.target.value})}
                    />
                    <Input 
                      label="Bairro" 
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                    />
                    <Input 
                      label="Cidade" 
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                    <Input 
                      className={styles.fullWidth}
                      label="Complemento" 
                      value={formData.complement}
                      onChange={(e) => setFormData({...formData, complement: e.target.value})}
                    />
                    
                    <div className={`${styles.fullWidth} ${styles.textAreaContainer}`}>
                      <label style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.4rem', display: 'block' }}>Observações para Envio</label>
                      <textarea 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-gold)', minHeight: '80px', fontFamily: 'inherit' }}
                        value={formData.shippingNotes}
                        onChange={(e) => setFormData({...formData, shippingNotes: e.target.value})}
                      />
                    </div>
                    
                    <div className={styles.formFooter}>
                      <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                      <Button type="submit">Salvar Cliente</Button>
                    </div>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}

      {isDetailOpen && selectedCustomer && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>Detalhes do Cliente</h2>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>Nome</label>
                    <p>{selectedCustomer.name}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>CPF</label>
                    <p>{selectedCustomer.cpf || 'Não informado'}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>E-mail</label>
                    <p>{selectedCustomer.email || 'Não informado'}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Telefone</label>
                    <p>{selectedCustomer.phone || 'Não informado'}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Endereço</label>
                    <p>{selectedCustomer.address ? `${selectedCustomer.address}, ${selectedCustomer.number || ''}` : 'Não informado'}</p>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Cidade / Bairro</label>
                    <p>{selectedCustomer.city ? `${selectedCustomer.city} / ${selectedCustomer.neighborhood || ''}` : 'Não informado'}</p>
                  </div>
                  <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
                    <label>Observações para Envio</label>
                    <p>{selectedCustomer.shippingNotes || 'Nenhuma observação.'}</p>
                  </div>
                  
                  <div className={styles.detailFooter}>
                    <Link href={`/agenda?customerId=${selectedCustomer.id}`}>
                      <Button variant="secondary">📅 Agendar Consulta</Button>
                    </Link>
                    <Link href={`/clientes/${selectedCustomer.id}/prontuario`}>
                      <Button>🩺 Ver Prontuário</Button>
                    </Link>
                    <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Fechar</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
