'use server'

import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function loginAction(email: string, password: string) {
  const user = await prisma.user.findUnique({
     where: { email }
  })
  
  if (!user) {
     return { error: 'Usuário não encontrado.' }
  }

  const isValidPassword = await bcrypt.compare(password, user.password)
  if (!isValidPassword) {
     return { error: 'Senha incorreta.' }
  }

  const sessionToken = await encrypt({ userId: user.id, role: user.role })
  const cookieStore = await cookies()
  cookieStore.set('user_session', sessionToken, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     path: '/',
     maxAge: 60 * 60 * 24 // 1 day
  })

  return { success: true, role: user.role }
}

export async function logoutAction() {
   const cookieStore = await cookies()
   cookieStore.delete('user_session')
}
