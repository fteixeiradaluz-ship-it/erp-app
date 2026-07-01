"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createAppointment(data: {
  customerId?: string;
  date: Date;
  description?: string;
  isReturn?: boolean;
  originalApptId?: string;
  isBlocked?: boolean;
  depositAmount?: number;
  depositMethod?: string;
}) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SECRETARY')) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    const appointment = await prisma.$transaction(async (tx: any) => {
      // 1. Criar o agendamento
      const newAppt = await tx.appointment.create({
        data: {
          customerId: data.customerId || null,
          date: data.date,
          description: data.description,
          isReturn: data.isReturn || false,
          originalApptId: data.originalApptId,
          isBlocked: data.isBlocked || false,
          depositAmount: data.depositAmount || 0,
          depositMethod: data.depositMethod || null,
        },
        include: {
          customer: true
        }
      });

      // 2. Se houver sinal/entrada, lança transação de receita
      if (data.depositAmount && data.depositAmount > 0 && data.customerId) {
        let bank = await tx.bank.findFirst();
        if (!bank) {
          bank = await tx.bank.create({
            data: { name: 'Caixa Geral', balance: 0 }
          });
        }

        await tx.transaction.create({
          data: {
            bankId: bank.id,
            type: 'INCOME',
            amount: data.depositAmount,
            description: `Sinal Agendamento - ${newAppt.customer?.name || 'Cliente'}`,
            status: 'PAID',
            payDate: new Date(),
            dueDate: new Date(),
          }
        });

        await tx.bank.update({
          where: { id: bank.id },
          data: { balance: { increment: data.depositAmount } }
        });
      }

      return newAppt;
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/agenda");
    
    return { success: true, appointment };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error: "Falha ao criar consulta." };
  }
}

export async function blockSlot(date: Date, description: string) {
  return createAppointment({
    date,
    description,
    isBlocked: true
  });
}


export async function getAppointments(filters?: { 
  startDate?: Date; 
  endDate?: Date;
  status?: string;
  customerId?: string;
}) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SECRETARY')) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    const where: any = {};
    
    if (filters?.startDate && filters?.endDate) {
      where.date = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    } else if (filters?.startDate) {
      where.date = { gte: filters.startDate };
    }
    
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return { success: true, appointments };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return { success: false, error: "Falha ao buscar consultas." };
  }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SECRETARY')) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/agenda");
    
    return { success: true, appointment };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, error: "Falha ao atualizar status da consulta." };
  }
}

export async function deleteAppointment(id: string) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SECRETARY')) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    await prisma.appointment.delete({
      where: { id }
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/agenda");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return { success: false, error: "Falha ao remover consulta." };
  }
}

export async function getAppointmentById(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Não autorizado" };

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });
    return { success: true, appointment };
  } catch (error) {
    console.error("Error fetching appointment by id:", error);
    return { success: false, error: "Falha ao buscar consulta." };
  }
}
