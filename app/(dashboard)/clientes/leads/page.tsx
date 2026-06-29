'use client'

import React, { useState, useEffect } from 'react'
import styles from './leads.module.css'
import { registerLead, getLeadsCRM, updateLeadStatus, convertLeadToCustomer } from '@/app/actions/leadActions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [template, setTemplate] = useState('')
  const [loading, setLoading] = useState(true)

  // Filtros
  const [activeFilter, setActiveFilter] = useState('todos')
  const [activeStatus, setActiveStatus] = useState('') // Vazio busca todos ativos (sem BOUGHT/ARCHIVED)

  // Form de cadastro
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edição inline de anotações
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState('')

  // Modal de conversão em cliente
  const [convertingLead, setConvertingLead] = useState<any | null>(null)
  const [customerCpf, setCustomerCpf] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [converting, setConverting] = useState(false)

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
    const res = await getLeadsCRM(activeFilter, activeStatus)
    if (res.success && res.leads) {
      setLeads(res.leads)
      setTemplate(res.template || '')
      
      // Atualiza estatísticas (fazemos a contagem local rápida baseada no retorno sem filtro de data)
      // Buscamos todas as estatísticas buscando a lista completa ativa
      const fullRes = await getLeadsCRM('todos', '')
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
  }, [activeFilter, activeStatus])

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
      notes: newNotes
    })

    if (res.error) {
      alert(res.error)
    } else {
      setNewName('')
      setNewPhone('')
      setNewNotes('')
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

  // Salvar nota inline
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

  // Enviar mensagem personalizada via WhatsApp
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

    // Atualiza automaticamente o status para "Mensagem Enviada" caso esteja como Novo
    if (lead.status === 'NEW') {
      handleStatusChange(lead.id, 'MESSAGE_SENT')
    }
  }

  // Auxiliares de formatação de dias decorridos
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

  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h1>🎯 CRM: Gestão de Leads</h1>
          <p className={styles.subtitle}>Cadastre novas oportunidades e faça o acompanhamento de vendas nos prazos certos.</p>
        </div>
        <Link href="/clientes">
          <Button variant="secondary">← Voltar para Clientes</Button>
        </Link>
      </div>

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

      {/* Layout Split */}
      <div className={styles.mainLayout}>
        {/* Lançamento / Cadastro Lateral */}
        <div className={styles.formCard}>
          <h2>Lançar Novo Lead</h2>
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
              {submitting ? 'Cadastrando...' : 'Adicionar Lead'}
            </button>
          </form>
        </div>

        {/* Listagem de Leads */}
        <div>
          {/* Controles de Filtros */}
          <div className={styles.controlsRow}>
            <div className={styles.filterGroup}>
              {filterButtons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setActiveFilter(btn.value)}
                  className={`${styles.filterBtn} ${activeFilter === btn.value ? styles.filterBtnActive : ''}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value)}
              className={styles.statusSelect}
            >
              <option value="">Todos Ativos</option>
              <option value="NEW">Somente Novos</option>
              <option value="MESSAGE_SENT">Somente Contatados</option>
              <option value="RETORNAR_MES_SEGUINTE">Somente Adiados</option>
              <option value="NOT_BOUGHT">Somente Não Compraram</option>
              <option value="BOUGHT">Mostrar Convertidos (Compra)</option>
              <option value="ARCHIVED">Mostrar Arquivados</option>
            </select>
          </div>

          {/* Card com a Tabela */}
          <Card>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lead / Oportunidade</th>
                    <th>Decorrido</th>
                    <th>Status</th>
                    <th>Observações</th>
                    <th>Ações de Venda & CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        Buscando contatos...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        Nenhum lead encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const daysElapsed = getElapsedDays(lead.createdAt)
                      const isWarning = daysElapsed >= 8 && lead.status === 'NEW'

                      return (
                        <tr key={lead.id}>
                          <td>
                            <div>
                              <div className={styles.leadName}>{lead.name}</div>
                              <div className={styles.leadPhone}>{lead.phone}</div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.badgeDays} ${isWarning ? styles.badgeDaysWarning : ''}`}>
                              {getElapsedDaysText(lead.createdAt)}
                            </span>
                          </td>
                          <td>{getStatusBadge(lead.status)}</td>
                          <td>
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
                          <td>
                            <div className={styles.actionsCell}>
                              {/* WhatsApp Direct */}
                              <button
                                className={`${styles.btnAction} ${styles.btnWhatsapp}`}
                                onClick={() => handleWhatsAppSend(lead)}
                                title="Enviar mensagem pré-definida"
                              >
                                💬 WhatsApp
                              </button>

                              {/* Comprou -> Abre modal para cadastrar mais dados */}
                              {lead.status !== 'BOUGHT' && (
                                <button
                                  className={`${styles.btnAction} ${styles.btnConvert}`}
                                  onClick={() => setConvertingLead(lead)}
                                >
                                  🤝 Comprou
                                </button>
                              )}

                              {/* Outras Ações */}
                              {lead.status !== 'NOT_BOUGHT' && lead.status !== 'BOUGHT' && (
                                <button
                                  className={styles.btnAction}
                                  onClick={() => handleStatusChange(lead.id, 'NOT_BOUGHT')}
                                >
                                  ❌ Não comprou
                                </button>
                              )}

                              {lead.status !== 'RETORNAR_MES_SEGUINTE' && lead.status !== 'BOUGHT' && (
                                <button
                                  className={styles.btnAction}
                                  onClick={() => handleStatusChange(lead.id, 'RETORNAR_MES_SEGUINTE')}
                                  title="Adiar contato para o próximo mês"
                                >
                                  🗓 Próx. Mês
                                </button>
                              )}

                              {lead.status !== 'ARCHIVED' && (
                                <button
                                  className={styles.btnAction}
                                  onClick={() => handleStatusChange(lead.id, 'ARCHIVED')}
                                  title="Arquivar lead"
                                >
                                  📥 Arquivar
                                </button>
                              )}
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
    </div>
  )
}
