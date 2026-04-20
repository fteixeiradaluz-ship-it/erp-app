import { prisma } from './prisma'

export async function createAuditLog(userId: string, action: string, entity: string, details?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        details: details ? JSON.stringify(details) : null
      }
    })
  } catch (err) {
    console.error('Audit Log Error:', err)
  }
}
