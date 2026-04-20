'use client'

import React, { useState, useEffect } from 'react'
import styles from './configuracoes.module.css'
import { getSettings, updateSettings } from '@/app/actions/settingsActions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ConfiguracoesPage() {
  const [formData, setFormData] = useState({
    commission: '0',
    tax: '0',
    fixedExpenses: '0',
    companyName: '',
    companyCnpj: '',
    companyAddress: '',
    companyPhone: '',
    companyLogo: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await getSettings()
      if (res.success) {
        setFormData({
          commission: res.settings.commissionPercentage.toString(),
          tax: res.settings.taxPercentage.toString(),
          fixedExpenses: res.settings.fixedExpensesPercentage.toString(),
          companyName: res.settings.companyName || '',
          companyCnpj: res.settings.companyCnpj || '',
          companyAddress: res.settings.companyAddress || '',
          companyPhone: res.settings.companyPhone || '',
          companyLogo: res.settings.companyLogo || ''
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, companyLogo: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await updateSettings({
      commission: parseFloat(formData.commission),
      tax: parseFloat(formData.tax),
      fixedExpenses: parseFloat(formData.fixedExpenses),
      companyName: formData.companyName,
      companyCnpj: formData.companyCnpj,
      companyAddress: formData.companyAddress,
      companyPhone: formData.companyPhone,
      companyLogo: formData.companyLogo
    })
    if (res.success) {
      alert('Configurações salvas com sucesso!')
    } else {
      alert(res.error)
    }
    setSaving(false)
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⚙️ Configurações Globais</h1>
        <p className={styles.description}>Gerencie os parâmetros globais do seu ERP.</p>
      </div>

      <Card className={styles.settingsCard}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <h2>Perfil da Empresa</h2>
            
            <div className={styles.logoSection} style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
               <div className={styles.logoPreview} style={{ width: '120px', height: '120px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed rgba(255,255,255,0.2)' }}>
                  {formData.companyLogo ? (
                    <img src={formData.companyLogo} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>🖼️</span>
                  )}
               </div>
               <div style={{ flex: 1 }}>
                  <label htmlFor="logo-upload" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Logomarca da Empresa</label>
                  <input 
                    id="logo-upload"
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#888' }}>Formatos aceitos: PNG, JPG. Tamanho máx: 2MB.</p>
               </div>
            </div>

            <div className={styles.inputGroup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input 
                label="Razão Social / Nome Fantasia" 
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                required
              />
              <Input 
                label="CNPJ" 
                value={formData.companyCnpj}
                onChange={(e) => setFormData({...formData, companyCnpj: e.target.value})}
              />
              <Input 
                label="Endereço Completo" 
                value={formData.companyAddress}
                onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                style={{ gridColumn: 'span 2' }}
              />
              <Input 
                label="Telefone / Contato" 
                value={formData.companyPhone}
                onChange={(e) => setFormData({...formData, companyPhone: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2>Vendas e Comissões</h2>
            <div className={styles.inputGroup}>
              <Input 
                label="Porcentagem de Comissão Padrão (%)" 
                type="number" 
                step="0.1" 
                value={formData.commission}
                onChange={(e) => setFormData({...formData, commission: e.target.value})}
                required
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2>Parâmetros de Precificação Sustentável</h2>
            <div className={styles.inputGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input 
                label="Imposto Médio (%)" 
                type="number" 
                step="0.1" 
                value={formData.tax}
                onChange={(e) => setFormData({...formData, tax: e.target.value})}
                required
              />
              <Input 
                label="Despesas Fixas / Operacionais (%)" 
                type="number" 
                step="0.1" 
                value={formData.fixedExpenses}
                onChange={(e) => setFormData({...formData, fixedExpenses: e.target.value})}
                required
              />
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                Esses valores serão usados no módulo de precificação para garantir que sua margem seja calculada sobre o preço de venda final.
              </p>
            </div>
          </div>

          <div className={styles.formFooter}>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
