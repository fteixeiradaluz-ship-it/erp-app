const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      email: 'admin@erp.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  // Create some products
  await prisma.product.upsert({
    where: { id: 'p1' },
    update: {},
    create: {
      id: 'p1',
      name: 'Notebook Premium Delta',
      price: 4500.0,
      cost: 3200.0,
      stock: 10,
      type: 'PRODUCT'
    }
  })

  await prisma.product.upsert({
    where: { id: 'p2' },
    update: {},
    create: {
      id: 'p2',
      name: 'Mouse Gamer Titan',
      price: 250.0,
      cost: 120.0,
      stock: 25,
      type: 'PRODUCT'
    }
  })

  // Create some services
  await prisma.product.upsert({
    where: { id: 's1' },
    update: {},
    create: {
      id: 's1',
      name: 'Consulta Estética',
      price: 300.0,
      cost: 0.0,
      stock: 9999,
      type: 'SERVICE'
    }
  })

  await prisma.product.upsert({
    where: { id: 's2' },
    update: {},
    create: {
      id: 's2',
      name: 'Limpeza de Pele Premium',
      price: 200.0,
      cost: 50.0,
      stock: 9999,
      type: 'SERVICE'
    }
  })

  // Create a customer
  await prisma.customer.upsert({
    where: { id: 'c1' },
    update: {},
    create: {
      id: 'c1',
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999'
    }
  })

  console.log('Seed finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
