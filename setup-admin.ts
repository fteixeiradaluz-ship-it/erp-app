import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const email = 'admin@erp.com'
  const password = 'admin123'
  const hashedPassword = await bcrypt.hash(password, 10)

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

  console.log('ADMIN SETUP COMPLETO:', user.email)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
