const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.update({
    where: { email: 'admin@erp.com' },
    data: {
      password: hashedPassword
    }
  });
  
  console.log('Senha do admin@erp.com atualizada com sucesso para admin123!');
  console.log('Dados do usuário:', { email: user.email, role: user.role });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
