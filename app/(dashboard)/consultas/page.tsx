"use client";

import { useEffect, useState } from "react";
import styles from "./consultas.module.css";
import { Button } from "@/components/ui/Button";
import ConsultationForm from "@/components/ConsultationForm";
import { getAppointments, createAppointment, updateAppointmentStatus } from "@/app/actions/appointmentActions";
import { getCustomers, upsertCustomer } from "@/app/actions/customerActions";

// Mock customer action or fetch directly
// Assuming there's a getCustomers action, but we can also fetch it via an API or another action.
// For now, let's create a local fetch for customers since we don't know the exact customer actions.

type Customer = { id: string; name: string };
type Appointment = {
  id: string;
  customerId: string;
  date: Date;
  description: string | null;
  status: string;
  isReturn: boolean;
  customer: Customer;
};

export default function ConsultasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // For scheduling return
  const [returnApptId, setReturnApptId] = useState<string | null>(null);
  const [returnCustomerId, setReturnCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // We will need a way to fetch customers, if there's no action we can query it directly in a new action
      // Or we can create an API endpoint if needed.
      // For now, let's just fetch appointments
      const res = await getAppointments();
      if (res.success) {
        // Cast dates back to Date objects since they might come as strings from Server Actions depending on Next.js version
        const parsedAppointments = res.appointments.map((a: any) => ({
          ...a,
          date: new Date(a.date)
        }));
        setAppointments(parsedAppointments);
      }
      
      // Fetch customers
      const custRes = await getCustomers();
      if (custRes.success) {
         setCustomers(custRes.customers);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleCreate(data: any) {
    if (data.newCustomerData) {
      // Create customer first
      const custRes = await upsertCustomer(data.newCustomerData);
      if (!custRes.success || !custRes.customer) {
        alert("Erro ao criar novo paciente.");
        return;
      }
      data.customerId = custRes.customer.id;
    }
    
    // Remove newCustomerData since it's not needed for createAppointment
    const appointmentData = { ...data };
    delete appointmentData.newCustomerData;

    const res = await createAppointment(appointmentData);
    if (res.success) {
      setShowForm(false);
      setReturnApptId(null);
      setReturnCustomerId(null);
      fetchData(); // re-fetches customers and appointments
    } else {
      alert("Erro ao criar consulta");
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await updateAppointmentStatus(id, newStatus);
    fetchData();
  }
  
  function openReturnForm(appt: Appointment) {
    setReturnApptId(appt.id);
    setReturnCustomerId(appt.customerId);
    setShowForm(true);
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Consultas e Retornos</h1>
        <Button onClick={() => setShowForm(true)}>+ Nova Consulta</Button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Paciente</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: "center"}}>Carregando...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: "center"}}>Nenhuma consulta agendada.</td></tr>
            ) : (
              appointments.map(appt => (
                <tr key={appt.id}>
                  <td>{formatDate(appt.date)}</td>
                  <td>{appt.customer?.name}</td>
                  <td>{appt.isReturn ? "Retorno" : "Primeira Consulta"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${
                      appt.status === "COMPLETED" ? styles.statusCompleted :
                      appt.status === "CANCELLED" ? styles.statusCancelled :
                      styles.statusScheduled
                    }`}>
                      {appt.status === "SCHEDULED" ? "Agendada" :
                       appt.status === "COMPLETED" ? "Concluída" : "Cancelada"}
                    </span>
                  </td>
                  <td>
                    {appt.status === "SCHEDULED" && (
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button 
                          className={`${styles.actionButton} ${styles.completeButton}`}
                          onClick={() => handleStatusChange(appt.id, "COMPLETED")}
                          title="Marcar como Concluída"
                        >
                          ✓
                        </button>
                        <button 
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleStatusChange(appt.id, "CANCELLED")}
                          title="Cancelar Consulta"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {appt.status === "COMPLETED" && (
                       <button 
                         className={`${styles.actionButton} ${styles.returnButton}`}
                         onClick={() => openReturnForm(appt)}
                       >
                         Agendar Retorno
                       </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ConsultationForm 
          customers={customers}
          onClose={() => {
            setShowForm(false);
            setReturnApptId(null);
            setReturnCustomerId(null);
          }}
          onSubmit={handleCreate}
          isReturn={!!returnApptId}
          originalApptId={returnApptId || undefined}
          defaultCustomerId={returnCustomerId || undefined}
        />
      )}
    </div>
  );
}
