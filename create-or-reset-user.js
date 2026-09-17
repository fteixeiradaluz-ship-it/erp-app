const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'adrichavessouza0@gmail.com';
  const password = process.argv[3] || '123456';
  const role = process.argv[4] || 'ADMIN';
  const name = process.argv[5] || 'Adriana Chaves';

  console.log(`Configurando usuário: ${email}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: role,
        requirePasswordChange: false
      },
      create: {
        email,
        name,
        password: hashedPassword,
        role: role,
        permissions: 'dashboard,pos,agenda,envios,relatorios,comissoes,clientes,fornecedores,estoque,precificacao,financeiro,contas-pagar,logs,usuarios,configuracoes',
        requirePasswordChange: false
      }
    });

    console.log('✅ USUÁRIO CRIADO/ATUALIZADO COM SUCESSO!');
    console.log('-------------------------------------------');
    console.log('E-mail:', user.email);
    console.log('Senha definida:', password);
    console.log('Perfil (Role):', user.role);
    console.log('-------------------------------------------');
  } catch (err) {
    console.error('❌ ERRO:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
