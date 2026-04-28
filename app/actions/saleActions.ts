'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function submitSale(data: {
  customerId: string;
  paymentMethod: string;
  installments?: number;
  discount?: number; // Percentual
  items: { productId: string, quantity: number, price: number }[];
}) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  try {
    let subtotal = 0;
    for (const item of data.items) {
      subtotal += item.price * item.quantity;
    }

    const discountAmount = data.discount ? (subtotal * (data.discount / 100)) : 0;
    const totalAmount = subtotal - discountAmount;

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

      // 2. Deduzir do Estoque
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
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

  const customers = await prisma.customer.findMany({ select: { id: true, name: true }});
  const products = await prisma.product.findMany({ 
    where: { deletedAt: null },
    select: { id: true, name: true, price: true, stock: true }
  });
  return { customers, products };
}
