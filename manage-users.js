const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const deleteEmail = 'adrichavessouza0@gmail.com';
  const newEmail = 'fteixeiradaluz@gmail.com';
  const newPassword = 'admin123';
  const newName = 'Fabricio Teixeira da Luz';

  console.log('Iniciando gerenciamento de usuários...');

  try {
    // 1. Deletar o usuário antigo se existir
    const existingOldUser = await prisma.user.findUnique({ where: { email: deleteEmail } });
    if (existingOldUser) {
      // Remover referências se houver ou deletar
      await prisma.user.delete({ where: { email: deleteEmail } });
      console.log(`✅ Usuário ${deleteEmail} removido com sucesso.`);
    } else {
      console.log(`ℹ️ Usuário ${deleteEmail} não existia no banco.`);
    }

    // 2. Criar / Atualizar o novo usuário como ADMIN
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.upsert({
      where: { email: newEmail },
      update: {
        name: newName,
        password: hashedPassword,
        role: 'ADMIN',
        permissions: 'dashboard,pos,agenda,envios,relatorios,comissoes,clientes,fornecedores,estoque,precificacao,financeiro,contas-pagar,logs,usuarios,configuracoes',
        requirePasswordChange: false
      },
      create: {
        email: newEmail,
        name: newName,
        password: hashedPassword,
        role: 'ADMIN',
        permissions: 'dashboard,pos,agenda,envios,relatorios,comissoes,clientes,fornecedores,estoque,precificacao,financeiro,contas-pagar,logs,usuarios,configuracoes',
        requirePasswordChange: false
      }
    });

    console.log('----------------------------------------------------');
    console.log('✅ NOVO USUÁRIO ADMINISTRADOR CONFIGURADO!');
    console.log('----------------------------------------------------');
    console.log('Nome:', user.name);
    console.log('E-mail:', user.email);
    console.log('Senha padrão:', newPassword);
    console.log('Perfil (Role):', user.role);
    console.log('Permissões:', user.permissions);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('❌ ERRO AO GERENCIAR USUÁRIOS:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
