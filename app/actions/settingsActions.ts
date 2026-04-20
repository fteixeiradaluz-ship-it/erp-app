'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getSettings() {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({
        data: { 
          commissionPercentage: 0,
          taxPercentage: 0,
          fixedExpensesPercentage: 0
        }
      })
    }
    return { success: true, settings }
  } catch (err: any) {
    return { error: 'Erro ao buscar configurações' }
  }
}

export async function getPublicSettings() {
  try {
    const settings = await prisma.settings.findFirst({
      select: { 
        companyName: true,
        companyLogo: true
      }
    })
    return { success: true, settings }
  } catch (err: any) {
    return { error: 'Erro ao buscar configurações públicas' }
  }
}

export async function updateSettings(data: {
  commission: number,
  tax?: number,
  fixedExpenses?: number,
  companyName?: string,
  companyCnpj?: string,
  companyAddress?: string,
  companyPhone?: string,
  companyLogo?: string
}) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const settings = await prisma.settings.findFirst()
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: { 
          commissionPercentage: data.commission,
          taxPercentage: data.tax ?? settings.taxPercentage,
          fixedExpensesPercentage: data.fixedExpenses ?? settings.fixedExpensesPercentage,
          companyName: data.companyName ?? settings.companyName,
          companyCnpj: data.companyCnpj ?? settings.companyCnpj,
          companyAddress: data.companyAddress ?? settings.companyAddress,
          companyPhone: data.companyPhone ?? settings.companyPhone,
          companyLogo: data.companyLogo ?? settings.companyLogo
        }
      })
    } else {
      await prisma.settings.create({
        data: { 
          commissionPercentage: data.commission,
          taxPercentage: data.tax || 0,
          fixedExpensesPercentage: data.fixedExpenses || 0,
          companyName: data.companyName || 'Minha Empresa',
          companyCnpj: data.companyCnpj,
          companyAddress: data.companyAddress,
          companyPhone: data.companyPhone,
          companyLogo: data.companyLogo
        }
      })
    }
    revalidatePath('/configuracoes')
    revalidatePath('/precificacao')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao atualizar configurações' }
  }
}
