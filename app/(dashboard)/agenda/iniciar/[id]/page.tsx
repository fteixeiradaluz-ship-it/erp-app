"use client";

import { useEffect, useState, use } from "react";
import styles from "./iniciar.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAppointments, updateAppointmentStatus } from "@/app/actions/appointmentActions";
import { upsertMedicalRecord } from "@/app/actions/medicalRecordActions";
import { getSettings } from "@/app/actions/settingsActions";
import { useRouter } from "next/navigation";

export default function IniciarConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Receituário states
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [docName, setDocName] = useState("Dr(a). Administrador");
  const [crm, setCrm] = useState("CRM 123456-SP");
  const [specialty, setSpecialty] = useState("Clínica Geral / Estética");
  const [prescriptionText, setPrescriptionText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 1. Fetch appointment details
      const res = await getAppointments();
      let foundPatientName = "";
      if (res.success) {
        const found = res.appointments.find((a: any) => a.id === id);
        if (found) {
          setAppt(found);
          foundPatientName = found.customer?.name || "";
        }
      }

      // 2. Fetch clinic settings
      const settingsRes = await getSettings();
      let clinicFooter = "Av. Paulista, 1000 - Bela Vista, São Paulo - SP | Tel: (11) 99999-9999";
      if (settingsRes.success) {
        const s = settingsRes.settings;
        setClinicLogo(s.companyLogo || null);
        if (s.companyAddress || s.companyPhone) {
          clinicFooter = `${s.companyAddress || ""} | Tel: ${s.companyPhone || ""}`;
          if (s.companyCnpj) {
            clinicFooter += ` | CNPJ: ${s.companyCnpj}`;
          }
        }
      }
      setFooterText(clinicFooter);

      // 3. Initialize default prescription template
      const todayStr = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
      setPrescriptionText(`RECEITUÁRIO CLÍNICO

Paciente: ${foundPatientName || "João Silva"}
Data: ${todayStr}

USO INTERNO:
1. Dipirona 500mg ---------------------- Tomar 1 comprimido de 6 em 6 horas em caso de dor ou febre.
2. Paracetamol 750mg ------------------- Tomar 1 comprimido de 8 em 8 horas se dor persistir.

USO EXTERNO:
1. Protetor Solar FPS 50 ---------------- Aplicar no rosto de 4 em 4 horas diariamente.
2. Hidratante Facial Premium ----------- Aplicar após higienização à noite.

EXAMES SOLICITADOS:
1. Hemograma Completo com Coagulograma
2. Teste de Sensibilidade Cutânea`);

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
      setSaving(false);
      setShowSuccessModal(true);
      // Auto-redirect after 4 seconds
      setTimeout(() => router.push("/agenda"), 4000);
    } else {
      alert(res.error);
      setSaving(false);
    }
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

          {customer.generalNotes && (
            <Card className={styles.card} style={{ borderLeft: '4px solid var(--gold-primary)' }}>
              <h3 style={{ color: 'var(--gold-primary)', margin: 0, fontSize: '1.1rem' }}>📝 Anotações Gerais</h3>
              <p className={styles.notes} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {customer.generalNotes}
              </p>
            </Card>
          )}
          
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
            <div className={styles.actions} style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={() => setIsPrescriptionOpen(true)} style={{ width: '240px' }}>
                📝 Prescrever (Receituário / Exames)
              </Button>
              <Button onClick={handleSave} disabled={saving} style={{ width: '200px' }}>
                {saving ? "Salvando..." : "Concluir Atendimento"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Receituário Modal */}
      {isPrescriptionOpen && (
        <div className={styles.modalOverlayPrint} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className={styles.editorLayout} style={{
            background: 'var(--background)',
            border: '1px solid var(--border-gold)',
            borderRadius: '16px',
            width: '95%',
            maxWidth: '1200px',
            height: '85vh',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            {/* Left Panel: Inputs */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid var(--border-color)', overflowY: 'auto' }}>
              <h2 style={{ color: 'var(--gold-primary)', margin: 0 }}>📝 Prescrever Exames e Receitas</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Preencha os dados do cabeçalho, a prescrição médica e os detalhes do rodapé. O papel timbrado à direita se atualiza ao vivo.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Nome do Médico</label>
                  <input 
                    type="text" 
                    value={docName} 
                    onChange={(e) => setDocName(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-gold)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>CRM/Registro</label>
                  <input 
                    type="text" 
                    value={crm} 
                    onChange={(e) => setCrm(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-gold)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Especialidade / Cargo</label>
                <input 
                  type="text" 
                  value={specialty} 
                  onChange={(e) => setSpecialty(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-gold)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Prescrição / Corpo do Receituário</label>
                <textarea 
                  value={prescriptionText} 
                  onChange={(e) => setPrescriptionText(e.target.value)}
                  style={{ width: '100%', height: '220px', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-gold)', background: '#fdfaf0', fontFamily: 'Courier New, monospace', fontSize: '0.9rem', lineHeight: '1.5', resize: 'none', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Dados de Rodapé (Contato e Endereço)</label>
                <input 
                  type="text" 
                  value={footerText} 
                  onChange={(e) => setFooterText(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-gold)', background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <Button variant="secondary" onClick={() => setIsPrescriptionOpen(false)}>Cancelar</Button>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <Button variant="secondary" onClick={() => {
                    window.print();
                  }}>
                    🖨️ Imprimir Receituário
                  </Button>
                  <Button onClick={() => {
                    // Append prescription to consultation evolve content
                    const dividerLine = "\n\n=========================================\n📝 RECEITUÁRIO PRESCRITO E IMPRESSO\n=========================================\n";
                    const formatted = `${dividerLine}Médico: ${docName} - ${crm} | ${specialty}\n\n${prescriptionText}\n\nRodapé: ${footerText}\n=========================================`;
                    setContent(prev => prev + formatted);
                    setIsPrescriptionOpen(false);
                  }}>
                    💾 Salvar e Anexar ao Prontuário
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Panel: Live A4 Timbrado Preview */}
            <div style={{ background: '#555', padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
              <div className={styles.previewSheetPrint} style={{
                width: '100%',
                aspectRatio: '1/1.414',
                maxWidth: '440px',
                background: '#fff',
                color: '#111',
                padding: '2.2rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '4px',
                position: 'relative'
              }}>
                {/* Header Timbrado */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '2px solid var(--gold-primary)', paddingBottom: '0.6rem', textAlign: 'center' }}>
                  {clinicLogo ? (
                    <img src={clinicLogo} alt="Clinic Logo" style={{ maxHeight: '45px', marginBottom: '0.3rem' }} />
                  ) : (
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--gold-primary)', fontFamily: 'serif', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      ⚜ {appt?.settings?.companyName || "ERP Premium Estética"}
                    </div>
                  )}
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111', fontFamily: 'serif' }}>{docName}</div>
                  <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                    {specialty} | {crm}
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, padding: '1.2rem 0', display: 'flex', flexDirection: 'column', fontFamily: 'Courier New, Courier, monospace', fontSize: '0.8rem', lineHeight: '1.5', color: '#222' }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {prescriptionText}
                  </div>
                </div>

                {/* Signature and Footer */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ borderBottom: '1px solid #ccc', width: '200px', textAlign: 'center' }}></div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.3rem' }}>{docName}</div>
                    <div style={{ fontSize: '0.65rem', color: '#666' }}>Assinatura do Profissional</div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #eee', width: '100%', paddingTop: '0.5rem', textAlign: 'center', fontSize: '0.6rem', color: '#888', fontFamily: 'sans-serif' }}>
                    {footerText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Success Modal ── */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(14, 12, 8, 0.70)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2.5rem 2.5rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            textAlign: 'center',
            animation: 'scaleIn 0.35s var(--ease-spring)',
            position: 'relative',
          }}>
            {/* Animated check circle */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(46, 125, 50, 0.30)',
              animation: 'pulse-gold 2s ease-in-out infinite',
              fontSize: '2.2rem',
              lineHeight: 1,
            }}>
              ✓
            </div>

            {/* Title */}
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.55rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}>
                Consulta Concluída!
              </h2>
              <p style={{
                margin: '0.5rem 0 0',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                O atendimento foi finalizado com sucesso e o prontuário foi salvo.
              </p>
            </div>

            {/* Info card */}
            <div style={{
              width: '100%',
              background: 'var(--gold-50)',
              border: '1px solid var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                <span style={{ fontSize: '1rem' }}>👤</span>
                <span><strong>Paciente:</strong> {appt?.customer?.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '1rem' }}>📅</span>
                <span>
                  {new Date(appt?.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '1rem' }}>🕐</span>
                <span>{new Date(appt?.date).getHours()}:00 — {appt?.isReturn ? 'Retorno' : 'Primeira Consulta'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
                <span style={{ fontSize: '1rem' }}>✅</span>
                <span style={{ color: '#2e7d32', fontWeight: 600 }}>Status: Concluído</span>
              </div>
            </div>

            {/* Progress bar (4s countdown) */}
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem', textAlign: 'center' }}>
                Redirecionando para a Agenda em instantes...
              </p>
              <div style={{
                height: '3px',
                background: 'var(--border-color)',
                borderRadius: '99px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2e7d32, #43a047)',
                  borderRadius: '99px',
                  animation: 'progressCountdown 4s linear forwards',
                }} />
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => router.push('/agenda')}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              🏥 Ir para a Agenda agora
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
