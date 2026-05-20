"use client";

import { useEffect, useState, use } from "react";
import styles from "./iniciar.module.css";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAppointments, updateAppointmentStatus } from "@/app/actions/appointmentActions";
import { getMedicalRecords, upsertMedicalRecord } from "@/app/actions/medicalRecordActions";
import { useRouter } from "next/navigation";

const PROTOCOLOS_SUGERIDOS = [
  "Botox / Toxina Botulínica",
  "Preenchimento Labial",
  "Preenchimento de Sulco",
  "Peeling Químico",
  "Limpeza de Pele Profunda",
  "Microagulhamento",
  "Laser CO₂",
  "Radiofrequência",
  "LED Terapia",
  "Drenagem Linfática",
  "Massagem Relaxante",
  "Outros (especificar nas observações)",
];

export default function IniciarConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [appt, setAppt] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Structured form state
  const [form, setForm] = useState({
    protocolo: "",
    protocoloCustom: "",
    produtos: "",
    dosagem: "",
    reacoes: "Nenhuma reação adversa observada.",
    evolucao: "",
    cuidadosPos: "",
    proximaSessao: "",
    observacoesGerais: "",
  });

  useEffect(() => {
    async function load() {
      const res = await getAppointments();
      if (res.success) {
        const found = res.appointments.find((a: any) => a.id === id);
        if (found) {
          setAppt(found);
          // Load medical history for this customer
          const histRes = await getMedicalRecords(found.customer.id);
          if (histRes.success) {
            setHistorico(histRes.records.filter((r: any) => r.appointmentId !== id));
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSave = async () => {
    if (!form.evolucao.trim() && !form.protocolo) {
      return alert("Preencha ao menos o protocolo e a evolução do procedimento.");
    }
    setSaving(true);

    const protocoloFinal = form.protocolo === "Outros (especificar nas observações)"
      ? form.protocoloCustom || "Outros"
      : form.protocolo;

    // Serialize structured data as JSON string for storage
    const contentObj = {
      protocolo: protocoloFinal,
      produtos: form.produtos,
      dosagem: form.dosagem,
      reacoes: form.reacoes,
      evolucao: form.evolucao,
      cuidadosPos: form.cuidadosPos,
      proximaSessao: form.proximaSessao,
      observacoesGerais: form.observacoesGerais,
    };

    const content = JSON.stringify(contentObj);

    const res = await upsertMedicalRecord({
      customerId: appt.customer.id,
      appointmentId: id,
      content,
    });

    if (res.success) {
      await updateAppointmentStatus(id, "COMPLETED");
      alert("✅ Procedimento concluído e prontuário salvo com sucesso!");
      router.push("/agenda");
    } else {
      alert(res.error);
    }
    setSaving(false);
  };

  const parseRecord = (content: string) => {
    try {
      return JSON.parse(content);
    } catch {
      return { evolucao: content };
    }
  };

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gold-primary)', fontWeight: 600 }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
      Carregando dados do procedimento...
    </div>
  );

  if (!appt) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
      ❌ Agendamento não encontrado.
    </div>
  );

  const customer = appt.customer;
  const apptDate = new Date(appt.date);
  const hora = `${String(apptDate.getHours()).padStart(2, '0')}:00`;
  const dataFormatada = apptDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>🌿 Início de Atendimento</h1>
          <p className={styles.headerSub}>Preencha o formulário clínico completo abaixo</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {historico.length > 0 && (
            <Button variant="secondary" onClick={() => setShowHistory(!showHistory)}>
              📋 {showHistory ? 'Ocultar' : 'Ver'} Histórico ({historico.length})
            </Button>
          )}
          <Button variant="secondary" onClick={() => router.push("/agenda")}>◀ Voltar</Button>
        </div>
      </header>

      {/* Historical Records Panel */}
      {showHistory && historico.length > 0 && (
        <div className={styles.historyPanel}>
          <h3 className={styles.historyTitle}>📚 Histórico de Prontuários — {customer.name}</h3>
          <div className={styles.historyList}>
            {historico.map((record: any, idx: number) => {
              const parsed = parseRecord(record.content);
              const date = new Date(record.createdAt).toLocaleDateString('pt-BR');
              return (
                <div key={record.id} className={styles.historyItem}>
                  <div className={styles.historyItemHeader}>
                    <span className={styles.historyDate}>📅 {date}</span>
                    {parsed.protocolo && <span className={styles.historyProtocolo}>{parsed.protocolo}</span>}
                  </div>
                  {parsed.evolucao && <p className={styles.historyEvol}>{parsed.evolucao}</p>}
                  {parsed.reacoes && parsed.reacoes !== "Nenhuma reação adversa observada." && (
                    <p className={styles.historyReacoes}>⚠️ {parsed.reacoes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* Sidebar: Patient Info */}
        <div className={styles.sidebar}>
          <Card className={styles.card}>
            <h3>👤 Paciente</h3>
            <div className={styles.patientAvatar}>👤</div>
            <div className={styles.patientName}>{customer.name}</div>
            {appt.isReturn && (
              <div className={styles.returnBadge}>💆‍♀️ Retorno</div>
            )}
            <div className={styles.info}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>CPF</span>
                <span className={styles.infoValue}>{customer.cpf || "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Telefone</span>
                <span className={styles.infoValue}>{customer.phone || "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Cidade</span>
                <span className={styles.infoValue}>{customer.city || "—"}</span>
              </div>
            </div>
          </Card>

          <Card className={styles.card}>
            <h3>📋 Agendamento</h3>
            <div className={styles.info}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Data</span>
                <span className={styles.infoValue} style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{dataFormatada}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Horário</span>
                <span className={styles.infoValue} style={{ color: 'var(--gold-primary)', fontWeight: 800, fontSize: '1.2rem' }}>{hora}</span>
              </div>
            </div>
          </Card>

          {appt.description && (
            <Card className={styles.card}>
              <h3>📝 Obs. do Agendamento</h3>
              <p className={styles.notes}>{appt.description}</p>
            </Card>
          )}
        </div>

        {/* Main Content: Clinical Form */}
        <div className={styles.main}>

          {/* Section 1: Protocol */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>01</span>
              <div>
                <h3>Protocolo Aplicado</h3>
                <p>Selecione o procedimento realizado nesta sessão</p>
              </div>
            </div>
            <div className={styles.protocolGrid}>
              {PROTOCOLOS_SUGERIDOS.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.protocolBtn} ${form.protocolo === p ? styles.protocolActive : ''}`}
                  onClick={() => setForm({ ...form, protocolo: p })}
                >
                  {p}
                </button>
              ))}
            </div>
            {form.protocolo === "Outros (especificar nas observações)" && (
              <input
                className={styles.input}
                placeholder="Descreva o protocolo aplicado..."
                value={form.protocoloCustom}
                onChange={e => setForm({ ...form, protocoloCustom: e.target.value })}
              />
            )}
          </div>

          {/* Section 2: Products & Dosages */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>02</span>
              <div>
                <h3>Produtos & Dosagens</h3>
                <p>Informe os produtos e quantidades utilizadas</p>
              </div>
            </div>
            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <label>Produtos Utilizados</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Ex: Xeomin 50U, Restylane 1ml, Ácido Glicólico 30%..."
                  value={form.produtos}
                  onChange={e => setForm({ ...form, produtos: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Dosagem & Aplicação</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Ex: 10U frontal, 10U glabela, 5U orbicular..."
                  value={form.dosagem}
                  onChange={e => setForm({ ...form, dosagem: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Evolution & Reactions */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>03</span>
              <div>
                <h3>Evolução & Reações</h3>
                <p>Registre a evolução do tratamento e reações observadas</p>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label>Evolução do Procedimento <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                className={`${styles.textarea} ${styles.textareaLg}`}
                placeholder="Descreva detalhadamente a evolução do tratamento, técnica aplicada, resposta da paciente durante o procedimento e resultado obtido..."
                value={form.evolucao}
                onChange={e => setForm({ ...form, evolucao: e.target.value })}
              />
            </div>
            <div className={styles.fieldGroup} style={{ marginTop: '1rem' }}>
              <label>Reações Adversas Observadas</label>
              <div className={styles.reactionBtns}>
                {["Nenhuma reação adversa observada.", "Eritema leve", "Edema local", "Equimose", "Hipersensibilidade"].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`${styles.reactionBtn} ${form.reacoes === r ? styles.reactionActive : ''}`}
                    onClick={() => setForm({ ...form, reacoes: r })}
                  >
                    {r === "Nenhuma reação adversa observada." ? "✅ Sem reações" : `⚠️ ${r}`}
                  </button>
                ))}
              </div>
              <input
                className={styles.input}
                style={{ marginTop: '0.75rem' }}
                placeholder="Ou descreva a reação observada..."
                value={form.reacoes}
                onChange={e => setForm({ ...form, reacoes: e.target.value })}
              />
            </div>
          </div>

          {/* Section 4: Post-procedure & Next */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>04</span>
              <div>
                <h3>Cuidados Pós-Procedimento & Próxima Sessão</h3>
                <p>Orientações para a paciente e agendamento de retorno</p>
              </div>
            </div>
            <div className={styles.twoCol}>
              <div className={styles.fieldGroup}>
                <label>Cuidados Pós-Procedimento</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Ex: Não expor ao sol por 48h, não lavar o rosto nas primeiras 4h, evitar maquiagem por 24h..."
                  value={form.cuidadosPos}
                  onChange={e => setForm({ ...form, cuidadosPos: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Próxima Sessão Recomendada</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Ex: Retorno em 15 dias para avaliação. Próxima aplicação em 6 meses..."
                  value={form.proximaSessao}
                  onChange={e => setForm({ ...form, proximaSessao: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.fieldGroup} style={{ marginTop: '1rem' }}>
              <label>Observações Gerais Complementares</label>
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder="Qualquer observação adicional relevante para o prontuário..."
                value={form.observacoesGerais}
                onChange={e => setForm({ ...form, observacoesGerais: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => router.push("/agenda")}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} style={{ minWidth: '260px', fontSize: '1rem', padding: '0.9rem 2rem' }}>
              {saving ? "⏳ Salvando Prontuário..." : "✅ Concluir & Salvar Prontuário"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
