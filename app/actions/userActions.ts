'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { createAuditLog } from '@/lib/audit'

export async function getUsers() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        cpf: true,
        phone: true,
        salary: true,
        admissionDate: true,
        position: true,
        commissionPercent: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, users }
  } catch (err: any) {
    return { error: 'Erro ao buscar usuários' }
  }
}

export async function upsertUser(data: { 
  id?: string, 
  name: string, 
  email: string, 
  password?: string, 
  role: string, 
  commissionPercent?: number | null,
  cpf?: string | null,
  phone?: string | null,
  salary?: number | null,
  admissionDate?: string | Date | null,
  position?: string | null
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    if (data.id) {
      const updateData: any = { 
        name: data.name, 
        email: data.email, 
        role: data.role,
        commissionPercent: data.commissionPercent,
        cpf: data.cpf,
        phone: data.phone,
        salary: data.salary,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
        position: data.position
      }
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10)
      }
      await prisma.user.update({
        where: { id: data.id },
        data: updateData
      })
    } else {
      if (!data.password) return { error: 'Senha obrigatória para novos usuários' }
      const passwordHash = await bcrypt.hash(data.password, 10)
      await prisma.user.create({
        data: { 
          name: data.name, 
          email: data.email, 
          password: passwordHash, 
          role: data.role,
          commissionPercent: data.commissionPercent,
          cpf: data.cpf,
          phone: data.phone,
          salary: data.salary,
          admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
          position: data.position
        }
      })
    }

    await createAuditLog(
      session.userId, 
      data.id ? 'UPDATE_USER' : 'CREATE_USER', 
      'User', 
      { email: data.email, role: data.role }
    )

    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao salvar usuário' }
  }
}

export async function deleteUser(id: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' }

  try {
    // Prevent self-deletion
    if (session.userId === id) return { error: 'Você não pode excluir seu próprio usuário' }
    
    await prisma.user.delete({ where: { id } })

    await createAuditLog(session.userId, 'DELETE_USER', 'User', { id })

    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao excluir usuário' }
  }
}
