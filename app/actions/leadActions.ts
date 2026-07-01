'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

// Cadastra um novo Lead
export async function registerLead(data: { name: string; phone: string; notes?: string; tags?: string }) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  if (!data.name || !data.phone) {
    return { error: 'Nome e telefone são obrigatórios' }
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        notes: data.notes || '',
        tags: data.tags || '',
        status: 'NEW',
        userId: session.userId,
        activities: {
          create: [
            {
              content: 'Lead cadastrado no CRM',
              type: 'STATUS_CHANGE'
            },
            ...(data.notes ? [{
              content: `Anotação inicial: ${data.notes}`,
              type: 'NOTE'
            }] : [])
          ]
        }
      }
    })
    revalidatePath('/clientes/leads')
    return { success: true, lead }
  } catch (err: any) {
    console.error('Error in registerLead:', err)
    return { error: `Erro ao cadastrar lead: ${err.message || String(err)}` }
  }
}

// Busca todos os leads filtrados por intervalo de dias decorridos ou status
export async function getLeadsCRM(filterDays?: string, status?: string, sellerId?: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let whereCondition: any = {}

    // Filtro por usuário (não-administradores veem apenas seus próprios leads)
    if (session.role !== 'ADMIN') {
      whereCondition.userId = session.userId
    } else if (sellerId) {
      whereCondition.userId = sellerId
    }

    // Filtros de tempo com base no createdAt (data de criação / primeiro contato)
    if (filterDays && filterDays !== 'todos') {
      if (filterDays === '1') {
        // 1 a 3 dias atrás
        const maxDate = new Date(todayStart.getTime() - 1 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000 + 999)
        const minDate = new Date(todayStart.getTime() - 3 * 24 * 60 * 60 * 1000)
        whereCondition.createdAt = { gte: minDate, lte: maxDate }
      } else if (filterDays === '4') {
        // 4 a 7 dias atrás
        const maxDate = new Date(todayStart.getTime() - 4 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000 + 999)
        const minDate = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
        whereCondition.createdAt = { gte: minDate, lte: maxDate }
      } else if (filterDays === '8') {
        // 8 a 11 dias atrás
        const maxDate = new Date(todayStart.getTime() - 8 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000 + 999)
        const minDate = new Date(todayStart.getTime() - 11 * 24 * 60 * 60 * 1000)
        whereCondition.createdAt = { gte: minDate, lte: maxDate }
      } else if (filterDays === '12') {
        // 12 a 14 dias atrás
        const maxDate = new Date(todayStart.getTime() - 12 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000 + 999)
        const minDate = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000)
        whereCondition.createdAt = { gte: minDate, lte: maxDate }
      } else if (filterDays === '15') {
        // 15 a 29 dias atrás
        const maxDate = new Date(todayStart.getTime() - 15 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000 + 999)
        const minDate = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000)
        whereCondition.createdAt = { gte: minDate, lte: maxDate }
      } else if (filterDays === '30') {
        // 30+ dias atrás
        const maxDate = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000 + 999)
        whereCondition.createdAt = { lte: maxDate }
      }
    }

    // Filtros de status
    if (status) {
      whereCondition.status = status
    } else {
      // Por padrão, não exibe leads convertidos (BOUGHT) nem arquivados (ARCHIVED)
      whereCondition.status = { notIn: ['BOUGHT', 'ARCHIVED'] }
    }

    const leads = await prisma.lead.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }
    })

    // Busca o template do WhatsApp para Leads das configurações
    const settings = await prisma.settings.findFirst({
      select: { whatsappTemplateLead: true }
    })

    return {
      success: true,
      leads,
      template: settings?.whatsappTemplateLead || 'Olá {nome}! Tudo bem? Passando para acompanhar o seu atendimento.'
    }
  } catch (err: any) {
    console.error('Error in getLeadsCRM:', err)
    return { error: `Erro ao buscar leads do CRM: ${err.message || String(err)}` }
  }
}

