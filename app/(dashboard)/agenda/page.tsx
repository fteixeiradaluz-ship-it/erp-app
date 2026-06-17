"use client";

import { useEffect, useState } from "react";
import styles from "./agenda.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getAppointments, createAppointment, updateAppointmentStatus } from "@/app/actions/appointmentActions";
import { getCustomers } from "@/app/actions/customerActions";
import { getMedicalRecords } from "@/app/actions/medicalRecordActions";
import Link from "next/link";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 to 18:00

export default function AgendaPage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [monthlyAppointments, setMonthlyAppointments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // History Modal states
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<{ id: string; name: string } | null>(null);
  const [customerHistoryRecords, setCustomerHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Calendar Navigation
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Years from 2024 to 2035
  const years = Array.from({ length: 12 }, (_, i) => 2024 + i);

  // New Appt Form
  const [formData, setFormData] = useState({
    customerId: "",
    description: "",
    isReturn: false,
    isBlocked: false,
    depositAmount: 0,
    depositMethod: "PIX"
  });

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthlyData();
  }, [currentYear, currentMonth]);

  async function fetchDailyData() {
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

  async function fetchMonthlyData() {
    const start = new Date(currentYear, currentMonth, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentYear, currentMonth + 1, 0);
    end.setHours(23, 59, 59, 999);

    const apptRes = await getAppointments({ startDate: start, endDate: end });
    if (apptRes.success) setMonthlyAppointments(apptRes.appointments);
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const date = new Date(selectedDate);
    date.setHours(selectedSlot, 0, 0, 0);

    const res = await createAppointment({
      ...formData,
      depositAmount: formData.isBlocked ? 0 : Number(formData.depositAmount),
      date
    });

    if (res.success) {
      setIsModalOpen(false);
      setFormData({
        customerId: "",
        description: "",
        isReturn: false,
        isBlocked: false,
        depositAmount: 0,
        depositMethod: "PIX"
      });
      fetchDailyData();
      fetchMonthlyData();
    } else {
      alert(res.error);
    }
  };

  const openHistory = async (customerId: string, customerName: string) => {
    setSelectedCustomerForHistory({ id: customerId, name: customerName });
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    const res = await getMedicalRecords(customerId);
    if (res.success) {
      setCustomerHistoryRecords(res.records || []);
    } else {
      alert(res.error || "Erro ao carregar prontuário.");
    }
    setLoadingHistory(false);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    
    // Auto sync calendar view month if needed
    if (newDate.getMonth() !== currentMonth || newDate.getFullYear() !== currentYear) {
      setCurrentMonth(newDate.getMonth());
      setCurrentYear(newDate.getFullYear());
    }
  };

  // Calendar Calculation Helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getCalendarCells = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Prev month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      cells.push({ day, isCurrentMonth: false, date });
    }

    // Current month
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      cells.push({ day: i, isCurrentMonth: true, date });
    }

    // Next month
    const totalSlots = 42;
    const remainingSlots = totalSlots - cells.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      cells.push({ day: i, isCurrentMonth: false, date });
    }

    return cells;
  };

  const hasApptsOnDate = (cellDate: Date) => {
    return monthlyAppointments.some(appt => {
      const apptDate = new Date(appt.date);
      return apptDate.getDate() === cellDate.getDate() &&
             apptDate.getMonth() === cellDate.getMonth() &&
             apptDate.getFullYear() === cellDate.getFullYear() &&
             appt.status !== 'CANCELLED';
    });
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const calendarCells = getCalendarCells();

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

      <div className={styles.layoutGrid}>
        {/* COL 1: Monthly Calendar */}
        <aside className={styles.calendarArea}>
          <div className={styles.calendarCard}>
            <div className={styles.calendarHeader}>
              <button onClick={handlePrevMonth} className={styles.calendarNavBtn}>&lt;</button>
              
              <div className={styles.calendarSelectors}>
                <select 
                  value={currentMonth} 
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className={styles.calendarSelect}
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                
                <select 
                  value={currentYear} 
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className={styles.calendarSelect}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button onClick={handleNextMonth} className={styles.calendarNavBtn}>&gt;</button>
            </div>

            <div className={styles.weekdaysGrid}>
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            <div className={styles.daysGrid}>
              {calendarCells.map((cell, idx) => {
                const cellIsSelected = isSameDay(cell.date, selectedDate);
                const cellIsToday = isSameDay(cell.date, today);
                const cellHasAppts = hasApptsOnDate(cell.date);

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      if (cell.date.getMonth() !== currentMonth) {
                        setCurrentMonth(cell.date.getMonth());
                        setCurrentYear(cell.date.getFullYear());
                      }
                    }}
                    className={`
                      ${styles.calendarCell} 
                      ${cell.isCurrentMonth ? styles.currentMonthDay : styles.otherMonthDay}
                      ${cellIsSelected ? styles.selectedDay : ''}
                      ${cellIsToday ? styles.today : ''}
                    `}
                  >
                    <span>{cell.day}</span>
                    {cellHasAppts && <span className={styles.hasSalesDot}></span>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* COL 2: Hourly Agenda Slots */}
        <main className={styles.hourlyListArea}>
          <div className={styles.agendaGrid}>
            {HOURS.map(hour => {
              const appt = appointments.find(a => new Date(a.date).getHours() === hour && a.status !== 'CANCELLED');
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <strong>{appt.customer?.name}</strong>
                                {appt.depositAmount > 0 && (
                                  <span className={styles.sinalBadge}>
                                    💰 Sinal Pago: R$ {appt.depositAmount.toFixed(2)} ({appt.depositMethod})
                                  </span>
                                )}
                                {isUpcoming && <span className={styles.pulseAlert}>⏰ EM BREVE</span>}
                              </div>
                              {appt.isReturn && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span className={styles.returnBadge}>Retorno</span>
                                  <button
                                    type="button"
                                    onClick={() => openHistory(appt.customerId, appt.customer?.name)}
                                    style={{
                                      background: 'rgba(212, 175, 55, 0.1)',
                                      color: 'var(--gold-hover)',
                                      border: '1px solid var(--border-gold)',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      padding: '0.2rem 0.6rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      transition: 'all 0.2s',
                                    }}
                                    title="Ver prontuário e histórico de consultas anteriores"
                                  >
                                    📋 Prontuário Anterior
                                  </button>
                                </div>
                              )}
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
                                    setFormData({ 
                                      customerId: appt.customerId, 
                                      description: appt.description || '', 
                                      isReturn: appt.isReturn, 
                                      isBlocked: false,
                                      depositAmount: appt.depositAmount || 0,
                                      depositMethod: appt.depositMethod || "PIX"
                                    });
                                    setIsModalOpen(true);
                                  }}>🔄 Reagendar</Button>
                                  <Button size="small" variant="danger" onClick={() => {
                                    updateAppointmentStatus(appt.id, "CANCELLED").then(() => {
                                      fetchDailyData();
                                      fetchMonthlyData();
                                    });
                                  }}>Cancelar</Button>
                                </>
                              )}
                              {appt.status === "COMPLETED" && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span className={styles.statusCompleted}>✅ Concluída</span>
                                  <Link href={`/pos?customerId=${appt.customerId}&appointmentId=${appt.id}`}>
                                    <Button size="small" className={styles.faturarBtn}>💵 Faturar Restante</Button>
                                  </Link>
                                </div>
                              )}
                              {appt.status === "CANCELLED" && <span className={styles.statusCancelled}>❌ Cancelada</span>}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.freeActions}>
                        <button 
                          className={styles.addBtn} 
                          onClick={() => { setSelectedSlot(hour); setFormData({...formData, isBlocked: false, depositAmount: 0}); setIsModalOpen(true); }}
                          disabled={isPast}
                        >
                          {isPast ? "---" : "+ Agendar"}
                        </button>
                        {!isPast && (
                          <button 
                            className={styles.blockBtn} 
                            onClick={() => { setSelectedSlot(hour); setFormData({...formData, isBlocked: true, depositAmount: 0}); setIsModalOpen(true); }}
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
        </main>
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
                          name="isBlocked"
                          checked={!formData.isBlocked} 
                          onChange={() => setFormData({...formData, isBlocked: false})} 
                        /> Consulta
                      </label>
                      <label>
                        <input 
                          type="radio" 
                          name="isBlocked"
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={formData.isReturn} 
                            onChange={e => setFormData({...formData, isReturn: e.target.checked})} 
                          /> É um retorno?
                        </label>
                      </div>

                      {/* Sinal / Entrada Payment Fields */}
                      {!formData.isReturn && (
                        <Card style={{ padding: '1rem', background: '#fcfbf7', border: '1px solid var(--border-gold)', marginBottom: '1.25rem' }}>
                          <h4 style={{ color: 'var(--gold-primary)', marginBottom: '0.75rem', fontSize: '0.95rem', marginTop: 0 }}>💸 Lançar Sinal / Entrada</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>Valor da Entrada (R$)</label>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                placeholder="0.00"
                                value={formData.depositAmount || ''} 
                                onChange={e => setFormData({...formData, depositAmount: Number(e.target.value)})}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>Forma de Pagamento</label>
                              <select 
                                className={styles.select} 
                                value={formData.depositMethod} 
                                onChange={e => setFormData({...formData, depositMethod: e.target.value})}
                              >
                                <option value="PIX">PIX</option>
                                <option value="CARTAO">Cartão</option>
                              </select>
                            </div>
                          </div>
                        </Card>
                      )}
                    </>
                  ) : null}

                  <div className={styles.formGroup}>
                    <label style={{ fontWeight: 600 }}>{formData.isBlocked ? "Motivo do Bloqueio" : "Observações"}</label>
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

      {/* ── History Modal ── */}
      {isHistoryModalOpen && selectedCustomerForHistory && (
        <div className={styles.modalOverlay} style={{ background: 'rgba(14, 12, 8, 0.75)', backdropFilter: 'blur(10px)', zIndex: 2500 }}>
          <div className={styles.modal} style={{ maxWidth: '750px', width: '90%' }}>
            <Card style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{
                background: 'var(--background-card)',
                borderBottom: '1px solid var(--border-color)',
                padding: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ color: 'var(--gold-primary)', margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                  📋 Prontuário & Histórico Clínico
                </h2>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    lineHeight: 1,
                  }}
                >
                  &times;
                </button>
              </div>

              <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                <div style={{
                  background: 'var(--gold-50)',
                  border: '1px solid var(--border-hover)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>👤</span>
                  <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    <strong>Paciente:</strong> {selectedCustomerForHistory.name}
                  </span>
                </div>

                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                    Carregando histórico do prontuário...
                  </div>
                ) : customerHistoryRecords.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    color: 'var(--text-muted)',
                    background: 'var(--surface-hover)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-color)'
                  }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>📭</span>
                    Nenhum registro clínico anterior foi encontrado para este paciente.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {customerHistoryRecords.map((record, index) => {
                      const dateStr = new Date(record.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const isLast = index === 0;

                      return (
                        <div 
                          key={record.id} 
                          style={{
                            border: isLast ? '1px solid var(--border-gold)' : '1px solid var(--border-color)',
                            background: isLast ? '#fffdf7' : 'var(--background-card)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            position: 'relative',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          {isLast && (
                            <span style={{
                              position: 'absolute',
                              top: '1rem',
                              right: '1rem',
                              background: 'var(--gold-primary)',
                              color: '#000',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '99px',
                              textTransform: 'uppercase'
                            }}>
                              Última Consulta
                            </span>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--gold-primary)', fontWeight: 700 }}>
                              📅 {dateStr}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <strong>Tipo:</strong> {record.appointment?.isReturn ? 'Retorno' : 'Consulta Principal'}
                            </span>
                          </div>

                          <div 
                            style={{
                              background: 'var(--surface-hover)',
                              borderRadius: '8px',
                              padding: '1rem',
                              fontSize: '0.9rem',
                              lineHeight: '1.6',
                              color: 'var(--text-primary)',
                              whiteSpace: 'pre-wrap',
                              borderLeft: '3px solid var(--gold-primary)',
                              fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}
                          >
                            {record.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{
                background: 'var(--surface-hover)',
                borderTop: '1px solid var(--border-color)',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <Button onClick={() => setIsHistoryModalOpen(false)}>
                  Fechar Prontuário
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
