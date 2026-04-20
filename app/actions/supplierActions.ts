'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getSuppliers(search?: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        deletedAt: null,
        OR: search ? [
          { name: { contains: search } },
          { cnpj: { contains: search } }
        ] : undefined
      },
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    })
    return { success: true, suppliers }
  } catch (err: any) {
    return { error: 'Erro ao buscar fornecedores' }
  }
}

export async function upsertSupplier(data: { id?: string, name: string, cnpj?: string, email?: string, phone?: string }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    if (data.id) {
      await prisma.supplier.update({
        where: { id: data.id },
        data: { name: data.name, cnpj: data.cnpj, email: data.email, phone: data.phone }
      })
    } else {
      await prisma.supplier.create({
        data: { name: data.name, cnpj: data.cnpj, email: data.email, phone: data.phone }
      })
    }
    revalidatePath('/fornecedores')
    revalidatePath('/estoque')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao salvar fornecedor' }
  }
}

export async function deleteSupplier(id: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    revalidatePath('/fornecedores')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao excluir fornecedor' }
  }
}

export async function getSupplierStockReport(supplierId: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const products = await prisma.product.findMany({
      where: {
        supplierId,
        deletedAt: null,
        stock: { lte: 10 } // Threshold for reordering
      },
      orderBy: { stock: 'asc' }
    })
    return { success: true, products }
  } catch (err: any) {
    return { error: 'Erro ao gerar relatório de estoque' }
  }
}