// Atualiza o status de um lead
export async function updateLeadStatus(leadId: string, status?: string, notes?: string, nextContactDateInput?: Date | string | null) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    let nextContactDate: Date | null = undefined

    if (nextContactDateInput !== undefined) {
      nextContactDate = nextContactDateInput ? new Date(nextContactDateInput) : null
    } else if (status === 'RETORNAR_MES_SEGUINTE') {
      const now = new Date()
      nextContactDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    }

    const updatedData: any = {}
    if (status !== undefined) updatedData.status = status
    if (nextContactDate !== undefined) updatedData.nextContactDate = nextContactDate
    if (notes !== undefined) updatedData.notes = notes

    // Se o status mudou para MESSAGE_SENT, atualiza lastContactAt
    if (status === 'MESSAGE_SENT') {
      updatedData.lastContactAt = new Date()
    }

    // Buscamos o lead atual para registrar a alteração de status
    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true, notes: true }
    })

    const activitiesToCreate: any[] = []

    if (status !== undefined && currentLead && currentLead.status !== status) {
      const statusLabels: Record<string, string> = {
        'NEW': 'Novo Lead',
        'MESSAGE_SENT': 'Contato Realizado',
        'RETORNAR_MES_SEGUINTE': 'Adiado para o Próximo Mês',
        'POSSIBLE_CONVERSION': 'Possível Conversão',
        'NOT_BOUGHT': 'Não Comprou',
        'BOUGHT': 'Convertido (Compra)',
        'ARCHIVED': 'Arquivado'
      }
      const oldLabel = statusLabels[currentLead.status] || currentLead.status
      const newLabel = statusLabels[status] || status
      
      let logContent = `Status alterado de "${oldLabel}" para "${newLabel}"`
      if (status === 'POSSIBLE_CONVERSION' && nextContactDate) {
        logContent += ` (Retorno agendado para: ${nextContactDate.toLocaleString('pt-BR')})`
      }

      activitiesToCreate.push({
        content: logContent,
        type: 'STATUS_CHANGE'
      })
    }

    if (status === 'MESSAGE_SENT') {
      activitiesToCreate.push({
        content: 'Mensagem enviada via WhatsApp',
        type: 'CONTACT'
      })
    }

    if (notes !== undefined && currentLead && currentLead.notes !== notes) {
      activitiesToCreate.push({
        content: `Anotação rápida editada: "${notes}"`,
        type: 'NOTE'
      })
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...updatedData,
        activities: {
          create: activitiesToCreate
        }
      }
    })

    revalidatePath('/clientes/leads')
    return { success: true, lead }
  } catch (err: any) {
    console.error('Error in updateLeadStatus:', err)
    return { error: `Erro ao atualizar status do lead: ${err.message || String(err)}` }
  }
}

// Converte um lead em cliente (marcando como compra realizada)
export async function convertLeadToCustomer(leadId: string, additionalData?: { cpf?: string; email?: string }) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    if (!lead) return { error: 'Lead não encontrado' }
    if (lead.status === 'BOUGHT') return { error: 'Lead já foi convertido em cliente' }

    // Verifica se já existe um cliente com o mesmo telefone
    let customer = await prisma.customer.findFirst({
      where: { phone: lead.phone, deletedAt: null }
    })

    // Se não existir, cria um novo
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: lead.name,
          phone: lead.phone,
          cpf: additionalData?.cpf || null,
          email: additionalData?.email || null,
          generalNotes: lead.notes ? `Convertido do CRM de Leads. Anotações iniciais: ${lead.notes}` : 'Convertido do CRM de Leads.'
        }
      })
    }

    // Atualiza o lead para status BOUGHT e vincula ao ID do cliente
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'BOUGHT',
        customerId: customer.id,
        activities: {
          create: {
            content: `Lead convertido em Cliente (CPF: ${additionalData?.cpf || 'Não informado'})`,
            type: 'STATUS_CHANGE'
          }
        }
      }
    })

    revalidatePath('/clientes')
    revalidatePath('/clientes/leads')
    revalidatePath('/pos')

    return { success: true, customer }
  } catch (err: any) {
    console.error('Error in convertLeadToCustomer:', err)
    return { error: `Erro ao converter lead para cliente: ${err.message || String(err)}` }
  }
}

