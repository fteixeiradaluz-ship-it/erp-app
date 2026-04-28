'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function getAuditLogs() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Não autorizado' }
  }

  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    return { success: true, logs }
  } catch (err: any) {
    return { error: 'Erro ao buscar logs' }
  }
}
