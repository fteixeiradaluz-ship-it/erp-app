'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function parseBankStatement(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  const file = formData.get('file') as File
  if (!file) return { error: 'Arquivo não encontrado' }

  const content = await file.text()
  const fileName = file.name.toLowerCase()

  try {
    let transactions: any[] = []

    if (fileName.endsWith('.ofx')) {
      transactions = parseOFX(content)
    } else if (fileName.endsWith('.csv')) {
      transactions = parseCSV(content)
    } else {
      return { error: 'Formato de arquivo não suportado. Use .ofx ou .csv' }
    }

    // Buscar lançamentos pendentes para conciliação automática
    const pending = await prisma.transaction.findMany({
      where: { status: 'PENDING', deletedAt: null },
      orderBy: { dueDate: 'asc' }
    })

    // Cruzar as transações do extrato com transações pendentes cadastradas
    const matchedTransactions = transactions.map(tx => {
      const type = tx.amount > 0 ? 'INCOME' : 'EXPENSE'
      const amount = Math.abs(tx.amount)

      // Regra de cruzamento: mesmo tipo, valor idêntico e vencimento próximo (margem de 10 dias)
      const match = pending.find(p => {
        if (p.type !== type) return false
        if (Math.abs(p.amount - amount) > 0.01) return false
        if (!p.dueDate) return false

        const diffTime = Math.abs(new Date(p.dueDate).getTime() - new Date(tx.date).getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays <= 10
      })

      return {
        ...tx,
        reconcileWithId: match ? match.id : null,
        reconcileWithDesc: match ? match.description : null
      }
    })

    return { success: true, transactions: matchedTransactions }
  } catch (err) {
    return { error: 'Erro ao processar arquivo: ' + (err as Error).message }
  }
}

function parseOFX(content: string) {
  const transactions: any[] = []
  
  // Extract STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
  let match
  
  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1]
    
    const type = block.match(/<TRNTYPE>(.*)/)?.[1]?.trim()
    const dateStr = block.match(/<DTPOSTED>(.*)/)?.[1]?.trim() // Format: YYYYMMDD...
    const amountStr = block.match(/<TRNAMT>(.*)/)?.[1]?.trim()
    const memo = block.match(/<MEMO>(.*)/)?.[1]?.trim()
    const name = block.match(/<NAME>(.*)/)?.[1]?.trim()

    if (dateStr && amountStr) {
        const year = parseInt(dateStr.substring(0, 4))
        const month = parseInt(dateStr.substring(4, 6)) - 1
        const day = parseInt(dateStr.substring(6, 8))
        
        transactions.push({
            date: new Date(year, month, day),
            description: name || memo || 'Transação OFX',
            amount: parseFloat(amountStr.replace(',', '.')),
            selected: true
        })
    }
  }
  
  return transactions
}

function parseCSV(content: string) {
  const lines = content.split('\n').filter(line => line.trim().length > 0)
  const transactions: any[] = []

  // Assuming format: Date, Description, Amount
  // Often with headers. Let's try to detect if first line is header
  const startIdx = isHeader(lines[0]) ? 1 : 0

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(/[;,]/) // Support comma or semicolon
    if (parts.length >= 3) {
      const dateStr = parts[0].trim()
      const desc = parts[1].trim()
      const amountStr = parts[2].trim()

      const date = parseDate(dateStr)
      const amount = parseFloat(amountStr.replace('R$', '').replace(/\./g, '').replace(',', '.'))

      if (date && !isNaN(amount)) {
        transactions.push({
          date,
          description: desc,
          amount,
          selected: true
        })
      }
    }
  }
  return transactions
}

function isHeader(line: string) {
    return line.toLowerCase().includes('data') || line.toLowerCase().includes('desc') || line.toLowerCase().includes('valor')
}

function parseDate(str: string) {
    // Try common formats: DD/MM/YYYY, YYYY-MM-DD
    if (str.includes('/')) {
        const [d, m, y] = str.split('/')
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    }
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
}

export async function bulkImportTransactions(data: { bankId: string, transactions: any[] }) {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

    try {
        let totalModifier = 0;
        
        await prisma.$transaction(async (tx) => {
            for (const item of data.transactions) {
                const type = item.amount > 0 ? 'INCOME' : 'EXPENSE'
                const amount = Math.abs(item.amount)
                totalModifier += item.amount // Sum original values (income is +, expense is -)

                if (item.reconcileWithId) {
                    // Dar baixa (Pagar/Receber) na transação pendente existente em vez de duplicar
                    await tx.transaction.update({
                        where: { id: item.reconcileWithId },
                        data: {
                            status: 'PAID',
                            payDate: new Date(item.date)
                        }
                    })
                } else {
                    // Criar novo lançamento direto
                    await tx.transaction.create({
                        data: {
                            bankId: data.bankId,
                            type,
                            amount,
                            description: item.description,
                            status: 'PAID',
                            payDate: new Date(item.date),
                            createdAt: new Date(item.date)
                        }
                    })
                }
            }

            // Atualiza saldo final do banco com a movimentação líquida do extrato
            await tx.bank.update({
                where: { id: data.bankId },
                data: { balance: { increment: totalModifier } }
            })
        }, {
            timeout: 25000 // 25 seconds timeout for bulk operations
        })

        revalidatePath('/financeiro')
        revalidatePath('/contas-pagar')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        console.error('Import Error:', err)
        return { error: 'Erro ao importar/conciliar transações: ' + err.message }
    }
}