// Edita dados básicos (Nome, Telefone, Tags) de um Lead
export async function updateLeadDetails(leadId: string, data: { name: string; phone: string; tags?: string }) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  if (!data.name || !data.phone) {
    return { error: 'Nome e telefone são obrigatórios' }
  }

  try {
    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    if (!currentLead) return { error: 'Lead não encontrado' }

    const activitiesToCreate = []
    if (currentLead.name !== data.name) {
      activitiesToCreate.push({
        content: `Nome alterado de "${currentLead.name}" para "${data.name}"`,
        type: 'NOTE'
      })
    }
    if (currentLead.phone !== data.phone) {
      activitiesToCreate.push({
        content: `Telefone alterado de "${currentLead.phone}" para "${data.phone}"`,
        type: 'NOTE'
      })
    }
    if (data.tags !== undefined && currentLead.tags !== data.tags) {
      activitiesToCreate.push({
        content: `Tags alteradas de "${currentLead.tags}" para "${data.tags}"`,
        type: 'NOTE'
      })
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name: data.name,
        phone: data.phone,
        tags: data.tags ?? currentLead.tags,
        activities: {
          create: activitiesToCreate
        }
      }
    })

    revalidatePath('/clientes/leads')
    return { success: true, lead }
  } catch (err: any) {
    console.error('Error in updateLeadDetails:', err)
    return { error: `Erro ao editar lead: ${err.message || String(err)}` }
  }
}

// Exclui um Lead
export async function deleteLead(leadId: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.lead.delete({
      where: { id: leadId }
    })

    revalidatePath('/clientes/leads')
    return { success: true }
  } catch (err: any) {
    console.error('Error in deleteLead:', err)
    return { error: `Erro ao excluir lead: ${err.message || String(err)}` }
  }
}

// Cria uma anotação manual no histórico do Lead
export async function addLeadActivity(leadId: string, content: string, type: string = 'NOTE') {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  if (!content) return { error: 'O conteúdo da anotação é obrigatório' }

  try {
    const activity = await prisma.leadActivity.create({
      data: {
        leadId,
        content,
        type
      }
    })
    revalidatePath('/clientes/leads')
    return { success: true, activity }
  } catch (err: any) {
    console.error('Error in addLeadActivity:', err)
    return { error: `Erro ao adicionar anotação no histórico: ${err.message || String(err)}` }
  }
}

// Busca todas as atividades/histórico de um lead
export async function getLeadActivities(leadId: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, activities }
  } catch (err: any) {
    console.error('Error in getLeadActivities:', err)
    return { error: `Erro ao buscar histórico do lead: ${err.message || String(err)}` }
  }
}

// Busca todos os vendedores/usuários do sistema (para filtros do administrador)
export async function getSellers() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    const sellers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })
    return { success: true, sellers }
  } catch (err: any) {
    console.error('Error in getSellers:', err)
    return { error: `Erro ao buscar vendedores: ${err.message || String(err)}` }
  }
}

// Registra um contato manual efetuado
export async function registerManualContact(leadId: string, data: { summary: string; notes?: string }) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  if (!data.summary) return { error: 'O resumo do contato é obrigatório' }

  try {
    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true }
    })

    if (!currentLead) return { error: 'Lead não encontrado' }

    const updatedData: any = {
      lastContactAt: new Date()
    }

    if (currentLead.status === 'NEW') {
      updatedData.status = 'MESSAGE_SENT'
    }

    if (data.notes !== undefined) {
      updatedData.notes = data.notes
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...updatedData,
        activities: {
          create: [
            {
              content: `Contato Efetuado (${data.summary})`,
              type: 'CONTACT'
            },
            ...(data.notes ? [{
              content: `Anotação durante contato: ${data.notes}`,
              type: 'NOTE'
            }] : [])
          ]
        }
      }
    })

    revalidatePath('/clientes/leads')
    return { success: true, lead }
  } catch (err: any) {
    console.error('Error in registerManualContact:', err)
    return { error: `Erro ao registrar contato manual: ${err.message || String(err)}` }
  }
}
