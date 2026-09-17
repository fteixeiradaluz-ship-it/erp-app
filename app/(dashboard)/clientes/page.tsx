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

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WITH_SALES' | 'NO_SALES'>('ALL')

  const totalPatients = customers.length
  const patientsWithSales = customers.filter(c => (c._count?.sales || 0) > 0).length
  const totalSalesCount = customers.reduce((acc, c) => acc + (c._count?.sales || 0), 0)
  const conversionRate = totalPatients > 0 ? ((patientsWithSales / totalPatients) * 100).toFixed(0) : '0'

  const filteredCustomers = customers.filter(c => {
    if (statusFilter === 'WITH_SALES') return (c._count?.sales || 0) > 0
    if (statusFilter === 'NO_SALES') return (c._count?.sales || 0) === 0
    return true
  })

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h1>👥 Gestão de Clientes & CRM</h1>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <Link href="/clientes/reposicao" className={styles.crmLink}>
              🔍 CRM: Reposição de Clientes
            </Link>
            <Link href="/clientes/leads" className={styles.crmLink}>
              🎯 CRM: Oportunidades & Leads
            </Link>
          </div>
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

      {/* ── Executive KPI Cards ── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Total de Pacientes</span>
            <span className={styles.kpiIcon}>👥</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valGold}`}>
            {totalPatients}
          </div>
          <span className={styles.kpiSub}>Cadastrados na clínica</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Pacientes Ativos</span>
            <span className={styles.kpiIcon}>🛍️</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valPositive}`}>
            {patientsWithSales}
          </div>
          <span className={styles.kpiSub}>Com histórico de compras</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Total de Vendas</span>
            <span className={styles.kpiIcon}>💳</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valPrimary}`}>
            {totalSalesCount}
          </div>
          <span className={styles.kpiSub}>Pedidos concluídos</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Taxa de Conversão</span>
            <span className={styles.kpiIcon}>📈</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.valGold}`}>
            {conversionRate}%
          </div>
          <span className={styles.kpiSub}>Pacientes fidelizados</span>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className={styles.filterPillBar}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filtrar por:</span>
        <button
          type="button"
          className={`${styles.filterPill} ${statusFilter === 'ALL' ? styles.activeFilterPill : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          Todos ({totalPatients})
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${statusFilter === 'WITH_SALES' ? styles.activeFilterPill : ''}`}
          onClick={() => setStatusFilter('WITH_SALES')}
        >
          🛍️ Com Compras ({patientsWithSales})
        </button>
        <button
          type="button"
          className={`${styles.filterPill} ${statusFilter === 'NO_SALES' ? styles.activeFilterPill : ''}`}
          onClick={() => setStatusFilter('NO_SALES')}
        >
          🆕 Sem Compras ({totalPatients - patientsWithSales})
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato & WhatsApp</th>
              <th>Localização</th>
              <th>Vendas</th>
              <th>Última Compra</th>
              <th style={{ textAlign: 'center' }}>Ações Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
            ) : filteredCustomers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum cliente encontrado para o filtro.</td></tr>
            ) : filteredCustomers.map((c) => {
              const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : ''
              const waUrl = cleanPhone 
                ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${c.name}, tudo bem? Aqui é da Clínica DERMAE!`)}`
                : null

              return (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span>{c.phone || 'Sem telefone'}</span>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.waBadge}
                            title="Abrir WhatsApp Web"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <p style={{fontSize: '0.85rem', color: '#666'}}>
                      {c.city ? `${c.city} - ${c.neighborhood || ''}` : 'Não informado'}
                    </p>
                  </td>
                  <td>
                    <span className={styles.statsBadge}>{c._count?.sales || 0} vendas</span>
                  </td>
                  <td>
                    {c.sales && c.sales[0] ? new Date(c.sales[0].createdAt).toLocaleDateString() : 'Nunca comprou'}
                  </td>
                  <td className={styles.actions} style={{ justifyContent: 'center' }}>
                    <Link href={`/clientes/${c.id}/prontuario`} className={styles.quickActionLink} title="Prontuário Médico">
                      🩺 Prontuário
                    </Link>
                    <button className={styles.editBtn} title="Ver Detalhes" onClick={() => openDetail(c)}>👁️</button>
                    <button className={styles.editBtn} title="Editar" onClick={() => openModal(c)}>✏️</button>
                    <button className={styles.deleteBtn} title="Excluir" onClick={() => handleDelete(c.id)}>🗑️</button>
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
