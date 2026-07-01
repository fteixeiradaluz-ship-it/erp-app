'use client'

import React, { useState, useEffect } from 'react'
import styles from './leads.module.css'
import { 
  registerLead, 
  getLeadsCRM, 
  updateLeadStatus, 
  convertLeadToCustomer,
  updateLeadDetails,
  deleteLead,
  addLeadActivity,
  getLeadActivities,
  registerManualContact,
  getSellers
} from '@/app/actions/leadActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [template, setTemplate] = useState('')
  const [loading, setLoading] = useState(true)

  // Modos de visualização: 'table' ou 'kanban'
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  // Filtros
  const [activeFilter, setActiveFilter] = useState('todos')
  const [activeStatus, setActiveStatus] = useState('') // Vazio busca todos ativos (sem BOUGHT/ARCHIVED)

  // Filtro de Vendedor (somente para administradores)
  const [sellers, setSellers] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeSeller, setActiveSeller] = useState('')

  // Form de cadastro
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newTags, setNewTags] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edição inline de anotações rápidas
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState('')

  // Modal de conversão em cliente
  const [convertingLead, setConvertingLead] = useState<any | null>(null)
  const [customerCpf, setCustomerCpf] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [converting, setConverting] = useState(false)

  // Modal de edição básica
  const [editingLead, setEditingLead] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editTags, setEditTags] = useState('')
  const [isEditingSubmit, setIsEditingSubmit] = useState(false)

  // Modal de histórico & timeline
  const [historyLead, setHistoryLead] = useState<any | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [newActivityContent, setNewActivityContent] = useState('')
  const [submittingActivity, setSubmittingActivity] = useState(false)

  // Modal de Registro de Contato Manual
  const [manualContactLead, setManualContactLead] = useState<any | null>(null)
  const [contactSummary, setContactSummary] = useState('')
  const [contactNotes, setContactNotes] = useState('')
  const [submittingManualContact, setSubmittingManualContact] = useState(false)

  // Modal de Agendamento de Retorno (Possível Conversão)
  const [schedulingLead, setSchedulingLead] = useState<any | null>(null)
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackNotes, setCallbackNotes] = useState('')
  const [submittingSchedule, setSubmittingSchedule] = useState(false)

  // Filtro de pendências
  const [filterPendingCallbacksOnly, setFilterPendingCallbacksOnly] = useState(false)

  // Dropdown de ações por lead na tabela
  const [activeDropdownLeadId, setActiveDropdownLeadId] = useState<string | null>(null)

  // Modal de cadastro de novo lead
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)

  // Estatísticas do painel
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    sent: 0,
    nextMonth: 0,
  })

  // Carrega os leads com base nos filtros ativos
  const loadLeads = async () => {
    setLoading(true)
    const res = await getLeadsCRM(activeFilter, activeStatus, activeSeller || undefined)
    if (res.success && res.leads) {
      setLeads(res.leads)
      setTemplate(res.template || '')
      
      // Atualiza estatísticas buscando a lista completa ativa para este vendedor
      const fullRes = await getLeadsCRM('todos', '', activeSeller || undefined)
      if (fullRes.success && fullRes.leads) {
        const list = fullRes.leads
        setStats({
          total: list.length,
          new: list.filter((l: any) => l.status === 'NEW').length,
          sent: list.filter((l: any) => l.status === 'MESSAGE_SENT').length,
          nextMonth: list.filter((l: any) => l.status === 'RETORNAR_MES_SEGUINTE').length,
        })
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLeads()
  }, [activeFilter, activeStatus, activeSeller])

  // Busca lista de vendedores ao carregar a página
  useEffect(() => {
    const fetchSellers = async () => {
      const res = await getSellers()
      if (res.success && res.sellers) {
        setSellers(res.sellers)
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    }
    fetchSellers()
  }, [])

  // Cadastro de novo lead
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Formata o telefone apenas com números e DDD
    const formattedPhone = newPhone.replace(/\D/g, '')
    if (formattedPhone.length < 10) {
      alert('Por favor, insira um telefone válido com DDD')
      setSubmitting(false)
      return
    }

    const res = await registerLead({
      name: newName,
      phone: newPhone,
      notes: newNotes,
      tags: newTags
    })

    if (res.error) {
      alert(res.error)
    } else {
      setNewName('')
      setNewPhone('')
      setNewNotes('')
      setNewTags('')
      setIsRegisterModalOpen(false)
      loadLeads()
    }
    setSubmitting(false)
  }

  // Atualização rápida de status
  const handleStatusChange = async (leadId: string, status: string) => {
    const res = await updateLeadStatus(leadId, status)
    if (res.error) {
      alert(res.error)
    } else {
      loadLeads()
    }
  }

  // Salvar nota inline rápida
  const handleSaveNotes = async (leadId: string) => {
    const res = await updateLeadStatus(leadId, undefined, editingNotes)
    if (res.error) {
      alert(res.error)
    } else {
      setEditingLeadId(null)
      loadLeads()
    }
  }

  // Conversão de lead em cliente completo
  const handleConversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertingLead) return

    setConverting(true)
    const res = await convertLeadToCustomer(convertingLead.id, {
      cpf: customerCpf || undefined,
      email: customerEmail || undefined
    })

    if (res.error) {
      alert(res.error)
    } else {
      alert('Lead convertido em Cliente com sucesso! O cadastro foi salvo na aba de Clientes.')
      setConvertingLead(null)
      setCustomerCpf('')
      setCustomerEmail('')
      loadLeads()
    }
    setConverting(false)
  }

  // Enviar mensagem personalizada via WhatsApp e atualizar status/contato
  const handleWhatsAppSend = (lead: any) => {
    if (!lead.phone) return alert('Telefone indisponível')
    
    // Substitui o nome do cliente no template
    const message = template.replaceAll('{nome}', lead.name)
    const cleanPhone = lead.phone.replace(/\D/g, '')
    
    let finalPhone = cleanPhone
    if (finalPhone.length === 10 || finalPhone.length === 11) {
      finalPhone = `55${finalPhone}`
    }

    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`
    window.open(url, '_blank')

    // Atualiza data do último contato e status para MESSAGE_SENT
    handleStatusChange(lead.id, 'MESSAGE_SENT')
  }

  // Edição de Nome, Telefone e Tags
  const openEditModal = (lead: any) => {
    setEditingLead(lead)
    setEditName(lead.name)
    setEditPhone(lead.phone)
    setEditTags(lead.tags || '')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLead) return
    setIsEditingSubmit(true)

    const res = await updateLeadDetails(editingLead.id, {
      name: editName,
      phone: editPhone,
      tags: editTags
    })

    if (res.error) {
      alert(res.error)
    } else {
      setEditingLead(null)
      loadLeads()
    }
    setIsEditingSubmit(false)
  }

  // Exclusão de Lead
  const handleDeleteLead = async (leadId: string) => {
    if (confirm('Tem certeza de que deseja excluir permanentemente este lead e todo o seu histórico?')) {
      const res = await deleteLead(leadId)
      if (res.error) {
        alert(res.error)
      } else {
        loadLeads()
      }
    }
  }

  // Histórico de Atividades
  const openHistoryModal = async (lead: any) => {
    setHistoryLead(lead)
    setLoadingActivities(true)
    const res = await getLeadActivities(lead.id)
    if (res.success && res.activities) {
      setActivities(res.activities)
    } else {
      alert('Erro ao carregar histórico: ' + (res.error || 'Erro desconhecido'))
    }
    setLoadingActivities(false)
  }

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!historyLead || !newActivityContent.trim()) return
    setSubmittingActivity(true)

    const res = await addLeadActivity(historyLead.id, newActivityContent.trim(), 'NOTE')
    if (res.error) {
      alert(res.error)
    } else {
      setNewActivityContent('')
      const actRes = await getLeadActivities(historyLead.id)
      if (actRes.success && actRes.activities) {
        setActivities(actRes.activities)
      }
      loadLeads()
    }
    setSubmittingActivity(false)
  }

  // Registro de Contato Manual
  const handleManualContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualContactLead) return
    setSubmittingManualContact(true)

    const res = await registerManualContact(manualContactLead.id, {
      summary: contactSummary,
      notes: contactNotes || undefined
    })

    if (res.error) {
      alert(res.error)
    } else {
      setManualContactLead(null)
      setContactSummary('')
      setContactNotes('')
      loadLeads()
    }
    setSubmittingManualContact(false)
  }

  // Agendamento de Retorno (Possível Conversão)
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedulingLead || !callbackDate) return
    setSubmittingSchedule(true)

    const res = await updateLeadStatus(
      schedulingLead.id, 
      'POSSIBLE_CONVERSION', 
      callbackNotes || undefined, 
      new Date(callbackDate)
    )

    if (res.error) {
      alert(res.error)
    } else {
      setSchedulingLead(null)
      setCallbackDate('')
      setCallbackNotes('')
      loadLeads()
    }
    setSubmittingSchedule(false)
  }

  // Drag and Drop do Kanban
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain')
    if (!leadId) return

    const leadToMove = leads.find(l => l.id === leadId)
    if (!leadToMove) return

    if (targetStatus === 'POSSIBLE_CONVERSION') {
      setSchedulingLead(leadToMove)
      setCallbackDate('')
      setCallbackNotes('')
    } else if (targetStatus === 'BOUGHT') {
      setConvertingLead(leadToMove)
    } else {
      await handleStatusChange(leadId, targetStatus)
    }
  }

  // Auxiliares de data e tempo decorrido
  const getElapsedDays = (createdAt: string) => {
    const createdDate = new Date(createdAt)
    const today = new Date()
    const diffTime = today.getTime() - createdDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  const getElapsedDaysText = (createdAt: string) => {
    const days = getElapsedDays(createdAt)
    if (days === 0) return 'Novo Hoje'
    if (days === 1) return 'Há 1 dia'
    return `Há ${days} dias`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className={`${styles.badge} ${styles.badgeNew}`}>Novo Lead</span>
      case 'MESSAGE_SENT':
        return <span className={`${styles.badge} ${styles.badgeNew}`} style={{ background: 'rgba(92, 107, 192, 0.12)', color: '#3f51b5' }}>Contato Realizado</span>
      case 'POSSIBLE_CONVERSION':
        return <span className={`${styles.badge} ${styles.badgePurple}`}>Possível Conversão</span>
      case 'RETORNAR_MES_SEGUINTE':
        return <span className={`${styles.badge} ${styles.badgeOrange}`}>Próximo Mês</span>
      case 'NOT_BOUGHT':
        return <span className={`${styles.badge} ${styles.badgeRed}`}>Não Comprou</span>
      case 'BOUGHT':
        return <span className={`${styles.badge}`} style={{ background: 'rgba(76, 175, 80, 0.12)', color: '#4caf50' }}>Convertido (Compra)</span>
      case 'ARCHIVED':
        return <span className={`${styles.badge}`} style={{ background: 'rgba(158, 158, 158, 0.12)', color: '#9e9e9e' }}>Arquivado</span>
      default:
        return <span className={styles.badge}>{status}</span>
    }
  }

  const filterButtons = [
    { label: 'Todos Ativos', value: 'todos' },
    { label: '1 dia após', value: '1' },
    { label: '4 dias após', value: '4' },
    { label: '8 dias após', value: '8' },
    { label: '12 dias após', value: '12' },
    { label: '15 dias após', value: '15' },
    { label: '30 dias após', value: '30' },
  ]

  // Kanban Columns Definition
  const kanbanCols = [
    { id: 'NEW', title: 'Novo Lead', color: 'rgba(212, 175, 55, 0.15)', text: '#d4af37' },
    { id: 'MESSAGE_SENT', title: 'Contato Realizado', color: 'rgba(63, 81, 181, 0.15)', text: '#3f51b5' },
    { id: 'POSSIBLE_CONVERSION', title: 'Possível Conversão', color: 'rgba(156, 39, 176, 0.15)', text: '#9c27b0' },
    { id: 'RETORNAR_MES_SEGUINTE', title: 'Próximo Mês', color: 'rgba(230, 81, 0, 0.15)', text: '#e65100' },
    { id: 'NOT_BOUGHT', title: 'Não Comprou', color: 'rgba(198, 40, 40, 0.15)', text: '#c62828' }
  ]

  // Encontra alertas de retorno agendados para hoje ou passados
  const pendingCallbacks = leads.filter(lead => {
    if (lead.status !== 'POSSIBLE_CONVERSION' || !lead.nextContactDate) return false
    const callbackTime = new Date(lead.nextContactDate).getTime()
    const now = new Date().getTime()
    return callbackTime <= now
  })

  // Aplica o filtro de alertas pendentes
  const displayedLeads = filterPendingCallbacksOnly
    ? leads.filter(l => l.status === 'POSSIBLE_CONVERSION' && l.nextContactDate && new Date(l.nextContactDate).getTime() <= new Date().getTime())
    : leads

  // Cálculo das etapas do funil de conversão comercial
  const totalLeads = stats.total || leads.length || 0
  const totalCount = totalLeads || 1
  const contactedLeads = leads.filter(l => l.status === 'MESSAGE_SENT' || l.status === 'POSSIBLE_CONVERSION' || l.status === 'BOUGHT').length
  const negotiatingLeads = leads.filter(l => l.status === 'POSSIBLE_CONVERSION' || l.status === 'BOUGHT').length
  const boughtLeads = leads.filter(l => l.status === 'BOUGHT').length

  const funnelStages = [
    { label: 'Oportunidades (Total)', count: totalLeads, pct: 100, color: 'linear-gradient(135deg, #d4af37, #aa7c11)' },
    { label: 'Contatos Efetuados', count: contactedLeads, pct: Math.round((contactedLeads / totalCount) * 100), color: 'linear-gradient(135deg, #3f51b5, #2196f3)' },
    { label: 'Negociações (Retornos)', count: negotiatingLeads, pct: Math.round((negotiatingLeads / totalCount) * 100), color: 'linear-gradient(135deg, #9c27b0, #e040fb)' },
    { label: 'Vendas (Convertidos)', count: boughtLeads, pct: Math.round((boughtLeads / totalCount) * 100), color: 'linear-gradient(135deg, #4caf50, #81c784)' }
  ]

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h1>🎯 CRM: Gestão de Leads</h1>
          <p className={styles.subtitle}>Cadastre novas oportunidades e faça o acompanhamento de vendas nos prazos certos.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={() => setIsRegisterModalOpen(true)}>
            ➕ Novo Lead
          </Button>
          <Link href="/clientes">
            <Button variant="secondary">← Voltar para Clientes</Button>
          </Link>
        </div>
      </div>

      {/* Alerta de Retornos Pendentes */}
      {pendingCallbacks.length > 0 && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <span className={styles.alertIcon}>⚠️</span>
            <div>
              <strong>Atenção:</strong> Você possui <strong>{pendingCallbacks.length} retorno(s) de contato pendente(s)</strong> para hoje ou datas anteriores.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={styles.alertBtn}
              onClick={() => setFilterPendingCallbacksOnly(!filterPendingCallbacksOnly)}
            >
              {filterPendingCallbacksOnly ? 'Ver Todos os Leads' : 'Filtrar Pendentes'}
            </button>
            {filterPendingCallbacksOnly && (
              <button 
                className={styles.alertBtnSecondary}
                onClick={() => setFilterPendingCallbacksOnly(false)}
              >
                Limpar Filtro
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid de Estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statInfo}>
            <h3>Total de Leads</h3>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(212, 175, 55, 0.12)' }}>⚡</div>
          <div className={styles.statInfo}>
            <h3>Aguardando Ação</h3>
            <div className={styles.statValue}>{stats.new}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(92, 107, 192, 0.12)', color: '#3f51b5' }}>💬</div>
          <div className={styles.statInfo}>
            <h3>Contatados</h3>
            <div className={styles.statValue}>{stats.sent}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(244, 143, 177, 0.12)' }}>📅</div>
          <div className={styles.statInfo}>
            <h3>Adiado p/ Mês Seguinte</h3>
            <div className={styles.statValue}>{stats.nextMonth}</div>
          </div>
        </div>
      </div>

      {/* Funil de Vendas Visual */}
      <div className={styles.funnelContainer}>
        <h3>📊 Funil Comercial (Taxa de Conversão Geral)</h3>
        <div className={styles.funnelFlow}>
          {funnelStages.map((stage, idx) => (
            <div key={idx} className={styles.funnelStage}>
              <span className={styles.funnelLabel}>{stage.label}</span>
              <div className={styles.funnelTrack}>
                <div 
                  className={styles.funnelBar} 
                  style={{ 
                    width: `${Math.max(stage.pct, 8)}%`, 
                    background: stage.color 
                  }}
                >
                  {stage.pct}%
                </div>
              </div>
              <span className={styles.funnelValue}>{stage.count} lead{stage.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Seletor de Modo de Visualização (Tabela vs. Kanban) */}
      <div className={styles.viewToggle}>
        <button 
          className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.toggleBtnActive : ''}`}
          onClick={() => setViewMode('table')}
        >
          📋 Tabela de Leads
        </button>
        <button 
          className={`${styles.toggleBtn} ${viewMode === 'kanban' ? styles.toggleBtnActive : ''}`}
          onClick={() => setViewMode('kanban')}
        >
          🗂️ Quadro Kanban (CRM)
        </button>
      </div>

      {/* Layout Principal da Listagem (Largura Total) */}
      <div className={styles.mainLayout}>
        <div style={{ width: '100%' }}>
          {/* Controles de Filtros */}
          <div className={styles.controlsRow}>
            <div className={styles.filterGroup}>
              {filterButtons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => {
                    setFilterPendingCallbacksOnly(false)
                    setActiveFilter(btn.value)
                  }}
                  className={`${styles.filterBtn} ${activeFilter === btn.value && !filterPendingCallbacksOnly ? styles.filterBtnActive : ''}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Filtro por vendedor - visível apenas para administradores */}
              {isAdmin && (
                <select
                  value={activeSeller}
                  onChange={(e) => {
                    setFilterPendingCallbacksOnly(false)
                    setActiveSeller(e.target.value)
                  }}
                  className={styles.statusSelect}
                  style={{ borderColor: 'var(--gold-primary)', color: 'var(--gold-primary)' }}
                >
                  <option value="">Filtrar por Vendedor (Todos)</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      👤 {seller.name} ({seller.role})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={activeStatus}
                onChange={(e) => {
                  setFilterPendingCallbacksOnly(false)
                  setActiveStatus(e.target.value)
                }}
                className={styles.statusSelect}
              >
                <option value="">Todos Ativos</option>
                <option value="NEW">Somente Novos</option>
                <option value="MESSAGE_SENT">Somente Contatados</option>
                <option value="POSSIBLE_CONVERSION">Possíveis Conversões</option>
                <option value="RETORNAR_MES_SEGUINTE">Somente Adiados</option>
                <option value="NOT_BOUGHT">Somente Não Compraram</option>
                <option value="BOUGHT">Mostrar Convertidos (Compra)</option>
                <option value="ARCHIVED">Mostrar Arquivados</option>
              </select>
            </div>
          </div>

          {viewMode === 'kanban' ? (
            /* Quadro Kanban Interativo */
            <div className={styles.kanbanBoard}>
              {kanbanCols.map(col => {
                const colLeads = displayedLeads.filter(l => l.status === col.id)
                return (
                  <div 
                    key={col.id} 
                    className={styles.kanbanColumn}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    <div className={styles.kanbanColumnHeader} style={{ borderColor: col.text }}>
                      <span style={{ color: col.text }}>{col.title}</span>
                      <span className={styles.badge} style={{ background: col.color, color: col.text }}>
                        {colLeads.length}
                      </span>
                    </div>

                    <div className={styles.kanbanCardList}>
                      {colLeads.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                          Arraste leads aqui
                        </div>
                      ) : (
                        colLeads.map(lead => {
                          const daysElapsed = getElapsedDays(lead.createdAt)
                          const isWarning = daysElapsed >= 8 && lead.status === 'NEW'

                          return (
                            <div 
                              key={lead.id} 
                              className={styles.kanbanCard}
                              draggable
                              onDragStart={(e) => handleDragStart(e, lead.id)}
                            >
                              <div className={styles.kanbanCardHeader}>
                                {lead.name}
                              </div>
                              <div className={styles.kanbanCardBody}>
                                <div>📞 {lead.phone}</div>
                                <div>
                                  <span className={`${styles.badgeDays} ${isWarning ? styles.badgeDaysWarning : ''}`} style={{ fontSize: '0.7rem' }}>
                                    {getElapsedDaysText(lead.createdAt)}
                                  </span>
                                </div>
                                {lead.lastContactAt && (
                                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                    Último contato: {new Date(lead.lastContactAt).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                                {lead.nextContactDate && (
                                  <div style={{ fontSize: '0.73rem', color: '#9c27b0', fontWeight: '600' }}>
                                    📅 Retorno: {new Date(lead.nextContactDate).toLocaleDateString('pt-BR')} {new Date(lead.nextContactDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                                {lead.tags && (
                                  <div className={styles.tagsContainer}>
                                    {lead.tags.split(',').map((tag: string, idx: number) => {
                                      const cleanTag = tag.trim()
                                      if (!cleanTag) return null
                                      return (
                                        <span key={idx} className={styles.tagPill}>
                                          {cleanTag}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className={styles.kanbanCardFooter}>
                                <button
                                  className={`${styles.btnAction} ${styles.btnWhatsapp}`}
                                  onClick={() => handleWhatsAppSend(lead)}
                                  title="WhatsApp Direct"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.73rem' }}
                                >
                                  💬 WA
                                </button>
                                <button
                                  className={`${styles.btnAction} ${styles.btnManualContact}`}
                                  onClick={() => {
                                    setManualContactLead(lead)
                                    setContactSummary('')
                                    setContactNotes('')
                                  }}
                                  title="Reg. Contato Manual"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.73rem' }}
                                >
                                  📞
                                </button>
                                <button
                                  className={`${styles.btnAction} ${styles.btnSchedule}`}
                                  onClick={() => {
                                    setSchedulingLead(lead)
                                    setCallbackDate('')
                                    setCallbackNotes('')
                                  }}
                                  title="Agendar Retorno"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.73rem' }}
                                >
                                  🗓️
                                </button>
                                <button
                                  className={styles.btnIconAction}
                                  onClick={() => openEditModal(lead)}
                                  title="Editar Lead"
                                  style={{ padding: '0.2rem', fontSize: '0.73rem' }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className={styles.btnIconAction}
                                  onClick={() => openHistoryModal(lead)}
                                  title="Ver Histórico"
                                  style={{ padding: '0.2rem', fontSize: '0.73rem' }}
                                >
                                  📜
                                </button>
                                <button
                                  className={`${styles.btnIconAction} ${styles.btnDelete}`}
                                  onClick={() => handleDeleteLead(lead.id)}
                                  title="Excluir"
                                  style={{ padding: '0.2rem', fontSize: '0.73rem' }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Visualização Convencional em Tabela */
            <Card>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.colName}>Lead / Oportunidade</th>
                      <th className={styles.colContact}>Decorrido / Último Contato</th>
                      <th className={styles.colTags}>Tags / Interesses</th>
                      <th className={styles.colStatus}>Status</th>
                      <th className={styles.colNotes}>Observações</th>
                      <th className={styles.colActions}>Ações de Venda & CRM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                          Buscando contatos...
                        </td>
                      </tr>
                    ) : displayedLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                          Nenhum lead encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      displayedLeads.map((lead) => {
                        const daysElapsed = getElapsedDays(lead.createdAt)
                        const isWarning = daysElapsed >= 8 && lead.status === 'NEW'

                        return (
                          <tr key={lead.id}>
                            <td className={styles.colName}>
                              <div>
                                <div className={styles.leadName}>{lead.name}</div>
                                <div className={styles.leadPhone}>{lead.phone}</div>
                              </div>
                            </td>
                            <td className={styles.colContact}>
                              <div>
                                <span className={`${styles.badgeDays} ${isWarning ? styles.badgeDaysWarning : ''}`}>
                                  {getElapsedDaysText(lead.createdAt)}
                                </span>
                                <div className={styles.lastContact}>
                                  {lead.lastContactAt ? (
                                    <span className={styles.lastContactDate} title="Data do último envio WhatsApp/contato">
                                      💬 {new Date(lead.lastContactAt).toLocaleDateString('pt-BR')} {new Date(lead.lastContactAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className={styles.noContact}>Sem contato</span>
                                  )}
                                </div>
                                {lead.nextContactDate && (
                                  <div className={styles.nextContactAlert} title="Retorno agendado">
                                    📅 Retorno: {new Date(lead.nextContactDate).toLocaleDateString('pt-BR')} {new Date(lead.nextContactDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className={styles.colTags}>
                              <div className={styles.tagsContainer}>
                                {lead.tags ? (
                                  lead.tags.split(',').map((tag: string, idx: number) => {
                                    const cleanTag = tag.trim()
                                    if (!cleanTag) return null
                                    return (
                                      <span key={idx} className={styles.tagPill}>
                                        {cleanTag}
                                      </span>
                                    )
                                  })
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem tags</span>
                                )}
                              </div>
                            </td>
                            <td className={styles.colStatus}>{getStatusBadge(lead.status)}</td>
                            <td className={styles.colNotes}>
                              {editingLeadId === lead.id ? (
                                <div className={styles.noteInputWrapper}>
                                  <input
                                    type="text"
                                    className={styles.noteInput}
                                    value={editingNotes}
                                    onChange={(e) => setEditingNotes(e.target.value)}
                                    autoFocus
                                  />
                                  <button
                                    className={styles.btnInlineSave}
                                    onClick={() => handleSaveNotes(lead.id)}
                                    title="Salvar"
                                  >
                                    ✔
                                  </button>
                                  <button
                                    className={styles.btnInlineEdit}
                                    onClick={() => setEditingLeadId(null)}
                                    title="Cancelar"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span className={styles.noteText} title={lead.notes || 'Sem observações'}>
                                    {lead.notes || 'Nenhuma anotação'}
                                  </span>
                                  <button
                                    className={styles.btnInlineEdit}
                                    onClick={() => {
                                      setEditingLeadId(lead.id)
                                      setEditingNotes(lead.notes || '')
                                    }}
                                    title="Editar observações"
                                  >
                                    ✏
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className={styles.colActions}>
                              <div className={styles.actionsCell}>
                                {/* WhatsApp Direct (Primary Action) */}
                                <button
                                  className={`${styles.btnAction} ${styles.btnWhatsapp}`}
                                  onClick={() => handleWhatsAppSend(lead)}
                                  title="Enviar WhatsApp"
                                >
                                  💬 WhatsApp
                                </button>

                                {/* Dropdown Menu (Secondary Actions) */}
                                <div className={styles.actionsDropdownContainer}>
                                  <button
                                    className={styles.btnDots}
                                    onClick={() => setActiveDropdownLeadId(activeDropdownLeadId === lead.id ? null : lead.id)}
                                    title="Ações"
                                  >
                                    ⋮
                                  </button>

                                  {activeDropdownLeadId === lead.id && (
                                    <>
                                      <div className={styles.dropdownBackdrop} onClick={() => setActiveDropdownLeadId(null)} />
                                      <div className={styles.dropdownMenu}>
                                        {/* Registrar Contato Manual */}
                                        <button
                                          className={styles.dropdownItem}
                                          onClick={() => {
                                            setActiveDropdownLeadId(null)
                                            setManualContactLead(lead)
                                            setContactSummary('')
                                            setContactNotes('')
                                          }}
                                        >
                                          📞 Registrar Contato
                                        </button>

                                        {/* Agendar Retorno */}
                                        {lead.status !== 'BOUGHT' && (
                                          <button
                                            className={styles.dropdownItem}
                                            onClick={() => {
                                              setActiveDropdownLeadId(null)
                                              setSchedulingLead(lead)
                                              setCallbackDate('')
                                              setCallbackNotes('')
                                            }}
                                          >
                                            🗓️ Agendar Retorno
                                          </button>
                                        )}

                                        {/* Comprou -> Abre modal */}
                                        {lead.status !== 'BOUGHT' && (
                                          <button
                                            className={`${styles.dropdownItem} ${styles.dropdownItemConvert}`}
                                            onClick={() => {
                                              setActiveDropdownLeadId(null)
                                              setConvertingLead(lead)
                                            }}
                                          >
                                            🤝 Comprou (Converter)
                                          </button>
                                        )}

                                        {/* Não comprou */}
                                        {lead.status !== 'NOT_BOUGHT' && lead.status !== 'BOUGHT' && (
                                          <button
                                            className={styles.dropdownItem}
                                            onClick={() => {
                                              setActiveDropdownLeadId(null)
                                              handleStatusChange(lead.id, 'NOT_BOUGHT')
                                            }}
                                          >
                                            ❌ Não Comprou
                                          </button>
                                        )}

                                        {/* Arquivar */}
                                        {lead.status !== 'ARCHIVED' && (
                                          <button
                                            className={styles.dropdownItem}
                                            onClick={() => {
                                              setActiveDropdownLeadId(null)
                                              handleStatusChange(lead.id, 'ARCHIVED')
                                            }}
                                          >
                                            📥 Arquivar Lead
                                          </button>
                                        )}

                                        <div className={styles.dropdownDivider} />

                                        {/* Editar Dados */}
                                        <button
                                          className={styles.dropdownItem}
                                          onClick={() => {
                                            setActiveDropdownLeadId(null)
                                            openEditModal(lead)
                                          }}
                                        >
                                          ✏️ Editar Dados
                                        </button>

                                        {/* Histórico */}
                                        <button
                                          className={styles.dropdownItem}
                                          onClick={() => {
                                            setActiveDropdownLeadId(null)
                                            openHistoryModal(lead)
                                          }}
                                        >
                                          📜 Ver Histórico
                                        </button>

                                        <div className={styles.dropdownDivider} />

                                        {/* Excluir */}
                                        <button
                                          className={`${styles.dropdownItem} ${styles.dropdownItemDelete}`}
                                          onClick={() => {
                                            setActiveDropdownLeadId(null)
                                            handleDeleteLead(lead.id)
                                          }}
                                        >
                                          🗑️ Excluir Lead
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Conversão para Cliente */}
      {convertingLead && (
        <div className={styles.modalOverlay} onClick={() => setConvertingLead(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setConvertingLead(null)}>
              ✕
            </button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Converter Lead em Cliente</h2>
              <p className={styles.modalDesc}>
                O lead <strong>{convertingLead.name}</strong> realizou uma compra! Vamos cadastrá-lo como cliente fixo.
              </p>
            </div>

            <form onSubmit={handleConversionSubmit}>
              <div className={styles.formGroup}>
                <label>CPF do Cliente (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 000.000.000-00"
                  value={customerCpf}
                  onChange={(e) => setCustomerCpf(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>E-mail (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ex: cliente@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setConvertingLead(null)}
                >
                  Cancelar
                </Button>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1, margin: 0 }} disabled={converting}>
                  {converting ? 'Salvando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Lead */}
      {editingLead && (
        <div className={styles.modalOverlay} onClick={() => setEditingLead(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setEditingLead(null)}>
              ✕
            </button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar Dados do Lead</h2>
              <p className={styles.modalDesc}>
                Atualize as informações do lead e suas tags de interesse.
              </p>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGroup}>
                <label>Nome do Lead</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tags de Interesse (separadas por vírgula)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Ex: Botox, Preenchimento, Estética"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingLead(null)}
                >
                  Cancelar
                </Button>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1, margin: 0 }} disabled={isEditingSubmit}>
                  {isEditingSubmit ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico e Atividades */}
      {historyLead && (
        <div className={styles.modalOverlay} onClick={() => setHistoryLead(null)}>
          <div className={styles.modal} style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setHistoryLead(null)}>
              ✕
            </button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Histórico do Lead: {historyLead.name}</h2>
              <p className={styles.modalDesc}>
                Linha do tempo de interações, mudanças de status e anotações.
              </p>
            </div>

            {/* Adicionar anotação rápida */}
            <form onSubmit={handleAddActivity} className={styles.activityForm}>
              <div className={styles.formGroup}>
                <label htmlFor="history-note">Nova Anotação no Histórico</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="history-note"
                    type="text"
                    placeholder="Ex: Cliente pediu retorno na segunda de manhã..."
                    value={newActivityContent}
                    onChange={(e) => setNewActivityContent(e.target.value)}
                    style={{ flex: 1, marginBottom: 0 }}
                    required
                  />
                  <button type="submit" className={styles.submitBtn} style={{ margin: 0, padding: '0 1.5rem', width: 'auto' }} disabled={submittingActivity}>
                    {submittingActivity ? 'Adicionando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </form>

            {/* Linha do tempo */}
            <div className={styles.timelineContainer}>
              <h3>Linha do Tempo</h3>
              <div className={styles.timeline}>
                {loadingActivities ? (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>Carregando histórico...</div>
                ) : activities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                    Nenhuma atividade registrada ainda.
                  </div>
                ) : (
                  activities.map((act) => {
                    let icon = '📝';
                    if (act.type === 'STATUS_CHANGE') icon = '🔄';
                    if (act.type === 'CONTACT') icon = '💬';

                    return (
                      <div key={act.id} className={styles.timelineItem}>
                        <div className={styles.timelineIcon}>{icon}</div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineMeta}>
                            {new Date(act.createdAt).toLocaleString('pt-BR')}
                          </div>
                          <div className={styles.timelineText}>{act.content}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Contato Manual */}
      {manualContactLead && (
        <div className={styles.modalOverlay} onClick={() => setManualContactLead(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setManualContactLead(null)}>
              ✕
            </button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Registrar Contato Manual</h2>
              <p className={styles.modalDesc}>
                Grave os detalhes de contato manual com <strong>{manualContactLead.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleManualContactSubmit}>
              <div className={styles.formGroup}>
                <label>Tipo/Resumo do Contato</label>
                <input
                  type="text"
                  placeholder="Ex: Ligação telefônica, Instagram, WhatsApp manual"
                  value={contactSummary}
                  onChange={(e) => setContactSummary(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Anotações do Contato (Opcional)</label>
                <textarea
                  placeholder="Ex: Conversado sobre as opções de parcelamento. Cliente ficou de retornar..."
                  rows={3}
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setManualContactLead(null)}
                >
                  Cancelar
                </Button>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1, margin: 0 }} disabled={submittingManualContact}>
                  {submittingManualContact ? 'Salvando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Agendamento de Retorno (Possível Conversão) */}
      {schedulingLead && (
        <div className={styles.modalOverlay} onClick={() => setSchedulingLead(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setSchedulingLead(null)}>
              ✕
            </button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Agendar Retorno (Possível Conversão)</h2>
              <p className={styles.modalDesc}>
                Selecione uma data e hora para fazer o retorno do contato para <strong>{schedulingLead.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleScheduleSubmit}>
              <div className={styles.formGroup}>
                <label>Data e Hora do Retorno</label>
                <input
                  type="datetime-local"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>O que retornar/Anotações (Opcional)</label>
                <textarea
                  placeholder="Ex: Enviar orçamento com desconto ou confirmar se ela recebeu os valores..."
                  rows={3}
                  value={callbackNotes}
                  onChange={(e) => setCallbackNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setSchedulingLead(null)}
                >
                  Cancelar
                </Button>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1, margin: 0 }} disabled={submittingSchedule}>
                  {submittingSchedule ? 'Agendando...' : 'Confirmar e Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Cadastro de Lead */}
      {isRegisterModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRegisterModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setIsRegisterModalOpen(false)}>
              ✕
            </button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Cadastrar Novo Lead</h2>
              <p className={styles.modalDesc}>Adicione uma nova oportunidade de venda no CRM.</p>
            </div>
            <form onSubmit={handleRegister}>
              <div className={styles.formGroup}>
                <label htmlFor="lead-name">Nome do Lead</label>
                <input
                  id="lead-name"
                  type="text"
                  placeholder="Ex: Maria da Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lead-phone">Telefone (WhatsApp)</label>
                <input
                  id="lead-phone"
                  type="tel"
                  placeholder="Ex: 11 99999-9999"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lead-tags">Tags / Interesses (Separe por vírgula)</label>
                <input
                  id="lead-tags"
                  type="text"
                  placeholder="Ex: Botox, Preenchimento, Dúvida"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lead-notes">Anotações Iniciais</label>
                <textarea
                  id="lead-notes"
                  placeholder="Interesse em preenchimento, dúvida sobre parcelamento, etc."
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Cadastrando...' : 'Confirmar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
