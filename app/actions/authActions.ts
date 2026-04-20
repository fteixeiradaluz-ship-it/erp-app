'use server'

import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/auth'
import { getSession } from '@/lib/session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function loginAction(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) return { error: 'Usuário não encontrado' }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return { error: 'Senha incorreta' }

    // Create session
    const session = await encrypt({ userId: user.id, role: user.role })
    
    // Save cookie
    const cookieStore = await cookies()
    cookieStore.set('user_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    })

    return { success: true, role: user.role }
  } catch (err: any) {
    return { error: 'Erro ao fazer login' }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('user_session')
}

export async function getSessionAction() {
  return await getSession()
}
