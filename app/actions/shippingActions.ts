'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function getShippingSales(startDate?: Date, endDate?: Date) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const where: any = {}
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, sales }
  } catch (err: any) {
    return { error: 'Erro ao buscar vendas para envio' }
  }
}

export async function updateShippingStatus(saleId: string, data: {
  nfGenerated?: boolean,
  labelGenerated?: boolean,
  isSent?: boolean
}) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const sale = await prisma.sale.update({
      where: { id: saleId },
      data
    })
    revalidatePath('/envios')
    return { success: true, sale }
  } catch (err: any) {
    return { error: 'Erro ao atualizar status de envio' }
  }
}
