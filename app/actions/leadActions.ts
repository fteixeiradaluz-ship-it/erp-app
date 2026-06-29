'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

// Cadastra um novo Lead
export async function registerLead(data: { name: string; phone: string; notes?: string }) {
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
        status: 'NEW',
        userId: session.userId
      }
    })
    revalidatePath('/clientes/leads')
    return { success: true, lead }
  } catch (err: any) {
    return { error: 'Erro ao cadastrar lead' }
  }
}

// Busca todos os leads filtrados por intervalo de dias decorridos ou status
export async function getLeadsCRM(filterDays?: string, status?: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let whereCondition: any = {}

    // Filtro por usuário (não-administradores veem apenas seus próprios leads)
    if (session.role !== 'ADMIN') {
      whereCondition.userId = session.userId
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
    return { error: 'Erro ao buscar leads do CRM' }
  }
}

// Atualiza o status de um lead
export async function updateLeadStatus(leadId: string, status: string, notes?: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    let nextContactDate: Date | null = null

    if (status === 'RETORNAR_MES_SEGUINTE') {
      const now = new Date()
      nextContactDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    }

    const updatedData: any = { status }
    if (nextContactDate) updatedData.nextContactDate = nextContactDate
    if (notes !== undefined) updatedData.notes = notes

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updatedData
    })

    revalidatePath('/clientes/leads')
    return { success: true, lead }
  } catch (err: any) {
    return { error: 'Erro ao atualizar status do lead' }
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
        customerId: customer.id
      }
    })

    revalidatePath('/clientes')
    revalidatePath('/clientes/leads')
    revalidatePath('/pos')

    return { success: true, customer }
  } catch (err: any) {
    return { error: 'Erro ao converter lead para cliente' }
  }
}
