"use client";

import { useEffect, useState, use } from "react";
import styles from "./prontuario.module.css";
import { getMedicalRecords, deleteMedicalRecord } from "@/app/actions/medicalRecordActions";
import { getCustomers } from "@/app/actions/customerActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export default function ProntuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [custRes, recRes] = await Promise.all([
        getCustomers(), // We filter manually for now or add getCustomerById
        getMedicalRecords(customerId)
      ]);

      if (custRes.success) {
        const found = custRes.customers.find((c: any) => c.id === customerId);
        setCustomer(found);
      }
      if (recRes.success) {
        setRecords(recRes.records);
      }
      setLoading(false);
    }
    load();
  }, [customerId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    const res = await deleteMedicalRecord(id, customerId);
    if (res.success) {
      setRecords(prev => prev.filter(r => r.id !== id));
    } else {
      alert(res.error);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando prontuário...</div>;
  if (!customer) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cliente não encontrado.</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>🩺 Prontuário do Paciente</h1>
          <p>{customer.name} - CPF: {customer.cpf || "Não informado"}</p>
        </div>
        <Button variant="secondary" onClick={() => router.back()}>Voltar</Button>
      </header>

      <div className={styles.recordsList}>
        {records.length === 0 ? (
          <div className={styles.empty}>Nenhum registro encontrado para este paciente.</div>
        ) : (
          records.map(record => (
            <Card key={record.id} className={styles.recordCard}>
              <div className={styles.recordHeader}>
                <span className={styles.date}>
                  {new Date(record.createdAt).toLocaleDateString("pt-BR")} às {new Date(record.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className={styles.badge}>Atendimento #{record.appointment?.id.slice(-6).toUpperCase() || "Manual"}</div>
                <button className={styles.deleteBtn} onClick={() => handleDelete(record.id)}>🗑️</button>
              </div>
              <div className={styles.content}>
                {record.content.split('\n').map((line: string, i: number) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
