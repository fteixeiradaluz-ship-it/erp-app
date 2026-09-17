const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('--- CONEXAO OK! USUARIOS ENCONTRADOS ---');
    console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
    
    const target = await prisma.user.findUnique({
      where: { email: 'adrichavessouza0@gmail.com' }
    });
    console.log('Usuario adrichavessouza0@gmail.com:', target ? 'ENCONTRADO' : 'NAO ENCONTRADO');
  } catch (err) {
    console.error('ERRO AO CONECTAR NO BANCO:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
