'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function getCustomers(search?: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: search ? [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search, mode: 'insensitive' } }
        ] : undefined
      },
      include: {
        _count: { select: { sales: true } },
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    })
    return { success: true, customers }
  } catch (err: any) {
    return { error: 'Erro ao buscar clientes' }
  }
}

export async function upsertCustomer(data: {
  id?: string
  name: string
  cpf?: string
  email?: string
  phone?: string
  address?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  shippingNotes?: string
  generalNotes?: string
}) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    let customer;
    const customerData = {
      name: data.name,
      cpf: data.cpf,
      email: data.email,
      phone: data.phone,
      address: data.address,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      shippingNotes: data.shippingNotes,
      generalNotes: data.generalNotes,
    }

    if (data.id) {
      customer = await prisma.customer.update({
        where: { id: data.id },
        data: customerData
      })
    } else {
      customer = await prisma.customer.create({
        data: customerData
      })
    }
    revalidatePath('/clientes')
    revalidatePath('/pos')
    return { success: true, customer }
  } catch (err: any) {
    if (err.code === 'P2002') return { error: 'CPF já cadastrado' }
    return { error: 'Erro ao salvar cliente' }
  }
}

export async function updateCustomerGeneralNotes(id: string, generalNotes: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { generalNotes }
    })
    revalidatePath(`/clientes/${id}`)
    revalidatePath(`/clientes/${id}/prontuario`)
    return { success: true, customer }
  } catch (err: any) {
    console.error(err)
    return { error: 'Erro ao salvar as anotações gerais' }
  }
}

export async function deleteCustomer(id: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    revalidatePath('/clientes')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao deletar cliente' }
  }
}

export async function getRetentionList() {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    // Buscar configurações de retenção e WhatsApp
    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({
        data: { 
          commissionPercentage: 0,
          taxPercentage: 0,
          fixedExpensesPercentage: 0,
          retentionDays: 90,
          whatsappTemplateRetention: "Olá {nome}! Notamos que já se passaram {dias} dias desde a sua última compra de {produto} na DERMAE. Gostaria de solicitar uma reposição?",
          whatsappTemplateLead: "Olá {nome}! Passando para saber se ficou com alguma dúvida sobre o orçamento de R$ {valor} que geramos para você. Podemos agendar?"
        }
      })
    }

    const retentionDays = settings.retentionDays || 90
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - retentionDays)
    
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            sales: {
              none: {
                createdAt: { gte: retentionDate }
              }
            },
            createdAt: { lt: retentionDate }
          }
        ]
      },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { product: true }
            }
          },
          take: 1
        }
      }
    })

    return { 
      success: true, 
      customers, 
      template: settings.whatsappTemplateRetention, 
      retentionDays 
    }
  } catch (err: any) {
    return { error: 'Erro ao buscar lista de retenção: ' + err.message }
  }
}

export async function getCustomerDetail(id: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' }
        },
        appointments: {
          orderBy: { date: 'desc' }
        },
        medicalRecords: {
          orderBy: { createdAt: 'desc' },
          include: { appointment: true }
        },
        quotations: {
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!customer) return { error: 'Cliente não encontrado' }
    
    return { success: true, customer }
  } catch (err: any) {
    return { error: 'Erro ao buscar detalhes do cliente' }
  }
}
