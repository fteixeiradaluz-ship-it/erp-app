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

  const totalScheduled = appointments.filter(a => a.status === 'SCHEDULED' && !a.isBlocked).length;
  const totalCompleted = appointments.filter(a => a.status === 'COMPLETED').length;
  const totalCancelled = appointments.filter(a => a.status === 'CANCELLED').length;
  const totalBlocked = appointments.filter(a => a.isBlocked).length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>✨ Agenda de Procedimentos & Estética</h1>
          <p>{selectedDate.toLocaleDateString("pt-BR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className={styles.dateControls}>
          <Button variant="secondary" onClick={() => changeDate(-1)}>◀ Dia Anterior</Button>
          <Button variant="secondary" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          <Button variant="secondary" onClick={() => changeDate(1)}>Próximo Dia ▶</Button>
        </div>
      </header>

      {/* KPI Summary Strip */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>📅</span>
          <div>
            <span className={styles.summaryValue}>{totalScheduled}</span>
            <span className={styles.summaryLabel}>Agendado{totalScheduled !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>✅</span>
          <div>
            <span className={styles.summaryValue} style={{ color: '#16a34a' }}>{totalCompleted}</span>
            <span className={styles.summaryLabel}>Concluído{totalCompleted !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>❌</span>
          <div>
            <span className={styles.summaryValue} style={{ color: '#dc2626' }}>{totalCancelled}</span>
            <span className={styles.summaryLabel}>Cancelado{totalCancelled !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryIcon}>🔒</span>
          <div>
            <span className={styles.summaryValue} style={{ color: '#6b7280' }}>{totalBlocked}</span>
            <span className={styles.summaryLabel}>Bloqueado{totalBlocked !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className={styles.legendRow}>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--gold-primary)' }}></span>Agendado</div>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#16a34a' }}></span>Concluído</div>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#dc2626' }}></span>Cancelado</div>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#6b7280' }}></span>Bloqueado</div>
          <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#e5e7eb', border: '1px dashed var(--border-gold)' }}></span>Livre</div>
        </div>
      </div>

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
                        <span>🔒 Horário Bloqueado</span>
                        <p>{appt.description}</p>
                        <Button size="small" variant="secondary" onClick={() => updateAppointmentStatus(appt.id, "CANCELLED")} style={{ marginTop: '0.5rem' }}>Desbloquear</Button>
                      </div>
                    ) : (
                      <div className={styles.apptInfo}>
                        <div className={styles.apptHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong>👤 {appt.customer?.name}</strong>
                            {isUpcoming && <span className={styles.pulseAlert}>⏰ EM BREVE</span>}
                          </div>
                          {appt.isReturn && <span className={styles.returnBadge}>💆‍♀️ Retorno</span>}
                        </div>
                        <p>{appt.description || "Sem observações de tratamento"}</p>
                        
                        <div className={styles.apptActions}>
                          {appt.status === "SCHEDULED" && (
                            <>
                              <Link href={`/agenda/iniciar/${appt.id}`}>
                                <Button size="small">▶ Iniciar Procedimento</Button>
                              </Link>
                              <Button size="small" variant="secondary" onClick={() => { 
                                setSelectedSlot(hour); 
                                setFormData({ customerId: appt.customerId, description: appt.description, isReturn: appt.isReturn, isBlocked: false });
                                setIsModalOpen(true);
                              }}>🔄 Reagendar</Button>
                              <Button size="small" variant="danger" onClick={() => updateAppointmentStatus(appt.id, "CANCELLED")}>Cancelar</Button>
                            </>
                          )}
                          {appt.status === "COMPLETED" && <span className={styles.statusCompleted}>✅ Concluído</span>}
                          {appt.status === "CANCELLED" && <span className={styles.statusCancelled}>❌ Cancelado</span>}
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
                      {isPast ? "---" : "✨ Agendar Procedimento"}
                    </button>
                    {!isPast && (
                      <button 
                        className={styles.blockBtn} 
                        onClick={() => { setSelectedSlot(hour); setFormData({...formData, isBlocked: true}); setIsModalOpen(true); }}
                      >
                        🔒 Bloquear
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
                <h2>
                  {formData.isBlocked ? '🔒 Bloquear Horário' : '✨ Novo Agendamento'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>
                  {formData.isBlocked
                    ? `Bloqueando o horário das ${selectedSlot}:00`
                    : `Agendando procedimento para as ${selectedSlot}:00`}
                </p>

                <form onSubmit={handleCreate}>
                  {/* Toggle tipo */}
                  <div className={styles.formGroup}>
                    <label>Tipo de Registro</label>
                    <div className={styles.toggleGroup}>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${!formData.isBlocked ? styles.toggleActive : ''}`}
                        onClick={() => setFormData({...formData, isBlocked: false})}
                      >
                        ✨ Consulta / Procedimento
                      </button>
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${formData.isBlocked ? styles.toggleActiveBlock : ''}`}
                        onClick={() => setFormData({...formData, isBlocked: true})}
                      >
                        🔒 Bloquear Horário
                      </button>
                    </div>
                  </div>

                  {!formData.isBlocked && (
                    <>
                      <div className={styles.formGroup}>
                        <label>👤 Paciente / Cliente</label>
                        <select
                          required
                          className={styles.select}
                          value={formData.customerId}
                          onChange={e => setFormData({...formData, customerId: e.target.value})}
                        >
                          <option value="">— Selecione a Paciente —</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}{c.cpf ? ` · ${c.cpf}` : ''}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <div className={styles.returnToggle}>
                          <input
                            type="checkbox"
                            id="isReturn"
                            checked={formData.isReturn}
                            onChange={e => setFormData({...formData, isReturn: e.target.checked})}
                            className={styles.checkbox}
                          />
                          <label htmlFor="isReturn" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            💆‍♀️ Marcar como <strong>Retorno</strong>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  <div className={styles.formGroup}>
                    <label>{formData.isBlocked ? '📝 Motivo do Bloqueio' : '📝 Observações do Procedimento'}</label>
                    <textarea
                      className={styles.textarea}
                      placeholder={formData.isBlocked
                        ? 'Ex: Horário reservado para capacitação, reunião, etc.'
                        : 'Ex: Botox testa, peeling, tratamento de manchas...'}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <div className={styles.modalFooter}>
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">
                      {formData.isBlocked ? '🔒 Confirmar Bloqueio' : '✅ Confirmar Agendamento'}
                    </Button>
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
