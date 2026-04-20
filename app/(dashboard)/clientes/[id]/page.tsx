'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './customerDetail.module.css'
import { getCustomerDetail } from '@/app/actions/customerActions'
import { upsertMedicalRecord, deleteMedicalRecord } from '@/app/actions/medicalRecordActions'
import { getSessionAction } from '@/app/actions/authActions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('resumo')
  const [session, setSession] = useState<any>(null)
  
  // Prontuario simple form
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [recordContent, setRecordContent] = useState('')
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    checkSession()
  }, [id])

  async function checkSession() {
    const s = await getSessionAction()
    setSession(s)
  }

  async function loadData() {
    setLoading(true)
    const res = await getCustomerDetail(id as string)
    if (res.success) {
      setCustomer(res.customer)
    } else {
      alert(res.error)
      router.push('/clientes')
    }
    setLoading(false)
  }

  const handleSaveRecord = async () => {
    if (!recordContent.trim()) return
    const res = await upsertMedicalRecord({
      id: editingRecordId || undefined,
      customerId: id as string,
      content: recordContent
    })
    if (res.success) {
      setIsRecordModalOpen(false)
      setRecordContent('')
      setEditingRecordId(null)
      loadData()
    } else {
      alert(res.error)
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm('Excluir este registro do prontuário?')) {
      const res = await deleteMedicalRecord(recordId, id as string)
      if (res.success) loadData()
      else alert(res.error)
    }
  }

  if (loading) return <div className={styles.loading}>Carregando ficha do cliente...</div>
  if (!customer) return null

  const isManager = session?.role === 'ADMIN'

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.backArea}>
          <button onClick={() => router.push('/clientes')} className={styles.backBtn}>← Voltar</button>
          <h1>{customer.name}</h1>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statItem}>
            <span>Total Comprado</span>
            <strong>R$ {customer.sales.reduce((acc: number, s: any) => acc + s.totalAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div className={styles.statItem}>
            <span>Consultas</span>
            <strong>{customer.appointments.length}</strong>
          </div>
        </div>
      </header>

      <div className={styles.tabs}>
        <button className={activeTab === 'resumo' ? styles.activeTab : ''} onClick={() => setActiveTab('resumo')}>Resumo</button>
        <button className={activeTab === 'vendas' ? styles.activeTab : ''} onClick={() => setActiveTab('vendas')}>Vendas</button>
        <button className={activeTab === 'consultas' ? styles.activeTab : ''} onClick={() => setActiveTab('consultas')}>Consultas</button>
        <button className={activeTab === 'prontuario' ? styles.activeTab : ''} onClick={() => setActiveTab('prontuario')}>Prontuário</button>
        <button className={activeTab === 'orcamentos' ? styles.activeTab : ''} onClick={() => setActiveTab('orcamentos')}>Orçamentos</button>
      </div>

      <main className={styles.content}>
        {activeTab === 'resumo' && (
          <div className={styles.resumoGrid}>
            <Card title="Dados de Contato">
              <p><strong>E-mail:</strong> {customer.email || 'Não informado'}</p>
              <p><strong>Telefone:</strong> {customer.phone || 'Não informado'}</p>
              <p><strong>Cliente desde:</strong> {new Date(customer.createdAt).toLocaleDateString()}</p>
            </Card>
            <Card title="Última Atividade">
              {customer.sales[0] ? (
                <p>Última compra em {new Date(customer.sales[0].createdAt).toLocaleDateString()} no valor de R$ {customer.sales[0].totalAmount.toFixed(2)}</p>
              ) : <p>Nenhuma venda registrada.</p>}
            </Card>
          </div>
        )}

        {activeTab === 'vendas' && (
          <div className={styles.list}>
            {customer.sales.map((sale: any) => (
              <div key={sale.id} className={styles.listItem}>
                <div>
                  <strong>Venda #{sale.id.slice(-6)}</strong>
                  <p>{new Date(sale.createdAt).toLocaleDateString()} - {sale.paymentMethod}</p>
                </div>
                <div className={styles.price}>R$ {sale.totalAmount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'consultas' && (
          <div className={styles.list}>
            {customer.appointments.map((appt: any) => (
              <div key={appt.id} className={styles.listItem}>
                <div>
                  <strong>{new Date(appt.date).toLocaleString()}</strong>
                  <p>{appt.status} {appt.isReturn ? '(Retorno)' : ''}</p>
                  {appt.description && <p className={styles.desc}>{appt.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'prontuario' && (
          <div className={styles.prontuarioArea}>
            <div className={styles.tabHeader}>
              <h2>Histórico Clínico</h2>
              {isManager && (
                <Button onClick={() => {
                  setEditingRecordId(null)
                  setRecordContent('')
                  setIsRecordModalOpen(true)
                }}>+ Novo Registro</Button>
              )}
            </div>
            
            <div className={styles.recordList}>
              {customer.medicalRecords.length === 0 ? (
                <p>Nenhum registro no prontuário.</p>
              ) : customer.medicalRecords.map((record: any) => (
                <div key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <span>{new Date(record.createdAt).toLocaleString()}</span>
                    {isManager && (
                      <div className={styles.recordActions}>
                        <button onClick={() => {
                          setEditingRecordId(record.id)
                          setRecordContent(record.content)
                          setIsRecordModalOpen(true)
                        }}>✏️</button>
                        <button onClick={() => handleDeleteRecord(record.id)}>🗑️</button>
                      </div>
                    )}
                  </div>
                  <div className={styles.recordContent}>
                    {record.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orcamentos' && (
          <div className={styles.list}>
            {customer.quotations.map((q: any) => (
              <div key={q.id} className={styles.listItem}>
                <div>
                  <strong>Orçamento #{q.id.slice(-6)}</strong>
                  <p>{new Date(q.createdAt).toLocaleDateString()} - Status: {q.status}</p>
                </div>
                <div className={styles.price}>R$ {q.totalAmount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isRecordModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h3>{editingRecordId ? 'Editar Registro' : 'Novo Registro no Prontuário'}</h3>
                <textarea 
                  className={styles.textarea}
                  placeholder="Descreva a evolução do paciente, observações clínicas, etc..."
                  value={recordContent}
                  onChange={(e) => setRecordContent(e.target.value)}
                  rows={10}
                />
                <div className={styles.modalFooter}>
                  <Button variant="secondary" onClick={() => setIsRecordModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveRecord}>Salvar Registro</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
