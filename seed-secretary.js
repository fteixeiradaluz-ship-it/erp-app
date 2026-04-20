const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'secretaria@erp.com' },
    update: { role: 'SECRETARY' },
    create: {
      name: 'Secretaria',
      email: 'secretaria@erp.com',
      password: hash,
      role: 'SECRETARY'
    }
  });
  console.log('User created:', user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
