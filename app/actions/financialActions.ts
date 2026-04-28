'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit'

export async function getDashboardStats() {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)

    // 1. Total Sales and Revenue (Last 30 Days)
    const sales = await prisma.sale.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo }
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    })

    const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0)
    
    // Calculate Profit (Revenue - Cost of goods sold)
    let totalCost = 0
    sales.forEach(sale => {
      sale.items.forEach(item => {
        totalCost += (item.product.cost * item.quantity)
      })
    })
    const estProfit = totalRevenue - totalCost

    // 2. Pending Financial (CARTAO sales not yet paid)
    const pendingTransactions = await prisma.transaction.aggregate({
      where: { status: 'PENDING', type: 'INCOME', deletedAt: null },
      _sum: { amount: true }
    })

    // 2.1 Payables within next 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    const payableTransactions = await prisma.transaction.aggregate({
      where: { 
         status: 'PENDING', 
         type: 'EXPENSE',
         deletedAt: null,
         dueDate: { lte: thirtyDaysFromNow } 
      },
      _sum: { amount: true }
    })

    // 3. Sales by Day (for Chart)
    const salesByDay: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        salesByDay[d.toISOString().split('T')[0]] = 0
    }

    sales.forEach(sale => {
        const dateKey = sale.createdAt.toISOString().split('T')[0]
        if (salesByDay[dateKey] !== undefined) {
            salesByDay[dateKey] += sale.totalAmount
        }
    })

    const chartData = Object.entries(salesByDay)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))

    // 4. Sales by Payment Method
    const paymentMethodStats: Record<string, number> = { 'PIX': 0, 'A_VISTA': 0, 'CARTAO': 0 }
    sales.forEach(sale => {
        paymentMethodStats[sale.paymentMethod] = (paymentMethodStats[sale.paymentMethod] || 0) + sale.totalAmount
    })

    // 5. Low Stock Alerts
    const lowStockCount = await prisma.product.count({
        where: { deletedAt: null, stock: { lte: 5 } }
    })

    return {
      success: true,
      stats: {
        totalRevenue,
        estProfit,
        saleCount: sales.length,
        pendingAmount: pendingTransactions._sum.amount || 0,
        payableAmount: payableTransactions._sum.amount || 0,
        lowStockCount
      },
      chartData,
      paymentMethodStats
    }
  } catch (err: any) {
    return { error: 'Erro ao carregar estatísticas' }
  }
}

export async function getFinancialFlow() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    const transactions = await prisma.transaction.findMany({
      where: { deletedAt: null },
      include: { bank: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    const banks = await prisma.bank.findMany({
        include: { _count: { select: { transactions: true } } }
    })

    return { success: true, transactions, banks }
  } catch (err: any) {
    return { error: 'Erro ao carregar fluxo financeiro' }
  }
}

export async function upsertBank(data: { id?: string, name: string, balance?: number }) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

    try {
        if (data.id) {
            await prisma.bank.update({
                where: { id: data.id },
                data: { name: data.name, balance: data.balance }
            })
        } else {
            await prisma.bank.create({
                data: { name: data.name, balance: data.balance || 0 }
            })
        }
        await createAuditLog(
            session.userId, 
            data.id ? 'UPDATE_BANK' : 'CREATE_BANK', 
            'Bank', 
            { name: data.name }
        )

        revalidatePath('/financeiro')
        return { success: true }
    } catch (err) {
        return { error: 'Erro ao salvar banco' }
    }
}

export async function createManualTransaction(data: {
    bankId: string,
    type: 'INCOME' | 'EXPENSE',
    amount: number,
    description: string,
    status: 'PAID' | 'PENDING'
}) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

    try {
        await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    bankId: data.bankId,
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    status: data.status,
                    payDate: data.status === 'PAID' ? new Date() : null
                }
            })

            if (data.status === 'PAID') {
                const modifier = data.type === 'INCOME' ? 1 : -1
                await tx.bank.update({
                    where: { id: data.bankId },
                    data: { balance: { increment: data.amount * modifier } }
                })
            }
            return transaction
        })
        await createAuditLog(
            session.userId, 
            'CREATE_TRANSACTION', 
            'Transaction', 
            { type: data.type, amount: data.amount, description: data.description }
        )

        revalidatePath('/financeiro')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (err) {
        return { error: 'Erro ao criar transação manual' }
    }
}

export async function createPayableInstallments(data: {
    id?: string,
    bankId: string,
    amount: number,
    description: string,
    installments: number,
    firstDueDate: Date
}) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

    if (data.id) {
        try {
            await prisma.transaction.update({
                where: { id: data.id },
                data: {
                    bankId: data.bankId,
                    amount: data.amount,
                    description: data.description,
                    dueDate: data.firstDueDate
                }
            })
            revalidatePath('/contas-pagar')
            return { success: true }
        } catch (e) {
            return { error: 'Erro ao editar conta' }
        }
    }

    if (data.installments < 1) return { error: 'Número de parcelas inválido' }

    try {
        const baseAmount = Math.floor((data.amount / data.installments) * 100) / 100
        let remaining = data.amount - (baseAmount * data.installments)

        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < data.installments; i++) {
                const dueDate = new Date(data.firstDueDate)
                dueDate.setMonth(dueDate.getMonth() + i)
                
                // Add remaining cents to the last installment
                const installmentAmount = (i === data.installments - 1) ? baseAmount + remaining : baseAmount

                const desc = data.installments > 1 ? `${data.description} (Parcela ${i + 1}/${data.installments})` : data.description

                await tx.transaction.create({
                    data: {
                        bankId: data.bankId,
                        type: 'EXPENSE',
                        amount: installmentAmount,
                        description: desc,
                        status: 'PENDING',
                        dueDate: dueDate,
                        payDate: null
                    }
                })
            }
        })
        
        await createAuditLog(
            session.userId, 
            'CREATE_PAYABLE', 
            'Transaction', 
            { amount: data.amount, description: data.description, installments: data.installments }
        )

        revalidatePath('/contas-pagar')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (err) {
        return { error: 'Erro ao criar contas a pagar' }
    }
}

