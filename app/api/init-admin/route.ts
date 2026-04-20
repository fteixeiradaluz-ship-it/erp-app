import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const email = 'admin@erp.com'
  const password = 'admin123'
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'ADMIN'
      },
      create: {
        email,
        name: 'Administrador Principal',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    return NextResponse.json({ 
      message: 'Admin configurado com sucesso!', 
      email: user.email,
      password: 'admin123' 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
