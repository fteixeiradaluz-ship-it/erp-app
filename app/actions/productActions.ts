'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit'

export async function getProducts(search?: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: search ? [
          { name: { contains: search } }
        ] : undefined
      },
      orderBy: { updatedAt: 'desc' }
    })
    return { success: true, products }
  } catch (err: any) {
    return { error: 'Erro ao buscar produtos' }
  }
}

export async function upsertProduct(data: {
  id?: string
  name: string
  price: number
  cost: number
  stock: number
  supplierId?: string
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    if (data.id) {
      await prisma.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          price: data.price,
          cost: data.cost,
          stock: data.stock,
          supplierId: data.supplierId || null,
        }
      })
    } else {
      await prisma.product.create({
        data: {
          name: data.name,
          price: data.price,
          cost: data.cost,
          stock: data.stock,
          supplierId: data.supplierId || null,
        }
      })
    }
    
    await createAuditLog(
      session.userId, 
      data.id ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT', 
      'Product', 
      { name: data.name, id: data.id }
    )

    revalidatePath('/estoque')
    revalidatePath('/pos')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao salvar produto' }
  }
}

export async function deleteProduct(id: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    await createAuditLog(session.userId, 'DELETE_PRODUCT', 'Product', { id })

    revalidatePath('/estoque')
    revalidatePath('/pos')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro ao deletar produto' }
  }
}

export async function getLowStockProducts(threshold = 5) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        stock: { lte: threshold }
      },
      include: { supplier: { select: { name: true } } },
      orderBy: { stock: 'asc' }
    })
    return { success: true, products }
  } catch (err: any) {
    return { error: 'Erro ao buscar produtos com estoque baixo' }
  }
}