export async function payTransaction(id: string) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

    try {
        await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({ where: { id } })
            if (!transaction) throw new Error('Transação não encontrada')
            if (transaction.status === 'PAID') throw new Error('Transação já está paga')

            await tx.transaction.update({
                where: { id },
                data: {
                    status: 'PAID',
                    payDate: new Date()
                }
            })

            const modifier = transaction.type === 'INCOME' ? 1 : -1
            await tx.bank.update({
                where: { id: transaction.bankId },
                data: { balance: { increment: transaction.amount * modifier } }
            })
        })

        await createAuditLog(session.userId, 'PAY_TRANSACTION', 'Transaction', { id })

        revalidatePath('/contas-pagar')
        revalidatePath('/financeiro')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        return { error: err.message || 'Erro ao efetuar pagamento' }
    }
}

export async function getPendingPayables() {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                type: 'EXPENSE',
                status: 'PENDING',
                deletedAt: null,
                dueDate: { not: null }
            },
            include: { bank: true },
            orderBy: { dueDate: 'asc' }
        })

        const banks = await prisma.bank.findMany()

        return { success: true, transactions, banks }
    } catch (err) {
        return { error: 'Erro ao carregar contas a pagar' }
    }
}

export async function getPendingReceivables() {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                type: 'INCOME',
                status: 'PENDING',
                deletedAt: null,
                dueDate: { not: null }
            },
            include: { bank: true },
            orderBy: { dueDate: 'asc' }
        })

        const banks = await prisma.bank.findMany()

        return { success: true, transactions, banks }
    } catch (err) {
        return { error: 'Erro ao carregar contas a receber' }
    }
}


export async function deleteTransaction(id: string, reason: string) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }
    if (!reason) return { error: 'A justificativa é obrigatória' }

    try {
        await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({ where: { id } })
            if (!transaction) throw new Error('Transação não encontrada')

            // If it was PAID, we need to revert the bank balance
            if (transaction.status === 'PAID') {
                const modifier = transaction.type === 'INCOME' ? -1 : 1 // Reverse modifier
                await tx.bank.update({
                    where: { id: transaction.bankId },
                    data: { balance: { increment: transaction.amount * modifier } }
                })
            }

            await tx.transaction.update({
                where: { id },
                data: { 
                    deletedAt: new Date(),
                    deletionJustification: reason
                }
            })

            // If there's an associated Sale, soft-delete it too
            // We search by description since we don't have a direct relation in schema
            // Usually descriptions are like "Venda #xxxxxx"
            if (transaction.description.startsWith('Venda #')) {
                const saleIdPart = transaction.description.split('#')[1].split(' ')[0]
                const sale = await tx.sale.findFirst({
                    where: { id: { startsWith: saleIdPart } }
                })
                if (sale) {
                    await tx.sale.update({
                        where: { id: sale.id },
                        data: { deletedAt: new Date() }
                    })
                }
            }
        })

        await createAuditLog(session.userId, 'DELETE_TRANSACTION', 'Transaction', { id, reason })

        revalidatePath('/financeiro')
        revalidatePath('/contas-pagar')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        return { error: err.message || 'Erro ao excluir transação' }
    }
}

export async function updateTransaction(id: string, data: any, reason: string) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }
    if (!reason) return { error: 'A justificativa é obrigatória' }

    try {
        await prisma.$transaction(async (tx) => {
            const oldTx = await tx.transaction.findUnique({ where: { id } })
            if (!oldTx) throw new Error('Transação não encontrada')

            // Revert old balance if it was PAID
            if (oldTx.status === 'PAID') {
                const oldModifier = oldTx.type === 'INCOME' ? -1 : 1
                await tx.bank.update({
                    where: { id: oldTx.bankId },
                    data: { balance: { increment: oldTx.amount * oldModifier } }
                })
            }

            const updatedTx = await tx.transaction.update({
                where: { id },
                data: {
                    bankId: data.bankId,
                    type: data.type,
                    amount: data.amount,
                    description: data.description,
                    status: data.status,
                    payDate: data.status === 'PAID' ? (oldTx.payDate || new Date()) : null
                }
            })

            // Apply new balance if it is PAID
            if (updatedTx.status === 'PAID') {
                const newModifier = updatedTx.type === 'INCOME' ? 1 : -1
                await tx.bank.update({
                    where: { id: updatedTx.bankId },
                    data: { balance: { increment: updatedTx.amount * newModifier } }
                })
            }
        })

        await createAuditLog(session.userId, 'UPDATE_TRANSACTION', 'Transaction', { id, reason, data })

        revalidatePath('/financeiro')
        revalidatePath('/contas-pagar')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        return { error: err.message || 'Erro ao atualizar transação' }
    }
}
