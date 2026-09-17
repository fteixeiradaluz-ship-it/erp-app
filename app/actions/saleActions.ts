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
  bankId?: string;
  splitPayments?: {
    method: string;
    amount: number;
    installments?: number;
    bankId?: string;
  }[];
}) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  if (!data.items || data.items.length === 0) {
    return { error: 'A venda deve conter pelo menos um item.' };
  }

  try {
    let subtotal = 0;
    for (const item of data.items) {
      if (item.quantity <= 0) {
        return { error: 'A quantidade de cada item deve ser maior que zero.' };
      }
      subtotal += item.price * item.quantity;
    }

    const discountAmount = data.discount ? (subtotal * (data.discount / 100)) : 0;
    const totalAmount = Math.max(0, subtotal - discountAmount - (data.depositApplied || 0));

    // Validar pagamentos múltiplos se fornecidos
    const isSplit = data.splitPayments && data.splitPayments.length > 0;
    if (isSplit) {
      const splitTotal = data.splitPayments!.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(splitTotal - totalAmount) > 0.05) {
        return { error: `A soma dos pagamentos (R$ ${splitTotal.toFixed(2)}) não confere com o total da venda (R$ ${totalAmount.toFixed(2)}).` };
      }
    }

    const sale = await prisma.$transaction(async (tx: any) => {
      // 1. Validar disponibilidade de estoque para todos os produtos antes de processar
      for (const item of data.items) {
        const p = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, type: true, stock: true, cost: true, price: true }
        });
        if (!p) {
          throw new Error(`Produto não encontrado no sistema.`);
        }
        if (p.type === 'PRODUCT' && p.stock < item.quantity) {
          throw new Error(`Estoque insuficiente para o produto "${p.name}". Disponível: ${p.stock}, Solicitado: ${item.quantity}.`);
        }
      }

      // 2. Criar a Venda
      const newSale = await tx.sale.create({
        data: {
          userId: session.userId,
          customerId: data.customerId,
          paymentMethod: isSplit ? 'MULTIPLO' : data.paymentMethod,
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

      // 3. Deduzir do Estoque e calcular base de comissão com dedução de custos
      let totalCommissionableAmount = 0;
      for (const item of data.items) {
        const p = await tx.product.findUnique({
          where: { id: item.productId },
          select: { type: true, cost: true }
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

      // 4. Configurações Globais (Taxas de Cartão, Comissões, Impostos)
      const settings = await tx.settings.findFirst();
      const cardFeeCreditInstallments = settings?.cardFeeCreditInstallments ?? 3.5;
      const cardFeeCredit1x = settings?.cardFeeCredit1x ?? 2.5;
      const cardFeeDebit = settings?.cardFeeDebit ?? 1.5;

      // 5. Inserir Transação(ões) no Financeiro
      const paymentsToProcess = isSplit ? data.splitPayments! : [{
        method: data.paymentMethod,
        amount: totalAmount,
        installments: data.installments || 1,
        bankId: data.bankId
      }];

      for (let pIdx = 0; pIdx < paymentsToProcess.length; pIdx++) {
        const pmt = paymentsToProcess[pIdx];
        let targetBankId = pmt.bankId || data.bankId;

        if (!targetBankId) {
          let defaultBank = await tx.bank.findFirst();
          if (!defaultBank) {
            defaultBank = await tx.bank.create({ data: { name: 'Caixa Geral', balance: 0 } });
          }
          targetBankId = defaultBank.id;
        }

        const isCreditCard = pmt.method === 'CARTAO';
        const isDebitCard = pmt.method === 'DEBITO';
        const pmtInstallments = pmt.installments && pmt.installments > 1 ? pmt.installments : 1;
        const pmtSuffix = isSplit ? ` [Parte ${pIdx + 1}/${paymentsToProcess.length} - ${pmt.method}]` : '';

        if (isCreditCard) {
          const feePercent = (pmtInstallments > 1 ? cardFeeCreditInstallments : cardFeeCredit1x) / 100;
          const grossInstallment = pmt.amount / pmtInstallments;
          const netInstallment = grossInstallment * (1 - feePercent);

          for (let i = 1; i <= pmtInstallments; i++) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + i * 30);

            await tx.transaction.create({
              data: {
                bankId: targetBankId,
                type: 'INCOME',
                amount: netInstallment,
                description: `Venda #${newSale.id.slice(0, 6)}${pmtSuffix} - Parcela ${i}/${pmtInstallments}`,
                status: 'PENDING',
                dueDate: dueDate,
                saleId: newSale.id,
                userId: session.userId,
              }
            });
          }
        } else if (isDebitCard) {
          const feePercent = cardFeeDebit / 100;
          const netAmount = pmt.amount * (1 - feePercent);

          await tx.transaction.create({
            data: {
              bankId: targetBankId,
              type: 'INCOME',
              amount: netAmount,
              description: `Venda #${newSale.id.slice(0, 6)}${pmtSuffix} (Cartão de Débito)`,
              status: 'PAID',
              dueDate: new Date(),
              payDate: new Date(),
              saleId: newSale.id,
              userId: session.userId,
            }
          });

          await tx.bank.update({
            where: { id: targetBankId },
            data: { balance: { increment: netAmount } }
          });
        } else {
          // PIX, DINHEIRO ou A_VISTA
          await tx.transaction.create({
            data: {
              bankId: targetBankId,
              type: 'INCOME',
              amount: pmt.amount,
              description: `Venda #${newSale.id.slice(0, 6)}${pmtSuffix}`,
              status: 'PAID',
              dueDate: new Date(),
              payDate: new Date(),
              saleId: newSale.id,
              userId: session.userId,
            }
          });

          await tx.bank.update({
            where: { id: targetBankId },
            data: { balance: { increment: pmt.amount } }
          });
        }
      }

      // 7. Calcular e lançar repasse de comissão do profissional
      const seller = await tx.user.findUnique({
        where: { id: session.userId },
        select: { name: true, commissionPercent: true }
      });
      const globalComm = settings?.commissionPercentage || 0;
      const commissionPercent = seller?.commissionPercent !== null && seller?.commissionPercent !== undefined 
        ? seller.commissionPercent 
        : globalComm;

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
            bankId: selectedBankId,
            type: 'EXPENSE',
            amount: commissionAmount,
            description: `Repasse Profissional: Comissão Venda #${newSale.id.slice(0, 6)} - ${seller?.name || 'Vendedor'}`,
            status: 'PENDING',
            dueDate: nextMonthDate,
            payDate: null,
            saleId: newSale.id,
            userId: session.userId
          }
        });
      }

      // 8. Provisão de Impostos baseada na alíquota global
      const taxPercentage = settings?.taxPercentage || 0;
      const taxAmount = totalAmount * (taxPercentage / 100);

      if (taxAmount > 0) {
        const nextMonthTaxDate = new Date();
        nextMonthTaxDate.setMonth(nextMonthTaxDate.getMonth() + 1);
        nextMonthTaxDate.setDate(15);
        nextMonthTaxDate.setHours(0, 0, 0, 0);

        await tx.transaction.create({
          data: {
            bankId: selectedBankId,
            type: 'EXPENSE',
            amount: taxAmount,
            description: `Provisão de Imposto: Venda #${newSale.id.slice(0, 6)}`,
            status: 'PENDING',
            dueDate: nextMonthTaxDate,
            payDate: null,
            saleId: newSale.id
          }
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
  if (!session) return { customers: [], products: [], banks: [] };

  const customers = await prisma.customer.findMany({ 
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  const products = await prisma.product.findMany({ 
    where: { deletedAt: null },
    select: { id: true, name: true, price: true, stock: true, type: true },
    orderBy: { name: 'asc' }
  });
  
  const allBanks = await prisma.bank.findMany({
    select: { id: true, name: true, balance: true },
    orderBy: { name: 'asc' }
  });

  const filteredBanks = allBanks.filter(b => 
    !b.name.toLowerCase().includes('cartão') && 
    !b.name.toLowerCase().includes('cartao')
  );

  const isAdmin = session.role === 'ADMIN';
  const banks = filteredBanks.map(b => ({
    id: b.id,
    name: b.name,
    balance: isAdmin ? b.balance : 0
  }));

  return { customers, products, banks };
}

export async function deleteSale(id: string, reason: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { error: 'Não autorizado' };
  if (!reason || !reason.trim()) return { error: 'A justificativa é obrigatória' };

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ 
        where: { id },
        include: { items: true } 
      });
      if (!sale) throw new Error('Venda não encontrada');
      if (sale.deletedAt) throw new Error('Venda já está excluída');

      // 1. Soft-delete da Venda
      await tx.sale.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          deletionJustification: reason
        }
      });

      // 2. Reverter estoque (apenas para itens do tipo PRODUCT)
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

      // 3. Localizar todas as transações associadas diretamente pelo saleId
      const associatedTransactions = await tx.transaction.findMany({
        where: {
          saleId: sale.id,
          deletedAt: null
        }
      });

      for (const transaction of associatedTransactions) {
        // Se a transação já estava paga, estorna o saldo bancário
        if (transaction.status === 'PAID') {
          const modifier = transaction.type === 'INCOME' ? -1 : 1;
          await tx.bank.update({
            where: { id: transaction.bankId },
            data: { balance: { increment: transaction.amount * modifier } }
          });
        }

        // Soft-delete na transação
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { 
            deletedAt: new Date(),
            deletionJustification: `Venda excluída: ${reason}`
          }
        });
      }
    });

    // Registrar no Log de Auditoria
    const { createAuditLog } = await import('@/lib/audit');
    await createAuditLog(session.userId, 'DELETE_SALE', 'Sale', { id, reason });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Erro ao excluir venda' };
  }
}
