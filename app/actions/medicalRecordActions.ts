'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getMedicalRecords(customerId: string) {
  const session = await getSession()
  if (!session) return { error: 'Não autorizado' }

  try {
    const records = await prisma.medicalRecord.findMany({
      where: { customerId },
      include: {
        appointment: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, records }
  } catch (err: any) {
    return { error: 'Erro ao buscar prontuário' }
  }
}

export async function upsertMedicalRecord(data: {
  id?: string
  customerId: string
  appointmentId?: string
  content: string
}) {
  const session = await getSession()
  // Role check: Only ADMIN can create/edit
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Apenas nível gerencial pode alterar prontuários' }
  }

  try {
    let medicalRecord;
    if (data.id) {
      medicalRecord = await prisma.medicalRecord.update({
        where: { id: data.id },
        data: {
          content: data.content,
          appointmentId: data.appointmentId,
        }
      })
    } else {
      medicalRecord = await prisma.medicalRecord.create({
        data: {
          customerId: data.customerId,
          appointmentId: data.appointmentId,
          content: data.content,
          authorId: session.userId,
        }
      })
    }
    revalidatePath(`/clientes/${data.customerId}`)
    return { success: true, medicalRecord }
  } catch (err: any) {
    console.error(err)
    return { error: 'Erro ao salvar prontuário' }
  }
}

export async function deleteMedicalRecord(id: string, customerId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Apenas nível gerencial pode excluir prontuários' }
  }

  try {
    await prisma.medicalRecord.delete({
      where: { id }
    })
    revalidatePath(`/clientes/${customerId}`)
    return { success: true }
  } catch (err: any) {
    return { error: 'Erro ao deletar prontuário' }
  }
}
