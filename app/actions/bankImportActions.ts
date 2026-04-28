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

    return { success: true, transactions }
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
        await prisma.$transaction(async (tx) => {
            for (const item of data.transactions) {
                const type = item.amount > 0 ? 'INCOME' : 'EXPENSE'
                const amount = Math.abs(item.amount)

                await tx.transaction.create({
                    data: {
                        bankId: data.bankId,
                        type,
                        amount,
                        description: item.description,
                        status: 'PAID',
                        payDate: new Date(item.date),
                        createdAt: new Date(item.date) // Set createdAt to match transaction date
                    }
                })

                const modifier = type === 'INCOME' ? 1 : -1
                await tx.bank.update({
                    where: { id: data.bankId },
                    data: { balance: { increment: amount * modifier } }
                })
            }
        })

        revalidatePath('/financeiro')
        return { success: true }
    } catch (err: any) {
        return { error: 'Erro ao importar transações: ' + err.message }
    }
}
