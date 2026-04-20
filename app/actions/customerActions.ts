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
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } }
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
  email?: string
  phone?: string
}) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    let customer;
    if (data.id) {
      customer = await prisma.customer.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        }
      })
    } else {
      customer = await prisma.customer.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        }
      })
    }
    revalidatePath('/clientes')
    revalidatePath('/pos')
    return { success: true, customer }
  } catch (err: any) {
    return { error: 'Erro ao salvar cliente' }
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
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    // Clientes que não compram há mais de 3 meses
    // Estratégia: Buscar clientes onde a última venda foi antes de threeMonthsAgo
    // Ou clientes criados há mais de 3 meses que nunca compraram
    
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            sales: {
              none: {
                createdAt: { gte: threeMonthsAgo }
              }
            },
            createdAt: { lt: threeMonthsAgo }
          }
        ]
      },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    return { success: true, customers }
  } catch (err: any) {
    return { error: 'Erro ao buscar lista de retenção' }
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
