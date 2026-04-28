"use client";

import { useEffect, useState, use } from "react";
import styles from "./iniciar.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAppointments, updateAppointmentStatus } from "@/app/actions/appointmentActions";
import { upsertMedicalRecord } from "@/app/actions/medicalRecordActions";
import { useRouter } from "next/navigation";

export default function IniciarConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getAppointments(); // We need a getAppointmentById really, but for now we filter
      if (res.success) {
        const found = res.appointments.find((a: any) => a.id === id);
        if (found) {
          setAppt(found);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSave = async () => {
    if (!content.trim()) return alert("O prontuário não pode estar vazio.");
    setSaving(true);
    
    // 1. Save medical record
    const res = await upsertMedicalRecord({
      customerId: appt.customer.id,
      appointmentId: id,
      content
    });

    if (res.success) {
      // 2. Mark appointment as COMPLETED
      await updateAppointmentStatus(id, "COMPLETED");
      alert("Consulta concluída e prontuário salvo!");
      router.push("/agenda");
    } else {
      alert(res.error);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados da consulta...</div>;
  if (!appt) return <div style={{ padding: '2rem', textAlign: 'center' }}>Consulta não encontrada.</div>;

  const customer = appt.customer;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🩺 Atendimento em Curso</h1>
        <Button variant="secondary" onClick={() => router.push("/agenda")}>Voltar para Agenda</Button>
      </header>

      <div className={styles.grid}>
        <div className={styles.sidebar}>
          <Card className={styles.card}>
            <h3>Paciente</h3>
            <div className={styles.info}>
              <p><strong>Nome:</strong> {customer.name}</p>
              <p><strong>CPF:</strong> {customer.cpf || "Não informado"}</p>
              <p><strong>Tel:</strong> {customer.phone || "Não informado"}</p>
              <p><strong>Cidade:</strong> {customer.city || "Não informado"}</p>
            </div>
            <hr className={styles.divider} />
            <div className={styles.info}>
              <p><strong>Tipo:</strong> {appt.isReturn ? "Retorno" : "Primeira Consulta"}</p>
              <p><strong>Data:</strong> {new Date(appt.date).toLocaleDateString()}</p>
              <p><strong>Hora:</strong> {new Date(appt.date).getHours()}:00</p>
            </div>
          </Card>
          
          <Card className={styles.card}>
            <h3>Observações do Agendamento</h3>
            <p className={styles.notes}>{appt.description || "Nenhuma observação informada."}</p>
          </Card>
        </div>

        <div className={styles.main}>
          <Card className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Registrar Prontuário / Evolução</h3>
              <span className={styles.authorBadge}>Médico: ADMIN</span>
            </div>
            <textarea 
              className={styles.textarea}
              placeholder="Descreva aqui o histórico do paciente, sintomas, diagnóstico e prescrição..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className={styles.actions}>
              <Button onClick={handleSave} disabled={saving} style={{ width: '200px' }}>
                {saving ? "Salvando..." : "Concluir Atendimento"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
