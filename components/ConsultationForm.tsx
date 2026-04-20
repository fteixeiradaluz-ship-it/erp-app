"use client";

import { useState } from "react";
import styles from "@/app/(dashboard)/consultas/consultas.module.css";
import { Button } from "@/components/ui/Button";

type Customer = {
  id: string;
  name: string;
};

type Props = {
  customers: Customer[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isReturn?: boolean;
  originalApptId?: string;
  defaultCustomerId?: string;
};

export default function ConsultationForm({ 
  customers, 
  onClose, 
  onSubmit,
  isReturn = false,
  originalApptId,
  defaultCustomerId
}: Props) {
  const [loading, setLoading] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get("date") as string;
    const timeStr = formData.get("time") as string;
    
    // Combine date and time
    const dateTime = new Date(`${dateStr}T${timeStr}`);
    
    let submitData: any = {
      customerId: isNewPatient ? undefined : formData.get("customerId"),
      date: dateTime,
      description: formData.get("description"),
      isReturn,
      originalApptId
    };

    if (isNewPatient) {
      submitData.newCustomerData = {
        name: formData.get("newCustomerName"),
        email: formData.get("newCustomerEmail"),
        phone: formData.get("newCustomerPhone"),
      };
    }
    
    await onSubmit(submitData);
    
    setLoading(false);
  }
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{isReturn ? "Agendar Retorno" : "Nova Consulta"}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="customerId" style={{ margin: 0 }}>Paciente/Cliente</label>
              {!isReturn && (
                <button 
                  type="button"
                  onClick={() => setIsNewPatient(!isNewPatient)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                >
                  {isNewPatient ? "Selecionar Existente" : "+ Novo Paciente"}
                </button>
              )}
            </div>

            {isNewPatient ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input type="text" name="newCustomerName" placeholder="Nome Completo" required />
                <input type="email" name="newCustomerEmail" placeholder="E-mail (opcional)" />
                <input type="tel" name="newCustomerPhone" placeholder="Telefone" required />
              </div>
            ) : (
              <select 
                id="customerId" 
                name="customerId" 
                required={!isNewPatient} 
                defaultValue={defaultCustomerId || ""}
                disabled={!!defaultCustomerId} // Disable if it's a return (fixed patient)
              >
                <option value="" disabled>Selecione um cliente...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="date">Data</label>
              <input type="date" id="date" name="date" required />
            </div>
            
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="time">Horário</label>
              <input type="time" id="time" name="time" required />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="description">Observações (Opcional)</label>
            <textarea id="description" name="description" rows={3}></textarea>
          </div>
          
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Consulta"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
