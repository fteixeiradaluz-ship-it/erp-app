'use server'

import { getSession } from '@/lib/session'

export async function getSessionAction() {
  return await getSession()
}
