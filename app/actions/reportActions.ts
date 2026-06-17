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
        deletedAt: session.role === 'ADMIN' ? undefined : null,
        createdAt: {
          gte: startDate && startDate !== "" ? new Date(startDate) : undefined,
          lte: endDate && endDate !== "" ? new Date(endDate) : undefined,
        }
      },
      include: {
        user: { select: { name: true, commissionPercent: true } },
        items: { include: { product: true } },
        customer: { select: { name: true, phone: true } }
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
    const filterStartDate = startDate && startDate !== "" ? new Date(startDate) : undefined
    const filterEndDate = endDate && endDate !== "" ? new Date(endDate) : undefined

    const transactions = await prisma.transaction.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: filterStartDate,
          lte: filterEndDate,
        }
      },
      include: { 
        bank: { select: { name: true } } 
      },
      orderBy: { createdAt: 'desc' }
    })

    const settings = await prisma.settings.findFirst()
    const taxPercentage = settings?.taxPercentage || 0
    const fixedExpensesPercentage = settings?.fixedExpensesPercentage || 0

    // Fetch all sales within the period to calculate CMV
    const sales = await prisma.sale.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: filterStartDate,
          lte: filterEndDate,
        }
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    })

    // Calculate CMV from the items of the sales
    let cmv = 0
    sales.forEach(sale => {
      sale.items.forEach(item => {
        cmv += (item.product.cost || 0) * item.quantity
      })
    })

    // Group transactions
    // Gross Revenue (INCOME transactions)
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME')
    const grossRevenue = incomeTransactions.reduce((acc, t) => acc + t.amount, 0)

    // Margem Bruta = Receita Bruta - CMV
    const grossMargin = grossRevenue - cmv

    // Tax calculation
    const taxTransactions = transactions.filter(t => t.type === 'EXPENSE' && (t.description.toLowerCase().includes('imposto') || t.description.toLowerCase().includes('tax') || t.description.toLowerCase().includes('provisão de imposto')))
    const taxAmount = taxTransactions.length > 0
      ? taxTransactions.reduce((acc, t) => acc + t.amount, 0)
      : grossRevenue * (taxPercentage / 100)

    // Commissions calculation
    const commissionTransactions = transactions.filter(t => t.type === 'EXPENSE' && (t.description.toLowerCase().includes('comissão') || t.description.toLowerCase().includes('repasse')))
    const commissionsAmount = commissionTransactions.reduce((acc, t) => acc + t.amount, 0)

    // Other Expenses calculation
    const otherExpensesTransactions = transactions.filter(t => 
      t.type === 'EXPENSE' && 
      !t.description.toLowerCase().includes('imposto') && 
      !t.description.toLowerCase().includes('tax') && 
      !t.description.toLowerCase().includes('provisão de imposto') &&
      !t.description.toLowerCase().includes('comissão') && 
      !t.description.toLowerCase().includes('repasse')
    )
    const otherExpensesAmount = otherExpensesTransactions.reduce((acc, t) => acc + t.amount, 0)

    // Custo Fixo Operacional Estimado (with base on Settings.fixedExpensesPercentage)
    const estimatedFixedCost = grossRevenue * (fixedExpensesPercentage / 100)
    const operationalCost = Math.max(otherExpensesAmount, estimatedFixedCost)

    // Net Profit: Margem Bruta - Impostos - Comissões - Custos Operacionais
    const netProfit = grossMargin - taxAmount - commissionsAmount - operationalCost

    const dre = {
      grossRevenue,
      cmv,
      grossMargin,
      taxAmount,
      commissionsAmount,
      operationalCost,
      netProfit,
      taxPercentage,
      fixedExpensesPercentage
    }

    return { success: true, transactions, dre }
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
