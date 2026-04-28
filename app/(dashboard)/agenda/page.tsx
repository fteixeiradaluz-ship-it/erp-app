"use client";

import { useEffect, useState } from "react";
import styles from "./agenda.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAppointments, createAppointment, updateAppointmentStatus, blockSlot } from "@/app/actions/appointmentActions";
import { getCustomers } from "@/app/actions/customerActions";
import Link from "next/link";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 to 18:00

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  
  // New Appt Form
  const [formData, setFormData] = useState({
    customerId: "",
    description: "",
    isReturn: false,
    isBlocked: false
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  async function fetchData() {
    setLoading(true);
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const [apptRes, custRes] = await Promise.all([
      getAppointments({ startDate: start, endDate: end }),
      getCustomers()
    ]);

    if (apptRes.success) setAppointments(apptRes.appointments);
    if (custRes.success) setCustomers(custRes.customers);
    setLoading(false);
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const date = new Date(selectedDate);
    date.setHours(selectedSlot, 0, 0, 0);

    const res = await createAppointment({
      ...formData,
      date
    });

    if (res.success) {
      setIsModalOpen(false);
      setFormData({ customerId: "", description: "", isReturn: false, isBlocked: false });
      fetchData();
    } else {
      alert(res.error);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>📅 Agenda de Atendimentos</h1>
          <p>{selectedDate.toLocaleDateString("pt-BR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className={styles.dateControls}>
          <Button variant="secondary" onClick={() => changeDate(-1)}>◀ Ontem</Button>
          <Button variant="secondary" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          <Button variant="secondary" onClick={() => changeDate(1)}>Amanhã ▶</Button>
        </div>
      </header>

      <div className={styles.agendaGrid}>
        {HOURS.map(hour => {
          const appt = appointments.find(a => new Date(a.date).getHours() === hour);
          const isPast = new Date(selectedDate).setHours(hour, 0, 0, 0) < Date.now();
          
          const apptDate = appt ? new Date(appt.date) : null;
          const now = new Date();
          const diffMinutes = apptDate ? (apptDate.getTime() - now.getTime()) / (1000 * 60) : 999;
          const isUpcoming = appt && diffMinutes > 0 && diffMinutes <= 30 && appt.status === 'SCHEDULED';
          
          return (
            <div key={hour} className={`${styles.slot} ${appt ? (appt.isBlocked ? styles.blockedSlot : styles.occupiedSlot) : styles.freeSlot} ${isUpcoming ? styles.upcomingAlert : ''}`}>
              <div className={styles.slotTime}>{hour}:00</div>
              
              <div className={styles.slotContent}>
                {appt ? (
                  <>
                    {appt.isBlocked ? (
                      <div className={styles.blockedInfo}>
                        <span>🚫 Bloqueado</span>
                        <p>{appt.description}</p>
                        <Button size="small" variant="secondary" onClick={() => updateAppointmentStatus(appt.id, "CANCELLED")} style={{ marginTop: '0.5rem' }}>Desbloquear</Button>
                      </div>
                    ) : (
                      <div className={styles.apptInfo}>
                        <div className={styles.apptHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong>{appt.customer?.name}</strong>
                            {isUpcoming && <span className={styles.pulseAlert}>⏰ EM BREVE</span>}
                          </div>
                          {appt.isReturn && <span className={styles.returnBadge}>Retorno</span>}
                        </div>
                        <p>{appt.description || "Sem observações"}</p>
                        
                        <div className={styles.apptActions}>
                          {appt.status === "SCHEDULED" && (
                            <>
                              <Link href={`/agenda/iniciar/${appt.id}`}>
                                <Button size="small">▶ Iniciar</Button>
                              </Link>
                              <Button size="small" variant="secondary" onClick={() => { 
                                setSelectedSlot(hour); 
                                setFormData({ customerId: appt.customerId, description: appt.description, isReturn: appt.isReturn, isBlocked: false });
                                setIsModalOpen(true);
                                // For rescheduling, we might want to delete the old one or update it.
                                // Simplest: user deletes and recreates, or we add an 'Edit' mode.
                              }}>🔄 Reagendar</Button>
                              <Button size="small" variant="danger" onClick={() => updateAppointmentStatus(appt.id, "CANCELLED")}>Cancelar</Button>
                            </>
                          )}
                          {appt.status === "COMPLETED" && <span className={styles.statusCompleted}>✅ Concluída</span>}
                          {appt.status === "CANCELLED" && <span className={styles.statusCancelled}>❌ Cancelada</span>}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.freeActions}>
                    <button 
                      className={styles.addBtn} 
                      onClick={() => { setSelectedSlot(hour); setFormData({...formData, isBlocked: false}); setIsModalOpen(true); }}
                      disabled={isPast}
                    >
                      {isPast ? "---" : "+ Agendar"}
                    </button>
                    {!isPast && (
                      <button 
                        className={styles.blockBtn} 
                        onClick={() => { setSelectedSlot(hour); setFormData({...formData, isBlocked: true}); setIsModalOpen(true); }}
                      >
                        🚫 Bloquear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <Card>
              <div className={styles.modalContent}>
                <h2>Agendar para as {selectedSlot}:00</h2>
                <form onSubmit={handleCreate}>
                  <div className={styles.formGroup}>
                    <label>Tipo de Registro</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <label>
                        <input 
                          type="radio" 
                          checked={!formData.isBlocked} 
                          onChange={() => setFormData({...formData, isBlocked: false})} 
                        /> Consulta
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          checked={formData.isBlocked} 
                          onChange={() => setFormData({...formData, isBlocked: true})} 
                        /> Bloquear Horário
                      </label>
                    </div>
                  </div>

                  {!formData.isBlocked ? (
                    <>
                      <div className={styles.formGroup}>
                        <label>Paciente</label>
                        <select 
                          required 
                          className={styles.select}
                          value={formData.customerId}
                          onChange={e => setFormData({...formData, customerId: e.target.value})}
                        >
                          <option value="">-- Selecione o Paciente --</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.cpf || 'Sem CPF'})</option>)}
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.isReturn} 
                            onChange={e => setFormData({...formData, isReturn: e.target.checked})} 
                          /> É um retorno?
                        </label>
                      </div>
                    </>
                  ) : null}

                  <div className={styles.formGroup}>
                    <label>{formData.isBlocked ? "Motivo do Bloqueio" : "Observações"}</label>
                    <textarea 
                      className={styles.textarea}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <div className={styles.modalFooter}>
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">{formData.isBlocked ? "Bloquear" : "Confirmar Agendamento"}</Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
