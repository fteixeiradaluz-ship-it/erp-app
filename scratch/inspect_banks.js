const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CURRENT BANK ACCOUNTS ===');
  const banks = await prisma.bank.findMany({
    orderBy: { name: 'asc' }
  });
  console.log(JSON.stringify(banks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
