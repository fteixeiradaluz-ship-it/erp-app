'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

/**
 * Relatório de Vendas.
 * - ADMIN: todas as vendas com filtro de vendedor disponível.
 * - SECRETARY / SELLER: apenas as próprias vendas (comissão pessoal).
 */
export async function getSalesReport(startDate?: string, endDate?: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  const userFilter = session.role === 'ADMIN' ? undefined : { userId: session.userId }

  try {
    const sales = await prisma.sale.findMany({
      where: {
        ...userFilter,
        deletedAt: null,
        createdAt: {
          gte: startDate && startDate !== "" ? new Date(startDate) : undefined,
          lte: endDate && endDate !== "" ? new Date(endDate) : undefined,
        }
      },
      include: {
        user: { select: { name: true, commissionPercent: true } },
        customer: { select: { name: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, sales, role: session.role }
  } catch (err: any) {
    return { error: 'Erro ao gerar relatório de vendas' }
  }
}

/**
 * Relatório de Estoque — apenas ADMIN.
 */
export async function getInventoryReport() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: { supplier: { select: { name: true } } },
      orderBy: { stock: 'asc' }
    })
    return { success: true, products }
  } catch (err: any) {
    return { error: 'Erro ao gerar relatório de estoque' }
  }
}

/**
 * Relatório Financeiro — apenas ADMIN.
 */
export async function getFinancialReport(startDate?: string, endDate?: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: startDate && startDate !== "" ? new Date(startDate) : undefined,
          lte: endDate && endDate !== "" ? new Date(endDate) : undefined,
        }
      },
      include: { bank: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, transactions }
  } catch (err: any) {
    console.error('Financial Report Error:', err)
    return { error: 'Erro ao gerar relatório financeiro' }
  }
}

/**
 * Relatório de Envios Finalizados — ADMIN e SELLER.
 */
export async function getShippingReport(startDate?: string, endDate?: string) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SELLER')) {
    return { error: 'Não autorizado' }
  }

  try {
    const shipments = await prisma.sale.findMany({
      where: {
        deletedAt: null,
        isSent: true,
        createdAt: {
          gte: startDate && startDate !== "" ? new Date(startDate) : undefined,
          lte: endDate && endDate !== "" ? new Date(endDate) : undefined,
        }
      },
      include: {
        customer: { select: { name: true, phone: true } },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, shipments }
  } catch (err: any) {
    return { error: 'Erro ao gerar relatório de envios' }
  }
}

/**
 * Relatório de Consultas — ADMIN e SECRETARY.
 */
export async function getAppointmentsReport(startDate?: string, endDate?: string) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SECRETARY')) {
    return { error: 'Não autorizado' }
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate && startDate !== "" ? new Date(startDate) : undefined,
          lte: endDate && endDate !== "" ? new Date(endDate) : undefined,
        }
      },
      include: {
        customer: { select: { name: true, phone: true } }
      },
      orderBy: { date: 'desc' }
    })
    return { success: true, appointments }
  } catch (err: any) {
    return { error: 'Erro ao gerar relatório de consultas' }
  }
}
