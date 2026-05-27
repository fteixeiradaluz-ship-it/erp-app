'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function submitSale(data: {
  customerId: string;
  paymentMethod: string;
  installments?: number;
  discount?: number; // Percentual
  items: { productId: string, quantity: number, price: number }[];
  depositApplied?: number;
  appointmentId?: string;
}) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  try {
    let subtotal = 0;
    for (const item of data.items) {
      subtotal += item.price * item.quantity;
    }

    const discountAmount = data.discount ? (subtotal * (data.discount / 100)) : 0;
    const totalAmount = Math.max(0, subtotal - discountAmount - (data.depositApplied || 0));

    const sale = await prisma.$transaction(async (tx: any) => {
      // 1. Criar a Venda
      const newSale = await tx.sale.create({
        data: {
          userId: session.userId,
          customerId: data.customerId,
          paymentMethod: data.paymentMethod,
          installments: data.installments || 1,
          discount: data.discount || 0,
          totalAmount: totalAmount,
          items: {
            create: data.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }
      });

      // 2. Deduzir do Estoque e calcular base de comissão com dedução de custos
      let totalCommissionableAmount = 0;
      for (const item of data.items) {
        const p = await tx.product.findUnique({
          where: { id: item.productId },
          select: { type: true, cost: true, price: true }
        });
        if (p) {
          const productCost = p.cost || 0;
          const netItemPrice = Math.max(0, item.price - productCost);
          totalCommissionableAmount += netItemPrice * item.quantity;

          if (p.type === 'PRODUCT') {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            });
          }
        }
      }

      // 3. Inserir no Financeiro
      let bank = await tx.bank.findFirst();
      if (!bank) {
        bank = await tx.bank.create({
          data: { name: 'Caixa Geral', balance: 0 }
        });
      }

      // Para cartão, se parcelado, podemos lançar como uma única pendente com a info
      await tx.transaction.create({
        data: {
          bankId: bank.id,
          type: 'INCOME',
          amount: totalAmount,
          description: `Venda #${newSale.id.slice(0,6)}${data.installments && data.installments > 1 ? ` (${data.installments}x)` : ''}`,
          status: data.paymentMethod === 'CARTAO' ? 'PENDING' : 'PAID',
          dueDate: data.paymentMethod === 'CARTAO' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(),
        }
      });

      // Calcular e lançar repasse de comissão do profissional
      const seller = await tx.user.findUnique({
        where: { id: session.userId },
        select: { name: true, commissionPercent: true }
      });
      const settings = await tx.settings.findFirst();
      const globalComm = settings ? (settings.commissionPercentage || 0) : 0;
      const commissionPercent = seller ? (seller.commissionPercent !== null ? seller.commissionPercent : globalComm) : globalComm;

      const discountPercent = data.discount || 0;
      const discountedCommissionable = totalCommissionableAmount * (1 - discountPercent / 100);
      const commissionAmount = discountedCommissionable * (commissionPercent / 100);

      if (commissionAmount > 0) {
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        nextMonthDate.setDate(5);
        nextMonthDate.setHours(0, 0, 0, 0);

        await tx.transaction.create({
          data: {
            bankId: bank.id,
            type: 'EXPENSE',
            amount: commissionAmount,
            description: `Repasse Profissional: Comissão Venda #${newSale.id.slice(0, 6)} - ${seller?.name || 'Vendedor'}`,
            status: 'PENDING',
            dueDate: nextMonthDate,
            payDate: null
          }
        });
      }
      
      // Update bank balance if PAID
      if (data.paymentMethod !== 'CARTAO') {
        await tx.bank.update({
          where: { id: bank.id },
          data: { balance: { increment: totalAmount } }
        });
      }

      return newSale;
    });

    const fullSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: { include: { product: true } },
        customer: true,
        user: { select: { name: true } }
      }
    });

    return { success: true, sale: fullSale };
  } catch (err: any) {
    return { error: err.message || 'Erro ao finalizar venda.' };
  }
}

export async function getPOSData() {
  const session = await getSession();
  if (!session) return { customers: [], products: [] };

  const customers = await prisma.customer.findMany({ 
    where: { deletedAt: null },
    select: { id: true, name: true }
  });
  const products = await prisma.product.findMany({ 
    where: { deletedAt: null },
    select: { id: true, name: true, price: true, stock: true, type: true }
  });
  return { customers, products };
}

export async function deleteSale(id: string, reason: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' };
  if (!reason) return { error: 'A justificativa é obrigatória' };

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ 
        where: { id },
        include: { items: true } 
      });
      if (!sale) throw new Error('Venda não encontrada');
      if (sale.deletedAt) throw new Error('Venda já está excluída');

      // 1. Soft-delete the sale
      await tx.sale.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          deletionJustification: reason
        }
      });

      // 2. Revert stock (apenas se for PRODUTO)
      for (const item of sale.items) {
        const p = await tx.product.findUnique({
          where: { id: item.productId },
          select: { type: true }
        });
        if (p && p.type === 'PRODUCT') {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      // 3. Find and soft-delete associated transaction
      const transaction = await tx.transaction.findFirst({
        where: { description: { startsWith: `Venda #${sale.id.slice(0, 6)}` } }
      });

      if (transaction) {
        // Revert bank balance if PAID
        if (transaction.status === 'PAID') {
          await tx.bank.update({
            where: { id: transaction.bankId },
            data: { balance: { decrement: transaction.amount } }
          });
        }
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { 
            deletedAt: new Date(),
            deletionJustification: `Venda excluída: ${reason}`
          }
        });
      }
    });

    // Audit Log
    const { createAuditLog } = await import('@/lib/audit');
    await createAuditLog(session.userId, 'DELETE_SALE', 'Sale', { id, reason });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro ao excluir venda' };
  }
}
